from flask import Blueprint, jsonify, request
import uuid
import threading
import time
from playwright.sync_api import sync_playwright

from core.auth import _read_tokens, _write_tokens

auth_bp = Blueprint('auth_bp', __name__)

browser_token_state = {"status": "idle", "token": None, "error": None}
browser_instance = {"pw": None, "browser": None}

def _browser_token_worker():
    browser_token_state["status"] = "waiting"
    browser_token_state["token"] = None
    browser_token_state["error"] = None
    pw = None
    browser = None
    try:
        pw = sync_playwright().start()
        browser = pw.chromium.launch(headless=False)
        browser_instance["pw"] = pw
        browser_instance["browser"] = browser
        context = browser.new_context()
        page = context.new_page()

        captured = {"auth": None}

        def on_request(req):
            auth = req.headers.get("authorization", "")
            if auth.startswith("Bearer ") and len(auth) > 20 and not captured["auth"]:
                captured["auth"] = auth.replace("Bearer ", "")

        page.on("request", on_request)
        page.goto("https://www.musicful.ai", wait_until="domcontentloaded")

        while captured["auth"] is None:
            time.sleep(1)
            if browser_token_state.get("_cancel"):
                break

        if captured["auth"]:
            tokens = _read_tokens()
            existing_count = len(tokens)
            name = f"Token {existing_count + 1}"
            new = {"id": str(uuid.uuid4())[:8], "name": name, "token": captured["auth"], "active": True}
            tokens.append(new)
            _write_tokens(tokens)
            browser_token_state["token"] = new
            browser_token_state["status"] = "done"
        else:
            browser_token_state["status"] = "cancelled"
    except Exception as e:
            browser_token_state["status"] = "error"
            browser_token_state["error"] = str(e)
    finally:
        try:
            if browser: browser.close()
            if pw: pw.stop()
        except: pass
        browser_instance["pw"] = None
        browser_instance["browser"] = None


@auth_bp.route("/api/tokens", methods=["GET"])
def api_tokens_list():
    return jsonify({"tokens": _read_tokens()})

@auth_bp.route("/api/tokens", methods=["POST"])
def api_tokens_add():
    data = request.json
    name = data.get("name", "").strip() or f"Token {_read_tokens().__len__()+1}"
    token = data.get("token", "").strip()
    if not token:
        return jsonify({"error": "Token boş olamaz"}), 400
    tokens = _read_tokens()
    new = {"id": str(uuid.uuid4())[:8], "name": name, "token": token, "active": True}
    tokens.append(new)
    _write_tokens(tokens)
    return jsonify({"ok": True, "token": new})

@auth_bp.route("/api/tokens/<tok_id>", methods=["PUT"])
def api_tokens_update(tok_id):
    data = request.json
    tokens = _read_tokens()
    for t in tokens:
        if t["id"] == tok_id:
            if "name" in data: t["name"] = data["name"]
            if "token" in data: t["token"] = data["token"]
            _write_tokens(tokens)
            return jsonify({"ok": True, "token": t})
    return jsonify({"error": "Token bulunamadı"}), 404

@auth_bp.route("/api/tokens/<tok_id>", methods=["DELETE"])
def api_tokens_delete(tok_id):
    tokens = _read_tokens()
    tokens = [t for t in tokens if t["id"] != tok_id]
    _write_tokens(tokens)
    return jsonify({"ok": True})

@auth_bp.route("/api/tokens/toggle/<tok_id>", methods=["POST"])
def api_tokens_toggle(tok_id):
    tokens = _read_tokens()
    for t in tokens:
        if t["id"] == tok_id:
            t["active"] = not t.get("active", True)
            _write_tokens(tokens)
            return jsonify({"ok": True, "token": t})
    return jsonify({"error": "Token bulunamadı"}), 404


@auth_bp.route("/api/browser-token/start", methods=["POST"])
def api_browser_token_start():
    if browser_token_state["status"] == "waiting":
        return jsonify({"error": "Zaten açık bir oturum var"}), 400
    browser_token_state["_cancel"] = False
    threading.Thread(target=_browser_token_worker, daemon=True).start()
    return jsonify({"ok": True, "status": "waiting"})

@auth_bp.route("/api/browser-token/status")
def api_browser_token_status():
    return jsonify({
        "status": browser_token_state["status"],
        "token": browser_token_state.get("token"),
        "error": browser_token_state.get("error")
    })

@auth_bp.route("/api/browser-token/cancel", methods=["POST"])
def api_browser_token_cancel():
    browser_token_state["_cancel"] = True
    browser_token_state["status"] = "idle"
    try:
        if browser_instance.get("browser"): browser_instance["browser"].close()
        if browser_instance.get("pw"): browser_instance["pw"].stop()
    except: pass
    return jsonify({"ok": True})
