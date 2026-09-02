'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app      = express();
const PORT     = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE  = path.join(DATA_DIR, 'liftlog.json');

// ── ensure data dir exists ──────────────────────────────────────────
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── helpers ─────────────────────────────────────────────────────────
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { workouts: [], prs: {}, settings: {}, active: null };
  }
}

function sanitizeProfile(profile) {
  return {
    name:     typeof profile?.name === 'string' ? profile.name.slice(0, 50) : 'Profile',
    workouts: Array.isArray(profile?.workouts) ? profile.workouts : [],
    prs:      (profile?.prs && typeof profile.prs === 'object') ? profile.prs : {},
    settings: (profile?.settings && typeof profile.settings === 'object') ? profile.settings : {},
    active:   profile?.active ?? null,
  };
}

function sanitizeDB(body) {
  if (body?.profiles && typeof body.profiles === 'object') {
    const profiles = {};
    Object.entries(body.profiles).forEach(([id, profile]) => {
      if (/^[a-zA-Z0-9_-]{1,80}$/.test(id)) profiles[id] = sanitizeProfile(profile);
    });
    const ids = Object.keys(profiles);
    return {
      version: 2,
      currentProfileId: ids.includes(body.currentProfileId) ? body.currentProfileId : (ids[0] || null),
      profiles,
    };
  }
  return sanitizeProfile(body); // continue accepting older clients/backups
}

function writeDB(data) {
  // Atomic write: write to .tmp then rename so a crash can't corrupt
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

// ── middleware ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API ──────────────────────────────────────────────────────────────

// GET  /api/data  → returns full DB
app.get('/api/data', (req, res) => {
  res.json(readDB());
});

// POST /api/data  → same as PUT, used by sendBeacon on page unload
app.post('/api/data', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object') return res.sendStatus(204);
  writeDB(sanitizeDB(body));
  res.sendStatus(204);
});

// PUT  /api/data  → full replace (client sends entire state)
app.put('/api/data', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  writeDB(sanitizeDB(body));
  res.json({ ok: true });
});

// ── catch-all → serve index.html (SPA) ──────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LiftLog server running on port ${PORT}`);
  console.log(`Data file: ${DB_FILE}`);
});
