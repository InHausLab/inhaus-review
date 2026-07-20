/**
 * InHaus Lab — Inspector Review Portal
 * portal.js — Vanilla JS, no frameworks
 *
 * Configuration: swap these two constants when Apps Script is deployed
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwWzLVAIbUMDR11ryZiHft3ZTrzT9zrCQl5Gw4Tq6nIoNYhCepQYEC0dYz3r8b51LEXqQ/exec'; // v73 — updated July 20 2026
const ACCESS_TOKEN    = 'InHaus2026';
const VISION_PROXY_URL = 'https://inhaus-vision-proxy.mjordanjay.workers.dev';

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
const _saveTimers = new Map(); // debounce handles keyed by field
let _saveChain = Promise.resolve(); // serialize backend writes to prevent lost updates
let _pendingSaves = 0;       // count of in-flight saves
let _currentPage = null;     // 'list' | 'review'
const _postVisibleCounts = new Map(); // expanded optional post-content rows per inspection

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

function slugifyRoomPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stepKeyForRoom(room = {}) {
  const type = slugifyRoomPart(room.type || '');
  const name = slugifyRoomPart(room.roomName || room.name || '');
  return [type, name].filter(Boolean).join('-');
}

function buildReviewRoomRecords(insp) {
  const steps = insp.stepData || {};
  const rooms = Array.isArray(insp.rooms) ? insp.rooms : [];
  const byRoomName = new Map();

  for (const [stepId, step] of Object.entries(steps)) {
    const nameKey = slugifyRoomPart(step.roomName || step.name || '');
    if (nameKey && !byRoomName.has(nameKey)) {
      byRoomName.set(nameKey, { stepId, step });
    }
  }

  if (rooms.length) {
    return rooms.map((room, index) => {
      const expectedKey = stepKeyForRoom(room);
      const directStep = expectedKey ? steps[expectedKey] : null;
      const nameMatch = byRoomName.get(slugifyRoomPart(room.roomName || room.name || ''));
      const stepId = directStep ? expectedKey : (nameMatch?.stepId || expectedKey || `room-${index + 1}`);
      const step = directStep || nameMatch?.step || {};
      return { room, step, stepId };
    });
  }

  return Object.entries(steps).map(([stepId, step]) => ({
    room: {
      roomName: step.roomName || step.name || stepId,
      type: step.type || '',
      level: step.level || '',
      flirDone: step.flirDone || '',
      flirConcerns: step.flirConcerns || '',
      breezeDone: step.breezeDone || ''
    },
    step,
    stepId
  }));
}

function getReviewedField(insp, group, key, fallback = '') {
  const rd = insp.reviewedData || {};
  if (group && rd[group] && rd[group][key] !== undefined) return rd[group][key];
  if (rd[key] !== undefined) return rd[key];
  if (group === 'summary' && rd.summary && rd.summary[key] !== undefined) return rd.summary[key];
  return fallback;
}

function getReviewedJSONField(insp, group, key, fallback = []) {
  const raw = getReviewedField(insp, group, key, null);
  if (raw == null || raw === '') return fallback;
  if (Array.isArray(raw) || (raw && typeof raw === 'object')) return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch(e) {
    return fallback;
  }
}

function setReviewedField(group, key, value) {
  if (!_inspection) return;
  if (!_inspection.reviewedData) _inspection.reviewedData = {};
  if (!group || group === 'summary') {
    _inspection.reviewedData[key] = value;
    return;
  }
  if (!_inspection.reviewedData[group]) _inspection.reviewedData[group] = {};
  _inspection.reviewedData[group][key] = value;
}

function attachReviewedFieldSave(element, group, key, isGated = false) {
  if (!element) return;
  const update = () => {
    setReviewedField(group, key, element.value);
    if (isGated) checkGate();
    debouncedSave(group, key, element.value);
  };
  element.addEventListener('input', update);
  element.addEventListener('blur', () => {
    setReviewedField(group, key, element.value);
    if (isGated) checkGate();
    saveField(group, key, element.value);
  });
}

function getURLParams() {
  const p = new URLSearchParams(window.location.search);
  return { id: p.get('id'), token: p.get('token') };
}

function getDriveIdFromPhoto(photo) {
  if (!photo) return '';
  if (photo.driveId) return String(photo.driveId);
  const url = String(photo.driveUrl || photo.url || photo.imageUrl || '');
  const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function normalizePhotoUrl(photo) {
  if (photo.driveUrl) return photo.driveUrl;
  const driveId = getDriveIdFromPhoto(photo);
  return driveId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1600` : '';
}

function photoKey(photo) {
  const driveId = getDriveIdFromPhoto(photo);
  if (driveId) return `drive:${driveId}`;
  if (photo.driveUrl || photo.localUrl || photo.url || photo.imageUrl) {
    return `url:${photo.driveUrl || photo.localUrl || photo.url || photo.imageUrl}`;
  }
  if (photo.photoId) return `id:${photo.photoId}`;
  return `meta:${photo.roomName || ''}|${photo.stepName || ''}|${photo.caption || ''}|${photo.timestamp || ''}`;
}

function assignPhotoId(photo, index, usedIds) {
  const driveId = getDriveIdFromPhoto(photo).replace(/[^a-zA-Z0-9]/g, '');
  let base = photo.photoId || (driveId ? `ph_${driveId.slice(-12)}` : `ph_${String(index + 1).padStart(3, '0')}`);
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) id = `${base}_${suffix++}`;
  usedIds.add(id);
  return id;
}

function flattenInspectionPhotos(insp) {
  const photosByKey = new Map();

  function addPhoto(photo, context = {}) {
    if (!photo || typeof photo !== 'object') return;
    const normalized = { ...photo };
    delete normalized.imageData;
    const driveUrl = normalizePhotoUrl(normalized);
    if (driveUrl) normalized.driveUrl = driveUrl;
    normalized.roomName = normalized.roomName || context.roomName || '';
    normalized.stepName = normalized.stepName || context.stepName || '';
    normalized.caption = normalized.caption || '';
    normalized.timestamp = normalized.timestamp || '';
    if (normalized.included === undefined) normalized.included = null;

    const hasUsefulData =
      normalized.driveUrl || normalized.localUrl || normalized.url || normalized.imageUrl ||
      normalized.caption || normalized.timestamp || normalized.roomName || normalized.stepName;
    if (!hasUsefulData) return;

    const key = photoKey(normalized);
    const existing = photosByKey.get(key);
    if (existing) {
      for (const [field, value] of Object.entries(normalized)) {
        if ((existing[field] === undefined || existing[field] === '') && value !== undefined && value !== '') {
          existing[field] = value;
        }
      }
      return;
    }
    photosByKey.set(key, normalized);
  }

  (insp.photos || []).forEach(photo => addPhoto(photo));

  function walk(value, context = {}, pathParts = []) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(item => walk(item, context, pathParts));
      return;
    }

    const nextContext = {
      roomName: value.roomName || value.name || context.roomName || '',
      stepName: value.stepName || value.stepId || value.type || context.stepName || ''
    };

    for (const [key, child] of Object.entries(value)) {
      if (key === 'photos' && Array.isArray(child)) {
        const isTopLevelPhotos = pathParts.length === 0;
        if (!isTopLevelPhotos) child.forEach(photo => addPhoto(photo, nextContext));
      } else if (child && typeof child === 'object') {
        walk(child, nextContext, pathParts.concat(key));
      }
    }
  }

  walk(insp);

  const usedIds = new Set();
  return Array.from(photosByKey.values())
    .sort((a, b) => {
      const ta = a.timestamp ? Date.parse(a.timestamp) : NaN;
      const tb = b.timestamp ? Date.parse(b.timestamp) : NaN;
      if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
      return 0;
    })
    .map((photo, index) => ({ ...photo, photoId: assignPhotoId(photo, index, usedIds) }));
}

function applyReviewedData(insp) {
  const reviewed = insp.reviewedData || {};
  const summary = reviewed.summary || {};
  ['clientName', 'propertyAddress', 'inspectionDate', 'reportBuilderNotes'].forEach(key => {
    if (summary[key] !== undefined) insp[key] = summary[key];
    else if (reviewed[key] !== undefined) insp[key] = reviewed[key];
  });

  (insp.photos || []).forEach(photo => {
    const nested = reviewed[`photo_${photo.photoId}`] || {};
    if (photo.originalRoomName === undefined) photo.originalRoomName = photo.roomName || '';
    if (photo.originalStepName === undefined) photo.originalStepName = photo.stepName || '';
    if (nested.caption !== undefined) photo.caption = nested.caption;
    if (nested.included !== undefined) photo.included = nested.included;
    if (nested.placement !== undefined) {
      let placement = nested.placement;
      if (typeof placement === 'string') {
        try { placement = JSON.parse(placement); } catch(e) { placement = null; }
      }
      if (placement && typeof placement === 'object') {
        photo.roomName = String(placement.roomName || '');
        photo.stepName = String(placement.stepName || '');
      }
    }
    const legacyCaption = reviewed[`caption_${photo.photoId}`];
    const legacyIncluded = reviewed[`included_${photo.photoId}`];
    if (legacyCaption !== undefined) photo.caption = legacyCaption;
    if (legacyIncluded !== undefined) photo.included = legacyIncluded;
  });
}

function normalizeInspectionForReview(insp) {
  if (!insp || typeof insp !== 'object') return insp;
  insp.id = insp.id || insp.inspectionId;
  insp.inspectionId = insp.inspectionId || insp.id;
  insp.photos = flattenInspectionPhotos(insp);
  applyReviewedData(insp);
  insp.photoCount = insp.photos.length;
  return insp;
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
    opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url.toString(), opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.status === 'error') throw new Error(json.message || 'API error');
  return json;
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
      try {
        data = await apiFetch({ action: 'list', token: ACCESS_TOKEN });
        if (!data || !Array.isArray(data.inspections)) throw new Error('Live list unavailable');
      } catch (apiErr) {
        const staticResp = await fetch('./api/list.json?t=' + Date.now());
        if (!staticResp.ok) throw apiErr;
        data = await staticResp.json();
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
      try {
        const liveData = await apiFetch({ action: 'get', id, token });
        insp = liveData.inspection || liveData;
        if (!insp || !insp.inspectionId) throw new Error('Live inspection unavailable');
      } catch (apiErr) {
        const staticResp = await fetch(`./api/inspections/${id}.json?t=` + Date.now());
        if (!staticResp.ok) throw apiErr;
        const staticData = await staticResp.json();
        insp = staticData.inspection || staticData;
      }
    } catch (err) {
      showToast(`Failed to load inspection: ${err.message}`, 'error');
      return;
    }
  }

  // Migrate older backend drafts that nested top-level review fields under
  // `summary` or `post`, even though the renderer reads those keys directly.
  if (insp.reviewedData && typeof insp.reviewedData === 'object') {
    ['summary', 'post'].forEach(group => {
      if (insp.reviewedData[group] && typeof insp.reviewedData[group] === 'object' && !Array.isArray(insp.reviewedData[group])) {
        Object.assign(insp.reviewedData, insp.reviewedData[group]);
        delete insp.reviewedData[group];
      }
    });
  }

  // Load any device-local recovery data and migrate the same older shape.
  if (!IS_DEMO && id) {
    try {
      const saved = JSON.parse(localStorage.getItem('inhaus_review_' + id) || '{}');
      ['summary', 'post'].forEach(group => {
        if (saved[group] && typeof saved[group] === 'object' && !Array.isArray(saved[group])) {
          Object.assign(saved, saved[group]);
          delete saved[group];
        }
      });
      if (Object.keys(saved).length > 0) {
        insp.reviewedData = mergeReviewData(insp.reviewedData || {}, saved);
      }
    } catch(e) {}
  }

  _inspection = normalizeInspectionForReview(insp);
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

// Returns array of { slotKey, label } for slots that contain this photoId
function getPhotoSlotAssignments(photoId, rd) {
  const tryParse = key => { try { return JSON.parse(rd[key] || '[]'); } catch(e) { return []; } };
  const allSlots = [
    ...Array.from({length:5}, (_,i) => ({ slotKey: `followUp_${i+1}_photoIds`,    label: `Follow-up ${i+1}` })),
    ...Array.from({length:6}, (_,i) => ({ slotKey: `actionTaken_${i+1}_photoIds`, label: `Action ${i+1}` })),
    ...Array.from({length:6}, (_,i) => ({ slotKey: `obs_${i+1}_photoIds`,         label: `Obs ${i+1}` }))
  ];
  return allSlots.filter(s => tryParse(s.slotKey).includes(photoId));
}

const PALETTE_SIZES = { S: '64px', M: '88px', L: '130px' };
function getPaletteSize() { return localStorage.getItem('palette-size') || 'M'; }
function setPaletteSize(size) { localStorage.setItem('palette-size', size); }

/* ============================================================
   VOICE-TO-TEXT ENGINE
   Uses Web Speech API (instant, on-device) with graceful fallback message.
   Mic button added to every textarea in Section 5.
   ============================================================ */

let _activeMicBtn = null; // currently recording button (only one at a time)

function buildMicButton(textarea, stepId, fieldKey) {
  const btn = el('button', { type: 'button', class: 'mic-btn', title: 'Tap to dictate' }, '🎙');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btn.title = 'Voice not supported in this browser';
    btn.classList.add('mic-btn-unsupported');
    return btn;
  }

  let recognition = null;

  btn.addEventListener('click', () => {
    // If another mic is active, stop it first
    if (_activeMicBtn && _activeMicBtn !== btn) {
      _activeMicBtn.click();
    }

    if (btn.classList.contains('mic-btn-recording')) {
      // Stop
      if (recognition) recognition.stop();
      btn.classList.remove('mic-btn-recording');
      btn.textContent = '🎙';
      _activeMicBtn = null;
      return;
    }

    // Start
    recognition = new SpeechRecognition();
    recognition.continuous    = true;
    recognition.interimResults = true;
    recognition.lang           = 'en-US';

    let baseText = textarea.value;
    if (baseText && !baseText.endsWith(' ')) baseText += ' ';

    recognition.onresult = (e) => {
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) {
        // Capitalise first letter, ensure space separator
        const cleaned = final.charAt(0).toUpperCase() + final.slice(1);
        baseText += cleaned + ' ';
      }
      textarea.value = baseText + interim;
      // Trigger save
      textarea.dispatchEvent(new Event('input'));
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') showToast('Microphone access denied — check browser permissions', 'error');
      btn.classList.remove('mic-btn-recording');
      btn.textContent = '🎙';
      _activeMicBtn = null;
    };

    recognition.onend = () => {
      // Save final value
      if (!_inspection.reviewedData) _inspection.reviewedData = {};
      _inspection.reviewedData[fieldKey] = textarea.value;
      saveField(stepId, fieldKey, textarea.value);
      if (btn.classList.contains('mic-btn-recording')) {
        // Browser auto-stopped (timeout) — restart
        recognition.start();
      }
    };

    recognition.start();
    btn.classList.add('mic-btn-recording');
    btn.textContent = '⏹';
    _activeMicBtn = btn;
  });

  return btn;
}

/* ============================================================
   SMART PRE-FILL — extract room notes from stepData
   ============================================================ */

function buildSmartPrefillSuggestions(insp) {
  // Returns approved inspector findings first, followed by room notes.
  // Approved photo comments keep their photo links so the report builder sees
  // the comment and evidence together in Assessment Observations.
  const suggestions = [];
  const stepData = insp.stepData || {};
  const photos   = insp.photos   || [];
  const seenNotes = new Set();

  (insp.findings || [])
    .filter(finding => finding && finding.status === 'approved')
    .forEach(finding => {
      const note = String(finding.cleanedComment || '').trim();
      if (!note) return;
      const noteKey = note.toLowerCase().replace(/\s+/g, ' ');
      if (seenNotes.has(noteKey)) return;
      seenNotes.add(noteKey);
      const linkedIds = new Set([
        ...(Array.isArray(finding.photoIds) ? finding.photoIds : []),
        finding.sourcePhotoId || ''
      ].filter(Boolean));
      suggestions.push({
        findingId: finding.findingId || '',
        source: 'approved_finding',
        stepId: finding.stepId || '',
        roomName: finding.roomName || finding.reportSection || finding.stepName || 'Inspection Finding',
        note,
        qtrak: '',
        breeze: '',
        photos: photos.filter(photo => linkedIds.has(photo.photoId))
      });
    });

  const SKIP_STEPS = new Set(['arrival', 'device-setup', 'debrief', 'post-assessment', 'pre-assessment']);

  for (const [stepId, step] of Object.entries(stepData)) {
    if (SKIP_STEPS.has(stepId)) continue;
    const roomName = step.roomName || stepId;
    const note     = (step.notes || step.aiSummary || '').trim();
    const qtrak    = (step.qtrakLocation || '').trim();
    const breeze   = (step.breezeLocation || '').trim();
    if (!note && !qtrak && !breeze) continue;
    const noteKey = [note, qtrak, breeze].join('|').toLowerCase().replace(/\s+/g, ' ');
    if (seenNotes.has(noteKey)) continue;
    seenNotes.add(noteKey);

    // Photos for this room
    const roomPhotos = photos.filter(p => p.roomName === roomName || p.stepId === stepId);

    suggestions.push({ source: 'room_note', stepId, roomName, note, qtrak, breeze, photos: roomPhotos });
  }

  return suggestions;
}

function applySmartPrefill(insp) {
  const suggestions = buildSmartPrefillSuggestions(insp);
  if (!suggestions.length) { showToast('No room notes found to pre-fill', 'info'); return; }

  const rd = insp.reviewedData || {};
  if (!insp.reviewedData) insp.reviewedData = {};

  let filled = 0;
  for (let i = 0; i < Math.min(suggestions.length, 6); i++) {
    const s = suggestions[i];
    const locKey  = `obs_${i + 1}_location`;
    const noteKey = `obs_${i + 1}_note`;

    // Only fill if slot is currently empty
    if (rd[locKey] || rd[noteKey]) continue;

    const locVal = s.roomName;
    let noteVal  = s.note;
    if (s.qtrak)  noteVal += (noteVal ? ' | ' : '') + `Q-Trak: ${s.qtrak}`;
    if (s.breeze) noteVal += (noteVal ? ' | ' : '') + `Breeze: ${s.breeze}`;

    insp.reviewedData[locKey]  = locVal;
    insp.reviewedData[noteKey] = noteVal;
    saveField('post', locKey,  locVal);
    saveField('post', noteKey, noteVal);
    const photoIds = (s.photos || []).map(photo => photo.photoId).filter(Boolean);
    if (photoIds.length) {
      const photoKey = `obs_${i + 1}_photoIds`;
      const photoValue = JSON.stringify(photoIds);
      insp.reviewedData[photoKey] = photoValue;
      saveField('post', photoKey, photoValue);
    }
    filled++;
  }

  if (filled === 0) {
    showToast('All observation slots already have content — clear slots to re-fill', 'info');
  } else {
    showToast(`Pre-filled ${filled} observation${filled !== 1 ? 's' : ''} from approved findings and room notes ✓`, 'success');
    renderPostContentSection(insp, false);
  }
}

function importApprovedFindingsIntoObservations(insp) {
  if (!insp.reviewedData) insp.reviewedData = {};
  const rd = insp.reviewedData;
  let importedIds = [];
  try { importedIds = JSON.parse(rd._importedApprovedFindingIds || '[]'); } catch(e) {}
  if (!Array.isArray(importedIds)) importedIds = [];
  const imported = new Set(importedIds);
  let changed = false;

  const approved = buildSmartPrefillSuggestions(insp)
    .filter(item => item.source === 'approved_finding' && item.findingId);
  approved.forEach(item => {
    if (imported.has(item.findingId)) return;
    const duplicateSlot = Array.from({ length: 6 }, (_, index) => index + 1)
      .find(index => String(rd[`obs_${index}_note`] || '').trim() === item.note);
    if (duplicateSlot) {
      imported.add(item.findingId);
      changed = true;
      return;
    }
    const openSlot = Array.from({ length: 6 }, (_, index) => index + 1)
      .find(index => !String(rd[`obs_${index}_location`] || '').trim() && !String(rd[`obs_${index}_note`] || '').trim());
    if (!openSlot) return;

    const locationKey = `obs_${openSlot}_location`;
    const noteKey = `obs_${openSlot}_note`;
    const photoKey = `obs_${openSlot}_photoIds`;
    const photoIds = (item.photos || []).map(photo => photo.photoId).filter(Boolean);
    rd[locationKey] = item.roomName;
    rd[noteKey] = item.note;
    if (photoIds.length) rd[photoKey] = JSON.stringify(photoIds);
    saveField('post', locationKey, rd[locationKey]);
    saveField('post', noteKey, rd[noteKey]);
    if (photoIds.length) saveField('post', photoKey, rd[photoKey]);
    imported.add(item.findingId);
    changed = true;
  });

  if (changed) {
    rd._importedApprovedFindingIds = JSON.stringify(Array.from(imported));
    saveField('post', '_importedApprovedFindingIds', rd._importedApprovedFindingIds);
  }
}

// Per-slot photo display size (S/M/L) — stored in reviewedData as {slotKey}_size
// Thumb pixel widths for portal display
const SLOT_THUMB_SIZES = { S: '60px', M: '90px', L: '140px' };
function getSlotSize(slotKey) {
  return (_inspection && _inspection.reviewedData && _inspection.reviewedData[slotKey + '_size']) || 'M';
}
function setSlotSize(slotKey, size) {
  if (!_inspection.reviewedData) _inspection.reviewedData = {};
  _inspection.reviewedData[slotKey + '_size'] = size;
  saveField('post', slotKey + '_size', size);
}

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
      thumb.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || '', loading: 'lazy', referrerpolicy: "no-referrer-when-downgrade" }));
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
    // Size controls row (S/M/L) — only shown when photos are assigned
    if (!locked) {
      let currentSize = getSlotSize(slotKey);
      const sizeRow = el('div', { class: 'slot-size-row' });
      sizeRow.appendChild(el('span', { class: 'slot-size-label' }, 'Report size:'));
      const thumbRow = el('div', { class: 'photo-picker-assigned' }); // forward ref for live update

      ['S','M','L'].forEach(s => {
        const btn = el('button', {
          class: `slot-size-btn${s === currentSize ? ' active' : ''}`,
          type: 'button',
          title: s === 'S' ? 'Small — 3 per row in report' : s === 'M' ? 'Medium — 2 per row' : 'Large — full width'
        }, s);
        btn.addEventListener('click', () => {
          currentSize = s;
          setSlotSize(slotKey, s);
          sizeRow.querySelectorAll('.slot-size-btn').forEach(b => b.classList.toggle('active', b.textContent === s));
          // Update thumb sizes live
          thumbRow.querySelectorAll('.picker-thumb').forEach(t => {
            t.style.width = SLOT_THUMB_SIZES[s];
            const img = t.querySelector('img');
            if (img) { img.style.width = SLOT_THUMB_SIZES[s]; img.style.height = SLOT_THUMB_SIZES[s]; }
            const ph = t.querySelector('.picker-thumb-placeholder');
            if (ph) { ph.style.width = SLOT_THUMB_SIZES[s]; ph.style.height = SLOT_THUMB_SIZES[s]; }
          });
        });
        sizeRow.appendChild(btn);
      });
      wrap.appendChild(sizeRow);

      // Build thumb row with current size applied
      const sz = SLOT_THUMB_SIZES[currentSize];
      assignedIds.forEach(pid => {
        const photo = allPhotos.find(p => p.photoId === pid);
        if (!photo) return;
        const thumb = el('div', { class: 'picker-thumb', style: `width:${sz}` });
        if (photo.driveUrl) {
          thumb.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || pid, loading: 'lazy', style: `width:${sz};height:${sz}`, referrerpolicy: "no-referrer-when-downgrade" }));
        } else {
          thumb.appendChild(el('div', { class: 'picker-thumb-placeholder', style: `width:${sz};height:${sz}` }, (pid || '').slice(-4)));
        }
        if (photo.caption) {
          thumb.appendChild(el('div', { class: 'picker-thumb-caption', style: `max-width:${sz}` }, photo.caption));
        }
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
        thumbRow.appendChild(thumb);
      });
      wrap.appendChild(thumbRow);
    } else {
      // Locked view — no size controls, fixed size
      const row = el('div', { class: 'photo-picker-assigned' });
      assignedIds.forEach(pid => {
        const photo = allPhotos.find(p => p.photoId === pid);
        if (!photo) return;
        const thumb = el('div', { class: 'picker-thumb' });
        if (photo.driveUrl) {
          thumb.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || pid, loading: 'lazy', referrerpolicy: "no-referrer-when-downgrade" }));
        } else {
          thumb.appendChild(el('div', { class: 'picker-thumb-placeholder' }, (pid || '').slice(-4)));
        }
        if (photo.caption) {
          thumb.appendChild(el('div', { class: 'picker-thumb-caption' }, photo.caption));
        }
        row.appendChild(thumb);
      });
      wrap.appendChild(row);
    }
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
      item.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || photo.photoId, loading: 'lazy', referrerpolicy: "no-referrer-when-downgrade" }));
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

  if (!insp.reviewedData) insp.reviewedData = {};
  const rd = insp.reviewedData;
  const allPhotos = insp.photos || [];
  if (!locked) importApprovedFindingsIntoObservations(insp);

  // Pre-populate slots from spare photo assignedSlot field (set by inspector in app)
  // Only applies when the slot is currently empty — never overwrites reviewer's manual assignments
  if (allPhotos.length > 0) {
    const SLOT_MAP = {
      obs_1: 'obs_1_photoIds', obs_2: 'obs_2_photoIds', obs_3: 'obs_3_photoIds',
      obs_4: 'obs_4_photoIds', obs_5: 'obs_5_photoIds', obs_6: 'obs_6_photoIds',
      actionTaken_1: 'actionTaken_1_photoIds', actionTaken_2: 'actionTaken_2_photoIds',
      actionTaken_3: 'actionTaken_3_photoIds', actionTaken_4: 'actionTaken_4_photoIds',
      actionTaken_5: 'actionTaken_5_photoIds', actionTaken_6: 'actionTaken_6_photoIds',
      followUp_1: 'followUp_1_photoIds', followUp_2: 'followUp_2_photoIds',
      followUp_3: 'followUp_3_photoIds', followUp_4: 'followUp_4_photoIds',
      followUp_5: 'followUp_5_photoIds'
    };
    allPhotos.forEach(photo => {
      if (!photo.assignedSlot) return;
      const slotKey = SLOT_MAP[photo.assignedSlot];
      if (!slotKey) return;
      // Only add if not already in this slot
      let ids = [];
      try { ids = JSON.parse(rd[slotKey] || '[]'); } catch(e) {}
      if (!ids.includes(photo.photoId)) {
        ids.push(photo.photoId);
        rd[slotKey] = JSON.stringify(ids);
      }
    });
  }

  const assignedSet = getAllSection5AssignedIds(rd);
  const tryParseIds = key => { try { return JSON.parse(rd[key] || '[]'); } catch(e) { return []; } };
  const postData = insp.stepData?.['post-assessment'] || {};
  const hasText = (...keys) => keys.some(key => String(rd[key] || postData[key] || '').trim());
  const hasPhotos = key => tryParseIds(key).length > 0;

  // ---- Follow-up Actions ----
  body.appendChild(buildPostSubheading('Follow-Up Actions Needed',
    'Recommended re-checks for the client report. Add another only when needed.'));
  renderProgressivePostGroups(body, {
    insp, locked, sectionKey: 'follow-up', maxCount: 5,
    addLabel: '+ Add another follow-up action',
    emptyLabel: 'No follow-up actions recorded.',
    hasContent: i => hasText(`followUp_${i}_desc`, `followUp_${i}_whatToWatch`, `followUp_${i}_timeframe`) || hasPhotos(`followUp_${i}_photoIds`),
    buildGroup: i => buildPostGroup([
      { label: `Action ${i} — Description`, stepId: 'post', field: `followUp_${i}_desc`,
        type: 'textarea', value: rd[`followUp_${i}_desc`] || insp.stepData?.['post-assessment']?.[`followUp_${i}_whatToWatch`] || '', locked,
        placeholder: 'e.g. Re-test basement east wall in 3 months — active moisture risk (🎙 speak then review)' },
      { label: 'Timeframe', stepId: 'post', field: `followUp_${i}_timeframe`,
        type: 'select', options: ['', '1 month', '3 months', '6 months', '1 year', 'As needed'],
        value: rd[`followUp_${i}_timeframe`] || insp.stepData?.['post-assessment']?.[`followUp_${i}_timeframe`] || '', locked },
      { label: 'Photos', type: 'photopicker', slotKey: `followUp_${i}_photoIds`, stepId: 'post',
        assignedIds: tryParseIds(`followUp_${i}_photoIds`), allPhotos, locked }
    ])
  });

  body.appendChild(buildPostDivider());

  // ---- Actions Taken ----
  body.appendChild(buildPostSubheading('Actions Taken During Assessment',
    'What you physically did on-site. Add another only when needed.'));
  renderProgressivePostGroups(body, {
    insp, locked, sectionKey: 'actions-taken', maxCount: 6,
    addLabel: '+ Add another action taken',
    emptyLabel: 'No actions taken were recorded.',
    hasContent: i => hasText(`actionTaken_${i}_desc`) || hasPhotos(`actionTaken_${i}_photoIds`),
    buildGroup: i => buildPostGroup([
      { label: `Action ${i}`, stepId: 'post', field: `actionTaken_${i}_desc`,
        type: 'textarea', value: rd[`actionTaken_${i}_desc`] || insp.stepData?.['post-assessment']?.[`actionTaken_${i}_desc`] || '', locked,
        placeholder: 'e.g. Replaced HVAC filter — 20x20x1 MERV 11, installed new' },
      { label: 'Photos', type: 'photopicker', slotKey: `actionTaken_${i}_photoIds`, stepId: 'post',
        assignedIds: tryParseIds(`actionTaken_${i}_photoIds`), allPhotos, locked }
    ])
  });

  body.appendChild(buildPostDivider());

  // ---- Assessment Observations ----
  body.appendChild(buildPostSubheading('Assessment Observations',
    'Notable findings for the report. Start with one and add another only when needed.'));

  // Pre-fill button — only show when room notes exist and slots are empty
  if (!locked) {
    const prefillBtn = el('button', { type: 'button', class: 'prefill-btn' },
      '\u2728 Fill from approved findings & inspection notes');
    prefillBtn.addEventListener('click', () => applySmartPrefill(insp));
    body.appendChild(prefillBtn);
  }

  renderProgressivePostGroups(body, {
    insp, locked, sectionKey: 'observations', maxCount: 6,
    addLabel: '+ Add another observation',
    emptyLabel: 'No assessment observations recorded.',
    hasContent: i => hasText(`obs_${i}_location`, `obs_${i}_note`) || hasPhotos(`obs_${i}_photoIds`),
    buildGroup: i => buildPostGroup([
      { label: `Observation ${i} — Room / Location`, stepId: 'post', field: `obs_${i}_location`,
        type: 'text', value: rd[`obs_${i}_location`] || insp.stepData?.['post-assessment']?.[`obs_${i}_location`] || '', locked,
        placeholder: 'e.g. Primary Bathroom' },
      { label: 'Observation', stepId: 'post', field: `obs_${i}_note`,
        type: 'textarea', value: rd[`obs_${i}_note`] || insp.stepData?.['post-assessment']?.[`obs_${i}_note`] || '', locked,
        placeholder: 'e.g. Active moisture staining on drywall below showerhead — no active drip at time of inspection' },
      { label: 'Photos', type: 'photopicker', slotKey: `obs_${i}_photoIds`, stepId: 'post',
        assignedIds: tryParseIds(`obs_${i}_photoIds`), allPhotos, locked }
    ])
  });

  // ---- Completion Score ----
  renderScoreCard(body, insp);

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

function renderPhotoLibrary(body, allPhotos, rd, insp) {
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
      imgWrap.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || photo.photoId, loading: 'lazy', referrerpolicy: "no-referrer-when-downgrade" }));
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

    // Caption — editable inline
    const captionWrap = el('div', { class: 'lib-caption-wrap' });
    const captionEl = el('input', {
      type: 'text',
      class: 'lib-caption-input',
      value: photo.caption || '',
      placeholder: 'Add caption…',
      'data-photo-id': photo.photoId
    });
    captionEl.addEventListener('blur', () => {
      const newCaption = captionEl.value.trim();
      // Update in-memory photo object
      const idx = (insp.photos || []).findIndex(p => p.photoId === photo.photoId);
      if (idx !== -1) {
        _inspection.photos[idx].caption = newCaption;
        photo.caption = newCaption;
      }
      // Persist to Apps Script
      saveField('photos', `caption_${photo.photoId}`, newCaption);
    });
    captionEl.addEventListener('keydown', e => { if (e.key === 'Enter') captionEl.blur(); });
    captionWrap.appendChild(captionEl);
    card.appendChild(captionWrap);

    // Move/Assign button — always visible, opens slot-toggle modal
    const allSlots = [
      ...Array.from({length:5}, (_,i) => ({ label: `Follow-up ${i+1}`,    slotKey: `followUp_${i+1}_photoIds` })),
      ...Array.from({length:6}, (_,i) => ({ label: `Action ${i+1}`,       slotKey: `actionTaken_${i+1}_photoIds` })),
      ...Array.from({length:6}, (_,i) => ({ label: `Observation ${i+1}`,  slotKey: `obs_${i+1}_photoIds` }))
    ];
    const moveBtn = el('button', {
      class: `lib-move-btn${isAssigned ? '' : ' lib-move-btn-urgent'}`,
      type: 'button',
      id: `assign-badge-${photo.photoId}`
    }, isAssigned ? `\uD83D\uDCCC ${slots.join(', ')}` : '\u2014 Not in any section');
    moveBtn.className = `lib-move-btn photo-assign-badge${isAssigned ? ' is-assigned' : ' not-assigned'}`;
    moveBtn.id = `assign-badge-${photo.photoId}`;
    moveBtn.addEventListener('click', () => openAssignPhotoModal(photo, allPhotos, allSlots, rd));
    card.appendChild(moveBtn);

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
        item.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || photo.photoId, loading: 'lazy', referrerpolicy: "no-referrer-when-downgrade" }));
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

/* ============================================================
   SECTION 6 — ASSIGN PHOTO TO SECTION (from photo grid card)
   ============================================================ */

function openAssignPhotoModal(photo, allPhotos, slots, rd) {
  const existing = qs('.photo-assign-modal-overlay');
  if (existing) existing.remove();

  const tryParseIds = key => { try { return JSON.parse(rd[key] || '[]'); } catch(e) { return []; } };

  const overlay = el('div', { class: 'photo-assign-modal-overlay photo-picker-modal-overlay' });
  const modal = el('div', { class: 'photo-picker-modal photo-assign-modal' });

  // Header
  const header = el('div', { class: 'picker-modal-header' });
  const titleWrap = el('div', { class: 'assign-modal-title' });
  titleWrap.appendChild(el('div', { class: 'assign-modal-photo-name' }, photo.caption || photo.photoId));
  titleWrap.appendChild(el('div', { class: 'assign-modal-sub' }, `${photo.roomName || ''}${photo.stepName ? ' — ' + photo.stepName : ''}`));
  header.appendChild(titleWrap);
  const closeBtn = el('button', { class: 'picker-modal-close', type: 'button' }, '\u2715');
  closeBtn.addEventListener('click', () => overlay.remove());
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // Slot list — each slot shows current count + whether this photo is in it
  const slotListWrap = el('div', { class: 'assign-slot-list' });
  slotListWrap.appendChild(el('div', { class: 'assign-slot-hint' }, 'Toggle the slots this photo should appear in:'));

  const slotState = {}; // slotKey → current ids + original value
  slots.forEach(s => {
    const ids = [...tryParseIds(s.slotKey)];
    slotState[s.slotKey] = { ids, original: JSON.stringify(ids) };
  });

  const buildSlotRows = () => {
    slotListWrap.querySelectorAll('.assign-slot-row').forEach(r => r.remove());
    slots.forEach(s => {
      const state = slotState[s.slotKey];
      const isIn = state.ids.includes(photo.photoId);
      const row = el('div', { class: `assign-slot-row${isIn ? ' slot-active' : ''}` });
      const checkIcon = el('span', { class: 'assign-slot-check' }, isIn ? '\u2713' : '');
      const labelEl = el('span', { class: 'assign-slot-label' }, s.label);
      const countEl = el('span', { class: 'assign-slot-count' }, state.ids.length > 0 ? `${state.ids.length} photo${state.ids.length !== 1 ? 's' : ''}` : 'empty');
      row.appendChild(checkIcon);
      row.appendChild(labelEl);
      row.appendChild(countEl);
      row.addEventListener('click', () => {
        if (isIn) {
          state.ids = state.ids.filter(id => id !== photo.photoId);
        } else {
          state.ids.push(photo.photoId);
        }
        buildSlotRows();
      });
      slotListWrap.appendChild(row);
    });
  };
  buildSlotRows();
  modal.appendChild(slotListWrap);

  // Footer
  const footer = el('div', { class: 'picker-modal-footer' });
  const cancelBtn = el('button', { class: 'picker-cancel-btn', type: 'button', style: 'margin-right:8px' }, 'Cancel');
  cancelBtn.addEventListener('click', () => overlay.remove());
  const doneBtn = el('button', { class: 'picker-done-btn', type: 'button' }, 'Save');
  doneBtn.addEventListener('click', () => {
    if (!_inspection.reviewedData) _inspection.reviewedData = {};
    // Save only slots that changed. Saving all 17 slots made one assignment
    // generate 17 sequential backend writes and could take close to a minute.
    slots.forEach(s => {
      const jsonValue = JSON.stringify(slotState[s.slotKey].ids);
      if (jsonValue === slotState[s.slotKey].original) return;
      _inspection.reviewedData[s.slotKey] = jsonValue;
      saveField('post', s.slotKey, jsonValue);
    });
    overlay.remove();
    // Update badge on the card in Section 6
    const badge = qs(`#assign-badge-${photo.photoId}`);
    if (badge) {
      const newAssignments = slots.filter(s => slotState[s.slotKey].ids.includes(photo.photoId));
      badge.textContent = newAssignments.length > 0
        ? `\uD83D\uDCCC ${newAssignments.map(a => a.label).join(', ')}`
        : '\u2014 Not in any section';
      badge.className = `photo-assign-badge${newAssignments.length > 0 ? ' is-assigned' : ' not-assigned'}`;
    }
    // Refresh Section 5 so photo library + pickers reflect the change
    if (_inspection) renderPostContentSection(_inspection, false);
  });
  footer.appendChild(cancelBtn);
  footer.appendChild(doneBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function preserveVisiblePostInputs(insp) {
  if (!insp.reviewedData) insp.reviewedData = {};
  qsa('#post-content-body [data-step="post"][data-field]').forEach(inp => {
    insp.reviewedData[inp.dataset.field] = inp.value;
  });
}

function renderProgressivePostGroups(container, config) {
  const {
    insp, locked, sectionKey, maxCount, addLabel, emptyLabel,
    hasContent, buildGroup
  } = config;
  const inspectionKey = insp.inspectionId || insp.id || 'current';
  const stateKey = `${inspectionKey}:${sectionKey}`;

  let highestUsed = 0;
  for (let i = 1; i <= maxCount; i++) {
    if (hasContent(i)) highestUsed = i;
  }

  const rememberedCount = Number(_postVisibleCounts.get(stateKey) || 0);
  const visibleCount = locked
    ? highestUsed
    : Math.min(maxCount, Math.max(1, highestUsed, rememberedCount));
  if (!locked) _postVisibleCounts.set(stateKey, visibleCount);

  const list = el('div', {
    class: 'progressive-post-groups',
    'data-post-section': sectionKey
  });

  if (visibleCount === 0) {
    list.appendChild(el('div', { class: 'post-empty-state' }, emptyLabel));
  }

  for (let i = 1; i <= visibleCount; i++) {
    const group = buildGroup(i);
    group.setAttribute('data-post-index', String(i));
    list.appendChild(group);
  }

  if (!locked && visibleCount < maxCount) {
    const addButton = el('button', {
      class: 'post-add-another-btn',
      type: 'button'
    }, addLabel);
    addButton.addEventListener('click', () => {
      preserveVisiblePostInputs(insp);
      _postVisibleCounts.set(stateKey, visibleCount + 1);
      renderPostContentSection(insp, false);
      requestAnimationFrame(() => {
        const nextGroup = qs(`[data-post-section="${sectionKey}"] [data-post-index="${visibleCount + 1}"]`);
        nextGroup?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    list.appendChild(addButton);
  }

  container.appendChild(list);
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
      // Wrap textarea + mic button together
      const taWrap = el('div', { class: 'textarea-mic-wrap' });
      inp = el('textarea', {
        class: 'field-textarea',
        rows: '2',
        'data-step': f.stepId,
        'data-field': f.field,
        placeholder: f.placeholder || '',
        ...(f.locked ? { readonly: '' } : {})
      });
      inp.value = f.value || '';
      taWrap.appendChild(inp);
      if (!f.locked) {
        taWrap.appendChild(buildMicButton(inp, f.stepId, f.field));
      }
      row.appendChild(taWrap);
      wrap.appendChild(row);
      continue; // skip the generic row.appendChild(inp) below
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

function displayValue(value) {
  return value === undefined || value === null || value === '' ? '—' : String(value);
}

function renderIntakeSummary(insp) {
  const body = qs('#intake-summary-body');
  if (!body) return;
  body.innerHTML = '';

  const items = [
    { label: 'Property', value: insp.propertyAddress, wide: true },
    { label: 'Client', value: insp.clientName },
    { label: 'Inspector', value: insp.inspectorName },
    { label: 'Date', value: formatDate(insp.inspectionDate) },
    { label: 'Type', value: insp.residenceType },
    { label: 'Year Built', value: insp.yearBuilt },
    { label: 'Sq Ft', value: insp.squareFootage },
    { label: 'Bedrooms', value: insp.numberOfBedrooms },
    { label: 'Bathrooms', value: insp.numberOfBathrooms },
    { label: 'Levels', value: insp.numberOfLevels },
    { label: 'Basement', value: insp.basement },
    { label: 'Water Source', value: insp.waterSource },
    { label: 'Filtration', value: insp.waterFiltration },
    { label: 'Softener', value: insp.waterSoftener },
    { label: 'Heating', value: insp.heating },
    { label: 'AC', value: insp.ac },
    { label: 'Ventilation', value: insp.ventilation },
    { label: 'Weather', value: insp.weatherConditions },
    { label: 'Occupancy', value: insp.occupancyDuringInspection },
    { label: 'Client Concerns', value: insp.clientConcerns, wide: true },
    { label: 'Known Problem Areas', value: insp.knownProblemAreas, wide: true }
  ];

  items.forEach(item => {
    const node = el('div', { class: `intake-summary-item${item.wide ? ' wide' : ''}` },
      el('div', { class: 'intake-summary-label' }, item.label),
      el('div', { class: 'intake-summary-value' }, displayValue(item.value))
    );
    body.appendChild(node);
  });
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
  renderWaterFindingsSection(insp, isSubmitted);
  renderFollowUpItemsSection(insp, isSubmitted);
  renderTestsSection(insp, isSubmitted);
  try { renderPostContentSection(insp, isSubmitted); } catch(e) { console.error('renderPostContentSection failed:', e); }
  try { renderPhotosSection(insp, isSubmitted); } catch(e) { console.error('renderPhotosSection failed:', e); }
  // Keep photos section expanded by default
  const photosCard = qs('#photos-card');
  if (photosCard) photosCard.classList.remove('collapsed');
  try { renderSubmitSection(insp, isSubmitted); } catch(e) { console.error('renderSubmitSection failed:', e); }
  checkGate();
}

/* ============================================================
   SECTION 1 — INSPECTION SUMMARY
   ============================================================ */

function renderSummarySection(insp, locked) {
  renderIntakeSummary(insp);

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

function mergeReviewData(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      mergeReviewData(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function debouncedSave(stepId, fieldKey, value) {
  const timerKey = `${stepId}:${fieldKey}`;
  clearTimeout(_saveTimers.get(timerKey));
  setSaveIndicator('saving');
  _saveTimers.set(timerKey, setTimeout(() => {
    _saveTimers.delete(timerKey);
    saveField(stepId, fieldKey, value);
  }, 800));
}

async function saveField(stepId, fieldKey, value) {
  if (IS_DEMO) {
    setSaveIndicator('saved', formatTime(new Date().toISOString()));
    return true;
  }
  const { id, token } = getURLParams();
  const isTopLevelField = stepId === 'summary' || stepId === 'post';
  _pendingSaves++;
  setSaveIndicator('saving');
  try {
    // Save to localStorage — persists across sessions on this device
    const storageKey = 'inhaus_review_' + id;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch(e) {}
    if (isTopLevelField) {
      saved[fieldKey] = value;
      if (saved[stepId] && typeof saved[stepId] === 'object') {
        delete saved[stepId][fieldKey];
        if (Object.keys(saved[stepId]).length === 0) delete saved[stepId];
      }
    } else {
      if (!saved[stepId]) saved[stepId] = {};
      saved[stepId][fieldKey] = value;
    }
    localStorage.setItem(storageKey, JSON.stringify(saved));
    // Update local state
    if (!_inspection.reviewedData) _inspection.reviewedData = {};
    if (isTopLevelField) {
      _inspection.reviewedData[fieldKey] = value;
    } else {
      if (!_inspection.reviewedData[stepId]) _inspection.reviewedData[stepId] = {};
      _inspection.reviewedData[stepId][fieldKey] = value;
    }

    // Serialize backend writes. The old portal stopped after localStorage and
    // still showed "Saved", which meant drafts vanished on another device.
    const remoteSave = _saveChain.then(() => apiFetch({}, 'POST', {
      action: 'saveReview',
      id,
      token,
      field: { stepId, key: fieldKey, value }
    }));
    _saveChain = remoteSave.catch(() => {});
    await remoteSave;
  } catch (err) {
    showToast('Cloud save failed — local recovery copy kept', 'error');
    setSaveIndicator('error');
    _pendingSaves--;
    return false;
  }
  _pendingSaves--;
  if (_pendingSaves <= 0) {
    _pendingSaves = 0;
    setSaveIndicator('saved', formatTime(new Date().toISOString()));
  }
  return true;
}

/* ============================================================
   SECTION 3 — ROOMS & OBSERVATIONS
   ============================================================ */

function isAffirmative(value) {
  return String(value || '').trim().toLowerCase() === 'yes';
}

function statusDisplay(value) {
  return String(value || '').trim() || 'Not recorded';
}

function buildStatusPill(label, value, warn = false) {
  const valueText = statusDisplay(value);
  const valueClass = warn && isAffirmative(value)
    ? ' warn'
    : isAffirmative(value) ? ' yes' : '';
  return el('span', { class: `room-status-pill${valueClass}` },
    el('span', { class: 'room-status-label' }, label),
    el('span', { class: 'room-status-value' }, valueText)
  );
}

function buildReadOnlyBlock(label, value, emptyText) {
  const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
  return el('div', { class: `room-readonly-block${hasValue ? '' : ' empty'}` },
    el('div', { class: 'field-label' }, label),
    el('div', { class: 'room-readonly-text' }, hasValue ? String(value) : emptyText)
  );
}

function getRoomInspectorNotes(record) {
  const step = record?.step || {};
  const room = record?.room || {};
  return String(step.notes || step.arrivalNotes || room.observations || '').trim();
}

function roomHasReviewableNotes(record) {
  return getRoomInspectorNotes(record) !== '';
}

function buildRoomAliasMap(roomRecords) {
  const aliasesByStepId = new Map();
  const groups = {};

  roomRecords.forEach(record => {
    const aliases = new Set();
    const roomName = record.room?.roomName || record.step?.roomName || record.stepId;
    [roomName, record.step?.roomName].filter(Boolean).forEach(name => aliases.add(slugifyRoomPart(name)));
    aliasesByStepId.set(record.stepId, aliases);

    const type = record.room?.type || record.step?.type || '';
    if (!groups[type]) groups[type] = [];
    groups[type].push(record);
  });

  function addIndexedAliases(type, prefix) {
    (groups[type] || []).forEach((record, index) => {
      const aliases = aliasesByStepId.get(record.stepId);
      aliases.add(slugifyRoomPart(`${prefix} ${index + 1}`));
    });
  }

  addIndexedAliases('bedroom', 'Bedroom');
  addIndexedAliases('bathroom', 'Bathroom');
  addIndexedAliases('additional-room', 'Additional Room');

  return aliasesByStepId;
}

function photosForRoomRecord(photos, record, aliasesByStepId) {
  const aliases = aliasesByStepId.get(record.stepId) || new Set();
  const seen = new Set();
  return (photos || []).filter(photo => {
    const photoNames = [
      photo.roomName,
      photo.assignedRoom,
      photo.assignedRoomName,
      photo.reviewRoomName,
      photo.room,
      photo.roomLabel
    ].filter(Boolean);
    const matches = photoNames.some(name => aliases.has(slugifyRoomPart(name)));
    if (!matches) return false;
    const key = photo.photoId || photo.driveId || photo.driveUrl || JSON.stringify(photo);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function aiSummaryLooksContradictory(summary, roomPhotos) {
  if (!summary || !roomPhotos.length) return false;
  return /(?:not completed|not performed|not tested|not been tested|not yet been completed|was not completed|was not performed|was not tested|has not been completed|should be scheduled|follow-up visit)/i.test(summary);
}

function buildAISummaryBlock(summary, roomPhotos) {
  if (aiSummaryLooksContradictory(summary, roomPhotos)) {
    return el('div', { class: 'room-readonly-block ai-summary-warning' },
      el('div', { class: 'field-label' }, 'AI Summary'),
      el('div', { class: 'room-readonly-text' },
        'AI summary needs review: the generated text says a test was not completed, but photos are assigned to this room. Use the source status fields, room photos, and Tanner notes instead.'
      )
    );
  }
  return buildReadOnlyBlock('AI Summary', summary, 'No AI summary available.');
}

function buildRoomPhotoStrip(roomPhotos) {
  const wrap = el('div', { class: 'room-photo-strip-wrap' });
  wrap.appendChild(el('div', { class: 'field-label' }, `Room Photos (${roomPhotos.length})`));

  if (!roomPhotos.length) {
    wrap.appendChild(el('div', { class: 'room-photo-empty' }, 'No photos match this room name.'));
    return wrap;
  }

  const strip = el('div', { class: 'room-photo-strip' });
  roomPhotos.forEach(photo => {
    if (photo.driveUrl) {
      const openInlinePhoto = e => {
        e.stopPropagation();
        e.preventDefault();
        openPhotoModal(photo.driveUrl, photo.caption, photo.photoId);
      };
      const thumb = el('a', {
        class: 'room-photo-thumb',
        href: photo.driveUrl,
        target: '_blank',
        rel: 'noopener',
        title: photo.caption || photo.photoId || '',
        'aria-label': photo.caption ? `Open ${photo.caption}` : 'Open room photo',
        'data-photo-url': photo.driveUrl,
        'data-photo-id': photo.photoId || '',
        'data-photo-caption': photo.caption || '',
        onclick: openInlinePhoto
      });
      thumb.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || photo.photoId || '', loading: 'lazy', referrerpolicy: "no-referrer-when-downgrade" }));
      thumb.addEventListener('click', openInlinePhoto);
      if (photo.caption) {
        thumb.appendChild(el('span', { class: 'room-photo-caption' }, photo.caption));
      }
      strip.appendChild(thumb);
    } else {
      const thumb = el('button', {
        class: 'room-photo-thumb',
        type: 'button',
        title: photo.caption || photo.photoId || ''
      });
      thumb.appendChild(el('span', {}, (photo.photoId || '').slice(-4) || 'Photo'));
      if (photo.caption) {
        thumb.appendChild(el('span', { class: 'room-photo-caption' }, photo.caption));
      }
      strip.appendChild(thumb);
    }
  });
  wrap.appendChild(strip);
  return wrap;
}

function renderRoomsSection(insp, locked) {
  const container = qs('#rooms-container');
  if (!container) return;
  container.innerHTML = '';
  container.onclick = e => {
    const thumb = e.target.closest('.room-photo-thumb[data-photo-url]');
    if (!thumb || !container.contains(thumb)) return;
    const url = thumb.dataset.photoUrl || '';
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    openPhotoModal(url, thumb.dataset.photoCaption || '', thumb.dataset.photoId || '');
  };

  const roomRecords = buildReviewRoomRecords(insp);

  if (!roomRecords.length) {
    container.innerHTML = '<p class="text-muted">No room data found.</p>';
    return;
  }

  const aliasesByStepId = buildRoomAliasMap(roomRecords);
  for (const record of roomRecords) {
    container.appendChild(buildRoomCard(record, insp, locked, aliasesByStepId));
  }
}

function buildRoomCard(record, insp, locked, aliasesByStepId) {
  const { stepId, step = {}, room = {} } = record;
  const hasNotes   = roomHasReviewableNotes(record);
  const reviewed   = hasNotes && step.voiceReviewed === true;
  const roomName   = room.roomName || step.roomName || stepId;
  const level      = room.level || step.level || '';
  const type       = room.type || step.type || '';
  const flirDone   = room.flirDone || step.flirDone || '';
  const flirConcerns = room.flirConcerns || step.flirConcerns || '';
  const breezeDone = room.breezeDone || step.breezeDone || '';
  const qtrak      = step.qtrakLocation || '';
  const breeze     = step.breezeLocation || '';
  const notes      = getRoomInspectorNotes(record);
  const aiSummary  = step.aiSummary || '';
  const hasConcern = isAffirmative(flirConcerns);
  const roomPhotos = photosForRoomRecord(insp.photos || [], record, aliasesByStepId);
  const tannerNotesKey = `room_${stepId}_tannerNotes`;
  const tannerNotes = getReviewedField(insp, 'roomData', tannerNotesKey, '');

  const reviewStatusClass = !hasNotes ? 'no-notes' : reviewed ? 'reviewed' : 'unreviewed';
  const reviewStatusText = !hasNotes ? 'No Notes' : reviewed ? '✓ Notes Reviewed' : '⚠ Review Notes';
  const reviewedChip = el('span', { class: `voice-chip ${reviewStatusClass}` }, reviewStatusText);

  const collapseIcon = el('svg', {
    class: 'collapse-icon', viewBox: '0 0 20 20', fill: 'none',
    stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round'
  });
  collapseIcon.innerHTML = '<polyline points="5 8 10 13 15 8"/>';

  const titleMeta = el('div', { class: 'room-title-meta' });
  if (level) titleMeta.appendChild(el('span', { class: 'room-meta-chip' }, level));
  if (type) titleMeta.appendChild(el('span', { class: 'room-meta-chip muted' }, type));
  titleMeta.appendChild(el('span', { class: 'room-meta-chip muted' }, `${roomPhotos.length} photo${roomPhotos.length !== 1 ? 's' : ''}`));
  if (hasConcern) titleMeta.appendChild(el('span', { class: 'room-warning-chip' }, 'FLIR concern'));

  const header = el('div', { class: 'room-header' },
    el('div', { class: 'room-title-wrap' },
      el('div', { class: 'room-name' }, roomName, reviewedChip),
      titleMeta
    ),
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
    ' I\'ve reviewed the inspector notes for this room'
  );

  voiceCheck.checked = reviewed;
  if (!locked) {
    voiceCheck.addEventListener('change', () => {
      const chip = header.querySelector('.voice-chip');
      if (chip) {
        chip.className = `voice-chip ${voiceCheck.checked ? 'reviewed' : 'unreviewed'}`;
        chip.textContent = voiceCheck.checked ? '✓ Notes Reviewed' : '⚠ Review Notes';
      }
      saveField(stepId, 'voiceReviewed', voiceCheck.checked);
      if (_inspection?.stepData?.[stepId]) {
        _inspection.stepData[stepId].voiceReviewed = voiceCheck.checked;
      }
      checkGate();
    });
  }

  const body = el('div', { class: 'room-body' });
  if (hasNotes) {
    body.appendChild(el('div', { class: 'voice-review-row' }, voiceLabel));
  }

  const statusRow = el('div', { class: 'room-status-row' },
    buildStatusPill('FLIR done', flirDone),
    buildStatusPill('FLIR concerns', flirConcerns, true),
    buildStatusPill('Breeze done', breezeDone)
  );
  body.appendChild(statusRow);

  body.appendChild(buildReadOnlyBlock('Inspector Notes', notes, 'No inspector notes recorded.'));
  body.appendChild(buildAISummaryBlock(aiSummary, roomPhotos));
  body.appendChild(buildRoomPhotoStrip(roomPhotos));

  const tannerWrap = el('div', { class: 'room-tanner-notes' });
  tannerWrap.appendChild(el('label', { class: 'field-label', for: `tanner-${stepId}` }, 'Tanner Notes'));
  const tannerTA = el('textarea', {
    id: `tanner-${stepId}`,
    class: 'field-textarea',
    rows: '3',
    placeholder: 'Add Tanner-facing notes for this room...',
    ...(locked ? { readonly: '' } : {})
  });
  tannerTA.value = tannerNotes;
  tannerWrap.appendChild(tannerTA);
  body.appendChild(tannerWrap);
  if (!locked) {
    attachReviewedFieldSave(tannerTA, 'roomData', tannerNotesKey);
  }

  // Location fields for applicable rooms
  if ('qtrakLocation' in step || 'breezeLocation' in step) {
    const locGroup = el('div', { class: 'field-group two-col', style: 'margin-top:12px' });
    locGroup.appendChild(buildFieldEl(stepId, 'qtrakLocation', 'QTrak Location', qtrak, false, locked));
    locGroup.appendChild(buildFieldEl(stepId, 'breezeLocation', 'Breeze ET Location', breeze, false, locked));
    body.appendChild(locGroup);
  }

  const card = el('div', {
    class: `room-section${hasConcern ? ' has-concern' : ''}`,
    'data-room-step-id': stepId,
    'data-room-name': roomName
  }, header, body);

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
   SECTION 4 — WATER FINDINGS
   ============================================================ */

function waterFindingLabel(key) {
  const labels = {
    pH: 'pH',
    LI: 'LI',
    TDS: 'TDS',
    pet: 'PET',
    abs: 'ABS',
    pva: 'PVA'
  };
  if (labels[key]) return labels[key];
  return String(key || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function renderWaterFindingsSection(insp, locked) {
  const body = qs('#water-findings-body');
  if (!body) return;
  body.innerHTML = '';

  const findings = insp.waterFindings || {};
  const fridge = findings.fridgeLine || null;
  const sink = findings.kitchenSink || null;
  const microplastics = findings.microplastics || null;

  if (!fridge && !sink && !microplastics) {
    body.appendChild(el('p', { class: 'text-muted' }, 'No water findings found.'));
    return;
  }

  if (fridge || sink) {
    const tableWrap = el('div', { class: 'water-table-wrap' });
    const table = el('table', { class: 'water-findings-table' });
    table.appendChild(el('thead', {},
      el('tr', {},
        el('th', {}, 'Parameter'),
        el('th', {}, 'Fridge Line'),
        el('th', {}, 'Kitchen Sink')
      )
    ));
    const tbody = el('tbody');
    ['copper', 'sodium', 'hardness', 'pH', 'LI', 'TDS', 'lead', 'iron', 'ryznar'].forEach(key => {
      const hasValue = (fridge && fridge[key] !== undefined) || (sink && sink[key] !== undefined);
      if (!hasValue) return;
      tbody.appendChild(el('tr', {},
        el('td', { class: 'water-param' }, waterFindingLabel(key)),
        el('td', {}, displayValue(fridge?.[key])),
        el('td', {}, displayValue(sink?.[key]))
      ));
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    body.appendChild(tableWrap);
  }

  if (microplastics) {
    const micro = el('div', { class: 'microplastics-card' });
    micro.appendChild(el('div', { class: 'microplastics-total' },
      el('span', { class: 'microplastics-label' }, 'Microplastics Total'),
      el('span', { class: 'microplastics-value' }, displayValue(microplastics.total))
    ));
    const chips = el('div', { class: 'microplastics-breakdown' });
    ['rubber', 'polystyrene', 'polyamide', 'polyethylene', 'pet', 'abs', 'pva'].forEach(key => {
      if (microplastics[key] === undefined) return;
      chips.appendChild(el('span', { class: 'microplastic-chip' },
        `${waterFindingLabel(key)}: ${displayValue(microplastics[key])}`
      ));
    });
    micro.appendChild(chips);
    body.appendChild(micro);
  }

  const notesWrap = el('div', { class: 'water-notes-wrap' });
  notesWrap.appendChild(el('label', { class: 'field-label', for: 'field-water-tanner-notes' }, 'Tanner Notes'));
  const notes = el('textarea', {
    id: 'field-water-tanner-notes',
    class: 'field-textarea',
    rows: '3',
    placeholder: 'Add Tanner-facing notes about water findings...',
    ...(locked ? { readonly: '' } : {})
  });
  notes.value = getReviewedField(insp, 'roomData', 'waterFindingsNotes', '');
  notesWrap.appendChild(notes);
  body.appendChild(notesWrap);
  if (!locked) attachReviewedFieldSave(notes, 'roomData', 'waterFindingsNotes');
}

/* ============================================================
   SECTION 5 — FOLLOW-UP ITEMS
   ============================================================ */

function normalizeFollowUpItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    room: item?.room || '',
    recheckIn: item?.recheckIn || '',
    watchFor: item?.watchFor || ''
  }));
}

function renderFollowUpItemsSection(insp, locked) {
  const body = qs('#follow-up-body');
  if (!body) return;
  body.innerHTML = '';

  let items = normalizeFollowUpItems(
    getReviewedJSONField(insp, 'roomData', 'followUpItems', insp.followUpItems || [])
  );

  const persist = (saveNow = false) => {
    const jsonValue = JSON.stringify(items);
    setReviewedField('roomData', 'followUpItems', jsonValue);
    if (saveNow) saveField('roomData', 'followUpItems', jsonValue);
    else debouncedSave('roomData', 'followUpItems', jsonValue);
  };

  const tableWrap = el('div', { class: 'follow-up-table-wrap' });
  const table = el('table', { class: 'follow-up-table' });
  table.appendChild(el('thead', {},
    el('tr', {},
      el('th', {}, 'Room'),
      el('th', {}, 'Recheck In'),
      el('th', {}, 'Watch For'),
      locked ? null : el('th', { class: 'follow-up-actions-th' }, '')
    )
  ));
  const tbody = el('tbody');

  if (!items.length) {
    tbody.appendChild(el('tr', {},
      el('td', { colspan: locked ? '3' : '4', class: 'empty-state follow-up-empty' }, 'No follow-up items recorded.')
    ));
  }

  items.forEach((item, index) => {
    const tr = el('tr');
    const fields = [
      { key: 'room', placeholder: 'Room' },
      { key: 'recheckIn', placeholder: 'e.g. 6 months' },
      { key: 'watchFor', placeholder: 'What to watch for' }
    ];

    fields.forEach(field => {
      const input = el('input', {
        type: 'text',
        class: 'inline-input',
        value: item[field.key] || '',
        placeholder: field.placeholder,
        ...(locked ? { readonly: '' } : {})
      });
      if (!locked) {
        input.addEventListener('input', () => {
          items[index][field.key] = input.value;
          persist(false);
        });
        input.addEventListener('blur', () => {
          items[index][field.key] = input.value;
          persist(true);
        });
      }
      tr.appendChild(el('td', {}, input));
    });

    if (!locked) {
      const removeBtn = el('button', { type: 'button', class: 'follow-up-remove-btn', title: 'Remove follow-up item' }, 'Remove');
      removeBtn.addEventListener('click', () => {
        items.splice(index, 1);
        persist(true);
        renderFollowUpItemsSection(_inspection, locked);
      });
      tr.appendChild(el('td', { class: 'follow-up-action-cell' }, removeBtn));
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  body.appendChild(tableWrap);

  if (!locked) {
    const addBtn = el('button', { type: 'button', class: 'follow-up-add-btn' }, '+ Add follow-up item');
    addBtn.addEventListener('click', () => {
      items.push({ room: '', recheckIn: '', watchFor: '' });
      persist(true);
      renderFollowUpItemsSection(_inspection, locked);
    });
    body.appendChild(addBtn);
  }
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
const _selectedPhotoIds = new Set();

function photoPlacementKey(roomName, stepName) {
  return `${String(roomName || '')}\u001f${String(stepName || '')}`;
}

function buildPhotoPlacementDestinations(insp) {
  const rooms = new Map();
  const tasks = new Map();
  const addRoom = roomName => {
    const room = String(roomName || '').trim();
    if (!room) return;
    const key = photoPlacementKey(room, '');
    if (!rooms.has(key)) rooms.set(key, { key, roomName: room, stepName: '', label: `Room — ${room}` });
  };
  const addTask = (roomName, stepName, customLabel = '') => {
    const room = String(roomName || '').trim();
    const task = String(stepName || '').trim();
    if (!task) return;
    const key = photoPlacementKey(room, task);
    if (!tasks.has(key)) {
      tasks.set(key, {
        key,
        roomName: room,
        stepName: task,
        label: customLabel || `Task — ${task}${room ? ` (${room})` : ''}`
      });
    }
  };

  buildReviewRoomRecords(insp).forEach(record => {
    addRoom(record.room?.roomName || record.step?.roomName || record.stepId);
  });
  (insp.photos || []).forEach(photo => {
    addRoom(photo.originalRoomName);
    addTask(photo.originalRoomName, photo.originalStepName);
    addRoom(photo.roomName);
    addTask(photo.roomName, photo.stepName);
  });

  const hasWaterEquipment = (insp.photos || []).some(photo =>
    /utility room/i.test(String(photo.roomName || '')) ||
    /water filtration|water treatment|uv system/i.test(String(photo.stepName || ''))
  );
  if (hasWaterEquipment) {
    addRoom('Utility Room');
    addTask('Utility Room', 'Water Treatment System', 'Task — Water Treatment System (Utility Room)');
  }

  const byLabel = (a, b) => a.label.localeCompare(b.label);
  return {
    rooms: Array.from(rooms.values()).sort(byLabel),
    tasks: Array.from(tasks.values()).sort(byLabel)
  };
}

function appendPhotoPlacementOptions(select, insp, placeholder) {
  select.innerHTML = '';
  select.appendChild(el('option', { value: '' }, placeholder || '— Not assigned —'));
  const destinations = buildPhotoPlacementDestinations(insp);
  if (destinations.rooms.length) {
    const roomGroup = el('optgroup', { label: 'Rooms' });
    destinations.rooms.forEach(destination => {
      roomGroup.appendChild(el('option', { value: destination.key }, destination.label));
    });
    select.appendChild(roomGroup);
  }
  if (destinations.tasks.length) {
    const taskGroup = el('optgroup', { label: 'Tasks' });
    destinations.tasks.forEach(destination => {
      taskGroup.appendChild(el('option', { value: destination.key }, destination.label));
    });
    select.appendChild(taskGroup);
  }
}

function parsePhotoPlacement(value) {
  if (!value) return { roomName: '', stepName: '' };
  const parts = String(value).split('\u001f');
  return { roomName: parts[0] || '', stepName: parts[1] || '' };
}

async function savePhotoPlacement(photo, placement) {
  if (!photo) return;
  photo.roomName = placement.roomName;
  photo.stepName = placement.stepName;
  const saved = await saveField(`photo_${photo.photoId}`, 'placement', {
    roomName: placement.roomName,
    stepName: placement.stepName
  });
  if (!saved) throw new Error('Cloud save failed');
}

function updatePhotoSelectionToolbar() {
  const count = qs('#photo-selection-count');
  const select = qs('#bulk-photo-placement');
  const apply = qs('#apply-photo-placement');
  const clear = qs('#clear-photo-selection');
  const selectedCount = _selectedPhotoIds.size;
  if (count) count.textContent = `${selectedCount} selected`;
  if (select) select.disabled = selectedCount === 0;
  if (apply) apply.disabled = selectedCount === 0 || !select?.value;
  if (clear) clear.disabled = selectedCount === 0;
}

function setupPhotoPlacementToolbar(insp, locked) {
  const toolbar = qs('#photo-placement-toolbar');
  const select = qs('#bulk-photo-placement');
  const apply = qs('#apply-photo-placement');
  const clear = qs('#clear-photo-selection');
  if (!toolbar || !select || !apply || !clear) return;
  toolbar.style.display = locked ? 'none' : 'flex';
  if (locked) return;

  appendPhotoPlacementOptions(select, insp, 'Place selected in room/task…');
  select.onchange = updatePhotoSelectionToolbar;
  clear.onclick = () => {
    _selectedPhotoIds.clear();
    qsa('.photo-select-checkbox').forEach(box => { box.checked = false; });
    select.value = '';
    updatePhotoSelectionToolbar();
  };
  apply.onclick = async () => {
    const placement = parsePhotoPlacement(select.value);
    const photos = (insp.photos || []).filter(photo => _selectedPhotoIds.has(photo.photoId));
    if (!photos.length || !select.value) return;
    apply.disabled = true;
    apply.textContent = `Saving ${photos.length}…`;
    try {
      for (const photo of photos) await savePhotoPlacement(photo, placement);
      _selectedPhotoIds.clear();
      select.value = '';
      showToast(`${photos.length} photo${photos.length === 1 ? '' : 's'} placed in ${placement.stepName || placement.roomName}`, 'success');
      renderRoomsSection(insp, false);
      renderPhotosSection(insp, false);
    } catch (err) {
      showToast('Photo placement failed — local recovery copy kept', 'error');
    } finally {
      apply.textContent = 'Place selected';
      updatePhotoSelectionToolbar();
    }
  };
  updatePhotoSelectionToolbar();
}

function renderPhotosSection(insp, locked) {
  const container = qs('#photo-grid');
  if (!container) return;

  insp.photos = flattenInspectionPhotos(insp);
  applyReviewedData(insp);

  const photos = insp.photos.slice().sort((a, b) => {
    return new Date(a.timestamp) - new Date(b.timestamp);
  });
  insp.photos = photos;
  for (const photoId of Array.from(_selectedPhotoIds)) {
    if (!photos.some(photo => photo.photoId === photoId)) _selectedPhotoIds.delete(photoId);
  }
  setupPhotoPlacementToolbar(insp, locked);

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

  // Wire up Describe All button
  const describeAllWrap = qs('#describe-all-wrap');
  const describeAllBtn = qs('#describe-all-btn');
  if (describeAllWrap) describeAllWrap.style.display = locked ? 'none' : 'block';
  if (describeAllBtn && !locked) {
    describeAllBtn.onclick = async () => {
      const photoCards = qsa('.photo-card');
      let done = 0;
      const total = photoCards.length;
      describeAllBtn.disabled = true;
      describeAllBtn.textContent = `\u23f3 Describing 0 / ${total}...`;
      for (const card of photoCards) {
        const aiBtn = card.querySelector('.photo-ai-describe-btn');
        if (aiBtn) {
          aiBtn.click();
          await new Promise(resolve => {
            const check = setInterval(() => {
              if (aiBtn.textContent.includes('\u2713') || aiBtn.textContent.includes('\u26a0')) {
                clearInterval(check); resolve();
              }
            }, 300);
            setTimeout(() => { clearInterval(check); resolve(); }, 20000);
          });
        }
        done++;
        describeAllBtn.textContent = `\u23f3 Describing ${done} / ${total}...`;
      }
      describeAllBtn.textContent = '\u2713 All done';
      describeAllBtn.style.background = '#15803d';
      describeAllBtn.disabled = false;
    };
  }

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
    const img = el('img', { src: photo.driveUrl, alt: photo.caption || '', loading: 'lazy', referrerpolicy: "no-referrer-when-downgrade" });
    thumbWrap.appendChild(img);
    thumbWrap.addEventListener('click', () => openPhotoModal(photo.driveUrl, photo.caption, photo.photoId));
  } else {
    const placeholder = el('div', { class: 'photo-thumb-placeholder' });
    placeholder.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>No preview</span>`;
    thumbWrap.appendChild(placeholder);
  }

  const seqBadge = el('div', { class: 'photo-thumb-overlay' }, photo.stepName || '');
  thumbWrap.appendChild(seqBadge);
  if (!locked) {
    const selectBox = el('input', {
      class: 'photo-select-checkbox',
      type: 'checkbox',
      title: 'Select this photo for bulk placement',
      'aria-label': `Select photo ${photo.caption || photo.photoId}`
    });
    selectBox.checked = _selectedPhotoIds.has(photo.photoId);
    selectBox.addEventListener('click', event => event.stopPropagation());
    selectBox.addEventListener('change', event => {
      event.stopPropagation();
      if (selectBox.checked) _selectedPhotoIds.add(photo.photoId);
      else _selectedPhotoIds.delete(photo.photoId);
      updatePhotoSelectionToolbar();
    });
    thumbWrap.appendChild(selectBox);
  }
  card.appendChild(thumbWrap);

  // Info
  const info = el('div', { class: 'photo-info' });
  info.appendChild(el('div', { class: 'photo-room' }, photo.roomName || ''));
  info.appendChild(el('div', { class: 'photo-step' }, photo.stepName || ''));

  if (!locked) {
    const placementWrap = el('label', { class: 'photo-placement-wrap' });
    placementWrap.appendChild(el('span', { class: 'photo-placement-label' }, 'Place in room/task'));
    const placementSelect = el('select', {
      class: 'photo-placement-select',
      'aria-label': `Place ${photo.caption || photo.photoId} in room or task`
    });
    appendPhotoPlacementOptions(placementSelect, _inspection, '— Not assigned —');
    placementSelect.value = photoPlacementKey(photo.roomName, photo.stepName);
    placementSelect.addEventListener('change', async () => {
      const placement = parsePhotoPlacement(placementSelect.value);
      placementSelect.disabled = true;
      try {
        await savePhotoPlacement(photo, placement);
        showToast(`Photo placed in ${placement.stepName || placement.roomName || 'Unassigned'}`, 'success');
        renderRoomsSection(_inspection, false);
        renderPhotosSection(_inspection, false);
      } catch (err) {
        placementSelect.disabled = false;
        showToast('Photo placement failed — local recovery copy kept', 'error');
      }
    });
    placementWrap.appendChild(placementSelect);
    info.appendChild(placementWrap);
  }

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
      try { debouncedSave('photo_' + photo.photoId, 'caption', captionTA.value); } catch(e) {}
    });
  }
  captionWrap.appendChild(captionTA);

  // AI describe button (only when photo has a driveUrl and not locked)
  if (!locked && photo.driveUrl) {
    const aiBtn = el('button', {
      class: 'photo-ai-describe-btn',
      type: 'button',
      title: 'AI: describe this photo'
    }, '\u2728 Describe');
    aiBtn.style.cssText = 'margin-top:6px;padding:5px 12px;font-size:0.78rem;font-weight:700;background:#f0f7ff;border:1.5px solid #93c5fd;border-radius:7px;color:#1e40af;cursor:pointer;width:100%;';

    aiBtn.addEventListener('click', async () => {
      if (aiBtn.disabled) return;
      aiBtn.disabled = true;
      aiBtn.textContent = '\u23f3 Analyzing...';
      try {
        const prompt = 'You are a professional home health inspector reviewing a photo taken during a residential inspection.' +
          (photo.roomName ? ' Room: ' + photo.roomName + '.' : '') +
          (photo.stepName ? ' Context: ' + photo.stepName + '.' : '') +
          ' Write one clear, factual sentence describing what is visible in this photo and its condition.' +
          ' Focus on anything relevant to home health: moisture, mold, damage, equipment condition, test setup.' +
          ' If nothing of concern: briefly describe what the photo shows.' +
          ' Plain sentence only — no bullet points, no markdown, no preamble.';

        // Worker fetches the image server-side — just send the URL
        const resp = await fetch(VISION_PROXY_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ imageUrl: photo.driveUrl, prompt })
        });
        if (!resp.ok) throw new Error('API error ' + resp.status);
        const result = await resp.json();
        const text = result.content && result.content[0] && result.content[0].text;
        if (!text) throw new Error('Empty response');
        const description = text.trim();

        // If caption already has content, show suggestion box instead of overwriting
        if (captionTA.value.trim()) {
          // Remove any existing suggestion box
          const existing = captionWrap.querySelector('.ai-suggestion-box');
          if (existing) existing.remove();

          const suggBox = el('div', { class: 'ai-suggestion-box' });
          suggBox.style.cssText = 'margin-top:8px;padding:10px;background:#fffbeb;border:1.5px solid #fcd34d;border-radius:8px;font-size:0.82rem;';

          const suggLabel = el('div', {}, '✨ AI suggestion:');
          suggLabel.style.cssText = 'font-weight:700;color:#92400e;margin-bottom:5px;font-size:0.78rem;';

          const suggText = el('div', {}, description);
          suggText.style.cssText = 'color:#1c1917;margin-bottom:8px;line-height:1.4;';

          const btnRow = el('div', {});
          btnRow.style.cssText = 'display:flex;gap:6px;';

          const useBtn = el('button', { type: 'button' }, '✓ Use this');
          useBtn.style.cssText = 'padding:4px 10px;font-size:0.78rem;font-weight:700;background:#f0fdf4;border:1.5px solid #86efac;border-radius:6px;color:#15803d;cursor:pointer;';
          useBtn.addEventListener('click', () => {
            captionTA.value = description;
            photo.caption = description;
            try { debouncedSave('photo_' + photo.photoId, 'caption', description); } catch(e) {}
            suggBox.remove();
            aiBtn.textContent = '✓ Done';
            aiBtn.style.background = '#f0fdf4';
            aiBtn.style.borderColor = '#86efac';
            aiBtn.style.color = '#15803d';
          });

          const dismissBtn = el('button', { type: 'button' }, '✗ Dismiss');
          dismissBtn.style.cssText = 'padding:4px 10px;font-size:0.78rem;font-weight:700;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:6px;color:#b91c1c;cursor:pointer;';
          dismissBtn.addEventListener('click', () => {
            suggBox.remove();
            aiBtn.textContent = '✨ Describe';
            aiBtn.style.background = '#f0f7ff';
            aiBtn.style.borderColor = '#93c5fd';
            aiBtn.style.color = '#1e40af';
            aiBtn.disabled = false;
          });

          btnRow.appendChild(useBtn);
          btnRow.appendChild(dismissBtn);
          suggBox.appendChild(suggLabel);
          suggBox.appendChild(suggText);
          suggBox.appendChild(btnRow);
          captionWrap.appendChild(suggBox);

          aiBtn.textContent = '✨ Describe';
          aiBtn.style.background = '#f0f7ff';
          aiBtn.style.borderColor = '#93c5fd';
          aiBtn.style.color = '#1e40af';
          aiBtn.disabled = false;
        } else {
          // No existing caption — write directly
          captionTA.value = description;
          photo.caption = description;
          try { debouncedSave('photo_' + photo.photoId, 'caption', description); } catch(e) {}
          aiBtn.textContent = '\u2713 Done';
          aiBtn.style.background = '#f0fdf4';
          aiBtn.style.borderColor = '#86efac';
          aiBtn.style.color = '#15803d';
        }
      } catch (err) {
        aiBtn.textContent = '\u26a0\ufe0f Failed — retry';
        aiBtn.style.background = '#fef2f2';
        aiBtn.style.borderColor = '#fca5a5';
        aiBtn.style.color = '#b91c1c';
        aiBtn.disabled = false;
      }
    });
    captionWrap.appendChild(aiBtn);
  }

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

  // Section assignment badge + button
  if (!locked) {
    const rd = _inspection?.reviewedData || {};
    const assignments = getPhotoSlotAssignments(photo.photoId, rd);
    const assignRow = el('div', { class: 'photo-assign-row' });
    const assignBadge = el('div', {
      class: `photo-assign-badge${assignments.length > 0 ? ' is-assigned' : ' not-assigned'}`,
      id: `assign-badge-${photo.photoId}`
    });
    assignBadge.textContent = assignments.length > 0
      ? `\uD83D\uDCCC ${assignments.map(a => a.label).join(', ')}`
      : '\u2014 Not in any section';
    const assignBtn = el('button', { class: 'photo-assign-btn', type: 'button' }, 'Report section \u2192');
    assignBtn.addEventListener('click', () => {
      const allPhotos = _inspection?.photos || [];
      const allSlots = [
        ...Array.from({length:5}, (_,i) => ({ label: `Follow-up ${i+1}`, slotKey: `followUp_${i+1}_photoIds` })),
        ...Array.from({length:6}, (_,i) => ({ label: `Action Taken ${i+1}`, slotKey: `actionTaken_${i+1}_photoIds` })),
        ...Array.from({length:6}, (_,i) => ({ label: `Observation ${i+1}`, slotKey: `obs_${i+1}_photoIds` }))
      ];
      openAssignPhotoModal(photo, allPhotos, allSlots, _inspection.reviewedData || {});
    });
    assignRow.appendChild(assignBadge);
    assignRow.appendChild(assignBtn);
    info.appendChild(assignRow);
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
    const roomRecords = _inspection ? buildReviewRoomRecords(_inspection) : [];
    const roomsWithNotes = roomRecords.filter(roomHasReviewableNotes);
    const rooms = roomsWithNotes.length;
    const reviewedRooms = roomsWithNotes.filter(record => record.step?.voiceReviewed === true).length;
    elRev.textContent = reviewedRooms;
    if (elRooms) elRooms.textContent = rooms;
  }
}

/* ============================================================
   PHOTO MODAL
   ============================================================ */

const PHOTO_ANNOTATION_COLOR = '#ef4444';
let _photoModalState = null;

function normalizePhotoAnnotationPoint(point) {
  if (!point || typeof point !== 'object') return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  };
}

function normalizePhotoAnnotations(value) {
  let raw = value;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch(e) { raw = []; }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map(item => {
    if (!item || (item.type !== 'arrow' && item.type !== 'circle')) return null;
    const points = Array.isArray(item.points)
      ? item.points.map(normalizePhotoAnnotationPoint).filter(Boolean)
      : [];
    if (points.length < 2) return null;
    return {
      type: item.type,
      points: points.slice(0, 2),
      color: item.color || PHOTO_ANNOTATION_COLOR
    };
  }).filter(Boolean);
}

function getPhotoAnnotations(photoId) {
  if (!photoId) return [];
  const store = _inspection?.reviewedData?.photoAnnotations || {};
  return normalizePhotoAnnotations(store[photoId]);
}

function setPhotoAnnotations(photoId, annotations) {
  if (!photoId || !_inspection) return;
  if (!_inspection.reviewedData) _inspection.reviewedData = {};
  if (!_inspection.reviewedData.photoAnnotations) _inspection.reviewedData.photoAnnotations = {};
  _inspection.reviewedData.photoAnnotations[photoId] = normalizePhotoAnnotations(annotations);
}

function photoAnnotationButton(label, title, attrs = {}) {
  return el('button', {
    type: 'button',
    class: 'photo-annotation-btn',
    title,
    'aria-label': title,
    ...attrs
  }, label);
}

function buildPhotoAnnotationToolbar() {
  const toolbar = el('div', { class: 'photo-annotation-toolbar' },
    photoAnnotationButton('Arrow', 'Arrow tool', { 'data-tool': 'arrow' }),
    photoAnnotationButton('Circle', 'Circle tool', { 'data-tool': 'circle' }),
    photoAnnotationButton('Undo', 'Undo last annotation', { 'data-action': 'undo' }),
    photoAnnotationButton('Clear', 'Clear annotations', { 'data-action': 'clear' }),
    photoAnnotationButton('Save', 'Save annotations', { class: 'photo-annotation-btn save', 'data-action': 'save' }),
    el('span', { class: 'photo-annotation-status', 'data-annotation-status': '' }, '')
  );

  toolbar.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn || !_photoModalState) return;
    const tool = btn.dataset.tool;
    const action = btn.dataset.action;

    if (tool) {
      _photoModalState.tool = tool;
      updatePhotoAnnotationToolbar();
      return;
    }

    if (action === 'undo') {
      _photoModalState.annotations.pop();
      _photoModalState.dirty = true;
      redrawPhotoAnnotationCanvas();
      updatePhotoAnnotationToolbar();
      return;
    }

    if (action === 'clear') {
      _photoModalState.annotations = [];
      _photoModalState.draft = null;
      _photoModalState.dirty = true;
      redrawPhotoAnnotationCanvas();
      updatePhotoAnnotationToolbar();
      return;
    }

    if (action === 'save') {
      saveCurrentPhotoAnnotations();
    }
  });

  return toolbar;
}

function updatePhotoAnnotationToolbar() {
  if (!_photoModalState?.toolbar) return;
  const { toolbar, tool, annotations, dirty, photoId } = _photoModalState;
  toolbar.querySelectorAll('[data-tool]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });

  const undoBtn = toolbar.querySelector('[data-action="undo"]');
  const clearBtn = toolbar.querySelector('[data-action="clear"]');
  const saveBtn = toolbar.querySelector('[data-action="save"]');
  if (undoBtn) undoBtn.disabled = annotations.length === 0;
  if (clearBtn) clearBtn.disabled = annotations.length === 0;
  if (saveBtn) saveBtn.disabled = !dirty || !photoId;

  const status = toolbar.querySelector('[data-annotation-status]');
  if (status) {
    status.textContent = !photoId
      ? 'No photo ID'
      : dirty
        ? 'Unsaved changes'
        : `${annotations.length} saved`;
  }
}

function pointFromCanvasEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = rect.width ? (event.clientX - rect.left) / rect.width : 0;
  const y = rect.height ? (event.clientY - rect.top) / rect.height : 0;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y))
  };
}

function drawPhotoAnnotation(ctx, annotation, draft = false) {
  if (!annotation?.points?.length || annotation.points.length < 2) return;
  const { width, height } = ctx.canvas;
  const [start, end] = annotation.points;
  const x1 = start.x * width;
  const y1 = start.y * height;
  const x2 = end.x * width;
  const y2 = end.y * height;
  const stroke = annotation.color || PHOTO_ANNOTATION_COLOR;
  const lineWidth = Math.max(4, Math.min(width, height) * 0.006);

  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (draft) ctx.setLineDash([lineWidth * 2.4, lineWidth * 1.8]);

  if (annotation.type === 'circle') {
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    const rx = Math.max(Math.abs(x2 - x1) / 2, lineWidth * 2);
    const ry = Math.max(Math.abs(y2 - y1) / 2, lineWidth * 2);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLength = Math.max(18, Math.min(width, height) * 0.035);
    const headAngle = Math.PI / 7;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle - headAngle), y2 - headLength * Math.sin(angle - headAngle));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLength * Math.cos(angle + headAngle), y2 - headLength * Math.sin(angle + headAngle));
    ctx.stroke();
  }

  ctx.restore();
}

function redrawPhotoAnnotationCanvas() {
  const state = _photoModalState;
  if (!state?.ctx || !state.imageLoaded) return;
  const { ctx, canvas, image, annotations, draft } = state;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  annotations.forEach(annotation => drawPhotoAnnotation(ctx, annotation));
  if (draft) drawPhotoAnnotation(ctx, draft, true);
}

function bindPhotoAnnotationCanvas(canvas) {
  canvas.addEventListener('pointerdown', e => {
    const state = _photoModalState;
    if (!state?.imageLoaded || !state.photoId) return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    const start = pointFromCanvasEvent(e, canvas);
    state.drawing = true;
    state.startPoint = start;
    state.draft = {
      type: state.tool,
      color: PHOTO_ANNOTATION_COLOR,
      points: [start, start]
    };
    redrawPhotoAnnotationCanvas();
  });

  canvas.addEventListener('pointermove', e => {
    const state = _photoModalState;
    if (!state?.drawing || !state.draft) return;
    e.preventDefault();
    state.draft.points[1] = pointFromCanvasEvent(e, canvas);
    redrawPhotoAnnotationCanvas();
  });

  function finish(e) {
    const state = _photoModalState;
    if (!state?.drawing || !state.draft) return;
    e.preventDefault();
    const end = pointFromCanvasEvent(e, canvas);
    const start = state.startPoint || state.draft.points[0];
    state.draft.points[1] = end;
    state.drawing = false;
    state.startPoint = null;

    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    if (distance >= 0.01) {
      const annotation = normalizePhotoAnnotations([state.draft])[0];
      if (annotation) {
        state.annotations.push(annotation);
        state.dirty = true;
      }
    }
    state.draft = null;
    redrawPhotoAnnotationCanvas();
    updatePhotoAnnotationToolbar();
  }

  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('pointerleave', e => {
    if (_photoModalState?.drawing) finish(e);
  });
}

function saveCurrentPhotoAnnotations() {
  const state = _photoModalState;
  if (!state?.photoId) {
    showToast('Cannot save annotation without a photo ID', 'error');
    return;
  }
  setPhotoAnnotations(state.photoId, state.annotations);
  saveField('photoAnnotations', state.photoId, _inspection.reviewedData.photoAnnotations[state.photoId]);
  state.dirty = false;
  updatePhotoAnnotationToolbar();
  showToast('Photo annotations saved', 'success');
}

function openPhotoModal(url, caption, photoId = '') {
  let modal = qs('#photo-modal');
  if (!modal) {
    modal = el('div', { class: 'photo-modal hidden', id: 'photo-modal' });
    document.body.appendChild(modal);
  }

  let inner = modal.querySelector('.photo-modal-inner');
  if (!inner) {
    inner = el('div', { class: 'photo-modal-inner' });
    modal.appendChild(inner);
  }

  let closeBtn = modal.querySelector('.photo-modal-close');
  if (!closeBtn) {
    closeBtn = el('button', { class: 'photo-modal-close', type: 'button' }, '✕');
    closeBtn.addEventListener('click', closePhotoModal);
    modal.appendChild(closeBtn);
  }

  if (!modal.dataset.clickBound) {
    modal.addEventListener('click', e => { if (e.target === modal) closePhotoModal(); });
    modal.dataset.clickBound = 'true';
  }

  inner.innerHTML = '';
  const toolbar = buildPhotoAnnotationToolbar();
  const canvasWrap = el('div', { class: 'photo-canvas-wrap' });
  const canvas = el('canvas', { class: 'photo-annotation-canvas', 'aria-label': caption || 'Photo annotation canvas' });
  const ctx = canvas.getContext('2d');
  canvasWrap.appendChild(canvas);
  inner.appendChild(toolbar);
  inner.appendChild(canvasWrap);
  if (caption) inner.appendChild(el('p', { class: 'photo-modal-caption' }, caption));

  const annotations = getPhotoAnnotations(photoId);
  const image = new Image();
  const state = {
    photoId,
    url,
    caption,
    tool: 'arrow',
    annotations,
    dirty: false,
    drawing: false,
    draft: null,
    startPoint: null,
    toolbar,
    canvas,
    ctx,
    image,
    imageLoaded: false
  };
  _photoModalState = state;
  updatePhotoAnnotationToolbar();
  bindPhotoAnnotationCanvas(canvas);

  image.onload = () => {
    if (_photoModalState !== state) return;
    const maxSide = 2200;
    const naturalW = image.naturalWidth || 1600;
    const naturalH = image.naturalHeight || 1200;
    const scale = Math.min(1, maxSide / Math.max(naturalW, naturalH));
    canvas.width = Math.max(1, Math.round(naturalW * scale));
    canvas.height = Math.max(1, Math.round(naturalH * scale));
    state.imageLoaded = true;
    redrawPhotoAnnotationCanvas();
  };
  image.onerror = () => {
    if (_photoModalState !== state) return;
    inner.appendChild(el('p', { class: 'photo-modal-error' }, 'Photo failed to load.'));
  };
  image.src = url;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
  const modal = qs('#photo-modal');
  if (modal) modal.classList.add('hidden');
  _photoModalState = null;
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
  const photos  = insp.photos  || [];
  const tests   = insp.testsConfirmed || {};
  const reviewed = insp.reviewedData || {};
  const roomRecords = buildReviewRoomRecords(insp);

  // 1. Only rooms that actually contain inspector notes require review.
  // Rooms without notes are neutral and must not block submission.
  const roomsWithNotes = roomRecords.filter(roomHasReviewableNotes);
  const notesReviewed = roomsWithNotes.every(record => record.step?.voiceReviewed === true);

  // 2. All test locations recorded (qtrak + breeze in each room that has those fields)
  const roomsWithLocs = roomRecords.filter(record => 'qtrakLocation' in record.step || 'breezeLocation' in record.step);
  const locsRecorded  = roomsWithLocs.length === 0 || roomsWithLocs.every(record =>
    (record.step.qtrakLocation || reviewed[record.stepId]?.qtrakLocation || '').trim() !== '' &&
    (record.step.breezeLocation || reviewed[record.stepId]?.breezeLocation || '').trim() !== ''
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

let _bonusClockInterval = null;

function getBonusTier(endedAt) {
  if (!endedAt) return null;
  const elapsedMs = Date.now() - new Date(endedAt).getTime();
  const hrs = elapsedMs / 3600000;
  if (hrs < 4) return { amount: 75, label: 'Full bonus',     nextAt: 4,  nextAmount: 50,  color: '#16a34a', bg: '#dcfce7', bar: '#16a34a' };
  if (hrs < 6) return { amount: 50, label: 'Reduced bonus',  nextAt: 6,  nextAmount: 25,  color: '#d97706', bg: '#fef9c3', bar: '#f59e0b' };
  if (hrs < 8) return { amount: 25, label: 'Minimum bonus',  nextAt: 8,  nextAmount: 0,   color: '#ea580c', bg: '#fff7ed', bar: '#f97316' };
  return { amount: 0, label: 'Window closed', nextAt: null, nextAmount: null, color: '#9ca3af', bg: '#f5f5f5', bar: '#9ca3af' };
}

function formatHMS(ms) {
  if (ms <= 0) return '0:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function renderBonusClock(wrap, insp, score) {
  const endedAt = insp.endedAt || insp.completedAt || null;
  const tier = getBonusTier(endedAt);
  if (!tier) return;

  const qualifies = score.total >= 85;
  const pct = endedAt && tier.nextAt
    ? Math.max(0, 100 - ((Date.now() - new Date(endedAt).getTime()) / (tier.nextAt * 3600000)) * 100)
    : (tier.amount > 0 ? 5 : 0);

  const msUntilNext = tier.nextAt
    ? Math.max(0, new Date(endedAt).getTime() + tier.nextAt * 3600000 - Date.now())
    : 0;

  wrap.innerHTML = '';
  const clock = el('div', { class: 'bonus-clock', style: `background:${tier.bg};border-color:${tier.bar}` });

  // Top row: icon + time + amount
  const top = el('div', { class: 'bonus-clock-top' });

  const left = el('div', { class: 'bonus-clock-left' });
  left.appendChild(el('div', { class: 'bonus-clock-label' }, '⚡ Same-Day Bonus Window'));
  const timeEl = el('div', { class: 'bonus-clock-time', style: `color:${tier.color}`, id: 'bonus-clock-time' },
    tier.nextAt ? formatHMS(msUntilNext) : 'Window closed');
  left.appendChild(timeEl);
  left.appendChild(el('div', { class: 'bonus-clock-sublabel', style: `color:${tier.color}` },
    tier.nextAt ? `until bonus drops to $${tier.nextAmount}` : 'Submit tomorrow for base pay only'));
  top.appendChild(left);

  const right = el('div', { class: 'bonus-clock-right' });
  right.appendChild(el('div', { class: 'bonus-clock-amount', style: `color:${tier.color}` },
    tier.amount > 0 ? `$${tier.amount}` : '$0'));
  right.appendChild(el('div', { class: 'bonus-clock-amount-label' }, tier.label));
  top.appendChild(right);
  clock.appendChild(top);

  // Progress bar
  const track = el('div', { class: 'bonus-bar-track' });
  const fill  = el('div', { class: 'bonus-bar-fill', style: `width:${pct}%;background:${tier.bar}` });
  track.appendChild(fill);
  clock.appendChild(track);
  clock.appendChild(el('div', { class: 'bonus-bar-labels' },
    el('span', {}, '← Less time'),
    el('span', {}, 'Just left home →')));

  // Status message
  let msg, msgStyle;
  if (tier.amount === 0) {
    msg = 'Bonus window closed. Your score still counts toward monthly performance.';
    msgStyle = 'color:#9ca3af';
  } else if (!qualifies) {
    msg = `Score is ${score.total} — need 85+ to qualify. ${score.total < 85 ? `${85 - score.total} more points needed.` : ''}`;
    msgStyle = 'color:#dc2626;font-weight:600';
  } else {
    msg = `✅ You qualify! Score ${score.total} (${score.grade}). Submit now to earn $${tier.amount}.`;
    msgStyle = `color:${tier.color};font-weight:700`;
  }
  clock.appendChild(el('div', { class: 'bonus-clock-msg', style: msgStyle }, msg));
  wrap.appendChild(clock);

  // Live tick
  if (_bonusClockInterval) clearInterval(_bonusClockInterval);
  if (tier.nextAt && tier.amount > 0) {
    _bonusClockInterval = setInterval(() => {
      const newMs = Math.max(0, new Date(endedAt).getTime() + tier.nextAt * 3600000 - Date.now());
      const el2 = document.getElementById('bonus-clock-time');
      if (el2) el2.textContent = formatHMS(newMs);
      if (newMs === 0) {
        clearInterval(_bonusClockInterval);
        renderSubmitSection(_inspection, false);
      }
    }, 1000);
  }
}

function renderSubmitSection(insp, locked) {
  updatePhotoSummary(insp.photos || []);

  // Score in submit section
  const scoreWrap = qs('#submit-score-wrap');
  if (scoreWrap) {
    scoreWrap.innerHTML = '';
    const s = calculateCompletionScore(insp);

    // Score row
    const scoreRow = el('div', { class: 'submit-score-row' });
    scoreRow.innerHTML = `
      <span class="submit-score-num ${s.gradeClass}">${s.total}</span>
      <span class="submit-score-grade ${s.gradeClass}">${s.grade}</span>
      <span class="submit-score-label">Inspection Score — used for performance tracking</span>`;
    scoreWrap.appendChild(scoreRow);

    // Bonus clock
    const clockWrap = el('div', { id: 'bonus-clock-wrap' });
    scoreWrap.appendChild(clockWrap);
    if (!locked) renderBonusClock(clockWrap, insp, s);
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
  const submittedAt  = new Date().toISOString();
  const endedAt      = _inspection?.endedAt || _inspection?.completedAt || null;
  const bonusTier    = getBonusTier(endedAt);
  const bonusEarned  = finalScore && finalScore.total >= 85 && bonusTier && bonusTier.amount > 0;
  const notesEl      = qs('#field-report-notes');

  if (_inspection && notesEl) {
    _inspection.reportBuilderNotes = notesEl.value;
    if (!_inspection.reviewedData) _inspection.reviewedData = {};
    if (!_inspection.reviewedData.summary) _inspection.reviewedData.summary = {};
    _inspection.reviewedData.summary.reportBuilderNotes = notesEl.value;
  }

  try {
    await apiFetch({}, 'POST', { action: 'submit', id, token,
      completionScore:  finalScore ? finalScore.total : null,
      completionGrade:  finalScore ? finalScore.grade : null,
      submittedAt,
      sameDayBonus:     bonusEarned || false,
      sameDayBonusAmt:  bonusEarned ? bonusTier.amount : 0,
      reviewedData:     _inspection?.reviewedData || {},
      reportBuilderNotes: _inspection?.reportBuilderNotes || '',
      photos:           _inspection?.photos || []
    });
  } catch (err) {
    showToast(`Submission failed: ${err.message}`, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit to Tanner →'; }
    return;
  }

  showToast('Submitted. Tanner has been notified.', 'success', 6000);
  if (_inspection) {
    _inspection.status = 'Submitted to Tanner';
    _inspection.submittedToTannerAt = submittedAt;
  }

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
