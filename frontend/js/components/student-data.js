'use strict';

/* ══════════════════════════════════════════════════════════
   Student Data — look up all exam entries for a student ID
══════════════════════════════════════════════════════════ */

const classroomMap = new Map(getClassrooms().map(c => [c.id, c.name]));

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

function formatTime(t) {
  if (!t) return '—';
  const [h, min] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function venueName(venueId) {
  return classroomMap.get(venueId) || venueId || '—';
}

/* ── Core search ── */
function searchStudent(rawId) {
  const query = rawId.trim();
  if (!query) return;

  const exams    = getExams();
  const resultsArea = document.getElementById('resultsArea');
  const matches  = [];   // { exam, student }
  let studentName = '';

  for (const exam of exams) {
    for (const s of (exam.students || [])) {
      if (s.studentId.trim().toLowerCase() === query.toLowerCase()) {
        matches.push({ exam, student: s });
        if (!studentName && s.studentName) studentName = s.studentName;
      }
    }
  }

  if (matches.length === 0) {
    resultsArea.innerHTML = `
      <div class="state-box error">
        <div class="state-box-icon">❌</div>
        <h3>No results found</h3>
        <p>No exam entries found for Student ID <strong>${escHtml(query)}</strong>. Check the ID and try again.</p>
      </div>`;
    return;
  }

  // Sort matches by date ascending, then by start time
  matches.sort((a, b) => {
    const dA = a.exam.date || '', dB = b.exam.date || '';
    if (dA !== dB) return dA.localeCompare(dB);
    return (a.exam.startTime || '').localeCompare(b.exam.startTime || '');
  });

  const rowsHtml = matches.map(({ exam, student }) => {
    const venue = venueName(student.venueId || exam.venueId);
    const seat  = student.seatAssigned || '—';
    return `
      <tr>
        <td class="col-code">${escHtml(exam.moduleCode)}</td>
        <td>${escHtml(exam.moduleName)}</td>
        <td><span class="badge-exam-type">${escHtml(exam.examName)}</span></td>
        <td>${escHtml(exam.instructorName)}</td>
        <td class="col-date">${escHtml(formatDate(exam.date))}</td>
        <td class="col-time">${escHtml(formatTime(exam.startTime))} &ndash; ${escHtml(formatTime(exam.endTime))}</td>
        <td class="col-venue">${escHtml(venue)}</td>
        <td class="col-seat">${escHtml(seat)}</td>
      </tr>`;
  }).join('');

  resultsArea.innerHTML = `
    <div class="student-banner">
      <div class="student-banner-icon">👤</div>
      <div>
        <div class="student-banner-name">${escHtml(studentName || query)}</div>
        <div class="student-banner-id">ID: ${escHtml(query)}</div>
      </div>
      <div class="student-banner-count">${matches.length} exam${matches.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="results-card">
      <table class="results-table">
        <thead>
          <tr>
            <th>Module Code</th>
            <th>Module Name</th>
            <th>Exam Type</th>
            <th>Instructor</th>
            <th>Date</th>
            <th>Time</th>
            <th>Venue</th>
            <th>Seat</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

function clearSearch() {
  document.getElementById('studentIdInput').value = '';
  document.getElementById('resultsArea').innerHTML = `
    <div class="state-box" id="promptBox">
      <div class="state-box-icon">🔍</div>
      <h3>Look up a student</h3>
      <p>Enter a Student ID above and press <strong>Search</strong> (or hit Enter) to see all exam entries and seat allocations for that student.</p>
    </div>`;
  document.getElementById('studentIdInput').focus();
}

/* ── Event wiring ── */
document.addEventListener('DOMContentLoaded', () => {
  const input     = document.getElementById('studentIdInput');
  const searchBtn = document.getElementById('searchBtn');
  const clearBtn  = document.getElementById('clearBtn');

  searchBtn.addEventListener('click', () => searchStudent(input.value));
  clearBtn.addEventListener('click', clearSearch);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') searchStudent(input.value);
    if (e.key === 'Escape') clearSearch();
  });

  // Re-run last search if data updates (e.g. file sync)
  window.addEventListener('examsUpdated', () => {
    const currentId = input.value.trim();
    if (currentId) searchStudent(currentId);
  });

  // Wire sidebar file buttons
  setupFileUI(
    document.getElementById('fileStatusDot'),
    document.getElementById('fileStatusText'),
    document.getElementById('connectFileBtn'),
    document.getElementById('exportFileBtn')
  );

  input.focus();
});
