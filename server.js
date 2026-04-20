require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files (assets/ is inside frontend/, so /assets/* resolves automatically)
app.use(express.static(path.join(__dirname, 'docs')));

// API Routes
app.use('/api/exams', require('./backend/routes/exams'));
app.use('/api/classrooms', require('./backend/routes/classrooms'));

// Fallback: serve index.html for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'docs/index.html'));
  }
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log(`  Server started — open: \x1b[36m\x1b[4m${url}\x1b[0m`);
  console.log('');
});
