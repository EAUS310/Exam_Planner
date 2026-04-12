/* ══════════════════════════════════════════════════════════
   FOE Exam Planner — Shared Venues Page
   Summarises shared-venue usage: one row per (date × time slot),
   listing all shared venues used in that slot.
   Shared venues: F101, G04/06, G08/10, Exam Hall 1, Exam Hall 2, any Lab.
   Columns: Date | Day | Time | Shared Venues
   ══════════════════════════════════════════════════════════ */

'use strict';

let allExams      = [];
let allClassrooms = [];

const tableBody  = document.getElementById('venuesTableBody');
const emptyState = document.getElementById('venuesEmpty');
const venueCount = document.getElementById('venueCount');

/* ── Shared-venue IDs (from storage.js _CLASSROOMS_RAW) ── */
const SHARED_VENUE_IDS = new Set([
  'F101',
  'G_04_06',
  'G_08_10',
  'Exam_Hall_1',
  'Exam_Hall_2'
]);

function isSharedVenueId(id) {
  if (SHARED_VENUE_IDS.has(id)) return true;
  // Any Lab
  const room = allClassrooms.find(c => c.id === id);
  if (room && room.name.toLowerCase().includes('lab')) return true;
  return false;
}

function getExamVenueIds(exam) {
  if (exam.venueIds && exam.venueIds.length > 0) return exam.venueIds;
  if (exam.venueId) return [exam.venueId];
  return [];
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

function getVenueName(id) {
  const room = allClassrooms.find(c => c.id === id);
  return room ? room.name : id;
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ── Build summarised row list ────────────────────────────
   One row per unique (date × startTime × endTime) slot.
   All shared venues used within that slot are collected into
   a sorted, deduplicated list and shown in one cell. */
function buildRows() {
  // Map key: "date|startTime|endTime"  →  Set of venue names
  const slotMap = new Map();

  allExams.forEach(exam => {
    const ids = getExamVenueIds(exam);
    const sharedIds = ids.filter(isSharedVenueId);
    if (sharedIds.length === 0) return;

    const key = `${exam.date || ''}|${exam.startTime || ''}|${exam.endTime || ''}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, {
        date:      exam.date      || '',
        day:       exam.date ? getDayName(exam.date) : '—',
        startTime: exam.startTime || '',
        endTime:   exam.endTime   || '',
        venues:    new Set()
      });
    }
    sharedIds.forEach(id => slotMap.get(key).venues.add(getVenueName(id)));
  });

  // Convert to array and sort by date asc, then start time asc
  const rows = [...slotMap.values()].map(s => ({
    ...s,
    venues: [...s.venues].sort()
  }));

  rows.sort((a, b) => {
    if (a.date !== b.date)           return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return rows;
}

/* ── Render ──────────────────────────────────────────────── */
function renderTable() {
  const rows = buildRows();

  venueCount.textContent = `${rows.length} time slot${rows.length !== 1 ? 's' : ''} shown`;

  if (rows.length === 0) {
    tableBody.innerHTML = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  const dates = [...new Set(rows.map(r => r.date))];
  let html = '';

  rows.forEach(row => {
    const dateIdx = dates.indexOf(row.date);
    const band    = `band-${dateIdx % 4}`;
    const time    = row.startTime
      ? `${escHtml(formatTime(row.startTime))} &ndash; ${escHtml(formatTime(row.endTime))}`
      : '—';
    const venueList = row.venues.map(v => `<span class="venue-tag">${escHtml(v)}</span>`).join('');

    html += `
      <tr class="${band}">
        <td class="date-cell">${escHtml(formatDate(row.date))}</td>
        <td class="day-cell">${escHtml(row.day)}</td>
        <td class="time-cell">${time}</td>
        <td class="venue-cell">${venueList}</td>
      </tr>`;
  });

  tableBody.innerHTML = html;
}

/* ── Excel Download ──────────────────────────────────────── */
document.getElementById('downloadExcelBtn').addEventListener('click', () => {
  const rows = buildRows();

  // Build worksheet data: header row + data rows
  const wsData = [
    ['Date', 'Day', 'Time', 'Shared Venues']
  ];

  rows.forEach(row => {
    const time = row.startTime
      ? `${formatTime(row.startTime)} – ${formatTime(row.endTime)}`
      : '—';
    wsData.push([
      formatDate(row.date),
      row.day,
      time,
      row.venues.join(', ')
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, // Date
    { wch: 12 }, // Day
    { wch: 22 }, // Time
    { wch: 40 }  // Shared Venues (wider — can list multiple)
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Shared Venues');

  const now     = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Shared_Venues_${dateStr}.xlsx`);
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
