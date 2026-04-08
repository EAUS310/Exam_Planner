# Exam Planning Tool
### Emirates Aviation University

A full-stack exam scheduling and seat assignment tool built with Node.js/Express and vanilla HTML/CSS/JavaScript.

---

## Features

- **Exam Management** — Create, view, and delete exam entries
- **Student Import** — Paste raw student data (ID + Name) and auto-parse it
- **Automatic Seat Assignment** — Sequential seat allocation, conflict-aware across shared venues
- **AI Seating Optimization** — Uses Claude AI to interleave students from different modules (reduces copying)
- **Print Outputs**:
  - Attendance Sheet (with signature column, invigilator info)
  - Seating Plan (for posting outside the exam room)
- **Multi-exam venue awareness** — Warns when multiple exams share the same venue/date

---

## Project Structure

```
exam-planner/
├── backend/
│   ├── server.js              # Express server entry point
│   └── routes/
│       ├── exams.js           # Exam CRUD + seat assignment + AI optimize
│       └── classrooms.js      # Classroom data API
├── frontend/
│   ├── index.html             # Exam entry form + exam list
│   ├── students.html          # Student management per exam
│   ├── attendance-print.html  # Printable attendance sheet
│   ├── seating-print.html     # Printable seating plan
│   ├── css/
│   │   ├── style.css          # Screen styles
│   │   └── print.css          # Print-optimized styles
│   └── js/
│       ├── main.js            # Main page logic
│       └── students.js        # Student management logic
├── data/
│   ├── classrooms.json        # Venue definitions (edit manually)
│   └── exams.json             # Exam data (managed via UI)
├── assets/
│   └── EAU_Logo.png           # University logo
├── .env                       # API keys (not committed to git)
├── .gitignore
└── package.json
```

---

## Setup Instructions

### 1. Prerequisites
- **Node.js** v16 or newer — [Download](https://nodejs.org/)
- An **Anthropic API key** (only required for the AI seating optimization feature)

### 2. Install Dependencies

Open a terminal in the `exam-planner/` folder and run:

```bash
npm install
```

### 3. Configure Environment

Edit the `.env` file:

```env
ANTHROPIC_API_KEY=your_actual_api_key_here
PORT=3000
```

> The AI optimization feature requires a valid key. All other features work without it.

### 4. Start the Server

```bash
npm start
```

Or, for auto-restart during development:

```bash
npm run dev
```

### 5. Open in Browser

Navigate to: **http://localhost:3000**

---

## Usage Guide

### Creating an Exam
1. Fill in the exam form on the main page
2. Select the venue from the dropdown
3. Click **"Create Exam"**

### Adding Students
1. Click **"👥 Students"** next to any exam
2. Paste student data in the textarea — one per line:
   ```
   2024001    Ali Hassan Mohammed
   2024002    Fatima Al-Zahra Ahmed
   ```
   (ID and name separated by tab or multiple spaces)
3. Click **"Parse & Preview"** to review parsed data
4. Click **"Save Students & Assign Seats"**

### Printing
1. Click **"🖨️ Print"** next to an exam on the main page
2. Choose **Attendance Sheet** or **Seating Plan**
3. Use the browser's print dialog (or Ctrl+P / Cmd+P) — or save as PDF

### AI Seating Optimization
- Only available when **multiple exams share the same venue and date**
- Navigate to the Student Management page for any of the shared exams
- Click **"🤖 AI Optimize Seating for All Exams in This Venue"**
- The AI will interleave students from different modules to reduce copying risk
- Requires a valid `ANTHROPIC_API_KEY` in `.env`

---

## Data Storage

All data is stored in local JSON files in the `/data` directory:

- `classrooms.json` — Pre-defined venues (edit manually to add more)
- `exams.json` — Created automatically, modified via the UI

### Adding New Classrooms

Edit `data/classrooms.json` directly:

```json
{
  "id": "room-301",
  "name": "Room 301",
  "totalSeats": 30,
  "columns": ["A", "B", "C"],
  "rows": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
}
```

---

## Seat Assignment Logic

Seats are generated in **column-major order**: A1, A2, … A[max], B1, B2, …

When multiple exams share a venue on the same date:
- Seats already assigned to other exams are **automatically skipped**
- Students can only receive seats not taken by other exams

The **AI optimization** goes further by interleaving students from different modules so adjacent seats belong to different subjects.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/exams` | List all exams |
| POST | `/api/exams` | Create new exam |
| GET | `/api/exams/:id` | Get exam by ID |
| PUT | `/api/exams/:id` | Update exam |
| DELETE | `/api/exams/:id` | Delete exam |
| POST | `/api/exams/:id/students` | Replace student list + auto-assign seats |
| DELETE | `/api/exams/:id/students/:studentId` | Remove one student |
| POST | `/api/exams/:id/optimize-seating` | AI-powered seat optimization |
| GET | `/api/classrooms` | List all classrooms |
| GET | `/api/classrooms/:id` | Get classroom by ID |

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Storage**: JSON files (no database)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Print**: CSS `@media print`, `@page` rules

---

## License

Internal use — Emirates Aviation University
