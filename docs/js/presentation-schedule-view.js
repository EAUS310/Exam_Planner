/* ══════════════════════════════════════════════════════════
   Presentation Schedule — Date-grouped read-only view
   Sorted: date ASC, timing ASC.
   Data via storage.js (localStorage key: eau_presentations_v1)
   ══════════════════════════════════════════════════════════ */

'use strict';

let allPresentations = [];

const scheduleList   = document.getElementById('scheduleList');
const filterModule   = document.getElementById('filterModule');
const scheduleCount  = document.getElementById('scheduleCount');
const printHeaderSub = document.getElementById('printHeaderSub');

// ── Helpers ───────────────────────────────────────────────

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/** Format YYYY-MM-DD → "Monday, 14 April 2026" */
function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${days[new Date(y, m - 1, d).getDay()]}, ${d} ${months[m - 1]} ${y}`;
}

// ── Render ────────────────────────────────────────────────

function renderView() {
  const moduleFilter = filterModule.value;

  const filtered = moduleFilter
    ? allPresentations.filter(p => p.moduleCode === moduleFilter)
    : allPresentations;

  printHeaderSub.textContent = `Presentation Schedule — ${moduleFilter || 'All Modules'}`;
  scheduleCount.textContent  =
    `${filtered.length} presentation${filtered.length !== 1 ? 's' : ''} shown`;

  if (filtered.length === 0) {
    scheduleList.innerHTML = `
      <div class="pv-empty">
        <div class="pv-empty-icon">🎓</div>
        <p>No presentations match the selected filter.</p>
      </div>`;
    return;
  }

  // Sort: date ASC, then timing ASC (lexicographic — works for HH:MM - HH:MM)
  const sorted = [...filtered].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.timing || '').localeCompare(b.timing || '');
  });

  // Group by date (insertion order preserves sort)
  const byDate = new Map();
  for (const p of sorted) {
    if (!byDate.has(p.date)) byDate.set(p.date, []);
    byDate.get(p.date).push(p);
  }

  let html = '';
  for (const [date, entries] of byDate) {
    html += `
      <section class="pv-day-section">
        <h2 class="pv-day-heading">${escHtml(formatDateLong(date))}</h2>
        <div class="pv-table-wrap">
          <table class="pv-table">
            <thead>
              <tr>
                <th class="col-time">Time</th>
                <th class="col-module">Module &amp; Group</th>
                <th class="col-instructor">Instructor</th>
              </tr>
            </thead>
            <tbody>`;

    for (const p of entries) {
      html += `
              <tr>
                <td class="timing-cell">${escHtml(p.timing || '—')}</td>
                <td>${escHtml(p.moduleCode)} — Group ${escHtml(p.groupNumber)}</td>
                <td>${escHtml(p.instructor || '—')}</td>
              </tr>`;
    }

    html += `
            </tbody>
          </table>
        </div>
      </section>`;
  }

  scheduleList.innerHTML = html;
}

// ── Populate module filter ────────────────────────────────

function populateModuleFilter() {
  const modules = [...new Set(
    allPresentations.map(p => p.moduleCode).filter(Boolean)
  )].sort();
  filterModule.innerHTML = '<option value="">All Modules</option>';
  for (const mc of modules) {
    const opt = document.createElement('option');
    opt.value       = mc;
    opt.textContent = mc;
    filterModule.appendChild(opt);
  }
  if (modules.length === 1) filterModule.value = modules[0];
}

// ── Init ──────────────────────────────────────────────────

(function init() {
  setupFileUI(
    document.getElementById('fileStatusDot'),
    document.getElementById('fileStatusText'),
    document.getElementById('connectFileBtn'),
    document.getElementById('exportFileBtn')
  );

  allPresentations = getPresentations();
  populateModuleFilter();
  renderView();

  // Auto-print when opened via the "Print to PDF" button (?print param)
  if (new URLSearchParams(location.search).has('print')) {
    window.print();
  }

  window.addEventListener('presentationsUpdated', () => {
    allPresentations = getPresentations();
    const cur = filterModule.value;
    populateModuleFilter();
    filterModule.value = cur;
    renderView();
  });
})();

filterModule.addEventListener('change', renderView);
