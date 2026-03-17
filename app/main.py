import json
import secrets
import uuid
from pathlib import Path

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from sqlmodel import Session, select
from starlette.middleware.sessions import SessionMiddleware

from app.database import engine, init_db, get_session
from app.models import GameTemplate, Player, RealizedGame
from app import auth, engine as game_engine

APP_DIR = Path(__file__).parent

app = FastAPI(title="Evelyn", description="Your dream, your game.")
app.add_middleware(SessionMiddleware, secret_key=secrets.token_hex(32))
app.mount("/static", StaticFiles(directory=APP_DIR / "static"), name="static")
templates = Jinja2Templates(directory=APP_DIR / "templates")


@app.on_event("startup")
def on_startup():
    init_db()


# ── pages ─────────────────────────────────────────────────────


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})


@app.get("/create", response_class=HTMLResponse)
async def create_page(request: Request):
    return templates.TemplateResponse("create.html", {"request": request})


@app.get("/g/{game_id}", response_class=HTMLResponse)
async def game_landing(request: Request, game_id: str, session: Session = Depends(get_session)):
    template = session.get(GameTemplate, game_id)
    if not template:
        raise HTTPException(404, "Game not found")
    return templates.TemplateResponse("connect.html", {
        "request": request,
        "game": template,
    })


@app.get("/play/{game_id}", response_class=HTMLResponse)
async def play_page(request: Request, game_id: str, session: Session = Depends(get_session)):
    template = session.get(GameTemplate, game_id)
    if not template:
        raise HTTPException(404, "Game not found")
    return templates.TemplateResponse("play.html", {
        "request": request,
        "game": template,
    })


# ── API: game templates ──────────────────────────────────────


@app.post("/api/games")
async def create_game(request: Request, session: Session = Depends(get_session)):
    data = await request.json()
    game = GameTemplate(
        genre=data["genre"],
        mood=data.get("mood", ""),
        aesthetic=data.get("aesthetic", ""),
        prompt=data.get("prompt", ""),
    )
    session.add(game)
    session.commit()
    session.refresh(game)
    return {"id": game.id, "url": f"/g/{game.id}"}


@app.get("/api/games/{game_id}")
async def get_game(game_id: str, session: Session = Depends(get_session)):
    game = session.get(GameTemplate, game_id)
    if not game:
        raise HTTPException(404)
    return {
        "id": game.id,
        "genre": game.genre,
        "mood": game.mood,
        "aesthetic": game.aesthetic,
        "prompt": game.prompt,
    }


# ── API: WebAuthn ─────────────────────────────────────────────


@app.post("/api/auth/register/options")
async def register_options(request: Request):
    data = await request.json()
    username = data.get("username", f"dreamer-{uuid.uuid4().hex[:6]}")
    user_id = uuid.uuid4().hex

    options = auth.create_registration_options(user_id, username)

    session_id = secrets.token_hex(16)
    auth.store_challenge(session_id, options.challenge)
    request.session["webauthn_session"] = session_id
    request.session["webauthn_user_id"] = user_id
    request.session["webauthn_username"] = username

    # Serialize options for the browser
    from webauthn.helpers import options_to_json
    return JSONResponse(json.loads(options_to_json(options)))


@app.post("/api/auth/register/verify")
async def register_verify(request: Request, session: Session = Depends(get_session)):
    credential = await request.json()
    session_id = request.session.get("webauthn_session", "")
    challenge = auth.pop_challenge(session_id)

    if not challenge:
        raise HTTPException(400, "Challenge expired or missing")

    try:
        verification = auth.verify_registration(credential, challenge)
    except Exception as e:
        raise HTTPException(400, f"Registration failed: {e}")

    from webauthn.helpers import bytes_to_base64url
    player = Player(
        display_name=request.session.get("webauthn_username", ""),
        credential_id=bytes_to_base64url(verification.credential_id),
        public_key=bytes_to_base64url(verification.credential_public_key),
        sign_count=verification.sign_count,
    )
    session.add(player)
    session.commit()
    session.refresh(player)

    request.session["player_id"] = player.id
    return {"status": "ok", "player_id": player.id}


@app.post("/api/auth/login/options")
async def login_options(request: Request, session: Session = Depends(get_session)):
    # Get all known credential IDs
    players = session.exec(select(Player)).all()
    cred_ids = []
    from webauthn.helpers import base64url_to_bytes
    for p in players:
        try:
            cred_ids.append(base64url_to_bytes(p.credential_id))
        except Exception:
            pass

    options = auth.create_authentication_options(cred_ids)

    session_id = secrets.token_hex(16)
    auth.store_challenge(session_id, options.challenge)
    request.session["webauthn_session"] = session_id

    from webauthn.helpers import options_to_json
    return JSONResponse(json.loads(options_to_json(options)))


@app.post("/api/auth/login/verify")
async def login_verify(request: Request, session: Session = Depends(get_session)):
    credential = await request.json()
    session_id = request.session.get("webauthn_session", "")
    challenge = auth.pop_challenge(session_id)

    if not challenge:
        raise HTTPException(400, "Challenge expired")

    from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
    cred_id_b64 = credential.get("id", "")

    player = session.exec(
        select(Player).where(Player.credential_id == cred_id_b64)
    ).first()

    if not player:
        raise HTTPException(400, "Unknown credential")

    try:
        verification = auth.verify_authentication(
            credential,
            challenge,
            base64url_to_bytes(player.public_key),
            player.sign_count,
        )
    except Exception as e:
        raise HTTPException(400, f"Auth failed: {e}")

    player.sign_count = verification.new_sign_count
    session.add(player)
    session.commit()

    request.session["player_id"] = player.id
    return {"status": "ok", "player_id": player.id}


# ── API: player profile ──────────────────────────────────────


@app.post("/api/player/profile")
async def update_profile(request: Request, session: Session = Depends(get_session)):
    """Update player profile with connected account data."""
    player_id = request.session.get("player_id")
    if not player_id:
        raise HTTPException(401, "Not authenticated")

    player = session.get(Player, player_id)
    if not player:
        raise HTTPException(404)

    data = await request.json()
    if "display_name" in data:
        player.display_name = data["display_name"]

    # Legacy fields (keep for backward compat)
    if "places" in data:
        player.places_data = json.dumps(data["places"])
    if "interests" in data:
        player.interests_data = json.dumps(data["interests"])
    if "colors" in data:
        player.colors_data = json.dumps(data["colors"])

    # Store the full rich profile (quiz, browser signals, hesitations, etc.)
    rich_profile = {}
    for key in (
        "quiz", "hesitations", "reversals", "quiz_timing",
        "browser_signals", "extension_data",
    ):
        if key in data:
            rich_profile[key] = data[key]

    if rich_profile:
        # Merge with any existing profile data
        existing = {}
        if player.full_profile:
            try:
                existing = json.loads(player.full_profile)
            except (json.JSONDecodeError, TypeError):
                pass
        existing.update(rich_profile)
        player.full_profile = json.dumps(existing)

    session.add(player)
    session.commit()
    return {"status": "ok"}


# ── API: generate & play ─────────────────────────────────────


@app.post("/api/games/{game_id}/generate")
async def generate_game(game_id: str, request: Request, session: Session = Depends(get_session)):
    template = session.get(GameTemplate, game_id)
    if not template:
        raise HTTPException(404)

    player_id = request.session.get("player_id")
    player = session.get(Player, player_id) if player_id else None

    game_data = await game_engine.generate_game(template, player)

    realized = RealizedGame(
        template_id=game_id,
        player_id=player_id or "anonymous",
        game_data=json.dumps(game_data),
    )
    session.add(realized)
    session.commit()

    return game_data


# ── health ────────────────────────────────────────────────────


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
