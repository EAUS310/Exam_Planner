/* ══════════════════════════════════════════════════════════
   Exam Planning Tool — Main Page (index.html)
   All data via storage.js (localStorage + file sync)
   ══════════════════════════════════════════════════════════ */

'use strict';

// ── State ─────────────────────────────────────────────────
let allExams      = [];
let allClassrooms = [];
let classroomMap  = new Map();   // id → classroom, built once in loadClassrooms
let currentPrintExamId  = null;
let currentDeleteExamId = null;

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

// ── DOM Refs ─────────────────────────────────────────────
const examForm          = document.getElementById('examForm');
const submitExamBtn     = document.getElementById('submitExamBtn');
const openAddExamBtn    = document.getElementById('openAddExamBtn');
const cancelAddExamBtn  = document.getElementById('cancelAddExamBtn');
const closeAddExamModal = document.getElementById('closeAddExamModal');
const addExamModal      = document.getElementById('addExamModal');
const addExamModalTitle = document.getElementById('addExamModalTitle');
const editExamIdInput   = document.getElementById('editExamId');

const venueCheckList   = document.getElementById('venueCheckList');
const examListCont     = document.getElementById('examListContainer');
const examCountBadge   = document.getElementById('examCount');

// ── Filter refs ───────────────────────────────────────────
const filterCode    = document.getElementById('filterCode');
const filterDate    = document.getElementById('filterDate');
const filterTime    = document.getElementById('filterTime');
const filterVenue   = document.getElementById('filterVenue');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const debouncedRender = debounce(renderExamList, 150);
[filterCode, filterDate, filterTime, filterVenue].forEach(el =>
  el.addEventListener('input', debouncedRender)
);
clearFiltersBtn.addEventListener('click', () => {
  filterCode.value = '';
  filterDate.value = '';
  filterTime.value = '';
  filterVenue.value = '';
  renderExamList();
});

const printModal       = document.getElementById('printModal');
const closePrintModal  = document.getElementById('closePrintModal');
const cancelPrintBtn   = document.getElementById('cancelPrintBtn');
const printAttendBtn   = document.getElementById('printAttendanceBtn');
const printSeatingBtn  = document.getElementById('printSeatingBtn');

const deleteModal      = document.getElementById('deleteModal');
const closeDeleteModal = document.getElementById('closeDeleteModal');
const cancelDeleteBtn  = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteExamNameEl = document.getElementById('deleteExamName');

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

// ── Format helpers ────────────────────────────────────────
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
  const room = classroomMap.get(venueId);
  return room ? room.name : venueId;
}

function getVenueNames(exam) {
  const ids = exam.venueIds && exam.venueIds.length > 0 ? exam.venueIds : (exam.venueId ? [exam.venueId] : []);
  return ids.map(id => getVenueName(id)).join(', ') || '—';
}

function getCheckedVenueIds() {
  return [...venueCheckList.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
}

function getExamTypePillClass(type) {
  const map = { 'Final': 'pill-red', 'Midterm': 'pill-blue', 'Test': 'pill-gray', 'Quiz': 'pill-gray', 'Other': 'pill-gray' };
  return map[type] || 'pill-gray';
}

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ── Load classrooms into venue checklist ──────────────────
function loadClassrooms() {
  allClassrooms = getClassrooms();
  classroomMap  = new Map(allClassrooms.map(c => [c.id, c]));
  venueCheckList.innerHTML = '';
  allClassrooms.forEach(c => {
    const label = document.createElement('label');
    label.className = 'venue-check-item';
    label.innerHTML = `<input type="checkbox" value="${c.id}"> <span>${c.name} (${c.totalSeats} seats)</span>`;
    label.querySelector('input').addEventListener('change', function() {
      label.classList.toggle('checked', this.checked);
    });
    venueCheckList.appendChild(label);
  });

  filterVenue.innerHTML = '<option value="">All Venues</option>';
  allClassrooms.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    filterVenue.appendChild(opt);
  });
}

// ── Filter logic ──────────────────────────────────────────
function getFilteredExams() {
  const code  = filterCode.value.trim().toLowerCase();
  const date  = filterDate.value;
  const time  = filterTime.value;
  const venue = filterVenue.value;

  return allExams.filter(exam => {
    if (code  && !exam.moduleCode.toLowerCase().includes(code)) return false;
    if (date  && exam.date !== date) return false;
    if (time  && exam.startTime !== time) return false;
    if (venue) {
      const ids = exam.venueIds && exam.venueIds.length > 0 ? exam.venueIds : (exam.venueId ? [exam.venueId] : []);
      if (!ids.includes(venue)) return false;
    }
    return true;
  });
}


function renderExamList() {
  const exams = getFilteredExams();
  examCountBadge.textContent = exams.length !== allExams.length
    ? `${exams.length} / ${allExams.length}`
    : allExams.length;

  if (allExams.length === 0) {
    examListCont.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No exams yet</h3>
        <p>Click <strong>+ Add Exam Entry</strong> in the top right to get started.</p>
      </div>`;
    return;
  }

  if (exams.length === 0) {
    examListCont.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No results</h3>
        <p>No exams match your filters.</p>
      </div>`;
    return;
  }

  const rows = exams.map(exam => {
    const venue        = getVenueNames(exam);
    const typeClass    = getExamTypePillClass(exam.examName);
    const studentCount = (exam.students || []).length;

    return `
      <tr>
        <td><strong style="color:#1a3a5c;">${escHtml(exam.moduleCode)}</strong></td>
        <td>${escHtml(exam.moduleName)}</td>
        <td>${exam.program ? `<span class="pill pill-blue">${escHtml(exam.program)}</span>` : '<span class="pill pill-gray">—</span>'}</td>
        <td><span class="pill ${typeClass}">${escHtml(exam.examName)}</span></td>
        <td><span class="pill pill-gray">${escHtml(exam.semester)}</span></td>
        <td>${formatDate(exam.date)}</td>
        <td>${formatTime(exam.startTime)} – ${formatTime(exam.endTime)}</td>
        <td>${escHtml(venue)}</td>
        <td>
          <span class="pill ${studentCount > 0 ? 'pill-green' : 'pill-gray'}">
            ${studentCount} student${studentCount !== 1 ? 's' : ''}
          </span>
        </td>
        <td>
          <div class="actions-cell">
            <a href="students.html?examId=${exam.id}" class="btn btn-sm btn-outline">👥 Students</a>
            <button class="btn btn-sm btn-ghost" onclick="openEditExam('${exam.id}')">✏️ Edit</button>
            <button class="btn btn-sm btn-primary" onclick="openPrintModal('${exam.id}')">🖨️ Print</button>
            <button class="btn btn-sm btn-red" onclick="openDeleteModal('${exam.id}', '${escHtml(exam.moduleCode)} — ${escHtml(exam.moduleName)} (${escHtml(exam.examName)})')">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  examListCont.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Module Name</th>
            <th>Program</th>
            <th>Type</th>
            <th>Semester</th>
            <th>Date</th>
            <th>Time</th>
            <th>Venue</th>
            <th>Students</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── Add / Edit Exam Modal ─────────────────────────────────
function openAddExam() {
  examForm.reset();
  editExamIdInput.value = '';
  addExamModalTitle.textContent = '＋ New Exam Entry';
  submitExamBtn.textContent = '＋ Create Exam';
  addExamModal.classList.remove('hidden');
  document.getElementById('moduleCode').focus();
}

function openEditExam(examId) {
  const exam = allExams.find(e => e.id === examId);
  if (!exam) return;

  examForm.reset();
  editExamIdInput.value = examId;
  addExamModalTitle.textContent = '✏️ Edit Exam Entry';
  submitExamBtn.textContent = '💾 Save Changes';

  document.getElementById('moduleCode').value      = exam.moduleCode;
  document.getElementById('moduleName').value       = exam.moduleName;
  document.getElementById('examName').value         = exam.examName;
  document.getElementById('semester').value         = exam.semester;
  document.getElementById('date').value             = exam.date;
  document.getElementById('startTime').value        = exam.startTime;
  document.getElementById('endTime').value          = exam.endTime;
  document.getElementById('program').value          = exam.program || '';
  document.getElementById('instructorName').value   = exam.instructorName;
  document.getElementById('invigilatorName').value  = exam.invigilatorName || '';

  const examVenueIds = exam.venueIds && exam.venueIds.length > 0 ? exam.venueIds : (exam.venueId ? [exam.venueId] : []);
  venueCheckList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = examVenueIds.includes(cb.value);
    cb.closest('.venue-check-item').classList.toggle('checked', cb.checked);
  });

  addExamModal.classList.remove('hidden');
}

function closeAddExam() {
  addExamModal.classList.add('hidden');
  examForm.reset();
  editExamIdInput.value = '';
  venueCheckList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    cb.closest('.venue-check-item').classList.remove('checked');
  });
}

openAddExamBtn.addEventListener('click', openAddExam);
closeAddExamModal.addEventListener('click', closeAddExam);
cancelAddExamBtn.addEventListener('click', closeAddExam);
addExamModal.addEventListener('click', (e) => { if (e.target === addExamModal) closeAddExam(); });

// ── Create / Update Exam ──────────────────────────────────
submitExamBtn.addEventListener('click', () => {
  const required = ['moduleCode','moduleName','examName','semester',
                    'date','startTime','endTime','program','instructorName'];
  for (const f of required) {
    if (!document.getElementById(f).value.trim()) {
      showToast(`Please fill in: ${f.replace(/([A-Z])/g, ' $1').trim()}`, 'warning');
      document.getElementById(f).focus();
      return;
    }
  }

  const selectedVenueIds = getCheckedVenueIds();
  if (selectedVenueIds.length === 0) {
    showToast('Please select at least one venue.', 'warning');
    return;
  }

  const payload = {
    moduleCode:      document.getElementById('moduleCode').value.trim(),
    moduleName:      document.getElementById('moduleName').value.trim(),
    examName:        document.getElementById('examName').value,
    semester:        document.getElementById('semester').value,
    date:            document.getElementById('date').value,
    startTime:       document.getElementById('startTime').value,
    endTime:         document.getElementById('endTime').value,
    venueIds:        selectedVenueIds,
    program:         document.getElementById('program').value,
    instructorName:  document.getElementById('instructorName').value.trim(),
    invigilatorName: document.getElementById('invigilatorName').value.trim()
  };

  const editId = editExamIdInput.value;
  const isEdit = !!editId;

  submitExamBtn.disabled = true;
  submitExamBtn.innerHTML = `<span class="spinner"></span> ${isEdit ? 'Saving…' : 'Creating…'}`;

  try {
    let saved;
    if (isEdit) {
      saved = updateExam(editId, payload);
      if (!saved) throw new Error('Exam not found');
      const idx = allExams.findIndex(e => e.id === editId);
      if (idx !== -1) allExams[idx] = saved;
      showToast(`✓ Exam updated: ${saved.moduleCode} — ${saved.examName}`, 'success');
    } else {
      saved = createExam(payload);
      allExams.push(saved);
      showToast(`✓ Exam created: ${saved.moduleCode} — ${saved.examName}`, 'success');
    }

    renderExamList();
    closeAddExam();

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    submitExamBtn.disabled = false;
    submitExamBtn.innerHTML = isEdit ? '💾 Save Changes' : '＋ Create Exam';
  }
});

// ── Print Modal ───────────────────────────────────────────
function openPrintModal(examId) {
  currentPrintExamId = examId;
  printModal.classList.remove('hidden');
}

function closePrint() {
  printModal.classList.add('hidden');
  currentPrintExamId = null;
}

closePrintModal.addEventListener('click', closePrint);
cancelPrintBtn.addEventListener('click', closePrint);
printModal.addEventListener('click', (e) => { if (e.target === printModal) closePrint(); });

printAttendBtn.addEventListener('click', () => {
  if (!currentPrintExamId) return;
  window.open(`attendance-print.html?examId=${currentPrintExamId}`, '_blank');
  closePrint();
});

printSeatingBtn.addEventListener('click', () => {
  if (!currentPrintExamId) return;
  window.open(`seating-print.html?examId=${currentPrintExamId}`, '_blank');
  closePrint();
});

// ── Delete Modal ──────────────────────────────────────────
function openDeleteModal(examId, examLabel) {
  currentDeleteExamId = examId;
  deleteExamNameEl.textContent = examLabel;
  deleteModal.classList.remove('hidden');
}

function closeDelete() {
  deleteModal.classList.add('hidden');
  currentDeleteExamId = null;
}

closeDeleteModal.addEventListener('click', closeDelete);
cancelDeleteBtn.addEventListener('click', closeDelete);
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDelete(); });

confirmDeleteBtn.addEventListener('click', () => {
  if (!currentDeleteExamId) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.innerHTML = '<span class="spinner"></span> Deleting…';

  try {
    const ok = deleteExam(currentDeleteExamId);
    if (!ok) throw new Error('Exam not found');
    allExams = allExams.filter(e => e.id !== currentDeleteExamId);
    renderExamList();
    showToast('Exam deleted successfully', 'success');
    closeDelete();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.innerHTML = 'Delete';
  }
});

// Make modal openers available globally (called from inline onclick)
window.openPrintModal  = openPrintModal;
window.openDeleteModal = openDeleteModal;
window.openEditExam    = openEditExam;

// ── Init ──────────────────────────────────────────────────
(function init() {
  setupFileUI(
    document.getElementById('fileStatusDot'),
    document.getElementById('fileStatusText'),
    document.getElementById('connectFileBtn'),
    document.getElementById('exportFileBtn')
  );

  // Reload table whenever data is refreshed from file
  window.addEventListener('examsUpdated', () => {
    allExams = getExams();
    renderExamList();
  });

  loadClassrooms();
  allExams = getExams();
  renderExamList();
})();
