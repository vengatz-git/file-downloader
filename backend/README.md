# Telegram File Downloader - Backend

FastAPI-powered Telegram file streaming backend. Connects via MTProto (Telethon) to resolve media links and stream binary chunks with full HTTP Range (RFC 7233) partial content support.

## Key Features
- **MTProto Native Client**: Uses Telethon with StringSession or Bot Token.
- **Link Resolution (`POST /api/resolve`)**: Supports public channel links (`t.me/channel/123`) and private supergroups (`t.me/c/12345/123`).
- **HTTP Range Streaming (`GET /api/stream/{chat_id}/{message_id}`)**: Enables resume, segmented parallel downloading, and high-speed multi-threaded retrieval.
- **Docker Ready**: Preconfigured with `Dockerfile` and `docker-compose.yml`.

---

## Getting Telegram MTProto Credentials
1. Visit [my.telegram.org](https://my.telegram.org) and log in.
2. Go to **API development tools** and create an app to obtain:
   - `TELEGRAM_API_ID`
   - `TELEGRAM_API_HASH`
3. Authentication options:
   - **User Account (Recommended for private channel media)**: Run `python generate_session.py` to generate `TELEGRAM_SESSION_STRING`.
   - **Bot Account (For public channels where bot is added)**: Create a bot with [@BotFather](https://t.me/BotFather) and obtain `TELEGRAM_BOT_TOKEN`.

---

## Local Setup & Run

### 1. Install Dependencies
```bash
python -m venv venv
# Linux / macOS
source venv/bin/activate
# Windows PowerShell
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials in `.env`:
```ini
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_STRING=your_string_session_here
HOST=0.0.0.0
PORT=8000
BASE_URL=http://your-vps-ip:8000
```

### 3. Start the Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation will be available at: `http://localhost:8000/docs`

---

## Docker Deployment

```bash
docker compose up -d --build
```
Check logs:
```bash
docker compose logs -f api
```

---

## API Endpoints

### 1. Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "telegram_connected": true,
  "version": "1.0.0"
}
```

### 2. Resolve Telegram Link
```http
POST /api/resolve
Content-Type: application/json

{
  "link": "https://t.me/c/1234567890/456"
}
```
**Response:**
```json
{
  "chat_id": -1001234567890,
  "message_id": 456,
  "file_name": "sample_video.mp4",
  "file_size": 104857600,
  "mime_type": "video/mp4",
  "download_url": "http://your-vps-ip:8000/api/stream/-1001234567890/456",
  "caption": "Sample video upload"
}
```

### 3. Stream File (With Range Support)
```http
GET /api/stream/-1001234567890/456
Range: bytes=0-1048575
```
**Response Status:** `206 Partial Content`  
**Headers:**
- `Content-Range: bytes 0-1048575/104857600`
- `Content-Length: 1048576`
- `Accept-Ranges: bytes`
