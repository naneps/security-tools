import uuid

from fastapi import APIRouter, HTTPException

from ..state import store

router = APIRouter(tags=["projects"])


@router.get("/projects")
def list_projects():
    store.save_active_project()
    return {
        "current_project_id": store.current_project_id,
        "projects": [
            {
                "id": p["id"],
                "name": p["name"],
                "environments": p.get("environments", []),
                "current_environment_id": p.get("current_environment_id"),
            }
            for p in store.projects
        ],
        "global_variables": store.global_variables,
    }


@router.post("/projects")
def create_project(data: dict):
    name = data.get("name", f"Project {len(store.projects) + 1}")
    pid = str(uuid.uuid4())
    env_id = str(uuid.uuid4())
    new_p = {
        "id": pid,
        "name": name,
        "environments": [{
            "id": env_id,
            "name": "Local",
            "base_url": data.get("base_url", ""),
            "variables": data.get("variables", {}),
        }],
        "current_environment_id": env_id,
        "tests": [],
    }
    store.projects.append(new_p)
    store.current_project_id = pid
    store.sync_current_config()
    store.save()
    return {"id": pid, "name": name}


@router.post("/projects/{project_id}/switch")
def switch_project(project_id: str):
    if not any(p.get("id") == project_id for p in store.projects):
        raise HTTPException(status_code=404, detail="Project not found")
    store.current_project_id = project_id
    store.sync_current_config()
    store.save()
    return {
        "status": "switched",
        "current_project_id": store.current_project_id,
        "config": store.current_config.to_dict(),
    }


@router.put("/projects/{project_id}")
def update_project(project_id: str, data: dict):
    proj = next((p for p in store.projects if p.get("id") == project_id), None)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if "name" in data:
        proj["name"] = data["name"]
    if "environments" in data:
        proj["environments"] = data["environments"]
        if proj.get("current_environment_id") not in [e.get("id") for e in proj.get("environments", [])]:
            if proj.get("environments"):
                proj["current_environment_id"] = proj["environments"][0]["id"]
    store.save()
    store.sync_current_config()
    return {"status": "updated", "project": proj}


@router.delete("/projects/{project_id}")
def delete_project(project_id: str):
    proj = next((p for p in store.projects if p.get("id") == project_id), None)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    store.projects.remove(proj)
    if store.current_project_id == project_id:
        store.current_project_id = store.projects[0]["id"] if store.projects else None
    store.sync_current_config()
    store.save()
    return {
        "status": "deleted",
        "current_project_id": store.current_project_id,
        "config": store.current_config.to_dict(),
    }


@router.put("/global")
def update_global(data: dict):
    if "variables" in data:
        store.global_variables = data["variables"]
    store.save()
    store.sync_current_config()
    return {"status": "updated", "global_variables": store.global_variables}
