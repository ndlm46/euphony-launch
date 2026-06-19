// ===== DOM Elements =====
const loadingScreen = document.getElementById('loading-screen');
const linksContainer = document.getElementById('links-container');
const errorState = document.getElementById('error-state');
const linkCount = document.getElementById('link-count');
const btnRefresh = document.getElementById('btn-refresh');
const installBanner = document.getElementById('install-banner');

// Device Viewer
const deviceViewer = document.getElementById('device-viewer');
const deviceFrame = document.getElementById('device-frame');
const viewerName = document.getElementById('viewer-name');
const viewerIp = document.getElementById('viewer-ip');
const viewerRefreshBtn = document.getElementById('viewer-refresh');

// ===== State =====
let deferredPrompt = null;
let currentDeviceUrl = null;

// ===== Load Links from API =====
async function loadLinks() {
  // Show loading skeletons
  linksContainer.innerHTML = createSkeletons(3);
  errorState.classList.add('hidden');
  btnRefresh.classList.add('spinning');

  try {
    const response = await fetch('api/links');
    const data = await response.json();

    if (!data.success || data.links.length === 0) {
      showError();
      return;
    }

    renderLinks(data.links);
    linkCount.textContent = data.links.length;
    hideLoadingScreen();
  } catch (err) {
    console.error('Failed to load links:', err);
    showError();
  } finally {
    btnRefresh.classList.remove('spinning');
  }
}

// ===== Render Device Links =====
function renderLinks(links) {
  linksContainer.innerHTML = '';

  links.forEach((link, index) => {
    const card = createDeviceCard(link, index);
    linksContainer.appendChild(card);
  });
}

function createDeviceCard(link, index) {
  const div = document.createElement('div');
  div.className = 'device-card';
  div.style.animationDelay = `${index * 0.08}s`;

  const name = link.text || `Device (${link.ip})`;
  const ip = link.ip || extractIP(link.href);
  const lastSeen = link.lastSeen ? formatTime(link.lastSeen) : '';

  div.innerHTML = `
    <div class="device-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    </div>
    <div class="device-info">
      <div class="device-name">${escapeHtml(name)}</div>
      <div class="device-meta">
        ${ip ? `<span class="device-ip">${ip}</span>` : ''}
        ${lastSeen ? `<span class="device-time">${lastSeen}</span>` : ''}
      </div>
    </div>
    <div class="status-dot"></div>
    <div class="device-arrow">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  `;

  // Open in viewer instead of navigating away
  div.addEventListener('click', () => {
    openViewer(link.href, name, ip);
  });

  return div;
}

// ===== Device Viewer =====
function openViewer(url, name, ip) {
  currentDeviceUrl = url;

  // Set info bar
  viewerName.textContent = name || 'Device';
  viewerIp.textContent = ip || '';

  // Load in iframe
  deviceFrame.src = url;

  // Show viewer with slide-in animation
  deviceViewer.classList.remove('hidden', 'slide-out');

  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closeViewer() {
  // Slide-out animation
  deviceViewer.classList.add('slide-out');

  setTimeout(() => {
    deviceViewer.classList.add('hidden');
    deviceViewer.classList.remove('slide-out');
    deviceFrame.src = 'about:blank'; // Free memory
    currentDeviceUrl = null;
    document.body.style.overflow = '';
  }, 250);
}

function refreshViewer() {
  if (currentDeviceUrl) {
    viewerRefreshBtn.classList.add('spinning');
    deviceFrame.src = currentDeviceUrl;
    setTimeout(() => {
      viewerRefreshBtn.classList.remove('spinning');
    }, 1000);
  }
}

// Handle back button (Android) to close viewer
window.addEventListener('popstate', () => {
  if (!deviceViewer.classList.contains('hidden')) {
    closeViewer();
  }
});

// Push state when opening viewer so back button works
const originalOpenViewer = openViewer;
openViewer = function(url, name, ip) {
  history.pushState({ viewer: true }, '');
  originalOpenViewer(url, name, ip);
};

// ===== Parse Helpers =====
function parseLinkText(text) {
  // Text format: "euphony : Device Name (IP)" or similar
  const name = text.replace(/\s*\([\d.]+\)\s*$/, '').trim();
  return { name, time: null };
}

function extractIP(href) {
  const match = href.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  return match ? match[1] : null;
}

function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== Skeleton Loading =====
function createSkeletons(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card" style="animation-delay: ${i * 0.1}s">
        <div class="skeleton-icon"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
      </div>
    `;
  }
  return html;
}

// ===== Error Handling =====
function showError() {
  linksContainer.innerHTML = '';
  errorState.classList.remove('hidden');
  hideLoadingScreen();
}

// ===== Loading Screen =====
function hideLoadingScreen() {
  loadingScreen.classList.add('fade-out');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 600);
}

// Fallback: hide loading after timeout
setTimeout(hideLoadingScreen, 6000);

// ===== PWA Install =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  setTimeout(() => {
    if (!localStorage.getItem('installDismissed')) {
      installBanner.classList.remove('hidden');
    }
  }, 3000);
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((result) => {
      deferredPrompt = null;
      installBanner.classList.add('hidden');
    });
  }
}

function dismissInstall() {
  installBanner.classList.add('hidden');
  localStorage.setItem('installDismissed', 'true');
}

window.addEventListener('appinstalled', () => {
  installBanner.classList.add('hidden');
  deferredPrompt = null;
});

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('✅ SW registered:', reg.scope))
      .catch((err) => console.error('❌ SW failed:', err));
  });
}

// ===== Init =====
loadLinks();
