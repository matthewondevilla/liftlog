'use strict';

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────
const TYPES = ['Push', 'Pull', 'Legs', 'Swim', 'Cardio/Abs'];

const TC = {
  'Push':        { color: '#3b82f6', css: 'push',   icon: 'fa-hand-fist',       label: 'Push' },
  'Pull':        { color: '#ef4444', css: 'pull',   icon: 'fa-arrows-to-dot',   label: 'Pull' },
  'Legs':        { color: '#22c55e', css: 'legs',   icon: 'fa-person-running',  label: 'Legs' },
  'Swim':        { color: '#06b6d4', css: 'swim',   icon: 'fa-person-swimming', label: 'Swim' },
  'Cardio/Abs':  { color: '#f97316', css: 'cardio', icon: 'fa-heart-pulse',     label: 'Cardio/Abs' },
};

const TEMPLATES = {
  Push: [
    { name: 'Bench Press',           mg: 'chest',     rest: 180, unit: 'wt' },
    { name: 'Overhead Press',        mg: 'shoulders', rest: 180, unit: 'wt' },
    { name: 'Incline DB Press',      mg: 'chest',     rest: 120, unit: 'wt' },
    { name: 'Cable Fly',             mg: 'chest',     rest: 90,  unit: 'wt' },
    { name: 'Lateral Raises',        mg: 'shoulders', rest: 60,  unit: 'wt' },
    { name: 'Tricep Pushdown',       mg: 'triceps',   rest: 60,  unit: 'wt' },
    { name: 'Overhead Tricep Ext',   mg: 'triceps',   rest: 60,  unit: 'wt' },
  ],
  Pull: [
    { name: 'Deadlift',      mg: 'back',      rest: 240, unit: 'wt' },
    { name: 'Pull-ups',      mg: 'back',      rest: 120, unit: 'wt' },
    { name: 'Lat Pulldown',  mg: 'back',      rest: 120, unit: 'wt' },
    { name: 'Barbell Row',   mg: 'back',      rest: 180, unit: 'wt' },
    { name: 'Cable Row',     mg: 'back',      rest: 90,  unit: 'wt' },
    { name: 'Face Pulls',    mg: 'shoulders', rest: 60,  unit: 'wt' },
    { name: 'Bicep Curls',   mg: 'biceps',    rest: 60,  unit: 'wt' },
    { name: 'Hammer Curls',  mg: 'biceps',    rest: 60,  unit: 'wt' },
  ],
  Legs: [
    { name: 'Squat',                 mg: 'quads',      rest: 240, unit: 'wt' },
    { name: 'Romanian Deadlift',     mg: 'hamstrings', rest: 180, unit: 'wt' },
    { name: 'Leg Press',             mg: 'quads',      rest: 120, unit: 'wt' },
    { name: 'Leg Curl',              mg: 'hamstrings', rest: 90,  unit: 'wt' },
    { name: 'Leg Extension',         mg: 'quads',      rest: 90,  unit: 'wt' },
    { name: 'Bulgarian Split Squat', mg: 'quads',      rest: 120, unit: 'wt' },
    { name: 'Calf Raises',           mg: 'calves',     rest: 60,  unit: 'wt' },
  ],
  Swim: [
    { name: 'Freestyle',    mg: 'cardio', rest: 30, unit: 'm' },
    { name: 'Backstroke',   mg: 'cardio', rest: 30, unit: 'm' },
    { name: 'Breaststroke', mg: 'cardio', rest: 30, unit: 'm' },
    { name: 'Butterfly',    mg: 'cardio', rest: 45, unit: 'm' },
    { name: 'IM',           mg: 'cardio', rest: 45, unit: 'm' },
    { name: 'Kickboard',    mg: 'legs',   rest: 20, unit: 'm' },
    { name: 'Pull Buoy',    mg: 'back',   rest: 20, unit: 'm' },
  ],
  'Cardio/Abs': [
    { name: 'Treadmill Run',     mg: 'cardio', rest: 0,  unit: 'min' },
    { name: 'Cycling',           mg: 'cardio', rest: 0,  unit: 'min' },
    { name: 'Jump Rope',         mg: 'cardio', rest: 30, unit: 'min' },
    { name: 'Plank',             mg: 'core',   rest: 30, unit: 'sec' },
    { name: 'Crunches',          mg: 'core',   rest: 30, unit: 'reps' },
    { name: 'Leg Raises',        mg: 'core',   rest: 30, unit: 'reps' },
    { name: 'Russian Twists',    mg: 'core',   rest: 30, unit: 'reps' },
    { name: 'Mountain Climbers', mg: 'cardio', rest: 30, unit: 'reps' },
    { name: 'Ab Wheel',          mg: 'core',   rest: 60, unit: 'reps' },
  ],
};

const MG_COLOR = {
  chest: '#3b82f6', back: '#8b5cf6', shoulders: '#06b6d4',
  biceps: '#ef4444', triceps: '#f97316', quads: '#22c55e',
  hamstrings: '#10b981', calves: '#84cc16', core: '#f59e0b',
  cardio: '#ec4899', other: '#64748b',
};
const MG_ORDER = ['chest','back','shoulders','biceps','triceps','quads','hamstrings','calves','core','cardio'];

const DEFAULT_SCHED = { 0:'Rest', 1:'Push', 2:'Pull', 3:'Legs', 4:'Rest', 5:'Push', 6:'Swim' };
const DAY_NAMES     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ─────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────
let S = {
  active: null,
  workouts: [],
  prs: {},
  settings: { unit: 'lbs', sched: { ...DEFAULT_SCHED }, restTimes: {} },
};

// ─────────────────────────────────────────────────────────
// STORAGE  (server-backed — data lives in /data/liftlog.json)
// ─────────────────────────────────────────────────────────

// Debounce saves so rapid set-logging doesn't hammer the server
let _saveTimer = null;
function save() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_flushSave, 400);
}
function _flushSave() {
  fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workouts: S.workouts,
      prs:      S.prs,
      settings: S.settings,
      active:   S.active,
    }),
  }).catch(err => console.warn('LiftLog save failed:', err));
}

async function load() {
  try {
    const res  = await fetch('/api/data');
    const data = await res.json();
    S.workouts = Array.isArray(data.workouts) ? data.workouts : [];
    S.prs      = data.prs      || {};
    const c    = data.settings || {};
    S.settings = Object.assign(
      { unit: 'lbs', sched: { ...DEFAULT_SCHED }, restTimes: {}, customTemplates: {} },
      c
    );
    if (!S.settings.sched)           S.settings.sched           = { ...DEFAULT_SCHED };
    if (!S.settings.customTemplates) S.settings.customTemplates = {};
    S.active = data.active || null;
  } catch (err) {
    console.warn('LiftLog load failed, starting empty:', err);
    S.workouts = [];
    S.prs      = {};
    S.settings = { unit: 'lbs', sched: { ...DEFAULT_SCHED }, restTimes: {}, customTemplates: {} };
    S.active   = null;
  }
}

// Returns the user's saved template for a type, or the built-in default
function getTemplate(type) {
  const custom = S.settings.customTemplates[type];
  // deep-copy so mutations don't affect the source
  return JSON.parse(JSON.stringify(custom ?? TEMPLATES[type] ?? []));
}

// ─────────────────────────────────────────────────────────
// CUSTOM MODAL  (non-blocking confirm / prompt)
// ─────────────────────────────────────────────────────────
let _modalResolve = null;

function _showModal(title, msg, withInput, defaultVal, cancelLabel, okLabel) {
  return new Promise(res => {
    _modalResolve = res;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-msg').textContent   = msg;
    const inp = document.getElementById('modal-input');
    const can = document.getElementById('modal-cancel');
    const ok  = document.getElementById('modal-ok');
    inp.style.display = withInput    ? 'block'        : 'none';
    inp.value         = defaultVal  != null ? defaultVal : '';
    can.style.display = cancelLabel ? 'inline-block'  : 'none';
    can.textContent   = cancelLabel || 'Cancel';
    ok.textContent    = okLabel     || 'OK';
    document.getElementById('modal-ovl').classList.add('on');
    if (withInput) setTimeout(() => inp.focus(), 50);
  });
}
function modalOK() {
  const inp = document.getElementById('modal-input');
  const val = inp.style.display !== 'none' ? inp.value : true;
  closeModal(val);
}
function closeModal(val) {
  document.getElementById('modal-ovl').classList.remove('on');
  if (_modalResolve) { _modalResolve(val); _modalResolve = null; }
}

document.addEventListener('keydown', e => {
  const ovl = document.getElementById('modal-ovl');
  if (!ovl.classList.contains('on')) return;
  if (e.key === 'Enter')  modalOK();
  if (e.key === 'Escape') closeModal(false);
});

function askConfirm(msg)        { return _showModal('Confirm', msg, false, null, 'Cancel', 'OK'); }
function askPrompt(msg, defVal) { return _showModal('', msg, true, defVal, 'Cancel', 'OK'); }

// ─────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────
function showToast(msg, type = 'info', ms = 3000) {
  document.querySelectorAll('.pr-pop').forEach(e => e.remove());
  const icons = { success: 'fa-check-circle', pr: 'fa-trophy', info: 'fa-info-circle' };
  const el = document.createElement('div');
  el.className = 'pr-pop';
  el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${msg}`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, ms);
}

// ─────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────
let curView = 'home';
const NAV_VIEWS = ['home', 'workout', 'history', 'stats'];

function nav(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.bnav-btn, .dnav-btn').forEach(el => el.classList.remove('active'));

  const el = document.getElementById('view-' + v);
  if (el) {
    el.classList.add('active');
    el.classList.remove('fade-in');
    void el.offsetWidth;
    el.classList.add('fade-in');
  }

  if (NAV_VIEWS.includes(v)) {
    const b = document.getElementById('b-' + v); if (b) b.classList.add('active');
    const d = document.getElementById('d-' + v); if (d) d.classList.add('active');
  } else {
    const d = document.getElementById('d-settings'); if (d) d.classList.add('active');
  }

  curView = v;
  if (v === 'home')     renderHome();
  if (v === 'workout')  renderWorkout();
  if (v === 'history')  renderHistory();
  if (v === 'stats')    renderStats();
  if (v === 'settings') renderSettings();
}

// ─────────────────────────────────────────────────────────
// HOME
// ─────────────────────────────────────────────────────────
function renderHome() {
  document.getElementById('home-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });
  renderWeekStrip();
  renderTodaySuggest();
  renderQuickBtns();
  renderRecent();
}

function renderWeekStrip() {
  const strip = document.getElementById('week-strip');
  const now = new Date();
  const dow = now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - ((dow + 6) % 7));
  const DL = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const JS_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun

  strip.innerHTML = JS_DAYS.map((jsd, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const type = S.settings.sched[jsd] || 'Rest';
    const isToday = d.toDateString() === now.toDateString();
    const ds = fmtDate(d);
    const logged = S.workouts.some(w => w.date === ds);
    const cfg = TC[type];
    const col = cfg ? cfg.color : '#2d2d44';
    return `<div class="sched-cell ${isToday ? 'today-cell' : ''}"
         style="background:${col}18;border-color:${isToday ? col : 'transparent'}"
         onclick="startType('${type}')">
      <div style="font-size:10px;color:var(--muted)">${DL[i]}</div>
      <div style="font-size:${type === 'Cardio/Abs' ? '8px' : '10px'};font-weight:${isToday ? 700 : 500};color:${col};margin-top:2px;line-height:1.2">${type === 'Rest' ? 'Rest' : type}</div>
      ${logged ? `<div style="width:5px;height:5px;border-radius:50%;background:${col};margin:3px auto 0"></div>` : '<div style="height:8px"></div>'}
    </div>`;
  }).join('');
}

function renderTodaySuggest() {
  const sec = document.getElementById('today-suggest');
  const type = S.settings.sched[new Date().getDay()] || 'Rest';
  if (type === 'Rest') {
    sec.innerHTML = `<div class="card2 text-center py-4">
      <i class="fa-solid fa-couch fa-2x text-muted d-block mb-2"></i>
      <div class="fw-bold">Rest Day</div>
      <div class="text-muted small">Recovery is training too</div>
    </div>`;
    return;
  }
  const c = TC[type];
  sec.innerHTML = `<div class="card2" style="border-left:4px solid ${c.color}">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <div class="text-muted small">Suggested today</div>
        <div class="fw-bold fs-5">${type}</div>
      </div>
      <button class="btn fw-bold px-4" style="background:${c.color};color:#fff;border:none"
              onclick="startType('${type}')">
        <i class="fa-solid fa-play me-2"></i>Start
      </button>
    </div>
  </div>`;
}

function renderQuickBtns() {
  document.getElementById('quick-btns').innerHTML = TYPES.map(t => {
    const c = TC[t];
    return `<button class="start-btn" style="background:${c.color}18;border:1px solid ${c.color}33"
              onclick="startType('${t}')">
      <i class="fa-solid ${c.icon}" style="color:${c.color};font-size:20px;width:22px"></i>
      <span>${t}</span>
      <i class="fa-solid fa-chevron-right ms-auto text-muted" style="font-size:11px"></i>
    </button>`;
  }).join('');
}

function renderRecent() {
  const list = document.getElementById('recent-list');
  const items = [...S.workouts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  list.innerHTML = items.length
    ? items.map(histItem).join('')
    : `<div class="text-muted small text-center py-3">No workouts yet — hit Start</div>`;
}

// ─────────────────────────────────────────────────────────
// START / MANAGE WORKOUT
// ─────────────────────────────────────────────────────────
async function startType(type) {
  if (type === 'Rest') return;

  if (S.active) {
    const elapsed    = Math.floor((Date.now() - S.active.startTime) / 1000);
    const elapsedStr = elapsed >= 3600
      ? `${Math.floor(elapsed/3600)}h ${Math.floor((elapsed%3600)/60)}m`
      : elapsed >= 60 ? `${Math.floor(elapsed/60)}m` : `${elapsed}s`;

    if (S.active.type === type) {
      // Same type — offer resume vs fresh start
      const resume = await _showModal(
        `Resume ${type}?`,
        `You have an unfinished ${type} session started ${elapsedStr} ago. Pick up where you left off?`,
        false, null, 'Start Fresh', 'Resume'
      );
      if (resume) { nav('workout'); return; }
      // "Start Fresh" — fall through to create a new workout
    } else {
      // Different type — offer swap or cancel
      const discard = await _showModal(
        `Active ${S.active.type} workout`,
        `You're ${elapsedStr} into a ${S.active.type} session. Discard it and start ${type} instead?`,
        false, null, 'Keep Going', `Start ${type}`
      );
      if (!discard) return;
    }
  }
  const template = getTemplate(type);
  S.active = {
    id: Date.now() + '',
    type,
    date: fmtDate(new Date()),
    startTime: Date.now(),
    exercises: template.map(ex => ({
      name: ex.name, mg: ex.mg, unit: ex.unit,
      rest: S.settings.restTimes[ex.name] ?? ex.rest,
      sets: [],
    })),
  };
  // Pre-fill first set from last session
  S.active.exercises.forEach(ex => {
    const last = getLastSession(type, ex.name);
    ex.sets = [{ w: last?.[0]?.w ?? 0, r: last?.[0]?.r ?? 0, done: false }];
  });
  save();
  nav('workout');
}

// ─────────────────────────────────────────────────────────
// WORKOUT VIEW
// ─────────────────────────────────────────────────────────
let elapsedTick = null;

function renderWorkout() {
  const noWkt  = document.getElementById('no-wkt');
  const hdr    = document.getElementById('wkt-hdr');
  const scroll = document.getElementById('wkt-scroll');
  const finBar = document.getElementById('finish-bar');

  if (!S.active) {
    noWkt.style.display  = 'block';
    hdr.style.display    = 'none';
    scroll.style.display = 'none';
    finBar.style.display = 'none';
    if (elapsedTick) { clearInterval(elapsedTick); elapsedTick = null; }
    return;
  }

  noWkt.style.display  = 'none';
  hdr.style.display    = 'block';
  scroll.style.display = 'block';
  finBar.style.display = 'block';

  const c = TC[S.active.type];
  const badge = document.getElementById('wkt-type-badge');
  badge.innerHTML = `<i class="fa-solid ${c.icon} me-2"></i>${S.active.type}`;
  badge.style.background = c.color + '22';
  badge.style.color = c.color;

  if (elapsedTick) clearInterval(elapsedTick);
  elapsedTick = setInterval(tickElapsed, 1000);
  tickElapsed();

  updateSetsCount();

  scroll.innerHTML = S.active.exercises.map((ex, i) => renderExCard(ex, i)).join('')
    + `<div class="text-center pt-2 pb-2">
        <button class="btn btn-outline-secondary btn-sm" onclick="addCustomEx()">
          <i class="fa-solid fa-plus me-2"></i>Add Exercise
        </button>
       </div>`;
}

function tickElapsed() {
  if (!S.active) return;
  const s = Math.floor((Date.now() - S.active.startTime) / 1000);
  const el = document.getElementById('elapsed');
  if (el) el.textContent = `${Math.floor(s / 60)}:${(s % 60 + '').padStart(2, '0')}`;
}

function updateSetsCount() {
  if (!S.active) return;
  const n = S.active.exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.done).length, 0);
  const el = document.getElementById('sets-badge');
  if (el) el.textContent = `${n} set${n !== 1 ? 's' : ''}`;
}

function renderExCard(ex, ei) {
  const last = S.active ? getLastSession(S.active.type, ex.name) : null;
  const unit = resolveUnit(ex.unit);
  const valLbl = ex.unit === 'wt' ? unit : ex.unit;
  const step = ex.unit === 'wt' ? (unit === 'kg' ? 2.5 : 5) : ex.unit === 'm' ? 25 : 1;

  let lastHTML = '';
  if (last && last.length) {
    const badges = last.map((s, i) =>
      `<span class="badge bg-secondary me-1" style="font-size:11px">${i + 1}: ${s.w}${valLbl}×${s.r}</span>`
    ).join('');
    lastHTML = `<div class="last-ref">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;color:var(--push)">
        <i class="fa-solid fa-clock-rotate-left me-1"></i>Last session
      </div>${badges}</div>`;
  }

  const doneCnt = ex.sets.filter(s => s.done).length;
  const setsRows = ex.sets.map((s, si) => renderSetRow(s, ei, si, valLbl, step)).join('');

  return `<div class="ex-card" id="ex-${ei}">
    <div class="ex-hdr" onclick="toggleEx(${ei})">
      <div>
        <div class="ex-name">${ex.name}${doneCnt ? ` <span class="badge ms-2" style="background:#14532d;color:#4ade80;font-size:10px">${doneCnt}✓</span>` : ''}</div>
        <div class="d-flex gap-2 mt-1 flex-wrap">
          <span class="badge" style="background:var(--bg4);color:#94a3b8;font-size:10px">
            <i class="fa-solid fa-stopwatch me-1"></i>${ex.rest}s
          </span>
          <span class="badge" style="background:var(--bg4);color:#94a3b8;font-size:10px">${ex.mg}</span>
        </div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm" style="background:var(--bg4);color:var(--muted);font-size:11px;padding:3px 8px"
                onclick="event.stopPropagation();cfgRest(${ei})" title="Set rest time">
          <i class="fa-solid fa-stopwatch"></i>
        </button>
        <button class="btn btn-sm" style="background:var(--bg4);color:#ef4444;font-size:11px;padding:3px 8px"
                onclick="event.stopPropagation();deleteEx(${ei})" title="Remove exercise">
          <i class="fa-solid fa-trash"></i>
        </button>
        <i class="fa-solid fa-chevron-down text-muted" id="chev-${ei}" style="transition:transform .2s;font-size:13px"></i>
      </div>
    </div>
    <div class="ex-body" id="exb-${ei}">
      ${lastHTML}
      <div class="set-row" style="padding:4px 12px">
        <div class="set-num" style="font-size:10px">Set</div>
        <div style="text-align:center;font-size:10px;color:var(--muted)">${valLbl}</div>
        <div style="text-align:center;font-size:10px;color:var(--muted)">Reps</div>
        <div></div>
      </div>
      <div id="setrows-${ei}">${setsRows}</div>
      <div class="px-3 pb-3 pt-1">
        <button class="btn btn-outline-secondary btn-sm w-100" onclick="addSet(${ei})">
          <i class="fa-solid fa-plus me-1"></i>Add Set
        </button>
      </div>
    </div>
  </div>`;
}

function renderSetRow(s, ei, si, valLbl, step) {
  const done = s.done;
  return `<div class="set-row${done ? ' opacity-50' : ''}" id="sr-${ei}-${si}">
    <div class="set-num">${si + 1}</div>
    <div class="spin-grp">
      <button onclick="adj('w',${ei},${si},${-step})"${done ? ' disabled' : ''}>−</button>
      <input type="number" id="w-${ei}-${si}" value="${s.w ?? 0}" min="0" step="${step}"
             onchange="setVal('w',${ei},${si},this.value)"${done ? ' readonly' : ''}>
      <button onclick="adj('w',${ei},${si},${step})"${done ? ' disabled' : ''}>+</button>
    </div>
    <div class="spin-grp">
      <button onclick="adj('r',${ei},${si},-1)"${done ? ' disabled' : ''}>−</button>
      <input type="number" id="r-${ei}-${si}" value="${s.r ?? 0}" min="0"
             onchange="setVal('r',${ei},${si},this.value)"${done ? ' readonly' : ''}>
      <button onclick="adj('r',${ei},${si},1)"${done ? ' disabled' : ''}>+</button>
    </div>
    <button class="log-btn${done ? ' done' : ''}" id="lb-${ei}-${si}"
            onclick="logSet(${ei},${si})"${done ? ' disabled' : ''}>
      <i class="fa-solid ${done ? 'fa-check' : 'fa-circle-check'}"></i>
    </button>
  </div>`;
}

function resolveUnit(u) { return u === 'wt' ? S.settings.unit : u; }

function toggleEx(ei) {
  const b = document.getElementById('exb-' + ei);
  const ch = document.getElementById('chev-' + ei);
  if (!b) return;
  const open = b.style.display !== 'none';
  b.style.display = open ? 'none' : 'block';
  if (ch) ch.style.transform = open ? 'rotate(-90deg)' : 'rotate(0deg)';
}

function adj(field, ei, si, delta) {
  const set = S.active.exercises[ei]?.sets[si];
  if (!set || set.done) return;
  set[field] = Math.max(0, +((parseFloat(set[field]) || 0) + delta).toFixed(2));
  const inp = document.getElementById(`${field}-${ei}-${si}`);
  if (inp) inp.value = set[field];
  save();
}

function setVal(field, ei, si, v) {
  const set = S.active.exercises[ei]?.sets[si];
  if (!set) return;
  set[field] = parseFloat(v) || 0;
  save();
}

function logSet(ei, si) {
  const ex  = S.active.exercises[ei];
  const set = ex.sets[si];
  if (!set || set.done) return;

  set.w    = parseFloat(document.getElementById(`w-${ei}-${si}`)?.value) || 0;
  set.r    = parseInt(document.getElementById(`r-${ei}-${si}`)?.value)   || 0;
  set.done = true;
  set.ts   = Date.now();

  // Update row in-place
  const row = document.getElementById(`sr-${ei}-${si}`);
  if (row) {
    row.classList.add('opacity-50');
    row.querySelectorAll('button').forEach(b => b.disabled = true);
    row.querySelectorAll('input').forEach(i => i.readOnly = true);
    const lb = document.getElementById(`lb-${ei}-${si}`);
    if (lb) { lb.classList.add('done'); lb.innerHTML = '<i class="fa-solid fa-check"></i>'; }
  }

  // Auto-append next set if this was the last
  if (si === ex.sets.length - 1) {
    ex.sets.push({ w: set.w, r: set.r, done: false });
    const container = document.getElementById(`setrows-${ei}`);
    if (container) {
      const unit = resolveUnit(ex.unit);
      const valLbl = ex.unit === 'wt' ? unit : ex.unit;
      const step = ex.unit === 'wt' ? (unit === 'kg' ? 2.5 : 5) : ex.unit === 'm' ? 25 : 1;
      const div = document.createElement('div');
      div.innerHTML = renderSetRow({ w: set.w, r: set.r, done: false }, ei, ex.sets.length - 1, valLbl, step);
      container.appendChild(div.firstElementChild);
    }
  }

  // Refresh done-count badge in header
  const nameEl = document.querySelector(`#ex-${ei} .ex-name`);
  if (nameEl) {
    const dc = ex.sets.filter(s => s.done).length;
    nameEl.innerHTML = ex.name + ` <span class="badge ms-2" style="background:#14532d;color:#4ade80;font-size:10px">${dc}✓</span>`;
  }

  save();
  updateSetsCount();

  // PR check (only for weight-based exercises)
  if (ex.unit === 'wt' && set.w > 0 && set.r > 0) {
    if (checkPR(ex.name, set.w, set.r))
      showToast(`🏆 New PR! ${ex.name}: ${set.w} × ${set.r}`, 'pr', 4000);
  }

  // Start rest timer
  if (ex.rest > 0) startTimer(ex.rest, ex.name);
}

function addSet(ei) {
  const ex   = S.active.exercises[ei];
  const prev = ex.sets[ex.sets.length - 1] || { w: 0, r: 0 };
  ex.sets.push({ w: prev.w, r: prev.r, done: false });
  save();
  const container = document.getElementById(`setrows-${ei}`);
  if (container) {
    const unit = resolveUnit(ex.unit);
    const valLbl = ex.unit === 'wt' ? unit : ex.unit;
    const step = ex.unit === 'wt' ? (unit === 'kg' ? 2.5 : 5) : ex.unit === 'm' ? 25 : 1;
    const div = document.createElement('div');
    div.innerHTML = renderSetRow({ w: prev.w, r: prev.r, done: false }, ei, ex.sets.length - 1, valLbl, step);
    container.appendChild(div.firstElementChild);
  }
}

async function cfgRest(ei) {
  const ex = S.active.exercises[ei];
  const v  = await askPrompt(`Rest time for "${ex.name}" (seconds):`, ex.rest);
  if (v === false || v === '') return;
  const t = parseInt(v);
  if (!isNaN(t) && t >= 0) {
    ex.rest = t;
    S.settings.restTimes[ex.name] = t;
    save();
    const badges = document.querySelectorAll(`#ex-${ei} .badge`);
    if (badges[0]) badges[0].innerHTML = `<i class="fa-solid fa-stopwatch me-1"></i>${t}s`;
  }
}

async function addCustomEx() {
  const name = await askPrompt('Exercise name:', '');
  if (!name) return;
  const mg = await askPrompt('Muscle group (chest, back, core…):', 'other');
  S.active.exercises.push({ name, mg: mg || 'other', unit: 'wt', rest: 90, sets: [{ w: 0, r: 0, done: false }] });
  save();
  const scroll = document.getElementById('wkt-scroll');
  scroll.innerHTML = S.active.exercises.map((ex, i) => renderExCard(ex, i)).join('')
    + `<div class="text-center pt-2 pb-2">
        <button class="btn btn-outline-secondary btn-sm" onclick="addCustomEx()">
          <i class="fa-solid fa-plus me-2"></i>Add Exercise
        </button>
       </div>`;
}

function deleteEx(ei) {
  const ex = S.active.exercises[ei];
  // Remove card from DOM immediately — no confirm needed, fast gym UX
  const card = document.getElementById('ex-' + ei);
  if (card) {
    card.style.transition = 'opacity .2s, transform .2s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(40px)';
    setTimeout(() => {
      S.active.exercises.splice(ei, 1);
      save();
      updateSetsCount();
      // Re-render the full exercise list so indices stay correct
      const scroll = document.getElementById('wkt-scroll');
      scroll.innerHTML = S.active.exercises.map((e, i) => renderExCard(e, i)).join('')
        + `<div class="text-center pt-2 pb-2">
            <button class="btn btn-outline-secondary btn-sm" onclick="addCustomEx()">
              <i class="fa-solid fa-plus me-2"></i>Add Exercise
            </button>
           </div>`;
    }, 200);
  }
}

async function finishWorkout() {
  if (!S.active) return;
  const n = S.active.exercises.reduce((s, ex) => s + ex.sets.filter(st => st.done).length, 0);
  if (n === 0) {
    const ok = await askConfirm('No sets logged. Save anyway?');
    if (!ok) return;
  }
  S.active.endTime = Date.now();
  S.active.dur = Math.floor((S.active.endTime - S.active.startTime) / 1000);
  S.active.exercises.forEach(ex => { ex.sets = ex.sets.filter(s => s.done); });
  S.workouts.push({ ...S.active });
  S.active = null;
  if (elapsedTick) { clearInterval(elapsedTick); elapsedTick = null; }
  save();
  showToast(`Workout done! ${n} sets logged 💪`, 'success', 3000);
  nav('home');
}

async function discardWorkout() {
  if (!S.active) return;
  const n = S.active.exercises.reduce((s, ex) => s + ex.sets.filter(st => st.done).length, 0);
  const msg = n > 0
    ? `Discard this ${S.active.type} workout? You've logged ${n} set${n !== 1 ? 's' : ''} — they won't be saved.`
    : `Discard this ${S.active.type} workout? Nothing has been logged yet.`;
  const ok = await _showModal('Discard workout?', msg, false, null, 'Keep Training', 'Discard');
  if (!ok) return;
  S.active = null;
  if (elapsedTick) { clearInterval(elapsedTick); elapsedTick = null; }
  save();
  showToast('Workout discarded', 'info', 2000);
  nav('home');
}

function getLastSession(type, name) {
  const past = S.workouts.filter(w => w.type === type)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  for (const wkt of past) {
    const ex = wkt.exercises?.find(e => e.name === name);
    if (ex?.sets?.length) return ex.sets;
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// PR TRACKING
// ─────────────────────────────────────────────────────────
function checkPR(name, w, r) {
  const e1 = w * (1 + r / 30);
  const old = S.prs[name];
  if (e1 > (old ? old.w * (1 + old.r / 30) : 0)) {
    S.prs[name] = { w, r, e1rm: Math.round(e1), date: fmtDate(new Date()) };
    save();
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────
// REST TIMER
// ─────────────────────────────────────────────────────────
let timerIv = null, timerRem = 0, timerTot = 0;

function startTimer(secs, name) {
  if (timerIv) clearInterval(timerIv);
  timerRem = secs; timerTot = secs;
  document.getElementById('t-exname').textContent = name;
  document.getElementById('rest-ovl').classList.add('on');
  drawTimer();
  timerIv = setInterval(() => {
    timerRem--;
    drawTimer();
    if (timerRem <= 0) { clearInterval(timerIv); timerIv = null; timerDone(); }
  }, 1000);
}

function drawTimer() {
  document.getElementById('t-num').textContent = timerRem;
  const pct = timerTot > 0 ? (1 - timerRem / timerTot) * 100 : 0;
  const col = timerRem <= 5 ? '#ef4444' : '#3b82f6';
  document.getElementById('t-ring').style.background =
    `conic-gradient(${col} ${pct}%, #2d2d44 ${pct}%)`;
}

function skipTimer() {
  if (timerIv) { clearInterval(timerIv); timerIv = null; }
  document.getElementById('rest-ovl').classList.remove('on');
}

function addRestTime(d) {
  timerRem = Math.max(0, timerRem + d);
  timerTot = Math.max(timerTot, timerRem);
  drawTimer();
}

function timerDone() {
  document.getElementById('rest-ovl').classList.remove('on');
  playBeep();
  if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
  showToast('Rest done — go! 💪', 'success', 2500);
}

let actx = null;
function playBeep() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      o.frequency.value = 880; o.type = 'sine';
      g.gain.setValueAtTime(0.4, actx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + t + 0.22);
      o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.22);
    });
  } catch (e) { /* audio not available */ }
}

// ─────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────
let calMon = new Date(); calMon.setDate(1);

function renderHistory() {
  renderCal();
  renderAllWkts();
}

function renderCal() {
  const y = calMon.getFullYear(), m = calMon.getMonth();
  document.getElementById('cal-label').textContent =
    calMon.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const first = new Date(y, m, 1).getDay();
  const days  = new Date(y, m + 1, 0).getDate();
  const today = fmtDate(new Date());

  const wmap = {};
  S.workouts.forEach(w => { if (w.date) wmap[w.date] = w; });

  let html = '';
  for (let i = 0; i < first; i++) html += `<div class="cal-cell empty"></div>`;
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${p2(m + 1)}-${p2(d)}`;
    const w  = wmap[ds];
    const isT = ds === today;
    const sel = ds === window._selDay;
    if (w) {
      const c = TC[w.type];
      html += `<div class="cal-cell has-w bg-${c.css} ${isT ? 'today' : ''} ${sel ? 'selected' : ''}"
               onclick="selectDay('${ds}')" title="${w.type}">${d}</div>`;
    } else {
      html += `<div class="cal-cell blank ${isT ? 'today' : ''} ${sel ? 'selected' : ''}"
               onclick="selectDay('${ds}')">${d}</div>`;
    }
  }
  document.getElementById('cal-grid').innerHTML = html;
}

function selectDay(ds) {
  window._selDay = ds;
  const w      = S.workouts.find(x => x.date === ds);
  const detail = document.getElementById('day-detail');
  const lbl    = document.getElementById('day-detail-lbl');
  const body   = document.getElementById('day-detail-body');
  const d      = new Date(ds + 'T12:00:00');
  lbl.textContent   = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  detail.style.display = 'block';
  body.innerHTML = w ? wktDetailHTML(w) : `<div class="text-muted small">Rest day</div>`;
  renderCal();
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function wktDetailHTML(w) {
  const c     = TC[w.type];
  const total = w.exercises?.reduce((s, e) => s + (e.sets?.length || 0), 0) || 0;
  const dur   = w.dur ? `${Math.floor(w.dur / 60)}m` : '';
  const exHTML = (w.exercises || []).filter(e => e.sets?.length).map(ex => {
    const unit = ex.unit === 'wt' ? S.settings.unit : ex.unit;
    return `<div class="mb-2">
      <div class="fw-semibold" style="font-size:13px">${ex.name}</div>
      <div class="d-flex flex-wrap gap-1 mt-1">
        ${ex.sets.map((s, i) => `<span class="badge bg-secondary" style="font-size:11px">${i + 1}: ${s.w}${unit}×${s.r}</span>`).join('')}
      </div></div>`;
  }).join('');
  return `<div class="card2" style="border-left:4px solid ${c?.color || '#3b82f6'}">
    <div class="d-flex justify-content-between mb-3">
      <span class="fw-bold">${w.type}</span>
      <span class="text-muted small">${total} sets${dur ? ' · ' + dur : ''}</span>
    </div>${exHTML}</div>`;
}

function renderAllWkts() {
  const el = document.getElementById('all-wkts');
  const sorted = [...S.workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
  el.innerHTML = sorted.length ? sorted.map(histItem).join('')
    : `<div class="text-muted small text-center py-3">No workouts logged yet</div>`;
}

function histItem(w) {
  const c     = TC[w.type];
  const d     = new Date(w.date + 'T12:00:00');
  const dl    = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const total = w.exercises?.reduce((s, e) => s + (e.sets?.length || 0), 0) || 0;
  const dur   = w.dur ? `${Math.floor(w.dur / 60)}m` : '';
  const exs   = (w.exercises || []).filter(e => e.sets?.length).slice(0, 3).map(e => e.name).join(', ');
  return `<div class="hist-item" id="hist-${w.id}" style="border-left-color:${c?.color || '#3b82f6'}">
    <div class="d-flex justify-content-between align-items-center">
      <div style="cursor:pointer;flex:1" onclick="selectDay('${w.date}');nav('history')">
        <div class="fw-bold">${w.type}</div>
        <div class="text-muted small">${dl}</div>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="text-muted small">${total} sets${dur ? ' · ' + dur : ''}</span>
        <button class="btn btn-sm" style="background:transparent;color:#ef4444;border:1px solid #ef444444;padding:3px 8px;font-size:12px"
                onclick="event.stopPropagation();deleteWorkout('${w.id}')" title="Delete workout">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
    ${exs ? `<div class="text-muted mt-1" style="font-size:12px;cursor:pointer" onclick="selectDay('${w.date}');nav('history')">${exs}</div>` : ''}
  </div>`;
}

async function deleteWorkout(id) {
  const w = S.workouts.find(x => x.id === id);
  if (!w) return;
  const d = new Date(w.date + 'T12:00:00');
  const dl = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const ok = await _showModal(
    'Delete workout?',
    `Delete the ${w.type} session from ${dl}? This can't be undone.`,
    false, null, 'Cancel', 'Delete'
  );
  if (!ok) return;
  // Slide out animation then remove
  const el = document.getElementById('hist-' + id);
  if (el) {
    el.style.transition = 'opacity .2s, transform .2s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(40px)';
    setTimeout(() => el.remove(), 200);
  }
  S.workouts = S.workouts.filter(x => x.id !== id);
  // Also remove PRs that came from this workout (re-compute from remaining)
  recomputePRs();
  save();
  // Refresh calendar and recent list if visible
  if (curView === 'history') renderCal();
  if (curView === 'home') renderRecent();
  showToast('Workout deleted', 'info', 2000);
}

function recomputePRs() {
  S.prs = {};
  // Replay all workouts in order to rebuild PRs
  [...S.workouts]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (ex.unit === 'wt') {
          (ex.sets || []).forEach(s => {
            if (s.w > 0 && s.r > 0) checkPR(ex.name, s.w, s.r);
          });
        }
      });
    });
}

function calPrev() { calMon.setMonth(calMon.getMonth() - 1); renderCal(); }
function calNext() { calMon.setMonth(calMon.getMonth() + 1); renderCal(); }

// ─────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────
function renderStats() {
  renderVolBars();
  renderWeekSummary();
  renderPRList();
}

function getThisWeek() {
  const now = new Date(), dow = now.getDay();
  const start = new Date(now); start.setDate(now.getDate() - ((dow + 6) % 7)); start.setHours(0, 0, 0, 0);
  const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
  return { start, end };
}

function renderVolBars() {
  const { start, end } = getThisWeek();
  const wkts = S.workouts.filter(w => { const d = new Date(w.date + 'T12:00:00'); return d >= start && d <= end; });
  document.getElementById('vol-lbl').textContent =
    `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const sets = {}, reps = {};
  MG_ORDER.forEach(g => { sets[g] = 0; reps[g] = 0; });
  wkts.forEach(w => {
    (w.exercises || []).forEach(ex => {
      const g = ex.mg || 'other';
      (ex.sets || []).forEach(s => { sets[g] = (sets[g] || 0) + 1; reps[g] = (reps[g] || 0) + (s.r || 0); });
    });
  });

  const maxS   = Math.max(...MG_ORDER.map(g => sets[g]), 1);
  const active = MG_ORDER.filter(g => sets[g] > 0);
  const el     = document.getElementById('vol-bars');

  if (!active.length) { el.innerHTML = `<div class="text-muted small text-center py-2">No workouts this week</div>`; return; }
  el.innerHTML = active.map(g => `
    <div class="mb-3">
      <div class="d-flex justify-content-between mb-1">
        <span style="font-size:13px;text-transform:capitalize">${g}</span>
        <span class="text-muted" style="font-size:12px">${sets[g]} sets · ${reps[g]} reps</span>
      </div>
      <div class="vol-bar">
        <div class="vol-fill" style="width:${(sets[g] / maxS * 100).toFixed(1)}%;background:${MG_COLOR[g] || '#3b82f6'}"></div>
      </div>
    </div>`).join('');
}

function renderWeekSummary() {
  const { start, end } = getThisWeek();
  const wkts = S.workouts.filter(w => { const d = new Date(w.date + 'T12:00:00'); return d >= start && d <= end; })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const el = document.getElementById('week-summary');
  if (!wkts.length) { el.innerHTML = `<div class="text-muted small">No workouts this week</div>`; return; }
  el.innerHTML = wkts.map(w => {
    const c = TC[w.type];
    const d = new Date(w.date + 'T12:00:00');
    const total = w.exercises?.reduce((s, e) => s + (e.sets?.length || 0), 0) || 0;
    return `<div class="d-flex align-items-center gap-3 mb-2">
      <span class="type-pill" style="background:${c?.color}22;color:${c?.color};min-width:100px;justify-content:center">${w.type}</span>
      <span class="text-muted small">${d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
      <span class="text-muted small">${total} sets</span>
    </div>`;
  }).join('');
}

function renderPRList() {
  const el = document.getElementById('pr-list');
  const entries = Object.entries(S.prs).sort((a, b) => new Date(b[1].date) - new Date(a[1].date));
  if (!entries.length) { el.innerHTML = `<div class="text-muted small text-center py-3">No PRs yet — get lifting!</div>`; return; }
  el.innerHTML = entries.map(([name, pr]) => `
    <div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--bg4)">
      <div>
        <div class="fw-semibold" style="font-size:14px">${name}</div>
        <div class="text-muted" style="font-size:11px">${pr.date}</div>
      </div>
      <div class="text-end">
        <div class="fw-bold">${pr.w} × ${pr.r}</div>
        <div class="text-muted" style="font-size:11px">e1RM ~${pr.e1rm}</div>
      </div>
    </div>`).join('');
}

// ─────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────
function renderSettings() {
  document.querySelectorAll('input[name="wu"]').forEach(r => {
    r.checked = r.value === S.settings.unit;
    r.onchange = () => { S.settings.unit = r.value; save(); };
  });

  const se = document.getElementById('sched-editor');
  // Show Mon→Sun order so it matches the week strip on Home
  const MON_FIRST = [
    { label: 'Monday',    jsDay: 1 },
    { label: 'Tuesday',   jsDay: 2 },
    { label: 'Wednesday', jsDay: 3 },
    { label: 'Thursday',  jsDay: 4 },
    { label: 'Friday',    jsDay: 5 },
    { label: 'Saturday',  jsDay: 6 },
    { label: 'Sunday',    jsDay: 0 },
  ];
  se.innerHTML = MON_FIRST.map(({ label, jsDay }) => {
    const current = S.settings.sched[jsDay] || 'Rest';
    const col = TC[current]?.color || '#475569';
    return `<div class="d-flex justify-content-between align-items-center mb-2" id="sched-row-${jsDay}">
      <div class="d-flex align-items-center gap-2">
        <span style="width:10px;height:10px;border-radius:50%;background:${col};display:inline-block;flex-shrink:0" id="sched-dot-${jsDay}"></span>
        <span style="font-size:14px;width:90px">${label}</span>
      </div>
      <select class="form-select form-select-sm" style="width:155px" onchange="updSched(${jsDay},this.value)">
        ${['Rest', ...TYPES].map(t => `<option value="${t}"${current === t ? ' selected' : ''}>${t}</option>`).join('')}
      </select>
    </div>`;
  }).join('');

  const re = document.getElementById('rest-editor');
  const allEx = Object.values(TEMPLATES).flat();
  re.innerHTML = allEx.map(ex => `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span style="font-size:13px">${ex.name}</span>
      <div class="d-flex align-items-center gap-2">
        <input type="number" class="form-control form-control-sm"
               style="width:72px;background:var(--bg4);border-color:var(--bg4);color:var(--text)"
               value="${S.settings.restTimes[ex.name] ?? ex.rest}"
               oninput="updRest('${ex.name}',this.value)">
        <span class="text-muted small">s</span>
      </div>
    </div>`).join('');

  renderTemplateTabs();
}

// ─────────────────────────────────────────────────────────
// TEMPLATE EDITOR
// ─────────────────────────────────────────────────────────
let _tmplType = TYPES[0];

function renderTemplateTabs() {
  const tabs = document.getElementById('tmpl-tabs');
  if (!tabs) return;
  tabs.innerHTML = TYPES.map(t => {
    const c = TC[t];
    const active = t === _tmplType;
    return `<button onclick="setTmplTab('${t}')"
      style="padding:5px 12px;border-radius:20px;border:1px solid ${c.color}${active ? '' : '44'};
             background:${active ? c.color+'33' : 'transparent'};color:${active ? c.color : 'var(--muted)'};
             font-size:12px;font-weight:600;cursor:pointer">
      ${t}
    </button>`;
  }).join('');
  renderTmplBody();
}

function setTmplTab(type) {
  _tmplType = type;
  renderTemplateTabs();
}

function renderTmplBody() {
  const body = document.getElementById('tmpl-body');
  if (!body) return;
  const exs = getTemplate(_tmplType);
  const c = TC[_tmplType];
  const isCustom = !!S.settings.customTemplates[_tmplType];

  body.innerHTML = `
    <div id="tmpl-list">
      ${exs.map((ex, i) => `
        <div class="d-flex align-items-center gap-2 py-2" style="border-bottom:1px solid var(--bg4)" id="tmpl-ex-${i}">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:500">${ex.name}</div>
            <div class="text-muted" style="font-size:11px">${ex.mg} · ${S.settings.restTimes[ex.name] ?? ex.rest}s rest</div>
          </div>
          <button class="btn btn-sm" style="background:transparent;color:#ef4444;border:1px solid #ef444433;padding:3px 8px"
                  onclick="tmplRemoveEx(${i})" title="Remove">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>`).join('')}
    </div>
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-sm fw-bold" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}44;flex:1"
              onclick="tmplAddEx()">
        <i class="fa-solid fa-plus me-1"></i>Add Exercise
      </button>
      ${isCustom ? `<button class="btn btn-sm btn-outline-secondary" onclick="tmplReset()" title="Reset to defaults">
        <i class="fa-solid fa-rotate-left me-1"></i>Reset
      </button>` : ''}
    </div>
    ${isCustom ? '' : `<div class="text-muted text-center mt-2" style="font-size:11px">These are the defaults. Remove or add exercises to customise.</div>`}
  `;
}

function tmplRemoveEx(idx) {
  // Copy to custom if not yet customised
  if (!S.settings.customTemplates[_tmplType]) {
    S.settings.customTemplates[_tmplType] = getTemplate(_tmplType);
  }
  S.settings.customTemplates[_tmplType].splice(idx, 1);
  save();
  renderTmplBody();
}

async function tmplAddEx() {
  const name = await askPrompt('Exercise name:', '');
  if (!name) return;
  const mg = await askPrompt('Muscle group (chest, back, core…):', 'other');
  const restStr = await askPrompt('Rest time (seconds):', 90);
  const rest = parseInt(restStr) || 90;

  if (!S.settings.customTemplates[_tmplType]) {
    S.settings.customTemplates[_tmplType] = getTemplate(_tmplType);
  }
  S.settings.customTemplates[_tmplType].push({
    name, mg: mg || 'other', unit: 'wt', rest,
  });
  S.settings.restTimes[name] = rest;
  save();
  renderTmplBody();
  showToast(`${name} added to ${_tmplType}`, 'success', 2000);
}

async function tmplReset() {
  const ok = await askConfirm(`Reset ${_tmplType} template to defaults?`);
  if (!ok) return;
  delete S.settings.customTemplates[_tmplType];
  save();
  renderTmplBody();
  showToast(`${_tmplType} reset to defaults`, 'info', 2000);
}

function updSched(day, type) {
  S.settings.sched[day] = type;
  save();
  // Update the color dot next to this day instantly
  const dot = document.getElementById('sched-dot-' + day);
  if (dot) dot.style.background = TC[type]?.color || '#475569';
  // Brief "Saved" indicator in the row
  const row = document.getElementById('sched-row-' + day);
  if (row) {
    let saved = row.querySelector('.saved-lbl');
    if (!saved) {
      saved = document.createElement('span');
      saved.className = 'saved-lbl';
      saved.style.cssText = 'font-size:11px;color:#4ade80;margin-left:6px;transition:opacity .5s';
      saved.textContent = '✓';
      row.appendChild(saved);
    }
    saved.style.opacity = '1';
    clearTimeout(saved._t);
    saved._t = setTimeout(() => { saved.style.opacity = '0'; }, 1200);
  }
}
function updRest(name, v) {
  const t = parseInt(v);
  if (!isNaN(t) && t >= 0) {
    S.settings.restTimes[name] = t;
    save();
  }
}

function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts: S.workouts,
    prs: S.prs,
    settings: S.settings,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href     = url;
  a.download = `liftlog-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded 📦', 'success', 2500);
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  // Reset the input so the same file can be imported again if needed
  event.target.value = '';

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    showToast('Invalid file — not a LiftLog backup', 'info', 3000);
    return;
  }

  if (!parsed.workouts || !parsed.settings) {
    showToast('File doesn\'t look like a LiftLog backup', 'info', 3000);
    return;
  }

  const ok = await _showModal(
    'Import backup?',
    `This will replace your current data with the backup from ${parsed.exportedAt?.split('T')[0] ?? 'unknown date'} (${parsed.workouts.length} workout${parsed.workouts.length !== 1 ? 's' : ''}).`,
    false, null, 'Cancel', 'Import'
  );
  if (!ok) return;

  S.workouts  = parsed.workouts  || [];
  S.prs       = parsed.prs       || {};
  S.settings  = Object.assign({ unit: 'lbs', sched: { ...DEFAULT_SCHED }, restTimes: {}, customTemplates: {} }, parsed.settings || {});
  S.active    = null;
  save();
  showToast(`Imported ${S.workouts.length} workouts ✓`, 'success', 3000);
  nav('home');
}

async function clearData() {
  const ok = await askConfirm('Delete ALL workout history and PRs? This cannot be undone.');
  if (!ok) return;
  S = { active: null, workouts: [], prs: {}, settings: { unit: 'lbs', sched: { ...DEFAULT_SCHED }, restTimes: {}, customTemplates: {} } };
  _flushSave();
  showToast('Data cleared', 'info', 2000);
  nav('home');
}

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────
function fmtDate(d) { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
function p2(n)      { return n.toString().padStart(2, '0'); }

// ─────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────
(async function init() {
  await load();
  // Show active workout indicator on nav
  if (S.active) {
    const b = document.getElementById('b-workout');
    if (b) {
      b.style.position = 'relative';
      const dot = document.createElement('span');
      dot.style.cssText = 'position:absolute;top:8px;right:calc(50% - 14px);width:8px;height:8px;border-radius:50%;background:#ef4444';
      b.appendChild(dot);
    }
  }
  nav('home');
})();
