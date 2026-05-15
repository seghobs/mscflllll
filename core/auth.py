import os
import json
import uuid
from .config import TOKENS_FILE, TOKEN_LEGACY
from .account_manager import switch_to_next_account

def _init_tokens():
    if os.path.exists(TOKENS_FILE):
        return
    if os.path.exists(TOKEN_LEGACY):
        with open(TOKEN_LEGACY, "r") as f:
            legacy = json.load(f)
        tok = legacy.get("token", "")
        if tok:
            with open(TOKENS_FILE, "w") as f:
                json.dump([{"id": "1", "name": "Token 1", "token": tok, "active": True}], f, indent=2)
    else:
        with open(TOKENS_FILE, "w") as f:
            json.dump([], f, indent=2)

def _read_tokens():
    _init_tokens()
    with open(TOKENS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _write_tokens(tokens):
    with open(TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(tokens, f, indent=2, ensure_ascii=False)

def load_token():
    tokens = _read_tokens()
    active = [t for t in tokens if t.get("active", True)]
    if not active:
        new_t = switch_to_next_account()
        if new_t:
            return new_t
        raise FileNotFoundError("Aktif token yok ve yeni hesaba gecilemedi.")
    return active[0]["token"]

def get_headers(token):
    return {
        "authorization": f"Bearer {token}",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        "accept": "application/json, text/plain, */*",
        "origin": "https://www.musicful.ai",
        "referer": "https://www.musicful.ai/",
    }

def api_headers(token):
    return get_headers(token)
