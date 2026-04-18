/* ══════════════════════════════════════════════════════════
   Presentation Schedule — presentation-schedule.js
   CRUD + conflict detection for project presentations.
   Data via storage.js (localStorage key: eau_presentations_v1)
   ══════════════════════════════════════════════════════════ */

'use strict';

// ── State ─────────────────────────────────────────────────
let allPresentations    = [];
let currentEditId       = null;
let currentDeleteId     = null;

// ── Timing helpers ────────────────────────────────────────

/** Parse "HH:MM - HH:MM" → { start, end } in total minutes, or null on failure. */
function parseTimingMinutes(timing) {
  const m = (timing || '').trim().match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
  if (!m) return null;
  const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const end   = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
  return (end > start) ? { start, end } : null;
}

/** Validate a timing string: must be "HH:MM - HH:MM" with end > start. */
function isValidTiming(timing) {
  return parseTimingMinutes(timing) !== null;
}

/**
 * Normalize a timing string to canonical "HH:MM - HH:MM" form.
 * Pads single-digit hours and collapses whitespace around the dash.
 * Returns the trimmed raw value unchanged if it doesn't match the pattern.
 */
function normalizeTiming(raw) {
  const m = (raw || '').trim().match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
  if (!m) return (raw || '').trim();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(m[1])}:${m[2]} - ${pad(m[3])}:${m[4]}`;
}

/**
 * Detect conflicts: two presentations for the same instructor on the same date
 * whose time intervals overlap (strict — touching endpoints are allowed).
 * Returns a Set of presentation IDs that are involved in at least one conflict.
 * O(G × n²) where G = number of instructor+date groups (typically small).
 */
function detectConflicts(presentations) {
  const conflictIds = new Set();

  // Group by instructor + date
  const groups = new Map();
  for (const p of presentations) {
    const key = `${p.instructor}||${p.date}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Parse timings once per group entry
    const parsed = group.map(p => ({ p, t: parseTimingMinutes(p.timing) }));

    for (let i = 0; i < parsed.length; i++) {
      if (!parsed[i].t) continue;
      for (let j = i + 1; j < parsed.length; j++) {
        if (!parsed[j].t) continue;
        const a = parsed[i].t, b = parsed[j].t;
        // Overlap when intervals interleave (touching at one point is NOT a conflict)
        if (a.start < b.end && b.start < a.end) {
          conflictIds.add(parsed[i].p.id);
          conflictIds.add(parsed[j].p.id);
        }
      }
    }
  }
  return conflictIds;
}

// ── Format helpers ────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className  = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s';
    toast.style.opacity    = '0';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── DOM refs ──────────────────────────────────────────────
const presForm        = document.getElementById('presForm');
const openAddBtn      = document.getElementById('openAddBtn');
const addModal        = document.getElementById('addModal');
const addModalTitle   = document.getElementById('addModalTitle');
const submitBtn       = document.getElementById('submitBtn');
const cancelBtn       = document.getElementById('cancelBtn');
const closeModalBtn   = document.getElementById('closeModalBtn');

const deleteModal     = document.getElementById('deleteModal');
const closeDeleteBtn  = document.getElementById('closeDeleteModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn= document.getElementById('confirmDeleteBtn');
const deleteLabel     = document.getElementById('deleteLabel');

const dashboardEl     = document.getElementById('dashboard');
const conflictBanner  = document.getElementById('conflictBanner');
const presCountBadge  = document.getElementById('presCount');

// ── Modal helpers ─────────────────────────────────────────
function openAdd() {
  currentEditId = null;
  presForm.reset();
  addModalTitle.textContent = '＋ New Presentation Entry';
  submitBtn.textContent     = '＋ Add Presentation';
  addModal.classList.remove('hidden');
  document.getElementById('fDate').focus();
}

function openEdit(id) {
  const p = allPresentations.find(x => x.id === id);
  if (!p) return;
  currentEditId = id;
  presForm.reset();
  addModalTitle.textContent           = '✏️ Edit Presentation';
  submitBtn.textContent               = '💾 Save Changes';
  document.getElementById('fDate').value        = p.date;
  document.getElementById('fModuleCode').value  = p.moduleCode;
  document.getElementById('fGroupNumber').value = p.groupNumber;
  document.getElementById('fInstructor').value  = p.instructor;
  document.getElementById('fTiming').value      = p.timing;
  document.getElementById('fJuryNames').value   = p.juryNames || '';
  addModal.classList.remove('hidden');
}

function closeAdd() {
  addModal.classList.add('hidden');
  presForm.reset();
  currentEditId = null;
}

function openDeleteModal(id, label) {
  currentDeleteId       = id;
  deleteLabel.textContent = label;
  deleteModal.classList.remove('hidden');
}

function closeDelete() {
  deleteModal.classList.add('hidden');
  currentDeleteId = null;
}

// ── Form submit (create / update) ─────────────────────────
submitBtn.addEventListener('click', () => {
  const date        = document.getElementById('fDate').value.trim();
  const moduleCode  = document.getElementById('fModuleCode').value.trim();
  const groupNumber = document.getElementById('fGroupNumber').value.trim();
  const instructor  = document.getElementById('fInstructor').value.trim();
  const timing      = normalizeTiming(document.getElementById('fTiming').value);
  const juryNames   = document.getElementById('fJuryNames').value.trim();

  if (!date)       { showToast('Date is required.', 'warning'); return; }
  if (!moduleCode) { showToast('Module code is required.', 'warning'); return; }
  if (!groupNumber){ showToast('Group number is required.', 'warning'); return; }
  if (!instructor) { showToast('Instructor name is required.', 'warning'); return; }
  if (!timing)     { showToast('Timing is required.', 'warning'); return; }

  if (!isValidTiming(timing)) {
    showToast('Timing must be in "HH:MM - HH:MM" format with end after start (e.g. 09:00 - 10:30).', 'warning');
    document.getElementById('fTiming').focus();
    return;
  }

  const payload = { date, moduleCode, groupNumber, instructor, timing, juryNames };

  const isEdit = !!currentEditId;
  submitBtn.disabled   = true;
  submitBtn.innerHTML  = `<span class="spinner"></span> ${isEdit ? 'Saving…' : 'Adding…'}`;

  try {
    if (isEdit) {
      const updated = updatePresentation(currentEditId, payload);
      if (!updated) throw new Error('Presentation not found');
      const idx = allPresentations.findIndex(p => p.id === currentEditId);
      if (idx !== -1) allPresentations[idx] = updated;
      showToast(`✓ Updated: ${updated.moduleCode} — Group ${updated.groupNumber}`, 'success');
    } else {
      const created = createPresentation(payload);
      allPresentations.push(created);
      showToast(`✓ Added: ${created.moduleCode} — Group ${created.groupNumber}`, 'success');
    }
    renderDashboard();
    closeAdd();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    submitBtn.disabled  = false;
    submitBtn.innerHTML = isEdit ? '💾 Save Changes' : '＋ Add Presentation';
  }
});

// ── Delete ────────────────────────────────────────────────
confirmDeleteBtn.addEventListener('click', () => {
  if (!currentDeleteId) return;
  confirmDeleteBtn.disabled   = true;
  confirmDeleteBtn.innerHTML  = '<span class="spinner"></span> Deleting…';

  try {
    const ok = deletePresentation(currentDeleteId);
    if (!ok) throw new Error('Not found');
    allPresentations = allPresentations.filter(p => p.id !== currentDeleteId);
    renderDashboard();
    showToast('Presentation deleted.', 'success');
    closeDelete();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled  = false;
    confirmDeleteBtn.innerHTML = 'Delete';
  }
});

// ── Event wiring ──────────────────────────────────────────
openAddBtn.addEventListener('click', openAdd);
cancelBtn.addEventListener('click', closeAdd);
closeModalBtn.addEventListener('click', closeAdd);
addModal.addEventListener('click', e => { if (e.target === addModal) closeAdd(); });

closeDeleteBtn.addEventListener('click', closeDelete);
cancelDeleteBtn.addEventListener('click', closeDelete);
deleteModal.addEventListener('click', e => { if (e.target === deleteModal) closeDelete(); });

// Expose to inline onclick handlers
window.openEdit         = openEdit;
window.openDeleteModal  = openDeleteModal;

// ── Dashboard render ──────────────────────────────────────
function renderDashboard() {
  const pres = allPresentations;
  presCountBadge.textContent = pres.length;

  if (pres.length === 0) {
    conflictBanner.style.display = 'none';
    dashboardEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎓</div>
        <h3>No presentations yet</h3>
        <p>Click <strong>+ Add Presentation</strong> to get started.</p>
      </div>`;
    return;
  }

  // Detect conflicts before building HTML
  const conflictIds = detectConflicts(pres);
  if (conflictIds.size > 0) {
    conflictBanner.style.display = '';
    conflictBanner.textContent   =
      `⚠️ Conflict detected: ${conflictIds.size} presentation${conflictIds.size !== 1 ? 's' : ''} overlap in timing for the same instructor. Affected rows are highlighted below.`;
  } else {
    conflictBanner.style.display = 'none';
  }

  // Group by instructor (flat list — date+time sort applied below)
  const byInstructor = new Map();
  for (const p of pres) {
    if (!byInstructor.has(p.instructor)) byInstructor.set(p.instructor, []);
    byInstructor.get(p.instructor).push(p);
  }

  // Sort instructors alphabetically
  const instructorsSorted = [...byInstructor.keys()].sort((a, b) => a.localeCompare(b));

  let html = '';
  for (const instructor of instructorsSorted) {
    const entries = byInstructor.get(instructor);

    // Sort chronologically: date ASC, then timing start ASC
    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const ta = parseTimingMinutes(a.timing);
      const tb = parseTimingMinutes(b.timing);
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return ta.start - tb.start;
    });

    html += `
      <div class="instructor-block">
        <div class="instructor-heading">
          <span class="instructor-icon">👤</span>
          ${escHtml(instructor)}
        </div>
        <div style="overflow-x:auto;">
          <table class="pres-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Time</th>
                <th>Module &amp; Group</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>`;

    for (const p of entries) {
      const rowClass    = conflictIds.has(p.id) ? 'row-conflict' : '';
      const conflictTag = conflictIds.has(p.id)
        ? '<span class="pill pill-red" style="margin-left:6px;font-size:10px;">CONFLICT</span>'
        : '';
      html += `
              <tr class="${rowClass}">
                <td class="timing-cell">${escHtml(formatDate(p.date))}</td>
                <td>${escHtml(p.day || '—')}</td>
                <td class="timing-cell">${escHtml(p.timing)}${conflictTag}</td>
                <td><strong>${escHtml(p.moduleCode)}</strong> — Group ${escHtml(p.groupNumber)}</td>
                <td>
                  <div class="actions-cell">
                    <button class="btn btn-sm btn-ghost" onclick="openEdit('${p.id}')">✏️ Edit</button>
                    <button class="btn btn-sm btn-red"   onclick="openDeleteModal('${p.id}', '${escHtml(p.moduleCode)} — Group ${escHtml(p.groupNumber)}')">🗑️</button>
                  </div>
                </td>
              </tr>`;
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>`;
  }

  dashboardEl.innerHTML = html;
}

// ── Print view ────────────────────────────────────────────

/**
 * Generate an instructor-grouped schedule into #printView and trigger window.print().
 * Sorted: instructor ASC → date ASC → timing ASC.
 */
function printView() {
  if (allPresentations.length === 0) {
    alert('No presentations to print.');
    return;
  }

  // Group by instructor
  const byInstructor = new Map();
  for (const p of allPresentations) {
    if (!byInstructor.has(p.instructor)) byInstructor.set(p.instructor, []);
    byInstructor.get(p.instructor).push(p);
  }

  const instructorsSorted = [...byInstructor.keys()].sort((a, b) => a.localeCompare(b));

  let html = '';
  let first = true;
  for (const instructor of instructorsSorted) {
    const entries = byInstructor.get(instructor);
    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.timing || '').localeCompare(b.timing || '');
    });

    html += `
      <div class="${first ? '' : 'print-page-break'}">
        <h2>${escHtml(instructor)}</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Day</th><th>Time</th><th>Module &amp; Group</th></tr>
          </thead>
          <tbody>`;
    for (const p of entries) {
      html += `
            <tr>
              <td class="timing-cell">${escHtml(formatDate(p.date))}</td>
              <td>${escHtml(p.day || '—')}</td>
              <td class="timing-cell">${escHtml(p.timing || '—')}</td>
              <td>${escHtml(p.moduleCode)} — Group ${escHtml(p.groupNumber)}</td>
            </tr>`;
    }
    html += `
          </tbody>
        </table>
      </div>`;
    first = false;
  }

  document.getElementById('printView').innerHTML = html;
  window.print();
}

window.printView = printView;

// ── Init ──────────────────────────────────────────────────
(function init() {
  setupFileUI(
    document.getElementById('fileStatusDot'),
    document.getElementById('fileStatusText'),
    document.getElementById('connectFileBtn'),
    document.getElementById('exportFileBtn')
  );

  allPresentations = getPresentations();
  renderDashboard();

  window.addEventListener('presentationsUpdated', () => {
    allPresentations = getPresentations();
    renderDashboard();
  });
})();
