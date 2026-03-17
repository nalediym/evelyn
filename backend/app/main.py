import os

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import uvicorn

app = FastAPI(
    title="Evelyn Micro-Game Builder",
    description="Build a tiny game in five minutes",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Configure templates
templates = Jinja2Templates(directory="app/templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Micro-game builder page"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/config")
async def get_config():
    """Runtime configuration for frontend clients"""
    return {
        "pocketbase_url": os.getenv("POCKETBASE_URL", "http://127.0.0.1:8090")
    }

@app.get("/worlds")
@app.get("/api/worlds")
async def get_worlds():
    """Get available worlds"""
    return {
        "worlds": [
            {
                "id": "1",
                "name": "Crystal World",
                "description": "A world where magic flows like crystals",
                "status": "active",
                "players": 15
            },
            {
                "id": "2", 
                "name": "Shadow Realm",
                "description": "A dark realm full of mysteries",
                "status": "active",
                "players": 8
            }
        ],
        "total": 2
    }

@app.get("/worlds/{world_id}")
@app.get("/api/worlds/{world_id}")
async def get_world(world_id: str):
    """Get details of a specific world"""
    return {
        "id": world_id,
        "name": f"World {world_id}",
        "description": f"Description of world {world_id}",
        "status": "active",
        "players": 12,
        "max_players": 20
    }


@app.get("/worlds/{world_id}/stories")
async def get_world_stories(world_id: str):
    """Get stories for a specific world"""
    return {
        "stories": [
            {
                "id": f"story-{world_id}-1",
                "title": "First Light",
                "status": "draft"
            }
        ],
        "total": 1
    }

@app.get("/api/health")
async def health_check():
    """Check application status"""
    return {"status": "healthy", "message": "Evelyn is running correctly"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
