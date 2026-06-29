import requests
import time
import uuid
import random
import re
import string
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Callable, Optional, Any
import json

class EndpointTest:
    def __init__(self, test_id: str, name: str, url: str, method: str = "POST",
                 headers: Dict = None, payload: Dict = None, payload_type: str = "json",
                 extractors: Dict = None, run_config: Dict = None):
        self.id = test_id or str(uuid.uuid4())
        self.name = name
        self.url = url
        self.method = method.upper()
        self.headers = headers or {}
        self.payload = payload or {}
        self.payload_type = payload_type  # "json", "form", "multipart"
        self.extractors = extractors or {}  # e.g. {"access_token": "body.access_token"}
        # Optional per-endpoint run override: {concurrency, max_requests, delay, use_min_delay}
        self.run_config = run_config or None

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "url": self.url,
            "method": self.method,
            "headers": self.headers,
            "payload": self.payload,
            "payload_type": self.payload_type,
            "extractors": self.extractors,
            "run_config": self.run_config
        }

    @staticmethod
    def from_dict(d):
        return EndpointTest(
            d.get("id"), d["name"], d["url"], d.get("method", "POST"),
            d.get("headers", {}), d.get("payload", {}), d.get("payload_type", "json"),
            d.get("extractors", {}), d.get("run_config")
        )

class TestConfig:
    def __init__(self, base_url: str = "", variables: Dict = None, tests: List[EndpointTest] = None):
        self.base_url = base_url
        self.variables = variables or {}
        self.tests = tests or []

    def to_dict(self):
        return {
            "base_url": self.base_url,
            "variables": self.variables,
            "tests": [t.to_dict() for t in self.tests]
        }

    @staticmethod
    def from_dict(d):
        tests = [EndpointTest.from_dict(t) for t in d.get("tests", [])]
        return TestConfig(d.get("base_url", ""), d.get("variables", {}), tests)

class APITester:
    def __init__(self, test: EndpointTest, config: TestConfig,
                 concurrency: int = 1, delay: float = 0.1, max_requests: int = 100,
                 log_callback: Callable[[str], None] = None,
                 stats_callback: Callable[[Dict], None] = None,
                 stop_flag: Optional[Dict] = None):
        self.test = test
        self.config = config
        self.concurrency = max(1, concurrency)
        self.delay = delay
        self.max_requests = max_requests
        self.log = log_callback or print
        self.update_stats = stats_callback or (lambda x: None)
        self.stop_flag = stop_flag or {"stop": False}
        self.results = {"attempts": 0, "success": 0, "rate_limited": 0, "errors": 0}
        self.session = requests.Session()

    def _substitute(self, value: Any) -> Any:
        if isinstance(value, str):
            # 1. Replace static variables first
            for k, v in self.config.variables.items():
                value = value.replace(f"{{{{{k}}}}}", str(v))

            # 2. Replace dynamic generators (fresh per request)
            def dynamic_replacer(match):
                inner = match.group(1).strip()
                return self._generate_dynamic(inner)

            value = re.sub(r'\{\{([^}]+)\}\}', dynamic_replacer, value)
            return value
        if isinstance(value, dict):
            return {k: self._substitute(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._substitute(item) for item in value]
        return value

    def _generate_dynamic(self, spec: str) -> str:
        """Support special generators like {{random_phone}}, {{random_email}}, {{uuid}} etc."""
        spec = spec.lower().strip()

        if spec == "random_email":
            return f"test{random.randint(100000, 9999999)}@mail.test"

        if spec == "random_phone":
            # Indonesian format: +62812xxxxxxxx (common mobile)
            return "+62812" + "".join(str(random.randint(0, 9)) for _ in range(8))

        if spec == "random_uuid" or spec == "uuid":
            return str(uuid.uuid4())

        if spec == "timestamp":
            return str(int(time.time() * 1000))

        # Bare versions (no params) - defaults
        if spec == "random_string":
            length = 8
            chars = string.ascii_letters + string.digits
            return ''.join(random.choice(chars) for _ in range(length))

        if spec == "random_number" or spec == "random_int":
            return str(random.randint(100000, 999999))

        # Parameterized versions
        if spec.startswith("random_int:"):
            # e.g. random_int:1000:9999
            try:
                parts = spec.split(":")
                min_v = int(parts[1])
                max_v = int(parts[2])
                return str(random.randint(min_v, max_v))
            except:
                return str(random.randint(1000, 9999))

        if spec.startswith("random_string:"):
            try:
                length = int(spec.split(":")[1])
                chars = string.ascii_letters + string.digits
                return ''.join(random.choice(chars) for _ in range(max(1, length)))
            except:
                return "rnd" + str(random.randint(100,999))

        # unknown - leave it (or return empty)
        return "{{" + spec + "}}"

    def _extract_from_response(self, resp):
        """Extract values from response body or headers and update variables (fresh token support)."""
        try:
            body = resp.json() if 'application/json' in resp.headers.get('content-type', '') else {}
        except Exception:
            body = {}

        for var_name, source in self.test.extractors.items():
            value = None
            src = source.lower()

            if src.startswith("body."):
                path = source[5:]
                cur = body
                for key in path.split("."):
                    if isinstance(cur, dict) and key in cur:
                        cur = cur[key]
                    else:
                        cur = None
                        break
                value = cur

            elif "set-cookie" in src or "cookie" in src:
                # Basic Set-Cookie parsing
                set_cookie = resp.headers.get("Set-Cookie", "")
                if var_name.lower() in set_cookie.lower():
                    # crude parse access_token=xxx;
                    import re as _re
                    m = _re.search(rf"{var_name}=([^;]+)", set_cookie, _re.IGNORECASE)
                    if m:
                        value = m.group(1)

            if value is not None:
                self.config.variables[var_name] = str(value)
                self.log(f"[extract] {var_name} updated from response")

    def _build_request(self):
        url = self._substitute(self.test.url)
        if not url.startswith("http"):
            url = self.config.base_url.rstrip("/") + "/" + url.lstrip("/")

        headers = {k: self._substitute(v) for k, v in self.test.headers.items()}

        # Substitute inside payload (supports nested if present)
        raw_payload = self.test.payload or {}
        payload = self._substitute(raw_payload)

        return url, headers, payload

    def _send_one(self, i: int) -> Dict:
        if self.stop_flag.get("stop"):
            return {"status": "stopped"}

        url, headers, payload = self._build_request()

        start = time.time()
        try:
            ptype = (self.test.payload_type or "json").lower()
            if ptype == "form":
                resp = self.session.request(self.test.method, url, headers=headers, data=payload, timeout=10)
            elif ptype == "multipart":
                # Force multipart/form-data (useful for file-like or strict servers)
                files = {}
                for k, v in (payload or {}).items():
                    files[k] = (None, str(v))
                # remove any content-type so requests sets correct multipart boundary
                headers = {k: v for k, v in headers.items() if k.lower() != "content-type"}
                resp = self.session.request(self.test.method, url, headers=headers, files=files, timeout=10)
            else:
                # json (default)
                resp = self.session.request(self.test.method, url, headers=headers, json=payload, timeout=10)

            elapsed = time.time() - start
            self.results["attempts"] += 1

            is_success = 200 <= resp.status_code < 300
            is_rate = resp.status_code == 429 or "rate" in resp.text.lower() or "too many" in resp.text.lower()

            if is_success:
                self.results["success"] += 1
            elif is_rate:
                self.results["rate_limited"] += 1

            # === NEW: Process extractors (for fresh tokens from login/onboarding etc) ===
            if is_success and getattr(self.test, 'extractors', None):
                self._extract_from_response(resp)

            result = {
                "attempt": i,
                "status": resp.status_code,
                "time": round(elapsed, 3),
                "success": is_success,
                "rate_limited": is_rate,
                "body": resp.text[:500]
            }

            self.update_stats(self.results.copy())
            self.log(f"[{i}] {self.test.name} {url} -> {resp.status_code} ({elapsed:.2f}s) {'SUCCESS' if is_success else 'FAIL'}")

            return result
        except Exception as e:
            self.results["errors"] += 1
            self.update_stats(self.results.copy())
            self.log(f"[{i}] ERROR: {str(e)}")
            return {"attempt": i, "error": str(e)}

    def run(self):
        self.results = {"attempts": 0, "success": 0, "rate_limited": 0, "errors": 0}
        self.update_stats(self.results.copy())

        if self.concurrency > 1:
            with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
                futures = []
                for i in range(1, self.max_requests + 1):
                    if self.stop_flag.get("stop"):
                        break
                    futures.append(executor.submit(self._send_one, i))
                    if self.delay > 0:
                        time.sleep(self.delay)  # throttle submissions
                for f in as_completed(futures):
                    if self.stop_flag.get("stop"):
                        break
        else:
            for i in range(1, self.max_requests + 1):
                if self.stop_flag.get("stop"):
                    break
                self._send_one(i)
                if self.delay > 0:
                    time.sleep(self.delay)

        self.log(f"Finished. {self.results}")
        return self.results