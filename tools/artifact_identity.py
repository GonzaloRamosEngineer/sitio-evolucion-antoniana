"""Identidad institucional compartida por los generadores de artefactos."""

import json
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
CONFIG = Path(__file__).with_name("entity-artifacts.generated.json")
ENTITY = json.loads(CONFIG.read_text(encoding="utf-8"))


def site_url(route: str) -> str:
    return f"{ENTITY['sitio'].rstrip('/')}/{route.lstrip('/')}"


def display_url(route: str) -> str:
    host = urlsplit(ENTITY["sitio"]).netloc.removeprefix("www.")
    return f"{host}/{route.lstrip('/')}"
