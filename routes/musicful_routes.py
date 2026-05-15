from flask import Blueprint, jsonify, request, send_file
import requests
import io
import time
from core.auth import load_token, api_headers, get_headers
from core.config import BASE_URL, COMMUNITY_URL, FILES_URL
from core.tasks import sse_notify

musicful_bp = Blueprint('musicful_bp', __name__)

@musicful_bp.route("/api/rights")
def api_rights():
    token = load_token()
    resp = requests.get(f"{BASE_URL}/v1/user/rights", headers=api_headers(token))
    return jsonify(resp.json())

@musicful_bp.route("/api/songs")
def api_songs():
    token = load_token()
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 20, type=int)
    resp = requests.get(f"{BASE_URL}/v1/songs?page={page}&limit={limit}", headers=api_headers(token))
    return jsonify(resp.json())

@musicful_bp.route("/api/upload", methods=["POST"])
def api_upload():
    token = load_token()
    file = request.files.get("audio")
    if not file:
        return jsonify({"error": "Dosya seçilmedi"}), 400

    url = f"{BASE_URL}/v2/upload-to-song"
    headers = get_headers(token)
    del headers["accept"]

    file_bytes = file.read()
    files = {"audio": (file.filename, file_bytes, "audio/mpeg")}
    resp = requests.post(url, headers=headers, files=files)
    resp_data = resp.json()

    if resp_data.get("code") != 200 and resp_data.get("status") != 200:
        from core.account_manager import switch_to_next_account
        new_token = switch_to_next_account()
        if new_token:
            headers = get_headers(new_token)
            del headers["accept"]
            files2 = {"audio": (file.filename, file_bytes, "audio/mpeg")}
            resp = requests.post(url, headers=headers, files=files2)
            resp_data = resp.json()

    return jsonify(resp_data)

@musicful_bp.route("/api/content-check", methods=["POST"])
def api_content_check():
    token = load_token()
    data = request.json
    headers = get_headers(token)
    headers["content-type"] = "application/json"
    resp = requests.post(f"{COMMUNITY_URL}/content_check", headers=headers, json={
        "check_type": 1,
        "content": {"image": [], "text": f"{data.get('lyrics','')},{data.get('title','')}"}
    })
    return jsonify(resp.json())

@musicful_bp.route("/api/make-song", methods=["POST"])
def api_make_song():
    token = load_token()
    data = request.json
    audio_id = data.get("audio_id", "")
    title = data.get("title", "")
    lyrics = data.get("lyrics", "")
    style = data.get("style", "Guitar,Piano")
    mv = data.get("mv", "v5.0")

    url = f"{BASE_URL}/v2/async/song_cover"
    headers = get_headers(token)
    del headers["accept"]

    form = {
        "mv": (None, mv),
        "grade": (None, "2"),
        "area": (None, "TR"),
        "lyrics": (None, lyrics),
        "isAiLyrics": (None, "false"),
        "persona_id": (None, ""),
        "style": (None, style),
        "title": (None, title),
        "instrumental": (None, "0"),
        "model": (None, mv),
        "audio_id": (None, audio_id),
        "action": (None, "cover"),
        "is_pro": (None, "true"),
    }
    resp = requests.post(url, headers=headers, files=form)
    resp_data = resp.json()

    if resp_data.get("code") != 200 and resp_data.get("status") != 200:
        from core.account_manager import switch_to_next_account
        new_token = switch_to_next_account()
        if new_token:
            headers = get_headers(new_token)
            del headers["accept"]
            form2 = {
                "mv": (None, mv),
                "grade": (None, "2"),
                "area": (None, "TR"),
                "lyrics": (None, lyrics),
                "isAiLyrics": (None, "false"),
                "persona_id": (None, ""),
                "style": (None, style),
                "title": (None, title),
                "instrumental": (None, "0"),
                "model": (None, mv),
                "audio_id": (None, audio_id),
                "action": (None, "cover"),
                "is_pro": (None, "true"),
            }
            resp = requests.post(url, headers=headers, files=form2)
            resp_data = resp.json()

    return jsonify(resp_data)

@musicful_bp.route("/api/poll/<task_ids>")
def api_poll(task_ids):
    token = load_token()
    resp = requests.get(f"{BASE_URL}/v2/task/results?ids={task_ids}", headers=api_headers(token))
    data = resp.json()
    results = data.get("data", {}).get("result", [])
    for song in results:
        if song.get("status") == 3:
            song["_failed"] = True
        else:
            song["_failed"] = False
        if song.get("audio_url") and song.get("duration"):
            sse_notify("song_ready", song)
    return jsonify(data)

@musicful_bp.route("/api/download/<song_uuid>")
def api_download(song_uuid):
    url = f"{FILES_URL}/{song_uuid}/{song_uuid}.mp3"
    resp = requests.get(url)
    if resp.status_code == 200:
        return send_file(
            io.BytesIO(resp.content),
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name=f"{song_uuid}.mp3"
        )
    return jsonify({"error": "Dosya henüz hazır değil", "ready": False}), 202

@musicful_bp.route("/api/check-download/<song_uuid>")
def api_check_download(song_uuid):
    url = f"{FILES_URL}/{song_uuid}/{song_uuid}.mp3"
    resp = requests.head(url)
    return jsonify({"ready": resp.status_code == 200})

@musicful_bp.route("/api/task/<task_id>")
def api_task(task_id):
    token = load_token()
    resp = requests.get(f"{BASE_URL}/v2/task/results?ids={task_id}", headers=api_headers(token))
    data = resp.json()
    results = data.get("data", {}).get("result", [])

    # If task endpoint returns nothing (happens for uploaded songs), fall back to songs list
    if not results:
        songs_resp = requests.get(f"{BASE_URL}/v1/songs?page=1&limit=50", headers=api_headers(token))
        songs_data = songs_resp.json()
        song_list = songs_data.get("data", {}).get("list", [])
        matched = [s for s in song_list if s.get("song_id") == task_id or s.get("id") == task_id]
        if matched:
            s = matched[0]
            # Normalize field: ensure 'lyrics' key is present for JS
            s.setdefault("lyrics", s.get("lyric", ""))
            s.setdefault("audio_url", s.get("audio_url", ""))
            s.setdefault("status", 0)  # present in list = ready
            results = [s]
            data["data"] = {"result": results}

    for s in results:
        if s.get("audio_url") and s.get("duration"):
            sse_notify("song_ready", s)
    return jsonify(data)
