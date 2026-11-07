# Telegram File Downloader (VPS + Web/PWA & Android)

A production-grade, VPS-backed Telegram file downloader system. Offloads Telegram MTProto authentication and chunk streaming to a VPS backend and delivers media directly to client devices with full HTTP `Range` header support for resumable, multi-threaded downloads.

---

## Architecture Overview

```
                                      +------------------------------------+
                                      | Telegram Cloud (MTProto Protocol)  |
                                      +------------------------------------+
                                                        ^
                                                        | MTProto
                                                        v
                                       +-----------------------------------+
                                       |            VPS Backend            |
                                       |    FastAPI (Python) OR Node.js    |
                                       |   (/api/resolve & /api/stream)    |
                                       +-----------------------------------+
                                                        ^
                                                        | HTTP Range Streaming
                                                        v
                                       +-----------------------------------+
                                       |              Clients              |
                                       |  1. Web App / PWA (Zero-install)  |
                                       |  2. Jetpack Compose Android App   |
                                       +-----------------------------------+
```

---

## Project Structure

```
tg-file-downloader/
├── web/                      # Zero-install JavaScript Web Client & PWA
│   ├── index.html            # Mobile-friendly UI (Paste link, resolve, download)
│   ├── style.css             # Telegram dark-mode styling
│   ├── app.js                # Fetch API & in-browser stream reader
│   ├── manifest.json         # PWA Manifest ("Add to Home Screen" on Android)
│   ├── sw.js                 # Service worker
│   └── icon.svg              # App icon
│
├── backend-node/             # 100% JavaScript Node.js Backend (Express + GramJS)
│   ├── server.js             # Express server with MTProto & Range streaming
│   ├── generate-session.js   # Terminal login helper for GramJS StringSession
│   ├── package.json
│   └── .env.example
│
├── backend/                  # Python FastAPI Backend (FastAPI + Telethon)
│   ├── app/
│   │   ├── api/routes.py     # Range-enabled streaming & resolver
│   │   ├── core/telegram.py  # Telethon MTProto manager
│   │   └── main.py           # FastAPI entrypoint (serves /web static app)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
│
└── android/                  # Optional Native Jetpack Compose App (Kotlin)
```

---

## Quickstart (Pure JavaScript - No Android Studio Required)

### 1. Run with Node.js
```bash
cd backend-node
npm install
cp .env.example .env
# Edit .env with your TELEGRAM_API_ID & TELEGRAM_API_HASH from https://my.telegram.org

# Generate login session:
npm run login

# Start the server:
npm start
```

### 2. Access on your Android Phone
1. Connect your phone and PC to the same mobile hotspot / network, or run this on your VPS.
2. Open Chrome on your phone and browse to `http://<YOUR-PC-OR-VPS-IP>:8000`.
3. In Chrome's menu (`⋮`), tap **"Add to Home screen"** or **"Install App"**.
4. The web app will now run fullscreen like a native Android app, with downloads handled directly by Android's native Download Manager (with pause/resume support)!

