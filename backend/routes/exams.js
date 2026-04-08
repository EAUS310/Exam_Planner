const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EXAMS_FILE = path.join(__dirname, '../../data/exams.json');
const CLASSROOMS_FILE = path.join(__dirname, '../../data/classrooms.json');

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

// POST /api/exams/:id/optimize-seating  — AI-powered seat optimization
router.post('/:id/optimize-seating', async (req, res) => {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      return res.status(400).json({
        error: 'ANTHROPIC_API_KEY is not configured. Please add your API key to the .env file.'
      });
    }

    const client = new Anthropic({ apiKey });
    const exams = readExams();
    const classrooms = readClassrooms();

    const examIdx = exams.findIndex(e => e.id === req.params.id);
    if (examIdx === -1) return res.status(404).json({ error: 'Exam not found' });

    const exam = exams[examIdx];
    const primaryVenueId = getVenueIds(exam)[0];
    const classroom = classrooms.find(c => c.id === primaryVenueId);
    if (!classroom) return res.status(400).json({ error: 'Venue not found' });

    // Find all exams sharing the primary venue on same date
    const coExams = exams.filter(e => getVenueIds(e).includes(primaryVenueId) && e.date === exam.date);

    const allSeats = generateAllSeats(classroom);
    const totalStudents = coExams.reduce((sum, e) => sum + e.students.length, 0);

    if (totalStudents > allSeats.length) {
      return res.status(400).json({
        error: `Not enough seats. Total students: ${totalStudents}, Available seats: ${allSeats.length}`
      });
    }

    // Build prompt
    const examDescriptions = coExams.map(e =>
      `  - Exam ID: "${e.id}" | Module: ${e.moduleCode} ${e.moduleName} (${e.examName}) | Students (${e.students.length}): ${e.students.map(s => `${s.studentId} "${s.studentName}"`).join(', ')}`
    ).join('\n');

    const prompt = `You are an expert exam coordinator. Your task is to assign seats in an exam venue so that students from DIFFERENT modules alternate (to reduce cheating risk). Students from the same module should NOT sit next to each other (horizontally or vertically) if possible.

VENUE: ${classroom.name}
LAYOUT: Columns ${classroom.columns.join(', ')} × Rows ${classroom.rows.join(', ')}
TOTAL AVAILABLE SEATS: ${allSeats.length}
SEAT ORDER (column-major): ${allSeats.slice(0, 20).join(', ')}${allSeats.length > 20 ? ` ... (${allSeats.length} total)` : ''}

EXAMS SHARING THIS VENUE ON ${exam.date}:
${examDescriptions}

TOTAL STUDENTS TO SEAT: ${totalStudents}

Rules:
1. Every student must get a unique seat from the available seats listed above.
2. Interleave students from different exams so adjacent seats belong to different modules.
3. Use only valid seats from the venue layout.
4. Return ONLY valid JSON, nothing else.

Return this exact JSON structure:
{
  "assignments": [
    {"examId": "exam-id-here", "studentId": "student-id-here", "seat": "A1"},
    {"examId": "exam-id-here", "studentId": "student-id-here", "seat": "A2"}
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8096,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = message.content[0].text;

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'AI returned an unexpected response format', raw: responseText });
    }

    let aiResult;
    try {
      aiResult = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      return res.status(500).json({ error: 'Failed to parse AI response as JSON', raw: responseText });
    }

    // Validate assignments
    const assignments = aiResult.assignments || [];
    const validSeatsSet = new Set(allSeats);
    const usedSeats = new Set();
    const errors = [];

    for (const a of assignments) {
      if (!validSeatsSet.has(a.seat)) {
        errors.push(`Invalid seat: ${a.seat}`);
      } else if (usedSeats.has(a.seat)) {
        errors.push(`Duplicate seat: ${a.seat}`);
      } else {
        usedSeats.add(a.seat);
      }
    }

    if (errors.length > 0) {
      return res.status(500).json({ error: 'AI returned invalid assignments', details: errors });
    }

    // Apply assignments to exams
    for (const e of coExams) {
      const eIdx = exams.findIndex(ex => ex.id === e.id);
      exams[eIdx].students = exams[eIdx].students.map(student => {
        const assignment = assignments.find(a => a.examId === e.id && a.studentId === student.studentId);
        return { ...student, seatAssigned: assignment ? assignment.seat : student.seatAssigned };
      });
    }

    writeExams(exams);

    res.json({
      success: true,
      message: `AI optimized seating for ${coExams.length} exam(s) with ${totalStudents} students`,
      assignments
    });

  } catch (err) {
    console.error('AI optimization error:', err);
    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid Anthropic API key. Please check your .env file.' });
    }
    res.status(500).json({ error: 'AI optimization failed: ' + err.message });
  }
});

module.exports = router;
