import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { TelegramClient, Api, utils, helpers } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = parseInt(process.env.PORT || "8000");
const API_ID = parseInt(process.env.TELEGRAM_API_ID || "0");
const API_HASH = process.env.TELEGRAM_API_HASH || "";
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING || "";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");

// GramJS client instance
const session = new StringSession(SESSION_STRING);
const tgClient = new TelegramClient(session, API_ID, API_HASH, {
  connectionRetries: 5,
});

let isConnected = false;

async function initTelegram() {
  if (!API_ID || !API_HASH) {
    console.warn("⚠️ Telegram API_ID or API_HASH missing in .env. MTProto client not started.");
    return;
  }
  try {
    if (BOT_TOKEN && !SESSION_STRING) {
      console.log("Connecting Telegram client using Bot Token...");
      await tgClient.start({ botAuthToken: BOT_TOKEN });
    } else {
      console.log("Connecting Telegram client using User StringSession...");
      await tgClient.connect();
    }
    isConnected = true;
    console.log("✅ Telegram client successfully connected.");
  } catch (err) {
    console.error("❌ Telegram initialization failed:", err.message);
  }
}

// Link parser helper
function parseTelegramLink(link) {
  const cleanLink = link.trim();
  const privateMatch = cleanLink.match(/t\.me\/c\/(\d+)\/(\d+)/);
  if (privateMatch) {
    return {
      chatId: `-100${privateMatch[1]}`,
      messageId: parseInt(privateMatch[2], 10),
    };
  }
  const publicMatch = cleanLink.match(/t\.me\/([^/]+)\/(\d+)/);
  if (publicMatch) {
    return {
      chatId: publicMatch[1],
      messageId: parseInt(publicMatch[2], 10),
    };
  }
  throw new Error(`Unsupported Telegram link format: ${link}`);
}

// System Health
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    telegram_connected: isConnected,
    version: "1.0.0",
  });
});

// Resolve Media Link Endpoint
app.post("/api/resolve", async (req, res) => {
  try {
    const { link } = req.body;
    if (!link) {
      return res.status(400).json({ detail: "Link is required" });
    }

    const { chatId, messageId } = parseTelegramLink(link);
    const entity = !isNaN(chatId) ? parseInt(chatId, 10) : chatId;
    const messages = await tgClient.getMessages(entity, { ids: [messageId] });

    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ detail: "Message not found or contains no downloadable media." });
    }

    const message = messages[0];
    let fileName = `file_${messageId}.bin`;
    let fileSize = 0;
    let mimeType = "application/octet-stream";

    if (message.document) {
      fileSize = Number(message.document.size || 0);
      mimeType = message.document.mimeType || "application/octet-stream";
      const nameAttr = message.document.attributes?.find(
        (a) => a.className === "DocumentAttributeFilename"
      );
      if (nameAttr?.fileName) fileName = nameAttr.fileName;
    } else if (message.photo) {
      fileName = `photo_${messageId}.jpg`;
      mimeType = "image/jpeg";
      fileSize = 1024 * 1024; // approximate preview
    }

    const downloadUrl = `${BASE_URL}/api/stream/${chatId}/${messageId}`;

    res.json({
      chat_id: !isNaN(chatId) ? parseInt(chatId, 10) : 0,
      message_id: messageId,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      download_url: downloadUrl,
      caption: message.text || null,
    });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

// Helper: Stream file chunks with high-performance parallel MTProto pipelining
async function streamParallelToResponse({ client, message, offset = 0, length, res, req, concurrency = 6 }) {
  let fileInfo;
  try {
    fileInfo = utils.getFileInfo(message.media);
  } catch (_) {
    fileInfo = null;
  }

  // Fallback to standard iterator if media is not standard document/file
  if (!fileInfo || !fileInfo.location) {
    for await (const chunk of client.iterDownload({
      file: message.media,
      offset: helpers.returnBigInt(offset),
      requestSize: 512 * 1024,
    })) {
      if (!res.write(chunk)) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
    return res.end();
  }

  const dcId = fileInfo.dcId;
  const location = fileInfo.location;
  const CHUNK_SIZE = 512 * 1024; // 512 KB per MTProto chunk

  const startAligned = Math.floor(offset / CHUNK_SIZE) * CHUNK_SIZE;
  const endByte = offset + length;
  const totalChunks = Math.ceil((endByte - startAligned) / CHUNK_SIZE);

  const sender = await client.getSender(dcId);

  let isAborted = false;
  req.on("close", () => {
    isAborted = true;
  });

  let nextChunkIndex = 0;
  const inFlight = new Map(); // index -> Promise<Buffer>

  function fetchChunk(index) {
    const chunkOffset = startAligned + index * CHUNK_SIZE;
    const request = new Api.upload.GetFile({
      location,
      offset: helpers.returnBigInt(chunkOffset),
      limit: CHUNK_SIZE,
    });
    return client.invokeWithSender(request, sender).then((res) => res.bytes);
  }

  // Pre-fill initial concurrent batch
  while (nextChunkIndex < totalChunks && inFlight.size < concurrency && !isAborted) {
    const idx = nextChunkIndex++;
    inFlight.set(idx, fetchChunk(idx));
  }

  // Stream chunks in strictly sequential order
  for (let current = 0; current < totalChunks && !isAborted; current++) {
    const chunkPromise = inFlight.get(current);
    inFlight.delete(current);

    // Keep pipeline filled
    if (nextChunkIndex < totalChunks && !isAborted) {
      const idx = nextChunkIndex++;
      inFlight.set(idx, fetchChunk(idx));
    }

    let chunk = await chunkPromise;
    if (!chunk || chunk.length === 0 || isAborted) break;

    // Handle byte-exact trimming for Range requests
    const chunkStart = startAligned + current * CHUNK_SIZE;
    const chunkEnd = chunkStart + chunk.length;

    let sliceStart = 0;
    let sliceEnd = chunk.length;

    if (offset > chunkStart) {
      sliceStart = offset - chunkStart;
    }
    if (endByte < chunkEnd) {
      sliceEnd = sliceStart + (endByte - Math.max(offset, chunkStart));
    }

    if (sliceStart > 0 || sliceEnd < chunk.length) {
      chunk = chunk.subarray(sliceStart, sliceEnd);
    }

    if (chunk.length > 0) {
      const canContinue = res.write(chunk);
      if (!canContinue) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
  }

  res.end();
}

// HTTP Range Byte Streaming Endpoint
app.get("/api/stream/:chatId/:messageId", async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const entity = !isNaN(chatId) ? parseInt(chatId, 10) : chatId;
    const messages = await tgClient.getMessages(entity, { ids: [parseInt(messageId, 10)] });

    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ detail: "Media not found." });
    }

    const message = messages[0];
    const totalSize = Number(message.document?.size || 0);
    const mimeType = message.document?.mimeType || "application/octet-stream";
    const nameAttr = message.document?.attributes?.find(
      (a) => a.className === "DocumentAttributeFilename"
    );
    const fileName = nameAttr?.fileName || `file_${messageId}.bin`;

    const rangeHeader = req.headers.range;
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );

    if (rangeHeader && totalSize > 0) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        res.setHeader("Content-Range", `bytes */${totalSize}`);
        return res.status(416).end();
      }

      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        res.setHeader("Content-Range", `bytes */${totalSize}`);
        return res.status(416).end();
      }

      const contentLength = end - start + 1;
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
      res.setHeader("Content-Length", contentLength);

      await streamParallelToResponse({
        client: tgClient,
        message,
        offset: start,
        length: contentLength,
        res,
        req,
        concurrency: 6,
      });
      return;
    }

    if (totalSize > 0) {
      res.setHeader("Content-Length", totalSize);
    }
    res.status(200);

    await streamParallelToResponse({
      client: tgClient,
      message,
      offset: 0,
      length: totalSize,
      res,
      req,
      concurrency: 6,
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ detail: err.message });
    } else {
      res.end();
    }
  }
});

// Serve the Web Frontend / PWA
// __dirname = .../backend-node  →  go up one level to find /web
// Works locally AND on Render (where the repo root is the CWD).
const webPath = path.resolve(__dirname, "../web");
app.use(express.static(webPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(webPath, "index.html"));
});

// Start Server
app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🚀 Server listening on http://0.0.0.0:${PORT}`);
  await initTelegram();
});
