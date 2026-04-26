'use strict';

const STORAGE_KEY = 'eau_presentation_schedule_v1';

// ── State ────────────────────────────────────────────────────────────────────
let rows = [];

// ── DOM refs ─────────────────────────────────────────────────────────────────
const csvFileInput   = document.getElementById('csvFileInput');
const fileNameLabel  = document.getElementById('fileNameLabel');
const clearDataBtn   = document.getElementById('clearDataBtn');
const printBtn       = document.getElementById('printBtn');
const statsBar       = document.getElementById('statsBar');
const uploadState    = document.getElementById('uploadState');
const supervisorGrid = document.getElementById('supervisorGrid');
const errorBanner    = document.getElementById('errorBanner');
const errorText      = document.getElementById('errorText');

// ── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      rows = JSON.parse(saved);
      if (rows.length) render();
    } catch (_) {
      rows = [];
    }
  }

  uploadState.addEventListener('dragover', e => { e.preventDefault(); uploadState.classList.add('drag-over'); });
  uploadState.addEventListener('dragleave', () => uploadState.classList.remove('drag-over'));
  uploadState.addEventListener('drop', e => {
    e.preventDefault();
    uploadState.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  csvFileInput.addEventListener('change', () => {
    if (csvFileInput.files[0]) handleFile(csvFileInput.files[0]);
  });

  clearDataBtn.addEventListener('click', clearData);
  printBtn.addEventListener('click', () => window.print());

  if (typeof initStorageSidebar === 'function') initStorageSidebar();
})();

// ── CSV parsing ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const result = [];

  function parseLine(line) {
    const fields = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (ch === ',' && !inQuote) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  let headerIdx = -1;
  let headers = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    headers = parseLine(trimmed).map(h => h.toLowerCase().replace(/\s+/g, ''));
    headerIdx = i;
    break;
  }
  if (headerIdx === -1) return { error: 'File appears to be empty.' };

  const colMap = {};
  const aliases = {
    date:        ['date'],
    moduleCode:  ['modulecode', 'code', 'module_code', 'modulecode'],
    moduleName:  ['modulename', 'name', 'module_name', 'subject'],
    groupNumber: ['groupnumber', 'group', 'groupno', 'group_number', 'grp'],
    timing:      ['timing', 'time', 'slot', 'timeslot'],
    venue:       ['venue', 'room', 'hall', 'location', 'classroom'],
    supervisor:  ['supervisor', 'instructor', 'lecturer', 'faculty', 'teacher'],
    jury:        ['jury', 'jurynames', 'jury_names', 'jurors', 'panel'],
  };
  headers.forEach((h, i) => {
    for (const [key, aliasList] of Object.entries(aliases)) {
      if (aliasList.includes(h)) { colMap[key] = i; break; }
    }
  });

  const required = ['date', 'groupNumber', 'timing', 'supervisor'];
  const missing = required.filter(k => colMap[k] === undefined);
  if (missing.length) {
    return { error: `Missing required columns: ${missing.join(', ')}. Found: ${headers.join(', ')}` };
  }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseLine(lines[i]);

    const rawCode = colMap.moduleCode !== undefined ? (fields[colMap.moduleCode] || '') : '';
    const rawName = colMap.moduleName !== undefined ? (fields[colMap.moduleName] || '') : '';

    let moduleCode = rawCode.trim();
    let moduleName = rawName.trim();
    // If moduleName absent but moduleCode contains " - ", split it
    if (!moduleName && moduleCode.includes(' - ')) {
      const dashIdx = moduleCode.indexOf(' - ');
      moduleName = moduleCode.slice(dashIdx + 3).trim();
      moduleCode = moduleCode.slice(0, dashIdx).trim();
    }

    result.push({
      date:        (fields[colMap.date] || '').trim(),
      moduleCode,
      moduleName,
      groupNumber: (fields[colMap.groupNumber] || '').trim(),
      timing:      (fields[colMap.timing] || '').trim(),
      venue:       colMap.venue !== undefined ? (fields[colMap.venue] || '').trim() : '',
      supervisor:  (fields[colMap.supervisor] || '').trim(),
      jury:        colMap.jury !== undefined ? (fields[colMap.jury] || '').trim() : '',
    });
  }

  if (!result.length) return { error: 'No data rows found after the header.' };
  return { rows: result };
}

// ── Date helpers ─────────────────────────────────────────────────────────────
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function parseDate(str) {
  if (!str) return null;
  let m;
  if ((m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return new Date(+m[3], +m[2]-1, +m[1]);
  if ((m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)))       return new Date(+m[1], +m[2]-1, +m[3]);
  return new Date(str);
}

function formatDate(str) {
  const d = parseDate(str);
  if (!d || isNaN(d)) return str;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function getDayName(str) {
  const d = parseDate(str);
  if (!d || isNaN(d)) return '';
  return DAYS[d.getDay()];
}

// Sort oldest → newest date, then timing ascending
function dateSort(a, b) {
  const da = parseDate(a.date), db = parseDate(b.date);
  const ta = da ? da.getTime() : 0, tb = db ? db.getTime() : 0;
  if (ta !== tb) return ta - tb;
  return (a.timing || '').localeCompare(b.timing || '');
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  if (!rows.length) { showUploadState(); return; }

  // Outer pivot: group by supervisor
  const bySupervisor = {};
  rows.forEach(r => {
    const key = r.supervisor || '(No Supervisor)';
    if (!bySupervisor[key]) bySupervisor[key] = [];
    bySupervisor[key].push(r);
  });

  const supervisors = Object.keys(bySupervisor).sort((a, b) => a.localeCompare(b));

  // Update stats
  const allDates   = new Set(rows.map(r => r.date));
  const allModules = new Set(rows.map(r => r.moduleCode || r.moduleName).filter(Boolean));
  document.getElementById('statSupervisors').textContent = supervisors.length;
  document.getElementById('statGroups').textContent      = rows.length;
  document.getElementById('statModules').textContent     = allModules.size;
  document.getElementById('statDays').textContent        = allDates.size;

  document.getElementById('printSubtitle').textContent =
    `Presentation Schedule — ${rows.length} Groups · ${supervisors.length} Supervisors`;

  supervisorGrid.innerHTML = '';

  supervisors.forEach((supervisor, idx) => {
    const supervRows = bySupervisor[supervisor].slice().sort(dateSort);
    const colorClass = `sv-color-${idx % 8}`;

    // Inner pivot: group by moduleCode (fall back to moduleName)
    const byModule = {};
    supervRows.forEach(r => {
      const key = r.moduleCode || r.moduleName || '(Unknown Module)';
      if (!byModule[key]) byModule[key] = [];
      byModule[key].push(r);
    });
    const modules = Object.keys(byModule).sort((a, b) => a.localeCompare(b));

    const hasVenue = supervRows.some(r => r.venue);
    const hasJury  = supervRows.some(r => r.jury);

    // Build inner HTML: one sub-section per module
    const moduleSections = modules.map(modKey => {
      const modRows = byModule[modKey].slice().sort(dateSort);
      const sample  = modRows[0];
      const modName = sample.moduleName || '';

      // Alternating date bands + rowspan counts
      const dateOrder   = [];
      const seenDates   = new Set();
      const dateRowspan = {};
      modRows.forEach(r => {
        if (!seenDates.has(r.date)) { dateOrder.push(r.date); seenDates.add(r.date); }
        dateRowspan[r.date] = (dateRowspan[r.date] || 0) + 1;
      });
      const dateBandMap   = {};
      dateOrder.forEach((d, i) => { dateBandMap[d] = i % 2 === 0 ? 'band-even' : 'band-odd'; });
      const dateRendered  = new Set();

      const venueTh = hasVenue ? '<th>Venue</th>' : '';
      const juryTh  = hasJury  ? '<th>Jury</th>'  : '';

      const tbody = modRows.map(r => {
        const band      = dateBandMap[r.date] || 'band-odd';
        const venueCell = hasVenue ? `<td class="venue-cell">${esc(r.venue)}</td>` : '';
        const juryCell  = hasJury  ? `<td class="jury-cell">${esc(r.jury)}</td>`   : '';

        let dateCells = '';
        if (!dateRendered.has(r.date)) {
          dateRendered.add(r.date);
          const span     = dateRowspan[r.date];
          const spanAttr = span > 1 ? ` rowspan="${span}"` : '';
          dateCells = `<td class="date-cell"${spanAttr}>${esc(formatDate(r.date))}</td>` +
                      `<td class="day-cell"${spanAttr}>${esc(getDayName(r.date))}</td>`;
        }

        return `<tr class="${band}">
          ${dateCells}
          <td class="group-cell">${esc(r.groupNumber)}</td>
          <td class="timing-cell">${esc(r.timing)}</td>
          ${venueCell}
          ${juryCell}
        </tr>`;
      }).join('');

      return `
        <div class="module-section">
          <div class="module-section-header">
            <span class="module-section-code">${esc(modKey)}</span>
            ${modName ? `<span class="module-section-name">${esc(modName)}</span>` : ''}
            <span class="module-section-badge">${modRows.length} group${modRows.length !== 1 ? 's' : ''}</span>
          </div>
          <div style="overflow-x:auto; display:inline-block; min-width:100%; box-sizing:border-box;">
            <table class="pres-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Group #</th>
                  <th>Timing</th>
                  ${venueTh}
                  ${juryTh}
                </tr>
              </thead>
              <tbody>${tbody}</tbody>
            </table>
          </div>
        </div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = `supervisor-card ${colorClass}`;
    card.innerHTML = `
      <div class="supervisor-card-header">
        <span class="supervisor-name">👤 ${esc(supervisor)}</span>
        <span class="supervisor-badge">${supervRows.length} group${supervRows.length !== 1 ? 's' : ''} · ${modules.length} module${modules.length !== 1 ? 's' : ''}</span>
      </div>
      ${moduleSections}`;
    supervisorGrid.appendChild(card);
  });

  showDataState();
}

function showUploadState() {
  uploadState.style.display = '';
  supervisorGrid.style.display = 'none';
  statsBar.style.display = 'none';
  clearDataBtn.style.display = 'none';
  printBtn.style.display = 'none';
  fileNameLabel.textContent = '';
}

function showDataState() {
  uploadState.style.display = 'none';
  supervisorGrid.style.display = '';
  statsBar.style.display = '';
  clearDataBtn.style.display = '';
  printBtn.style.display = '';
}

function showError(msg) {
  errorText.textContent = msg;
  errorBanner.style.display = '';
  setTimeout(() => { errorBanner.style.display = 'none'; }, 8000);
}

// ── File handling ─────────────────────────────────────────────────────────────
function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showError('Please upload a .csv file.'); return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const result = parseCSV(e.target.result);
    if (result.error) { showError(result.error); return; }
    rows = result.rows;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    fileNameLabel.textContent = file.name;
    errorBanner.style.display = 'none';
    render();
  };
  reader.readAsText(file);
  csvFileInput.value = '';
}

function clearData() {
  if (!confirm('Clear all presentation schedule data?')) return;
  rows = [];
  localStorage.removeItem(STORAGE_KEY);
  supervisorGrid.innerHTML = '';
  showUploadState();
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
