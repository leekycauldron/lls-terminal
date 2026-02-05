# LLS Terminal

AI-powered production terminal for building HSK Chinese-language learning story videos. Guides you through a multi-stage pipeline: context loading, script generation (via Claude), and eventually TTS, scene generation, and video stitching.

Built with a cyberpunk terminal aesthetic — monospace fonts, scanlines, CRT glow.

## What's here

```
backend/          Python FastAPI server
  stages/         Modular stage system (auto-discovered)
    stage_0_context/   Loads character/setting registries + episode history
    stage_1_script/    AI script generation, conflict checking, line editing
  services/llm.py      Anthropic Claude wrapper
  characters/          Character registry + reference images
  settings/            Setting/location registry + reference images
  episodes/            Per-episode state (JSON files, created at runtime)

frontend/         React + TypeScript + Vite
  src/terminal/        Terminal chrome (layout, header, input)
  src/stages/          Stage UI components (self-registering)
    stage0-context/    Boot animation, registry display
    stage1-script/     Seed input, conflict warnings, line editor (drag-drop)
  src/components/      Shared components (DragDropList, ProgressBar)
  src/state/           Zustand store for episode state
  src/styles/          Terminal aesthetic CSS (scanlines, glow, character colors)
```

## Setup

### Prerequisites

- Python 3.10+
- Node 18+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. API key

Edit `.env` in the project root and replace the placeholder:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Backend

```bash
# From project root — venv + deps already installed, but if starting fresh:
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Frontend

```bash
cd frontend
npm install
```

## Running

Open two terminals:

**Backend** (port 8000):
```bash
cd backend
../.venv/bin/uvicorn app:app --reload
```

**Frontend** (port 5173):
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## How it works

1. **Stage 0 — Context**: On load, the terminal plays a boot animation and pulls in the character registry, settings registry, and any previous episode history. Click "Proceed" when ready.

2. **Stage 1 — Script**: Enter a story seed idea (or leave blank for a random one). The system checks for conflicts with past episodes, generates a story idea via Claude, then generates a full script with Chinese, pinyin, and English for each line. You can drag-reorder lines, edit inline, add/delete lines, then approve to lock the script.

The approved script and all state is saved to `backend/episodes/ep_NNN/state.json`.

## API overview

| Endpoint | What it does |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/stages` | List registered stages |
| `POST /api/episodes` | Create new episode |
| `GET /api/episodes/{id}` | Get episode state |
| `GET /api/episodes/{id}/context` | Load registries + history (Stage 0) |
| `POST /api/episodes/{id}/script/check-seed` | Check seed against history |
| `POST /api/episodes/{id}/script/generate-idea` | AI generates story idea |
| `POST /api/episodes/{id}/script/generate-script` | AI generates full script |
| `PUT /api/episodes/{id}/script/lines` | Update/reorder all lines |
| `POST /api/episodes/{id}/script/lines` | Add line at position |
| `DELETE /api/episodes/{id}/script/lines/{line_id}` | Delete a line |
| `POST /api/episodes/{id}/script/approve` | Lock script, advance stage |

## Adding new stages

**Backend**: Create `backend/stages/stage_N_name/` with `__init__.py`, `stage.py` (extends `BaseStage`), and `routes.py`. It's auto-discovered.

**Frontend**: Create `frontend/src/stages/stageN-name/` with a component that calls `registerStage()`. Import it in `main.tsx`.
