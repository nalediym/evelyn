import re
import importlib.util
from pathlib import Path

OPENAPI_SPEC_PATH = Path(__file__).resolve().parents[2] / "evelyn-specs" / "openapi.yaml"
APP_MAIN_PATH = Path(__file__).resolve().parents[1] / "app" / "main.py"
PATH_KEY_PATTERN = re.compile(r"^  (/[^:]+):\s*$")


def _load_fastapi_app():
    spec = importlib.util.spec_from_file_location("evelyn_app_main", APP_MAIN_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load FastAPI app module from {APP_MAIN_PATH}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.app


def _required_paths_from_spec() -> set[str]:
    spec_text = OPENAPI_SPEC_PATH.read_text(encoding="utf-8")
    required_paths: set[str] = set()
    in_paths_block = False

    for line in spec_text.splitlines():
        if line.startswith("paths:"):
            in_paths_block = True
            continue

        if in_paths_block and line and not line.startswith(" "):
            break

        if not in_paths_block:
            continue

        path_key_match = PATH_KEY_PATTERN.match(line)
        if path_key_match:
            required_paths.add(path_key_match.group(1))

    return required_paths


def test_fastapi_paths_match_mvp_openapi_spec() -> None:
    app = _load_fastapi_app()
    required_paths = _required_paths_from_spec()
    generated_paths = set(app.openapi()["paths"].keys())
    missing_required_paths = sorted(required_paths - generated_paths)

    assert not missing_required_paths, (
        "OpenAPI path drift detected. Missing required MVP paths in FastAPI app: "
        f"{missing_required_paths}. Generated paths: {sorted(generated_paths)}"
    )
