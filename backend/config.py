import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

BACKEND_DIR = Path(__file__).resolve().parent
CHARACTERS_DIR = BACKEND_DIR / "characters"
SETTINGS_DIR = BACKEND_DIR / "settings"
EPISODES_DIR = BACKEND_DIR / "episodes"
