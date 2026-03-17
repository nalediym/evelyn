import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Game template -- what the creator builds
# ---------------------------------------------------------------------------
class GameTemplate(SQLModel, table=True):
    __tablename__ = "game_templates"

    id: str = Field(default_factory=_new_id, primary_key=True)
    genre: str  # horror, adventure, puzzle, chill, surreal
    mood: str  # comma-separated: eerie,nostalgic
    aesthetic: str  # comma-separated: lo-fi,polaroid,warm
    prompt: str  # creator's freeform description
    created_at: datetime = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# Player -- identified by WebAuthn credential
# ---------------------------------------------------------------------------
class Player(SQLModel, table=True):
    __tablename__ = "players"

    id: str = Field(default_factory=_new_id, primary_key=True)
    display_name: str = ""
    credential_id: str = Field(index=True)  # base64url WebAuthn credential ID
    public_key: str = ""  # stored PEM / base64
    sign_count: int = 0

    # Data from connected accounts (JSON blobs)
    photos_data: Optional[str] = None
    places_data: Optional[str] = None
    interests_data: Optional[str] = None
    aesthetic_data: Optional[str] = None
    colors_data: Optional[str] = None

    created_at: datetime = Field(default_factory=_now)


# ---------------------------------------------------------------------------
# Realized game -- AI-generated unique version for a player
# ---------------------------------------------------------------------------
class RealizedGame(SQLModel, table=True):
    __tablename__ = "realized_games"

    id: str = Field(default_factory=_new_id, primary_key=True)
    template_id: str = Field(foreign_key="game_templates.id")
    player_id: str = Field(foreign_key="players.id")
    game_data: str = ""  # full JSON game state
    generated_at: datetime = Field(default_factory=_now)
