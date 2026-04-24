import os
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(__file__), "clien_secret.json")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "youtube_token.json")
SCOPES = [
    "https://www.googleapis.com/auth/youtube",          # full management (update metadata)
    "https://www.googleapis.com/auth/youtube.upload",   # video upload
    "https://www.googleapis.com/auth/youtube.readonly", # read channel/videos
]

def get_authenticated_service():
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
    creds = None
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
            # Validate that the token has ALL required scopes
            if creds and creds.scopes:
                missing = set(SCOPES) - set(creds.scopes)
                if missing:
                    print(f"[YouTube] Token scope eksik: {missing} – yeniden oturum açılıyor")
                    os.remove(TOKEN_FILE)
                    creds = None
        except Exception:
            if os.path.exists(TOKEN_FILE):
                os.remove(TOKEN_FILE)
            creds = None

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS_FILE, SCOPES)
            creds = flow.run_local_server(
                port=8080,
                prompt="consent",
                access_type="offline",
                authorization_prompt_message="Tarayıcıda YouTube oturum izin sayfası açılıyor, lütfen onay verin...",
                open_browser=True
            )
        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())
    return build("youtube", "v3", credentials=creds)

def upload_video(video_path, title, description, tags_string):
    youtube = get_authenticated_service()
    
    # Process attributes
    tags = [t.strip() for t in tags_string.split(",")] if tags_string else []
    
    body = {
        "snippet": {
            "title": title[:100],  # YouTube Max Title Length
            "description": description[:5000],
            "tags": tags[:500],
            "categoryId": "10"  # Music Category
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }
    
    media = MediaFileUpload(video_path, chunksize=-1, resumable=True)
    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )
    
    response = request.execute()
    return response["id"]

def list_channel_videos(max_results=50):
    youtube = get_authenticated_service()

    # Get channel's uploads playlist
    channels = youtube.channels().list(part="contentDetails", mine=True).execute()
    if not channels.get("items"):
        return []
    uploads_playlist = channels["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

    # Get videos from uploads playlist
    videos = []
    next_page_token = None
    while True:
        playlist_resp = youtube.playlistItems().list(
            part="snippet",
            playlistId=uploads_playlist,
            maxResults=50,
            pageToken=next_page_token
        ).execute()

        video_ids = [item["snippet"]["resourceId"]["videoId"] for item in playlist_resp.get("items", [])]
        if not video_ids:
            break

        # Get video statistics
        stats_resp = youtube.videos().list(
            part="statistics,snippet",
            id=",".join(video_ids)
        ).execute()

        for item in stats_resp.get("items", []):
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            thumb = snippet.get("thumbnails", {}).get("medium", {}).get("url", "")
            videos.append({
                "videoId": item["id"],
                "title": snippet.get("title", ""),
                "publishedAt": snippet.get("publishedAt", ""),
                "thumbnail": thumb,
                "viewCount": int(stats.get("viewCount", 0)),
                "likeCount": int(stats.get("likeCount", 0)),
            })

        next_page_token = playlist_resp.get("nextPageToken")
        if not next_page_token or len(videos) >= max_results:
            break

    return videos[:max_results]


def update_video_metadata(video_id, title, description, tags):
    """YouTube'daki videonun başlık, açıklama ve etiketlerini günceller."""
    youtube = get_authenticated_service()

    # Clean and validate tags
    if tags:
        tag_list = []
        for t in tags.replace('\n', ',').split(','):
            cleaned = t.strip()
            import re
            cleaned = re.sub(r'[^\w\s\-ÇçĞğİıÖöŞşÜü]', '', cleaned, flags=re.UNICODE)
            cleaned = cleaned.strip()
            
            if cleaned and 1 <= len(cleaned) <= 100:
                tag_list.append(cleaned)
    else:
        tag_list = []

    # Join and check total length (YouTube limit: 500 chars including commas/spaces)
    tags_string = ", ".join(tag_list)
    if len(tags_string) > 500:
        # Truncate to fit within 500 chars
        while len(tags_string) > 490 and tag_list:
            tag_list.pop()
            tags_string = ", ".join(tag_list)
    
    tag_list = tag_list[:500]

    body = {
        "id": video_id,
        "snippet": {
            "title": title[:100] if title else "Untitled",
            "description": description[:5000] if description else "",
            "tags": tag_list[:500],
            "categoryId": "10"
        }
    }

    request = youtube.videos().update(
        part="snippet",
        body=body
    )

    response = request.execute()
    return response["id"]
