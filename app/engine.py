"""AI personalization engine.

Takes a game template + player profile and generates a unique game.
Uses Claude API when ANTHROPIC_API_KEY is set, otherwise falls back
to a simple template-based generator so the app works without keys.
"""

import json
import os
import random
from typing import Any

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# ── fallback demo data ────────────────────────────────────────

DEMO_PLAYER_PROFILE = {
    "name": "Dreamer",
    "places": ["a city you half-remember", "a rooftop at dusk", "a quiet beach"],
    "colors": ["#2a1f3d", "#f4a261", "#264653", "#e76f51"],
    "objects": ["an old polaroid camera", "a cracked mirror", "a music box"],
    "interests": ["music", "late-night walks", "strange films"],
    "aesthetic": "warm lo-fi film grain with deep shadows",
}

GENRE_TEMPLATES = {
    "horror": {
        "title_templates": [
            "The House That Remembers {name}",
            "{name}'s Last Dream",
            "The Door in {place}",
        ],
        "scene_types": ["entrance", "hallway", "dark_room", "final_room"],
        "object_interactions": [
            "It feels warm, like it's been waiting for you.",
            "You hear a whisper: your name, backwards.",
            "It shows you something you forgot on purpose.",
            "The room shifts when you touch it.",
        ],
    },
    "adventure": {
        "title_templates": [
            "{name}'s Waking Dream",
            "The Map to {place}",
            "Echoes of {place}",
        ],
        "scene_types": ["clearing", "bridge", "cave", "summit"],
        "object_interactions": [
            "It glows faintly, pulsing like a heartbeat.",
            "A path opens that wasn't there before.",
            "You remember this from somewhere.",
            "It hums a tune only you would know.",
        ],
    },
    "puzzle": {
        "title_templates": [
            "The {name} Sequence",
            "Unlocking {place}",
            "{name} in the Loop",
        ],
        "scene_types": ["grid_room", "mirror_room", "clock_room", "exit"],
        "object_interactions": [
            "The pattern matches something you've seen before.",
            "It rearranges when you look away.",
            "Numbers appear: they mean something to you.",
            "The pieces fit, but the picture keeps changing.",
        ],
    },
    "chill": {
        "title_templates": [
            "A Quiet Moment for {name}",
            "The Garden in {place}",
            "Drifting Through {place}",
        ],
        "scene_types": ["garden", "library", "rooftop", "shore"],
        "object_interactions": [
            "It's exactly where you left it.",
            "The breeze carries a familiar scent.",
            "Time moves differently here.",
            "You could stay here forever.",
        ],
    },
    "surreal": {
        "title_templates": [
            "{name}'s Fever Dream",
            "The {place} That Isn't",
            "Dissolving {place}",
        ],
        "scene_types": ["floating_room", "upside_room", "liquid_room", "void"],
        "object_interactions": [
            "It's you, but not you.",
            "Gravity forgets which way is down.",
            "It tastes like a color you can't name.",
            "The walls are breathing.",
        ],
    },
}


def _build_player_profile(player) -> dict:
    """Extract a usable profile from a Player model instance."""
    profile = dict(DEMO_PLAYER_PROFILE)
    if player and player.display_name:
        profile["name"] = player.display_name
    if player and player.places_data:
        try:
            profile["places"] = json.loads(player.places_data)
        except (json.JSONDecodeError, TypeError):
            pass
    if player and player.colors_data:
        try:
            profile["colors"] = json.loads(player.colors_data)
        except (json.JSONDecodeError, TypeError):
            pass
    if player and player.interests_data:
        try:
            profile["interests"] = json.loads(player.interests_data)
        except (json.JSONDecodeError, TypeError):
            pass
    return profile


def _fallback_generate(template, profile: dict) -> dict:
    """Generate a game without AI, using templates and randomization."""
    genre_key = template.genre.lower()
    genre = GENRE_TEMPLATES.get(genre_key, GENRE_TEMPLATES["surreal"])

    place = random.choice(profile["places"])
    name = profile["name"]
    colors = profile["colors"]

    title_template = random.choice(genre["title_templates"])
    title = title_template.format(name=name, place=place)

    moods = [m.strip() for m in template.mood.split(",")]
    aesthetics = [a.strip() for a in template.aesthetic.split(",")]

    scenes = []
    for i, scene_type in enumerate(genre["scene_types"]):
        obj_name = random.choice(profile["objects"]) if profile.get("objects") else "a strange object"
        interaction = random.choice(genre["object_interactions"])

        exits = []
        if i < len(genre["scene_types"]) - 1:
            next_scene = genre["scene_types"][i + 1]
            exits.append({
                "direction": "forward",
                "to": next_scene,
                "label": f"Continue deeper",
            })
        if i > 0:
            prev_scene = genre["scene_types"][i - 1]
            exits.append({
                "direction": "back",
                "to": prev_scene,
                "label": "Go back",
            })

        scene_place = random.choice(profile["places"])
        scenes.append({
            "id": scene_type,
            "name": scene_type.replace("_", " ").title(),
            "description": (
                f"You're in {scene_place}. "
                f"The air feels {random.choice(moods)}. "
                f"Everything has a {random.choice(aesthetics)} quality to it."
            ),
            "background_color": colors[i % len(colors)],
            "objects": [
                {
                    "name": obj_name,
                    "x": random.randint(100, 500),
                    "y": random.randint(100, 350),
                    "color": colors[(i + 1) % len(colors)],
                    "interaction": interaction,
                }
            ],
            "exits": exits,
        })

    return {
        "title": title,
        "genre": template.genre,
        "mood": moods,
        "aesthetic": aesthetics,
        "prompt": template.prompt,
        "player_name": name,
        "scenes": scenes,
        "start_scene": scenes[0]["id"],
        "win_scene": scenes[-1]["id"],
    }


async def _ai_generate(template, profile: dict) -> dict:
    """Generate a personalized game using Claude API."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    system_prompt = """You are Evelyn's dream engine. You generate personalized micro-game data.

Given a game template (genre, mood, aesthetic, prompt) and a player profile (name, places, colors, objects, interests),
generate a unique game that feels like the player's own dream.

Respond with ONLY valid JSON matching this structure:
{
  "title": "string",
  "genre": "string",
  "mood": ["string"],
  "aesthetic": ["string"],
  "prompt": "string",
  "player_name": "string",
  "scenes": [
    {
      "id": "string (snake_case)",
      "name": "string",
      "description": "string (2-3 sentences, dreamlike, personal to the player)",
      "background_color": "#hexcolor",
      "objects": [
        {
          "name": "string",
          "x": number (100-500),
          "y": number (100-350),
          "color": "#hexcolor",
          "interaction": "string (1-2 sentences, personal, evocative)"
        }
      ],
      "exits": [
        {"direction": "forward|back", "to": "scene_id", "label": "string"}
      ]
    }
  ],
  "start_scene": "first scene id",
  "win_scene": "last scene id"
}

Generate exactly 4 scenes. Make descriptions dreamlike and deeply personal using the player's data.
Weave their places, interests, and name into the narrative naturally."""

    user_prompt = f"""Game template:
- Genre: {template.genre}
- Mood: {template.mood}
- Aesthetic: {template.aesthetic}
- Creator's prompt: {template.prompt}

Player profile:
{json.dumps(profile, indent=2)}

Generate this player's unique dream game."""

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    text = response.content[0].text
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]

    return json.loads(text)


async def generate_game(template, player) -> dict:
    """Generate a personalized game. Uses AI if available, fallback otherwise."""
    profile = _build_player_profile(player)

    if ANTHROPIC_API_KEY:
        try:
            return await _ai_generate(template, profile)
        except Exception as e:
            print(f"AI generation failed, using fallback: {e}")

    return _fallback_generate(template, profile)
