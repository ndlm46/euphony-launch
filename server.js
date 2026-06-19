const express = require('express');
const path = require('path');
const https = require('https');

const PORT_IFRAME = process.env.PORT || 8090;
const PORT_DIRECT = process.env.PORT_DIRECT || 8092;

const API_BASE = 'https://ip.musicserver.app/euphonyapi/getips';

// ===== Shared API handler =====
function apiLinksHandler(req, res) {
  const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const cleanIP = clientIP.replace(/^::ffff:/, '');
  const apiUrl = `${API_BASE}/${cleanIP}`;

  console.log(`[API] Client IP: ${cleanIP} -> ${apiUrl}`);

  https.get(apiUrl, (apiRes) => {
    let body = '';
    apiRes.on('data', (chunk) => { body += chunk; });
    apiRes.on('end', () => {
      try {
        const data = JSON.parse(body);

        if (!data.listIP || data.listIP.length === 0) {
          res.json({ success: true, clientIP: cleanIP, links: [] });
          return;
        }

        // Only keep devices online within the last 7 days
        const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
        const cutoff = new Date(Date.now() - ONE_WEEK_MS);

        const links = data.listIP
          .filter((device) => {
            if (!device.lastlogintime) return false;
            return new Date(device.lastlogintime) >= cutoff;
          })
          .map((device) => ({
            href: `http://${device.ip_local}/`,
            text: device.hostname || `Device (${device.ip_local})`,
            ip: device.ip_local,
            mac: device.mac,
            lastSeen: device.lastlogintime,
            firstSeen: device.firstlogintime
          }));

        console.log(`[API] Found ${links.length} devices for IP: ${cleanIP}`);
        res.json({ success: true, clientIP: cleanIP, links, fetchedAt: new Date().toISOString() });
      } catch (err) {
        console.error('[API] Parse error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to parse API response' });
      }
    });
  }).on('error', (err) => {
    console.error('[API] Fetch error:', err.message);
    res.status(502).json({ success: false, error: 'Cannot reach euphony API' });
  });
}

// ===== App 1: Iframe mode (/eu) =====
const app1 = express();
app1.set('trust proxy', true);
app1.use(express.static(path.join(__dirname, 'public')));
app1.get('/api/links', apiLinksHandler);
app1.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== App 2: Direct link mode (/eu41) =====
const app2 = express();
app2.set('trust proxy', true);
app2.use(express.static(path.join(__dirname, 'public'), { index: 'index-direct.html' }));
app2.get('/api/links', apiLinksHandler);
app2.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index-direct.html'));
});

// ===== Start both =====
app1.listen(PORT_IFRAME, () => {
  console.log(`🎵 Euphony (iframe mode)  -> http://localhost:${PORT_IFRAME}`);
});

app2.listen(PORT_DIRECT, () => {
  console.log(`🎵 Euphony (direct mode)  -> http://localhost:${PORT_DIRECT}`);
});
