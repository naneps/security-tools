from fastapi import APIRouter, HTTPException

from ..core.tester import EndpointTest
from ..state import store

router = APIRouter(tags=["endpoints"])


@router.get("/tests")
def get_tests():
    return store.current_config.tests


@router.post("/tests")
def add_test(test_data: dict):
    test = EndpointTest.from_dict(test_data)
    store.current_config.tests.append(test)
    store.save()
    return test.to_dict()


@router.put("/tests/{test_id}")
def update_test(test_id: str, test_data: dict):
    for i, t in enumerate(store.current_config.tests):
        if t.id == test_id:
            store.current_config.tests[i] = EndpointTest.from_dict(test_data)
            store.save()
            return store.current_config.tests[i].to_dict()
    raise HTTPException(status_code=404, detail="Endpoint not found")


@router.delete("/tests/{test_id}")
def delete_test(test_id: str):
    store.current_config.tests = [t for t in store.current_config.tests if t.id != test_id]
    store.save()
    return {"status": "deleted"}


@router.post("/tests/{test_id}/duplicate")
def duplicate_test(test_id: str):
    orig = next((t for t in store.current_config.tests if t.id == test_id), None)
    if not orig:
        raise HTTPException(status_code=404, detail="Endpoint not found")
    new_test = EndpointTest(
        None,
        f"{orig.name} (copy)",
        orig.url,
        orig.method,
        dict(orig.headers),
        dict(orig.payload),
        orig.payload_type,
        dict(orig.extractors),
        dict(orig.run_config) if orig.run_config else None,
    )
    store.current_config.tests.append(new_test)
    store.save()
    return new_test.to_dict()
