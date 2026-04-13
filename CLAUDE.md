# FOE Exam Planner — Claude Context

## What This App Does

Exam scheduling and seat assignment tool for the Faculty of Engineering at Emirates Aviation University. Manages exams, imports students, auto-assigns seats across one or more venues, schedules invigilators, and generates printable attendance sheets and seating plans.

Live at: https://eaus310.github.io/Exam_Planner/

## Tech Stack

- **Frontend**: Vanilla HTML5 / CSS3 / JavaScript (ES6+) — no framework, no build step
- **Storage**: `localStorage` (primary) + optional File System Access API for live file sync to `data/exams.json`
- **Hosting**: GitHub Pages (fully static)
- **Print**: CSS `@media print` / `@page` rules (A3 landscape for schedule)
- **Backend** (`server.js`): Express + Node.js server — present in the repo but not used by the deployed app; kept for local development or future API use

## Key Files

| File | Purpose |
|---|---|
| `index.html` / `js/main.js` | Exam list + add/edit/delete exam form |
| `students.html` / `js/students.js` | Student import, seat assignment, seat editing, optimise seating |
| `schedule.html` / `js/schedule.js` | Program-grouped schedule view, filters, A3 print |
| `schedule-invigilators.html` / `js/schedule-invigilators.js` | Invigilator assignment per exam |
| `shared-modules.html` / `js/shared-modules.js` | Modules spanning multiple exams |
| `shared-venues.html` / `js/shared-venues.js` | Venue tracking, conflict detection, import |
| `attendance-print.html` | Printable attendance sheet (signature column, sorted by seat) |
| `seating-print.html` | Printable seating plan (grouped by venue) |
| `js/storage.js` | Data layer — all localStorage reads/writes and file sync logic |
| `data/exams.json` | Seed data loaded on first visit if localStorage is empty |
| `data/classrooms.json` | Venue/room definitions |
| `css/style.css` | Screen styles |
| `css/sidebar.css` | Sidebar styles |
| `css/print.css` | Print-specific styles |

## Data Model

All data lives in `localStorage`. Key entries:
- `exams` — array of exam objects (id, module, date, time, instructor, venues, students, invigilators)
- Each student has: `id`, `name`, `seat` (e.g. `"B4"`)
- Venues defined in `js/storage.js` → `getClassrooms()` — supports uniform and irregular column layouts

## Seat Assignment Logic

- Seats generated in **column-major order**: A1, A2, … A[n], B1, B2, …
- Students sorted **alphabetically by last name** before assignment
- When exams share a venue + date, already-taken seats are skipped automatically
- **Optimise Seating**: interleaves students from different modules column-by-column to reduce copying risk

## Development Notes

- No npm build required for the frontend — open `index.html` directly or push to GitHub Pages
- To run the Express backend locally: `npm start` (port 3000)
- Chrome/Edge required for File System Access API (file sync feature)
- `data/exams.json` is the canonical data export; update it and push to seed a fresh browser
