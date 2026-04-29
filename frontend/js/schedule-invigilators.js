/* ══════════════════════════════════════════════════════════
   FOE Exam Planner — Schedule (with Invigilators) Page
   All data via storage.js (localStorage + file sync)
   ══════════════════════════════════════════════════════════ */

'use strict';

const PROGRAM_CONFIG = [
  { id: 'BSAE',    label: 'BSc in Aeronautical Engineering' },
  { id: 'AB/BENG', label: 'Applied Bachelor & BEng (AE/AV/ME)' },
  { id: 'ABAME',   label: 'Applied Bachelor in AME' },
  { id: 'EDAE',    label: 'Extended Diploma in Aeronautical Engineering' }
];

let allExams      = [];
let allClassrooms = [];

const scheduleGrid   = document.getElementById('scheduleGrid');
const filterExamType = document.getElementById('filterExamType');
const filterSemester = document.getElementById('filterSemester');
const scheduleCount  = document.getElementById('scheduleCount');
const printHeaderSub = document.getElementById('printHeaderSub');

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

const PROGRAM_CARD_CLASS = {
  'BSAE':    'prog-bsae',
  'AB/BENG': 'prog-abbeng',
  'ABAME':   'prog-abame',
  'EDAE':    'prog-edae'
};

function buildProgramTable(title, exams, programId) {
  const byDate = {};
  exams.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  });

  const sortedDates = Object.keys(byDate).sort();
  let rowsHtml = '';

  sortedDates.forEach((date, dateIdx) => {
    const group     = byDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const bandClass = `band-${dateIdx % 4}`;

    group.forEach((exam, i) => {
      const venues      = escHtml(getVenueNames(exam));
      const invigilator = escHtml(exam.invigilatorName || '—');
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
          <td class="venue-cell">${venues}</td>
          <td class="timing-cell">${escHtml(formatTime(exam.startTime))} &ndash; ${escHtml(formatTime(exam.endTime))}</td>
          <td class="invigilator-cell">${invigilator}</td>
          <td>${escHtml(exam.instructorName)}</td>
        </tr>`;
    });
  });

  const progClass = PROGRAM_CARD_CLASS[programId] || '';

  return `
    <div class="schedule-card ${progClass}">
      <div class="schedule-card-header">${escHtml(title)}</div>
      <div style="overflow-x:auto;">
        <table class="schedule-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Module</th>
              <th>Venue</th>
              <th>Timings</th>
              <th>Invigilator</th>
              <th>Instructor</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

function renderSchedule() {
  const examType = filterExamType.value;
  const semester = filterSemester.value;

  const filtered = allExams.filter(e => {
    if (examType && e.examName !== examType) return false;
    if (semester && e.semester !== semester) return false;
    return true;
  });

  const typeLabel = examType ? examType : 'All Exam Types';
  const semLabel  = semester ? semester : 'All Semesters';
  printHeaderSub.textContent = `${semLabel} — ${typeLabel} Schedule (with Invigilators)`;

  const typeSuffix = examType ? `${examType} ` : '';
  const semSuffix  = semester ? `${semester} ` : '';

  const byProgram = {};
  filtered.forEach(e => {
    const progs = (Array.isArray(e.programs) && e.programs.length ? e.programs : (e.program ? [e.program] : ['Unknown']));
    progs.forEach(prog => {
      if (!byProgram[prog]) byProgram[prog] = [];
      byProgram[prog].push(e);
    });
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
  PROGRAM_CONFIG.forEach(prog => {
    const progExams = byProgram[prog.id];
    if (!progExams || progExams.length === 0) return;
    const title = `${prog.label} ${semSuffix}${typeSuffix}Exam Schedule`;
    html += buildProgramTable(title, progExams, prog.id);
  });
  Object.keys(byProgram).forEach(pid => {
    if (!PROGRAM_CONFIG.find(p => p.id === pid)) {
      html += buildProgramTable(`${pid} ${semSuffix}${typeSuffix}Exam Schedule`, byProgram[pid], pid);
    }
  });

  scheduleGrid.innerHTML = html;
}

function populateSemesterFilter() {
  const semesters = [...new Set(allExams.map(e => e.semester).filter(Boolean))].sort();
  semesters.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    filterSemester.appendChild(opt);
  });
  if (semesters.length === 1) filterSemester.value = semesters[0];
}

// ── Init ──────────────────────────────────────────────────
(function init() {
  setupFileUI(
    document.getElementById('fileStatusDot'),
    document.getElementById('fileStatusText'),
    document.getElementById('connectFileBtn'),
    document.getElementById('exportFileBtn')
  );

  window.addEventListener('examsUpdated', () => {
    allExams = getExams();
    const curSem = filterSemester.value;
    filterSemester.innerHTML = '<option value="">All Semesters</option>';
    populateSemesterFilter();
    filterSemester.value = curSem;
    renderSchedule();
  });

  allClassrooms = getClassrooms();
  allExams      = getExams();
  populateSemesterFilter();
  renderSchedule();
})();

filterExamType.addEventListener('change', renderSchedule);
filterSemester.addEventListener('change', renderSchedule);
