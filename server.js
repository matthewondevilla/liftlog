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

// PUT  /api/data  → full replace (client sends entire state)
app.put('/api/data', (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  const safe = {
    workouts: Array.isArray(body.workouts) ? body.workouts : [],
    prs:      (body.prs && typeof body.prs === 'object') ? body.prs : {},
    settings: (body.settings && typeof body.settings === 'object') ? body.settings : {},
    active:   body.active ?? null,
  };
  writeDB(safe);
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
