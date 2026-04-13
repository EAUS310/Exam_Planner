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

/* ── Merge duplicate module entries ──────────────────────── */
function mergeSharedModules(exams) {
  const map = new Map();

  exams.forEach(exam => {
    // Group key: same module code + same date + same time slot
    const key = `${(exam.moduleCode || '').trim().toUpperCase()}|${exam.date}|${exam.startTime}|${exam.endTime}`;

    if (!map.has(key)) {
      map.set(key, {
        moduleCode:    exam.moduleCode,
        moduleName:    exam.moduleName,
        date:          exam.date,
        startTime:     exam.startTime,
        endTime:       exam.endTime,
        venueIdSet:    new Set(),
        instructorSet: new Set(),
      });
    }

    const entry = map.get(key);

    // Collect all venue IDs
    const ids = exam.venueIds && exam.venueIds.length > 0
      ? exam.venueIds : (exam.venueId ? [exam.venueId] : []);
    ids.forEach(id => entry.venueIdSet.add(id));

    // Collect all instructor names
    if (exam.instructorName && exam.instructorName.trim()) {
      entry.instructorSet.add(exam.instructorName.trim());
    }
  });

  return [...map.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.startTime || '').localeCompare(b.startTime || '');
  });
}

/* ── Render ──────────────────────────────────────────────── */
function renderTable() {
  const shared = allExams.filter(isSharedModule);
  const merged = mergeSharedModules(shared);

  moduleCount.textContent = `${merged.length} module${merged.length !== 1 ? 's' : ''} shown`;

  if (merged.length === 0) {
    tableBody.innerHTML = '';
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  // Group rows by date for band colouring
  const dates  = [...new Set(merged.map(e => e.date))];
  let rowsHtml = '';

  merged.forEach(entry => {
    const dateIdx   = dates.indexOf(entry.date);
    const bandClass = `band-${dateIdx % 4}`;

    // Resolve venue names from the merged set
    const venues = [...entry.venueIdSet].map(id => {
      const room = allClassrooms.find(c => c.id === id);
      return room ? room.name : id;
    }).join(', ') || '—';

    const instructors = [...entry.instructorSet].join(', ') || '—';
    const timing      = `${escHtml(formatTime(entry.startTime))} &ndash; ${escHtml(formatTime(entry.endTime))}`;
    const module      = entry.moduleCode !== entry.moduleName
      ? `<strong>${escHtml(entry.moduleCode)}</strong> &mdash; ${escHtml(entry.moduleName)}`
      : `<strong>${escHtml(entry.moduleCode)}</strong>`;

    rowsHtml += `
      <tr class="${bandClass}">
        <td class="date-cell">${escHtml(formatDate(entry.date))}</td>
        <td class="day-cell">${escHtml(getDayName(entry.date))}</td>
        <td class="module-cell">${module}</td>
        <td class="venue-cell">${escHtml(venues)}</td>
        <td class="timing-cell">${timing}</td>
        <td class="instructor-cell">${escHtml(instructors)}</td>
      </tr>`;
  });

  tableBody.innerHTML = rowsHtml;
}

/* ── Excel (CSV) Download ────────────────────────────────── */
document.getElementById('downloadPdfBtn').addEventListener('click', () => {
  const shared = allExams.filter(isSharedModule);
  const merged = mergeSharedModules(shared);

  const csvEscape = val => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const headers = ['Date', 'Day', 'Module Code', 'Module Name', 'Venue', 'Start Time', 'End Time', 'Instructor'];
  const rows = merged.map(entry => {
    const venues = [...entry.venueIdSet].map(id => {
      const room = allClassrooms.find(c => c.id === id);
      return room ? room.name : id;
    }).join('; ');
    const instructors = [...entry.instructorSet].join('; ');
    return [
      formatDate(entry.date),
      getDayName(entry.date),
      entry.moduleCode || '',
      entry.moduleName || '',
      venues || '',
      formatTime(entry.startTime),
      formatTime(entry.endTime),
      instructors || '',
    ].map(csvEscape).join(',');
  });

  const csvContent = [headers.map(csvEscape).join(','), ...rows].join('\r\n');
  const bom = '\uFEFF'; // UTF-8 BOM so Excel opens with correct encoding
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'Shared_Modules_Schedule.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
