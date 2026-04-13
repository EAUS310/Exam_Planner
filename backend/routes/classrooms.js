const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const CLASSROOMS_FILE = path.join(__dirname, '../../frontend/data/classrooms.json');

function computeTotalSeats(c) {
  if (c.columnRows) {
    return Object.values(c.columnRows).reduce((sum, rows) => sum + rows.length, 0);
  }
  return (c.columns || []).length * (c.rows || []).length;
}

function readClassrooms() {
  const data = JSON.parse(fs.readFileSync(CLASSROOMS_FILE, 'utf8'));
  return data.map(c => ({ ...c, totalSeats: computeTotalSeats(c) }));
}

// GET /api/classrooms
router.get('/', (req, res) => {
  try {
    const classrooms = readClassrooms();
    res.json(classrooms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read classrooms data' });
  }
});

// GET /api/classrooms/:id
router.get('/:id', (req, res) => {
  try {
    const classrooms = readClassrooms();
    const classroom = classrooms.find(c => c.id === req.params.id);
    if (!classroom) return res.status(404).json({ error: 'Classroom not found' });
    res.json(classroom);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read classrooms data' });
  }
});

module.exports = router;
