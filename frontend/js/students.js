/* ══════════════════════════════════════════════════════════
   Exam Planning Tool — Student Management (students.html)
   All data via storage.js (localStorage + file sync)
   ══════════════════════════════════════════════════════════ */

'use strict';

// ── State ─────────────────────────────────────────────────
let exam           = null;
let allExams       = [];
let allClassrooms  = [];
let parsedStudents = [];

// ── DOM Refs ──────────────────────────────────────────────
const examLoadingState  = document.getElementById('examLoadingState');
const examDetailsCard   = document.getElementById('examDetailsCard');
const examDetailsHeader = document.getElementById('examDetailsHeader');
const examInfoGrid      = document.getElementById('examInfoGrid');
const coExamsAlert      = document.getElementById('coExamsAlert');
const aiOptimizeSection = document.getElementById('aiOptimizeSection');
const aiCoExamsList     = document.getElementById('aiCoExamsList');
const aiOptimizeBtn     = document.getElementById('aiOptimizeBtn');
const aiResult          = document.getElementById('aiResult');

const studentPaste      = document.getElementById('studentPaste');
const parseBtn          = document.getElementById('parseBtn');
const clearPasteBtn     = document.getElementById('clearPasteBtn');

const previewCard       = document.getElementById('previewCard');
const previewCount      = document.getElementById('previewCount');
const previewTableBody  = document.getElementById('previewTableBody');
const saveStudentsBtn   = document.getElementById('saveStudentsBtn');
const cancelPreviewBtn  = document.getElementById('cancelPreviewBtn');

const studentCountBadge = document.getElementById('studentCount');
const studentListCont   = document.getElementById('studentListContainer');

// ── Toast ─────────────────────────────────────────────────
function showToast(message, type = 'default', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── Helpers ───────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m)-1]} ${y}`;
}

function formatTime(t) {
  if (!t) return '';
  const [h, min] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function getVenueName(venueId) {
  const room = allClassrooms.find(c => c.id === venueId);
  return room ? `${room.name} (${room.totalSeats} seats)` : venueId;
}

function getExamVenueIds(e) {
  return e.venueIds && e.venueIds.length > 0 ? e.venueIds : (e.venueId ? [e.venueId] : []);
}

function getVenueNames(e) {
  return getExamVenueIds(e).map(id => getVenueName(id)).join(', ') || '—';
}

function getTotalCapacity(e) {
  return getExamVenueIds(e).reduce((sum, id) => {
    const room = allClassrooms.find(c => c.id === id);
    return sum + (room ? room.totalSeats : 0);
  }, 0);
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ── URL Param ─────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const examId = params.get('examId');

if (!examId) {
  document.body.innerHTML = `
    <div style="text-align:center; padding:60px; font-family:sans-serif;">
      <h2>No exam specified</h2>
      <p>Please go back and select an exam.</p>
      <a href="index.html" style="color:#1a3a5c;">← Back to Exams</a>
    </div>`;
}

// ── Load Data ─────────────────────────────────────────────
function loadAll() {
  try {
    allClassrooms = getClassrooms();
    allExams      = getExams();
    exam          = allExams.find(e => e.id === examId) || null;

    if (!exam) {
      examLoadingState.querySelector('p').textContent = 'Error: Exam not found';
      showToast('Exam not found', 'error');
      return;
    }

    renderExamDetails();
    renderCoExamsInfo();
    renderStudentList();

    examLoadingState.style.display = 'none';
    examDetailsCard.style.display  = 'block';

  } catch (err) {
    examLoadingState.querySelector('p').textContent = 'Error: ' + err.message;
    showToast('Failed to load exam data: ' + err.message, 'error');
  }
}

function renderExamDetails() {
  examDetailsHeader.innerHTML = `
    📋 ${exam.moduleCode} — ${exam.moduleName}
    <span class="badge">${exam.examName}</span>
    <span class="badge">${exam.semester}</span>`;

  examInfoGrid.innerHTML = [
    { label: 'Module Code',  value: exam.moduleCode },
    { label: 'Module Name',  value: exam.moduleName },
    { label: 'Exam Type',    value: exam.examName },
    { label: 'Semester',     value: exam.semester },
    { label: 'Date',         value: formatDate(exam.date) },
    { label: 'Time',         value: `${formatTime(exam.startTime)} – ${formatTime(exam.endTime)}` },
    { label: 'Venue(s)',     value: getVenueNames(exam) },
    { label: 'Instructor',   value: exam.instructorName },
    { label: 'Invigilator',  value: exam.invigilatorName || '—' },
  ].map(({ label, value }) => `
    <div class="info-item">
      <span class="info-label">${label}</span>
      <span class="info-value">${escHtml(value)}</span>
    </div>`).join('');
}

function renderCoExamsInfo() {
  const myVenueIds = getExamVenueIds(exam);
  const coExams = allExams.filter(e =>
    e.id !== exam.id &&
    e.date === exam.date &&
    getExamVenueIds(e).some(vid => myVenueIds.includes(vid))
  );

  if (coExams.length === 0) {
    coExamsAlert.style.display    = 'none';
    aiOptimizeSection.style.display = 'none';
    return;
  }

  const totalOther = coExams.reduce((s, e) => s + e.students.length, 0);
  const capacity   = getTotalCapacity(exam);
  const totalAll   = (exam.students.length) + totalOther;

  coExamsAlert.style.display = 'block';
  coExamsAlert.innerHTML = `
    <div class="conflict-warning">
      ⚠️ <strong>${coExams.length} other exam(s)</strong> share a venue with this exam
      (<strong>${getVenueNames(exam)}</strong>) on <strong>${formatDate(exam.date)}</strong>:
      <ul style="margin:8px 0 0 20px; font-size:12px; line-height:1.8;">
        ${coExams.map(e => `<li><strong>${e.moduleCode}</strong> — ${e.moduleName} (${e.examName}) — ${e.students.length} student(s)</li>`).join('')}
      </ul>
      <div style="margin-top:8px; font-size:12px;">
        Total students across all exams: <strong>${totalAll}</strong> / Venue capacity: <strong>${capacity}</strong>
        ${totalAll > capacity ? ' <span style="color:#c0392b; font-weight:bold;">⚠️ OVER CAPACITY</span>' : ''}
      </div>
    </div>`;

  aiOptimizeSection.style.display = 'block';
  aiCoExamsList.innerHTML = `
    <div style="font-size:13px; color:#333; margin-bottom:8px;">
      <strong>Exams that will be optimized together:</strong>
      <ul style="margin:6px 0 0 18px; line-height:1.8;">
        <li><strong>${exam.moduleCode}</strong> — ${exam.moduleName} (${exam.examName}) — ${exam.students.length} student(s) <em>(current)</em></li>
        ${coExams.map(e => `<li><strong>${e.moduleCode}</strong> — ${e.moduleName} (${e.examName}) — ${e.students.length} student(s)</li>`).join('')}
      </ul>
    </div>`;
}

// ── Student List Render ───────────────────────────────────
function renderStudentList() {
  const students = exam.students || [];
  studentCountBadge.textContent = students.length;

  if (students.length === 0) {
    studentListCont.innerHTML = `
      <div class="empty-state" style="padding:32px;">
        <div class="empty-state-icon">👥</div>
        <h3>No students yet</h3>
        <p>Paste student data above and click "Parse &amp; Preview" to get started.</p>
      </div>`;
    return;
  }

  const rows = students.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escHtml(s.studentId)}</td>
      <td>${escHtml(s.studentName)}</td>
      <td style="font-weight:bold; color:#1a3a5c;">${s.seatAssigned || '—'}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openEditSeat('${escHtml(s.studentId)}', '${escHtml(s.studentName)}', '${escHtml(s.seatAssigned || '')}')">
          ✏️ Edit Seat
        </button>
        <button class="btn btn-sm btn-red" onclick="removeStudentClick('${escHtml(s.studentId)}')">
          🗑️ Remove
        </button>
      </td>
    </tr>`).join('');

  studentListCont.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Assigned Seat</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── Parse Student Data ────────────────────────────────────
parseBtn.addEventListener('click', () => {
  const raw = studentPaste.value.trim();
  if (!raw) {
    showToast('Please paste some student data first.', 'warning');
    return;
  }

  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  parsedStudents = [];
  const errors = [];

  lines.forEach((line, idx) => {
    let parts = line.split('\t').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      const match = line.match(/^(\S+)\s+(.+)$/);
      if (match) parts = [match[1].trim(), match[2].trim()];
    }

    if (parts.length >= 2) {
      parsedStudents.push({ studentId: parts[0], studentName: parts.slice(1).join(' ') });
    } else {
      errors.push(`Line ${idx + 1}: Could not parse — "${line}"`);
    }
  });

  const seen = new Set();
  parsedStudents = parsedStudents.filter(s => {
    if (seen.has(s.studentId)) return false;
    seen.add(s.studentId);
    return true;
  });

  if (parsedStudents.length === 0) {
    showToast('No valid students found. Check the format: ID[tab]Name', 'error');
    return;
  }

  previewCount.textContent = parsedStudents.length;
  previewTableBody.innerHTML = parsedStudents.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escHtml(s.studentId)}</td>
      <td>${escHtml(s.studentName)}</td>
      <td><span class="pill pill-green">✓ Valid</span></td>
    </tr>`).join('') + (errors.length > 0 ? `
    <tr>
      <td colspan="4">
        <div class="alert alert-warning" style="margin:8px 0 0;">
          ⚠️ ${errors.length} line(s) could not be parsed and were skipped.
        </div>
      </td>
    </tr>` : '');

  previewCard.style.display = 'block';
  previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (errors.length > 0) {
    showToast(`${parsedStudents.length} student(s) parsed, ${errors.length} skipped`, 'warning');
  } else {
    showToast(`${parsedStudents.length} student(s) ready for import`, 'success');
  }
});

clearPasteBtn.addEventListener('click', () => {
  studentPaste.value = '';
  parsedStudents = [];
  previewCard.style.display = 'none';
});

cancelPreviewBtn.addEventListener('click', () => {
  previewCard.style.display = 'none';
  parsedStudents = [];
});

// ── Save Students ─────────────────────────────────────────
saveStudentsBtn.addEventListener('click', () => {
  if (parsedStudents.length === 0) {
    showToast('No students to save.', 'warning');
    return;
  }

  saveStudentsBtn.disabled = true;
  saveStudentsBtn.innerHTML = '<span class="spinner"></span> Saving & Assigning Seats…';

  try {
    const updated = saveStudents(examId, parsedStudents);
    if (!updated) throw new Error('Failed to save students');

    exam = updated;
    allExams = getExams();
    parsedStudents = [];
    studentPaste.value = '';
    previewCard.style.display = 'none';
    renderStudentList();
    renderCoExamsInfo();
    showToast(`✓ ${exam.students.length} student(s) saved and seats assigned`, 'success');
    studentListCont.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    saveStudentsBtn.disabled = false;
    saveStudentsBtn.innerHTML = '💾 Save Students & Assign Seats';
  }
});

// ── Remove Student ────────────────────────────────────────
function removeStudentClick(studentId) {
  if (!confirm(`Remove student ${studentId} from this exam?`)) return;

  try {
    const updated = removeStudent(examId, studentId);
    if (!updated) throw new Error('Student not found');

    exam = updated;
    allExams = getExams();
    renderStudentList();
    renderCoExamsInfo();
    showToast(`Student ${studentId} removed and seats re-assigned`, 'success');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

window.removeStudentClick = removeStudentClick;

// ── Edit Seat ─────────────────────────────────────────────
let editSeatStudentId = null;

const editSeatModal     = document.getElementById('editSeatModal');
const editSeatInput     = document.getElementById('editSeatInput');
const editSeatError     = document.getElementById('editSeatError');
const editSeatNameEl    = document.getElementById('editSeatStudentName');
const editSeatIdEl      = document.getElementById('editSeatStudentId');
const saveEditSeatBtn   = document.getElementById('saveEditSeatBtn');
const cancelEditSeatBtn = document.getElementById('cancelEditSeatBtn');
const closeEditSeatBtn  = document.getElementById('closeEditSeatModal');

function openEditSeat(studentId, studentName, currentSeat) {
  editSeatStudentId = studentId;
  editSeatNameEl.textContent  = studentName;
  editSeatIdEl.textContent    = studentId;
  editSeatInput.value         = currentSeat || '';
  editSeatError.style.display = 'none';
  editSeatError.textContent   = '';
  editSeatModal.classList.remove('hidden');
  editSeatInput.focus();
  editSeatInput.select();
}

function closeEditSeat() {
  editSeatModal.classList.add('hidden');
  editSeatStudentId = null;
}

closeEditSeatBtn.addEventListener('click', closeEditSeat);
cancelEditSeatBtn.addEventListener('click', closeEditSeat);
editSeatModal.addEventListener('click', e => { if (e.target === editSeatModal) closeEditSeat(); });

editSeatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveEditSeatBtn.click();
  if (e.key === 'Escape') closeEditSeat();
});

saveEditSeatBtn.addEventListener('click', () => {
  const newSeat = editSeatInput.value.trim().toUpperCase();
  if (!newSeat) {
    editSeatError.textContent = 'Please enter a seat (e.g. A3).';
    editSeatError.style.display = 'block';
    return;
  }

  saveEditSeatBtn.disabled = true;
  saveEditSeatBtn.textContent = 'Saving…';
  editSeatError.style.display = 'none';

  try {
    const result = updateSeat(examId, editSeatStudentId, newSeat);

    if (result && result.error) throw new Error(result.error);

    exam = result;
    allExams = getExams();
    renderStudentList();
    closeEditSeat();
    showToast(`Seat updated to ${newSeat}`, 'success');

  } catch (err) {
    editSeatError.textContent = err.message;
    editSeatError.style.display = 'block';
  } finally {
    saveEditSeatBtn.disabled = false;
    saveEditSeatBtn.textContent = '✏️ Update Seat';
  }
});

window.openEditSeat = openEditSeat;

// ── Seating Optimisation ──────────────────────────────────
aiOptimizeBtn.addEventListener('click', () => {
  const myVenueIds = (exam.venueIds && exam.venueIds.length > 0) ? exam.venueIds : (exam.venueId ? [exam.venueId] : []);
  const coExams    = allExams.filter(e =>
    e.date === exam.date &&
    ((e.venueIds && e.venueIds.length > 0) ? e.venueIds : (e.venueId ? [e.venueId] : [])).some(vid => myVenueIds.includes(vid))
  );
  const totalStudents = coExams.reduce((s, e) => s + e.students.length, 0);

  if (totalStudents === 0) {
    showToast('No students to optimise. Please add students first.', 'warning');
    return;
  }

  aiOptimizeBtn.disabled = true;
  aiOptimizeBtn.innerHTML = '<span class="spinner"></span> Optimising…';
  aiResult.style.display  = 'none';

  try {
    const data = optimizeSeating(examId);

    if (data.error) throw new Error(data.error);

    aiResult.style.display = 'block';
    aiResult.innerHTML = `
      <div class="ai-result-box">
        <div class="ai-result-title">✅ Seating Optimised</div>
        <p style="font-size:13px; color:#333; margin-bottom:8px;">${data.message}</p>
        <p style="font-size:12px; color:#555;">
          ${data.assignments.length} seat assignments applied. Students from different modules are now interleaved.
        </p>
      </div>`;

    allExams = getExams();
    exam     = allExams.find(e => e.id === examId);
    renderStudentList();
    renderCoExamsInfo();
    showToast('✓ Seating optimised successfully!', 'success');

  } catch (err) {
    aiResult.style.display = 'block';
    aiResult.innerHTML = `<div class="alert alert-error"><strong>Error:</strong> ${escHtml(err.message)}</div>`;
    showToast('Optimisation failed: ' + err.message, 'error');
  } finally {
    aiOptimizeBtn.disabled = false;
    aiOptimizeBtn.innerHTML = '🔀 Optimise Seating for All Exams in This Venue';
  }
});

// ── Init ──────────────────────────────────────────────────
if (examId) {
  setupFileUI(
    document.getElementById('fileStatusDot'),
    document.getElementById('fileStatusText'),
    document.getElementById('connectFileBtn'),
    document.getElementById('exportFileBtn')
  );

  // Reload when data is refreshed from file
  window.addEventListener('examsUpdated', loadAll);

  loadAll();
}
