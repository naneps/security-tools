import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .state import store
from .routers import config, projects, environments, tests, runs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Capture the running loop so worker threads can dispatch WS sends safely.
    store.main_loop = asyncio.get_running_loop()
    store.load()
    yield


app = FastAPI(title="Security Tools API", lifespan=lifespan)

# CORS for the React dev server (the app also uses a Vite proxy in dev).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (config, projects, environments, tests, runs):
    app.include_router(module.router)


if __name__ == "__main__":
    print("\033[94m[BACKEND]\033[0m \033[1mStarting FastAPI + Uvicorn...\033[0m")
    print("\033[94m[BACKEND]\033[0m → http://localhost:8000")
    print("\033[94m[BACKEND]\033[0m Docs → http://localhost:8000/docs")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        use_colors=True,
    )
