require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve assets (logo etc.)
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API Routes
app.use('/api/exams', require('./backend/routes/exams'));
app.use('/api/classrooms', require('./backend/routes/classrooms'));

// Fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend/index.html'));
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   Emirates Aviation University                   ║');
  console.log('  ║   Exam Planning Tool                             ║');
  console.log(`  ║   Running at http://localhost:${PORT}               ║`);
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
});
