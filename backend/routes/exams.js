const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EXAMS_FILE = path.join(__dirname, '../../frontend/data/exams.json');
const CLASSROOMS_FILE = path.join(__dirname, '../../frontend/data/classrooms.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readExams() {
  return JSON.parse(fs.readFileSync(EXAMS_FILE, 'utf8'));
}

function writeExams(data) {
  fs.writeFileSync(EXAMS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function readClassrooms() {
  return JSON.parse(fs.readFileSync(CLASSROOMS_FILE, 'utf8'));
}

/**
 * Generate all seats for a classroom in column-major order (A1, A2, … B1, B2, …)
 * Supports both uniform layout (columns + rows) and irregular layout (columnRows)
 */
function generateAllSeats(classroom) {
  const seats = [];
  if (classroom.columnRows) {
    for (const [col, rows] of Object.entries(classroom.columnRows)) {
      for (const row of rows) {
        seats.push(`${col}${row}`);
      }
    }
  } else {
    for (const col of classroom.columns) {
      for (const row of classroom.rows) {
        seats.push(`${col}${row}`);
      }
    }
  }
  return seats;
}

/**
 * Normalize venue IDs — supports both old single venueId and new venueIds array
 */
function getVenueIds(exam) {
  if (exam.venueIds && exam.venueIds.length > 0) return exam.venueIds;
  if (exam.venueId) return [exam.venueId];
  return [];
}

/**
 * Assign seats across multiple venues.
 * Students are sorted alphabetically by last name, then filled venue by venue.
 * Each student gets a venueId indicating which room they are in.
 */
function assignSeatsMultiVenue(exam, classrooms, allExams) {
  const venueIds = getVenueIds(exam);

  // Sort students alphabetically by last name
  const sorted = [...exam.students].sort((a, b) => {
    const lastA = (a.studentName || '').trim().split(' ').pop().toLowerCase();
    const lastB = (b.studentName || '').trim().split(' ').pop().toLowerCase();
    return lastA.localeCompare(lastB);
  });

  let studentIdx = 0;
  const result = [];

  for (const venueId of venueIds) {
    const classroom = classrooms.find(c => c.id === venueId);
    if (!classroom) continue;

    // Seats taken by OTHER exams at the same venue and date
    const takenSeats = new Set();
    allExams.forEach(e => {
      if (e.id === exam.id) return;
      const eVenueIds = getVenueIds(e);
      if (eVenueIds.includes(venueId) && e.date === exam.date) {
        e.students.forEach(s => {
          if (s.seatAssigned && (s.venueId === venueId || (!s.venueId && e.venueId === venueId))) {
            takenSeats.add(s.seatAssigned);
          }
        });
      }
    });

    const allSeats = generateAllSeats(classroom);
    const available = allSeats.filter(s => !takenSeats.has(s));
    let seatIdx = 0;

    while (studentIdx < sorted.length && seatIdx < available.length) {
      result.push({ ...sorted[studentIdx], venueId, seatAssigned: available[seatIdx] });
      studentIdx++;
      seatIdx++;
    }
  }

  // Overflow students (more students than total capacity)
  while (studentIdx < sorted.length) {
    result.push({ ...sorted[studentIdx], venueId: venueIds[0] || null, seatAssigned: null });
    studentIdx++;
  }

  return result;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/exams
router.get('/', (req, res) => {
  try {
    res.json(readExams());
  } catch (err) {
    res.status(500).json({ error: 'Failed to read exams' });
  }
});

// POST /api/exams
router.post('/', (req, res) => {
  try {
    const exams = readExams();
    const newExam = {
      id: 'exam-' + uuidv4(),
      moduleCode: req.body.moduleCode || '',
      moduleName: req.body.moduleName || '',
      examName: req.body.examName || 'Midterm',
      semester: req.body.semester || '',
      date: req.body.date || '',
      startTime: req.body.startTime || '',
      endTime: req.body.endTime || '',
      instructorName: req.body.instructorName || '',
      invigilatorName: req.body.invigilatorName || '',
      venueIds: Array.isArray(req.body.venueIds) ? req.body.venueIds : (req.body.venueId ? [req.body.venueId] : []),
      venueId: Array.isArray(req.body.venueIds) && req.body.venueIds.length > 0 ? req.body.venueIds[0] : (req.body.venueId || ''),
      program: req.body.program || '',
      students: [],
      createdAt: new Date().toISOString()
    };
    exams.push(newExam);
    writeExams(exams);
    res.status(201).json(newExam);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create exam' });
  }
});

// GET /api/exams/:id
router.get('/:id', (req, res) => {
  try {
    const exam = readExams().find(e => e.id === req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read exam' });
  }
});

// PUT /api/exams/:id
router.put('/:id', (req, res) => {
  try {
    const exams = readExams();
    const idx = exams.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Exam not found' });

    const updated = {
      ...exams[idx],
      moduleCode: req.body.moduleCode ?? exams[idx].moduleCode,
      moduleName: req.body.moduleName ?? exams[idx].moduleName,
      examName: req.body.examName ?? exams[idx].examName,
      semester: req.body.semester ?? exams[idx].semester,
      date: req.body.date ?? exams[idx].date,
      startTime: req.body.startTime ?? exams[idx].startTime,
      endTime: req.body.endTime ?? exams[idx].endTime,
      instructorName: req.body.instructorName ?? exams[idx].instructorName,
      invigilatorName: req.body.invigilatorName ?? exams[idx].invigilatorName,
      venueIds: Array.isArray(req.body.venueIds) ? req.body.venueIds : (exams[idx].venueIds || (exams[idx].venueId ? [exams[idx].venueId] : [])),
      venueId: Array.isArray(req.body.venueIds) && req.body.venueIds.length > 0 ? req.body.venueIds[0] : (exams[idx].venueId || ''),
      program: req.body.program ?? exams[idx].program ?? ''
    };

    exams[idx] = updated;
    writeExams(exams);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', (req, res) => {
  try {
    let exams = readExams();
    const idx = exams.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Exam not found' });
    exams.splice(idx, 1);
    writeExams(exams);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

// POST /api/exams/:id/students  — replaces student list & auto-assigns seats
router.post('/:id/students', (req, res) => {
  try {
    const exams = readExams();
    const classrooms = readClassrooms();
    const idx = exams.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Exam not found' });

    const exam = exams[idx];
    const venueIds = getVenueIds(exam);
    if (venueIds.length === 0) return res.status(400).json({ error: 'No venue assigned to this exam' });

    // Accept array of { studentId, studentName }
    exam.students = (req.body.students || []).map(s => ({
      studentId: s.studentId,
      studentName: s.studentName,
      seatAssigned: null,
      venueId: null
    }));

    // Auto-assign seats across all venues (alphabetical order)
    exam.students = assignSeatsMultiVenue(exam, classrooms, exams);

    exams[idx] = exam;
    writeExams(exams);
    res.json(exam);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save students' });
  }
});

// PATCH /api/exams/:id/students/:studentId/seat  — manually update a single student's seat
router.patch('/:id/students/:studentId/seat', (req, res) => {
  try {
    const exams = readExams();
    const idx = exams.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Exam not found' });

    const exam = exams[idx];
    const studentIdx = exam.students.findIndex(s => s.studentId === req.params.studentId);
    if (studentIdx === -1) return res.status(404).json({ error: 'Student not found in this exam' });

    const newSeat = (req.body.seat || '').trim().toUpperCase();
    if (!newSeat) return res.status(400).json({ error: 'Seat value is required' });

    // Check seat is not already taken by another student in this or co-exams at the same venue/date
    const venueId = exam.students[studentIdx].venueId || getVenueIds(exam)[0];
    const conflict = exams.find(e => {
      const eVenueIds = getVenueIds(e);
      if (!eVenueIds.includes(venueId)) return false;
      if (e.date !== exam.date) return false;
      return e.students.some(s => {
        // Skip the student being edited
        if (e.id === exam.id && s.studentId === req.params.studentId) return false;
        return s.seatAssigned === newSeat && s.venueId === venueId;
      });
    });

    if (conflict) return res.status(409).json({ error: `Seat ${newSeat} is already assigned to another student` });

    exam.students[studentIdx].seatAssigned = newSeat;
    exams[idx] = exam;
    writeExams(exams);
    res.json(exam);

  } catch (err) {
    res.status(500).json({ error: 'Failed to update seat' });
  }
});

// DELETE /api/exams/:id/students/:studentId
router.delete('/:id/students/:studentId', (req, res) => {
  try {
    const exams = readExams();
    const classrooms = readClassrooms();
    const idx = exams.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Exam not found' });

    const exam = exams[idx];
    const before = exam.students.length;
    exam.students = exam.students.filter(s => s.studentId !== req.params.studentId);

    if (exam.students.length === before) {
      return res.status(404).json({ error: 'Student not found in this exam' });
    }

    // Re-assign seats after removal
    const venueIds = getVenueIds(exam);
    if (venueIds.length > 0) {
      exam.students = assignSeatsMultiVenue(exam, classrooms, exams);
    }

    exams[idx] = exam;
    writeExams(exams);
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove student' });
  }
});

// POST /api/exams/:id/optimize-seating  — interleave students from co-exams sharing a venue
router.post('/:id/optimize-seating', (req, res) => {
  try {
    const exams      = readExams();
    const classrooms = readClassrooms();

    const examIdx = exams.findIndex(e => e.id === req.params.id);
    if (examIdx === -1) return res.status(404).json({ error: 'Exam not found' });

    const exam           = exams[examIdx];
    const primaryVenueId = getVenueIds(exam)[0];
    const classroom      = classrooms.find(c => c.id === primaryVenueId);
    if (!classroom) return res.status(400).json({ error: 'Venue not found' });

    // All exams sharing the primary venue on the same date
    const coExams       = exams.filter(e => getVenueIds(e).includes(primaryVenueId) && e.date === exam.date);
    const allSeats      = generateAllSeats(classroom);
    const totalStudents = coExams.reduce((sum, e) => sum + e.students.length, 0);

    if (totalStudents > allSeats.length) {
      return res.status(400).json({
        error: `Not enough seats. Total students: ${totalStudents}, Available seats: ${allSeats.length}`
      });
    }

    // Column-alternating interleave:
    // Each column is assigned to one exam (cycling A→Exam1, B→Exam2, C→Exam1…).
    // All rows within a column are filled from that exam before moving to the next column.
    const columns = classroom.columnRows
      ? Object.keys(classroom.columnRows)
      : classroom.columns;

    // Sort each exam's students alphabetically by name
    const queues = coExams.map(e => ({
      examId: e.id,
      students: [...e.students].sort((a, b) =>
        (a.studentName || '').localeCompare(b.studentName || '')
      )
    }));

    const assignments = [];

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const col  = columns[colIdx];
      const rows = classroom.columnRows ? classroom.columnRows[col] : classroom.rows;

      // Primary exam for this column (cycles through exams per column)
      const primaryQueue = queues[colIdx % queues.length];

      for (const row of rows) {
        // Use primary exam's queue; fall back to any exam that still has students
        let chosen = null;
        if (primaryQueue.students.length > 0) {
          chosen = { examId: primaryQueue.examId, student: primaryQueue.students.shift() };
        } else {
          for (const q of queues) {
            if (q.students.length > 0) {
              chosen = { examId: q.examId, student: q.students.shift() };
              break;
            }
          }
        }
        if (!chosen) break;
        assignments.push({ examId: chosen.examId, studentId: chosen.student.studentId, seat: `${col}${row}` });
      }
    }

    // Apply to exams and sort each exam's students by seat label (A1, A2… B1, B2…)
    for (const e of coExams) {
      const eIdx = exams.findIndex(ex => ex.id === e.id);
      exams[eIdx].students = exams[eIdx].students
        .map(student => {
          const a = assignments.find(x => x.examId === e.id && x.studentId === student.studentId);
          return { ...student, seatAssigned: a ? a.seat : student.seatAssigned };
        })
        .sort((a, b) => {
          const sA = a.seatAssigned || '';
          const sB = b.seatAssigned || '';
          const colA = sA.charAt(0), colB = sB.charAt(0);
          const rowA = parseInt(sA.slice(1)) || 0;
          const rowB = parseInt(sB.slice(1)) || 0;
          if (colA !== colB) return colA.localeCompare(colB);
          return rowA - rowB;
        });
    }

    writeExams(exams);

    res.json({
      success: true,
      message: `Seating optimized for ${coExams.length} exam(s) with ${totalStudents} students — modules interleaved`,
      assignments
    });

  } catch (err) {
    console.error('Optimize seating error:', err);
    res.status(500).json({ error: 'Optimize seating failed: ' + err.message });
  }
});

module.exports = router;
