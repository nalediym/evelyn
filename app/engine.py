"""AI personalization engine.

Takes a game template + player profile and generates a unique game.
Uses Claude API when ANTHROPIC_API_KEY is set, otherwise falls back
to a simple template-based generator so the app works without keys.
"""

import html
import json
import os
import random
import re
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
    "quiz": {
        "fear": "being seen",
        "place": "an empty school at night",
        "sound": "a door creaking open slowly",
        "feeling": "falling",
        "color": "deep violet",
    },
    "hesitations": [
        {"question": "fear", "option": "the dark", "duration": 4.2},
        {"question": "feeling", "option": "floating", "duration": 3.1},
    ],
    "reversals": [
        {"question": "sound", "option": "someone calling your name"},
    ],
    "quiz_timing": {
        "fear": 8.5,
        "place": 5.2,
        "sound": 12.1,
        "feeling": 6.8,
        "color": 3.0,
    },
    "browser_signals": {
        "time_of_day": "night",
        "is_night": True,
        "timezone": "Africa/Johannesburg",
        "language": "en-US",
        "dark_mode": True,
        "screen_width": 1440,
        "screen_height": 900,
        "is_touch": False,
        "is_mobile": False,
        "history_length": 34,
        "referrer": "",
        "navigation_type": "navigate",
        "device_memory": 8,
        "cpu_cores": 8,
        "connection_type": "4g",
        "battery_level": 0.72,
        "battery_charging": False,
        "clipboard_text": "",
        "geolocation": None,
    },
    "extension_data": {
        "top_sites": ["github.com", "youtube.com", "reddit.com"],
        "active_hours": [22, 23, 0, 1, 2],
        "is_night_owl": True,
        "total_visits_week": 312,
        "top_categories": ["development", "entertainment", "news"],
        "browsing_intensity": "high",
        "open_tabs": 27,
        "tab_categories": ["code", "docs", "video"],
        "bookmark_folders": ["projects", "music", "inspo"],
    },
}

# ── fear → enemy behavior mapping ────────────────────────────

FEAR_BEHAVIORS = {
    "being seen": "enemies freeze when you face them, but move when you look away",
    "the dark": "visibility is extremely limited; light sources flicker and die",
    "being followed": "shadows trail behind you and mimic your movements",
    "being alone": "the world empties as you enter each room; echoes mock you",
    "losing control": "controls randomly invert; the world shifts without warning",
    "forgetting": "scene details change subtly each time you revisit",
    "deep water": "the ground is translucent; dark shapes move underneath",
    "heights": "the floor crumbles at the edges; vertigo distortion effects",
    "loud noises": "sudden sound bursts cause screen shake and disorientation",
    "silence": "ambient sounds cut out abruptly; the silence is deafening",
}

# ── feeling → physics modifiers ──────────────────────────────

FEELING_MODIFIERS = {
    "floating": {"gravity": "low", "description": "low gravity — the player drifts"},
    "running but slow": {"gravity": "normal", "description": "one level has reduced movement speed"},
    "falling": {"gravity": "high", "description": "a vertical level, always descending"},
    "deja vu": {"gravity": "normal", "description": "a level repeats with unsettling changes"},
    "paralyzed": {"gravity": "normal", "description": "movement is delayed, dreamlike lag"},
    "weightless": {"gravity": "zero", "description": "no gravity at all, float freely"},
    "heavy": {"gravity": "crushing", "description": "everything is slow, weighty, oppressive"},
    "spinning": {"gravity": "shifting", "description": "gravity direction rotates slowly"},
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


def _sanitize_clipboard(text: str) -> str:
    """Sanitize clipboard text for safe inclusion in game scenes."""
    if not text:
        return ""
    # Strip HTML tags and scripts
    text = re.sub(r"<[^>]+>", "", text)
    # Remove script content
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # HTML-escape remaining text
    text = html.escape(text)
    # Truncate
    return text[:100].strip()


def _build_player_profile(player) -> dict:
    """Extract a usable profile from a Player model instance."""
    profile = dict(DEMO_PLAYER_PROFILE)

    if player and player.display_name:
        profile["name"] = player.display_name

    # Legacy fields
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

    # Rich profile from full_profile JSON blob
    if player and player.full_profile:
        try:
            rich = json.loads(player.full_profile)
        except (json.JSONDecodeError, TypeError):
            rich = {}

        if rich.get("quiz"):
            profile["quiz"] = rich["quiz"]
        if rich.get("hesitations"):
            profile["hesitations"] = rich["hesitations"]
        if rich.get("reversals"):
            profile["reversals"] = rich["reversals"]
        if rich.get("quiz_timing"):
            profile["quiz_timing"] = rich["quiz_timing"]
        if rich.get("browser_signals"):
            profile["browser_signals"] = rich["browser_signals"]
        if rich.get("extension_data"):
            profile["extension_data"] = rich["extension_data"]

    return profile


def _fallback_generate(template, profile: dict) -> dict:
    """Generate a game without AI, using templates and randomization."""
    genre_key = template.genre.lower()
    genre = GENRE_TEMPLATES.get(genre_key, GENRE_TEMPLATES["surreal"])

    place = random.choice(profile["places"])
    name = profile["name"]
    colors = list(profile["colors"])

    quiz = profile.get("quiz", {})
    browser = profile.get("browser_signals", {})
    hesitations = profile.get("hesitations", [])
    reversals = profile.get("reversals", [])
    extension = profile.get("extension_data", {})

    # ── color from quiz ──────────────────────────────────
    quiz_color = quiz.get("color", "")
    COLOR_MAP = {
        "deep violet": "#4a0080",
        "blood red": "#8b0000",
        "midnight blue": "#191970",
        "forest green": "#228b22",
        "burnt orange": "#cc5500",
        "ash grey": "#b2beb5",
        "pale gold": "#eee8aa",
        "black": "#0a0a0a",
    }
    if quiz_color:
        mapped = COLOR_MAP.get(quiz_color.lower())
        if mapped:
            colors[0] = mapped  # primary palette color from quiz

    # ── fear → enemy behavior ────────────────────────────
    fear = quiz.get("fear", "")
    fear_behavior = FEAR_BEHAVIORS.get(fear, "shadows move at the edge of your vision")

    # ── feeling → physics ────────────────────────────────
    feeling = quiz.get("feeling", "")
    physics = FEELING_MODIFIERS.get(feeling, {"gravity": "normal", "description": ""})

    # ── place from quiz → level names ────────────────────
    quiz_place = quiz.get("place", "")

    # ── sound from quiz ──────────────────────────────────
    quiz_sound = quiz.get("sound", "")

    # ── browser signal modifiers ─────────────────────────
    is_night = browser.get("is_night", False)
    battery_level = browser.get("battery_level", 1.0)
    history_length = browser.get("history_length", 0)
    clipboard_text = _sanitize_clipboard(browser.get("clipboard_text", ""))
    referrer = browser.get("referrer", "")
    is_mobile = browser.get("is_mobile", False)

    # Apply battery fading effect
    fading_dream = battery_level is not None and battery_level < 0.2

    # ── extension data modifiers ─────────────────────────
    is_night_owl = extension.get("is_night_owl", False)
    open_tabs = extension.get("open_tabs", 0)
    top_categories = extension.get("top_categories", [])

    # ── hesitation → secondary themes ────────────────────
    hesitation_themes = [h.get("option", "") for h in hesitations if h.get("option")]

    # ── reversals → avoidance themes ─────────────────────
    reversal_themes = [r.get("option", "") for r in reversals if r.get("option")]

    title_template = random.choice(genre["title_templates"])
    title = title_template.format(name=name, place=quiz_place or place)

    moods = [m.strip() for m in template.mood.split(",")]
    aesthetics = [a.strip() for a in template.aesthetic.split(",")]

    # Modify aesthetics based on browser signals
    if fading_dream:
        aesthetics.append("desaturated")
        aesthetics.append("fading")
    if is_night or is_night_owl:
        aesthetics.append("dark-lit")

    scenes = []
    for i, scene_type in enumerate(genre["scene_types"]):
        interaction = random.choice(genre["object_interactions"])

        exits = []
        if i < len(genre["scene_types"]) - 1:
            next_scene = genre["scene_types"][i + 1]
            exits.append({
                "direction": "forward",
                "to": next_scene,
                "label": "Continue deeper",
            })
        if i > 0:
            prev_scene = genre["scene_types"][i - 1]
            exits.append({
                "direction": "back",
                "to": prev_scene,
                "label": "Go back",
            })

        scene_place = random.choice(profile["places"])

        # Build scene description with rich profile data
        desc_parts = [f"You're in {scene_place}."]

        # Sound from quiz
        if quiz_sound and i == 1:
            desc_parts.append(f"You hear {quiz_sound}.")

        # Fear behavior
        if i == 2:  # dark_room / cave / etc
            desc_parts.append(fear_behavior.capitalize() + ".")

        # Feeling / physics
        if physics["description"] and i == 0:
            desc_parts.append(physics["description"].capitalize() + ".")

        # Browser: night lighting
        if is_night:
            desc_parts.append("Everything is lit by a cold, low light.")

        # Browser: cluttered mind
        if history_length > 20 and i == 0:
            desc_parts.append("Your mind feels cluttered; fragments of thoughts litter the ground.")

        # Browser: mobile → claustrophobia
        if is_mobile:
            desc_parts.append("The walls press close.")

        # Extension: too many tabs → rooms multiply
        if open_tabs and open_tabs > 20 and i == 1:
            desc_parts.append("Doorways keep appearing in the walls — rooms multiplying endlessly.")

        # Extension: categories → object flavor
        if top_categories and i == 2:
            desc_parts.append(f"The room is filled with traces of {', '.join(top_categories[:2])}.")

        # Hesitation themes appear subtly
        if hesitation_themes and i == 1:
            theme = random.choice(hesitation_themes)
            desc_parts.append(f"Something about '{theme}' lingers at the edge of your awareness.")

        # Reversals: things the dream tries to show
        if reversal_themes and i == 2:
            theme = random.choice(reversal_themes)
            desc_parts.append(f"The dream tries to show you '{theme}', but you look away.")

        # Fading dream aesthetic
        if fading_dream:
            desc_parts.append("The colors are draining. The dream is fading.")

        # Mood and aesthetic baseline
        desc_parts.append(
            f"The air feels {random.choice(moods)}. "
            f"Everything has a {random.choice(aesthetics)} quality."
        )

        # Background color: darken for night
        bg_color = colors[i % len(colors)]
        if is_night and not bg_color.startswith("#0"):
            # Slightly darken by using a darker shade
            bg_color = colors[i % len(colors)]

        # Generate 2-4 objects per scene
        num_objects = random.randint(2, 4)
        scene_objects = []
        used_positions = []
        available_objects = list(profile.get("objects", ["a strange object"]))

        # Add clipboard text as a wall sign in one scene
        if clipboard_text and i == 2:
            for _attempt in range(10):
                ox = random.randint(120, 520)
                oy = random.randint(80, 380)
                if all(abs(ox - px) > 80 or abs(oy - py) > 80 for px, py in used_positions):
                    break
            used_positions.append((ox, oy))
            scene_objects.append({
                "name": "a sign on the wall",
                "x": ox,
                "y": oy,
                "color": colors[0],
                "interaction": f"The sign reads: \"{clipboard_text}\"",
            })

        for j in range(num_objects):
            for _attempt in range(10):
                ox = random.randint(120, 520)
                oy = random.randint(80, 380)
                if all(abs(ox - px) > 80 or abs(oy - py) > 80 for px, py in used_positions):
                    break
            used_positions.append((ox, oy))

            obj_name = random.choice(available_objects)
            scene_objects.append({
                "name": obj_name,
                "x": ox,
                "y": oy,
                "color": colors[(i + j) % len(colors)],
                "interaction": random.choice(genre["object_interactions"]),
            })

        scenes.append({
            "id": scene_type,
            "name": scene_type.replace("_", " ").title(),
            "description": " ".join(desc_parts),
            "background_color": bg_color,
            "objects": scene_objects,
            "exits": exits,
            "physics": physics if physics["description"] else None,
            "fear_behavior": fear_behavior if i == 2 else None,
        })

    # Opening narrative from referrer
    opening_note = ""
    if referrer:
        opening_note = f"You arrived here from somewhere else — {referrer} still echoes."

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
        "opening_note": opening_note,
        "dream_modifiers": {
            "fear": fear,
            "feeling": feeling,
            "physics": physics,
            "fading_dream": fading_dream,
            "is_night": is_night,
            "is_mobile": is_mobile,
        },
    }


async def _ai_generate(template, profile: dict) -> dict:
    """Generate a personalized game using Claude API."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

    # Build rich profile summary for the AI
    quiz = profile.get("quiz", {})
    hesitations = profile.get("hesitations", [])
    reversals = profile.get("reversals", [])
    quiz_timing = profile.get("quiz_timing", {})
    browser = profile.get("browser_signals", {})
    extension = profile.get("extension_data", {})

    system_prompt = """You are Evelyn's dream engine. You generate personalized micro-game data.

Given a game template (genre, mood, aesthetic, prompt) and a deeply personal player profile,
generate a unique game that feels like the player's own dream.

CRITICAL PERSONALIZATION RULES:

1. **Quiz answers** shape the dream's core:
   - fear → defines enemy/threat behavior and tension
   - place → level names, settings, and atmosphere
   - sound → appears in scene descriptions as ambient audio
   - feeling → affects physics and movement (floating = low gravity, falling = vertical levels, deja vu = a scene repeats with changes)
   - color → primary palette color for the dream

2. **Hesitations** (options the player lingered on) are secondary themes. Weave them in subtly — they represent things the subconscious is drawn to but didn't commit to. They should appear at the periphery, half-seen.

3. **Reversals** (options selected then deselected) are things the dream "tries to show but the player looks away from." Include them as fleeting glimpses, averted moments, things that almost happen.

4. **Quiz timing** reveals what questions made the player think longest. Those topics deserve more depth and nuance in the dream.

5. **Browser signals** add environmental texture:
   - is_night → dark, nocturnal lighting
   - battery_level < 0.2 → "fading dream" aesthetic, desaturated colors, dream dissolving
   - history_length > 20 → "cluttered mind" environmental detail (scattered objects, overwhelming spaces)
   - clipboard_text → appears as text on a wall, sign, or note in one scene (already sanitized, use as-is)
   - referrer → affects the opening narrative ("you came from...")
   - is_mobile → tighter, more claustrophobic level design
   - dark_mode → darker overall palette

6. **Extension data** (if present) adds depth:
   - is_night_owl → affects time-of-day in the dream world
   - open_tabs > 20 → "rooms keep multiplying" motif
   - top_categories → influences objects, references, and environmental details
   - bookmark_folders → potential scene names or thematic anchors

Respond with ONLY valid JSON matching this structure:
{
  "title": "string",
  "genre": "string",
  "mood": ["string"],
  "aesthetic": ["string"],
  "prompt": "string",
  "player_name": "string",
  "opening_note": "string (1 sentence, sets the tone, can reference referrer)",
  "scenes": [
    {
      "id": "string (snake_case)",
      "name": "string",
      "description": "string (2-4 sentences, dreamlike, deeply personal to this specific player)",
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
      ],
      "physics": {"gravity": "low|normal|high|zero|shifting|crushing", "description": "string"} or null,
      "fear_behavior": "string or null"
    }
  ],
  "start_scene": "first scene id",
  "win_scene": "last scene id",
  "dream_modifiers": {
    "fear": "string",
    "feeling": "string",
    "physics": {"gravity": "string", "description": "string"},
    "fading_dream": boolean,
    "is_night": boolean,
    "is_mobile": boolean
  }
}

Generate exactly 4 scenes. Make every description deeply personal — this player should feel like the game was made from their own subconscious. Use their hesitations and reversals with subtlety."""

    # Build the user prompt with full profile data
    profile_sections = []
    profile_sections.append(f"Name: {profile.get('name', 'Dreamer')}")
    profile_sections.append(f"Places: {json.dumps(profile.get('places', []))}")
    profile_sections.append(f"Colors: {json.dumps(profile.get('colors', []))}")
    profile_sections.append(f"Objects: {json.dumps(profile.get('objects', []))}")
    profile_sections.append(f"Interests: {json.dumps(profile.get('interests', []))}")

    if quiz:
        profile_sections.append(f"\nQuiz answers (core dream seeds):\n{json.dumps(quiz, indent=2)}")
    if hesitations:
        profile_sections.append(f"\nHesitations (lingered on, subconscious draw):\n{json.dumps(hesitations, indent=2)}")
    if reversals:
        profile_sections.append(f"\nReversals (selected then rejected — the dream tries to show these):\n{json.dumps(reversals, indent=2)}")
    if quiz_timing:
        profile_sections.append(f"\nQuiz timing (seconds per question — longer = more depth):\n{json.dumps(quiz_timing, indent=2)}")
    if browser:
        # Sanitize clipboard before sending to AI
        browser_safe = dict(browser)
        if browser_safe.get("clipboard_text"):
            browser_safe["clipboard_text"] = _sanitize_clipboard(browser_safe["clipboard_text"])
        profile_sections.append(f"\nBrowser signals (environmental context):\n{json.dumps(browser_safe, indent=2)}")
    if extension:
        profile_sections.append(f"\nExtension data (browsing behavior):\n{json.dumps(extension, indent=2)}")

    user_prompt = f"""Game template:
- Genre: {template.genre}
- Mood: {template.mood}
- Aesthetic: {template.aesthetic}
- Creator's prompt: {template.prompt}

Player profile:
{chr(10).join(profile_sections)}

Generate this player's unique dream game. Make it feel like it was pulled from their subconscious."""

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=3000,
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
