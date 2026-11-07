# Telegram File Downloader - Node.js Backend

100% JavaScript backend built with **Express** and **GramJS** (`telegram` package). Requires **no Android Studio**, **no Python**, and **no heavy SDKs**.

## Features
- **GramJS MTProto Client**: Connects natively to Telegram using StringSession or Bot Token.
- **REST Endpoints**:
  - `GET /health`
  - `POST /api/resolve` (resolves link into metadata)
  - `GET /api/stream/:chatId/:messageId` (streams chunks with full HTTP 206 Range support)
- **Built-in Web / PWA Server**: Directly serves the `/web` frontend application at `http://localhost:8000/`.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Credentials
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` from [my.telegram.org](https://my.telegram.org).

### 3. Log in (Generate Session String)
```bash
npm run login
```
Follow the terminal prompt to log into your Telegram account. Copy the printed session string into `.env` under `TELEGRAM_SESSION_STRING`.

### 4. Start Server
```bash
npm start
```
Open `http://localhost:8000` on your PC, or open `http://<your-ip>:8000` in Chrome on your Android phone!
