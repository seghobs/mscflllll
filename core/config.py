import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))

BASE_URL = "https://aimusic-api.topmediai.com/musicful"
COMMUNITY_URL = "https://community-api.musicful.ai/common"
FILES_URL = "https://files.musicful.ai/musicful/web"

TOKENS_FILE = os.path.join(BASE_DIR, "tokens.json")
TOKEN_LEGACY = os.path.join(BASE_DIR, "bearer.json")
VIDEO_TEMP = os.path.join(BASE_DIR, "temp")
VIDEO_OUTPUT = os.path.join(BASE_DIR, "static", "videos")
COVERS_OUTPUT = os.path.join(BASE_DIR, "static", "covers")

os.makedirs(VIDEO_TEMP, exist_ok=True)
os.makedirs(VIDEO_OUTPUT, exist_ok=True)
os.makedirs(COVERS_OUTPUT, exist_ok=True)
