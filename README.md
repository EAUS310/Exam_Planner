# FOE Exam Planner
### Emirates Aviation University — Faculty of Engineering

A full-stack exam scheduling and seat assignment tool built with Node.js/Express and vanilla HTML/CSS/JavaScript.

---

## Features

- **Exam Management** — Create, edit, and delete exam entries with multi-venue support
- **Student Import** — Paste raw student data (ID + Name) and auto-parse it
- **Automatic Seat Assignment** — Alphabetical seat allocation across one or more venues, conflict-aware
- **Manual Seat Editing** — Override any student's assigned seat individually
- **Seating Optimisation** — Interleaves students from different modules sharing a venue (column-alternating algorithm) to reduce copying risk
- **Exam Schedule Page** — Program-grouped schedule view with filters and A3 print layout
- **Print Outputs**:
  - Attendance Sheet (student list with signature column, sorted by seat)
  - Seating Plan (posted outside the venue, grouped by venue)
- **Multi-venue awareness** — Warns when multiple exams share the same venue and date

---

## Project Structure

```
exam-planner/
├── backend/
│   ├── server.js              # Express server entry point
│   └── routes/
│       ├── exams.js           # Exam CRUD + seat assignment + optimisation
│       └── classrooms.js      # Classroom data API
├── frontend/
│   ├── index.html             # Exam entry form + exam list
│   ├── students.html          # Student management per exam
│   ├── schedule.html          # Exam schedule view
│   ├── attendance-print.html  # Printable attendance sheet
│   ├── seating-print.html     # Printable seating plan
│   ├── css/
│   │   ├── style.css          # Screen styles
│   │   ├── sidebar.css        # Sidebar styles
│   │   └── print.css          # Print-optimized styles
│   └── js/
│       ├── main.js            # Exam list page logic
│       ├── students.js        # Student management logic
│       └── schedule.js        # Schedule page logic
├── data/
│   ├── classrooms.json        # Venue definitions (edit manually)
│   └── exams.json             # Exam data (managed via UI)
├── assets/
│   └── EAU_Group_logo.png     # University logo
├── .env                       # Port configuration
├── .gitignore
└── package.json
```

---

## Setup Instructions

### 1. Prerequisites
- **Node.js** v16 or newer — [Download](https://nodejs.org/)

### 2. Install Dependencies

Open a terminal in the `exam-planner/` folder and run:

```bash
npm install
```

### 3. Configure Environment

The `.env` file only needs a port number:

```env
PORT=3000
```

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
1. Click **"+ Add Exam Entry"** on the main page
2. Fill in the exam details (module, date, time, venue, instructor)
3. Select one or more venues using the checklist
4. Click **"Create Exam"**

### Adding Students
1. Click **"👥 Students"** next to any exam
2. Paste student data in the textarea — one per line:
   ```
   2024001    Ali Hassan Mohammed
   2024002    Fatima Al-Zahra Ahmed
   ```
   (ID and name separated by tab or multiple spaces)
3. Click **"Parse & Preview"** to review parsed data
4. Click **"Save Students & Assign Seats"** — seats are auto-assigned alphabetically

### Editing a Seat
1. On the Student Management page, click **"✏️ Edit Seat"** next to any student
2. Enter the new seat label (e.g. `B4`)
3. Click **"Update Seat"** — the system checks for conflicts before saving

### Seating Optimisation
- Available when **multiple exams share the same venue and date**
- Navigate to the Student Management page for any of the shared exams
- Click **"🔀 Optimise Seating for All Exams in This Venue"**
- Students from different modules are interleaved column by column to reduce copying risk
- No API key required — fully algorithmic

### Printing
1. Click **"🖨️ Print"** next to an exam on the main page
2. Choose **Attendance Sheet** or **Seating Plan**
3. Use the browser's print dialog (Ctrl+P) or save as PDF

---

## Data Storage

All data is stored in local JSON files in the `/data` directory:

- `classrooms.json` — Pre-defined venues (edit manually to add or modify)
- `exams.json` — Created automatically, modified via the UI

### Adding or Editing Classrooms

Edit `data/classrooms.json` directly. Two layout formats are supported:

**Uniform layout** (same number of rows in every column):
```json
{
  "id": "room-301",
  "name": "Room 301",
  "columns": ["A", "B", "C"],
  "rows": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
}
```

**Irregular layout** (different rows per column):
```json
{
  "id": "exam-hall-2",
  "name": "Exam Hall 2",
  "columnRows": {
    "A": [1, 2, 3, 4, 5],
    "B": [1, 2, 3, 4, 5, 6, 7],
    "C": [1, 2, 3]
  }
}
```

Total seats are calculated automatically — no need to specify `totalSeats`.

---

## Seat Assignment Logic

Seats are generated in **column-major order**: A1, A2, … A[max], B1, B2, …

Students are sorted **alphabetically by last name** before assignment.

When multiple exams share a venue on the same date:
- Seats already taken by other exams are automatically skipped
- The **Optimise Seating** button goes further by assigning entire columns to alternating modules, so adjacent seats always belong to different subjects

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
| PATCH | `/api/exams/:id/students/:studentId/seat` | Update a single student's seat |
| DELETE | `/api/exams/:id/students/:studentId` | Remove one student |
| POST | `/api/exams/:id/optimize-seating` | Algorithmic column-alternating seat optimisation |
| GET | `/api/classrooms` | List all classrooms |
| GET | `/api/classrooms/:id` | Get classroom by ID |

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Storage**: JSON flat files (no database required)
- **Print**: CSS `@media print`, `@page` rules (A3 landscape for schedule)

---

## License

Internal use — Emirates Aviation University
