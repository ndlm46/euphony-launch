// ===== Direct Link Mode =====
// Cards are <a> tags that open device links directly (no iframe)

const loadingScreen = document.getElementById('loading-screen');
const linksContainer = document.getElementById('links-container');
const errorState = document.getElementById('error-state');
const linkCount = document.getElementById('link-count');
const btnRefresh = document.getElementById('btn-refresh');
const installBanner = document.getElementById('install-banner');

let deferredPrompt = null;

// ===== Load Links =====
async function loadLinks() {
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

// ===== Render =====
function renderLinks(links) {
  linksContainer.innerHTML = '';
  links.forEach((link, index) => {
    linksContainer.appendChild(createDeviceCard(link, index));
  });
}

function createDeviceCard(link, index) {
  const a = document.createElement('a');
  a.href = link.href;
  a.className = 'device-card';
  a.style.animationDelay = `${index * 0.08}s`;

  const name = link.text || `Device (${link.ip})`;
  const ip = link.ip || '';
  const lastSeen = link.lastSeen ? formatTime(link.lastSeen) : '';

  a.innerHTML = `
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

  return a;
}

// ===== Helpers =====
function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return isoString; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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
      </div>`;
  }
  return html;
}

function showError() {
  linksContainer.innerHTML = '';
  errorState.classList.remove('hidden');
  hideLoadingScreen();
}

function hideLoadingScreen() {
  loadingScreen.classList.add('fade-out');
  setTimeout(() => { loadingScreen.style.display = 'none'; }, 600);
}
setTimeout(hideLoadingScreen, 6000);

// ===== PWA =====
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  setTimeout(() => {
    if (!localStorage.getItem('installDismissed_direct')) {
      installBanner.classList.remove('hidden');
    }
  }, 3000);
});

function installPWA() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      installBanner.classList.add('hidden');
    });
  }
}

function dismissInstall() {
  installBanner.classList.add('hidden');
  localStorage.setItem('installDismissed_direct', 'true');
}

window.addEventListener('appinstalled', () => {
  installBanner.classList.add('hidden');
  deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('✅ SW registered:', reg.scope))
      .catch((err) => console.error('❌ SW failed:', err));
  });
}

// ===== Init =====
loadLinks();
