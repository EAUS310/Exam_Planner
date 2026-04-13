# FOE Exam Planner
### Emirates Aviation University — Faculty of Engineering

A fully static exam scheduling and seat assignment tool built with vanilla HTML/CSS/JavaScript. No server or installation required — runs entirely in the browser.

**Live app:** https://eaus310.github.io/Exam_Planner/

---

## Features

- **Exam Management** — Create, edit, and delete exam entries with multi-venue support
- **Student Import** — Paste raw student data (ID + Name) and auto-parse it
- **Automatic Seat Assignment** — Alphabetical seat allocation across one or more venues, conflict-aware
- **Manual Seat Editing** — Override any student's assigned seat individually
- **Seating Optimisation** — Interleaves students from different modules sharing a venue (column-alternating algorithm) to reduce copying risk
- **Invigilator Scheduling** — Assign and manage invigilators per exam
- **Shared Modules** — View and manage modules that span multiple exams or venues
- **Shared Venues** — Track and import venue data, detect scheduling conflicts across exams
- **Exam Schedule Page** — Program-grouped schedule view with filters and A3 print layout
- **Print Outputs**:
  - Attendance Sheet (student list with signature column, sorted by seat)
  - Seating Plan (posted outside the venue, grouped by venue)
- **Offline-first** — All data is stored in `localStorage`; optional sync to a local `exams.json` file via the File System Access API

---

## Project Structure

```
exam-planner/
├── frontend/                        # Static app (served by GitHub Pages or Express)
│   ├── index.html                   # Exam entry form + exam list
│   ├── students.html                # Student management per exam
│   ├── schedule.html                # Exam schedule view
│   ├── schedule-invigilators.html   # Invigilator assignment
│   ├── shared-modules.html          # Shared module management
│   ├── shared-venues.html           # Venue management + import
│   ├── attendance-print.html        # Printable attendance sheet
│   ├── seating-print.html           # Printable seating plan
│   ├── css/
│   │   ├── style.css                # Screen styles
│   │   ├── sidebar.css              # Sidebar styles
│   │   └── print.css                # Print-optimized styles
│   ├── js/
│   │   ├── storage.js               # Data layer (localStorage + file sync)
│   │   ├── main.js                  # Exam list page logic
│   │   ├── students.js              # Student management logic
│   │   ├── schedule.js              # Schedule page logic
│   │   ├── schedule-invigilators.js # Invigilator page logic
│   │   ├── shared-modules.js        # Shared modules page logic
│   │   └── shared-venues.js         # Shared venues page logic
│   ├── data/
│   │   ├── exams.json               # Seed data (loaded on first visit if localStorage is empty)
│   │   └── classrooms.json          # Venue/room definitions
│   └── assets/
│       ├── EAU_Logo.png
│       └── EAU_Group_logo.png
├── backend/
│   └── routes/
│       ├── exams.js                 # REST API: exam CRUD
│       └── classrooms.js            # REST API: classroom data
├── server.js                        # Express server (local dev only)
├── package.json
└── CLAUDE.md                        # Claude Code context for AI-assisted development
```

---

## Usage

### Opening the App

**Option A — GitHub Pages (recommended, works on any device):**
Visit https://eaus310.github.io/Exam_Planner/

**Option B — Local file:**
Open `frontend/index.html` directly in a modern browser (Chrome or Edge recommended for full file-sync support).

**Option C — Express dev server:**
```bash
npm install
npm start        # runs on http://localhost:3000
# or
npm run dev      # auto-restarts on file changes (requires nodemon)
```

---

### Creating an Exam
1. Click **"+ Add Exam Entry"** on the main page
2. Fill in the exam details (module, date, time, instructor)
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

### Printing
1. Click **"🖨️ Print"** next to an exam on the main page
2. Choose **Attendance Sheet** or **Seating Plan**
3. Use the browser's print dialog (Ctrl+P) or save as PDF

---

## Data Storage

All data is stored in **`localStorage`** in the browser — no server required.

### Syncing to a File (optional)
Click **"📂 Connect exams.json"** in the sidebar to link a local `exams.json` file. Once connected, every change is automatically written back to that file via the File System Access API (Chrome/Edge only).

To export a snapshot at any time, click **"⬇️ Download exams.csv"**.

### Venues / Classrooms

Venue definitions are stored in `frontend/data/classrooms.json` and loaded via `js/storage.js → getClassrooms()`. Two layout formats are supported:

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
- The **Optimise Seating** button assigns entire columns to alternating modules so adjacent seats always belong to different subjects

---

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+) — no framework, no build step
- **Storage**: `localStorage` + File System Access API (optional file sync)
- **Hosting**: GitHub Pages (static, no build step)
- **Print**: CSS `@media print`, `@page` rules (A3 landscape for schedule)
- **Backend** (`server.js`): Express + Node.js — for local development only; not used by the deployed app

---

## Pushing Changes to GitHub

```bash
# Stage specific files
git add frontend/data/exams.json

# Or stage all changes
git add .

# Commit and push
git commit -m "Your description of what changed"
git push
```

**Via VS Code:**
1. Open the **Source Control** panel (`Ctrl+Shift+G`)
2. Stage files with **+**, write a commit message, click **✓ Commit**
3. Click **Sync Changes** to push

GitHub will update the live site at https://eaus310.github.io/Exam_Planner/ automatically within ~30 seconds after each push.

---

## License

Internal use — Emirates Aviation University
