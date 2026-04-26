# Project Standard Operating Procedure

## Trigger Phrase: "Implement architecture amendments"

Whenever the user says **"Implement architecture amendments"**, follow these steps in order:

---

### Step 1 — Create/Update `.claudeignore`

Include the following entries to reduce token usage during codebase scans:

```
node_modules/
dist/
build/
.env
*.log
*.map
*.min.js
*.min.css
large-assets/
```

---

### Step 2 — Create/Update `CLAUDE.md`

Summarize the project so future sessions have immediate context without needing to scan the full tree. Include:

- **What the app does** — one-paragraph overview
- **Tech stack** — frameworks, languages, tooling
- **Key file paths** — entry points, config files, data layer, styles
- **Data model** — how data flows and where it lives
- **Hosting/build notes** — any deployment-specific details

---

### Step 3 — Modularize Structure

Reorganize the project layout as follows:

| Source | Destination |
|---|---|
| Business/data logic | `/src/services/` |
| UI components | `/src/components/` |
| Production build output | `/docs/` (for GitHub Pages compatibility) |

Move files incrementally and confirm each move before proceeding.

---

### Step 4 — The Audit (Quality Control)

Run the following checks after the structure is in place, before any build:

**Dead Code Purge**
- Identify and remove unused variables, functions, and imports
- Keeps the codebase lean and reduces token usage in future sessions
- Use grep/search to confirm nothing references the removed code before deleting

**Performance Check**
- Scan for inefficient loops or heavy logic, particularly in scheduling algorithms
- Check for redundant UI re-renders or DOM manipulations that fire unnecessarily
- Flag any synchronous operations that could block the main thread

**Bug Hunt**
- Review form validation and error handling for edge cases (e.g., overlapping exam dates, empty required fields, invalid seat assignments)
- Confirm that all user-facing error messages are meaningful and actionable
- Test boundary conditions in seat assignment and invigilator scheduling logic

---

### Step 5 — Update Imports

After restructuring, automatically audit and fix all `import` / `require` / `<script src>` paths to reflect the new locations. Ensure:

- No broken references remain
- Relative paths are correct relative to the file's new location
- Any HTML files referencing JS/CSS assets are updated accordingly

---

### Step 6 — Deployment & Verification

**Hosting Sync**
- Verify the `base` path in any config file (e.g., `vite.config.js`, `package.json`, or equivalent) matches the GitHub repository name exactly for correct GitHub Pages routing

**Final Build**
- Run the build command to confirm the app is production-ready and outputs cleanly to `/docs/`
- Run a final check on the live or local URL to confirm all assets load without console errors

---

*This SOP was created on 2026-04-14 and applies to all projects in this workspace.*
