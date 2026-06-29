"""In-memory application state + config persistence.

Holds the multi-project / environment model and keeps `current_config`
(the active project + environment, merged with global variables) in sync.
A single `store` instance is shared across all routers.
"""
import uuid
import asyncio
from typing import Dict, List, Optional

from .core.tester import TestConfig, EndpointTest
from .repository import Repository, JsonRepository


class Store:
    def __init__(self, repo: Optional[Repository] = None):
        # Swap this for a SqliteRepository (etc.) to change where data lives.
        self.repo: Repository = repo or JsonRepository()
        self.projects: List[dict] = []
        self.current_project_id: Optional[str] = None
        self.global_variables: dict = {}
        self.current_config = TestConfig()
        self.current_runs: Dict[str, dict] = {}
        self.active_websockets: list = []
        # Captured at startup so worker threads can push WS messages safely.
        self.main_loop: Optional[asyncio.AbstractEventLoop] = None

    # ---- environment / config sync ------------------------------------
    def get_active_env(self, project: dict) -> dict:
        envs = project.get("environments") or []
        if not envs:
            # migrate old flat structure
            env = {
                "id": str(uuid.uuid4()),
                "name": "Default",
                "base_url": project.get("base_url", ""),
                "variables": project.get("variables", {}),
            }
            project["environments"] = [env]
            project["current_environment_id"] = env["id"]
            return env
        cid = project.get("current_environment_id")
        env = next((e for e in envs if e.get("id") == cid), envs[0])
        project["current_environment_id"] = env["id"]
        return env

    def sync_current_config(self):
        """Make current_config reflect active project + environment + global."""
        if not self.projects:
            pid = str(uuid.uuid4())
            self.projects.append({
                "id": pid,
                "name": "Default Project",
                "environments": [{
                    "id": str(uuid.uuid4()),
                    "name": "Local",
                    "base_url": "https://api.retailku.com",
                    "variables": {"access_token": "", "refresh_token": ""},
                }],
                "current_environment_id": None,
                "tests": [],
            })
            self.current_project_id = pid

        if not self.current_project_id:
            self.current_project_id = self.projects[0]["id"]

        active_project = next(
            (p for p in self.projects if p.get("id") == self.current_project_id),
            self.projects[0],
        )
        self.current_project_id = active_project["id"]

        env = self.get_active_env(active_project)
        effective_vars = {**self.global_variables, **env.get("variables", {})}

        self.current_config = TestConfig(
            base_url=env.get("base_url", ""),
            variables=effective_vars,
            tests=[EndpointTest.from_dict(t) for t in active_project.get("tests", [])],
        )

    def save_active_project(self):
        """Write current_config back into the active project."""
        active = next((p for p in self.projects if p.get("id") == self.current_project_id), None)
        if not active:
            return
        env = self.get_active_env(active)
        env["base_url"] = self.current_config.base_url
        # Only env-specific vars are stored on the env (globals stay global).
        env["variables"] = {k: v for k, v in self.current_config.variables.items() if k not in self.global_variables}
        active["tests"] = [t.to_dict() for t in self.current_config.tests]

    # ---- persistence --------------------------------------------------
    def load(self):
        data = self.repo.load()
        if data is None:
            # Nothing stored yet → seed a default project.
            pid = str(uuid.uuid4())
            self.projects = [{
                "id": pid,
                "name": "Default Project",
                "environments": [{
                    "id": str(uuid.uuid4()),
                    "name": "Local",
                    "base_url": "https://api.retailku.com",
                    "variables": {"access_token": "", "refresh_token": ""},
                }],
                "current_environment_id": None,
                "tests": [],
            }]
            self.current_project_id = pid
            self.global_variables = {}
        elif isinstance(data, dict) and "projects" in data:
            self.projects = data.get("projects", [])
            self.current_project_id = data.get("current_project_id")
            self.global_variables = data.get("global_variables", {})
        else:
            # migrate old single-config format
            self.projects = [{
                "id": str(uuid.uuid4()),
                "name": "Migrated Project",
                "environments": [{
                    "id": str(uuid.uuid4()),
                    "name": "Default",
                    "base_url": data.get("base_url", ""),
                    "variables": data.get("variables", {}),
                }],
                "current_environment_id": None,
                "tests": data.get("tests", []),
            }]
            self.current_project_id = self.projects[0]["id"]
            self.global_variables = {}
        self.sync_current_config()

    def save(self):
        self.save_active_project()
        self.repo.save({
            "current_project_id": self.current_project_id,
            "projects": self.projects,
            "global_variables": self.global_variables,
        })


store = Store()
