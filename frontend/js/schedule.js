/* ══════════════════════════════════════════════════════════
   FOE Exam Planner — Schedule Page
   ══════════════════════════════════════════════════════════ */

'use strict';

// ── Program config (display order + full names) ───────────
const PROGRAM_CONFIG = [
  { id: 'BSAE',    label: 'BSc in Aeronautical Engineering' },
  { id: 'AB/BENG', label: 'Applied Bachelor & BEng (AE/AV/ME)' },
  { id: 'ABAME',   label: 'Applied Bachelor in AME' },
  { id: 'EDAE',    label: 'Engineering Diploma in Aeronautical Engineering' }
];

// ── State ─────────────────────────────────────────────────
let allExams      = [];
let allClassrooms = [];

// ── DOM Refs ──────────────────────────────────────────────
const scheduleGrid    = document.getElementById('scheduleGrid');
const filterExamType  = document.getElementById('filterExamType');
const filterSemester  = document.getElementById('filterSemester');
const scheduleCount   = document.getElementById('scheduleCount');
const printHeaderSub  = document.getElementById('printHeaderSub');

// ── Helpers ───────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
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
  const h12 = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function getVenueNames(exam) {
  const ids = exam.venueIds && exam.venueIds.length > 0
    ? exam.venueIds
    : (exam.venueId ? [exam.venueId] : []);
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

// ── Build one program table ───────────────────────────────
function buildProgramTable(title, exams) {
  // Group by date, sort each date group by start time
  const byDate = {};
  exams.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });

  const sortedDates = Object.keys(byDate).sort();
  let rowsHtml = '';

  sortedDates.forEach((date, dateIdx) => {
    const group = byDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const bandClass = `band-${dateIdx % 4}`;

    group.forEach((exam, i) => {
      const venues = escHtml(getVenueNames(exam));
      rowsHtml += `
        <tr class="${bandClass}">
          ${i === 0
            ? `<td class="date-cell" rowspan="${group.length}">${escHtml(formatDate(date))}</td>
               <td class="day-cell"  rowspan="${group.length}">${escHtml(getDayName(date))}</td>`
            : ''}
          <td class="module-cell">
            <strong>${escHtml(exam.moduleCode)}</strong>
            ${exam.moduleCode !== exam.moduleName ? ` &mdash; ${escHtml(exam.moduleName)}` : ''}
          </td>
          <td>${escHtml(exam.instructorName)}</td>
          <td class="venue-cell">${venues}</td>
          <td class="timing-cell">${escHtml(formatTime(exam.startTime))} &ndash; ${escHtml(formatTime(exam.endTime))}</td>
        </tr>`;
    });
  });

  return `
    <div class="schedule-card">
      <div class="schedule-card-header">${escHtml(title)}</div>
      <div style="overflow-x:auto;">
        <table class="schedule-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Module</th>
              <th>Instructor</th>
              <th>Venue</th>
              <th>Timings</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// ── Render full schedule ──────────────────────────────────
function renderSchedule() {
  const examType = filterExamType.value;
  const semester = filterSemester.value;

  // Filter
  const filtered = allExams.filter(e => {
    if (examType && e.examName !== examType) return false;
    if (semester && e.semester !== semester) return false;
    return true;
  });

  // Update print subtitle
  const typeLabel    = examType  ? examType  : 'All Exam Types';
  const semLabel     = semester  ? semester  : 'All Semesters';
  printHeaderSub.textContent = `${semLabel} — ${typeLabel} Schedule`;

  // Build title suffix
  const typeSuffix = examType ? `${examType} ` : '';
  const semSuffix  = semester ? `${semester} ` : '';

  // Group by program
  const byProgram = {};
  filtered.forEach(e => {
    const prog = e.program || 'Unknown';
    if (!byProgram[prog]) byProgram[prog] = [];
    byProgram[prog].push(e);
  });

  scheduleCount.textContent = `${filtered.length} exam${filtered.length !== 1 ? 's' : ''} shown`;

  if (filtered.length === 0) {
    scheduleGrid.innerHTML = `
      <div class="schedule-empty" style="width:100%;">
        <div class="schedule-empty-icon">📭</div>
        <p>No exams match the selected filters.</p>
      </div>`;
    return;
  }

  let html = '';

  // Render in defined program order first
  PROGRAM_CONFIG.forEach(prog => {
    const progExams = byProgram[prog.id];
    if (!progExams || progExams.length === 0) return;
    const title = `${prog.label} ${semSuffix}${typeSuffix}Exam Schedule`;
    html += buildProgramTable(title, progExams);
  });

  // Any programs not in the predefined list
  Object.keys(byProgram).forEach(pid => {
    if (!PROGRAM_CONFIG.find(p => p.id === pid)) {
      const title = `${pid} ${semSuffix}${typeSuffix}Exam Schedule`;
      html += buildProgramTable(title, byProgram[pid]);
    }
  });

  scheduleGrid.innerHTML = html;
}

// ── Populate semester filter from data ────────────────────
function populateSemesterFilter() {
  const semesters = [...new Set(allExams.map(e => e.semester).filter(Boolean))].sort();
  semesters.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    filterSemester.appendChild(opt);
  });
  // Auto-select if only one semester
  if (semesters.length === 1) filterSemester.value = semesters[0];
}

// ── Init ──────────────────────────────────────────────────
(async () => {
  try {
    const [examsRes, classroomsRes] = await Promise.all([
      fetch('/api/exams'),
      fetch('/api/classrooms')
    ]);
    allExams      = await examsRes.json();
    allClassrooms = await classroomsRes.json();

    populateSemesterFilter();
    renderSchedule();
  } catch (err) {
    scheduleGrid.innerHTML = `
      <div class="schedule-empty" style="width:100%;">
        <div class="schedule-empty-icon">⚠️</div>
        <p>Failed to load schedule: ${err.message}</p>
      </div>`;
  }
})();

filterExamType.addEventListener('change', renderSchedule);
filterSemester.addEventListener('change', renderSchedule);
