'use strict';
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const config = require('../config');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ─── Token-based auth middleware ────────────────────────────────
// The DASHBOARD_TOKEN must be set in .env. All API routes and the
// WebSocket upgrade require a matching Bearer token or ?token= param.
// The static HTML files are served unauthenticated so the browser
// can load the page and prompt for the token.
const DASHBOARD_TOKEN = process.env.DASHBOARD_TOKEN || '';

function requireToken(req, res, next) {
  if (!DASHBOARD_TOKEN) {
    // Token not configured — warn loudly but allow access on localhost only.
    if (req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
      return res.status(401).json({ error: 'DASHBOARD_TOKEN not configured. Access denied on non-localhost.' });
    }
    console.warn('[Dashboard] ⚠️  DASHBOARD_TOKEN not set — unauthenticated access allowed on localhost only.');
    return next();
  }

  const authHeader = req.headers['authorization'] || '';
  const queryToken = req.query.token || '';
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;

  if (provided !== DASHBOARD_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing DASHBOARD_TOKEN' });
  }
  next();
}

// Serve static dashboard files (no auth — browser needs HTML/CSS/JS)
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ─── Client data endpoint (for screen pop) ──────────────────────
const sheetsService = require('../services/sheets.service');
const callState = require('../core/call-state');

app.get('/client/:rowIndex', requireToken, async (req, res) => {
  try {
    const clients = await sheetsService.getActiveClients();
    const rowIndex = parseInt(req.params.rowIndex, 10);
    if (isNaN(rowIndex)) return res.status(400).json({ error: 'Invalid rowIndex' });
    const client = clients.find(c => c.rowIndex === rowIndex);
    if (!client) {
      const calls = callState.getAllActive();
      const call = calls.find(c => c.clientData.rowIndex === rowIndex);
      if (call) return res.json(call.clientData);
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Manager dashboard data ──────────────────────────────────────
app.get('/api/active-calls', requireToken, (req, res) => {
  res.json(callState.getAllActive());
});

// ─── Serve pages (static, no auth) ──────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/manager', (req, res) => res.sendFile(path.join(__dirname, 'manager.html')));

// ─── WebSocket upgrade with token check ─────────────────────────
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token') || '';

  if (DASHBOARD_TOKEN && token !== DASHBOARD_TOKEN) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

// ─── WebSocket broadcast to all connected managers ───────────────
function broadcastToManagers(event) {
  const msg = JSON.stringify(event);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  });
}

wss.on('connection', (ws) => {
  console.log('[Dashboard] 🖥️  Manager connected');
  ws.send(JSON.stringify({ type: 'INIT', activeCalls: callState.getAllActive() }));
  ws.on('close', () => console.log('[Dashboard] Manager disconnected'));
});

function startDashboard() {
  return new Promise((resolve) => {
    server.listen(config.server.dashboardPort, () => {
      console.log(`[Dashboard] 🖥️  Agent Pop: http://localhost:${config.server.dashboardPort}`);
      console.log(`[Dashboard] 📊 Manager View: http://localhost:${config.server.dashboardPort}/manager`);
      if (!DASHBOARD_TOKEN) {
        console.warn('[Dashboard] ⚠️  Set DASHBOARD_TOKEN in .env to secure the dashboard.');
      }
      resolve();
    });
  });
}

module.exports = { startDashboard, broadcastToManagers };
