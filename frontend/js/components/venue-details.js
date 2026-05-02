/* ══════════════════════════════════════════════════════════
   FOE Exam Planner — Venue Details Page
   Shows columns, rows, and seat count for every venue.
   Static display — reads classroom definitions from storage.js.
══════════════════════════════════════════════════════════ */

'use strict';

function escHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function getColumns(classroom) {
  return classroom.columnRows ? Object.keys(classroom.columnRows) : (classroom.columns || []);
}

function getAllRows(classroom) {
  if (classroom.columnRows) {
    const set = new Set(Object.values(classroom.columnRows).flat());
    return [...set].sort((a, b) => a - b);
  }
  return [...(classroom.rows || [])].sort((a, b) => a - b);
}

function isIrregular(classroom) {
  return !!classroom.columnRows;
}

function layoutLabel(classroom) {
  if (classroom.id === 'MSTeam') return 'Virtual';
  return isIrregular(classroom) ? 'Irregular' : 'Regular';
}

function rowInfo(classroom) {
  if (classroom.id === 'MSTeam') return '—';
  const allRows = getAllRows(classroom);
  if (!allRows.length) return '—';
  const min = allRows[0], max = allRows[allRows.length - 1];
  if (isIrregular(classroom)) return `${min}–${max} (varies per col)`;
  return `1–${max} (${allRows.length} rows)`;
}

/* ── Summary table ─────────────────────────────────────── */
function buildSummaryTable(classrooms) {
  const tbody = document.getElementById('summaryTableBody');
  const totalSeatsEl  = document.getElementById('totalSeatsCount');
  const totalVenuesEl = document.getElementById('totalVenuesCount');

  let totalSeats  = 0;
  let venueCount  = 0;
  let html = '';

  classrooms.forEach(c => {
    const cols    = getColumns(c);
    const layout  = layoutLabel(c);
    const colList = cols.length ? cols.join(', ') : '—';
    const ri      = rowInfo(c);
    const seats   = c.totalSeats || 0;
    if (c.id !== 'MSTeam') { totalSeats += seats; venueCount++; }

    html += `<tr data-venue-id="${escHtml(c.id)}">
      <td style="font-weight:600;">${escHtml(c.name)}</td>
      <td><span class="layout-badge layout-${layout.toLowerCase()}">${escHtml(layout)}</span></td>
      <td class="col-list-cell">${escHtml(colList)}</td>
      <td class="row-info-cell">${escHtml(ri)}</td>
      <td class="seats-cell">${seats || '—'}</td>
    </tr>`;
  });

  tbody.innerHTML = html;
  totalSeatsEl.textContent  = totalSeats.toLocaleString();
  totalVenuesEl.textContent = venueCount;

  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
      tr.classList.add('selected');
      showVenueLayout(tr.dataset.venueId, classrooms);
    });
  });
}

/* ── Per-column breakdown (irregular venues) ──────────── */
function buildColBreakdown(classroom) {
  if (!isIrregular(classroom)) return '';
  const entries = Object.entries(classroom.columnRows);
  const items = entries.map(([col, rows]) => {
    const min = rows[0], max = rows[rows.length - 1];
    const label = min === max ? `Row ${min}` : `Rows ${min}–${max}`;
    return `<span class="col-breakdown-item"><strong>${escHtml(col)}</strong> <span>(${escHtml(label)}, ${rows.length} seats)</span></span>`;
  }).join('');
  return `<div class="col-breakdown">
    <strong>Per-column breakdown:</strong>
    <div class="col-breakdown-table">${items}</div>
  </div>`;
}

/* ── Seat grid ─────────────────────────────────────────── */
function buildSeatGrid(classroom) {
  const columns = getColumns(classroom);
  const allRows = getAllRows(classroom);

  if (!columns.length || !allRows.length) return '';

  const validSeats = new Set();
  if (classroom.columnRows) {
    for (const [col, rows] of Object.entries(classroom.columnRows))
      for (const row of rows) validSeats.add(`${col}${row}`);
  } else {
    for (const col of classroom.columns)
      for (const row of classroom.rows) validSeats.add(`${col}${row}`);
  }

  const isLarge = columns.length > 8 || allRows.length > 10;
  const cellW   = isLarge ? 22 : 28;
  const cellCls = isLarge ? 'seat-cell seat-sm' : 'seat-cell';

  const gridCols = `24px repeat(${columns.length}, ${cellW}px)`;
  let html = `<div class="seat-grid" style="grid-template-columns:${gridCols}">`;

  /* column header row */
  html += '<div class="grid-corner"></div>';
  for (const col of columns)
    html += `<div class="col-header">${escHtml(col)}</div>`;

  /* data rows */
  for (const row of allRows) {
    html += `<div class="row-header">${row}</div>`;
    for (const col of columns) {
      const id = `${col}${row}`;
      if (validSeats.has(id))
        html += `<div class="${cellCls} seat-available" title="${escHtml(id)}">${isLarge ? '' : escHtml(id)}</div>`;
      else
        html += `<div class="${cellCls} seat-gap" title="—"></div>`;
    }
  }

  html += '</div>';
  return html;
}

/* ── Layout panel (right side) ─────────────────────────── */
function showVenueLayout(venueId, classrooms) {
  const c = classrooms.find(cl => cl.id === venueId);
  if (!c) return;

  const header = document.getElementById('layoutPanelHeader');
  const body   = document.getElementById('layoutPanelBody');
  const layout = layoutLabel(c);

  header.innerHTML = `${escHtml(c.name)} <span class="layout-badge layout-${layout.toLowerCase()}" style="font-size:10px;margin-left:8px;">${escHtml(layout)}</span> <span style="font-size:11px;font-weight:400;opacity:0.8;margin-left:6px;">${c.totalSeats || 0} seats</span>`;

  if (c.id === 'MSTeam') {
    body.innerHTML = '<p class="no-seats-msg">No fixed seats — virtual / remote venue</p>';
  } else {
    body.innerHTML = buildColBreakdown(c) + buildSeatGrid(c);
  }
}

/* ── Init ──────────────────────────────────────────────── */
(function init() {
  setupFileUI(
    document.getElementById('fileStatusDot'),
    document.getElementById('fileStatusText'),
    document.getElementById('connectFileBtn'),
    document.getElementById('exportFileBtn')
  );

  const classrooms = getClassrooms();
  buildSummaryTable(classrooms);
})();
