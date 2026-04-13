/* ══════════════════════════════════════════════════════════
   EAU Exam Planner — Shared Storage Layer
   Replaces all /api/* fetch calls.
   Persistence: localStorage (instant) + File System Access
   API (auto-syncs back to data/exams.json when connected).
══════════════════════════════════════════════════════════ */

'use strict';

// ── Embedded classrooms data (static — never changes) ─────
const _CLASSROOMS_RAW = [
  {"id":"Exam_Hall_1","name":"Exam Hall 1","columns":["A","B","C","D","E","F","G","H","I","J","K"],"rows":[1,2,3,4,5,6,7,8,9,10,11]},
  {"id":"Exam_Hall_2","name":"Exam Hall 2","columnRows":{"A":[1,2,3,4,5,6,7,8,9,10,11,12],"B":[1,2,3,4,5,6,7,8,9,10,11,12],"C":[1,2,3,4,5,6,7,8,9,10,11,12],"D":[1,2,3,4,5,6,7,8,9,10,11,12],"E":[1,2,3,4,5,6,7,8],"F":[1,2,3,4,5,6,7,8],"G":[1,2,3,4,5,6,7,8],"H":[1,2,3,4,5,6,7,8],"I":[3,4,5,6],"J":[1,2,3,4,5,6],"K":[1,2,3,4]}},
  {"id":"G_08_10","name":"G08/10","columnRows":{"A":[1,2,3,4,5,6,9,10,11,12],"B":[1,2,3,4,5,6,7,8,9,10,11,12,13,14],"C":[1,2,3,4,5,6,7,8,9,10,11,12,13,14],"D":[1,2,3,4,5,6,7,8,9,10,11,12,13,14],"E":[1,2,3,4,5,6,7,8,9,10,11,12,13,14],"F":[1,2,3,4,5,6,8,9,10,11,12,13]}},
  {"id":"G_04_06","name":"G04/06","columnRows":{"A":[1,2,3,4,5,6,9,10,11,12],"B":[1,2,3,4,5,6,7,8,9,10,11,12,13,14],"C":[1,2,3,4,5,6,7,8,9,10,11,12,13,14],"D":[1,2,3,4,5,6,7,8,9,10,11,12,13,14],"E":[1,2,3,4,5,6,7,8,9,10,11,12,13,14],"F":[1,2,3,4,5,6,8,9,10,11,12,13]}},
  {"id":"G05","name":"G05","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G09","name":"G09","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G11","name":"G11","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G12","name":"G12","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G13","name":"G13","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G14","name":"G14","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G15","name":"G15","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G16","name":"G16","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G17","name":"G17","columns":["A","B","C","D","E","F"],"rows":[1,2,3,4,5]},
  {"id":"G18","name":"G18","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"G19","name":"G19","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"G20","name":"G20","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"G21","name":"G21","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"G22","name":"G22","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"G23","name":"G23","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"G24","name":"G24","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"G25","name":"G25","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"G26","name":"G26","columns":["A","C","E"],"rows":[1,2,3,4,5]},
  {"id":"Lab_02","name":"Lab 02","columns":["A","C","F","H"],"rows":[1,2,3,4,5,6]},
  {"id":"Lab_03","name":"Lab 03","columns":["A","C","F","H"],"rows":[1,2,3,4,5,6]},
  {"id":"Lab_04","name":"Lab 04","columns":["A","C","F","H"],"rows":[1,2,3,4,5,6]},
  {"id":"Lab_05","name":"Lab 05","columns":["A","C","F","H"],"rows":[1,2,3,4,5,6]},
  {"id":"Lab_06","name":"Lab 06","columns":["A","C","F","H"],"rows":[1,2,3,4,5,6]},
  {"id":"Lab_07","name":"Lab 07","columns":["A","C","F","H"],"rows":[1,2,3,4,5,6]},
  {"id":"Lab_08","name":"Lab 08","columns":["A","C","F","H"],"rows":[1,2,3,4,5,6]},
  {"id":"F101","name":"F101","columns":["A","B","C","D","E","F","G"],"rows":[1,2,3,4,5,6]}
];

// ── Helpers ───────────────────────────────────────────────
function _computeSeats(c) {
  if (c.columnRows) return Object.values(c.columnRows).reduce((s, r) => s + r.length, 0);
  return (c.columns || []).length * (c.rows || []).length;
}

function getClassrooms() {
  return _CLASSROOMS_RAW.map(c => ({ ...c, totalSeats: _computeSeats(c) }));
}

function _genId() {
  if (crypto && crypto.randomUUID) return 'exam-' + crypto.randomUUID();
  return 'exam-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function _getVenueIds(exam) {
  if (exam.venueIds && exam.venueIds.length) return exam.venueIds;
  if (exam.venueId) return [exam.venueId];
  return [];
}

function _generateAllSeats(classroom) {
  const seats = [];
  if (classroom.columnRows) {
    for (const [col, rows] of Object.entries(classroom.columnRows))
      for (const row of rows) seats.push(`${col}${row}`);
  } else {
    for (const col of classroom.columns)
      for (const row of classroom.rows) seats.push(`${col}${row}`);
  }
  return seats;
}

// ── Seating assignment (ported from server/routes/exams.js) ─
function _assignSeatsMultiVenue(exam, allExams) {
  const classrooms = getClassrooms();
  const venueIds   = _getVenueIds(exam);

  const sorted = [...exam.students].sort((a, b) => {
    const la = (a.studentName || '').trim().split(' ').pop().toLowerCase();
    const lb = (b.studentName || '').trim().split(' ').pop().toLowerCase();
    return la.localeCompare(lb);
  });

  let si = 0;
  const result = [];

  for (const venueId of venueIds) {
    const classroom = classrooms.find(c => c.id === venueId);
    if (!classroom) continue;

    const taken = new Set();
    allExams.forEach(e => {
      if (e.id === exam.id) return;
      const evids = _getVenueIds(e);
      if (evids.includes(venueId) && e.date === exam.date) {
        e.students.forEach(s => {
          if (s.seatAssigned && (s.venueId === venueId || (!s.venueId && e.venueId === venueId)))
            taken.add(s.seatAssigned);
        });
      }
    });

    const available = _generateAllSeats(classroom).filter(s => !taken.has(s));
    let seati = 0;
    while (si < sorted.length && seati < available.length) {
      result.push({ ...sorted[si], venueId, seatAssigned: available[seati] });
      si++; seati++;
    }
  }

  while (si < sorted.length) {
    result.push({ ...sorted[si], venueId: venueIds[0] || null, seatAssigned: null });
    si++;
  }

  return result;
}

// ── localStorage ──────────────────────────────────────────
const _LS_KEY = 'eau_exam_planner_v1';

function getExams() {
  try { return JSON.parse(localStorage.getItem(_LS_KEY) || '[]'); } catch { return []; }
}

function _saveExams(exams) {
  localStorage.setItem(_LS_KEY, JSON.stringify(exams));
  _syncToFile(exams);   // fire-and-forget write to file
  window.dispatchEvent(new CustomEvent('examsUpdated'));
}

// ── File System Access API ────────────────────────────────
const _IDB_NAME  = 'EAUExamPlanner';
const _IDB_STORE = 'handles';
const _IDB_KEY   = 'examsFile';

let _fileHandle    = null;
let _needsPermBtn  = false;  // true when we have a handle but need permission

function _openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(_IDB_STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => reject(req.error);
  });
}

async function _saveHandleIDB(handle) {
  try {
    const db = await _openIDB();
    const tx = db.transaction(_IDB_STORE, 'readwrite');
    tx.objectStore(_IDB_STORE).put(handle, _IDB_KEY);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
  } catch {}
}

async function _getHandleIDB() {
  try {
    const db = await _openIDB();
    return new Promise(resolve => {
      const req = db.transaction(_IDB_STORE).objectStore(_IDB_STORE).get(_IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}

async function _syncToFile(exams) {
  if (!_fileHandle) return;
  try {
    if (await _fileHandle.queryPermission({ mode: 'readwrite' }) !== 'granted') return;
    const writable = await _fileHandle.createWritable();
    await writable.write(JSON.stringify(exams, null, 2));
    await writable.close();
    _setStatus('synced', '✓ Synced with file');
  } catch {}
}

// Status UI
let _statusDot  = null;
let _statusText = null;
let _connectBtn = null;

function _setStatus(state, text) {
  if (_statusDot)  { _statusDot.className = 'file-dot file-dot-' + state; }
  if (_statusText) { _statusText.textContent = text; }
  if (_connectBtn) {
    if (state === 'needs-perm') {
      _connectBtn.textContent = '🔑 Reconnect to file';
    } else if (state === 'synced') {
      _connectBtn.textContent = '📂 Change file';
    } else {
      _connectBtn.textContent = '📂 Connect exams.json';
    }
  }
}

// Called once on page load to wire up sidebar elements
function setupFileUI(dotEl, textEl, connectEl, exportEl) {
  _statusDot  = dotEl;
  _statusText = textEl;
  _connectBtn = connectEl;
  if (exportEl) exportEl.addEventListener('click', exportJsonFile);
  if (connectEl) connectEl.addEventListener('click', handleConnectClick);
  _setStatus('none', 'Not connected');
}

async function handleConnectClick() {
  if (!window.showOpenFilePicker) {
    // Fallback for browsers without File System Access API
    importJsonFile(() => {
      _setStatus('none', 'Imported (local only)');
      window.dispatchEvent(new CustomEvent('examsUpdated'));
    });
    return;
  }
  if (_needsPermBtn) {
    await reconnectFile();
  } else {
    await connectToFile();
  }
}

// Try to restore handle on page load (no user gesture needed for queryPermission)
async function _tryRestoreHandle() {
  if (!window.showOpenFilePicker) { _setStatus('none', 'Local storage only'); return; }
  const handle = await _getHandleIDB();
  if (!handle) { _setStatus('none', 'Not connected'); return; }

  const perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') {
    _fileHandle = handle;
    _needsPermBtn = false;
    try {
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      localStorage.setItem(_LS_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('examsUpdated'));
    } catch {}
    _setStatus('synced', '✓ Synced with file');
  } else {
    _needsPermBtn = true;
    _setStatus('needs-perm', 'Click to reconnect');
  }
}

// Connect to a new file (requires user gesture)
async function connectToFile() {
  if (!window.showOpenFilePicker) {
    alert('File System Access API not supported.\nUse Import/Export buttons instead.');
    return false;
  }
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }],
      excludeAcceptAllOption: true,
      multiple: false
    });
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') { alert('Read-write permission is required to save.'); return false; }

    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    localStorage.setItem(_LS_KEY, JSON.stringify(data));

    _fileHandle   = handle;
    _needsPermBtn = false;
    await _saveHandleIDB(handle);
    _setStatus('synced', '✓ Synced with file');
    window.dispatchEvent(new CustomEvent('examsUpdated'));
    return true;
  } catch (e) {
    if (e.name !== 'AbortError') alert('Could not connect: ' + e.message);
    return false;
  }
}

// Re-request permission on an existing stored handle
async function reconnectFile() {
  const handle = await _getHandleIDB();
  if (!handle) { return connectToFile(); }
  try {
    const perm = await handle.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return false;
    _fileHandle   = handle;
    _needsPermBtn = false;
    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    localStorage.setItem(_LS_KEY, JSON.stringify(data));
    _setStatus('synced', '✓ Synced with file');
    window.dispatchEvent(new CustomEvent('examsUpdated'));
    return true;
  } catch { return false; }
}

// Manual import from a picked file (fallback when FSA not available)
function importJsonFile(callback) {
  const input = document.createElement('input');
  input.type   = 'file';
  input.accept = '.json,application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        localStorage.setItem(_LS_KEY, JSON.stringify(data));
        _setStatus('none', 'Imported (local only)');
        callback && callback();
      } catch (err) { alert('Invalid JSON file: ' + err.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Download current data as exams.json
function exportJsonFile() {
  const exams = getExams();
  const blob  = new Blob([JSON.stringify(exams, null, 2)], { type: 'application/json' });
  const a     = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'exams.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// ── CRUD — Exams ──────────────────────────────────────────

function getExam(id) {
  return getExams().find(e => e.id === id) || null;
}

function createExam(payload) {
  const exams    = getExams();
  const venueIds = Array.isArray(payload.venueIds) ? payload.venueIds
                 : (payload.venueId ? [payload.venueId] : []);
  const exam = {
    id:             _genId(),
    moduleCode:     payload.moduleCode     || '',
    moduleName:     payload.moduleName     || '',
    examName:       payload.examName       || 'Final',
    semester:       payload.semester       || '',
    date:           payload.date           || '',
    startTime:      payload.startTime      || '',
    endTime:        payload.endTime        || '',
    instructorName: payload.instructorName || '',
    invigilatorName:payload.invigilatorName|| '',
    venueIds,
    venueId:        venueIds[0]            || '',
    program:        payload.program        || '',
    students:       [],
    createdAt:      new Date().toISOString()
  };
  exams.push(exam);
  _saveExams(exams);
  return exam;
}

function updateExam(id, payload) {
  const exams = getExams();
  const idx   = exams.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const cur      = exams[idx];
  const venueIds = Array.isArray(payload.venueIds) ? payload.venueIds
                 : (cur.venueIds || (cur.venueId ? [cur.venueId] : []));
  const updated  = {
    ...cur,
    moduleCode:      payload.moduleCode      ?? cur.moduleCode,
    moduleName:      payload.moduleName      ?? cur.moduleName,
    examName:        payload.examName        ?? cur.examName,
    semester:        payload.semester        ?? cur.semester,
    date:            payload.date            ?? cur.date,
    startTime:       payload.startTime       ?? cur.startTime,
    endTime:         payload.endTime         ?? cur.endTime,
    instructorName:  payload.instructorName  ?? cur.instructorName,
    invigilatorName: payload.invigilatorName ?? cur.invigilatorName,
    venueIds,
    venueId:         venueIds[0]             || cur.venueId || '',
    program:         payload.program         ?? cur.program ?? ''
  };
  exams[idx] = updated;
  _saveExams(exams);
  return updated;
}

function deleteExam(id) {
  const exams = getExams();
  const idx   = exams.findIndex(e => e.id === id);
  if (idx === -1) return false;
  exams.splice(idx, 1);
  _saveExams(exams);
  return true;
}

// ── CRUD — Students ───────────────────────────────────────

function saveStudents(examId, students) {
  const exams = getExams();
  const idx   = exams.findIndex(e => e.id === examId);
  if (idx === -1) return null;
  const exam  = exams[idx];
  exam.students = students.map(s => ({
    studentId:    s.studentId,
    studentName:  s.studentName,
    seatAssigned: null,
    venueId:      null
  }));
  exam.students = _assignSeatsMultiVenue(exam, exams);
  exams[idx] = exam;
  _saveExams(exams);
  return exam;
}

function updateSeat(examId, studentId, newSeat) {
  const exams = getExams();
  const idx   = exams.findIndex(e => e.id === examId);
  if (idx === -1) return { error: 'Exam not found' };
  const exam  = exams[idx];
  const si    = exam.students.findIndex(s => s.studentId === studentId);
  if (si === -1) return { error: 'Student not found' };

  const venueId  = exam.students[si].venueId || _getVenueIds(exam)[0];
  const conflict = exams.find(e => {
    const evids = _getVenueIds(e);
    if (!evids.includes(venueId) || e.date !== exam.date) return false;
    return e.students.some(s => {
      if (e.id === examId && s.studentId === studentId) return false;
      return s.seatAssigned === newSeat && s.venueId === venueId;
    });
  });
  if (conflict) return { error: `Seat ${newSeat} is already assigned to another student` };

  exam.students[si].seatAssigned = newSeat;
  exams[idx] = exam;
  _saveExams(exams);
  return exam;
}

function removeStudent(examId, studentId) {
  const exams  = getExams();
  const idx    = exams.findIndex(e => e.id === examId);
  if (idx === -1) return null;
  const exam   = exams[idx];
  const before = exam.students.length;
  exam.students = exam.students.filter(s => s.studentId !== studentId);
  if (exam.students.length === before) return null;
  if (_getVenueIds(exam).length > 0) exam.students = _assignSeatsMultiVenue(exam, exams);
  exams[idx] = exam;
  _saveExams(exams);
  return exam;
}

// ── Seating optimisation ──────────────────────────────────

function optimizeSeating(examId) {
  const exams      = getExams();
  const classrooms = getClassrooms();
  const examIdx    = exams.findIndex(e => e.id === examId);
  if (examIdx === -1) return { error: 'Exam not found' };

  const exam           = exams[examIdx];
  const primaryVenueId = _getVenueIds(exam)[0];
  const classroom      = classrooms.find(c => c.id === primaryVenueId);
  if (!classroom) return { error: 'Venue not found' };

  const coExams       = exams.filter(e => _getVenueIds(e).includes(primaryVenueId) && e.date === exam.date);
  const allSeats      = _generateAllSeats(classroom);
  const totalStudents = coExams.reduce((s, e) => s + e.students.length, 0);

  if (totalStudents > allSeats.length) {
    return { error: `Not enough seats. Students: ${totalStudents}, Seats: ${allSeats.length}` };
  }

  const columns = classroom.columnRows ? Object.keys(classroom.columnRows) : classroom.columns;
  const queues  = coExams.map(e => ({
    examId:   e.id,
    students: [...e.students].sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''))
  }));
  const assignments = [];

  for (let ci = 0; ci < columns.length; ci++) {
    const col      = columns[ci];
    const rows     = classroom.columnRows ? classroom.columnRows[col] : classroom.rows;
    const primaryQ = queues[ci % queues.length];

    for (const row of rows) {
      let chosen = null;
      if (primaryQ.students.length > 0) {
        chosen = { examId: primaryQ.examId, student: primaryQ.students.shift() };
      } else {
        for (const q of queues) {
          if (q.students.length > 0) { chosen = { examId: q.examId, student: q.students.shift() }; break; }
        }
      }
      if (!chosen) break;
      assignments.push({ examId: chosen.examId, studentId: chosen.student.studentId, seat: `${col}${row}` });
    }
  }

  for (const e of coExams) {
    const eIdx = exams.findIndex(ex => ex.id === e.id);
    exams[eIdx].students = exams[eIdx].students.map(student => {
      const a = assignments.find(x => x.examId === e.id && x.studentId === student.studentId);
      return { ...student, seatAssigned: a ? a.seat : student.seatAssigned };
    }).sort((a, b) => {
      const sA = a.seatAssigned || '', sB = b.seatAssigned || '';
      const colA = sA.charAt(0), colB = sB.charAt(0);
      const rowA = parseInt(sA.slice(1)) || 0, rowB = parseInt(sB.slice(1)) || 0;
      if (colA !== colB) return colA.localeCompare(colB);
      return rowA - rowB;
    });
  }

  _saveExams(exams);
  return {
    success: true,
    message: `Seating optimized for ${coExams.length} exam(s) with ${totalStudents} students — modules interleaved`,
    assignments
  };
}

// ── Auto-init: try to restore file handle silently ────────
(async () => {
  await _tryRestoreHandle();
})();
