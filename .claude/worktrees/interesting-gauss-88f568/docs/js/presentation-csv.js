/* ══════════════════════════════════════════════════════════
   Presentation CSV — Upload, parse, and display grouped by supervisor
══════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'eau_pres_csv_v1';

/* ── State ───────────────────────────────────────────────── */
let rows = [];

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  setupUploadZone();
  loadFromStorage();
});

/* ── Storage ─────────────────────────────────────────────── */
function loadFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.rows) && parsed.rows.length) {
      rows = parsed.rows;
      document.getElementById('metaFilename').textContent = parsed.filename || 'saved data';
      renderDashboard();
    }
  } catch (e) { /* ignore corrupt data */ }
}

function saveToStorage(filename) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ filename, rows }));
}

/* ── CSV Upload zone ─────────────────────────────────────── */
function setupUploadZone() {
  const zone  = document.getElementById('uploadZone');
  const input = document.getElementById('csvFileInput');

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  input.addEventListener('change', () => {
    if (input.files[0]) processFile(input.files[0]);
    input.value = '';
  });
}

function triggerUpload() {
  document.getElementById('csvFileInput').click();
}

/* ── File processing ─────────────────────────────────────── */
function processFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Please upload a .csv file.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      rows = parseCSV(e.target.result);
      if (!rows.length) { showToast('No data rows found in CSV.', 'error'); return; }
      saveToStorage(file.name);
      document.getElementById('metaFilename').textContent = file.name;
      renderDashboard();
      showToast(`Loaded ${rows.length} rows from ${file.name}`, 'success');
    } catch (err) {
      showToast('Failed to parse CSV: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

/* ── CSV Parser ──────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const expected = ['date', 'modulecode', 'modulename', 'groupnumber', 'timing', 'supervisor', 'jury'];

  // Map header positions
  const idx = {};
  for (const key of expected) {
    const pos = headers.findIndex(h => h.replace(/\s+/g, '') === key);
    if (pos === -1) throw new Error(`Missing column: "${key}"`);
    idx[key] = pos;
  }

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = splitCSVLine(line);
    result.push({
      date:        (cols[idx['date']]        || '').trim(),
      moduleCode:  (cols[idx['modulecode']]  || '').trim(),
      moduleName:  (cols[idx['modulename']]  || '').trim(),
      groupNumber: (cols[idx['groupnumber']] || '').trim(),
      timing:      (cols[idx['timing']]      || '').trim(),
      supervisor:  (cols[idx['supervisor']]  || '').trim(),
      jury:        (cols[idx['jury']]        || '').trim(),
    });
  }
  return result;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/* ── Render dashboard ────────────────────────────────────── */
function renderDashboard() {
  // Show controls
  document.getElementById('uploadCard').style.display = 'none';
  document.getElementById('dashboard').style.display  = '';
  document.getElementById('metaRow').style.display    = '';
  document.getElementById('printBtn').style.display   = '';
  document.getElementById('clearBtn').style.display   = '';

  // Update meta
  const supervisors = groupBySupervisor(rows);
  document.getElementById('metaTotalRows').textContent    = rows.length;
  document.getElementById('metaSupervisors').textContent  = Object.keys(supervisors).length;

  // Render supervisor blocks
  const dashboard = document.getElementById('dashboard');
  dashboard.innerHTML = '';

  const sortedSupervisors = Object.keys(supervisors).sort((a, b) => a.localeCompare(b));

  for (const supervisor of sortedSupervisors) {
    const entries = supervisors[supervisor];
    const block = buildSupervisorBlock(supervisor, entries);
    dashboard.appendChild(block);
  }

  // Build print view
  buildPrintView(supervisors, sortedSupervisors);
}

function groupBySupervisor(data) {
  const groups = {};
  for (const row of data) {
    const key = row.supervisor || '(No Supervisor)';
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  // Sort each group by date then timing
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.timing.localeCompare(b.timing);
    });
  }
  return groups;
}

function buildSupervisorBlock(supervisor, entries) {
  const block = document.createElement('div');
  block.className = 'supervisor-block';

  const heading = document.createElement('div');
  heading.className = 'supervisor-heading';
  heading.innerHTML = `
    <span>👤</span>
    <span>${escHtml(supervisor)}</span>
    <span class="supervisor-badge">${entries.length} presentation${entries.length !== 1 ? 's' : ''}</span>
  `;
  block.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'pres-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Module Code</th>
        <th>Module Name</th>
        <th>Group</th>
        <th>Timing</th>
        <th>Jury</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  for (const row of entries) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="date-cell">${escHtml(formatDate(row.date))}</td>
      <td><strong>${escHtml(row.moduleCode)}</strong></td>
      <td>${escHtml(row.moduleName)}</td>
      <td><span class="group-pill">G${escHtml(row.groupNumber)}</span></td>
      <td class="timing-cell">${escHtml(row.timing)}</td>
      <td class="jury-cell">${escHtml(row.jury)}</td>
    `;
    tbody.appendChild(tr);
  }

  block.appendChild(table);
  return block;
}

/* ── Print view ──────────────────────────────────────────── */
function buildPrintView(supervisors, sortedSupervisors) {
  const container = document.getElementById('csvPrintView');
  container.innerHTML = '';

  sortedSupervisors.forEach((supervisor, idx) => {
    const entries = supervisors[supervisor];
    const div = document.createElement('div');
    if (idx > 0) div.className = 'print-page-break';

    const h2 = document.createElement('h2');
    h2.textContent = `👤 ${supervisor}`;
    div.appendChild(h2);

    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Date</th>
          <th>Module Code</th>
          <th>Module Name</th>
          <th>Group</th>
          <th>Timing</th>
          <th>Jury</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(r => `
          <tr>
            <td>${escHtml(formatDate(r.date))}</td>
            <td><strong>${escHtml(r.moduleCode)}</strong></td>
            <td>${escHtml(r.moduleName)}</td>
            <td>G${escHtml(r.groupNumber)}</td>
            <td class="timing-cell">${escHtml(r.timing)}</td>
            <td>${escHtml(r.jury)}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    div.appendChild(table);
    container.appendChild(div);
  });
}

function doPrint() {
  window.print();
}

/* ── Clear ───────────────────────────────────────────────── */
function clearData() {
  if (!confirm('Clear all loaded CSV data?')) return;
  rows = [];
  localStorage.removeItem(STORAGE_KEY);

  document.getElementById('uploadCard').style.display  = '';
  document.getElementById('dashboard').style.display   = 'none';
  document.getElementById('metaRow').style.display     = 'none';
  document.getElementById('printBtn').style.display    = 'none';
  document.getElementById('clearBtn').style.display    = 'none';
  document.getElementById('csvPrintView').innerHTML    = '';
  document.getElementById('dashboard').innerHTML       = '';
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatDate(str) {
  if (!str) return '';
  // Try to parse common date formats
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return str;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
