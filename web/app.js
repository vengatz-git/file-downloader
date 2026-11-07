// Register Service Worker for PWA / Add to Home Screen
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.log('SW registration skipped:', err);
  });
}

// DOM Elements
const errorAlert = document.getElementById('error-alert');
const errorText = document.getElementById('error-text');
const dismissError = document.getElementById('dismiss-error');

const toggleSettings = document.getElementById('toggle-settings');
const settingsBody = document.getElementById('settings-body');
const backendUrlInput = document.getElementById('backend-url');

const tgLinkInput = document.getElementById('tg-link');
const btnPaste = document.getElementById('btn-paste');
const btnResolve = document.getElementById('btn-resolve');
const resolveSpinner = document.getElementById('resolve-spinner');
const resolveBtnText = document.getElementById('resolve-btn-text');

const metadataCard = document.getElementById('metadata-card');
const fileNameEl = document.getElementById('file-name');
const fileSubEl = document.getElementById('file-sub');
const captionContainer = document.getElementById('caption-container');
const btnNativeDownload = document.getElementById('btn-native-download');
const btnStreamDownload = document.getElementById('btn-stream-download');

const progressCard = document.getElementById('progress-card');
const progressStatus = document.getElementById('progress-status');
const progressSpeed = document.getElementById('progress-speed');
const progressBar = document.getElementById('progress-bar');
const progressBytes = document.getElementById('progress-bytes');
const progressPct = document.getElementById('progress-pct');

// Settings management
const savedBackendUrl = localStorage.getItem('tg_backend_url') || window.location.origin;
backendUrlInput.value = savedBackendUrl;

toggleSettings.addEventListener('click', () => {
  settingsBody.classList.toggle('hidden');
});

backendUrlInput.addEventListener('change', () => {
  let val = backendUrlInput.value.trim();
  if (val.endsWith('/')) val = val.slice(0, -1);
  localStorage.setItem('tg_backend_url', val);
});

function getBackendUrl() {
  return (backendUrlInput.value.trim() || window.location.origin).replace(/\/$/, '');
}

// Error handling
function showError(msg) {
  errorText.textContent = msg;
  errorAlert.classList.remove('hidden');
}

dismissError.addEventListener('click', () => {
  errorAlert.classList.add('hidden');
});

// Clipboard Paste
btnPaste.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      tgLinkInput.value = text.trim();
    }
  } catch (err) {
    showError('Could not access clipboard. Please paste manually.');
  }
});

// Format byte size
function formatBytes(bytes) {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

let currentMetadata = null;

// Resolve Link
btnResolve.addEventListener('click', async () => {
  const link = tgLinkInput.value.trim();
  if (!link) {
    showError('Please enter a valid Telegram link.');
    return;
  }

  errorAlert.classList.add('hidden');
  metadataCard.classList.add('hidden');
  progressCard.classList.add('hidden');

  btnResolve.disabled = true;
  resolveSpinner.classList.remove('hidden');
  resolveBtnText.textContent = 'Resolving...';

  try {
    const response = await fetch(`${getBackendUrl()}/api/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.detail || `Server error: ${response.status}`);
    }

    const data = await response.json();
    currentMetadata = data;

    // Populate UI
    fileNameEl.textContent = data.file_name;
    fileSubEl.textContent = `${formatBytes(data.file_size)} • ${data.mime_type}`;

    if (data.caption) {
      captionContainer.textContent = data.caption;
      captionContainer.classList.remove('hidden');
    } else {
      captionContainer.classList.add('hidden');
    }

    // Set download URL (direct link from backend)
    btnNativeDownload.href = data.download_url;
    btnNativeDownload.setAttribute('download', data.file_name);

    metadataCard.classList.remove('hidden');
  } catch (err) {
    showError(err.message || 'Failed to connect to backend server.');
  } finally {
    btnResolve.disabled = false;
    resolveSpinner.classList.add('hidden');
    resolveBtnText.textContent = 'Resolve Link';
  }
});

// Optional: In-browser streaming with live speed & progress tracking
btnStreamDownload.addEventListener('click', async () => {
  if (!currentMetadata) return;

  progressCard.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressStatus.textContent = 'Streaming from VPS...';

  try {
    const response = await fetch(currentMetadata.download_url);
    if (!response.ok) throw new Error(`Stream failed with HTTP ${response.status}`);

    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length') || currentMetadata.file_size;

    let receivedBytes = 0;
    const chunks = [];
    let lastTime = Date.now();
    let bytesSinceLast = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedBytes += value.length;
      bytesSinceLast += value.length;

      const now = Date.now();
      const delta = now - lastTime;
      if (delta >= 300) {
        const speed = (bytesSinceLast * 1000) / delta;
        progressSpeed.textContent = `${formatBytes(speed)}/s`;
        const pct = contentLength > 0 ? (receivedBytes / contentLength) * 100 : 0;
        progressBar.style.width = `${pct}%`;
        progressPct.textContent = `${pct.toFixed(1)}%`;
        progressBytes.textContent = `${formatBytes(receivedBytes)} / ${formatBytes(contentLength)}`;

        lastTime = now;
        bytesSinceLast = 0;
      }
    }

    // Combine chunks and trigger save
    const blob = new Blob(chunks, { type: currentMetadata.mime_type });
    const blobUrl = URL.createObjectURL(blob);
    const tempLink = document.createElement('a');
    tempLink.href = blobUrl;
    tempLink.download = currentMetadata.file_name;
    document.body.appendChild(tempLink);
    tempLink.click();
    document.body.removeChild(tempLink);
    URL.revokeObjectURL(blobUrl);

    progressStatus.textContent = 'Download Complete!';
    progressBar.style.width = '100%';
    progressPct.textContent = '100%';
    progressBytes.textContent = `${formatBytes(receivedBytes)} / ${formatBytes(receivedBytes)}`;
  } catch (err) {
    showError(`Streaming error: ${err.message}`);
    progressStatus.textContent = 'Stream error';
  }
});
