/**
 * InHaus Lab — Inspector Review Portal
 * portal.js — Vanilla JS, no frameworks
 *
 * Configuration: swap these two constants when Apps Script is deployed
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsRP4-RBAuldMh_BkNlbAkZyMLDz8ohNM1WwIRfB1ROz9JHGYjYsZdVNbgy98-d4gu8Q/exec';
const ACCESS_TOKEN    = 'inhaus_review_2026';

const IS_DEMO = (APPS_SCRIPT_URL === 'PLACEHOLDER_URL');

/* ============================================================
   MOCK DATA (placeholder / demo mode)
   ============================================================ */

const MOCK_LIST = {
  inspections: [
    {
      id: 'INH-20260528-8F3KQ9',
      clientName: 'Clay Lowery',
      propertyAddress: '350 Popish Rd',
      inspectionDate: '2026-05-28',
      inspectorName: 'Dave',
      status: 'In Review',
      photoCount: 47,
      missingCount: 3,
      lastUpdated: '2026-05-28T14:32:00Z',
      reviewToken: 'demo-token-1'
    },
    {
      id: 'INH-20260520-EAYNCM',
      clientName: 'David Kline',
      propertyAddress: '369 Hillcrest Dr',
      inspectionDate: '2026-05-20',
      inspectorName: 'Dave',
      status: 'Synced',
      photoCount: 31,
      missingCount: 7,
      lastUpdated: '2026-05-20T17:15:00Z',
      reviewToken: 'demo-token-2'
    },
    {
      id: 'INH-20260428-DKNSOB',
      clientName: 'Alpha One',
      propertyAddress: 'Alpha One (commercial)',
      inspectionDate: '2026-04-28',
      inspectorName: 'Dave',
      status: 'Submitted to Tanner',
      photoCount: 86,
      missingCount: 0,
      lastUpdated: '2026-04-29T09:44:00Z',
      reviewToken: 'demo-token-3'
    }
  ]
};

const MOCK_INSPECTION = {
  inspectionId: 'INH-20260528-8F3KQ9',
  clientName: 'Clay Lowery',
  propertyAddress: '350 Popish Rd',
  inspectionDate: '2026-05-28',
  inspectorName: 'Dave',
  status: 'In Review',
  reportBuilderNotes: '',
  reviewToken: 'demo-token-1',
  stepData: {
    arrival: {
      stepId: 'arrival',
      roomName: 'Arrival / Site Entry',
      assessmentStartTime: '09:00',
      arrivalNotes: 'Client present at arrival. Front door unlocked by homeowner Clay. Mild musty odor noted immediately upon entering foyer.',
      voiceReviewed: false
    },
    'bedroom-master': {
      stepId: 'bedroom-master',
      roomName: 'Master Bedroom',
      notes: 'Water stain approximately 18 inches in diameter on north ceiling near window. Stain appears old — paint discoloration, no active moisture. Closet walls show no signs of moisture intrusion.',
      voiceReviewed: true,
      qtrakLocation: 'Center of room, 3 ft from north wall',
      breezeLocation: 'NW corner near window'
    },
    'bedroom-2': {
      stepId: 'bedroom-2',
      roomName: 'Bedroom 2 (Guest)',
      notes: 'No visible issues. Room used infrequently per client.',
      voiceReviewed: false,
      qtrakLocation: '',
      breezeLocation: ''
    },
    kitchen: {
      stepId: 'kitchen',
      roomName: 'Kitchen',
      notes: 'Under-sink cabinet shows warping consistent with previous leak. Client states it was repaired 6 months ago. Dishwasher area dry. Exhaust fan functional.',
      voiceReviewed: true,
      qtrakLocation: 'Center island',
      breezeLocation: 'Under sink cabinet area'
    },
    basement: {
      stepId: 'basement',
      roomName: 'Basement',
      notes: 'Unfinished. Sump pump present and functional. Efflorescence on east wall, approximately 3 ft wide, 2 ft tall. Water line visible at 4 inches from floor indicating previous flooding.',
      voiceReviewed: false,
      qtrakLocation: 'Near sump pump',
      breezeLocation: 'East wall, center'
    },
    bathroom: {
      stepId: 'bathroom',
      roomName: 'Main Bathroom',
      notes: 'Grout around tub surround discolored. Caulk line between tub and tile cracked in two locations. No active water intrusion visible. Fan functional.',
      voiceReviewed: true,
      qtrakLocation: '',
      breezeLocation: 'Near tub surround'
    }
  },
  photos: [
    { photoId: 'ph_001', roomName: 'Arrival / Site Entry', stepName: 'Exterior',  caption: 'Front of home, north face', timestamp: '2026-05-28T09:03:22Z', driveUrl: null, included: null },
    { photoId: 'ph_002', roomName: 'Arrival / Site Entry', stepName: 'Exterior',  caption: 'Driveway drainage area', timestamp: '2026-05-28T09:04:51Z', driveUrl: null, included: null },
    { photoId: 'ph_003', roomName: 'Master Bedroom',        stepName: 'Before',    caption: 'Ceiling stain north wall', timestamp: '2026-05-28T09:23:11Z', driveUrl: null, included: null },
    { photoId: 'ph_004', roomName: 'Master Bedroom',        stepName: 'Detail',    caption: 'Close-up water stain discoloration', timestamp: '2026-05-28T09:24:08Z', driveUrl: null, included: null },
    { photoId: 'ph_005', roomName: 'Master Bedroom',        stepName: 'Equipment', caption: 'Breeze unit placement NW corner', timestamp: '2026-05-28T09:26:00Z', driveUrl: null, included: null },
    { photoId: 'ph_006', roomName: 'Kitchen',               stepName: 'Before',    caption: 'Under-sink cabinet warping', timestamp: '2026-05-28T10:01:33Z', driveUrl: null, included: null },
    { photoId: 'ph_007', roomName: 'Kitchen',               stepName: 'Detail',    caption: 'Close-up cabinet base discoloration', timestamp: '2026-05-28T10:02:44Z', driveUrl: null, included: null },
    { photoId: 'ph_008', roomName: 'Basement',              stepName: 'Before',    caption: 'East wall efflorescence overview', timestamp: '2026-05-28T10:45:18Z', driveUrl: null, included: null },
    { photoId: 'ph_009', roomName: 'Basement',              stepName: 'Detail',    caption: 'Water line stain at floor level', timestamp: '2026-05-28T10:46:30Z', driveUrl: null, included: null },
    { photoId: 'ph_010', roomName: 'Basement',              stepName: 'Detail',    caption: 'Sump pump and pit condition', timestamp: '2026-05-28T10:48:00Z', driveUrl: null, included: null },
    { photoId: 'ph_011', roomName: 'Main Bathroom',         stepName: 'Before',    caption: 'Tub surround grout overview', timestamp: '2026-05-28T11:12:05Z', driveUrl: null, included: null },
    { photoId: 'ph_012', roomName: 'Main Bathroom',         stepName: 'Detail',    caption: 'Cracked caulk line at tub edge', timestamp: '2026-05-28T11:13:22Z', driveUrl: null, included: null }
  ],
  testsConfirmed: {
    testBreeze: true,
    testBoulderBlue: true,
    testWaterPanel: false,
    testPFAS: false,
    testMicroplastics: false,
    testRadon: true,
    testATP: false,
    testMoldSwabs: true
  },
  testsNotConducted: 'Water Panel, PFAS, Microplastics, ATP not requested by client.',
  breezeSampleCount: '4',
  waterSampleId: '',
  boulderBlueSampleId: 'BB-2026-0447',
  reviewedData: {}
};

/* ============================================================
   STATE
   ============================================================ */
let _inspection = null;      // current full inspection object
let _saveTimer  = null;      // debounce handle for saveField
let _pendingSaves = 0;       // count of in-flight saves
let _currentPage = null;     // 'list' | 'review'

/* ============================================================
   UTILITIES
   ============================================================ */

function qs(sel, ctx = document) { return ctx.querySelector(sel); }
function qsa(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    e.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return e;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getURLParams() {
  const p = new URLSearchParams(window.location.search);
  return { id: p.get('id'), token: p.get('token') };
}

const STATUS_TOOLTIPS = {
  'Synced':              'Data has been exported from the Inspector App and is ready to review here.',
  'In Review':           'Inspector is currently reviewing this inspection.',
  'Submitted to Tanner': 'Inspector has completed review and sent to Tanner for report building.',
  'Report Complete':     'Tanner has finished building the report.'
};

function statusBadgeHTML(status) {
  const map = {
    'Synced':              'badge-synced',
    'In Review':           'badge-in-review',
    'Submitted to Tanner': 'badge-submitted',
    'Report Complete':     'badge-complete'
  };
  const cls = map[status] || 'badge-synced';
  const tip = STATUS_TOOLTIPS[status] || '';
  return `<span class="badge ${cls}" title="${escapeHTML(tip)}">${status}</span>`;
}

/* ============================================================
   TOAST NOTIFICATIONS
   ============================================================ */

let _toastContainer = null;

function getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = el('div', { class: 'toast-container', id: 'toast-container' });
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

function showToast(message, type = 'success', duration = 3000) {
  const container = getToastContainer();
  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    demo:    '⚠'
  };
  const toast = el('div', { class: `toast toast-${type}` },
    el('span', {}, icons[type] || '•'),
    el('span', {}, message)
  );
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 280);
  }, duration);
}

/* ============================================================
   SAVE INDICATOR
   ============================================================ */

function setSaveIndicator(state, time = '') {
  const ind = qs('#save-indicator');
  if (!ind) return;
  ind.className = `save-indicator ${state}`;
  if (state === 'saving') { ind.textContent = 'Saving…'; }
  else if (state === 'saved') { ind.textContent = `Saved ✓ ${time}`; }
  else if (state === 'error') { ind.textContent = 'Save failed'; }
  else { ind.textContent = ''; }
}

/* ============================================================
   API CALLS
   ============================================================ */

async function apiFetch(params, method = 'GET', body = null) {
  if (IS_DEMO) return null;
  const url = new URL(APPS_SCRIPT_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const opts = { method };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url.toString(), opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ============================================================
   INSPECTION LIST PAGE
   ============================================================ */

async function loadInspectionList() {
  _currentPage = 'list';
  const tableBody = qs('#inspection-tbody');
  const countLabel = qs('#inspection-count');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="9" class="loading-state">
    <div><div class="loading-spinner"></div><br>Loading inspections…</div>
  </td></tr>`;

  let data;
  if (IS_DEMO) {
    data = MOCK_LIST;
    const bar = qs('#demo-bar');
    if (bar) bar.classList.remove('hidden');
  } else {
    try {
      // Try static file first (fast, no auth needed), fall back to Apps Script
      const staticResp = await fetch('./api/list.json?t=' + Date.now());
      if (staticResp.ok) {
        data = await staticResp.json();
      } else {
        data = await apiFetch({ action: 'list', token: ACCESS_TOKEN });
      }
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="9" class="empty-state">
        Failed to load inspections: ${err.message}
      </td></tr>`;
      showToast('Failed to load inspections', 'error');
      return;
    }
  }

  renderInspectionList(data.inspections, tableBody, countLabel);
}

function renderInspectionList(inspections, tableBody, countLabel) {
  if (countLabel) countLabel.textContent = `${inspections.length} inspection${inspections.length !== 1 ? 's' : ''}`;

  if (!inspections.length) {
    tableBody.innerHTML = `<tr><td colspan="9" class="empty-state">No inspections found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = '';
  for (const insp of inspections) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="td-address">${escapeHTML(insp.propertyAddress)}</div>
        <div class="td-id">${escapeHTML(insp.id || insp.inspectionId)}</div>
      </td>
      <td>${escapeHTML(insp.clientName)}</td>
      <td>${formatDate(insp.inspectionDate)}</td>
      <td>${escapeHTML(insp.inspectorName)}</td>
      <td>${statusBadgeHTML(insp.status)}</td>
      <td>${insp.photoCount ?? '—'}</td>
      <td>
        ${insp.missingCount > 0
          ? `<span class="missing-badge has-missing">${insp.missingCount}</span>`
          : `<span class="missing-badge no-missing">✓</span>`}
      </td>
      <td class="text-muted">${formatDateTime(insp.lastUpdated)}</td>
      <td>
        <a href="review.html?id=${encodeURIComponent(insp.id || insp.inspectionId)}&token=${encodeURIComponent(insp.reviewToken)}"
           class="btn btn-open btn-sm">Open Review →</a>
      </td>
    `;
    tableBody.appendChild(row);
  }
}

/* ============================================================
   REVIEW PAGE — BOOTSTRAP
   ============================================================ */

async function loadInspection() {
  _currentPage = 'review';
  const { id, token } = getURLParams();

  let insp;
  if (IS_DEMO) {
    insp = JSON.parse(JSON.stringify(MOCK_INSPECTION));
    const bar = qs('#demo-bar');
    if (bar) bar.classList.remove('hidden');
  } else {
    if (!id || !token) {
      showToast('Missing inspection ID or token', 'error');
      return;
    }
    try {
      // Try static file first, fall back to Apps Script
      const staticResp = await fetch(`./api/inspections/${id}.json?t=` + Date.now());
      if (staticResp.ok) {
        const staticData = await staticResp.json();
        insp = staticData.inspection || staticData;
      } else {
        insp = await apiFetch({ action: 'get', id, token });
      }
    } catch (err) {
      showToast(`Failed to load inspection: ${err.message}`, 'error');
      return;
    }
  }

  _inspection = insp;
  renderReviewPage(insp);
}

/* ============================================================
   SECTION 5 — POST-INSPECTION CONTENT: PHOTO PICKER HELPERS
   ============================================================ */

function getAllSection5AssignedIds(rd) {
  const ids = new Set();
  const tryParse = key => { try { return JSON.parse(rd[key] || '[]'); } catch(e) { return []; } };
  for (let i = 1; i <= 5; i++) tryParse(`followUp_${i}_photoIds`).forEach(id => ids.add(id));
  for (let i = 1; i <= 6; i++) tryParse(`actionTaken_${i}_photoIds`).forEach(id => ids.add(id));
  for (let i = 1; i <= 6; i++) tryParse(`obs_${i}_photoIds`).forEach(id => ids.add(id));
  return ids;
}

const PALETTE_SIZES = { S: '64px', M: '88px', L: '130px' };
function getPaletteSize() { return localStorage.getItem('palette-size') || 'M'; }
function setPaletteSize(size) { localStorage.setItem('palette-size', size); }

function buildPhotoPalette(allPhotos, assignedSet) {
  if (!allPhotos || allPhotos.length === 0) return null;
  const wrap = el('div', { class: 'photo-palette-wrap' });

  // Header: label + size buttons
  const header = el('div', { class: 'photo-palette-header' });
  header.appendChild(el('div', { class: 'photo-palette-label' }, `All photos (${allPhotos.length}) — tap + Add photo or drag to assign`));
  const sizeBar = el('div', { class: 'palette-size-bar' });
  sizeBar.appendChild(el('span', {}, 'Size:'));
  let currentSize = getPaletteSize();
  ['S','M','L'].forEach(s => {
    const btn = el('button', { class: `palette-size-btn${s === currentSize ? ' active' : ''}`, type: 'button' }, s);
    btn.addEventListener('click', () => {
      setPaletteSize(s);
      currentSize = s;
      sizeBar.querySelectorAll('.palette-size-btn').forEach(b => b.classList.toggle('active', b.textContent === s));
      grid.style.setProperty('--palette-size', PALETTE_SIZES[s]);
    });
    sizeBar.appendChild(btn);
  });
  header.appendChild(sizeBar);
  wrap.appendChild(header);

  const grid = el('div', { class: 'photo-palette' });
  grid.style.setProperty('--palette-size', PALETTE_SIZES[currentSize]);

  allPhotos.forEach(photo => {
    const isAssigned = assignedSet.has(photo.photoId);
    const thumb = el('div', {
      class: `palette-thumb${isAssigned ? ' assigned-elsewhere' : ''}`,
      draggable: 'true',
      'data-photo-id': photo.photoId,
      title: (photo.caption || photo.photoId) + (isAssigned ? ' (assigned)' : '')
    });
    if (photo.driveUrl) {
      thumb.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || '', loading: 'lazy' }));
    } else {
      thumb.appendChild(el('div', { class: 'palette-thumb-placeholder' }, (photo.photoId || '').slice(-4)));
    }
    thumb.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/photo-id', photo.photoId);
      thumb.classList.add('dragging');
    });
    thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
    grid.appendChild(thumb);
  });
  wrap.appendChild(grid);
  return wrap;
}

function buildPhotoPickerField(slotKey, stepId, assignedIds, allPhotos, locked) {
  const wrap = el('div', { class: 'photo-picker-field' });

  if (assignedIds.length > 0) {
    const row = el('div', { class: 'photo-picker-assigned' });
    assignedIds.forEach(pid => {
      const photo = allPhotos.find(p => p.photoId === pid);
      if (!photo) return;
      const thumb = el('div', { class: 'picker-thumb' });
      if (photo.driveUrl) {
        thumb.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || pid, loading: 'lazy' }));
      } else {
        thumb.appendChild(el('div', { class: 'picker-thumb-placeholder' }, (pid || '').slice(-4)));
      }
      if (photo.caption) {
        thumb.appendChild(el('div', { class: 'picker-thumb-caption' }, photo.caption));
      }
      if (!locked) {
        const rm = el('button', { class: 'picker-rm', title: 'Remove', type: 'button' }, '\u2715');
        rm.addEventListener('click', () => {
          const ids = assignedIds.filter(id => id !== pid);
          const jsonValue = JSON.stringify(ids);
          if (!_inspection.reviewedData) _inspection.reviewedData = {};
          _inspection.reviewedData[slotKey] = jsonValue;
          saveField(stepId, slotKey, jsonValue);
          renderPostContentSection(_inspection, false);
        });
        thumb.appendChild(rm);
      }
      row.appendChild(thumb);
    });
    wrap.appendChild(row);
  }

  if (!locked) {
    const addBtn = el('button', { class: 'picker-add-btn-inline', type: 'button' });
    addBtn.innerHTML = `<span class="picker-add-icon">\uD83D\uDCF7</span> ${assignedIds.length > 0 ? 'Edit photos' : '+ Add photos'}`;
    addBtn.addEventListener('click', () => openPhotoPickerModal(slotKey, stepId, assignedIds, allPhotos));
    wrap.appendChild(addBtn);
  }

  return wrap;
}

function openPhotoPickerModal(slotKey, stepId, currentIds, allPhotos) {
  const existing = qs('.photo-picker-modal-overlay');
  if (existing) existing.remove();

  const overlay = el('div', { class: 'photo-picker-modal-overlay' });
  const modal = el('div', { class: 'photo-picker-modal' });

  // Header row
  const header = el('div', { class: 'picker-modal-header' });
  header.appendChild(el('h3', {}, 'Select Photos'));
  const closeBtn = el('button', { class: 'picker-modal-close', type: 'button' }, '\u2715');
  closeBtn.addEventListener('click', () => overlay.remove());
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Size controls
  const MODAL_SIZES = { S: '80px', M: '115px', L: '160px' };
  let modalSize = getPaletteSize();
  const sizeRow = el('div', { class: 'picker-modal-size-row' });
  sizeRow.appendChild(el('span', {}, 'Size:'));
  ['S','M','L'].forEach(s => {
    const btn = el('button', { class: `palette-size-btn${s === modalSize ? ' active' : ''}`, type: 'button' }, s);
    btn.addEventListener('click', () => {
      modalSize = s;
      setPaletteSize(s);
      sizeRow.querySelectorAll('.palette-size-btn').forEach(b => b.classList.toggle('active', b.textContent === s));
      grid.style.setProperty('--modal-thumb-size', MODAL_SIZES[s]);
    });
    sizeRow.appendChild(btn);
  });
  const countLabel = el('span', { class: 'picker-modal-count' }, '');
  sizeRow.appendChild(countLabel);
  modal.appendChild(sizeRow);

  // Photo grid
  let selected = [...currentIds];
  const grid = el('div', { class: 'photo-picker-grid' });
  grid.style.setProperty('--modal-thumb-size', MODAL_SIZES[modalSize]);

  const updateCount = () => {
    countLabel.textContent = selected.length > 0 ? `${selected.length} selected` : '';
  };
  updateCount();

  if (!allPhotos || allPhotos.length === 0) {
    grid.appendChild(el('div', { class: 'picker-grid-empty' }, 'No photos in this inspection yet.'));
  }

  allPhotos.forEach(photo => {
    const item = el('div', {
      class: `picker-grid-item${selected.includes(photo.photoId) ? ' selected' : ''}`,
      'data-photo-id': photo.photoId
    });
    if (photo.driveUrl) {
      item.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || photo.photoId, loading: 'lazy' }));
    } else {
      item.appendChild(el('div', { class: 'picker-grid-placeholder' }, (photo.photoId || '').slice(-4)));
    }
    if (photo.caption) {
      item.appendChild(el('div', { class: 'picker-grid-caption' }, photo.caption));
    }
    item.addEventListener('click', () => {
      if (item.classList.contains('selected')) {
        selected = selected.filter(id => id !== photo.photoId);
        item.classList.remove('selected');
      } else {
        selected.push(photo.photoId);
        item.classList.add('selected');
      }
      updateCount();
    });
    grid.appendChild(item);
  });
  modal.appendChild(grid);

  // Footer
  const footer = el('div', { class: 'picker-modal-footer' });
  const doneBtn = el('button', { class: 'picker-done-btn', type: 'button' }, 'Done');
  doneBtn.addEventListener('click', () => {
    const jsonValue = JSON.stringify(selected);
    if (!_inspection.reviewedData) _inspection.reviewedData = {};
    _inspection.reviewedData[slotKey] = jsonValue;
    saveField(stepId, slotKey, jsonValue);
    overlay.remove();
    renderPostContentSection(_inspection, false);
  });
  footer.appendChild(doneBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/* ============================================================
   SECTION 5 — POST-INSPECTION CONTENT
   ============================================================ */

function renderPostContentSection(insp, locked) {
  const body = qs('#post-content-body');
  if (!body) return;
  body.innerHTML = '';

  const rd = insp.reviewedData || {};
  const allPhotos = insp.photos || [];
  const assignedSet = getAllSection5AssignedIds(rd);
  const tryParseIds = key => { try { return JSON.parse(rd[key] || '[]'); } catch(e) { return []; } };

  // ---- Follow-up Actions ----
  body.appendChild(buildPostSubheading('Follow-Up Actions Needed',
    'Recommended re-checks for the client report. Leave unused slots blank.'));
  for (let i = 1; i <= 5; i++) {
    body.appendChild(buildPostGroup([
      { label: `Action ${i} — Description`, stepId: 'post', field: `followUp_${i}_desc`,
        type: 'textarea', value: rd[`followUp_${i}_desc`] || insp.stepData?.['post-assessment']?.[`followUp_${i}_whatToWatch`] || '', locked,
        placeholder: 'e.g. Re-test basement east wall in 3 months — active moisture risk (🎙 speak then review)' },
      { label: 'Timeframe', stepId: 'post', field: `followUp_${i}_timeframe`,
        type: 'select', options: ['', '1 month', '3 months', '6 months', '1 year', 'As needed'],
        value: rd[`followUp_${i}_timeframe`] || insp.stepData?.['post-assessment']?.[`followUp_${i}_timeframe`] || '', locked },
      { label: 'Photos', type: 'photopicker', slotKey: `followUp_${i}_photoIds`, stepId: 'post',
        assignedIds: tryParseIds(`followUp_${i}_photoIds`), allPhotos, locked }
    ]));
  }

  body.appendChild(buildPostDivider());

  // ---- Actions Taken ----
  body.appendChild(buildPostSubheading('Actions Taken During Assessment',
    'What you physically did on-site. Each entry appears in the report.'));
  for (let i = 1; i <= 6; i++) {
    body.appendChild(buildPostGroup([
      { label: `Action ${i}`, stepId: 'post', field: `actionTaken_${i}_desc`,
        type: 'textarea', value: rd[`actionTaken_${i}_desc`] || insp.stepData?.['post-assessment']?.[`actionTaken_${i}_desc`] || '', locked,
        placeholder: 'e.g. Replaced HVAC filter — 20x20x1 MERV 11, installed new' },
      { label: 'Photos', type: 'photopicker', slotKey: `actionTaken_${i}_photoIds`, stepId: 'post',
        assignedIds: tryParseIds(`actionTaken_${i}_photoIds`), allPhotos, locked }
    ]));
  }

  body.appendChild(buildPostDivider());

  // ---- Assessment Observations ----
  body.appendChild(buildPostSubheading('Assessment Observations',
    'Notable findings for the report. Include location, what you saw, and a photo reference for each.'));
  for (let i = 1; i <= 6; i++) {
    body.appendChild(buildPostGroup([
      { label: `Observation ${i} — Room / Location`, stepId: 'post', field: `obs_${i}_location`,
        type: 'text', value: rd[`obs_${i}_location`] || insp.stepData?.['post-assessment']?.[`obs_${i}_location`] || '', locked,
        placeholder: 'e.g. Primary Bathroom' },
      { label: 'Observation', stepId: 'post', field: `obs_${i}_note`,
        type: 'textarea', value: rd[`obs_${i}_note`] || insp.stepData?.['post-assessment']?.[`obs_${i}_note`] || '', locked,
        placeholder: 'e.g. Active moisture staining on drywall below showerhead — no active drip at time of inspection' },
      { label: 'Photos', type: 'photopicker', slotKey: `obs_${i}_photoIds`, stepId: 'post',
        assignedIds: tryParseIds(`obs_${i}_photoIds`), allPhotos, locked }
    ]));
  }

  // ---- Completion Score ----
  renderScoreCard(body, insp);

  // ---- Photo Library ----
  renderPhotoLibrary(body, allPhotos, rd);

  if (!locked) {
    // Wire up all inputs in this section
    qsa('#post-content-body input, #post-content-body textarea, #post-content-body select').forEach(inp => {
      inp.addEventListener('blur', () => saveField(inp.dataset.step, inp.dataset.field, inp.value));
      inp.addEventListener('input', () => debouncedSave(inp.dataset.step, inp.dataset.field, inp.value));
    });

    // Build slot list for FAB
    const slots = [];
    for (let i = 1; i <= 5; i++) slots.push({ label: `Follow-up ${i}`, slotKey: `followUp_${i}_photoIds` });
    for (let i = 1; i <= 6; i++) slots.push({ label: `Action Taken ${i}`, slotKey: `actionTaken_${i}_photoIds` });
    for (let i = 1; i <= 6; i++) slots.push({ label: `Observation ${i}`, slotKey: `obs_${i}_photoIds` });
    renderPhotoFAB(allPhotos, slots, rd);
  } else {
    removePhotoFAB();
  }
}

function removePhotoFAB() {
  const existing = document.getElementById('photo-fab');
  if (existing) existing.remove();
}

function renderPhotoFAB(allPhotos, slots, rd) {
  removePhotoFAB();
  const fab = el('button', { id: 'photo-fab', class: 'photo-fab', type: 'button', title: 'Add photo to a section' });
  fab.innerHTML = '\uD83D\uDCF7';
  fab.addEventListener('click', () => openFABModal(allPhotos, slots, rd));
  document.body.appendChild(fab);
}

/* ============================================================
   COMPLETION SCORE
   ============================================================ */

function calculateCompletionScore(insp) {
  const rd       = insp.reviewedData || {};
  const photos   = insp.photos       || [];
  const steps    = insp.stepData     || {};
  const tests    = insp.testsConfirmed || {};

  const tryParse = key => { try { return JSON.parse(rd[key] || '[]'); } catch(e) { return []; } };

  // --- Category 1: Photo placement (30 pts) ---
  let photoScore = 30; // full credit if no photos
  if (photos.length > 0) {
    const allSlotIds = new Set();
    for (let i = 1; i <= 5; i++) tryParse(`followUp_${i}_photoIds`).forEach(id => allSlotIds.add(id));
    for (let i = 1; i <= 6; i++) tryParse(`actionTaken_${i}_photoIds`).forEach(id => allSlotIds.add(id));
    for (let i = 1; i <= 6; i++) tryParse(`obs_${i}_photoIds`).forEach(id => allSlotIds.add(id));
    photoScore = Math.round((allSlotIds.size / photos.length) * 30);
  }

  // --- Category 2: Observations filled (25 pts) ---
  let obsFilled = 0;
  for (let i = 1; i <= 6; i++) {
    const note  = (rd[`obs_${i}_note`] || '').trim();
    const loc   = (rd[`obs_${i}_location`] || '').trim();
    const hasPhoto = tryParse(`obs_${i}_photoIds`).length > 0;
    if (note && loc && hasPhoto) obsFilled += 1;       // full point
    else if (note || loc)        obsFilled += 0.5;     // half point — text but no photo or no location
  }
  const obsScore = Math.round((obsFilled / 6) * 25);

  // --- Category 3: Actions taken filled (25 pts) ---
  let actionsFilled = 0;
  for (let i = 1; i <= 6; i++) {
    const desc = (rd[`actionTaken_${i}_desc`] || insp.postAssessment?.[`actionTaken_${i}_desc`] || '').trim();
    const hasPhoto = tryParse(`actionTaken_${i}_photoIds`).length > 0;
    if (desc && hasPhoto) actionsFilled += 1;
    else if (desc)        actionsFilled += 0.6;
  }
  const actionsScore = Math.round((actionsFilled / 6) * 25);

  // --- Category 4: Checklist gates (20 pts) ---
  const gateResults  = evaluateGate(insp);
  const gatePassed   = gateResults.filter(r => r.pass).length;
  const gateScore    = Math.round((gatePassed / gateResults.length) * 20);

  const total = Math.min(100, photoScore + obsScore + actionsScore + gateScore);

  let grade, gradeClass;
  if (total >= 95) { grade = 'A+'; gradeClass = 'score-a-plus'; }
  else if (total >= 85) { grade = 'A';  gradeClass = 'score-a'; }
  else if (total >= 75) { grade = 'B';  gradeClass = 'score-b'; }
  else if (total >= 65) { grade = 'C';  gradeClass = 'score-c'; }
  else if (total >= 50) { grade = 'D';  gradeClass = 'score-d'; }
  else                  { grade = 'F';  gradeClass = 'score-f'; }

  return {
    total, grade, gradeClass,
    categories: [
      { label: 'Photos placed',     score: photoScore,   max: 30, detail: photos.length === 0 ? 'No photos' : `${[...new Set([].concat(...[1,2,3,4,5].map(i=>tryParse(`followUp_${i}_photoIds`)), ...[1,2,3,4,5,6].map(i=>tryParse(`actionTaken_${i}_photoIds`)), ...[1,2,3,4,5,6].map(i=>tryParse(`obs_${i}_photoIds`))))].length} of ${photos.length} assigned` },
      { label: 'Observations',      score: obsScore,     max: 25, detail: `${Math.round(obsFilled)} of 6 complete` },
      { label: 'Actions taken',     score: actionsScore, max: 25, detail: `${Math.round(actionsFilled)} of 6 complete` },
      { label: 'Checklist',         score: gateScore,    max: 20, detail: `${gatePassed} of ${gateResults.length} items` }
    ]
  };
}

function renderScoreCard(body, insp) {
  const score = calculateCompletionScore(insp);

  const card = el('div', { class: `score-card ${score.gradeClass}` });

  // Left: big number + grade
  const scoreLeft = el('div', { class: 'score-left' });
  scoreLeft.appendChild(el('div', { class: 'score-number' }, String(score.total)));
  scoreLeft.appendChild(el('div', { class: 'score-grade' }, score.grade));
  card.appendChild(scoreLeft);

  // Right: label + breakdown
  const scoreRight = el('div', { class: 'score-right' });
  const titleRow = el('div', { class: 'score-title-row' });
  titleRow.appendChild(el('div', { class: 'score-title' }, 'Inspection Score'));
  titleRow.appendChild(el('div', { class: 'score-subtitle' }, 'Used for inspector performance tracking'));
  scoreRight.appendChild(titleRow);

  const bars = el('div', { class: 'score-bars' });
  score.categories.forEach(cat => {
    const row = el('div', { class: 'score-bar-row' });
    row.appendChild(el('div', { class: 'score-bar-label' }, cat.label));
    const track = el('div', { class: 'score-bar-track' });
    const fill = el('div', { class: 'score-bar-fill' });
    fill.style.width = `${Math.round((cat.score / cat.max) * 100)}%`;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('div', { class: 'score-bar-pts' }, `${cat.score}/${cat.max}`));
    row.appendChild(el('div', { class: 'score-bar-detail' }, cat.detail));
    bars.appendChild(row);
  });
  scoreRight.appendChild(bars);
  card.appendChild(scoreRight);

  body.appendChild(card);
}

function renderPhotoLibrary(body, allPhotos, rd) {
  if (!allPhotos || allPhotos.length === 0) return;

  // Build reverse lookup: photoId → slot label
  const photoSlotMap = {};
  const slotDefs = [
    ...Array.from({length:5}, (_,i) => ({ key: `followUp_${i+1}_photoIds`,    label: `Follow-up ${i+1}` })),
    ...Array.from({length:6}, (_,i) => ({ key: `actionTaken_${i+1}_photoIds`, label: `Action ${i+1}` })),
    ...Array.from({length:6}, (_,i) => ({ key: `obs_${i+1}_photoIds`,         label: `Obs ${i+1}` }))
  ];
  slotDefs.forEach(({ key, label }) => {
    let ids = [];
    try { ids = JSON.parse(rd[key] || '[]'); } catch(e) {}
    ids.forEach(id => {
      if (!photoSlotMap[id]) photoSlotMap[id] = [];
      photoSlotMap[id].push(label);
    });
  });

  const assigned   = allPhotos.filter(p => photoSlotMap[p.photoId]);
  const unassigned = allPhotos.filter(p => !photoSlotMap[p.photoId]);

  const section = el('div', { class: 'photo-library-section' });

  // Header
  const hdr = el('div', { class: 'photo-library-header' });
  hdr.appendChild(el('div', { class: 'photo-library-title' }, '\uD83D\uDDBC\uFE0F Photo Library'));
  const summary = el('div', { class: 'photo-library-summary' });
  summary.appendChild(el('span', { class: 'lib-badge lib-badge-assigned' }, `${assigned.length} assigned`));
  if (unassigned.length > 0) {
    summary.appendChild(el('span', { class: 'lib-badge lib-badge-unassigned' }, `${unassigned.length} not placed`));
  }
  hdr.appendChild(summary);
  section.appendChild(hdr);

  // Size controls
  const SIZES = { S: '72px', M: '100px', L: '140px' };
  let libSize = getPaletteSize();
  const sizeBar = el('div', { class: 'palette-size-bar', style: 'margin-bottom:10px' });
  sizeBar.appendChild(el('span', {}, 'Size:'));
  ['S','M','L'].forEach(s => {
    const btn = el('button', { class: `palette-size-btn${s === libSize ? ' active' : ''}`, type: 'button' }, s);
    btn.addEventListener('click', () => {
      libSize = s;
      setPaletteSize(s);
      sizeBar.querySelectorAll('.palette-size-btn').forEach(b => b.classList.toggle('active', b.textContent === s));
      grid.style.setProperty('--lib-thumb-size', SIZES[s]);
    });
    sizeBar.appendChild(btn);
  });
  section.appendChild(sizeBar);

  // Grid
  const grid = el('div', { class: 'photo-library-grid' });
  grid.style.setProperty('--lib-thumb-size', SIZES[libSize]);

  allPhotos.forEach(photo => {
    const slots = photoSlotMap[photo.photoId];
    const isAssigned = !!slots;
    const card = el('div', { class: `lib-card${isAssigned ? ' lib-assigned' : ' lib-unassigned'}` });

    // Photo thumbnail
    const imgWrap = el('div', { class: 'lib-img-wrap' });
    if (photo.driveUrl) {
      imgWrap.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || photo.photoId, loading: 'lazy' }));
    } else {
      imgWrap.appendChild(el('div', { class: 'lib-img-placeholder' }, (photo.photoId || '').slice(-4)));
    }
    // Status badge
    if (isAssigned) {
      imgWrap.appendChild(el('div', { class: 'lib-slot-badge' }, slots.join(', ')));
    } else {
      imgWrap.appendChild(el('div', { class: 'lib-unplaced-badge' }, 'Not placed'));
    }
    card.appendChild(imgWrap);

    // Caption
    if (photo.caption) {
      card.appendChild(el('div', { class: 'lib-caption' }, photo.caption));
    }

    grid.appendChild(card);
  });

  section.appendChild(grid);
  body.appendChild(section);
}

function openFABModal(allPhotos, slots, rd) {
  const existing = qs('.photo-picker-modal-overlay');
  if (existing) existing.remove();

  const tryParseIds = key => { try { return JSON.parse(rd[key] || '[]'); } catch(e) { return []; } };

  const overlay = el('div', { class: 'photo-picker-modal-overlay' });
  const modal = el('div', { class: 'photo-picker-modal' });

  // Header
  const header = el('div', { class: 'picker-modal-header' });
  header.appendChild(el('h3', {}, 'Add Photos to Section'));
  const closeBtn = el('button', { class: 'picker-modal-close', type: 'button' }, '\u2715');
  closeBtn.addEventListener('click', () => overlay.remove());
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Slot selector
  const slotRow = el('div', { class: 'picker-slot-row' });
  slotRow.appendChild(el('label', { class: 'picker-slot-label' }, 'Add to:'));
  const slotSelect = el('select', { class: 'picker-slot-select' });
  slots.forEach(s => {
    const count = tryParseIds(s.slotKey).length;
    const opt = el('option', { value: s.slotKey }, `${s.label}${count > 0 ? ` (${count})` : ''}`);
    slotSelect.appendChild(opt);
  });
  slotRow.appendChild(slotSelect);
  modal.appendChild(slotRow);

  // Size controls
  const MODAL_SIZES = { S: '80px', M: '115px', L: '160px' };
  let modalSize = getPaletteSize();
  const sizeRow = el('div', { class: 'picker-modal-size-row' });
  sizeRow.appendChild(el('span', {}, 'Size:'));
  ['S','M','L'].forEach(s => {
    const btn = el('button', { class: `palette-size-btn${s === modalSize ? ' active' : ''}`, type: 'button' }, s);
    btn.addEventListener('click', () => {
      modalSize = s;
      setPaletteSize(s);
      sizeRow.querySelectorAll('.palette-size-btn').forEach(b => b.classList.toggle('active', b.textContent === s));
      grid.style.setProperty('--modal-thumb-size', MODAL_SIZES[s]);
    });
    sizeRow.appendChild(btn);
  });
  const countLabel = el('span', { class: 'picker-modal-count' }, '');
  sizeRow.appendChild(countLabel);
  modal.appendChild(sizeRow);

  // Photo grid — initialised for first slot
  let currentSlotKey = slots[0].slotKey;
  let selected = [...tryParseIds(currentSlotKey)];

  const updateCount = () => {
    countLabel.textContent = selected.length > 0 ? `${selected.length} selected` : '';
  };
  updateCount();

  const grid = el('div', { class: 'photo-picker-grid' });
  grid.style.setProperty('--modal-thumb-size', MODAL_SIZES[modalSize]);

  const buildGrid = () => {
    grid.innerHTML = '';
    if (!allPhotos || allPhotos.length === 0) {
      grid.appendChild(el('div', { class: 'picker-grid-empty' }, 'No photos in this inspection yet.'));
      return;
    }
    allPhotos.forEach(photo => {
      const item = el('div', {
        class: `picker-grid-item${selected.includes(photo.photoId) ? ' selected' : ''}`,
        'data-photo-id': photo.photoId
      });
      if (photo.driveUrl) {
        item.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || photo.photoId, loading: 'lazy' }));
      } else {
        item.appendChild(el('div', { class: 'picker-grid-placeholder' }, (photo.photoId || '').slice(-4)));
      }
      if (photo.caption) {
        item.appendChild(el('div', { class: 'picker-grid-caption' }, photo.caption));
      }
      item.addEventListener('click', () => {
        if (item.classList.contains('selected')) {
          selected = selected.filter(id => id !== photo.photoId);
          item.classList.remove('selected');
        } else {
          selected.push(photo.photoId);
          item.classList.add('selected');
        }
        updateCount();
      });
      grid.appendChild(item);
    });
  };
  buildGrid();

  // When slot changes, save current selection then load new slot's selection
  slotSelect.addEventListener('change', () => {
    // Save current before switching
    const jsonValue = JSON.stringify(selected);
    if (!_inspection.reviewedData) _inspection.reviewedData = {};
    _inspection.reviewedData[currentSlotKey] = jsonValue;
    saveField('post', currentSlotKey, jsonValue);
    rd[currentSlotKey] = jsonValue;
    // Update option label
    const prevOpt = Array.from(slotSelect.options).find(o => o.value === currentSlotKey);
    if (prevOpt) {
      const base = prevOpt.text.replace(/ \(\d+\)$/, '');
      prevOpt.text = selected.length > 0 ? `${base} (${selected.length})` : base;
    }
    // Switch to new slot
    currentSlotKey = slotSelect.value;
    selected = [...tryParseIds(currentSlotKey)];
    updateCount();
    buildGrid();
  });

  modal.appendChild(grid);

  // Footer
  const footer = el('div', { class: 'picker-modal-footer' });
  const doneBtn = el('button', { class: 'picker-done-btn', type: 'button' }, 'Done');
  doneBtn.addEventListener('click', () => {
    const jsonValue = JSON.stringify(selected);
    if (!_inspection.reviewedData) _inspection.reviewedData = {};
    _inspection.reviewedData[currentSlotKey] = jsonValue;
    saveField('post', currentSlotKey, jsonValue);
    overlay.remove();
    renderPostContentSection(_inspection, false);
  });
  footer.appendChild(doneBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function buildPostSubheading(title, subtitle) {
  const wrap = el('div', { class: 'post-subheading' });
  wrap.appendChild(el('div', { class: 'post-subheading-title' }, title));
  if (subtitle) wrap.appendChild(el('div', { class: 'post-subheading-sub' }, subtitle));
  return wrap;
}

function buildPostDivider() {
  return el('div', { class: 'post-divider' });
}

function buildPostGroup(fields) {
  const wrap = el('div', { class: 'post-group' });
  for (const f of fields) {
    const row = el('div', { class: 'post-field-row' });
    const lbl = el('label', { class: 'field-label' }, f.label);
    row.appendChild(lbl);
    let inp;
    if (f.type === 'photopicker') {
      row.appendChild(buildPhotoPickerField(f.slotKey, f.stepId, f.assignedIds || [], f.allPhotos || [], f.locked));
      wrap.appendChild(row);
      continue;
    } else if (f.type === 'textarea') {
      inp = el('textarea', {
        class: 'field-textarea',
        rows: '2',
        'data-step': f.stepId,
        'data-field': f.field,
        placeholder: f.placeholder || '',
        ...(f.locked ? { readonly: '' } : {})
      });
      inp.value = f.value || '';
    } else if (f.type === 'select') {
      inp = el('select', {
        class: 'field-input',
        'data-step': f.stepId,
        'data-field': f.field,
        ...(f.locked ? { disabled: '' } : {})
      });
      (f.options || []).forEach(opt => {
        const o = el('option', { value: opt }, opt || '— select —');
        if (f.value === opt) o.selected = true;
        inp.appendChild(o);
      });
    } else {
      inp = el('input', {
        type: 'text',
        class: 'field-input',
        'data-step': f.stepId,
        'data-field': f.field,
        placeholder: f.placeholder || '',
        ...(f.locked ? { readonly: '' } : {})
      });
      inp.value = f.value || '';
    }
    row.appendChild(inp);
    wrap.appendChild(row);
  }
  return wrap;
}

function renderReviewPage(insp) {
  // Nav title
  const navTitle = qs('#nav-title');
  if (navTitle) navTitle.textContent = `${insp.propertyAddress} — ${formatDate(insp.inspectionDate)}`;

  // Sticky bar
  const stickyAddress = qs('#sticky-address');
  const stickyDate    = qs('#sticky-date');
  const stickyStatus  = qs('#sticky-status');
  const stickyOwner   = qs('#sticky-owner');
  if (stickyAddress) stickyAddress.textContent = insp.propertyAddress;
  if (stickyDate)    stickyDate.textContent    = formatDate(insp.inspectionDate);
  if (stickyStatus)  stickyStatus.innerHTML   = statusBadgeHTML(insp.status);
  if (stickyOwner)   stickyOwner.textContent  = `Owner: ${insp.inspectorName}`;

  const isSubmitted = insp.status === 'Submitted to Tanner' || insp.status === 'Report Complete';

  // Submitted banner
  if (isSubmitted) {
    const banner = qs('#submitted-banner');
    if (banner) {
      banner.classList.remove('hidden');
      const bannerText = qs('#submitted-banner-text');
      if (bannerText) bannerText.textContent = `Submitted ${formatDateTime(insp.submittedToTannerAt || '')} — editing is locked.`;
    }
  }

  renderSummarySection(insp, isSubmitted);
  renderRoomsSection(insp, isSubmitted);
  renderTestsSection(insp, isSubmitted);
  try { renderPostContentSection(insp, isSubmitted); } catch(e) { console.error('renderPostContentSection failed:', e); }
  renderPhotosSection(insp, isSubmitted);
  renderSubmitSection(insp, isSubmitted);
  checkGate();
}

/* ============================================================
   SECTION 1 — INSPECTION SUMMARY
   ============================================================ */

function renderSummarySection(insp, locked) {
  const clientEl   = qs('#field-client-name');
  const addressEl  = qs('#field-property-address');
  const dateEl     = qs('#field-inspection-date');
  const inspEl     = qs('#field-inspector-name');
  const notesEl    = qs('#field-report-notes');

  if (clientEl)  { clientEl.value  = insp.reviewedData?.clientName  ?? insp.clientName;  }
  if (addressEl) { addressEl.value = insp.reviewedData?.propertyAddress ?? insp.propertyAddress; }
  if (dateEl)    { dateEl.value    = insp.reviewedData?.inspectionDate  ?? insp.inspectionDate; }
  if (inspEl)    { inspEl.value    = insp.inspectorName; inspEl.readOnly = true; }
  if (notesEl)   { notesEl.value   = insp.reportBuilderNotes ?? ''; }

  if (locked) {
    [clientEl, addressEl, dateEl, notesEl].forEach(e => { if (e) e.readOnly = true; });
  }

  // Attach change listeners
  if (!locked) {
    attachFieldSave(clientEl,  'summary', 'clientName');
    attachFieldSave(addressEl, 'summary', 'propertyAddress');
    attachFieldSave(dateEl,    'summary', 'inspectionDate');
    attachFieldSave(notesEl,   'summary', 'reportBuilderNotes', true);
  }
}

/* ============================================================
   INLINE SAVE — field change → debounced POST
   ============================================================ */

function attachFieldSave(element, stepId, fieldKey, isGated = false) {
  if (!element) return;
  element.addEventListener('input', () => {
    if (isGated) checkGate();
    debouncedSave(stepId, fieldKey, element.value);
    showOriginalIfChanged(element, stepId, fieldKey);
  });
  element.addEventListener('blur', () => {
    if (isGated) checkGate();
    saveField(stepId, fieldKey, element.value);
  });
}

function showOriginalIfChanged(element, stepId, fieldKey) {
  if (!_inspection) return;
  const originalContainer = element.parentElement?.querySelector('.field-original');
  if (!originalContainer) return;
  const originalVal = getOriginalValue(stepId, fieldKey);
  if (originalVal && element.value !== originalVal) {
    originalContainer.textContent = `Original: ${originalVal}`;
    originalContainer.classList.add('visible');
  } else {
    originalContainer.classList.remove('visible');
  }
}

function getOriginalValue(stepId, fieldKey) {
  if (!_inspection) return '';
  if (stepId === 'summary') {
    return _inspection[fieldKey] ?? '';
  }
  const step = _inspection.stepData?.[stepId];
  return step?.[fieldKey] ?? '';
}

function debouncedSave(stepId, fieldKey, value) {
  clearTimeout(_saveTimer);
  setSaveIndicator('saving');
  _saveTimer = setTimeout(() => saveField(stepId, fieldKey, value), 800);
}

async function saveField(stepId, fieldKey, value) {
  if (IS_DEMO) {
    setSaveIndicator('saved', formatTime(new Date().toISOString()));
    return;
  }
  const { id, token } = getURLParams();
  _pendingSaves++;
  setSaveIndicator('saving');
  try {
    await apiFetch(
      {},
      'POST',
      { action: 'saveReview', id, token, field: { stepId, key: fieldKey, value } }
    );
    // Update local state
    if (!_inspection.reviewedData) _inspection.reviewedData = {};
    if (stepId === 'summary') {
      _inspection.reviewedData[fieldKey] = value;
    } else {
      if (!_inspection.reviewedData[stepId]) _inspection.reviewedData[stepId] = {};
      _inspection.reviewedData[stepId][fieldKey] = value;
    }
  } catch (err) {
    showToast('Save failed — check connection', 'error');
    setSaveIndicator('error');
    _pendingSaves--;
    return;
  }
  _pendingSaves--;
  if (_pendingSaves <= 0) {
    _pendingSaves = 0;
    setSaveIndicator('saved', formatTime(new Date().toISOString()));
  }
}

/* ============================================================
   SECTION 3 — ROOMS & OBSERVATIONS
   ============================================================ */

function renderRoomsSection(insp, locked) {
  const container = qs('#rooms-container');
  if (!container) return;
  container.innerHTML = '';

  const steps = insp.stepData || {};
  const stepKeys = Object.keys(steps);

  if (!stepKeys.length) {
    container.innerHTML = '<p class="text-muted">No room data found.</p>';
    return;
  }

  for (const stepId of stepKeys) {
    const step = steps[stepId];
    container.appendChild(buildRoomCard(stepId, step, locked));
  }
}

function buildRoomCard(stepId, step, locked) {
  const reviewed   = step.voiceReviewed === true;
  const roomName   = step.roomName || stepId;
  const notes      = step.notes || step.arrivalNotes || '';
  const qtrak      = step.qtrakLocation || '';
  const breeze     = step.breezeLocation || '';

  const reviewedChip = el('span', { class: `voice-chip ${reviewed ? 'reviewed' : 'unreviewed'}` },
    reviewed ? '✓ Notes Reviewed' : '⚠ Needs Review'
  );

  const collapseIcon = el('svg', {
    class: 'collapse-icon', viewBox: '0 0 20 20', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round'
  });
  collapseIcon.innerHTML = '<polyline points="5 8 10 13 15 8"/>';

  const header = el('div', { class: 'room-header' },
    el('div', { class: 'room-name' }, roomName, reviewedChip),
    collapseIcon
  );

  // Voice review checkbox
  const voiceCheck = el('input', {
    type: 'checkbox',
    id: `vr-${stepId}`,
    ...(reviewed ? { checked: '' } : {}),
    ...(locked ? { disabled: '' } : {})
  });

  const voiceLabel = el('label', { for: `vr-${stepId}` },
    voiceCheck,
    ' I\'ve reviewed the voice dictation for this room'
  );

  voiceCheck.checked = reviewed;
  if (!locked) {
    voiceCheck.addEventListener('change', () => {
      const chip = header.querySelector('.voice-chip');
      if (chip) {
        chip.className = `voice-chip ${voiceCheck.checked ? 'reviewed' : 'unreviewed'}`;
        chip.textContent = voiceCheck.checked ? '✓ Notes Reviewed' : '⚠ Needs Review';
      }
      saveField(stepId, 'voiceReviewed', voiceCheck.checked);
      if (_inspection?.stepData?.[stepId]) {
        _inspection.stepData[stepId].voiceReviewed = voiceCheck.checked;
      }
      checkGate();
    });
  }

  const body = el('div', { class: 'room-body' });
  body.appendChild(el('div', { class: 'voice-review-row' }, voiceLabel));

  // Notes field
  body.appendChild(buildFieldEl(stepId, 'notes', locked ? 'Notes' : 'Notes (click to edit)', notes, true, locked));

  // Location fields for applicable rooms
  if ('qtrakLocation' in step || 'breezeLocation' in step) {
    const locGroup = el('div', { class: 'field-group two-col', style: 'margin-top:12px' });
    locGroup.appendChild(buildFieldEl(stepId, 'qtrakLocation', 'QTrak Location', qtrak, false, locked));
    locGroup.appendChild(buildFieldEl(stepId, 'breezeLocation', 'Breeze ET Location', breeze, false, locked));
    body.appendChild(locGroup);
  }

  const card = el('div', { class: 'room-section' }, header, body);

  header.addEventListener('click', () => {
    body.style.display = body.style.display === 'none' ? '' : 'none';
    collapseIcon.style.transform = (body.style.display === 'none') ? 'rotate(-90deg)' : '';
  });

  return card;
}

function buildFieldEl(stepId, fieldKey, label, value, isTextarea = false, locked = false) {
  const wrap = el('div', { class: 'mb-16' });
  const lbl  = el('label', { class: 'field-label' }, label);
  wrap.appendChild(lbl);

  let input;
  if (isTextarea) {
    input = el('textarea', { class: 'field-textarea', rows: '3', ...(locked ? { readonly: '' } : {}) });
  } else {
    input = el('input', { type: 'text', class: 'field-input', ...(locked ? { readonly: '' } : {}) });
  }
  input.value = value;

  const orig = el('div', { class: 'field-original' });
  wrap.appendChild(input);
  wrap.appendChild(orig);

  if (!locked) {
    attachFieldSave(input, stepId, fieldKey);
  }

  return wrap;
}

/* ============================================================
   SECTION 4 — TESTS & SAMPLES
   ============================================================ */

const TEST_DEFS = [
  { key: 'testBreeze',       label: 'Breeze ET (Mold)',  sampleKey: 'breezeSampleId' },
  { key: 'testBoulderBlue',  label: 'Boulder Blue (Allergen)', sampleKey: 'boulderBlueSampleId' },
  { key: 'testWaterPanel',   label: 'Water Panel',       sampleKey: 'waterSampleId' },
  { key: 'testPFAS',         label: 'PFAS',              sampleKey: 'pfasSampleId' },
  { key: 'testMicroplastics',label: 'Microplastics',     sampleKey: 'microplasticsSampleId' },
  { key: 'testRadon',        label: 'Radon',             sampleKey: 'radonSampleId' },
  { key: 'testATP',          label: 'ATP',               sampleKey: 'atpSampleId' },
  { key: 'testMoldSwabs',    label: 'Mold Swabs',        sampleKey: 'moldSwabSampleId' }
];

function renderTestsSection(insp, locked) {
  const tbody = qs('#tests-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const confirmed = insp.testsConfirmed || {};

  for (const test of TEST_DEFS) {
    const tr = document.createElement('tr');
    const sampleVal    = insp[test.sampleKey] || insp.reviewedData?.[test.sampleKey] || '';
    const locationVal  = insp.reviewedData?.[test.key + '_location'] || '';
    const notesVal     = insp.reviewedData?.[test.key + '_notes'] || '';
    const isConfirmed  = !!confirmed[test.key];

    const qtyVal = insp.reviewedData?.[test.key + '_qty'] || insp[test.key + '_qty'] || '';
    tr.innerHTML = `
      <td class="test-name">${escapeHTML(test.label)}</td>
      <td><input type="text" class="inline-input" data-step="tests" data-field="${test.key}_location"
          value="${escapeHTML(locationVal)}" placeholder="Enter location…"
          ${locked ? 'readonly' : ''}></td>
      <td><input type="text" class="inline-input" data-step="tests" data-field="${test.sampleKey}"
          value="${escapeHTML(sampleVal)}" placeholder="Sample ID…"
          ${locked ? 'readonly' : ''}></td>
      <td><input type="number" class="inline-input" data-step="tests" data-field="${test.key}_qty"
          value="${escapeHTML(qtyVal)}" placeholder="#" min="0" style="width:50px;text-align:center"
          ${locked ? 'readonly' : ''}></td>
      <td class="confirmed-check">
        <input type="checkbox" data-step="tests" data-field="${test.key}_confirmed"
            ${isConfirmed ? 'checked' : ''}
            ${locked ? 'disabled' : ''}>
      </td>
      <td><input type="text" class="inline-input" data-step="tests" data-field="${test.key}_notes"
          value="${escapeHTML(notesVal)}" placeholder="Notes…"
          ${locked ? 'readonly' : ''}></td>
    `;

    if (!locked) {
      const inputs = tr.querySelectorAll('.inline-input');
      inputs.forEach(inp => {
        inp.addEventListener('blur', () => {
          saveField(inp.dataset.step, inp.dataset.field, inp.value);
          checkGate();
        });
        inp.addEventListener('input', () => {
          debouncedSave(inp.dataset.step, inp.dataset.field, inp.value);
          checkGate();
        });
      });

      const cb = tr.querySelector('input[type="checkbox"]');
      if (cb) {
        cb.addEventListener('change', () => {
          saveField(cb.dataset.step, cb.dataset.field, cb.checked);
          checkGate();
        });
      }
    }

    tbody.appendChild(tr);
  }
}

/* ============================================================
   SECTION 5 — PHOTOS
   ============================================================ */

let _activeFilter = 'all';
let _activeRoomFilter = 'all';

function renderPhotosSection(insp, locked) {
  const container = qs('#photo-grid');
  if (!container) return;

  // Support both flat insp.photos and nested insp.rooms[].photos
  let flatPhotos = insp.photos || [];
  if (!flatPhotos.length && insp.rooms) {
    insp.rooms.forEach(room => {
      (room.photos || []).forEach(p => {
        flatPhotos.push(Object.assign({ roomName: room.roomName, photoId: p.photoId || ('ph_' + Math.random().toString(36).slice(2)) }, p));
      });
    });
  }

  const photos = flatPhotos.slice().sort((a, b) => {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });

  // Build room filter options
  const roomSelect = qs('#room-filter');
  if (roomSelect) {
    const rooms = [...new Set(photos.map(p => p.roomName).filter(Boolean))];
    roomSelect.innerHTML = '<option value="all">All Rooms</option>' +
      rooms.map(r => `<option value="${escapeHTML(r)}">${escapeHTML(r)}</option>`).join('');
    roomSelect.addEventListener('change', () => {
      _activeRoomFilter = roomSelect.value;
      renderPhotoGrid(photos, locked);
    });
  }

  // Filter buttons
  qsa('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _activeFilter = btn.dataset.filter || 'all';
      renderPhotoGrid(photos, locked);
    });
  });

  renderPhotoGrid(photos, locked);
}

function renderPhotoGrid(photos, locked) {
  const container = qs('#photo-grid');
  if (!container) return;
  container.innerHTML = '';

  const filtered = photos.filter(p => {
    const roomOk = _activeRoomFilter === 'all' || p.roomName === _activeRoomFilter;
    const statusOk =
      _activeFilter === 'all'        ? true :
      _activeFilter === 'include'    ? p.included === true :
      _activeFilter === 'exclude'    ? p.included === false :
      _activeFilter === 'unreviewed' ? p.included === null :
      true;
    return roomOk && statusOk;
  });

  if (!filtered.length) {
    container.innerHTML = '<p class="text-muted" style="grid-column:1/-1;padding:24px 0">No photos match this filter.</p>';
    return;
  }

  for (const photo of filtered) {
    container.appendChild(buildPhotoCard(photo, locked));
  }

  // Update photo count summary for submit section
  updatePhotoSummary(photos);
}

function buildPhotoCard(photo, locked) {
  const status =
    photo.included === true  ? 'included' :
    photo.included === false ? 'excluded' :
    'unreviewed';

  const card = el('div', { class: `photo-card ${status}`, 'data-photo-id': photo.photoId });

  // Thumbnail
  const thumbWrap = el('div', { class: 'photo-thumb-wrap' });
  if (photo.driveUrl) {
    const img = el('img', { src: photo.driveUrl, alt: photo.caption || '', loading: 'lazy' });
    thumbWrap.appendChild(img);
    thumbWrap.addEventListener('click', () => openPhotoModal(photo.driveUrl, photo.caption));
  } else {
    const placeholder = el('div', { class: 'photo-thumb-placeholder' });
    placeholder.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>No preview</span>`;
    thumbWrap.appendChild(placeholder);
  }

  const seqBadge = el('div', { class: 'photo-thumb-overlay' }, photo.stepName || '');
  thumbWrap.appendChild(seqBadge);
  card.appendChild(thumbWrap);

  // Info
  const info = el('div', { class: 'photo-info' });
  info.appendChild(el('div', { class: 'photo-room' }, photo.roomName || ''));
  info.appendChild(el('div', { class: 'photo-step' }, photo.stepName || ''));

  // Caption
  const captionWrap = el('div', { class: 'photo-caption' });
  const captionTA = el('textarea', {
    placeholder: 'Add caption…',
    rows: '2',
    ...(locked ? { readonly: '' } : {})
  });
  captionTA.value = photo.caption || '';
  if (!locked) {
    captionTA.addEventListener('blur', () => {
      photo.caption = captionTA.value;
      debouncedSave('photo_' + photo.photoId, 'caption', captionTA.value);
    });
  }
  captionWrap.appendChild(captionTA);
  info.appendChild(captionWrap);

  // Toggle buttons
  if (!locked) {
    const toggleRow = el('div', { class: 'photo-toggle' });
    const btns = [
      { label: '✓ Include', val: true,  cls: 'active-include' },
      { label: '✗ Exclude', val: false, cls: 'active-exclude' },
      { label: '? Unreviewed', val: null,  cls: 'active-unreviewed' }
    ];
    for (const b of btns) {
      const btn = el('button', {
        class: `toggle-btn ${photo.included === b.val ? b.cls : ''}`,
        type: 'button'
      }, b.label);
      btn.addEventListener('click', () => {
        setPhotoStatus(photo.photoId, b.val, card, toggleRow);
        photo.included = b.val;
        checkGate();
        updatePhotoSummary(_inspection?.photos || []);
      });
      toggleRow.appendChild(btn);
    }
    info.appendChild(toggleRow);
  }

  // Timestamp
  info.appendChild(el('div', { class: 'photo-timestamp' }, formatDateTime(photo.timestamp)));

  card.appendChild(info);
  return card;
}

function setPhotoStatus(photoId, status, card, toggleRow) {
  // status is true (include), false (exclude), null (unreviewed)
  const statusClass =
    status === true  ? 'included' :
    status === false ? 'excluded' :
    'unreviewed';

  card.className = `photo-card ${statusClass}`;

  // Update toggle button states
  if (toggleRow) {
    const btns = toggleRow.querySelectorAll('.toggle-btn');
    const classes = ['active-include', 'active-exclude', 'active-unreviewed'];
    btns.forEach((btn, i) => {
      btn.classList.remove(...classes);
      const targetStatus = [true, false, null][i];
      if (status === targetStatus) btn.classList.add(classes[i]);
    });
  }

  // Persist
  debouncedSave('photo_' + photoId, 'included', status);

  // Update _inspection photos array
  if (_inspection?.photos) {
    const p = _inspection.photos.find(ph => ph.photoId === photoId);
    if (p) p.included = status;
  }
}

function updatePhotoSummary(photos) {
  const included   = photos.filter(p => p.included === true).length;
  const excluded   = photos.filter(p => p.included === false).length;
  const unreviewed = photos.filter(p => p.included === null).length;

  const elInc = qs('#summary-included');
  const elRev = qs('#summary-reviewed');
  const elRooms = qs('#summary-rooms');

  if (elInc) elInc.textContent = included;

  if (elRev) {
    const rooms = _inspection?.stepData ? Object.keys(_inspection.stepData).length : 0;
    const reviewedRooms = _inspection?.stepData
      ? Object.values(_inspection.stepData).filter(s => s.voiceReviewed).length
      : 0;
    elRev.textContent = reviewedRooms;
    if (elRooms) elRooms.textContent = rooms;
  }
}

/* ============================================================
   PHOTO MODAL
   ============================================================ */

function openPhotoModal(url, caption) {
  let modal = qs('#photo-modal');
  if (!modal) {
    modal = el('div', { class: 'photo-modal hidden', id: 'photo-modal' });
    const inner = el('div', { class: 'photo-modal-inner' });
    const closeBtn = el('button', { class: 'photo-modal-close', type: 'button' }, '✕');
    closeBtn.addEventListener('click', closePhotoModal);
    modal.appendChild(inner);
    modal.appendChild(closeBtn);
    modal.addEventListener('click', e => { if (e.target === modal) closePhotoModal(); });
    document.body.appendChild(modal);
  }
  const inner = modal.querySelector('.photo-modal-inner');
  inner.innerHTML = '';
  const img = el('img', { src: url, alt: caption || '' });
  inner.appendChild(img);
  if (caption) inner.appendChild(el('p', { style: 'color:white;text-align:center;margin-top:8px;font-size:.85rem' }, caption));
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
  const modal = qs('#photo-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePhotoModal();
});

/* ============================================================
   SECTION 2 — COMPLETENESS GATE
   ============================================================ */

function checkGate() {
  if (!_inspection) return;
  const results = evaluateGate(_inspection);
  renderGate(results);
  updateSubmitButton(results);
}

function evaluateGate(insp) {
  const steps   = insp.stepData || {};
  const photos  = insp.photos  || [];
  const tests   = insp.testsConfirmed || {};
  const reviewed = insp.reviewedData || {};

  // 1. All room notes reviewed (voiceReviewed == true for each step)
  const allRooms   = Object.values(steps);
  const notesReviewed = allRooms.length > 0 && allRooms.every(s => s.voiceReviewed === true);

  // 2. All test locations recorded (qtrak + breeze in each room that has those fields)
  const roomsWithLocs = allRooms.filter(s => 'qtrakLocation' in s || 'breezeLocation' in s);
  const locsRecorded  = roomsWithLocs.length === 0 || roomsWithLocs.every(s =>
    (s.qtrakLocation || reviewed[s.stepId]?.qtrakLocation || '').trim() !== '' &&
    (s.breezeLocation || reviewed[s.stepId]?.breezeLocation || '').trim() !== ''
  );

  // 3. Tests conducted confirmation (at least one confirmed)
  const anyTestConfirmed = Object.values(tests).some(v => v === true);

  // 4. All photos marked Include or Exclude (none in unreviewed state)
  const allPhotosReviewed = photos.length === 0 || photos.every(p => p.included !== null);

  // 5. Report Builder Notes filled in
  const reportNotesEl = qs('#field-report-notes');
  const reportNotes   = (reportNotesEl?.value ?? insp.reportBuilderNotes ?? '').trim();
  const notesNotEmpty = reportNotes.length > 0;

  // 6. Sample IDs recorded (water + boulder blue if those tests confirmed)
  const waterOk   = !tests.testWaterPanel  || (insp.waterSampleId || reviewed.waterSampleId || '').trim() !== '';
  const boulderOk = !tests.testBoulderBlue || (insp.boulderBlueSampleId || reviewed.boulderBlueSampleId || '').trim() !== '';
  const samplesOk = waterOk && boulderOk;

  return [
    { key: 'notes',    label: 'All room notes reviewed',              pass: notesReviewed },
    { key: 'locs',     label: 'All test locations recorded',          pass: locsRecorded },
    { key: 'tests',    label: 'Tests conducted confirmation complete', pass: anyTestConfirmed },
    { key: 'photos',   label: 'All photos marked Include or Exclude', pass: allPhotosReviewed },
    { key: 'rbnotes',  label: 'Report Builder Notes filled in',       pass: notesNotEmpty },
    { key: 'samples',  label: 'Sample IDs recorded',                  pass: samplesOk }
  ];
}

function renderGate(results) {
  const list = qs('#gate-list');
  const section = qs('#gate-section');
  if (!list || !section) return;

  list.innerHTML = '';
  const failures = results.filter(r => !r.pass).length;
  const passing  = failures === 0;

  section.className = `gate-section ${passing ? 'gate-passing' : 'gate-failing'}`;

  const statusEl = qs('#gate-status-text');
  if (statusEl) {
    statusEl.className = `gate-status-text ${passing ? 'passing' : 'failing'}`;
    statusEl.textContent = passing
      ? '✅ Ready to submit'
      : `${failures} blocker${failures !== 1 ? 's' : ''} remaining`;
  }

  for (const item of results) {
    const gateItem = el('div', { class: 'gate-item' },
      el('div', { class: `gate-icon ${item.pass ? 'pass' : 'fail'}` }, item.pass ? '✓' : '✕'),
      el('span', { class: `gate-item-text ${item.pass ? 'pass' : 'fail'}` }, item.label)
    );
    list.appendChild(gateItem);
  }
}

function updateSubmitButton(results) {
  const btn = qs('#submit-btn');
  if (!btn) return;
  const passing = results.every(r => r.pass);
  btn.disabled = !passing;

  const submitSection = qs('#submit-section');
  if (submitSection) {
    if (passing) submitSection.classList.add('ready');
    else submitSection.classList.remove('ready');
  }
}

/* ============================================================
   SECTION 6 — SUBMIT TO TANNER
   ============================================================ */

function renderSubmitSection(insp, locked) {
  updatePhotoSummary(insp.photos || []);

  // Score in submit section
  const scoreWrap = qs('#submit-score-wrap');
  if (scoreWrap) {
    scoreWrap.innerHTML = '';
    const s = calculateCompletionScore(insp);
    const today       = new Date().toISOString().slice(0,10);
    const inspDate    = insp.inspectionDate ? insp.inspectionDate.slice(0,10) : null;
    const bonusEligible = s.total >= 85 && inspDate && today === inspDate;
    const bonusBadge = bonusEligible
      ? '<div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;background:#fef9c3;color:#854d0e;padding:6px 12px;border-radius:8px;font-size:0.8rem;font-weight:700">⚡ Same-Day Bonus earned — A grade submitted today!</div>'
      : '';
    scoreWrap.innerHTML = `
      <div class="submit-score-row">
        <span class="submit-score-num ${s.gradeClass}">${s.total}</span>
        <span class="submit-score-grade ${s.gradeClass}">${s.grade}</span>
        <span class="submit-score-label">Inspection Score — used for performance tracking</span>
      </div>
      ${bonusBadge}`;
  }

  const notesPreview = qs('#notes-preview');
  if (notesPreview) {
    const notes = (insp.reportBuilderNotes || '').trim();
    notesPreview.textContent = notes || 'No notes yet.';
    notesPreview.className = `notes-preview ${notes ? '' : 'empty'}`;
  }

  const submitBtn = qs('#submit-btn');
  if (submitBtn && locked) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Already Submitted';
  }
}

async function submitToTanner() {
  if (IS_DEMO) {
    showToast('Demo mode — submission not sent', 'demo', 5000);
    return;
  }

  const { id, token } = getURLParams();
  const btn = qs('#submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  // Calculate and save score before submitting
  const finalScore   = _inspection ? calculateCompletionScore(_inspection) : null;
  const submittedAt   = new Date().toISOString();
  const inspDate      = _inspection?.inspectionDate || '';
  const sameDayBonus  = finalScore && finalScore.total >= 85 && inspDate && submittedAt.slice(0,10) === inspDate.slice(0,10);

  try {
    await apiFetch({}, 'POST', { action: 'submit', id, token,
      completionScore: finalScore ? finalScore.total : null,
      completionGrade: finalScore ? finalScore.grade : null,
      submittedAt,
      sameDayBonus: sameDayBonus || false
    });
  } catch (err) {
    showToast(`Submission failed: ${err.message}`, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit to Tanner →'; }
    return;
  }

  showToast('Submitted. Tanner has been notified.', 'success', 6000);

  // Show submitted banner + lock page
  const banner = qs('#submitted-banner');
  if (banner) {
    banner.classList.remove('hidden');
    const bannerText = qs('#submitted-banner-text');
    if (bannerText) bannerText.textContent = `Submitted ${formatDateTime(new Date().toISOString())} — editing is locked.`;
  }

  // Lock all inputs
  qsa('input, textarea, button.toggle-btn').forEach(e => {
    e.disabled = true;
  });

  if (btn) { btn.textContent = 'Submitted ✓'; }

  // Update sticky status
  const stickyStatus = qs('#sticky-status');
  if (stickyStatus) stickyStatus.innerHTML = statusBadgeHTML('Submitted to Tanner');
}

async function adminUnlock() {
  if (IS_DEMO) {
    showToast('Demo mode — admin unlock not available', 'demo');
    return;
  }
  const { id, token } = getURLParams();
  const adminToken = prompt('Enter admin token to reopen this review:');
  if (!adminToken) return;
  try {
    await apiFetch({}, 'POST', { action: 'adminUnlock', id, token, adminToken });
    showToast('Inspection reopened for editing. Reload the page.', 'success', 5000);
  } catch (err) {
    showToast(`Unlock failed: ${err.message}`, 'error');
  }
}

/* ============================================================
   COLLAPSIBLE CARDS
   ============================================================ */

function initCollapsibles() {
  qsa('.card-header[data-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.card');
      if (card) card.classList.toggle('collapsed');
    });
  });
}

/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   GLOBAL INIT — dispatched by each page on DOMContentLoaded
   ============================================================ */

window.portalInit = function(page) {
  if (page === 'list') {
    loadInspectionList();
  } else if (page === 'review') {
    loadInspection();
  }
  initCollapsibles();
};

// Expose for inline HTML event attributes
window.submitToTanner = submitToTanner;
window.adminUnlock    = adminUnlock;
window.checkGate      = checkGate;
