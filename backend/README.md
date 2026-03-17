# Evelyn Python

This is the Python submodule for the Evelyn project.

## What this prototype includes

- Phaser playground
- Blockly panel with five actions: move, jump, spawn, score, win
- json-logic-js runtime execution
- Save/load project support with PocketBase (`micro_games` collection)

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python app/main.py
```

Open `http://127.0.0.1:8000`.

## PocketBase setup

Run PocketBase locally (default URL: `http://127.0.0.1:8090`) and create a collection named `micro_games` with these text fields:

- `name` (required, unique)
- `blockly_xml`
- `actions`
- `updated_at`

Set `POCKETBASE_URL` if your PocketBase server is not at the default URL.
