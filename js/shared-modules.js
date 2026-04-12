/* ══════════════════════════════════════════════════════════
   FOE Exam Planner — Shared Modules Page
   Shows modules shared across programs (Math, MA/GEN/FDN codes, Programming)
   All data via storage.js (localStorage + file sync)
   ══════════════════════════════════════════════════════════ */

'use strict';

let allExams      = [];
let allClassrooms = [];

const tableBody   = document.getElementById('sharedTableBody');
const emptyState  = document.getElementById('sharedEmpty');
const moduleCount = document.getElementById('moduleCount');

/* ── Filtering logic ─────────────────────────────────────── */
function isSharedModule(exam) {
  const name = (exam.moduleName || '').toLowerCase();
  const code = (exam.moduleCode || '').trim().toUpperCase();

  // 1. Module name contains "Math"
  if (name.includes('math')) return true;

  // 2. Module code starts with MA, GEN, or FDN
  if (/^(MA|GEN|FDN)/.test(code)) return true;

  // 3. Module name contains "Programming"
  if (name.includes('programming')) return true;

  return false;
}

/* ── Formatting helpers ──────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function getDayName(dateStr) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date(dateStr).getDay()];
}

function formatTime(t) {
  if (!t) return '';
  const [h, min] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function getVenueNames(exam) {
  const ids = exam.venueIds && exam.venueIds.length > 0
    ? exam.venueIds : (exam.venueId ? [exam.venueId] : []);
  return ids.map(id => {
    const room = allClassrooms.find(c => c.id === id);
    return room ? room.name : id;
  }).join(', ') || '—';
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ── Render ──────────────────────────────────────────────── */
function renderTable() {
  const shared = allExams
    .filter(isSharedModule)
    .sort((a, b) => {
      // Sort by date, then by start time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

  moduleCount.textContent = `${shared.length} module${shared.length !== 1 ? 's' : ''} shown`;

  if (shared.length === 0) {
    tableBody.innerHTML = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  // Group rows by date for band colouring
  const dates     = [...new Set(shared.map(e => e.date))];
  let rowsHtml    = '';

  shared.forEach(exam => {
    const dateIdx  = dates.indexOf(exam.date);
    const bandClass = `band-${dateIdx % 4}`;
    const venues    = escHtml(getVenueNames(exam));
    const timing    = `${escHtml(formatTime(exam.startTime))} &ndash; ${escHtml(formatTime(exam.endTime))}`;
    const module    = exam.moduleCode !== exam.moduleName
      ? `<strong>${escHtml(exam.moduleCode)}</strong> &mdash; ${escHtml(exam.moduleName)}`
      : `<strong>${escHtml(exam.moduleCode)}</strong>`;

    rowsHtml += `
      <tr class="${bandClass}">
        <td class="date-cell">${escHtml(formatDate(exam.date))}</td>
        <td class="day-cell">${escHtml(getDayName(exam.date))}</td>
        <td class="module-cell">${module}</td>
        <td class="venue-cell">${venues}</td>
        <td class="timing-cell">${timing}</td>
        <td class="instructor-cell">${escHtml(exam.instructorName || '—')}</td>
      </tr>`;
  });

  tableBody.innerHTML = rowsHtml;
}

/* ── PDF Download ────────────────────────────────────────── */
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  const tableHtml = document.querySelector('.shared-card').outerHTML;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Shared Modules Schedule</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 9pt; color: #1a3a5c; }

    .print-header { text-align: center; margin-bottom: 8mm; }
    .print-header-title { font-size: 13pt; font-weight: 800; color: #1a3a5c; }
    .print-header-sub { font-size: 9pt; color: #555; margin-top: 2mm; }

    .shared-card { border: 1px solid #aac4de; border-radius: 4px; overflow: hidden; }
    .shared-card-header {
      background: #1a3a5c !important; color: #fff !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      font-size: 10pt; font-weight: 700; padding: 6px 10px;
    }
    .shared-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    .shared-table th {
      background: #2c5f8a !important; color: #fff !important;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      font-size: 8pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; padding: 5px 7px;
      border: 1px solid #1a4a72; text-align: left;
    }
    .shared-table td { padding: 5px 7px; border: 1px solid #dce8f4; vertical-align: middle; }
    .band-0 { background: #eef4fb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .band-1 { background: #fff !important; }
    .band-2 { background: #fdf6ec !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .band-3 { background: #f2fbf4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .date-cell { font-weight: 700; white-space: nowrap; }
    .day-cell  { font-size: 8pt; color: #555; white-space: nowrap; }
    .venue-cell { font-weight: 600; }
    .timing-cell { white-space: nowrap; font-size: 8pt; }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="print-header-title">Emirates Aviation University — Faculty of Engineering</div>
    <div class="print-header-sub">Shared Modules Schedule &nbsp;|&nbsp; ${dateStr}</div>
  </div>
  ${tableHtml}
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };<\/script>
</body>
</html>`);
  win.document.close();
});

/* ── Init ────────────────────────────────────────────────── */
(function init() {
  setupFileUI(
    document.getElementById('fileStatusDot'),
    document.getElementById('fileStatusText'),
    document.getElementById('connectFileBtn'),
    document.getElementById('exportFileBtn')
  );

  window.addEventListener('examsUpdated', () => {
    allExams = getExams();
    renderTable();
  });

  allClassrooms = getClassrooms();
  allExams      = getExams();
  renderTable();
})();
