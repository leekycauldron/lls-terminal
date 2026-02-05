import json

import anthropic

from config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


def generate(system: str, user: str, max_tokens: int = 4096) -> str:
    client = get_client()
    response = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return response.content[0].text


def generate_json(system: str, user: str, max_tokens: int = 4096) -> dict | list:
    raw = generate(system, user, max_tokens)
    # Strip markdown fences if present
    text = raw.strip()
    if text.startswith("```"):
        first_newline = text.index("\n")
        last_fence = text.rfind("```")
        text = text[first_newline + 1:last_fence].strip()
    return json.loads(text)
