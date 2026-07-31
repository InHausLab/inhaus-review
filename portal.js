/**
 * InHaus Lab — Inspector Review Portal
 * portal.js — Vanilla JS, no frameworks
 *
 * Configuration: swap these two constants when Apps Script is deployed
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwWzLVAIbUMDR11ryZiHft3ZTrzT9zrCQl5Gw4Tq6nIoNYhCepQYEC0dYz3r8b51LEXqQ/exec'; // v73 — updated July 20 2026
const ACCESS_TOKEN    = 'InHaus2026';
const VISION_PROXY_URL = 'https://inhaus-vision-proxy.mjordanjay.workers.dev';
const PHOTO_WORKER_URL = 'https://inhaus-photo-worker.inhauslab.workers.dev';
const ENABLE_WORKER_HANDOFF = false;
// Frontend-visible Worker routing token used by the inspector app for
// app-facing photo/status routes. This is not a private service credential.
const PHOTO_UPLOAD_SHARED_SECRET = '42be53ef7bf9c07b52bb56c30ebd457a5ed227343a6d5313df98cbd525006b7c';
const REVIEW_PORTAL_VERSION = 'V65';
const STANDARD_ROOM_CHOICES = ['Attic', 'Crawl Space'];
const API_FETCH_TIMEOUT_MS = 12000;
const API_HANDOFF_TIMEOUT_MS = 180000;
const LEGACY_STATIC_FALLBACK_INSPECTION_IDS = new Set([
  'INH-20260727-86EZAT',
  'INH-20260722-VCMSTE'
]);
// Frontend routing token already used by the inspector app for Apps Script posts.
// This is not a private secret; it only selects the deployed authenticated route.
const SYNC_SECRET = 'ihl-sync-2026';

const IS_DEMO = (APPS_SCRIPT_URL === 'PLACEHOLDER_URL');
const IS_LOCAL_PREVIEW = ['localhost', '127.0.0.1'].includes(window.location.hostname);

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
let _finishTrackerOpen = false;
let _reviewDataHealth = null;
let _handoffRepairInFlight = false;

const REVIEW_ACTIVITY_IDLE_MS = 90000;
const REVIEW_ACTIVITY_TICK_MS = 10000;
const REVIEW_ACTIVITY_FLUSH_SECONDS = 30;
const REVIEW_ACTIVITY_REVIEWER_KEY = 'inhaus_review_reviewer_name';
const REVIEW_ACTIVITY_DEVICE_KEY = 'inhaus_review_device_id';
const REVIEW_ACTIVITY_INTERNAL_STEPS = new Set([
  '_reviewActivityEvents',
  '_reviewActivitySessions',
  '_reviewActivityMeta'
]);

let _reviewActivitySaveChain = Promise.resolve();
let _reviewActivityTickTimer = null;
let _reviewActivityStarted = false;
let _reviewActivity = {
  sessionId: '',
  reviewerName: '',
  deviceId: '',
  startedAt: '',
  lastActiveAt: '',
  lastInteractionAt: 0,
  lastTickAt: 0,
  activeSeconds: 0,
  pendingSeconds: 0,
  saveCount: 0,
  sections: {},
  currentSection: 'Review Portal',
  cloudSessions: {},
  cloudEvents: {},
  loadWarning: ''
};

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

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  if (minutes) return `${minutes}m`;
  return `${seconds}s`;
}

function reviewActivityId(prefix = 'act') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getReviewDeviceId() {
  try {
    let id = localStorage.getItem(REVIEW_ACTIVITY_DEVICE_KEY);
    if (!id) {
      id = reviewActivityId('device');
      localStorage.setItem(REVIEW_ACTIVITY_DEVICE_KEY, id);
    }
    return id;
  } catch(e) {
    return reviewActivityId('device');
  }
}

function getReviewActivityStorageReviewer() {
  const params = new URLSearchParams(window.location.search);
  const urlName = String(params.get('reviewer') || params.get('actor') || '').trim();
  if (urlName) {
    try { localStorage.setItem(REVIEW_ACTIVITY_REVIEWER_KEY, urlName); } catch(e) {}
    return urlName;
  }
  try {
    return String(localStorage.getItem(REVIEW_ACTIVITY_REVIEWER_KEY) || '').trim();
  } catch(e) {
    return '';
  }
}

function setReviewActivityReviewer(name) {
  const cleanName = String(name || '').trim() || 'Review Portal User';
  _reviewActivity.reviewerName = cleanName;
  try { localStorage.setItem(REVIEW_ACTIVITY_REVIEWER_KEY, cleanName); } catch(e) {}
  const button = qs('#review-actor-button');
  if (button) button.textContent = `Reviewer: ${cleanName}`;
  return cleanName;
}

function ensureReviewActivityReviewer(promptIfMissing = false) {
  const current = String(_reviewActivity.reviewerName || getReviewActivityStorageReviewer()).trim();
  if (current) return setReviewActivityReviewer(current);
  if (!promptIfMissing) return setReviewActivityReviewer('Review Portal User');
  const entered = window.prompt('Who is reviewing this inspection?', '');
  return setReviewActivityReviewer(entered || 'Review Portal User');
}

function extractReviewActivityData(fieldData = {}) {
  const sessions = fieldData._reviewActivitySessions;
  const events = fieldData._reviewActivityEvents;
  _reviewActivity.cloudSessions = sessions && typeof sessions === 'object' && !Array.isArray(sessions)
    ? { ...sessions }
    : {};
  _reviewActivity.cloudEvents = events && typeof events === 'object' && !Array.isArray(events)
    ? { ...events }
    : {};
  REVIEW_ACTIVITY_INTERNAL_STEPS.forEach(key => delete fieldData[key]);
  return fieldData;
}

function sanitizeReviewActivityFieldData(fieldData = {}) {
  const sanitized = { ...fieldData };
  REVIEW_ACTIVITY_INTERNAL_STEPS.forEach(key => delete sanitized[key]);
  return sanitized;
}

function activitySectionFromTarget(target) {
  if (!target || !target.closest) return _reviewActivity.currentSection || 'Review Portal';
  if (target.closest('.photo-modal')) return 'Photo Review';
  if (target.closest('.finish-tracker')) return 'Finish Review';
  if (target.closest('.portal-feedback-overlay')) return 'Portal Feedback';
  if (target.closest('.review-activity-overlay')) return 'Review Activity';
  const card = target.closest('.card');
  const title = card?.querySelector('.card-title')?.textContent?.trim();
  return title || _reviewActivity.currentSection || 'Review Portal';
}

function updateReviewActivityClock(now = Date.now()) {
  if (!_reviewActivityStarted || !_reviewActivity.sessionId) return;
  if (!_reviewActivity.lastTickAt) {
    _reviewActivity.lastTickAt = now;
    return;
  }
  const elapsedMs = Math.max(0, Math.min(now - _reviewActivity.lastTickAt, REVIEW_ACTIVITY_TICK_MS + 2000));
  _reviewActivity.lastTickAt = now;
  const isActive = !document.hidden && now - _reviewActivity.lastInteractionAt <= REVIEW_ACTIVITY_IDLE_MS;
  if (!isActive || !elapsedMs) return;
  const seconds = elapsedMs / 1000;
  _reviewActivity.activeSeconds += seconds;
  _reviewActivity.pendingSeconds += seconds;
  const section = _reviewActivity.currentSection || 'Review Portal';
  _reviewActivity.sections[section] = (_reviewActivity.sections[section] || 0) + seconds;
}

function markReviewActivity(section = '') {
  if (!_reviewActivityStarted) return;
  updateReviewActivityClock();
  const now = Date.now();
  _reviewActivity.lastInteractionAt = now;
  _reviewActivity.lastActiveAt = new Date(now).toISOString();
  if (section) _reviewActivity.currentSection = section;
}

function describeReviewActivityValue(value) {
  if (value === null || value === undefined) return { type: 'blank', size: 0 };
  if (typeof value === 'string') return { type: 'text', size: value.length };
  if (typeof value === 'boolean') return { type: 'boolean', size: 1 };
  if (typeof value === 'number') return { type: 'number', size: 1 };
  if (Array.isArray(value)) return { type: 'array', size: value.length };
  if (typeof value === 'object') return { type: 'object', size: Object.keys(value).length };
  return { type: typeof value, size: 1 };
}

function queueReviewActivityField(stepId, key, value) {
  if (IS_DEMO || IS_LOCAL_PREVIEW || !_inspection?.inspectionId) return;
  _reviewActivitySaveChain = _reviewActivitySaveChain
    .then(() => saveCloudReviewField(_inspection.inspectionId, { stepId, key, value }))
    .catch(err => {
      _reviewActivity.loadWarning = err?.message || 'Activity save failed';
      console.warn('Review activity save failed:', err);
    });
}

function sendReviewActivityEventToWorker(event) {
  if (IS_DEMO || IS_LOCAL_PREVIEW || !event?.inspectionId) return;
  fetch(PHOTO_WORKER_URL + '/review-activity-events', {
    method: 'POST',
    headers: workerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      inspectionId: event.inspectionId,
      token: ACCESS_TOKEN,
      actor: event.reviewerName || '',
      eventType: event.type || 'activity',
      eventPayload: event
    })
  }).catch(err => {
    _reviewActivity.loadWarning = err?.message || _reviewActivity.loadWarning || 'Activity event save failed';
    console.warn('Review activity event save failed:', err);
  });
}

function currentReviewActivitySessionPayload(reason = 'heartbeat') {
  return {
    sessionId: _reviewActivity.sessionId,
    reviewerName: _reviewActivity.reviewerName || 'Review Portal User',
    deviceId: _reviewActivity.deviceId,
    inspectionId: _inspection?.inspectionId || '',
    startedAt: _reviewActivity.startedAt,
    lastActiveAt: _reviewActivity.lastActiveAt || _reviewActivity.startedAt,
    updatedAt: new Date().toISOString(),
    activeSeconds: Math.round(_reviewActivity.activeSeconds),
    saveCount: _reviewActivity.saveCount,
    sections: Object.fromEntries(Object.entries(_reviewActivity.sections)
      .map(([key, value]) => [key, Math.round(value)])),
    portalVersion: REVIEW_PORTAL_VERSION,
    reason
  };
}

function flushReviewActivitySession(reason = 'heartbeat', force = false) {
  if (!_reviewActivityStarted || !_reviewActivity.sessionId) return;
  updateReviewActivityClock();
  if (!force && _reviewActivity.pendingSeconds < REVIEW_ACTIVITY_FLUSH_SECONDS) return;
  _reviewActivity.pendingSeconds = 0;
  const payload = currentReviewActivitySessionPayload(reason);
  _reviewActivity.cloudSessions[payload.sessionId] = payload;
  queueReviewActivityField('_reviewActivitySessions', payload.sessionId, payload);
}

function recordReviewActivityEvent(type, detail = {}) {
  if (!_reviewActivityStarted || !_inspection?.inspectionId) return;
  markReviewActivity(detail.section || '');
  const reviewerName = ensureReviewActivityReviewer(type === 'save');
  if (type === 'save') _reviewActivity.saveCount += 1;
  const eventId = reviewActivityId('event');
  const event = {
    eventId,
    type,
    reviewerName,
    sessionId: _reviewActivity.sessionId,
    deviceId: _reviewActivity.deviceId,
    inspectionId: _inspection.inspectionId,
    occurredAt: new Date().toISOString(),
    section: detail.section || _reviewActivity.currentSection || 'Review Portal',
    stepId: detail.stepId || '',
    fieldKey: detail.fieldKey || '',
    valueMeta: describeReviewActivityValue(detail.value),
    portalVersion: REVIEW_PORTAL_VERSION
  };
  _reviewActivity.cloudEvents[eventId] = event;
  queueReviewActivityField('_reviewActivityEvents', eventId, event);
  sendReviewActivityEventToWorker(event);
  flushReviewActivitySession(type, true);
}

function recordReviewFieldSaveActivity(stepId, fieldKey, value) {
  if (REVIEW_ACTIVITY_INTERNAL_STEPS.has(stepId)) return;
  recordReviewActivityEvent('save', {
    stepId,
    fieldKey,
    value,
    section: sectionLabelForActivityStep(stepId)
  });
}

function sectionLabelForActivityStep(stepId) {
  const raw = String(stepId || '');
  if (raw === 'summary') return 'Inspection Summary';
  if (raw === 'post') return 'Post-Inspection Report Content';
  if (raw === 'roomData') return 'Rooms & Observations';
  if (raw.startsWith('photo_')) return 'Photos';
  const step = _inspection?.stepData?.[raw];
  return step?.roomName || step?.name || raw || 'Review Portal';
}

function startReviewActivityTracking(insp) {
  if (_reviewActivityStarted || !insp?.inspectionId) return;
  const now = new Date();
  _reviewActivityStarted = true;
  _reviewActivity.sessionId = reviewActivityId('session');
  _reviewActivity.deviceId = getReviewDeviceId();
  _reviewActivity.startedAt = now.toISOString();
  _reviewActivity.lastActiveAt = now.toISOString();
  _reviewActivity.lastInteractionAt = now.getTime();
  _reviewActivity.lastTickAt = now.getTime();
  _reviewActivity.activeSeconds = 0;
  _reviewActivity.pendingSeconds = 0;
  _reviewActivity.saveCount = 0;
  _reviewActivity.sections = {};
  _reviewActivity.currentSection = 'Review Portal';
  ensureReviewActivityReviewer(false);

  const activityHandler = event => markReviewActivity(activitySectionFromTarget(event.target));
  document.addEventListener('pointerdown', activityHandler, true);
  document.addEventListener('keydown', activityHandler, true);
  document.addEventListener('input', activityHandler, true);
  document.addEventListener('change', activityHandler, true);
  document.addEventListener('scroll', () => markReviewActivity('Scrolling Review'), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushReviewActivitySession('hidden', true);
    else markReviewActivity('Review Portal');
  });
  window.addEventListener('beforeunload', () => flushReviewActivitySession('unload', true));

  _reviewActivityTickTimer = window.setInterval(() => {
    updateReviewActivityClock();
    flushReviewActivitySession('heartbeat');
  }, REVIEW_ACTIVITY_TICK_MS);
  recordReviewActivityEvent('session_start', { section: 'Review Portal' });
}

function activityDateLabel(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function summarizeReviewActivity(sessionsById, eventsById) {
  const reviewers = new Map();
  const sessions = Object.values(sessionsById || {});
  const events = Object.values(eventsById || {});
  const ensure = name => {
    const reviewer = String(name || 'Review Portal User').trim() || 'Review Portal User';
    if (!reviewers.has(reviewer)) {
      reviewers.set(reviewer, {
        reviewer,
        activeSeconds: 0,
        sessions: 0,
        saves: 0,
        lastActiveAt: '',
        sections: {}
      });
    }
    return reviewers.get(reviewer);
  };
  sessions.forEach(session => {
    const row = ensure(session.reviewerName);
    row.activeSeconds += Number(session.activeSeconds) || 0;
    row.sessions += 1;
    row.saves += Number(session.saveCount) || 0;
    if (!row.lastActiveAt || Date.parse(session.lastActiveAt || '') > Date.parse(row.lastActiveAt || '')) {
      row.lastActiveAt = session.lastActiveAt || '';
    }
    Object.entries(session.sections || {}).forEach(([section, seconds]) => {
      row.sections[section] = (row.sections[section] || 0) + (Number(seconds) || 0);
    });
  });
  events.filter(event => event.type === 'save').forEach(event => {
    const row = ensure(event.reviewerName);
    if (!row.lastActiveAt || Date.parse(event.occurredAt || '') > Date.parse(row.lastActiveAt || '')) {
      row.lastActiveAt = event.occurredAt || '';
    }
  });
  const rows = Array.from(reviewers.values()).sort((a, b) => b.activeSeconds - a.activeSeconds);
  return {
    rows,
    totalActiveSeconds: rows.reduce((sum, row) => sum + row.activeSeconds, 0),
    totalSaves: events.filter(event => event.type === 'save').length,
    lastActiveAt: rows.map(row => row.lastActiveAt).filter(Boolean).sort().pop() || '',
    recentEvents: events
      .sort((a, b) => Date.parse(b.occurredAt || '') - Date.parse(a.occurredAt || ''))
      .slice(0, 12)
  };
}

function summarizeFieldUsage(metrics = {}) {
  const sessions = Object.values(metrics?.sessions || {}).filter(session => session && typeof session === 'object');
  const events = Object.values(metrics?.events || {}).filter(event => event && typeof event === 'object');
  const inspectors = new Map();
  const ensure = name => {
    const inspector = String(name || 'Field App User').trim() || 'Field App User';
    if (!inspectors.has(inspector)) {
      inspectors.set(inspector, {
        inspector,
        activeSeconds: 0,
        sessions: 0,
        saves: 0,
        photos: 0,
        fieldChanges: 0,
        uniqueFields: 0,
        blockers: 0,
        syncAttempts: 0,
        syncSuccesses: 0,
        syncFailures: 0,
        finalSubmitAttempts: 0,
        finalSubmitSuccesses: 0,
        finalSubmitFailures: 0,
        lastActiveAt: '',
        steps: {},
        fields: {}
      });
    }
    return inspectors.get(inspector);
  };

  sessions.forEach(session => {
    const row = ensure(session.actorName);
    row.activeSeconds += Number(session.activeSeconds) || 0;
    row.sessions += 1;
    row.saves += Number(session.saveCount) || 0;
    row.photos += Number(session.photoAddedCount) || 0;
    row.fieldChanges += Number(session.fieldChangeCount) || 0;
    row.blockers += Number(session.blockerCount) || 0;
    row.syncAttempts += Number(session.syncAttemptCount) || 0;
    row.syncSuccesses += Number(session.syncSuccessCount) || 0;
    row.syncFailures += Number(session.syncFailureCount) || 0;
    row.finalSubmitAttempts += Number(session.finalSubmitAttempts) || 0;
    row.finalSubmitSuccesses += Number(session.finalSubmitSuccesses) || 0;
    row.finalSubmitFailures += Number(session.finalSubmitFailureCount || session.finalSubmitFailures) || 0;
    if (!row.lastActiveAt || Date.parse(session.lastActiveAt || '') > Date.parse(row.lastActiveAt || '')) {
      row.lastActiveAt = session.lastActiveAt || '';
    }
    Object.entries(session.steps || {}).forEach(([step, seconds]) => {
      row.steps[step] = (row.steps[step] || 0) + (Number(seconds) || 0);
    });
    Object.entries(session.fields || {}).forEach(([field, count]) => {
      row.fields[field] = (row.fields[field] || 0) + (Number(count) || 0);
    });
  });

  const rows = Array.from(inspectors.values()).map(row => ({
    ...row,
    uniqueFields: Object.keys(row.fields || {}).length
  })).sort((a, b) => b.activeSeconds - a.activeSeconds);

  return {
    rows,
    totalActiveSeconds: rows.reduce((sum, row) => sum + row.activeSeconds, 0),
    totalSaves: rows.reduce((sum, row) => sum + row.saves, 0),
    totalPhotos: rows.reduce((sum, row) => sum + row.photos, 0),
    totalBlockers: rows.reduce((sum, row) => sum + row.blockers, 0),
    lastActiveAt: rows.map(row => row.lastActiveAt).filter(Boolean).sort().pop() || '',
    recentEvents: events
      .sort((a, b) => Date.parse(b.occurredAt || '') - Date.parse(a.occurredAt || ''))
      .slice(0, 16)
  };
}

function fieldUsageEventLabel(event = {}) {
  const target = event.stepName || event.stepId || event.screen || 'the app';
  const field = event.fieldKey ? ` / ${event.fieldKey}` : '';
  const count = event.count ? ` (${event.count})` : '';
  const labels = {
    field_change: `Edited ${target}${field}`,
    step_completed: `Completed ${target}`,
    step_warning: `Warning in ${target}${count}`,
    blocker_seen: `Blocked in ${target}${count}`,
    photo_added: `Added photo in ${target}`,
    checkpoint_attempt: `Cloud checkpoint started`,
    checkpoint_success: `Cloud checkpoint saved`,
    checkpoint_failed: `Cloud checkpoint failed`,
    sync_attempt: `Final sync started`,
    sync_success: `Final sync saved`,
    sync_failed: `Final sync failed`,
    final_submit_attempt: `Submit clicked`,
    final_submit_success: `Submit completed`,
    final_submit_failed: `Submit failed`,
    network_offline: `App went offline`,
    network_online: `App came online`,
    screen_view: `Opened ${target}`,
    session_start: `Started field app session`
  };
  return labels[event.type] || `${event.type || 'Activity'} in ${target}`;
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

  let records;
  if (rooms.length) {
    records = rooms.map((room, index) => {
      const declaredStepId = room.stepId || '';
      const expectedKey = stepKeyForRoom(room);
      const directStep = (declaredStepId && steps[declaredStepId]) || (expectedKey ? steps[expectedKey] : null);
      const nameMatch = byRoomName.get(slugifyRoomPart(room.roomName || room.name || ''));
      const stepId = declaredStepId || (directStep ? expectedKey : (nameMatch?.stepId || expectedKey || `room-${index + 1}`));
      // The exported rooms array is the canonical report payload and can be
      // complete even when the lightweight resume stepData map is partial.
      // Use the exported room as the baseline, then overlay any matching live
      // step so room status, notes, readings, and relationships never vanish.
      const step = { ...room, ...(directStep || nameMatch?.step || {}) };
      return { room, step, stepId };
    });
  } else {
    records = Object.entries(steps).map(([stepId, step]) => ({
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

  return ensurePhotoBackedRoomRecords(insp, records);
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
  const suppliedToken = p.get('token');
  const token = suppliedToken && suppliedToken !== 'undefined' && suppliedToken !== 'null'
    ? suppliedToken
    : ACCESS_TOKEN;
  return { id: p.get('id'), token };
}

function getDriveIdFromPhoto(photo) {
  if (!photo) return '';
  if (photo.driveId) return String(photo.driveId);
  const url = String(
    photo.driveUrl ||
    photo.webViewLink ||
    photo.webContentLink ||
    photo.highResUrl ||
    photo.thumbnailUrl ||
    photo.url ||
    photo.imageUrl ||
    ''
  );
  const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function getPhotoStoragePath(photo) {
  return String(photo?.storagePath || photo?.storage_path || photo?.storageObject || '').trim();
}

function photoWorkerUrlFromStoragePath(photo) {
  const storagePath = getPhotoStoragePath(photo);
  if (!storagePath) return '';
  try {
    const url = new URL(PHOTO_WORKER_URL + '/photo');
    url.searchParams.set('path', storagePath);
    const token = String(photo?.token || photo?.inspectionId || _inspection?.inspectionId || '').trim().toLowerCase();
    if (token) url.searchParams.set('token', token);
    return url.toString();
  } catch (err) {
    return '';
  }
}

function normalizePhotoUrl(photo) {
  // Prefer the authenticated Worker image endpoint when present. Google Drive
  // /view links are HTML pages and cannot be used directly as <img> sources.
  if (photo.url && /inhaus-photo-worker\.inhauslab\.workers\.dev\/photo/.test(photo.url)) return photo.url;
  if (photo.highResUrl && /inhaus-photo-worker\.inhauslab\.workers\.dev\/photo/.test(photo.highResUrl)) return photo.highResUrl;
  const workerStorageUrl = photoWorkerUrlFromStoragePath(photo);
  if (workerStorageUrl) return workerStorageUrl;
  const driveId = getDriveIdFromPhoto(photo);
  if (driveId) return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1600`;
  return photo.highResUrl || photo.thumbnailUrl || photo.driveUrl || photo.localUrl || photo.url || photo.imageUrl || '';
}

function photoKey(photo) {
  const timestamp = String(photo.timestamp || '').trim();
  const roomName = String(photo.roomName || '').trim();
  const stepName = String(photo.stepName || '').trim();
  const caption = String(photo.caption || '').trim();
  if (timestamp && (roomName || stepName || caption)) {
    return `meta:${roomName}|${stepName}|${caption}|${timestamp}`;
  }
  if (photo.photoId) return `id:${photo.photoId}`;
  const driveId = getDriveIdFromPhoto(photo);
  if (driveId) return `drive:${driveId}`;
  if (photo.storagePath || photo.storage_path) return `storage:${photo.storagePath || photo.storage_path}`;
  if (photo.driveUrl || photo.localUrl || photo.url || photo.imageUrl || photo.highResUrl || photo.thumbnailUrl) {
    return `url:${photo.driveUrl || photo.localUrl || photo.url || photo.imageUrl || photo.highResUrl || photo.thumbnailUrl}`;
  }
  return `meta:${roomName}|${stepName}|${caption}|${timestamp}`;
}

function isPhotoLikeObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return !!(
    value.photoId ||
    value.driveUrl ||
    value.driveId ||
    value.storagePath ||
    value.storage_path ||
    value.highResUrl ||
    value.thumbnailUrl ||
    value.url ||
    value.imageUrl
  );
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
  const deletedPhotoIds = new Set(Array.isArray(insp?.reviewedData?.deletedPhotoIds)
    ? insp.reviewedData.deletedPhotoIds.filter(Boolean)
    : []);

  function addPhoto(photo, context = {}) {
    if (!photo || typeof photo !== 'object') return;
    const normalized = { ...photo };
    if (normalized.photoId && deletedPhotoIds.has(normalized.photoId)) return;
    delete normalized.imageData;
    const driveUrl = normalizePhotoUrl(normalized);
    if (driveUrl) normalized.driveUrl = driveUrl;
    normalized.storagePath = normalized.storagePath || normalized.storage_path || '';
    normalized.inspectionId = normalized.inspectionId || context.inspectionId || insp?.inspectionId || '';
    normalized.roomName = normalized.roomName || context.roomName || '';
    normalized.stepName = normalized.stepName || context.stepName || '';
    normalized.caption = normalized.caption || '';
    normalized.timestamp = normalized.timestamp || '';
    if (normalized.included === undefined) normalized.included = null;

    const hasUsefulData =
      normalized.driveUrl || normalized.localUrl || normalized.url || normalized.imageUrl ||
      normalized.highResUrl || normalized.thumbnailUrl || normalized.storagePath ||
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
      stepName: value.stepName || value.stepId || value.type || context.stepName || '',
      inspectionId: value.inspectionId || context.inspectionId || insp?.inspectionId || ''
    };

    for (const [key, child] of Object.entries(value)) {
      if (key === 'photos' && Array.isArray(child)) {
        const isTopLevelPhotos = pathParts.length === 0;
        if (!isTopLevelPhotos) child.forEach(photo => addPhoto(photo, nextContext));
      } else if (isPhotoLikeObject(child)) {
        addPhoto(child, nextContext);
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
    .map((photo, index) => ({ ...photo, photoId: assignPhotoId(photo, index, usedIds) }))
    .filter(photo => !deletedPhotoIds.has(photo.photoId));
}

const REVIEW_SUMMARY_FIELD_KEYS = [
  'clientName', 'propertyAddress', 'inspectionDate', 'reportBuilderNotes',
  'residenceType', 'yearBuilt', 'squareFootage', 'numberOfBedrooms',
  'numberOfBathrooms', 'numberOfLevels', 'basement', 'waterSource',
  'waterFiltration', 'waterSoftener', 'carpetedRooms', 'windowsOpen',
  'heating', 'ac', 'ventilation', 'ventilationReadable', 'weatherConditions',
  'particulateMatter', 'occupancyDuringInspection', 'clientConcerns',
  'knownProblemAreas'
];

function applyReviewedData(insp) {
  const reviewed = insp.reviewedData || {};
  const summary = reviewed.summary || {};
  const bulkIncludedPhotoIds = new Set(Array.isArray(reviewed.bulkIncludedPhotoIds)
    ? reviewed.bulkIncludedPhotoIds
    : []);
  REVIEW_SUMMARY_FIELD_KEYS.forEach(key => {
    if (summary[key] !== undefined) insp[key] = summary[key];
    else if (reviewed[key] !== undefined) insp[key] = reviewed[key];
  });

  (insp.photos || []).forEach(photo => {
    const nested = reviewed[`photo_${photo.photoId}`] || {};
    if (photo.originalRoomName === undefined) photo.originalRoomName = photo.roomName || '';
    if (photo.originalStepName === undefined) photo.originalStepName = photo.stepName || '';
    if (nested.caption !== undefined) photo.caption = nested.caption;
    if (nested.included !== undefined) photo.included = nested.included;
    if (nested.rotation !== undefined) photo.rotation = normalizePhotoRotation(nested.rotation);
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
    const legacyRotation = reviewed[`rotation_${photo.photoId}`];
    if (legacyCaption !== undefined) photo.caption = legacyCaption;
    if (legacyIncluded !== undefined) photo.included = legacyIncluded;
    if (nested.included === undefined && legacyIncluded === undefined && bulkIncludedPhotoIds.has(photo.photoId)) {
      photo.included = true;
    }
    if (legacyRotation !== undefined) photo.rotation = normalizePhotoRotation(legacyRotation);
    if (photo.rotation === undefined) photo.rotation = 0;
  });
}

function normalizePhotoRotation(value) {
  const numeric = Number(value) || 0;
  return ((Math.round(numeric / 90) * 90) % 360 + 360) % 360;
}

function syncPhotoRotationViews(photoId, rotation) {
  if (!photoId) return;
  const normalized = normalizePhotoRotation(rotation);
  const escapedId = window.CSS?.escape ? window.CSS.escape(photoId) : String(photoId).replace(/["\\]/g, '\\$&');
  document.querySelectorAll(`[data-photo-id="${escapedId}"]`).forEach(node => {
    node.dataset.photoRotation = String(normalized);
    node.querySelectorAll('img').forEach(img => {
      img.dataset.photoRotation = String(normalized);
      const applyRotation = () => {
        const width = img.clientWidth;
        const height = img.clientHeight;
        const scale = normalized % 180 !== 0 && width && height
          ? Math.min(width / height, height / width)
          : 1;
        img.style.transform = normalized ? `rotate(${normalized}deg) scale(${scale})` : '';
      };
      applyRotation();
      if (!img.complete) img.addEventListener('load', applyRotation, { once: true });
    });
  });
}

function syncAllPhotoRotations() {
  (_inspection?.photos || []).forEach(photo => syncPhotoRotationViews(photo.photoId, photo.rotation));
}

function syncPhotoCaptionViews(photoId, caption) {
  if (!photoId) return;
  const escapedId = window.CSS?.escape ? window.CSS.escape(photoId) : String(photoId).replace(/["\\]/g, '\\$&');
  document.querySelectorAll(`[data-photo-id="${escapedId}"]`).forEach(node => {
    if ((node.matches('input, textarea')) && document.activeElement !== node) node.value = caption;
    node.dataset.photoCaption = caption;
    if (node.matches('.room-photo-thumb')) {
      node.title = caption || photoId;
      node.setAttribute('aria-label', caption ? `Open ${caption}` : 'Open room photo');
      const img = node.querySelector('img');
      if (img) img.alt = caption || photoId;
      let label = node.querySelector('.room-photo-caption');
      if (caption) {
        if (!label) {
          label = el('span', { class: 'room-photo-caption' });
          node.appendChild(label);
        }
        label.textContent = caption;
      } else if (label) {
        label.remove();
      }
    }
  });
}

async function saveReviewedPhotoCaption(photoId, value, options = {}) {
  if (!photoId || !_inspection) return false;
  const notify = options.notify !== false;
  const caption = String(value || '').trim();
  (_inspection.photos || []).forEach(photo => {
    if (photo.photoId === photoId) photo.caption = caption;
  });
  syncPhotoCaptionViews(photoId, caption);
  const saved = await saveField(`photo_${photoId}`, 'caption', caption);
  if (saved && notify) showToast('Photo caption saved everywhere in the review');
  return saved;
}

async function saveReviewedPhotoRotation(photoId, value) {
  if (!photoId || !_inspection) return false;
  const rotation = normalizePhotoRotation(value);
  (_inspection.photos || []).forEach(photo => {
    if (photo.photoId === photoId) photo.rotation = rotation;
  });
  syncPhotoRotationViews(photoId, rotation);
  const saved = await saveField(`photo_${photoId}`, 'rotation', rotation);
  if (saved) showToast(`Photo rotation saved (${rotation}°)`);
  return saved;
}

async function deleteReviewedPhoto(photoId) {
  if (!photoId || !_inspection?.inspectionId) return false;
  const response = await fetch(PHOTO_WORKER_URL + '/delete-review-photo', {
    method: 'POST',
    headers: workerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ inspectionId: _inspection.inspectionId, photoId })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Photo delete failed: ${response.status}`);

  const deletedPhotoIds = new Set(Array.isArray(_inspection.reviewedData?.deletedPhotoIds)
    ? _inspection.reviewedData.deletedPhotoIds
    : []);
  deletedPhotoIds.add(photoId);
  const deletionIndexSaved = await saveField('summary', 'deletedPhotoIds', Array.from(deletedPhotoIds));
  _inspection.photos = (_inspection.photos || []).filter(photo => photo.photoId !== photoId);
  _inspection.photoCount = _inspection.photos.length;
  _selectedPhotoIds.delete(photoId);
  await closePhotoModal({ skipSave: true });
  renderRoomsSection(_inspection, false);
  renderPhotosSection(_inspection, false);
  checkGate();
  showToast(deletionIndexSaved
    ? 'Photo deleted from the review and cloud storage'
    : 'Photo deleted; review index will retry saving', deletionIndexSaved ? 'success' : 'info');
  return true;
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

function countInspectionArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function createReviewDataHealthSnapshot(insp = {}) {
  return {
    sourcePath: '',
    sourceError: '',
    usedReviewStorageSource: false,
    usedLegacyStaticFallback: false,
    reviewStorageLoaded: false,
    reviewStorageError: '',
    reviewStorageRecoveryAvailable: false,
    autoRecoverySaved: false,
    autoRecoveryError: '',
    workerStatusLoaded: false,
    workerStatusError: '',
    workerStatus: null,
    baseStatus: String(insp.status || ''),
    baseSubmittedAt: String(insp.submittedToTannerAt || insp.submittedAt || ''),
    basePhotoCount: Number(insp.photoCount) || 0,
    baseRooms: countInspectionArray(insp.rooms),
    baseFindings: countInspectionArray(insp.findings),
    basePhotos: countInspectionArray(insp.photos),
    recoveryApplied: false,
    recoveryRooms: 0,
    recoveryFindings: 0,
    workerPhotos: 0,
    workerPhotoError: '',
    finalPhotos: 0
  };
}

function extractWorkerPhotoArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const candidates = [
    data.photos,
    data.rows,
    data.items,
    data.records,
    data.data
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

async function loadWorkerPhotos(inspectionId) {
  if (!inspectionId) return [];
  const routes = ['/inspection-photos'];
  let lastError = null;
  for (const route of routes) {
    const url = new URL(PHOTO_WORKER_URL + route);
    url.searchParams.set('inspectionId', inspectionId);
    url.searchParams.set('id', inspectionId);
    url.searchParams.set('token', inspectionId.toLowerCase());
    const response = await fetch(url.toString(), {
      cache: 'no-store',
      headers: workerAuthHeaders()
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return extractWorkerPhotoArray(data);
    lastError = new Error(data.error || `Photo recovery failed: ${response.status}`);
    if (response.status !== 404) break;
  }
  throw lastError || new Error('Photo recovery failed');
}

function getExpectedWorkerPhotoIds(inspection) {
  const ids = new Set();
  (inspection?.photos || []).forEach(photo => {
    const id = String(photo?.photoId || photo?.photo_id || '').trim();
    if (id) ids.add(id);
  });
  return Array.from(ids);
}

async function loadWorkerInspectionStatus(inspectionId, inspection = null) {
  if (!inspectionId) return null;
  const response = await fetch(PHOTO_WORKER_URL + '/inspection-status', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inspectionId,
      expectedPhotoIds: getExpectedWorkerPhotoIds(inspection),
      sharedSecret: PHOTO_UPLOAD_SHARED_SECRET
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Inspection status failed: ${response.status}`);
  return data;
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

async function apiFetch(params, method = 'GET', body = null, options = {}) {
  if (IS_DEMO) return null;
  const url = new URL(APPS_SCRIPT_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const opts = { method };
  if (body) {
    const payload = body && typeof body === 'object' && !Array.isArray(body)
      ? { ...body, 'x-sync-secret': body['x-sync-secret'] || SYNC_SECRET }
      : body;
    opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    opts.body = JSON.stringify(payload);
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || API_FETCH_TIMEOUT_MS);
  opts.signal = controller.signal;
  let res;
  try {
    res = await fetch(url.toString(), opts);
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('API request timed out');
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.status === 'error') throw new Error(json.message || 'API error');
  return json;
}

async function visionProxyFetch(payload, options = {}) {
  return fetch(VISION_PROXY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...(payload || {}),
      _syncSecret: SYNC_SECRET
    }),
    ...(options.signal ? { signal: options.signal } : {})
  });
}

function workerAuthHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'x-worker-token': ACCESS_TOKEN,
    ...extra
  };
}

async function requestWorkerHandoffPackage(inspectionId, payload = {}) {
  const maxAttempts = Math.max(1, Number(payload.maxAttempts || 6));
  const receiptContext = {
    expectedPhotoCount: Number(_inspection?.photoCount || (_inspection?.photos || []).length || 0),
    expectedRoomCount: Array.isArray(_inspection?.rooms) ? _inspection.rooms.length : 0
  };
  let lastData = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), API_HANDOFF_TIMEOUT_MS);
    try {
      const response = await fetch(PHOTO_WORKER_URL + '/handoff-jobs', {
        method: 'POST',
        headers: workerAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          inspectionId,
          token: ACCESS_TOKEN,
          ...payload
        }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      lastData = data;
      const receipt = data?.artifactReceipt || data?.reviewPortalData || null;
      const missing = getMissingHandoffReceiptFields(receipt || {}, receiptContext);
      if (response.ok && receipt && !missing.length) {
        return {
          ...data,
          reviewPortalData: receipt,
          tannerNotification: receipt.notification || data.tannerNotification || null
        };
      }
      const pendingPhotos = Number(receipt?.photoFolderPendingCount || receipt?.counts?.photoFolderPendingCount || 0);
      const failedPhotos = Number(receipt?.photoFolderFailedCount || receipt?.technicianPhotoFailedCount || receipt?.counts?.photoFolderFailedCount || 0);
      const stillRunning = /running|queued|repairing|waiting/i.test(String(data?.status || receipt?.status || ''));
      if (attempt < maxAttempts && pendingPhotos > 0 && failedPhotos === 0 && stillRunning) {
        await sleep(1200);
        continue;
      }
      const detail = data?.lastError || data?.error || receipt?.error || (missing.length ? `missing ${missing.join(', ')}` : `Worker handoff failed: ${response.status}`);
      throw new Error(detail);
    } finally {
      window.clearTimeout(timeout);
    }
  }
  const receipt = lastData?.artifactReceipt || lastData?.reviewPortalData || null;
  const pendingPhotos = Number(receipt?.photoFolderPendingCount || receipt?.counts?.photoFolderPendingCount || 0);
  throw new Error(pendingPhotos > 0 ? `Photo package still copying: ${pendingPhotos} remaining` : 'Worker handoff did not complete.');
}

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function getWorkerHandoffMaxAttempts(insp) {
  const photoCount = Number(insp?.photoCount || (Array.isArray(insp?.photos) ? insp.photos.length : 0) || 0);
  if (!photoCount) return 6;
  return Math.min(24, Math.max(6, Math.ceil(photoCount / 10) + 3));
}

async function loadCloudReview(inspectionId) {
  const url = new URL(PHOTO_WORKER_URL + '/get-review');
  url.searchParams.set('inspectionId', inspectionId);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url.toString(), {
      cache: 'no-store',
      headers: workerAuthHeaders(),
      signal: controller.signal
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('Review storage request timed out');
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Review load failed: ${response.status}`);
  return data;
}

function clonePlainObject(value) {
  if (!value || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return Array.isArray(value) ? value.slice() : { ...value };
  }
}

function stripInlinePayloadsForReviewStorage(value, depth = 0) {
  if (value === undefined || value === null) return value;
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) {
    return value.map(item => stripInlinePayloadsForReviewStorage(item, depth + 1));
  }
  if (typeof value !== 'object') return value;

  const cleaned = {};
  Object.entries(value).forEach(([key, child]) => {
    if (/^(dataUrl|imageData|thumbnailDataUrl|base64|blob)$/i.test(key)) return;
    cleaned[key] = stripInlinePayloadsForReviewStorage(child, depth + 1);
  });
  return cleaned;
}

function hasRecoverableSourcePayload(insp = {}) {
  if (!insp || typeof insp !== 'object') return false;
  return Boolean(
    countInspectionArray(insp.rooms) ||
    countInspectionArray(insp.findings) ||
    countInspectionArray(insp.photos) ||
    (insp.stepData && typeof insp.stepData === 'object' && Object.keys(insp.stepData).length)
  );
}

function buildReviewStorageSourceSnapshot(insp = {}) {
  const snapshot = stripInlinePayloadsForReviewStorage(clonePlainObject(insp) || {});
  delete snapshot.reviewedData;
  delete snapshot._reviewDataHealth;
  delete snapshot._reviewActivitySessions;
  delete snapshot._reviewActivityEvents;
  return snapshot;
}

async function ensureReviewStorageSourceSnapshot(inspectionId, insp, health) {
  if (!inspectionId || !insp || !health) return false;
  if (health.reviewStorageRecoveryAvailable) return false;
  if (health.sourcePath !== 'apps-script-detail') return false;
  if (!hasRecoverableSourcePayload(insp)) return false;

  try {
    await saveCloudReviewField(inspectionId, {
      stepId: 'system',
      key: 'inspectionRecovery',
      value: buildReviewStorageSourceSnapshot(insp)
    });
    health.reviewStorageLoaded = true;
    health.reviewStorageError = '';
    health.reviewStorageRecoveryAvailable = true;
    health.autoRecoverySaved = true;
    return true;
  } catch (err) {
    health.autoRecoveryError = err?.message || 'Source snapshot save failed';
    return false;
  }
}

function getInspectionRecoveryFromReviewFields(fieldData = {}) {
  if (!fieldData || typeof fieldData !== 'object') return null;
  const system = fieldData.system && typeof fieldData.system === 'object' && !Array.isArray(fieldData.system)
    ? fieldData.system
    : {};
  const candidates = [
    system.inspectionRecovery,
    fieldData.inspectionRecovery,
    fieldData.sourceInspection,
    fieldData.submittedInspection,
    fieldData.inspection
  ];
  return candidates.find(candidate =>
    candidate &&
    typeof candidate === 'object' &&
    !Array.isArray(candidate) &&
    (candidate.inspectionId || candidate.id || candidate.rooms || candidate.stepData)
  ) || null;
}

function stripInspectionRecoveryFromReviewFields(fieldData = {}) {
  const reviewFields = extractReviewActivityData(clonePlainObject(fieldData) || {});
  if (reviewFields.system && typeof reviewFields.system === 'object' && !Array.isArray(reviewFields.system)) {
    const systemFields = { ...reviewFields.system };
    delete systemFields.inspectionRecovery;
    if (Object.keys(systemFields).length) reviewFields.system = systemFields;
    else delete reviewFields.system;
  }
  return reviewFields;
}

function stripLocalOnlySubmissionState(data) {
  if (!data || typeof data !== 'object') return data;
  delete data.submission;
  delete data.status;
  delete data.submittedAt;
  delete data.submittedToTannerAt;
  delete data.completionScore;
  delete data.completionGrade;
  if (data.summary && typeof data.summary === 'object' && !Array.isArray(data.summary)) {
    delete data.summary.submission;
    delete data.summary.status;
    delete data.summary.submittedAt;
    delete data.summary.submittedToTannerAt;
    delete data.summary.completionScore;
    delete data.summary.completionGrade;
  }
  return data;
}

function getServerSubmittedReviewState(insp = {}) {
  const submission = insp.reviewedData?.submission && typeof insp.reviewedData.submission === 'object'
    ? insp.reviewedData.submission
    : null;
  const submittedAt = String(submission?.submittedAt || '').trim();
  const status = String(insp.status || '').toLowerCase();
  const hasSubmittedPackage = Boolean(submission && (
    submittedAt ||
    submission.completionScore !== undefined ||
    submission.completionGrade !== undefined ||
    submission.status
  ));
  return {
    submitted: hasSubmittedPackage,
    statusSubmitted: /submitted to tanner|report complete/.test(status),
    submittedAt,
    submission
  };
}

async function saveCloudReviewField(inspectionId, field) {
  const response = await fetch(PHOTO_WORKER_URL + '/save-review', {
    method: 'POST',
    headers: workerAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ inspectionId, field })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Review save failed: ${response.status}`);
  return data;
}

async function saveReviewSubmissionReceipt(inspectionId, receipt, reportBuilderNotes) {
  const fields = [
    { stepId: 'summary', key: 'status', value: receipt.status },
    { stepId: 'summary', key: 'submittedAt', value: receipt.submittedAt },
    { stepId: 'summary', key: 'submittedToTannerAt', value: receipt.submittedAt },
    { stepId: 'summary', key: 'reviewReadiness', value: receipt.reviewReadiness || null },
    { stepId: 'summary', key: 'readinessStatus', value: receipt.readinessStatus || '' },
    { stepId: 'summary', key: 'readinessCompleted', value: receipt.readinessCompleted || 0 },
    { stepId: 'summary', key: 'readinessRequired', value: receipt.readinessRequired || 0 },
    { stepId: 'summary', key: 'blockerCount', value: receipt.blockerCount || 0 },
    { stepId: 'summary', key: 'reportBuilderNotes', value: reportBuilderNotes || '' },
    { stepId: 'summary', key: 'submission', value: receipt }
  ];

  for (const field of fields) {
    await saveCloudReviewField(inspectionId, field);
  }

  const verified = await loadCloudReview(inspectionId);
  const verifiedSubmission = getServerSubmittedReviewState({
    status: receipt.status,
    reviewedData: verified.fieldData || {}
  });
  if (!verifiedSubmission.submitted) {
    throw new Error('Submission receipt was not confirmed by review storage.');
  }
  return verifiedSubmission;
}

async function saveReviewSubmissionAttempt(inspectionId, receipt, reportBuilderNotes) {
  const attempt = {
    ...receipt,
    status: 'Handoff in progress',
    attemptedAt: new Date().toISOString()
  };
  const fields = [
    { stepId: 'summary', key: 'submissionAttempt', value: attempt },
    { stepId: 'summary', key: 'lastSubmissionAttemptAt', value: attempt.attemptedAt },
    { stepId: 'summary', key: 'reportBuilderNotes', value: reportBuilderNotes || '' }
  ];
  for (const field of fields) {
    await saveCloudReviewField(inspectionId, field);
  }
  return attempt;
}

async function saveReviewSubmissionFailure(inspectionId, message) {
  try {
    await saveCloudReviewField(inspectionId, {
      stepId: 'summary',
      key: 'lastSubmissionFailure',
      value: {
        failedAt: new Date().toISOString(),
        message: message || 'Submission failed'
      }
    });
  } catch(e) {
    console.warn('Could not save submission failure receipt:', e);
  }
}

async function saveReviewHandoffReceipt(inspectionId, handoffResult) {
  if (!inspectionId || !handoffResult || typeof handoffResult !== 'object') return false;
  const expectedPhotoCount = Number(_inspection?.photoCount || (_inspection?.photos || []).length || 0);
  const expectedRoomCount = Array.isArray(_inspection?.rooms) ? _inspection.rooms.length : 0;
  const missing = getMissingHandoffReceiptFields(handoffResult, { expectedPhotoCount, expectedRoomCount });
  if (missing.length) {
    throw new Error('Tanner handoff receipt incomplete: ' + missing.join(', '));
  }
  const fields = [
    { stepId: 'summary', key: 'reviewPortalData', value: handoffResult },
    { stepId: 'summary', key: 'folderId', value: handoffResult.folderId || '' },
    { stepId: 'summary', key: 'folderUrl', value: handoffResult.folderUrl || '' },
    { stepId: 'summary', key: 'assessmentFolderId', value: handoffResult.folderId || '' },
    { stepId: 'summary', key: 'assessmentFolderUrl', value: handoffResult.folderUrl || '' },
    { stepId: 'summary', key: 'reviewPortalDataSpreadsheetId', value: handoffResult.spreadsheetId || '' },
    { stepId: 'summary', key: 'reviewPortalDataSpreadsheetUrl', value: handoffResult.spreadsheetUrl || '' },
    { stepId: 'summary', key: 'reviewPortalDataUrl', value: handoffResult.spreadsheetUrl || '' },
    { stepId: 'summary', key: 'rawReviewDataUrl', value: handoffResult.rawJsonUrl || handoffResult.rawReviewDataUrl || '' },
    { stepId: 'summary', key: 'rawReviewDataJsonUrl', value: handoffResult.rawJsonUrl || handoffResult.rawReviewDataUrl || '' },
    { stepId: 'summary', key: 'technicianPhotosFolderId', value: handoffResult.technicianPhotosFolderId || '' },
    { stepId: 'summary', key: 'technicianPhotosFolderUrl', value: handoffResult.technicianPhotosFolderUrl || '' },
    { stepId: 'summary', key: 'photosFolderId', value: handoffResult.photosFolderId || handoffResult.technicianPhotosFolderId || '' },
    { stepId: 'summary', key: 'photosFolderUrl', value: handoffResult.photosFolderUrl || handoffResult.technicianPhotosFolderUrl || '' },
    { stepId: 'summary', key: 'cocsFolderId', value: handoffResult.cocsFolderId || '' },
    { stepId: 'summary', key: 'cocsFolderUrl', value: handoffResult.cocsFolderUrl || '' },
    { stepId: 'summary', key: 'backupFolderId', value: handoffResult.backupFolderId || '' },
    { stepId: 'summary', key: 'backupFolderUrl', value: handoffResult.backupFolderUrl || '' },
    { stepId: 'summary', key: 'trackerRow', value: handoffResult.trackerRow || '' },
    { stepId: 'summary', key: 'trackerUrl', value: handoffResult.trackerUrl || '' },
    { stepId: 'summary', key: 'trackerRowUrl', value: handoffResult.trackerUrl || '' },
    { stepId: 'summary', key: 'trackerStatus', value: handoffResult.trackerStatus || '' },
    { stepId: 'summary', key: 'handoffAttemptCount', value: handoffResult.attemptCount || '' },
    { stepId: 'summary', key: 'handoffLastRunAt', value: handoffResult.lastRunAt || '' },
    { stepId: 'summary', key: 'handoffNextRunAt', value: handoffResult.nextRunAt || '' },
    { stepId: 'summary', key: 'isTestTraining', value: handoffResult.isTestTraining === true },
    { stepId: 'system', key: 'tannerHandoff', value: handoffResult }
  ];

  for (const field of fields) {
    await saveCloudReviewField(inspectionId, field);
  }
  return true;
}

function applyHandoffReceiptToInspection(handoffResult) {
  if (!_inspection || !handoffResult) return;
  if (!_inspection.reviewedData) _inspection.reviewedData = {};
  _inspection.reviewedData.reviewPortalData = handoffResult;
  Object.assign(_inspection.reviewedData, {
    folderId: handoffResult.folderId || '',
    folderUrl: handoffResult.folderUrl || '',
    assessmentFolderId: handoffResult.folderId || '',
    assessmentFolderUrl: handoffResult.folderUrl || '',
    reviewPortalDataSpreadsheetId: handoffResult.spreadsheetId || '',
    reviewPortalDataSpreadsheetUrl: handoffResult.spreadsheetUrl || '',
    reviewPortalDataUrl: handoffResult.spreadsheetUrl || '',
    rawReviewDataUrl: handoffResult.rawJsonUrl || handoffResult.rawReviewDataUrl || '',
    rawReviewDataJsonUrl: handoffResult.rawJsonUrl || handoffResult.rawReviewDataUrl || '',
    technicianPhotosFolderId: handoffResult.technicianPhotosFolderId || '',
    technicianPhotosFolderUrl: handoffResult.technicianPhotosFolderUrl || '',
    photosFolderId: handoffResult.photosFolderId || handoffResult.technicianPhotosFolderId || '',
    photosFolderUrl: handoffResult.photosFolderUrl || handoffResult.technicianPhotosFolderUrl || '',
    cocsFolderId: handoffResult.cocsFolderId || '',
    cocsFolderUrl: handoffResult.cocsFolderUrl || '',
    backupFolderId: handoffResult.backupFolderId || '',
    backupFolderUrl: handoffResult.backupFolderUrl || '',
    trackerRow: handoffResult.trackerRow || '',
    trackerUrl: handoffResult.trackerUrl || '',
    trackerRowUrl: handoffResult.trackerUrl || '',
    trackerStatus: handoffResult.trackerStatus || '',
    isTestTraining: handoffResult.isTestTraining === true,
    handoffStatus: handoffResult.status || '',
    handoffAttemptCount: handoffResult.attemptCount || '',
    handoffLastRunAt: handoffResult.lastRunAt || '',
    handoffNextRunAt: handoffResult.nextRunAt || '',
    handoffUpdatedAt: handoffResult.updatedAt || '',
    lastHandoffError: handoffResult.error || ''
  });
  if (!_inspection.reviewedData.system || typeof _inspection.reviewedData.system !== 'object') {
    _inspection.reviewedData.system = {};
  }
  _inspection.reviewedData.system.tannerHandoff = handoffResult;
}

function normalizedHandoffStatus(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function isReadyHandoffStatus(value) {
  return ['ready', 'complete', 'completed', 'submitted', 'success', 'succeeded'].includes(normalizedHandoffStatus(value));
}

function isTestTrainingInspectionRecord(insp = {}, handoff = {}) {
  if (handoff && (handoff.is_test === true || handoff.isTest === true)) return true;
  if (handoff && handoff.isTestTraining === true) return true;
  if (insp && (insp.is_test === true || insp.isTest === true)) return true;
  if (insp && (insp.reviewedData?.is_test === true || insp.reviewedData?.isTest === true)) return true;
  const explicit = [
    insp.inspectionType,
    insp.assessmentType,
    insp.assessmentPurpose,
    insp.inspectionMode,
    insp.reviewedData?.inspectionType,
    insp.reviewedData?.isTestTraining === true ? 'test' : ''
  ].filter(Boolean).join(' ');
  return /test|training|practice|demo/i.test(explicit);
}

function handoffCountValue(handoff = {}, keys = []) {
  const counts = handoff && typeof handoff.counts === 'object' && !Array.isArray(handoff.counts)
    ? handoff.counts
    : {};
  for (const key of keys) {
    const value = handoff[key] !== undefined ? handoff[key] : counts[key];
    if (value !== undefined && value !== null && value !== '') {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    }
  }
  return null;
}

function getMissingHandoffReceiptFields(handoff = {}, context = {}) {
  const missing = [];
  const status = normalizedHandoffStatus(handoff.status || handoff.handoffStatus || '');
  const trackerStatus = normalizedHandoffStatus(handoff.trackerStatus || '');
  const isTestTraining = handoff.isTestTraining === true || handoff.is_test === true || handoff.isTest === true || trackerStatus === 'skipped-test-training';
  if (status && !isReadyHandoffStatus(status)) {
    missing.push(`handoff status ${status}`);
  }
  if (!(handoff.folderUrl || handoff.folderId)) missing.push('assessment folder');
  if (!(handoff.spreadsheetUrl || handoff.spreadsheetId)) missing.push('review data spreadsheet');
  if (!(handoff.rawJsonUrl || handoff.rawReviewDataUrl)) missing.push('raw backup');
  if (!isTestTraining && !(handoff.trackerUrl || handoff.trackerRow || handoff.trackerRowUrl)) missing.push('tracker row');
  if (!(handoff.photosFolderUrl || handoff.photosFolderId || handoff.technicianPhotosFolderUrl || handoff.technicianPhotosFolderId)) {
    missing.push('photos folder');
  }
  const failedPhotoCopies = Number(handoff.photoFolderFailedCount || handoff.technicianPhotoFailedCount || handoff.counts?.photoFolderFailedCount || 0);
  const pendingPhotoCopies = Number(handoff.photoFolderPendingCount || handoff.counts?.photoFolderPendingCount || 0);
  if (failedPhotoCopies > 0) {
    missing.push(`${failedPhotoCopies} photo folder copy failure${failedPhotoCopies === 1 ? '' : 's'}`);
  }
  if (pendingPhotoCopies > 0) {
    missing.push(`${pendingPhotoCopies} photo folder copy pending`);
  }
  const expectedPhotoCount = Number(context.expectedPhotoCount || 0);
  const expectedRoomCount = Number(context.expectedRoomCount || 0);
  const rawReviewKeyCount = handoffCountValue(handoff, ['rawReviewKeyCount']);
  const formattedReviewRowCount = handoffCountValue(handoff, ['formattedReviewRowCount']);
  const photoLogCount = handoffCountValue(handoff, ['photoLogCount']);
  const roomDetailCount = handoffCountValue(handoff, ['roomDetailCount']);
  if (rawReviewKeyCount !== null && rawReviewKeyCount <= 0) {
    missing.push('raw review data rows');
  }
  if (formattedReviewRowCount !== null && formattedReviewRowCount <= 0) {
    missing.push('formatted review rows');
  }
  if (expectedPhotoCount > 0 && photoLogCount !== null && photoLogCount < expectedPhotoCount) {
    missing.push(`photo log rows ${photoLogCount}/${expectedPhotoCount}`);
  }
  if (expectedRoomCount > 0 && roomDetailCount !== null && roomDetailCount < expectedRoomCount) {
    missing.push(`room detail rows ${roomDetailCount}/${expectedRoomCount}`);
  }
  return missing;
}

function getHandoffReceiptFromReviewFields(fieldData = {}) {
  if (!fieldData || typeof fieldData !== 'object') return null;
  const system = fieldData.system && typeof fieldData.system === 'object' && !Array.isArray(fieldData.system)
    ? fieldData.system
    : {};
  const candidates = [
    system.tannerHandoff,
    fieldData.reviewPortalData,
    fieldData.tannerHandoff
  ];
  return candidates.find(candidate => candidate && typeof candidate === 'object' && !Array.isArray(candidate)) || null;
}

async function verifyTannerHandoffPackage(inspectionId) {
  const verified = await loadCloudReview(inspectionId);
  const handoffReceipt = getHandoffReceiptFromReviewFields(verified.fieldData || {});
  const expectedPhotoCount = Number(_inspection?.photoCount || (_inspection?.photos || []).length || 0);
  const expectedRoomCount = Array.isArray(_inspection?.rooms) ? _inspection.rooms.length : 0;
  const missingHandoff = getMissingHandoffReceiptFields(handoffReceipt || {}, { expectedPhotoCount, expectedRoomCount });
  if (missingHandoff.length) {
    throw new Error('Tanner handoff package was not confirmed: ' + missingHandoff.join(', ') + '.');
  }
  let photoCount = 0;
  try {
    photoCount = (await loadWorkerPhotos(inspectionId)).length;
  } catch (err) {
    if (expectedPhotoCount > 0) throw new Error('Tanner photo package was not confirmed. Please retry.');
  }
  return { verified, handoffReceipt, photoCount };
}

async function verifyTannerToolPackage(inspectionId) {
  const { verified, photoCount } = await verifyTannerHandoffPackage(inspectionId);
  const verifiedSubmission = getServerSubmittedReviewState({
    status: 'Submitted to Tanner',
    reviewedData: verified.fieldData || {}
  });
  if (!verifiedSubmission.submitted) {
    throw new Error('Submission was not confirmed by review storage. Please retry.');
  }

  return { ...verifiedSubmission, photoCount };
}

async function repairTannerHandoffPackage() {
  if (IS_DEMO) {
    showToast('Demo mode - Tanner package repair is not available', 'demo');
    return;
  }
  if (_handoffRepairInFlight) return;

  const { id, token } = getURLParams();
  if (!id) {
    showToast('Missing inspection ID; cannot repair Tanner package.', 'error');
    return;
  }

  const ok = window.confirm(
    'Repair Tanner package now?\n\n' +
    'This may create or update the Drive folder, Review Portal Data sheet, Raw Review Data backup, Photos/COCs/Backup folders, and tracker status.\n\n' +
    'It will not mark the review as newly submitted.'
  );
  if (!ok) return;

  _handoffRepairInFlight = true;
  renderTannerPackageCheck(_inspection || {});
  showToast('Repairing Tanner package...', 'info', 7000);

  try {
    const response = ENABLE_WORKER_HANDOFF
      ? await requestWorkerHandoffPackage(id, {
          requestedBy: 'review-portal-repair',
          maxAttempts: getWorkerHandoffMaxAttempts(_inspection),
          reviewedData: _inspection?.reviewedData || {}
        })
      : await apiFetch({}, 'POST', {
          action: 'repairHandoff',
          id,
          token,
          reviewedData: _inspection?.reviewedData || {}
        }, { timeoutMs: API_HANDOFF_TIMEOUT_MS });
    const handoffResult = response?.reviewPortalData || null;
    const missing = getMissingHandoffReceiptFields(handoffResult || {}, {
      expectedPhotoCount: Number(_inspection?.photoCount || (_inspection?.photos || []).length || 0),
      expectedRoomCount: Array.isArray(_inspection?.rooms) ? _inspection.rooms.length : 0
    });
    if (!handoffResult || missing.length) {
      throw new Error('Repair did not return a complete handoff receipt: ' + missing.join(', '));
    }
    applyHandoffReceiptToInspection(handoffResult);
    if (_inspection) {
      renderTannerPackageCheck(_inspection);
      const results = evaluateGate(_inspection);
      renderFinishTracker(results);
      updateSubmitButton(results);
    }
    showToast('Tanner package repaired and receipt confirmed.', 'success', 7000);
  } catch (err) {
    showToast(`Tanner package repair failed: ${err.message}`, 'error', 9000);
  } finally {
    _handoffRepairInFlight = false;
    if (_inspection) renderTannerPackageCheck(_inspection);
  }
}

function mergeCheckpointValue(base, incoming) {
  if (incoming === undefined || incoming === null || incoming === '') return base;

  if (Array.isArray(incoming)) {
    if (!incoming.length && Array.isArray(base) && base.length) return base;
    return incoming.map(item => mergeCheckpointValue(undefined, item));
  }

  if (incoming && typeof incoming === 'object') {
    const prior = base && typeof base === 'object' && !Array.isArray(base) ? base : {};
    const merged = { ...prior };
    Object.entries(incoming).forEach(([key, value]) => {
      if (key === 'resumeData') return;
      merged[key] = mergeCheckpointValue(prior[key], value);
    });
    return merged;
  }

  return incoming;
}

function mergeInspectionCheckpoints(inspection) {
  if (!inspection || typeof inspection !== 'object') return inspection;

  const checkpoints = [];
  const seen = new Set();
  let current = inspection.resumeData;
  let depth = 1;

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if (current.stepData && typeof current.stepData === 'object') {
      checkpoints.push({
        data: current,
        depth,
        timestamp: Number(current._lastCheckpointSucceededAt || current._lastCheckpointAttemptAt || 0)
      });
    }
    current = current.resumeData;
    depth += 1;
  }

  if (!checkpoints.length) return inspection;

  // Apply older/deeper checkpoints first, then overlay newer saved values.
  // Deep-merging stepData preserves completed steps when a later emergency or
  // cache-recovery checkpoint contains only the handful of fields changed next.
  checkpoints.sort((a, b) => {
    if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return b.depth - a.depth;
  });

  let merged = mergeCheckpointValue({}, inspection);
  checkpoints.forEach(checkpoint => {
    merged = mergeCheckpointValue(merged, checkpoint.data);
  });
  return merged;
}

/* ============================================================
   INSPECTION LIST PAGE
   ============================================================ */

async function loadInspectionList() {
  _currentPage = 'list';
  const tableBody = qs('#inspection-tbody');
  const countLabel = qs('#inspection-count');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="10" class="loading-state">
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
  if (!IS_DEMO) enrichInspectionListPhotoCounts(data.inspections, tableBody);
}

function renderInspectionList(inspections, tableBody, countLabel) {
  if (countLabel) countLabel.textContent = `${inspections.length} inspection${inspections.length !== 1 ? 's' : ''}`;

  if (!inspections.length) {
    tableBody.innerHTML = `<tr><td colspan="9" class="empty-state">No inspections found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = '';
  for (const insp of inspections) {
    // The live list endpoint authorizes the request with ACCESS_TOKEN but does
    // not return a per-inspection reviewToken. Reuse the portal token so Open
    // Review never generates token=undefined.
    const reviewToken = insp.reviewToken || ACCESS_TOKEN;
    const id = insp.id || insp.inspectionId || '';
    const sourcePhotoCount = Number(insp.photoCount) || 0;
    const row = document.createElement('tr');
    row.dataset.inspectionId = id;
    row.innerHTML = `
      <td>
        <div class="td-address">${escapeHTML(insp.propertyAddress)}</div>
        <div class="td-id">${escapeHTML(id)}</div>
      </td>
      <td>${escapeHTML(insp.clientName)}</td>
      <td>${formatDate(insp.inspectionDate)}</td>
      <td>${escapeHTML(insp.inspectorName)}</td>
      <td>${statusBadgeHTML(insp.status)}</td>
      <td data-photo-count-cell="${escapeHTML(id)}">
        ${photoCountListHTML(sourcePhotoCount, 'checking')}
      </td>
      <td>
        ${insp.missingCount > 0
          ? `<span class="missing-badge has-missing">${insp.missingCount}</span>`
          : `<span class="missing-badge no-missing">✓</span>`}
      </td>
      <td class="text-muted">${formatDateTime(insp.lastUpdated)}</td>
      <td>
        <a href="review.html?id=${encodeURIComponent(id)}&token=${encodeURIComponent(reviewToken)}"
           class="btn btn-open btn-sm">Open Review →</a>
      </td>
    `;
    tableBody.appendChild(row);
  }
}

function photoCountListHTML(sourceCount, state = 'source', workerCount = null) {
  const source = Number(sourceCount) || 0;
  const worker = workerCount == null ? null : Number(workerCount) || 0;
  if (state === 'checking') {
    return `<div class="list-photo-count checking">
      <strong>${source}</strong>
      <span>Checking photo service…</span>
    </div>`;
  }
  if (state === 'recovered') {
    return `<div class="list-photo-count recovered" title="App list says ${source}; photo service has ${worker}">
      <strong>${worker}</strong>
      <span>Photo service recovered · app list ${source}</span>
    </div>`;
  }
  if (state === 'matched') {
    return `<div class="list-photo-count matched">
      <strong>${worker}</strong>
      <span>Photo service verified</span>
    </div>`;
  }
  if (state === 'service-empty') {
    return `<div class="list-photo-count warn" title="App list has photos but the photo service did not return them">
      <strong>${source}</strong>
      <span>App list only · service 0</span>
    </div>`;
  }
  if (state === 'failed') {
    return `<div class="list-photo-count warn">
      <strong>${source || '—'}</strong>
      <span>Photo service unavailable</span>
    </div>`;
  }
  return `<div class="list-photo-count">
    <strong>${source || '—'}</strong>
    <span>App list</span>
  </div>`;
}

async function loadWorkerPhotoCount(inspectionId) {
  const photos = await loadWorkerPhotos(inspectionId);
  return photos.length;
}

async function enrichInspectionListPhotoCounts(inspections, tableBody) {
  const queue = (inspections || [])
    .map(insp => ({
      id: insp.id || insp.inspectionId || '',
      sourcePhotoCount: Number(insp.photoCount) || 0
    }))
    .filter(item => item.id);
  let cursor = 0;
  const worker = async () => {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      const cell = tableBody.querySelector(`[data-photo-count-cell="${window.CSS?.escape ? CSS.escape(item.id) : item.id.replace(/["\\]/g, '\\$&')}"]`);
      const row = cell?.closest('tr');
      if (!cell) continue;
      try {
        const workerCount = await loadWorkerPhotoCount(item.id);
        if (workerCount > item.sourcePhotoCount) {
          cell.innerHTML = photoCountListHTML(item.sourcePhotoCount, 'recovered', workerCount);
          row?.classList.add('list-row-photo-recovered');
        } else if (workerCount === item.sourcePhotoCount && workerCount > 0) {
          cell.innerHTML = photoCountListHTML(item.sourcePhotoCount, 'matched', workerCount);
          row?.classList.remove('list-row-photo-recovered');
        } else if (item.sourcePhotoCount > 0 && workerCount === 0) {
          cell.innerHTML = photoCountListHTML(item.sourcePhotoCount, 'service-empty', workerCount);
          row?.classList.add('list-row-photo-warning');
        } else {
          cell.innerHTML = photoCountListHTML(item.sourcePhotoCount, 'source', workerCount);
          row?.classList.remove('list-row-photo-recovered', 'list-row-photo-warning');
        }
      } catch (err) {
        cell.innerHTML = photoCountListHTML(item.sourcePhotoCount, 'failed');
        row?.classList.add('list-row-photo-warning');
      }
    }
  };
  const workers = Array.from({ length: Math.min(4, queue.length) }, worker);
  await Promise.allSettled(workers);
}

async function loadStaticInspectionFallback(id) {
  const staticResp = await fetch(`./api/inspections/${id}.json?t=` + Date.now());
  if (!staticResp.ok) throw new Error(`Static inspection unavailable: ${staticResp.status}`);
  const staticData = await staticResp.json();
  return staticData.inspection || staticData;
}

/* ============================================================
   REVIEW PAGE — BOOTSTRAP
   ============================================================ */

async function loadInspection() {
  _currentPage = 'review';
  const { id, token } = getURLParams();

  let insp;
  let cloudReview = null;
  let cloudFields = null;
  let localPreviewStaticInspection = null;
  const aggregateMeta = {
    sourcePath: '',
    sourceError: '',
    usedReviewStorageSource: false,
    usedLegacyStaticFallback: false,
    reviewStorageLoaded: false,
    reviewStorageError: '',
    reviewStorageRecoveryAvailable: false,
    autoRecoverySaved: false,
    autoRecoveryError: ''
  };
  if (IS_DEMO) {
    insp = JSON.parse(JSON.stringify(MOCK_INSPECTION));
    aggregateMeta.sourcePath = 'demo';
    const bar = qs('#demo-bar');
    if (bar) bar.classList.remove('hidden');
  } else {
    if (!id || !token) {
      showToast('Missing inspection ID or token', 'error');
      return;
    }

    if (IS_LOCAL_PREVIEW) {
      try {
        localPreviewStaticInspection = await loadStaticInspectionFallback(id);
      } catch (localErr) {
        aggregateMeta.sourceError = localErr?.message || 'Local static preview unavailable';
      }
    }

    if (localPreviewStaticInspection) {
      aggregateMeta.reviewStorageError = 'Skipped in local preview fixture mode';
    } else {
      try {
        cloudReview = await loadCloudReview(id);
        cloudFields = cloudReview.fieldData && typeof cloudReview.fieldData === 'object'
          ? cloudReview.fieldData
          : {};
        aggregateMeta.reviewStorageLoaded = true;
        aggregateMeta.reviewStorageRecoveryAvailable = Boolean(getInspectionRecoveryFromReviewFields(cloudFields));
      } catch (reviewErr) {
        aggregateMeta.reviewStorageError = reviewErr?.message || 'Review storage unavailable';
        console.warn('Cloud review recovery unavailable:', reviewErr);
      }
    }

    try {
      try {
        if (localPreviewStaticInspection) {
          insp = clonePlainObject(localPreviewStaticInspection);
          aggregateMeta.sourcePath = LEGACY_STATIC_FALLBACK_INSPECTION_IDS.has(id)
            ? 'local-static-safety'
            : 'local-static-preview';
          aggregateMeta.usedLegacyStaticFallback = LEGACY_STATIC_FALLBACK_INSPECTION_IDS.has(id);
        }
        if (!insp) {
          const liveData = await apiFetch(
            { action: 'get', id, token },
            'GET',
            null,
            { timeoutMs: IS_LOCAL_PREVIEW ? 4000 : API_FETCH_TIMEOUT_MS }
          );
          insp = liveData.inspection || liveData;
          if (!insp || !insp.inspectionId) throw new Error('Live inspection unavailable');
          aggregateMeta.sourcePath = 'apps-script-detail';
        }
      } catch (apiErr) {
        try {
          aggregateMeta.sourceError = apiErr?.message || 'Apps Script detail unavailable';
          const recovery = getInspectionRecoveryFromReviewFields(cloudFields);
          if (recovery) {
            insp = clonePlainObject(recovery);
            aggregateMeta.sourcePath = 'review-storage-recovery';
            aggregateMeta.usedReviewStorageSource = true;
          } else {
            insp = await loadStaticInspectionFallback(id);
            aggregateMeta.sourcePath = LEGACY_STATIC_FALLBACK_INSPECTION_IDS.has(id)
              ? 'legacy-static-safety'
              : 'static-json-fallback';
            aggregateMeta.usedLegacyStaticFallback = true;
          }
        } catch (fallbackErr) {
          throw apiErr || fallbackErr;
        }
      }
    } catch (err) {
      showToast(`Failed to load inspection: ${err.message}`, 'error');
      return;
    }
  }

  // Field-active inspections can contain multiple nested checkpoints. Merge
  // every checkpoint instead of selecting one partial layer, so a later phone
  // recovery save cannot hide previously completed steps from the portal.
  insp = mergeInspectionCheckpoints(insp);
  _reviewDataHealth = createReviewDataHealthSnapshot(insp);
  Object.assign(_reviewDataHealth, aggregateMeta);

  if (!IS_DEMO && id) {
    await ensureReviewStorageSourceSnapshot(id, insp, _reviewDataHealth);
  }

  // Reviewer edits are persisted independently of Apps Script so they survive
  // device changes even when Google's web-app POST redirect drops the body.
  if (!IS_DEMO && id && cloudFields) {
    const inspectionRecovery = getInspectionRecoveryFromReviewFields(cloudFields);
    if (inspectionRecovery) {
      // Keep the preserved full checkpoint underneath the current live
      // summary. Live values win, while missing steps/findings are restored.
      if (_reviewDataHealth) {
        _reviewDataHealth.recoveryApplied = true;
        _reviewDataHealth.recoveryRooms = countInspectionArray(inspectionRecovery.rooms);
        _reviewDataHealth.recoveryFindings = countInspectionArray(inspectionRecovery.findings);
      }
      insp = mergeCheckpointValue(clonePlainObject(inspectionRecovery), insp);
    }

    // The recovery payload is inspection source data, not a reviewer field.
    // Do not copy it into reviewedData or render it as editable report data.
    const reviewFields = stripInspectionRecoveryFromReviewFields(cloudFields);
    insp.reviewedData = mergeReviewData(insp.reviewedData || {}, reviewFields);
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

  // Apps Script inspection rows can lag behind successfully uploaded photo
  // metadata. Merge the Worker/Supabase photo list so a ready inspection never
  // renders as an empty photo library.
  if (!IS_DEMO && id) {
    try {
      const workerPhotos = await loadWorkerPhotos(id);
      if (_reviewDataHealth) _reviewDataHealth.workerPhotos = workerPhotos.length;
      if (workerPhotos.length) insp.photos = (Array.isArray(insp.photos) ? insp.photos : []).concat(workerPhotos);
    } catch (photoErr) {
      if (_reviewDataHealth) _reviewDataHealth.workerPhotoError = photoErr?.message || 'Photo recovery unavailable';
      console.warn('Direct photo recovery unavailable:', photoErr);
    }
  }

  if (!IS_DEMO && id) {
    try {
      const workerStatus = await loadWorkerInspectionStatus(id, insp);
      if (_reviewDataHealth) {
        _reviewDataHealth.workerStatusLoaded = true;
        _reviewDataHealth.workerStatus = workerStatus;
      }
    } catch (statusErr) {
      if (_reviewDataHealth) {
        _reviewDataHealth.workerStatusError = statusErr?.message || 'Inspection status unavailable';
      }
      console.warn('Inspection status check unavailable:', statusErr);
    }
  }

  // Load any device-local recovery data and migrate the same older shape.
  if (!IS_DEMO && id) {
    try {
      const saved = JSON.parse(localStorage.getItem('inhaus_review_' + id) || '{}');
      stripLocalOnlySubmissionState(saved);
      ['summary', 'post'].forEach(group => {
        if (saved[group] && typeof saved[group] === 'object' && !Array.isArray(saved[group])) {
          Object.assign(saved, saved[group]);
          delete saved[group];
        }
      });
      if (Object.keys(saved).length > 0) {
        insp.reviewedData = mergeReviewData(insp.reviewedData || {}, sanitizeReviewActivityFieldData(saved));
      }
    } catch(e) {}
  }

  _inspection = normalizeInspectionForReview(insp);
  if (_reviewDataHealth) _reviewDataHealth.finalPhotos = countInspectionArray(_inspection.photos);
  renderReviewPage(insp);
  startReviewActivityTracking(_inspection);
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
    const reviewedStep = insp.reviewedData?.[stepId] || {};
    const inspectorNotes = Object.prototype.hasOwnProperty.call(reviewedStep, 'inspectorNotes')
      ? reviewedStep.inspectorNotes
      : step.notes;
    const aiSummary = Object.prototype.hasOwnProperty.call(reviewedStep, 'aiSummary')
      ? reviewedStep.aiSummary
      : step.aiSummary;
    const note     = String(inspectorNotes || aiSummary || '').trim();
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
        const thumb = el('div', {
          class: 'picker-thumb',
          style: `width:${sz}`,
          'data-photo-id': photo.photoId
        });
        if (photo.driveUrl) {
          thumb.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || pid, loading: 'lazy', style: `width:${sz};height:${sz}`, referrerpolicy: "no-referrer-when-downgrade" }));
        } else {
          thumb.appendChild(el('div', { class: 'picker-thumb-placeholder', style: `width:${sz};height:${sz}` }, (pid || '').slice(-4)));
        }
        if (photo.caption) {
          thumb.appendChild(el('div', { class: 'picker-thumb-caption', style: `max-width:${sz}` }, photo.caption));
        }
        const rm = el('button', {
          class: 'picker-rm',
          title: 'Remove from this section',
          'aria-label': 'Remove photo from this section only',
          type: 'button'
        }, '\u2715');
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
        const thumb = el('div', { class: 'picker-thumb', 'data-photo-id': photo.photoId });
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
  body.appendChild(buildPostSubheading('General Follow-Up Actions',
    'Use the Follow-Up fields inside each room for room-specific items. Add something here only when it applies to the inspection as a whole.',
    'finish-follow-ups'));
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
    'What you physically did on-site. Add another only when needed.',
    'finish-actions'));
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
    'Notable findings for the report. Start with one and add another only when needed.',
    'finish-observations'));

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
  syncAllPhotoRotations();
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

function photoReportSlotDefs() {
  return [
    ...Array.from({length:5}, (_,i) => ({ key: `followUp_${i+1}_photoIds`,    label: `Follow-up ${i+1}` })),
    ...Array.from({length:6}, (_,i) => ({ key: `actionTaken_${i+1}_photoIds`, label: `Action ${i+1}` })),
    ...Array.from({length:6}, (_,i) => ({ key: `obs_${i+1}_photoIds`,         label: `Obs ${i+1}` }))
  ];
}

function collectReportPhotoSlotMap(rd = {}) {
  const photoSlotMap = {};
  photoReportSlotDefs().forEach(({ key, label }) => {
    let ids = [];
    try { ids = JSON.parse(rd[key] || '[]'); } catch(e) {}
    ids.forEach(id => {
      if (!photoSlotMap[id]) photoSlotMap[id] = [];
      photoSlotMap[id].push(label);
    });
  });
  return photoSlotMap;
}

function photoIdentityCandidates(photo, index) {
  return [
    photo?.photoId,
    photo?.driveId,
    getDriveIdFromPhoto(photo),
    photo?.driveUrl,
    photo?.storagePath,
    photo?.storage_path,
    photo?.highResUrl,
    photo?.thumbnailUrl,
    normalizePhotoUrl(photo || {}),
    photo?.url,
    photo?.imageUrl,
    photo?.localUrl,
    photo ? photoKey(photo) : '',
    `photo-${index + 1}`
  ].filter(value => String(value || '').trim()).map(value => String(value));
}

function placementPhotoKey(photo, index) {
  return photoIdentityCandidates(photo, index)[0] || `photo-${index + 1}`;
}

function hasSpecificPlacementName(value) {
  const slug = slugifyRoomPart(value);
  if (!slug) return false;
  return ![
    'photo',
    'photos',
    'spare',
    'spare-photos',
    'unassigned',
    'not-assigned',
    'none',
    'n-a',
    'na',
    'unknown'
  ].includes(slug);
}

function parsePortalPhotoPlacement(value) {
  let placement = value;
  if (typeof placement === 'string') {
    try { placement = JSON.parse(placement); } catch(e) { placement = null; }
  }
  if (!placement || typeof placement !== 'object') return null;
  const roomName = String(placement.roomName || '').trim();
  const stepName = String(placement.stepName || '').trim();
  if (!hasSpecificPlacementName(roomName) && !hasSpecificPlacementName(stepName)) return null;
  return { roomName, stepName };
}

function getPortalPhotoPlacement(rd, photo, index) {
  for (const candidate of photoIdentityCandidates(photo, index)) {
    const reviewedPhoto = rd?.[`photo_${candidate}`];
    if (!reviewedPhoto || typeof reviewedPhoto !== 'object') continue;
    const placement = parsePortalPhotoPlacement(reviewedPhoto.placement);
    if (placement) return placement;
  }
  return null;
}

function collectPhotoPlacementState(insp = {}) {
  const photos = insp.photos || [];
  const rd = insp.reviewedData || {};
  const slotMap = collectReportPhotoSlotMap(rd);
  const slotIds = new Set(Object.keys(slotMap));
  const placedKeys = new Set();
  const portalPlacementKeys = new Set();
  const reportSlotKeys = new Set();
  const portalPlacementByKey = new Map();

  photos.forEach((photo, index) => {
    const key = placementPhotoKey(photo, index);
    const candidates = photoIdentityCandidates(photo, index);
    if (candidates.some(candidate => slotIds.has(candidate))) {
      placedKeys.add(key);
      reportSlotKeys.add(key);
    }
    const portalPlacement = getPortalPhotoPlacement(rd, photo, index);
    if (portalPlacement) {
      placedKeys.add(key);
      portalPlacementKeys.add(key);
      portalPlacementByKey.set(key, portalPlacement);
    }
  });

  return {
    total: photos.length,
    placedCount: Math.min(placedKeys.size, photos.length),
    placedKeys,
    portalPlacementKeys,
    portalPlacementByKey,
    reportSlotKeys,
    slotMap
  };
}

function renderPhotoLibrary(body, allPhotos, rd, insp) {
  if (!allPhotos || allPhotos.length === 0) return;

  const scoringInspection = { ...(insp || {}), photos: allPhotos, reviewedData: rd };
  const placementState = collectPhotoPlacementState(scoringInspection);
  const photoSlotMap = placementState.slotMap;
  const placed = allPhotos.filter((photo, index) => placementState.placedKeys.has(placementPhotoKey(photo, index)));
  const inReportSections = allPhotos.filter(p => photoSlotMap[p.photoId]);
  const unplaced = allPhotos.length - placed.length;

  const section = el('div', { class: 'photo-library-section' });

  // Header
  const hdr = el('div', { class: 'photo-library-header' });
  hdr.appendChild(el('div', { class: 'photo-library-title' }, '\uD83D\uDDBC\uFE0F Photo Library'));
  const summary = el('div', { class: 'photo-library-summary' });
  summary.appendChild(el('span', { class: 'lib-badge lib-badge-assigned' }, `${placed.length} portal placed`));
  if (inReportSections.length > 0) {
    summary.appendChild(el('span', { class: 'lib-badge lib-badge-assigned' }, `${inReportSections.length} in report sections`));
  }
  if (unplaced > 0) {
    summary.appendChild(el('span', { class: 'lib-badge lib-badge-unassigned' }, `${unplaced} not placed`));
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

  allPhotos.forEach((photo, index) => {
    const slots = photoSlotMap[photo.photoId] || [];
    const isInReportSection = slots.length > 0;
    const placementKey = placementPhotoKey(photo, index);
    const isPlaced = placementState.placedKeys.has(placementKey);
    const portalPlacement = placementState.portalPlacementByKey.get(placementKey);
    const placementLabel = [portalPlacement?.roomName, portalPlacement?.stepName]
      .filter(hasSpecificPlacementName)
      .join(' — ') || 'Portal placed';
    const card = el('div', {
      class: `lib-card${isPlaced ? ' lib-assigned' : ' lib-unassigned'}`,
      'data-photo-id': photo.photoId
    });

    // Photo thumbnail
    const imgWrap = el('div', { class: 'lib-img-wrap' });
    if (photo.driveUrl) {
      imgWrap.appendChild(el('img', { src: photo.driveUrl, alt: photo.caption || photo.photoId, loading: 'lazy', referrerpolicy: "no-referrer-when-downgrade" }));
      imgWrap.addEventListener('click', () => openPhotoModal(photo.driveUrl, photo.caption, photo.photoId));
    } else {
      imgWrap.appendChild(el('div', { class: 'lib-img-placeholder' }, (photo.photoId || '').slice(-4)));
    }
    // Status badge
    if (isInReportSection) {
      imgWrap.appendChild(el('div', { class: 'lib-slot-badge' }, slots.join(', ')));
    } else if (isPlaced) {
      imgWrap.appendChild(el('div', { class: 'lib-slot-badge' }, placementLabel));
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
    captionEl.addEventListener('blur', async () => {
      const newCaption = captionEl.value.trim();
      if (newCaption === String(photo.caption || '').trim()) return;
      await saveReviewedPhotoCaption(photo.photoId, newCaption);
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
      class: `lib-move-btn${isInReportSection ? '' : ' lib-move-btn-urgent'}`,
      type: 'button',
      id: `assign-badge-${photo.photoId}`
    }, isInReportSection ? `\uD83D\uDCCC ${slots.join(', ')}` : '+ Add to report section');
    moveBtn.className = `lib-move-btn photo-assign-badge${isInReportSection ? ' is-assigned' : ' not-assigned'}`;
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
    syncAllPhotoRotations();
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

function buildPostSubheading(title, subtitle, id = '') {
  const wrap = el('div', { class: 'post-subheading', ...(id ? { id } : {}) });
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

function dateInputValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getParticulateMatter(insp) {
  return insp?.particulateMatter ||
    insp?.stepData?.['property-details']?.particulateMatter ||
    '';
}

function completeDataLabel(key) {
  return String(key || '')
    .replace(/^_+/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function completeDataIsEmpty(value) {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function completeDataRows(value, prefix = '', rows = [], seen = new Set()) {
  if (value === undefined || value === null || seen.has(value)) return rows;
  if (value && typeof value === 'object') seen.add(value);

  if (Array.isArray(value)) {
    if (!value.length) return rows;
    if (value.some(item => item && typeof item === 'object' && item.photoId)) return rows;
    if (value.every(item => item === null || typeof item !== 'object')) {
      const selected = value.filter(item => item !== '' && item !== null && item !== undefined);
      if (selected.length) rows.push({ label: prefix, value: selected.join(', ') });
      return rows;
    }
    value.forEach((item, index) => {
      const itemName = item?.roomName || item?.name || item?.stepName || `Item ${index + 1}`;
      completeDataRows(item, prefix ? `${prefix} — ${itemName}` : itemName, rows, seen);
    });
    return rows;
  }

  if (typeof value !== 'object') {
    if (!completeDataIsEmpty(value)) {
      rows.push({ label: prefix, value: value === true ? 'Yes' : value === false ? 'No' : String(value) });
    }
    return rows;
  }

  const ignored = new Set([
    'dataUrl', 'imageData', 'thumbnailDataUrl', 'photos', 'sparePhotos',
    'findings', 'commentLibrary', 'auditTrail', 'photoTombstones', 'resumeData',
    'collaboration', 'roomRelationships', 'reviewedData', 'fieldUsageMetrics'
  ]);
  Object.entries(value).forEach(([key, child]) => {
    if (key.startsWith('_') || ignored.has(key) || completeDataIsEmpty(child)) return;
    const label = prefix ? `${prefix} — ${completeDataLabel(key)}` : completeDataLabel(key);
    completeDataRows(child, label, rows, seen);
  });
  return rows;
}

function renderCompleteDataGroup(title, value, open = false, options = {}) {
  const rows = completeDataRows(value);
  if (!rows.length) return null;
  const details = el('details', { class: 'complete-data-group', ...(open ? { open: '' } : {}) });
  const countLabel = options.countLabel ||
    `${rows.length} captured value${rows.length === 1 ? '' : 's'}`;
  details.appendChild(el('summary', {},
    el('span', {}, title),
    el('span', { class: 'complete-data-count' }, countLabel)
  ));
  if (options.note) {
    details.appendChild(el('div', { class: 'complete-data-note' }, options.note));
  }
  const grid = el('div', { class: 'complete-data-grid' });
  rows.forEach(row => {
    grid.appendChild(el('div', { class: 'complete-data-row' },
      el('div', { class: 'complete-data-label' }, row.label),
      el('div', { class: 'complete-data-value' }, row.value)
    ));
  });
  details.appendChild(grid);
  return details;
}

function findingDisplayFingerprint(finding) {
  const copy = { ...(finding || {}) };
  ['findingId', 'createdAt', 'updatedAt', 'createdBy', 'createdById', 'updatedBy', 'updatedById']
    .forEach(key => delete copy[key]);
  return JSON.stringify(copy);
}

function uniqueFindingsForDisplay(findings) {
  const seen = new Set();
  return (Array.isArray(findings) ? findings : []).filter(finding => {
    const fingerprint = findingDisplayFingerprint(finding);
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

function renderCompleteInspectionData(insp) {
  const body = qs('#complete-inspection-data');
  if (!body) return;
  body.innerHTML = '';

  const topLevelKeys = [
    'propertyAddress', 'clientName', 'inspectorName', 'inspectionDate', 'assessmentType',
    'numberOfLevels', 'numberOfBedrooms', 'numberOfBathrooms', 'residenceType', 'yearBuilt',
    'squareFootage', 'basement', 'carpetedRooms', 'fireplace', 'pets', 'smokingVaping',
    'stoveType', 'waterSource', 'waterSourceDescription', 'wifiNetwork', 'clientConcerns',
    'occupancyDuringInspection', 'weatherConditions', 'particulateMatter',
    'knownProblemAreas', 'windowsOpen'
  ];
  const property = Object.fromEntries(topLevelKeys.map(key => [
    key,
    key === 'particulateMatter' ? getParticulateMatter(insp) : insp[key]
  ]));
  const reservedTopLevel = new Set([
    ...topLevelKeys,
    'id', 'inspectionId', 'stepData', 'rooms', 'dynamicRooms', 'roomRelationships',
    'roomSummaries', 'findings', 'preAssessmentChecklist', 'arrivalSetup', 'deviceSetup',
    'exteriorAssessment', 'radonSetup', 'utilityRoom', 'wrapUp', 'customerDebrief',
    'postAssessment', 'photos', 'sparePhotos', 'photoTombstones', 'auditTrail',
    'commentLibrary', 'collaboration', 'reviewedData', 'resumeData', 'x-sync-secret',
    'sharedDriveFolderId', 'fieldUsageMetrics'
  ]);
  const supplemental = Object.fromEntries(Object.entries(insp).filter(([key, value]) =>
    !key.startsWith('_') && !reservedTopLevel.has(key) && !completeDataIsEmpty(value)
  ));
  const sourceFindings = Array.isArray(insp.findings) ? insp.findings : [];
  const displayFindings = uniqueFindingsForDisplay(sourceFindings);
  const exactDuplicateFindings = sourceFindings.length - displayFindings.length;
  const roomCount = Array.isArray(insp.rooms) ? insp.rooms.length : 0;
  const savedSteps = Object.keys(insp.stepData || {}).length;
  const roomValueCount = completeDataRows(insp.rooms).length;
  const stepValueCount = completeDataRows(insp.stepData).length;
  const uniquePhotoCount = new Set((Array.isArray(insp.photos) ? insp.photos : []).map(photoKey)).size;
  const groups = [
    ['Property & Assessment Conditions', property, true],
    ['Equipment & Pre-Assessment', insp.preAssessmentChecklist],
    ['Arrival & Site Setup', insp.arrivalSetup],
    ['Device Setup', insp.deviceSetup],
    ['Exterior Assessment', insp.exteriorAssessment],
    ['Radon Setup', insp.radonSetup],
    ['Rooms & Observations', insp.rooms, false, {
      countLabel: `${roomCount} room record${roomCount === 1 ? '' : 's'} · ${roomValueCount} captured values`,
      note: 'These are complete room records. Much of the same source data also appears in Step-by-Step below; that is repeated presentation, not additional rooms.'
    }],
    ['Utility, HVAC & Water Systems', insp.utilityRoom],
    ['Before Leaving', insp.wrapUp],
    ['Customer Debrief', insp.customerDebrief],
    ['Post Assessment', insp.postAssessment],
    ['Step-by-Step Captured Data', insp.stepData, false, {
      countLabel: `${savedSteps} saved steps · ${stepValueCount} captured values`,
      note: 'This is the diagnostic field-by-field checkpoint view. One saved step can contain many fields, and room steps repeat data summarized elsewhere on this page.'
    }],
    ['Dynamic Room Definitions', insp.dynamicRooms],
    ['Room Relationships', insp.roomRelationships],
    ['Room Summaries', insp.roomSummaries],
    ['Findings & Field Observations', displayFindings, false, {
      countLabel: `${displayFindings.length} unique findings · ${completeDataRows(displayFindings).length} raw fields`,
      note: `${sourceFindings.length} source finding records were preserved. ${exactDuplicateFindings} exact duplicate record${exactDuplicateFindings === 1 ? ' is' : 's are'} hidden in this view only; no source record was deleted.`
    }],
    ['Other Captured Inspection Data', supplemental]
  ];

  let renderedGroups = 0;
  groups.forEach(([title, value, open, options]) => {
    const group = renderCompleteDataGroup(title, value, open, options);
    if (group) {
      renderedGroups += 1;
      body.appendChild(group);
    }
  });

  if (!body.children.length) {
    body.appendChild(el('div', { class: 'empty-state' }, 'No inspector field data was returned for this inspection.'));
    return;
  }

  body.prepend(el('div', { class: 'complete-data-coverage' },
    el('strong', {}, 'Complete source checkpoint loaded'),
    el('span', {}, `${savedSteps} saved steps / ${stepValueCount} values · ${roomCount} rooms / ${roomValueCount} values · ${sourceFindings.length} findings (${displayFindings.length} unique) · ${uniquePhotoCount} photos · ${renderedGroups} data groups`)
  ));
}

function renderIntakeSummary(insp) {
  const body = qs('#intake-summary-body');
  if (!body) return;
  body.innerHTML = '';

  const utility = insp.stepData?.utility || insp.utilityRoom || {};
  const ventilation = utility.ventilationType || {};
  const ventilationLabels = {
    bathExhaust: 'Bathroom Exhaust Fan(s)',
    hrv: 'HRV',
    erv: 'ERV',
    ventNone: 'None',
    none: 'None',
    ventNotSure: 'Not sure',
    notSure: 'Not sure'
  };
  const ventilationValue = insp.ventilationReadable || insp.ventilation ||
    Object.entries(ventilation)
      .filter(([, selected]) => selected === true)
      .map(([key]) => ventilationLabels[key] || key)
      .join(', ');

  const locked = getServerSubmittedReviewState(insp).submitted || getServerSubmittedReviewState(insp).statusSubmitted;
  const items = [
    { label: 'Property', key: 'propertyAddress', value: insp.propertyAddress, wide: true },
    { label: 'Client', key: 'clientName', value: insp.clientName },
    { label: 'Inspector', key: 'inspectorName', value: insp.inspectorName, readonly: true },
    { label: 'Date', key: 'inspectionDate', value: insp.inspectionDate, type: 'date' },
    { label: 'Type', key: 'residenceType', value: insp.residenceType },
    { label: 'Year Built', key: 'yearBuilt', value: insp.yearBuilt },
    { label: 'Sq Ft', key: 'squareFootage', value: insp.squareFootage },
    { label: 'Bedrooms', key: 'numberOfBedrooms', value: insp.numberOfBedrooms },
    { label: 'Bathrooms', key: 'numberOfBathrooms', value: insp.numberOfBathrooms },
    { label: 'Levels', key: 'numberOfLevels', value: insp.numberOfLevels },
    { label: 'Basement', key: 'basement', value: insp.basement },
    { label: 'Water Source', key: 'waterSource', value: insp.waterSource },
    { label: 'Filtration', key: 'waterFiltration', value: insp.waterFiltration },
    { label: 'Softener', key: 'waterSoftener', value: insp.waterSoftener },
    { label: 'Carpeted Rooms', key: 'carpetedRooms', value: insp.carpetedRooms },
    { label: 'Windows Open', key: 'windowsOpen', value: insp.windowsOpen },
    { label: 'Heating', key: 'heating', value: utility.heatingType || insp.heating },
    { label: 'AC', key: 'ac', value: utility.acType || insp.ac },
    { label: 'Ventilation', key: 'ventilationReadable', value: ventilationValue },
    { label: 'Weather', key: 'weatherConditions', value: insp.weatherConditions },
    { label: 'Particulate Matter', key: 'particulateMatter', value: getParticulateMatter(insp), wide: true },
    { label: 'Occupancy', key: 'occupancyDuringInspection', value: insp.occupancyDuringInspection },
    { label: 'Client Concerns', key: 'clientConcerns', value: insp.clientConcerns, wide: true, multiline: true },
    { label: 'Known Problem Areas', key: 'knownProblemAreas', value: insp.knownProblemAreas, wide: true, multiline: true }
  ];

  items.forEach(item => {
    const fieldLocked = locked || item.readonly;
    const node = el('div', { class: `intake-summary-item editable${item.wide ? ' wide' : ''}` });
    node.appendChild(el('label', { class: 'intake-summary-label', for: `summary-${item.key}` }, item.label));
    const value = item.type === 'date'
      ? dateInputValue(item.value)
      : sourceDisplayValue(item.value);
    const input = item.multiline
      ? el('textarea', {
          id: `summary-${item.key}`,
          class: 'intake-summary-input',
          rows: '2',
          'data-step': 'summary',
          'data-field': item.key,
          ...(fieldLocked ? { readonly: '' } : {})
        })
      : el('input', {
          id: `summary-${item.key}`,
          class: 'intake-summary-input',
          type: item.type || 'text',
          'data-step': 'summary',
          'data-field': item.key,
          ...(fieldLocked ? { readonly: '' } : {})
        });
    input.value = value === 'Not recorded' ? '' : value;
    node.appendChild(input);
    node.appendChild(el('div', { class: 'field-original' }));
    if (!fieldLocked) {
      input.addEventListener('input', () => {
        if (!_inspection) return;
        _inspection[item.key] = input.value;
        if (item.key === 'propertyAddress') {
          const stickyAddress = qs('#sticky-address');
          if (stickyAddress) stickyAddress.textContent = input.value || '—';
        }
        if (item.key === 'inspectionDate') {
          const stickyDate = qs('#sticky-date');
          if (stickyDate) stickyDate.textContent = formatDate(input.value);
        }
      });
      attachFieldSave(input, 'summary', item.key);
    }
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

  const submittedReview = getServerSubmittedReviewState(insp);
  const isSubmitted = submittedReview.submitted || submittedReview.statusSubmitted;

  // Submitted banner
  if (isSubmitted) {
    const banner = qs('#submitted-banner');
    if (banner) {
      banner.classList.remove('hidden');
      const bannerText = qs('#submitted-banner-text');
      if (bannerText) bannerText.textContent = `Submitted ${formatDateTime(submittedReview.submittedAt || '')} — editing is locked.`;
    }
  }

  renderReviewDataHealthBanner(insp);
  renderSummarySection(insp, isSubmitted);
  renderRoomsSection(insp, isSubmitted);
  renderWaterFindingsSection(insp, isSubmitted);
  renderKitchenInspectionSection(insp, isSubmitted);
  renderTestsSection(insp, isSubmitted);
  renderBeforeLeavingSection(insp, isSubmitted);
  try { renderPostContentSection(insp, isSubmitted); } catch(e) { console.error('renderPostContentSection failed:', e); }
  try { renderPhotosSection(insp, isSubmitted); } catch(e) { console.error('renderPhotosSection failed:', e); }
  // Keep photos section expanded by default
  const photosCard = qs('#photos-card');
  if (photosCard) photosCard.classList.remove('collapsed');
  try { renderSubmitSection(insp, isSubmitted); } catch(e) { console.error('renderSubmitSection failed:', e); }
  syncAllPhotoRotations();
  checkGate();
}

function renderReviewDataHealthBanner(insp) {
  const banner = qs('#data-health-banner');
  if (!banner) return;
  const health = _reviewDataHealth || {};
  const notes = [];
  if (health.usedReviewStorageSource) {
    notes.push('Loaded the source inspection from review storage recovery because Apps Script detail was unavailable.');
  }
  if (health.usedLegacyStaticFallback) {
    notes.push(LEGACY_STATIC_FALLBACK_INSPECTION_IDS.has(insp.inspectionId || insp.id)
      ? 'Using protected legacy static fallback for this current report.'
      : 'Using static JSON fallback; this is not approved for net-new inspections.');
  }
  if (health.autoRecoverySaved) {
    notes.push('Source inspection snapshot was saved to review storage for recovery.');
  }
  if (health.autoRecoveryError) {
    notes.push(`Source snapshot save failed: ${health.autoRecoveryError}.`);
  }
  if (health.reviewStorageError) {
    notes.push(`Review storage check unavailable: ${health.reviewStorageError}.`);
  }
  const protectedLegacy = LEGACY_STATIC_FALLBACK_INSPECTION_IDS.has(insp.inspectionId || insp.id);
  if (!IS_DEMO && !health.reviewStorageRecoveryAvailable && !protectedLegacy) {
    notes.push('Source inspection snapshot is not saved in review storage; this handoff is not recoverable yet.');
  }
  if (health.sourceError && health.sourcePath !== 'apps-script-detail') {
    notes.push(`Primary detail source unavailable: ${health.sourceError}.`);
  }
  const baseLookedThin = (health.baseRooms || 0) === 0 ||
    ((health.basePhotos || 0) === 0 && (health.workerPhotos || 0) > 0);
  if (health.recoveryApplied && baseLookedThin) {
    notes.push(`Review cloud restored ${health.recoveryRooms || countInspectionArray(insp.rooms)} rooms and ${health.recoveryFindings || countInspectionArray(insp.findings)} findings.`);
  }
  if ((health.workerPhotos || 0) > (health.basePhotos || 0)) {
    notes.push(`Photo service loaded ${health.workerPhotos} photos; base row listed ${health.basePhotos || 0}.`);
  }
  if (health.workerPhotoError) {
    notes.push(`Photo service check unavailable: ${health.workerPhotoError}.`);
  }
  if (health.workerStatusError) {
    notes.push(`Inspection status receipt unavailable: ${health.workerStatusError}.`);
  }
  const sourceCount = Math.max(Number(health.basePhotoCount) || 0, Number(health.basePhotos) || 0);
  const workerCount = Number(health.workerPhotos) || 0;
  const finalCount = Number(health.finalPhotos) || countInspectionArray(insp.photos);
  if (sourceCount && workerCount && sourceCount !== workerCount) {
    notes.push(`Photo count mismatch: source record says ${sourceCount}, photo service has ${workerCount}, portal is showing ${finalCount}.`);
  }
  const submittedState = getServerSubmittedReviewState(insp);
  const baseLooksSubmitted = /submitted to tanner|report complete/i.test(health.baseStatus || '') ||
    Boolean(health.baseSubmittedAt);
  if (baseLooksSubmitted && !submittedState.submitted) {
    notes.push('Submission state mismatch: source record looks submitted, but review storage does not have a confirmed submission receipt.');
  }
  if (submittedState.submitted && !baseLooksSubmitted) {
    notes.push('Submission receipt recovered from review storage; source list status may not have caught up yet.');
  }
  if (!notes.length) {
    banner.classList.add('hidden');
    banner.replaceChildren();
    return;
  }
  banner.classList.remove('hidden');
  const hasMismatch = notes.some(note => /mismatch|unavailable|failed|not have a confirmed/i.test(note));
  banner.classList.toggle('warning', hasMismatch);
  banner.replaceChildren(
    el('div', { class: 'data-health-icon' }, hasMismatch ? '!' : 'i'),
    el('div', { class: 'data-health-copy' },
      el('strong', {}, hasMismatch ? 'Handoff Consistency Check' : 'Data Source Check'),
      el('span', {}, notes.join(' '))
    )
  );
}

function firstNonEmptyValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (String(value).trim() !== '') return value;
  }
  return '';
}

function readObjectPath(source, path) {
  if (!source || typeof source !== 'object') return undefined;
  return String(path || '').split('.').reduce((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return current[key];
  }, source);
}

function firstObjectPathValue(source, paths = []) {
  for (const path of paths) {
    const value = readObjectPath(source, path);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function numberFromValue(value) {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatHandoffRunnerDetail({ attemptCount, lastRunAt, nextRunAt, pendingPhotoCount } = {}) {
  const pieces = [];
  const attempts = Number(attemptCount) || 0;
  const pending = Number(pendingPhotoCount) || 0;
  if (attempts) pieces.push(`attempt ${attempts}`);
  if (lastRunAt) pieces.push(`last ${formatDateTime(lastRunAt)}`);
  if (nextRunAt) pieces.push(`retry ${formatDateTime(nextRunAt)}`);
  if (pending) pieces.push(`${pending} photo${pending === 1 ? '' : 's'} pending`);
  return pieces.join(' · ');
}

function driveFolderUrlFromId(id) {
  const clean = String(id || '').trim();
  return clean ? `https://drive.google.com/drive/folders/${encodeURIComponent(clean)}` : '';
}

function spreadsheetUrlFromId(id) {
  const clean = String(id || '').trim();
  return clean ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(clean)}/edit` : '';
}

function findFirstStringMatching(value, matcher, depth = 0, seen = new Set()) {
  if (depth > 5 || value === undefined || value === null) return '';
  if (typeof value === 'string') return matcher(value) ? value : '';
  if (typeof value !== 'object') return '';
  if (seen.has(value)) return '';
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 40)) {
      const found = findFirstStringMatching(item, matcher, depth + 1, seen);
      if (found) return found;
    }
    return '';
  }
  for (const [key, child] of Object.entries(value)) {
    if (/dataUrl|imageData|thumbnailDataUrl/i.test(key)) continue;
    const found = findFirstStringMatching(child, matcher, depth + 1, seen);
    if (found) return found;
  }
  return '';
}

function buildTannerPackageState(insp = {}) {
  const reviewed = insp.reviewedData || {};
  const health = _reviewDataHealth || {};
  const workerStatus = health.workerStatus && typeof health.workerStatus === 'object'
    ? health.workerStatus
    : {};
  const submission = getServerSubmittedReviewState(insp).submission || {};
  const system = reviewed.system || insp.system || {};
  const handoff = firstNonEmptyValue(
    submission.reviewPortalData,
    reviewed.reviewPortalData,
    insp.reviewPortalData,
    system.reviewPortalData,
    system.tannerHandoff
  );
  const handoffObj = handoff && typeof handoff === 'object' ? handoff : {};
  const isTestTraining = isTestTrainingInspectionRecord(insp, handoffObj);
  const protectedLegacy = LEGACY_STATIC_FALLBACK_INSPECTION_IDS.has(insp.inspectionId || insp.id);
  const sourceSnapshotReady = Boolean(
    IS_DEMO ||
    health.reviewStorageRecoveryAvailable ||
    health.sourcePath === 'review-storage-recovery' ||
    (protectedLegacy && health.usedLegacyStaticFallback)
  );
  const reviewStorageReady = Boolean(IS_DEMO || health.reviewStorageLoaded);
  const workerStatusText = firstObjectPathValue(workerStatus, [
    'handoffStatus',
    'handoff.status',
    'tannerHandoff.status',
    'submission.status',
    'status'
  ]);
  const workerStatusExpectedPhotos = numberFromValue(firstObjectPathValue(workerStatus, [
    'expectedPhotos',
    'photos.expectedCount',
    'photos.count',
    'counts.expectedPhotos'
  ]));
  const workerStatusStoredPhotos = numberFromValue(firstObjectPathValue(workerStatus, [
    'storedPhotos',
    'databasePhotos',
    'photos.storedCount',
    'photos.databaseCount',
    'counts.storedPhotos'
  ]));
  const workerStatusMirroredPhotos = numberFromValue(firstObjectPathValue(workerStatus, [
    'mirroredPhotos',
    'photos.driveUrlCount',
    'photos.mirroredCount',
    'counts.mirroredPhotos'
  ]));
  const workerMissingPhotoCount = Array.isArray(workerStatus.missingPhotoIds)
    ? workerStatus.missingPhotoIds.length
    : 0;
  const workerMissingMirrorCount = Array.isArray(workerStatus.missingMirrorPhotoIds)
    ? workerStatus.missingMirrorPhotoIds.length
    : 0;
  const workerStatusComplete = Boolean(IS_DEMO || (
    health.workerStatusLoaded &&
    workerStatus.complete !== false &&
    workerMissingPhotoCount === 0
  ));
  const workerStatusDetail = (() => {
    if (!health.workerStatusLoaded) return health.workerStatusError || 'Inspection status not confirmed';
    const expected = workerStatusExpectedPhotos || 0;
    const stored = workerStatusStoredPhotos || 0;
    if (expected || stored) {
      const pieces = [`${stored}/${expected || stored} stored`];
      if (workerStatusMirroredPhotos || workerMissingMirrorCount) {
        pieces.push(`${workerStatusMirroredPhotos} mirrored`);
      }
      if (workerMissingPhotoCount) pieces.push(`${workerMissingPhotoCount} missing`);
      if (workerMissingMirrorCount) pieces.push(`${workerMissingMirrorCount} mirror pending`);
      return pieces.join(' · ');
    }
    return workerStatusText ? String(workerStatusText) : 'Status endpoint responded';
  })();

  const folderId = firstNonEmptyValue(
    insp.folderId,
    insp.assessmentFolderId,
    reviewed.folderId,
    reviewed.assessmentFolderId,
    handoffObj.folderId,
    handoffObj.assessmentFolderId,
    firstObjectPathValue(workerStatus, [
      'folderId',
      'assessmentFolderId',
      'assessment_folder_id',
      'folder.id',
      'assessmentFolder.id',
      'handoff.folderId',
      'handoff.assessmentFolderId',
      'tannerHandoff.folderId'
    ])
  );
  let folderUrl = firstNonEmptyValue(
    insp.folderUrl,
    insp.assessmentFolderUrl,
    reviewed.folderUrl,
    reviewed.assessmentFolderUrl,
    handoffObj.folderUrl,
    handoffObj.assessmentFolderUrl,
    firstObjectPathValue(workerStatus, [
      'folderUrl',
      'assessmentFolderUrl',
      'assessment_folder_url',
      'folder.url',
      'assessmentFolder.url',
      'handoff.folderUrl',
      'handoff.assessmentFolderUrl',
      'tannerHandoff.folderUrl'
    ]),
    folderId ? driveFolderUrlFromId(folderId) : ''
  );
  if (!folderUrl) {
    folderUrl = findFirstStringMatching(insp, value => /drive\.google\.com\/drive\/folders\//i.test(value)) ||
      findFirstStringMatching(workerStatus, value => /drive\.google\.com\/drive\/folders\//i.test(value));
  }

  const spreadsheetId = firstNonEmptyValue(
    insp.spreadsheetId,
    insp.reviewPortalDataSpreadsheetId,
    reviewed.spreadsheetId,
    reviewed.reviewPortalDataSpreadsheetId,
    handoffObj.spreadsheetId,
    handoffObj.reviewPortalDataSpreadsheetId,
    firstObjectPathValue(workerStatus, [
      'spreadsheetId',
      'reviewPortalDataSpreadsheetId',
      'spreadsheet.id',
      'reviewPortalData.id',
      'handoff.spreadsheetId',
      'handoff.reviewPortalDataSpreadsheetId',
      'tannerHandoff.spreadsheetId'
    ])
  );
  let spreadsheetUrl = firstNonEmptyValue(
    insp.spreadsheetUrl,
    insp.reviewPortalDataUrl,
    insp.reviewPortalDataSpreadsheetUrl,
    reviewed.spreadsheetUrl,
    reviewed.reviewPortalDataUrl,
    reviewed.reviewPortalDataSpreadsheetUrl,
    handoffObj.spreadsheetUrl,
    handoffObj.reviewPortalDataUrl,
    handoffObj.reviewPortalDataSpreadsheetUrl,
    firstObjectPathValue(workerStatus, [
      'spreadsheetUrl',
      'reviewPortalDataUrl',
      'reviewPortalDataSpreadsheetUrl',
      'spreadsheet.url',
      'reviewPortalData.url',
      'handoff.spreadsheetUrl',
      'handoff.reviewPortalDataUrl',
      'tannerHandoff.spreadsheetUrl'
    ]),
    spreadsheetId ? spreadsheetUrlFromId(spreadsheetId) : ''
  );
  if (!spreadsheetUrl) {
    spreadsheetUrl = findFirstStringMatching(insp, value => /docs\.google\.com\/spreadsheets\//i.test(value)) ||
      findFirstStringMatching(workerStatus, value => /docs\.google\.com\/spreadsheets\//i.test(value));
  }

  const rawBackupUrl = firstNonEmptyValue(
    insp.rawReviewDataUrl,
    reviewed.rawReviewDataUrl,
    reviewed.rawReviewDataJsonUrl,
    handoffObj.rawReviewDataUrl,
    handoffObj.rawReviewDataJsonUrl,
    handoffObj.rawJsonUrl,
    firstObjectPathValue(workerStatus, [
      'rawReviewDataUrl',
      'rawReviewDataJsonUrl',
      'rawJsonUrl',
      'raw.url',
      'handoff.rawReviewDataUrl',
      'handoff.rawJsonUrl',
      'tannerHandoff.rawJsonUrl'
    ])
  );
  const photosFolderUrl = firstNonEmptyValue(
    insp.photosFolderUrl,
    reviewed.photosFolderUrl,
    handoffObj.photosFolderUrl,
    handoffObj.technicianPhotosFolderUrl,
    firstObjectPathValue(workerStatus, [
      'photosFolderUrl',
      'technicianPhotosFolderUrl',
      'handoff.photosFolderUrl',
      'handoff.technicianPhotosFolderUrl',
      'tannerHandoff.photosFolderUrl'
    ])
  );
  const trackerValue = firstNonEmptyValue(
    insp.trackerUrl,
    insp.trackerRowUrl,
    insp.trackerRow,
    reviewed.trackerUrl,
    reviewed.trackerRowUrl,
    reviewed.trackerRow,
    handoffObj.trackerUrl,
    handoffObj.trackerRowUrl,
    handoffObj.trackerRow,
    firstObjectPathValue(workerStatus, [
      'trackerUrl',
      'trackerRowUrl',
      'trackerRow',
      'tracker.url',
      'tracker.row',
      'handoff.trackerUrl',
      'handoff.trackerRowUrl',
      'tannerHandoff.trackerUrl'
    ])
  );
  const trackerSkipped = isTestTraining && normalizedHandoffStatus(handoffObj.trackerStatus || '') === 'skipped-test-training';
  const handoffStatus = String(firstNonEmptyValue(
    insp.handoffStatus,
    reviewed.handoffStatus,
    handoffObj.status,
    handoffObj.handoffStatus,
    firstObjectPathValue(workerStatus, [
      'handoff.status',
      'tannerHandoff.status'
    ])
  ) || '').trim();
  const handoffReceiptMissing = Object.keys(handoffObj).length ? getMissingHandoffReceiptFields(handoffObj, {
    expectedPhotoCount: Number(insp.photoCount || (Array.isArray(insp.photos) ? insp.photos.length : 0) || 0),
    expectedRoomCount: Array.isArray(insp.rooms) ? insp.rooms.length : 0
  }) : [];
  const handoffReady = handoffReceiptMissing.length
    ? false
    : (handoffStatus
      ? isReadyHandoffStatus(handoffStatus)
      : Boolean(folderUrl && spreadsheetUrl && rawBackupUrl && (trackerValue || trackerSkipped)));
  const handoffError = firstNonEmptyValue(
    insp.lastHandoffError,
    reviewed.lastHandoffError,
    handoffObj.error,
    firstObjectPathValue(workerStatus, [
      'handoff.error',
      'tannerHandoff.error'
    ])
  );
  const handoffAttemptCount = numberFromValue(firstNonEmptyValue(
    insp.handoffAttemptCount,
    reviewed.handoffAttemptCount,
    handoffObj.attemptCount,
    firstObjectPathValue(workerStatus, [
      'handoff.attemptCount',
      'tannerHandoff.attemptCount',
      'attemptCount'
    ])
  ));
  const handoffLastRunAt = firstNonEmptyValue(
    insp.handoffLastRunAt,
    reviewed.handoffLastRunAt,
    handoffObj.lastRunAt,
    firstObjectPathValue(workerStatus, [
      'handoff.lastRunAt',
      'tannerHandoff.lastRunAt',
      'lastRunAt'
    ])
  );
  const handoffNextRunAt = firstNonEmptyValue(
    insp.handoffNextRunAt,
    reviewed.handoffNextRunAt,
    handoffObj.nextRunAt,
    firstObjectPathValue(workerStatus, [
      'handoff.nextRunAt',
      'tannerHandoff.nextRunAt',
      'nextRunAt'
    ])
  );
  const handoffPendingPhotoCount = numberFromValue(firstNonEmptyValue(
    handoffObj.photoFolderPendingCount,
    handoffObj.counts?.photoFolderPendingCount,
    firstObjectPathValue(workerStatus, [
      'handoff.photoFolderPendingCount',
      'handoff.counts.photoFolderPendingCount',
      'tannerHandoff.photoFolderPendingCount'
    ])
  ));
  const handoffRunnerDetail = formatHandoffRunnerDetail({
    attemptCount: handoffAttemptCount,
    lastRunAt: handoffLastRunAt,
    nextRunAt: handoffNextRunAt,
    pendingPhotoCount: handoffPendingPhotoCount
  });

  const photoCount = countInspectionArray(insp.photos);
  const statusPhotoCount = numberFromValue(firstObjectPathValue(workerStatus, [
    'photoCount',
    'photosCount',
    'photo_count',
    'storedPhotos',
    'databasePhotos',
    'counts.photos',
    'counts.workerPhotos',
    'photos.count',
    'summary.photoCount'
  ]));
  const workerPhotoCount = Math.max(
    Number(health.workerPhotos) || 0,
    statusPhotoCount,
    workerStatusStoredPhotos
  );
  const expectedPhotoCount = Math.max(
    photoCount,
    Number(health.basePhotoCount) || 0,
    Number(health.basePhotos) || 0,
    workerStatusExpectedPhotos
  );
  const roomCount = buildReviewRoomRecords(insp).length;
  const reportNotes = firstNonEmptyValue(
    insp.reportBuilderNotes,
    reviewed.reportBuilderNotes,
    reviewed.summary?.reportBuilderNotes
  );
  const sampleRecords = collectTestSampleRecords(insp);
  const activeSamples = sampleRecords.filter(record => !/not conducted|not requested|not recorded/i.test(record.status || ''));

  return {
    readyCount: 0,
    items: [
      {
        label: 'Source snapshot',
        ok: sourceSnapshotReady,
        detail: sourceSnapshotReady
          ? (health.sourcePath === 'review-storage-recovery' ? 'Loaded from review storage' : 'Recoverable source saved')
          : 'Needs source snapshot in review storage'
      },
      {
        label: 'Review storage',
        ok: reviewStorageReady,
        detail: reviewStorageReady ? 'Review fields connected' : (health.reviewStorageError || 'Review storage not confirmed')
      },
      {
        label: 'Photo service',
        ok: expectedPhotoCount === 0 || workerPhotoCount > 0,
        detail: expectedPhotoCount === 0
          ? 'No photos expected'
          : `${workerPhotoCount}/${expectedPhotoCount} photo${expectedPhotoCount === 1 ? '' : 's'} confirmed`
      },
      {
        label: 'Worker status receipt',
        ok: workerStatusComplete,
        detail: workerStatusDetail
      },
      {
        label: 'Tanner handoff receipt',
        ok: handoffReady,
        detail: handoffStatus
          ? [handoffError ? `${handoffStatus}: ${handoffError}` : handoffStatus, handoffRunnerDetail].filter(Boolean).join(' · ')
          : (handoffReady
            ? ['Package receipt linked', handoffRunnerDetail].filter(Boolean).join(' · ')
            : (handoffRunnerDetail || 'No completed handoff receipt yet'))
      },
      {
        label: 'Assessment folder',
        ok: Boolean(folderUrl || folderId),
        detail: folderUrl || folderId ? 'Drive folder linked' : 'Needs Drive folder link',
        href: folderUrl
      },
      {
        label: 'Review portal data sheet',
        ok: Boolean(spreadsheetUrl || spreadsheetId),
        detail: spreadsheetUrl || spreadsheetId ? 'Spreadsheet linked' : 'Needs spreadsheet link',
        href: spreadsheetUrl
      },
      {
        label: 'Photos folder',
        ok: Boolean(photosFolderUrl) || photoCount > 0,
        detail: photosFolderUrl
          ? 'Photos folder linked'
          : `${photoCount} photo${photoCount === 1 ? '' : 's'} loaded`,
        href: photosFolderUrl || folderUrl
      },
      {
        label: 'Room data',
        ok: roomCount > 0,
        detail: `${roomCount} room${roomCount === 1 ? '' : 's'} loaded`
      },
      {
        label: 'Tests and sample IDs',
        ok: activeSamples.length > 0,
        detail: activeSamples.length
          ? `${activeSamples.length} active test/sample record${activeSamples.length === 1 ? '' : 's'}`
          : 'No active test/sample records found'
      },
      {
        label: 'Report builder notes',
        ok: Boolean(String(reportNotes || '').trim()),
        detail: reportNotes ? 'Report builder notes entered' : 'Needs report builder notes'
      },
      {
        label: 'Raw review backup',
        ok: Boolean(rawBackupUrl),
        detail: rawBackupUrl ? 'Raw data backup linked' : 'Not linked in this portal record',
        href: rawBackupUrl
      },
      {
        label: 'Tracker reference',
        ok: Boolean(trackerValue) || trackerSkipped,
        detail: trackerValue ? String(trackerValue) : (trackerSkipped ? 'Skipped for test/training package' : 'No tracker row/link in this portal record')
      }
    ]
  };
}

function renderTannerPackageCheck(insp) {
  const mount = qs('#tanner-package-check');
  if (!mount) return;
  mount.innerHTML = '';

  const state = buildTannerPackageState(insp);
  const readyCount = state.items.filter(item => item.ok).length;
  const ready = readyCount === state.items.length;
  mount.className = `tanner-package-check mt-16 ${ready ? 'ready' : 'needs-work'}`;

  mount.appendChild(el('div', { class: 'tanner-package-header' },
    el('div', {},
      el('div', { class: 'tanner-package-title' }, 'Tanner Package Check'),
      el('div', { class: 'tanner-package-subtitle' }, 'Confirms the handoff pieces Tanner needs before report building.')
    ),
    el('div', { class: 'tanner-package-count' }, `${readyCount}/${state.items.length}`)
  ));

  const repairBtn = el('button', {
    type: 'button',
    class: 'tanner-package-repair-btn',
    onclick: repairTannerHandoffPackage
  }, _handoffRepairInFlight ? 'Repairing...' : 'Repair Tanner Package');
  repairBtn.disabled = IS_DEMO || _handoffRepairInFlight;
  mount.appendChild(el('div', { class: 'tanner-package-actions' },
    repairBtn,
    el('span', {}, ready
      ? 'Package receipt is complete.'
      : 'Rebuilds Drive, sheet, raw backup, photos folder, and tracker without changing submission status.')
  ));

  const grid = el('div', { class: 'tanner-package-grid' });
  state.items.forEach(item => {
    const attrs = {
      class: `tanner-package-item ${item.ok ? 'ok' : 'missing'}`
    };
    if (item.href) {
      attrs.href = item.href;
      attrs.target = '_blank';
      attrs.rel = 'noopener';
    }
    grid.appendChild(el(item.href ? 'a' : 'div', attrs,
      el('span', { class: 'tanner-package-dot' }, item.ok ? 'Ready' : 'Missing'),
      el('strong', {}, item.label),
      el('small', {}, item.detail || '')
    ));
  });
  mount.appendChild(grid);
}

/* ============================================================
   SECTION 1 — INSPECTION SUMMARY
   ============================================================ */

function renderSummarySection(insp, locked) {
  renderIntakeSummary(insp);
  renderTannerPackageCheck(insp);
  renderCompleteInspectionData(insp);

  const clientEl   = qs('#field-client-name');
  const addressEl  = qs('#field-property-address');
  const dateEl     = qs('#field-inspection-date');
  const inspEl     = qs('#field-inspector-name');
  const notesEl    = qs('#field-report-notes');

  if (clientEl)  { clientEl.value  = insp.reviewedData?.clientName  ?? insp.clientName;  }
  if (addressEl) { addressEl.value = insp.reviewedData?.propertyAddress ?? insp.propertyAddress; }
  if (dateEl)    { dateEl.value    = dateInputValue(insp.reviewedData?.inspectionDate ?? insp.inspectionDate); }
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

  renderFollowUpPlanSection(insp, locked);
}

function sourceFollowUpPlan(insp) {
  return getReviewedField(
    insp,
    'summary',
    'aiFollowUpPlan',
    insp.stepData?.debrief?.aiFollowUpPlan || insp.aiFollowUpPlan || ''
  );
}

function followUpPlanPrompt(insp, inspectorDraft = '') {
  const records = buildReviewRoomRecords(insp);
  const reviewedItems = roomFollowUpItems(insp);
  const roomDetails = [];

  records.forEach(record => {
    const roomName = record.room?.roomName || record.step?.roomName || record.stepId;
    const summary = String(getRoomAISummary(record, insp) || '').trim();
    const notes = String(getRoomInspectorNotes(record, insp) || '').trim();
    const followUp = findRoomFollowUpItem(reviewedItems, record, roomName) ||
      sourceRoomFollowUpItem(record, roomName);
    const details = [];
    if (summary && summary !== 'No concerns identified.') details.push('Summary: ' + summary);
    if (notes && notes !== summary) details.push('Inspector notes: ' + notes);
    if (followUp && (followUp.recheckIn || followUp.watchFor)) {
      details.push('Explicit follow-up: ' +
        [followUp.recheckIn ? 'recheck in ' + followUp.recheckIn : '', followUp.watchFor || '']
          .filter(Boolean)
          .join('; '));
    }
    if (details.length) roomDetails.push(roomName + ': ' + details.join(' '));
  });

  const property = insp.stepData?.['property-details'] || {};
  const radon = insp.stepData?.radon || {};
  const utility = insp.stepData?.utility || {};
  const findingsText = roomDetails.length
    ? roomDetails.map(detail => '- ' + detail).join('\n')
    : 'No specific room concerns or follow-up items were recorded.';

  return 'You are a professional home health report reviewer polishing a client follow-up plan that was written by the inspector. Rewrite only the inspector draft below so it reads clearly and professionally. Preserve the same meaning, priorities, and timeframes. Do not add new concerns, test results, recommendations, room names, or follow-up items. If the draft conflicts with the inspection context, keep the inspector draft meaning and make only wording-level improvements.\n\n'
    + 'Property: ' + (getReviewedField(insp, 'summary', 'propertyAddress', insp.propertyAddress) || 'Not recorded') + '\n'
    + 'Year Built: ' + (property.yearBuilt || 'Unknown') + '\n'
    + 'Water Source: ' + (insp.waterSource || property.waterSource || 'Unknown') + '\n'
    + 'Radon Reading: ' + (radon.radonReading || 'Not recorded') + '\n'
    + 'HVAC Filter Condition: ' + (utility.filterCondition || 'Not recorded') + '\n'
    + 'HVAC Filter Age: ' + (utility.filterEstimatedAge || 'Not recorded') + '\n\n'
    + 'Reviewed findings and explicit follow-ups:\n' + findingsText + '\n\n'
    + 'Inspector draft to polish:\n' + inspectorDraft.trim() + '\n\n'
    + 'Return only the polished follow-up plan in plain text. No markdown, bullets, asterisks, or special formatting.';
}

function setFollowUpPlanStatus(message, state = '') {
  const status = qs('#follow-up-plan-status');
  if (!status) return;
  status.textContent = message;
  status.className = `follow-up-plan-status${state ? ' is-' + state : ''}`;
}

function buildFollowUpPlanSuggestions(insp) {
  const records = buildReviewRoomRecords(insp);
  const reviewedItems = roomFollowUpItems(insp);
  const suggestions = [];
  const seen = new Set();
  const add = (room, text, detail = '') => {
    const cleanRoom = String(room || '').trim();
    const cleanText = String(text || '').trim();
    const cleanDetail = String(detail || '').trim();
    if (!cleanText) return;
    const key = `${slugifyRoomPart(cleanRoom)}|${cleanText.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ room: cleanRoom, text: cleanText, detail: cleanDetail });
  };

  records.forEach(record => {
    const roomName = displayReviewRoomName(
      record.room?.roomName || record.step?.roomName || record.stepId,
      record.room?.type || record.step?.type || '',
      record.room?.level || record.step?.level || '',
      record.stepId
    );
    const followUp = findRoomFollowUpItem(reviewedItems, record, roomName) ||
      sourceRoomFollowUpItem(record, roomName);
    if (followUp && (followUp.recheckIn || followUp.watchFor)) {
      add(
        roomName,
        [followUp.recheckIn ? `Recheck in ${followUp.recheckIn}` : '', followUp.watchFor || '']
          .filter(Boolean)
          .join(': '),
        'From room follow-up fields'
      );
      return;
    }
    const notes = getRoomInspectorNotes(record, insp);
    if (notes && !roomNoIssuesFound(record, insp)) {
      add(roomName, notes.length > 180 ? notes.slice(0, 177).trim() + '...' : notes, 'From inspector room notes');
    }
  });

  return suggestions.slice(0, 8);
}

function renderFollowUpSuggestions(insp, textarea, locked) {
  const wrap = qs('#follow-up-suggestions');
  if (!wrap) return;
  wrap.innerHTML = '';
  const suggestions = buildFollowUpPlanSuggestions(insp);
  if (!suggestions.length) {
    wrap.appendChild(el('div', { class: 'follow-up-suggestions-empty' }, 'No follow-up suggestions found from room findings yet.'));
    return;
  }
  wrap.appendChild(el('div', { class: 'follow-up-suggestions-title' }, 'Suggestions from findings'));
  const list = el('div', { class: 'follow-up-suggestion-list' });
  suggestions.forEach(item => {
    const button = el('button', {
      type: 'button',
      class: 'follow-up-suggestion-item',
      ...(locked ? { disabled: '' } : {})
    },
      el('span', { class: 'follow-up-suggestion-room' }, item.room || 'Inspection'),
      el('span', { class: 'follow-up-suggestion-text' }, item.text),
      item.detail ? el('span', { class: 'follow-up-suggestion-detail' }, item.detail) : null
    );
    if (!locked) {
      button.addEventListener('click', () => {
        const line = `${item.room ? item.room + ': ' : ''}${item.text}`;
        textarea.value = [textarea.value.trim(), line].filter(Boolean).join('\n');
        setReviewedField('summary', 'aiFollowUpPlan', textarea.value);
        saveField('summary', 'aiFollowUpPlan', textarea.value);
        const generate = qs('#follow-up-plan-generate');
        if (generate) generate.disabled = false;
        setFollowUpPlanStatus('Suggestion inserted. Edit the plan in your own words before using AI polish.', 'saved');
        textarea.focus();
      });
    }
    list.appendChild(button);
  });
  wrap.appendChild(list);
}

function renderFollowUpPlanSection(insp, locked) {
  const textarea = qs('#field-follow-up-plan');
  const generate = qs('#follow-up-plan-generate');
  if (!textarea || !generate) return;

  const existing = String(sourceFollowUpPlan(insp) || '');
  textarea.value = existing;
  textarea.readOnly = locked;
  generate.disabled = locked || !existing.trim();
  generate.textContent = 'Polish with AI';
  setFollowUpPlanStatus(
    locked ? 'This submitted review is locked.' : (existing.trim()
      ? 'Edits save automatically. AI will only polish the inspector-written plan.'
      : 'Write the follow-up plan first; the AI polish button unlocks after there is a draft.'),
    locked ? '' : 'saved'
  );
  renderFollowUpSuggestions(insp, textarea, locked);

  if (!locked && textarea.dataset.saveReady !== 'true') {
    textarea.dataset.saveReady = 'true';
    attachReviewedFieldSave(textarea, 'summary', 'aiFollowUpPlan');
    textarea.addEventListener('input', () => {
      const hasDraft = textarea.value.trim().length > 0;
      generate.disabled = !hasDraft;
      setFollowUpPlanStatus(
        hasDraft
          ? 'Edits save automatically. AI will only polish the inspector-written plan.'
          : 'Write the follow-up plan first; the AI polish button unlocks after there is a draft.',
        hasDraft ? 'saved' : ''
      );
    });
  }

  if (generate.dataset.ready === 'true') return;
  generate.dataset.ready = 'true';
  generate.addEventListener('click', async () => {
    if (!_inspection || generate.disabled) return;
    const inspectorDraft = textarea.value.trim();
    if (!inspectorDraft) {
      generate.disabled = true;
      setFollowUpPlanStatus('Write the follow-up plan first; AI only polishes inspector-written text.', 'error');
      return;
    }
    generate.disabled = true;
    generate.textContent = 'Polishing…';
    setFollowUpPlanStatus('Polishing the inspector-written follow-up plan…', 'saving');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await visionProxyFetch(
        { prompt: followUpPlanPrompt(_inspection, inspectorDraft) },
        { signal: controller.signal }
      );
      if (!response.ok) throw new Error('AI request failed (' + response.status + ')');
      const result = await response.json();
      const plan = String(result.content?.[0]?.text || '').trim();
      if (!plan) throw new Error('The AI returned an empty plan.');

      const generatedAt = new Date().toISOString();
      textarea.value = plan;
      setReviewedField('summary', 'aiFollowUpPlan', plan);
      setReviewedField('summary', 'aiFollowUpPlanGeneratedAt', generatedAt);
      const planSaved = await saveField('summary', 'aiFollowUpPlan', plan);
      const timestampSaved = await saveField('summary', 'aiFollowUpPlanGeneratedAt', generatedAt);
      if (!planSaved || !timestampSaved) throw new Error('The draft could not be cloud-saved.');

      generate.textContent = 'Polish with AI';
      setFollowUpPlanStatus('Plan polished and cloud-saved. Review it before client handoff.', 'saved');
    } catch (error) {
      generate.textContent = 'Polish with AI';
      setFollowUpPlanStatus(
        error.name === 'AbortError'
          ? 'Polish timed out. The existing plan and inspection data are unchanged.'
          : 'Could not polish the plan. The existing plan and inspection data are unchanged.',
        'error'
      );
    } finally {
      clearTimeout(timeout);
      generate.disabled = !textarea.value.trim();
    }
  });
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
  const { id } = getURLParams();
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
    const remoteSave = _saveChain.then(() => saveCloudReviewField(id, {
      stepId,
      key: fieldKey,
      value
    }));
    _saveChain = remoteSave.catch(() => {});
    await remoteSave;
    recordReviewFieldSaveActivity(stepId, fieldKey, value);
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

function booleanish(value) {
  if (value === true) return true;
  if (value === false) return false;
  const text = String(value || '').trim().toLowerCase();
  if (!text) return false;
  return ['yes', 'true', 'done', 'completed', 'recorded', '1'].includes(text);
}

function roomNoIssuesFound(record, insp) {
  const value = getReviewedField(
    insp || _inspection || {},
    record?.stepId,
    'noIssuesFound',
    record?.step?.noIssuesFound ?? record?.room?.noIssuesFound ?? false
  );
  return booleanish(value);
}

function roomReviewStatus(record, insp) {
  const hasNotes = roomHasReviewableNotes(record, insp);
  const noIssues = roomNoIssuesFound(record, insp);
  const voiceReviewed = getReviewedField(
    insp || _inspection || {},
    record?.stepId,
    'voiceReviewed',
    record?.step?.voiceReviewed === true
  ) === true;
  return {
    hasNotes,
    noIssues,
    voiceReviewed,
    complete: noIssues || (hasNotes && voiceReviewed),
    className: noIssues ? 'no-issues' : (hasNotes && voiceReviewed ? 'reviewed' : 'unreviewed'),
    text: noIssues ? 'No Issues Found' : (hasNotes && voiceReviewed ? 'Notes Reviewed' : 'Needs Review')
  };
}

function updateRoomReviewChip(chip, state) {
  if (!chip) return;
  chip.className = `voice-chip ${state.className}`;
  chip.textContent = state.text;
}

function checklistStatus(value, options = {}) {
  const text = statusDisplay(value);
  const normalized = text.toLowerCase();
  if (options.warn && isAffirmative(value)) return { text, className: 'warn' };
  if (isAffirmative(value)) return { text: 'Yes', className: 'yes' };
  if (['no', 'false', 'none'].includes(normalized)) return { text: 'No', className: 'no' };
  if (options.count !== undefined) {
    return options.count > 0
      ? { text: `${options.count} photo${options.count === 1 ? '' : 's'}`, className: 'yes' }
      : { text: 'No photos', className: 'missing' };
  }
  return { text, className: text === 'Not recorded' ? 'missing' : '' };
}

function buildRoomChecklistGrid(record, roomPhotos) {
  const step = record.step || {};
  const room = record.room || {};
  const qtrakValue = step.qtrakDone ?? step.qtrakCaptured ?? (step.qtrakLocation ? 'Yes' : '');
  const builderBillValue = step.builderBillDone ?? step.builderBill ?? step.builderBillCaptured;
  const rows = [
    ['FLIR', room.flirDone || step.flirDone || ''],
    ['FLIR concerns', room.flirConcerns || step.flirConcerns || '', { warn: true }],
    ['Breeze', room.breezeDone || step.breezeDone || ''],
    ['Q-Trak', qtrakValue],
    ['Photos', '', { count: roomPhotos.length }]
  ];
  if (builderBillValue !== undefined && builderBillValue !== '') rows.push(['Builder Bill', builderBillValue]);

  const grid = el('div', { class: 'room-checklist-grid' });
  rows.forEach(([label, value, options]) => {
    const status = checklistStatus(value, options || {});
    grid.appendChild(el('div', { class: 'room-checklist-item' },
      el('span', { class: 'room-checklist-label' }, label),
      el('span', { class: `room-checklist-value ${status.className}` }, status.text)
    ));
  });
  return grid;
}

function buildRoomTestLocationsBlock(record, locked) {
  const step = record.step || {};
  const qtrakLocation = getReviewedField(_inspection || {}, record.stepId, 'qtrakLocation', step.qtrakLocation || '');
  const breezeLocation = getReviewedField(_inspection || {}, record.stepId, 'breezeLocation', step.breezeLocation || '');
  const qtrakRequired = isConductedValue(step.qtrakDone ?? step.qtrakCaptured) || String(qtrakLocation || '').trim() !== '';
  const breezeRequired = isConductedValue(step.breezeDone) || String(breezeLocation || '').trim() !== '';
  if (!qtrakRequired && !breezeRequired) return null;

  const buildLocationField = (fieldKey, label, value, required) => {
    const field = buildFieldEl(record.stepId, fieldKey, label, value, false, locked);
    if (required && !String(value || '').trim()) {
      field.classList.add('missing-test-location');
      field.appendChild(el('div', { class: 'test-location-missing' }, 'Location missing'));
    }
    return field;
  };

  const wrap = el('div', { class: 'room-test-locations' });
  wrap.appendChild(el('div', { class: 'room-test-locations-title' }, 'Test Locations'));
  const fields = el('div', { class: 'field-group two-col' });
  if (qtrakRequired) fields.appendChild(buildLocationField('qtrakLocation', 'Q-Trak Location', qtrakLocation, true));
  if (breezeRequired) fields.appendChild(buildLocationField('breezeLocation', 'Breeze Location', breezeLocation, true));
  wrap.appendChild(fields);
  return wrap;
}

function getRoomSourceInspectorNotes(record) {
  const step = record?.step || {};
  const room = record?.room || {};
  return String(step.notes || step.arrivalNotes || room.observations || '').trim();
}

function getRoomInspectorNotes(record, insp) {
  return String(getReviewedField(
    insp || _inspection || {},
    record?.stepId,
    'inspectorNotes',
    getRoomSourceInspectorNotes(record)
  ) || '').trim();
}

function getRoomSourceAISummary(record) {
  return String(record?.step?.aiSummary || record?.room?.aiSummary || '').trim();
}

function getRoomAISummary(record, insp) {
  return String(getReviewedField(
    insp || _inspection || {},
    record?.stepId,
    'aiSummary',
    getRoomSourceAISummary(record)
  ) || '').trim();
}

function roomHasReviewableNotes(record, insp) {
  return getRoomInspectorNotes(record, insp) !== '';
}

function buildEditableRoomTextBlock({
  label,
  value,
  originalValue,
  emptyText,
  stepId,
  fieldKey,
  locked,
  rows = 3,
  isGated = false,
  onInput
}) {
  const hasPortalEdit = _inspection?.reviewedData?.[stepId] &&
    Object.prototype.hasOwnProperty.call(_inspection.reviewedData[stepId], fieldKey);
  const wrap = el('div', { class: 'room-editable-block', 'data-room-field': fieldKey });
  wrap.appendChild(el('label', {
    class: 'field-label',
    for: `room-${fieldKey}-${stepId}`
  }, `${label} — editable`));
  const textarea = el('textarea', {
    id: `room-${fieldKey}-${stepId}`,
    class: 'field-textarea room-editable-textarea',
    rows: String(rows),
    placeholder: emptyText,
    ...(locked ? { readonly: '' } : {})
  });
  textarea.value = value || '';
  wrap.appendChild(textarea);
  wrap.appendChild(el('div', { class: 'room-editable-note' },
    hasPortalEdit
      ? 'Portal edit saved separately. Original inspector source remains preserved.'
      : 'Edits save to the Review Portal without changing the preserved inspector source.'
  ));
  if (!locked) {
    attachReviewedFieldSave(textarea, stepId, fieldKey, isGated);
    if (onInput) textarea.addEventListener('input', () => onInput(textarea.value, wrap));
  }
  if (hasPortalEdit && String(originalValue || '').trim() &&
      String(originalValue || '').trim() !== String(value || '').trim()) {
    const original = el('details', { class: 'room-original-text' });
    original.appendChild(el('summary', {}, `Original ${label.toLowerCase()}`));
    original.appendChild(el('div', { class: 'room-readonly-text' }, String(originalValue)));
    wrap.appendChild(original);
  }
  return wrap;
}

function photoRoomNames(photo) {
  const names = [
    photo?.roomName,
    photo?.reviewRoomName,
    photo?.assignedRoomName,
    photo?.assignedRoom,
    photo?.room,
    photo?.roomLabel,
    photo?.location,
    photo?.testLocation,
    photo?.sampleLocation,
    photo?.atpLocation,
    photo?.taskRoomName
  ].filter(Boolean);
  const stepText = String(photo?.stepName || photo?.sectionName || photo?.caption || '');
  const roomHint = stepText.match(/\b(?:room|location)\s*[:\-]\s*([^|—\n]+)/i);
  if (roomHint) names.push(roomHint[1].trim());
  const combined = [
    photo?.roomName,
    photo?.stepName,
    photo?.sectionName,
    photo?.caption
  ].filter(Boolean).join(' ');
  if (/kitchen inspection|dishwasher|under refrigerator|under sink|stove vent|appliance inspection/i.test(combined)) {
    names.push('Kitchen');
  }
  return names;
}

function displayReviewRoomName(roomName, type = '', level = '', stepId = '') {
  const raw = String(roomName || '').trim();
  const text = [raw, type, level, stepId].join(' ').toLowerCase();
  if (/^lowest level$/i.test(raw)) return 'Radon';
  if (/lowest level/i.test(raw)) return raw.replace(/lowest level/ig, 'Radon').replace(/[—–]/g, '-');
  if (!raw && /lowest level/i.test(text) && /radon|monitor|test/.test(text)) return 'Radon';
  if (/^kitchen inspection$/i.test(raw)) return 'Kitchen';
  return raw || stepId || 'Room';
}

function buildRoomAliasIndex(roomRecords, insp) {
  const candidates = new Map();
  const aliasesByStepId = new Map();
  const groups = {};
  const byStepId = new Map(roomRecords.map(record => [record.stepId, record]));
  let order = 0;

  const addCandidate = (record, value, priority) => {
    const alias = slugifyRoomPart(value);
    if (!record?.stepId || !alias) return;
    const current = candidates.get(alias);
    const candidate = { stepId: record.stepId, priority, order: order++ };
    if (!current || priority > current.priority ||
        (priority === current.priority && candidate.order < current.order)) {
      candidates.set(alias, candidate);
    }
  };

  roomRecords.forEach(record => {
    const roomName = record.room?.roomName || record.step?.roomName || record.stepId;
    addCandidate(record, roomName, 100);
    addCandidate(record, displayReviewRoomName(roomName, record.room?.type || record.step?.type || '', record.room?.level || record.step?.level || '', record.stepId), 96);
    addCandidate(record, record.step?.roomName, 95);
    addCandidate(record, record.stepId, 40);
    [
      ...(Array.isArray(record.room?.aliases) ? record.room.aliases : []),
      ...(Array.isArray(record.room?.previousNames) ? record.room.previousNames : []),
      ...(Array.isArray(record.step?.aliases) ? record.step.aliases : []),
      ...(Array.isArray(record.step?.previousNames) ? record.step.previousNames : [])
    ].forEach(alias => addCandidate(record, alias, 90));

    const type = record.room?.type || record.step?.type || '';
    if (!groups[type]) groups[type] = [];
    groups[type].push(record);
  });

  const addIndexedAliases = (type, prefix) => {
    (groups[type] || []).forEach((record, index) => {
      addCandidate(record, `${prefix} ${index + 1}`, 60);
    });
  };
  addIndexedAliases('bedroom', 'Bedroom');
  addIndexedAliases('bathroom', 'Bathroom');
  addIndexedAliases('additional-room', 'Additional Room');

  const bathroomRelationships = insp?.roomRelationships?.bathrooms || {};
  Object.entries(bathroomRelationships).forEach(([bathroomStepId, relationship]) => {
    const bathroom = byStepId.get(bathroomStepId);
    if (!bathroom || !relationship || typeof relationship !== 'object') return;
    addCandidate(bathroom, relationship.lastAutoName, 92);
    [
      ...(Array.isArray(relationship.aliases) ? relationship.aliases : []),
      ...(Array.isArray(relationship.previousNames) ? relationship.previousNames : [])
    ].forEach(alias => addCandidate(bathroom, alias, 92));
    (relationship.linkedBedroomIds || []).forEach(bedroomStepId => {
      const bedroom = byStepId.get(bedroomStepId);
      const bedroomName = bedroom?.room?.roomName || bedroom?.step?.roomName;
      if (bedroomName) addCandidate(bathroom, `${bedroomName} — Bathroom`, 92);
    });
  });

  const ownerByAlias = new Map();
  candidates.forEach((candidate, alias) => {
    ownerByAlias.set(alias, candidate.stepId);
    if (!aliasesByStepId.has(candidate.stepId)) aliasesByStepId.set(candidate.stepId, new Set());
    aliasesByStepId.get(candidate.stepId).add(alias);
  });
  roomRecords.forEach(record => {
    if (!aliasesByStepId.has(record.stepId)) aliasesByStepId.set(record.stepId, new Set());
  });
  return { aliasesByStepId, ownerByAlias };
}

function resolvePhotoRoomStepId(photo, aliasIndex) {
  for (const name of photoRoomNames(photo)) {
    const owner = aliasIndex.ownerByAlias.get(slugifyRoomPart(name));
    if (owner) return owner;
  }
  return '';
}

function ensurePhotoBackedRoomRecords(insp, initialRecords) {
  const records = initialRecords.slice();
  const steps = insp.stepData || {};
  const photos = insp.photos || [];
  const usedStepIds = new Set(records.map(record => record.stepId));
  let aliasIndex = buildRoomAliasIndex(records, insp);
  const photoRoomSlugs = new Set(
    photos.flatMap(photo => photoRoomNames(photo).map(slugifyRoomPart)).filter(Boolean)
  );

  // A complete exported rooms array can omit valid system rooms such as
  // Exterior or Utility. Add those step records only when a photo actually
  // targets them, keeping the review focused while preventing orphaned photos.
  Object.entries(steps).forEach(([stepId, step]) => {
    const roomName = String(step?.roomName || step?.name || '').trim();
    const roomSlug = slugifyRoomPart(roomName);
    if (!roomSlug || usedStepIds.has(stepId) || !photoRoomSlugs.has(roomSlug) ||
        aliasIndex.ownerByAlias.has(roomSlug)) return;
    records.push({
      room: {
        roomName,
        type: step.type || 'photo-backed-room',
        level: step.level || '',
        flirDone: step.flirDone || '',
        flirConcerns: step.flirConcerns || '',
        breezeDone: step.breezeDone || ''
      },
      step,
      stepId,
      photoBacked: true
    });
    usedStepIds.add(stepId);
    aliasIndex = buildRoomAliasIndex(records, insp);
  });

  // Last-resort protection for future app room types: any named photo that
  // still has no canonical/relationship/step match receives one stable
  // photo-backed card rather than disappearing from Rooms & Observations.
  photos.forEach(photo => {
    if (resolvePhotoRoomStepId(photo, aliasIndex)) return;
    const roomName = String(photoRoomNames(photo)[0] || '').trim();
    const roomSlug = slugifyRoomPart(roomName);
    if (!roomSlug) return;
    let stepId = `photo-room-${roomSlug}`;
    let suffix = 2;
    while (usedStepIds.has(stepId)) stepId = `photo-room-${roomSlug}-${suffix++}`;
    const synthetic = {
      room: { roomName, type: 'photo-only', level: '' },
      step: { roomName, type: 'photo-only' },
      stepId,
      photoBacked: true
    };
    records.push(synthetic);
    usedStepIds.add(stepId);
    aliasIndex = buildRoomAliasIndex(records, insp);
  });

  return records;
}

function photosForRoomRecord(photos, record, aliasIndex) {
  const seen = new Set();
  return (photos || []).filter(photo => {
    if (resolvePhotoRoomStepId(photo, aliasIndex) !== record.stepId) return false;
    const key = photo.photoId || photo.driveId || photo.driveUrl || JSON.stringify(photo);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function auditPhotoRoomRouting(photos, roomRecords, aliasIndex) {
  const assignedPhotoIds = new Set();
  const unmatched = [];
  (photos || []).forEach((photo, index) => {
    if (!photoRoomNames(photo).length) return;
    const owner = resolvePhotoRoomStepId(photo, aliasIndex);
    const photoId = photo.photoId || photo.driveId || photo.driveUrl || `photo-${index + 1}`;
    if (owner) assignedPhotoIds.add(photoId);
    else unmatched.push({ photoId, roomName: String(photoRoomNames(photo)[0] || '') });
  });
  return {
    namedPhotoCount: assignedPhotoIds.size + unmatched.length,
    assignedPhotoCount: assignedPhotoIds.size,
    unmatched,
    roomCount: roomRecords.length
  };
}

function aiSummaryLooksContradictory(summary, roomPhotos) {
  if (!summary || !roomPhotos.length) return false;
  return /(?:not completed|not performed|not tested|not been tested|not yet been completed|was not completed|was not performed|was not tested|has not been completed|should be scheduled|follow-up visit)/i.test(summary);
}

function buildEditableAISummaryBlock(summary, originalSummary, roomPhotos, stepId, locked) {
  const updateWarning = (value, block) => {
    let warning = block.querySelector('.ai-summary-warning');
    const show = aiSummaryLooksContradictory(value, roomPhotos);
    if (!show && warning) {
      warning.remove();
      return;
    }
    if (!show || warning) return;
    // Never replace saved inspector data with a portal-generated warning.
    // A room can legitimately have documentation photos even when a specific
    // test (such as Breeze) was not performed. Keep the exact AI summary visible
    // and add the review note only as secondary context.
    warning = el('div', { class: 'room-readonly-text ai-summary-warning' },
      'Review note: compare this summary with the source status fields and room photos.'
    );
    block.appendChild(warning);
  };
  const block = buildEditableRoomTextBlock({
    label: 'Polished Inspector Notes',
    value: summary,
    originalValue: originalSummary,
    emptyText: 'Add or edit the room summary used for report building...',
    stepId,
    fieldKey: 'aiSummary',
    locked,
    rows: 4,
    onInput: updateWarning
  });
  if (aiSummaryLooksContradictory(summary, roomPhotos)) {
    updateWarning(summary, block);
  }
  return block;
}

function roomFollowUpItems(insp) {
  return normalizeFollowUpItems(
    getReviewedJSONField(insp, 'roomData', 'followUpItems', insp.followUpItems || [])
  );
}

function findRoomFollowUpItem(items, record, roomName) {
  const byStepId = items.find(item => item.stepId && item.stepId === record.stepId);
  if (byStepId) return byStepId;
  const roomKey = slugifyRoomPart(roomName);
  return items.find(item => slugifyRoomPart(item.room) === roomKey) || null;
}

function sourceRoomFollowUpItem(record, roomName) {
  const sources = [record.step || {}, record.room || {}];
  const firstValue = key => {
    for (const source of sources) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  };
  const needed = firstValue('followUpNeeded');
  const recheckIn = firstValue('followUpTimeframe');
  const watchFor = firstValue('followUpNote');
  if (!isAffirmative(needed) && !String(recheckIn).trim() && !String(watchFor).trim()) return null;
  return {
    stepId: record.stepId,
    room: roomName,
    recheckIn: String(recheckIn || ''),
    watchFor: String(watchFor || '')
  };
}

function buildRoomFollowUpEditor(record, insp, locked) {
  const roomName = record.room?.roomName || record.step?.roomName || record.stepId;
  let items = roomFollowUpItems(insp);
  let item = findRoomFollowUpItem(items, record, roomName) ||
    sourceRoomFollowUpItem(record, roomName);
  if (!item) {
    item = { stepId: record.stepId, room: roomName, recheckIn: '', watchFor: '' };
  }

  const wrap = el('div', { class: 'room-follow-up-block' });
  wrap.appendChild(el('div', { class: 'room-follow-up-title' }, 'Follow-Up for This Room'));
  wrap.appendChild(el('div', { class: 'room-editable-note' },
    'Add the timing and watch item while this room is in view. It automatically feeds Tanner’s follow-up summary.'
  ));

  const fields = el('div', { class: 'room-follow-up-fields' });
  const recheck = el('input', {
    type: 'text',
    class: 'field-input',
    value: item.recheckIn || '',
    placeholder: 'e.g. 6 months',
    ...(locked ? { readonly: '' } : {})
  });
  const watchFor = el('textarea', {
    class: 'field-textarea',
    rows: '2',
    placeholder: 'What should the client or Tanner watch for?',
    ...(locked ? { readonly: '' } : {})
  });
  watchFor.value = item.watchFor || '';
  fields.appendChild(el('div', {},
    el('label', { class: 'field-label' }, 'Recheck In'),
    recheck
  ));
  fields.appendChild(el('div', {},
    el('label', { class: 'field-label' }, 'Watch For'),
    watchFor
  ));
  wrap.appendChild(fields);

  if (!locked) {
    const persist = saveNow => {
      items = roomFollowUpItems(_inspection || insp);
      const existing = findRoomFollowUpItem(items, record, roomName);
      const next = {
        stepId: record.stepId,
        room: roomName,
        recheckIn: recheck.value,
        watchFor: watchFor.value
      };
      if (existing) Object.assign(existing, next);
      else items.push(next);
      items = items.filter(entry =>
        String(entry.recheckIn || '').trim() ||
        String(entry.watchFor || '').trim()
      );
      const jsonValue = JSON.stringify(items);
      setReviewedField('roomData', 'followUpItems', jsonValue);
      if (saveNow) saveField('roomData', 'followUpItems', jsonValue);
      else debouncedSave('roomData', 'followUpItems', jsonValue);
    };
    recheck.addEventListener('input', () => persist(false));
    watchFor.addEventListener('input', () => persist(false));
    recheck.addEventListener('blur', () => persist(true));
    watchFor.addEventListener('blur', () => persist(true));
  }

  return wrap;
}

function buildCapturedRoomData(record) {
  const source = { ...(record.room || {}), ...(record.step || {}) };
  const alreadyRendered = new Set([
    'roomName', 'name', 'level', 'type',
    'notes', 'inspectorNotes', 'aiSummary', 'aiSummaryGeneratedAt',
    'flirDone', 'flirConcerns', 'breezeDone', 'qtrakDone', 'qtrakCaptured',
    'qtrakLocation', 'breezeLocation', 'builderBillDone', 'builderBill', 'builderBillCaptured',
    'followUpNeeded', 'followUpTimeframe', 'followUpNote',
    'voiceReviewed', 'noIssuesFound'
  ]);
  const roomData = {};
  Object.entries(source).forEach(([key, value]) => {
    if (key.startsWith('_') || alreadyRendered.has(key) || /photo/i.test(key)) return;
    if (/guidance|instruction|prompt|helper|placeholder|scan|question|section|schema|screen|workflow/i.test(key)) return;
    if (/^(flir|breeze|qtrak)/i.test(key)) return;
    if (completeDataIsEmpty(value)) return;
    roomData[key] = value;
  });
  const rows = completeDataRows(roomData);
  if (!rows.length) return null;

  const details = el('details', { class: 'complete-data-group room-captured-data' });
  details.appendChild(el('summary', {},
    el('span', {}, 'Captured Inspector Fields'),
    el('span', { class: 'complete-data-count' },
      `${rows.length} value${rows.length === 1 ? '' : 's'}`
    )
  ));
  const table = el('div', { class: 'complete-data-table' });
  rows.forEach(row => {
    table.appendChild(el('div', { class: 'complete-data-row' },
      el('div', { class: 'complete-data-label' }, row.label),
      el('div', { class: 'complete-data-value' }, row.value)
    ));
  });
  details.appendChild(table);
  return details;
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

  const aliasIndex = buildRoomAliasIndex(roomRecords, insp);
  const routingAudit = auditPhotoRoomRouting(insp.photos || [], roomRecords, aliasIndex);
  container.dataset.photoRoutingNamed = String(routingAudit.namedPhotoCount);
  container.dataset.photoRoutingAssigned = String(routingAudit.assignedPhotoCount);
  container.dataset.photoRoutingUnmatched = String(routingAudit.unmatched.length);
  if (routingAudit.unmatched.length) {
    console.error('Assigned photos missing room destinations:', routingAudit.unmatched);
    container.appendChild(el('div', {
      class: 'room-routing-warning',
      role: 'alert'
    }, `${routingAudit.unmatched.length} assigned photo${routingAudit.unmatched.length === 1 ? '' : 's'} could not be matched to a room. The photos remain available in the Photos section.`));
  }
  for (const record of roomRecords) {
    container.appendChild(buildRoomCard(record, insp, locked, aliasIndex));
  }
}

function buildRoomCard(record, insp, locked, aliasIndex) {
  const { stepId, step = {}, room = {} } = record;
  const roomNameSource = room.roomName || step.roomName || stepId;
  const level      = room.level || step.level || '';
  const type       = room.type || step.type || '';
  const roomName   = displayReviewRoomName(roomNameSource, type, level, stepId);
  const originalNotes = getRoomSourceInspectorNotes(record);
  const notes      = getRoomInspectorNotes(record, insp);
  const originalAISummary = getRoomSourceAISummary(record);
  const aiSummary  = getRoomAISummary(record, insp);
  const hasConcern = isAffirmative(room.flirConcerns || step.flirConcerns || '');
  const roomPhotos = photosForRoomRecord(insp.photos || [], record, aliasIndex);
  let reviewState = roomReviewStatus(record, insp);

  const reviewedChip = el('span', { class: `voice-chip ${reviewState.className}` }, reviewState.text);

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

  // Room review controls
  const voiceCheck = el('input', {
    type: 'checkbox',
    id: `vr-${stepId}`,
    ...(reviewState.voiceReviewed ? { checked: '' } : {}),
    ...(locked ? { disabled: '' } : {})
  });

  const voiceLabel = el('label', { for: `vr-${stepId}` },
    voiceCheck,
    ' Inspector notes reviewed'
  );

  const noIssuesCheck = el('input', {
    type: 'checkbox',
    id: `nif-${stepId}`,
    ...(reviewState.noIssues ? { checked: '' } : {}),
    ...(locked ? { disabled: '' } : {})
  });
  const noIssuesLabel = el('label', { for: `nif-${stepId}`, class: 'room-no-issues-label' },
    noIssuesCheck,
    ' No issues found - intentionally left blank'
  );

  const syncRoomReviewState = (hasNotesOverride = null) => {
    const hasNotesNow = hasNotesOverride == null ? roomHasReviewableNotes(record, _inspection || insp) : hasNotesOverride;
    reviewState = {
      hasNotes: hasNotesNow,
      noIssues: noIssuesCheck.checked,
      voiceReviewed: voiceCheck.checked,
      complete: noIssuesCheck.checked || (hasNotesNow && voiceCheck.checked),
      className: noIssuesCheck.checked ? 'no-issues' : (hasNotesNow && voiceCheck.checked ? 'reviewed' : 'unreviewed'),
      text: noIssuesCheck.checked ? 'No Issues Found' : (hasNotesNow && voiceCheck.checked ? 'Notes Reviewed' : 'Needs Review')
    };
    updateRoomReviewChip(header.querySelector('.voice-chip'), reviewState);
    voiceLabel.classList.toggle('hidden', !hasNotesNow || noIssuesCheck.checked);
  };

  voiceCheck.checked = reviewState.voiceReviewed;
  noIssuesCheck.checked = reviewState.noIssues;
  if (!locked) {
    voiceCheck.addEventListener('change', () => {
      syncRoomReviewState();
      saveField(stepId, 'voiceReviewed', voiceCheck.checked);
      if (_inspection?.stepData?.[stepId]) {
        _inspection.stepData[stepId].voiceReviewed = voiceCheck.checked;
      }
      checkGate();
    });
    noIssuesCheck.addEventListener('change', () => {
      setReviewedField(stepId, 'noIssuesFound', noIssuesCheck.checked);
      if (_inspection?.stepData?.[stepId]) {
        _inspection.stepData[stepId].noIssuesFound = noIssuesCheck.checked;
      }
      syncRoomReviewState();
      saveField(stepId, 'noIssuesFound', noIssuesCheck.checked);
      checkGate();
      updatePhotoSummary(insp.photos || []);
    });
  }

  const body = el('div', { class: 'room-body' });
  const voiceReviewRow = el('div', { class: 'voice-review-row room-review-actions' }, voiceLabel, noIssuesLabel);
  syncRoomReviewState(reviewState.hasNotes);
  body.appendChild(voiceReviewRow);

  body.appendChild(buildRoomChecklistGrid(record, roomPhotos));
  const testLocations = buildRoomTestLocationsBlock(record, locked);
  if (testLocations) body.appendChild(testLocations);
  const capturedRoomData = buildCapturedRoomData(record);
  if (capturedRoomData) body.appendChild(capturedRoomData);

  body.appendChild(buildEditableRoomTextBlock({
    label: 'Inspector Notes',
    value: notes,
    originalValue: originalNotes,
    emptyText: 'Add or edit the inspector notes for this room...',
    stepId,
    fieldKey: 'inspectorNotes',
    locked,
    rows: 3,
    isGated: true,
    onInput: value => {
      const nowHasNotes = String(value || '').trim() !== '';
      if (nowHasNotes && noIssuesCheck.checked && !locked) {
        noIssuesCheck.checked = false;
        setReviewedField(stepId, 'noIssuesFound', false);
        if (_inspection?.stepData?.[stepId]) _inspection.stepData[stepId].noIssuesFound = false;
        saveField(stepId, 'noIssuesFound', false);
      }
      syncRoomReviewState(nowHasNotes);
      checkGate();
      updatePhotoSummary(insp.photos || []);
    }
  }));
  body.appendChild(buildEditableAISummaryBlock(aiSummary, originalAISummary, roomPhotos, stepId, locked));
  body.appendChild(buildRoomFollowUpEditor(record, insp, locked));
  body.appendChild(buildRoomPhotoStrip(roomPhotos));

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
    input = el('textarea', {
      class: 'field-textarea',
      rows: '3',
      'data-step': stepId,
      'data-field': fieldKey,
      ...(locked ? { readonly: '' } : {})
    });
  } else {
    input = el('input', {
      type: 'text',
      class: 'field-input',
      'data-step': stepId,
      'data-field': fieldKey,
      ...(locked ? { readonly: '' } : {})
    });
  }
  input.value = value;

  const orig = el('div', { class: 'field-original' });
  wrap.appendChild(input);
  wrap.appendChild(orig);

  if (!locked) {
    attachFieldSave(input, stepId, fieldKey, true);
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
  const waterSample = insp.stepData?.['water-sample'] || {};

  if (Object.keys(waterSample).length) {
    const source = el('div', { class: 'water-sample-source' },
      el('div', { class: 'water-sample-source-title' },
        el('strong', {}, 'Water Sample — Captured in App'),
        el('span', { class: 'field-test-record-status' }, waterSample._visited ? 'Visited' : 'Not visited')
      )
    );
    const grid = el('div', { class: 'kitchen-data-grid' });
    [
      ['Water panel planned', waterSample.waterPanelPlanned || insp.waterPanelPlanned],
      ['Water panel collected', waterSample.waterPanelCollected],
      ['Sample ID', insp.waterSampleId],
      ['Collection location', insp.postTestLocWater],
      ['Water source', insp.waterSource],
      ['Inspector notes', waterSample.notes]
    ].forEach(([label, value]) => {
      grid.appendChild(el('div', { class: 'kitchen-data-item' },
        el('span', {}, label),
        el('strong', {}, sourceDisplayValue(value))
      ));
    });
    source.appendChild(grid);
    body.appendChild(source);
  }

  if (!fridge && !sink && !microplastics) {
    body.appendChild(el('p', { class: 'text-muted water-lab-empty' }, 'No lab-result water findings are stored yet. The field collection record is shown above.'));
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
  notesWrap.appendChild(el('label', { class: 'field-label', for: 'field-water-tanner-notes' }, 'Water Review Notes'));
  const notes = el('textarea', {
    id: 'field-water-tanner-notes',
    class: 'field-textarea',
    rows: '3',
    placeholder: 'Add review notes about water findings...',
    ...(locked ? { readonly: '' } : {})
  });
  notes.value = getReviewedField(insp, 'roomData', 'waterFindingsNotes', '');
  notesWrap.appendChild(notes);
  body.appendChild(notesWrap);
  if (!locked) attachReviewedFieldSave(notes, 'roomData', 'waterFindingsNotes');
}

/* ============================================================
   SECTION 5 — KITCHEN INSPECTION
   ============================================================ */

function sourceDisplayValue(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not recorded';
  return value === undefined || value === null || value === '' ? 'Not recorded' : String(value);
}

function buildKitchenPhotoThumb(photo, fallbackLabel) {
  const caption = photo?.caption || fallbackLabel || photo?.photoId || 'Kitchen photo';
  const button = el('button', {
    type: 'button',
    class: 'kitchen-photo-thumb',
    'data-photo-id': photo?.photoId || '',
    'data-photo-caption': photo?.caption || '',
    'aria-label': `Open ${caption}`
  });
  if (photo?.driveUrl) {
    button.appendChild(el('img', {
      src: photo.driveUrl,
      alt: caption,
      loading: 'lazy',
      referrerpolicy: 'no-referrer-when-downgrade'
    }));
    button.addEventListener('click', () => openPhotoModal(photo.driveUrl, photo.caption || fallbackLabel || '', photo.photoId || ''));
  } else {
    button.appendChild(el('div', { class: 'kitchen-photo-placeholder' }, 'Photo unavailable'));
  }
  button.appendChild(el('span', { class: 'kitchen-photo-caption' }, caption));
  return button;
}

function renderKitchenInspectionSection(insp) {
  const body = qs('#kitchen-inspection-body');
  if (!body) return;
  body.innerHTML = '';

  const kitchen = insp.stepData?.['kitchen-appliance'] || {};
  if (!Object.keys(kitchen).length) {
    body.appendChild(el('p', { class: 'text-muted' }, 'No kitchen inspection data found.'));
    return;
  }

  const dataGrid = el('div', { class: 'kitchen-data-grid' });
  [
    ['Stove type', kitchen.stoveType],
    ['Exhaust hood', kitchen.exhaustHoodType],
    ['Vented', kitchen.exhaustVented],
    ['Water flushed', kitchen.waterFlushed],
    ['Refrigerator checked', kitchen.fridgeChecked],
    ['Dishwasher checked', kitchen.dishwasherChecked],
    ['Dishwasher filter checked', kitchen.dishwasherFilterChecked],
    ['Under sink checked', kitchen.underSinkChecked],
    ['Under sink cleaned', kitchen.underSinkCleaned],
    ['Stove vent checked', kitchen.stoveVentChecked],
    ['Visible mold', kitchen.moldVisible],
    ['Appliance condition', kitchen.appliancesCondition]
  ].forEach(([label, value]) => {
    dataGrid.appendChild(el('div', { class: 'kitchen-data-item' },
      el('span', {}, label),
      el('strong', {}, sourceDisplayValue(value))
    ));
  });
  body.appendChild(dataGrid);

  const allPhotos = _inspection?.photos || [];
  const photosById = new Map(allPhotos.map(photo => [photo.photoId, photo]));
  const tasks = [
    { label: 'Under Refrigerator', before: '_fridgeBeforePhotos', after: '_fridgeAfterPhotos' },
    { label: 'Under Dishwasher', before: '_dishwasherBeforePhotos', after: '_dishwasherAfterPhotos' },
    { label: 'Dishwasher Filter', before: '_dishwasherFilterBeforePhotos', after: '_dishwasherFilterAfterPhotos' },
    { label: 'Under Sink', before: '_underSinkBeforePhotos', after: '_underSinkAfterPhotos' },
    { label: 'Above Stove Vent', before: '_stoveVentBeforePhotos', after: '_stoveVentAfterPhotos' }
  ];

  const assignedFor = key => (Array.isArray(kitchen[key]) ? kitchen[key] : []).map(saved =>
    photosById.get(saved.photoId) || saved
  );
  const beforeCount = tasks.reduce((sum, task) => sum + assignedFor(task.before).length, 0);
  const afterCount = tasks.reduce((sum, task) => sum + assignedFor(task.after).length, 0);

  const tabBar = el('div', { class: 'kitchen-photo-tabs', role: 'tablist', 'aria-label': 'Kitchen photo phase' });
  const panels = {};
  const setActivePhase = phase => {
    tabBar.querySelectorAll('.kitchen-photo-tab').forEach(button => {
      const active = button.dataset.phase === phase;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    Object.entries(panels).forEach(([key, panel]) => panel.hidden = key !== phase);
  };

  [['before', beforeCount], ['after', afterCount]].forEach(([phase, count]) => {
    const button = el('button', {
      type: 'button',
      class: `kitchen-photo-tab${phase === 'before' ? ' active' : ''}`,
      'data-phase': phase,
      role: 'tab',
      'aria-selected': phase === 'before' ? 'true' : 'false'
    }, `${phase === 'before' ? 'Before' : 'After'} (${count})`);
    button.addEventListener('click', () => setActivePhase(phase));
    tabBar.appendChild(button);
  });
  body.appendChild(tabBar);

  ['before', 'after'].forEach(phase => {
    const panel = el('div', { class: 'kitchen-photo-panel', role: 'tabpanel', ...(phase === 'after' ? { hidden: '' } : {}) });
    let panelCount = 0;
    tasks.forEach(task => {
      const photos = assignedFor(task[phase]);
      if (!photos.length) return;
      panelCount += photos.length;
      const group = el('div', { class: 'kitchen-photo-task' },
        el('div', { class: 'kitchen-photo-task-title' }, `${task.label} · ${photos.length} photo${photos.length === 1 ? '' : 's'}`)
      );
      const grid = el('div', { class: 'kitchen-photo-grid' });
      photos.forEach(photo => grid.appendChild(buildKitchenPhotoThumb(photo, `${task.label} — ${phase}`)));
      group.appendChild(grid);
      panel.appendChild(group);
    });
    if (!panelCount) panel.appendChild(el('p', { class: 'text-muted' }, `No ${phase} photos were assigned by the inspector.`));
    panels[phase] = panel;
    body.appendChild(panel);
  });

  const otherPhotos = (Array.isArray(kitchen._photos) ? kitchen._photos : []).map(saved => photosById.get(saved.photoId) || saved);
  if (otherPhotos.length) {
    const other = el('div', { class: 'kitchen-other-photos' },
      el('div', { class: 'kitchen-photo-task-title' }, `Other Kitchen Documentation · ${otherPhotos.length} photo${otherPhotos.length === 1 ? '' : 's'}`)
    );
    const grid = el('div', { class: 'kitchen-photo-grid' });
    otherPhotos.forEach(photo => grid.appendChild(buildKitchenPhotoThumb(photo, 'Kitchen documentation')));
    other.appendChild(grid);
    body.appendChild(other);
  }
}

/* ============================================================
   SECTION 5 — FOLLOW-UP ITEMS
   ============================================================ */

function normalizeFollowUpItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    stepId: item?.stepId || '',
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

const BEFORE_LEAVING_ITEMS = [
  { key: 'breezeCollected', label: 'All Breeze ET tests collected and spore traps packed' },
  { key: 'boulderBlueDone', label: 'Boulder Blue fan run 2+ hours — filter collected and packed' },
  { key: 'pfasCollected', label: 'PFAS test collected from kitchen sink' },
  { key: 'waterLabeled', label: 'Water samples labeled and ready to ship' },
  { key: 'appliancesRestored', label: 'All appliances returned to original state' },
  { key: 'doorsLightsRestored', label: 'All doors and lights returned to original state' },
  { key: 'radonLeftInPlace', label: 'Radon monitor left in place' },
  { key: 'formComplete', label: 'Technician form fully completed' },
  { key: 'photosUploaded', label: 'All photos uploaded or captured' },
  { key: 'boulderBlueRegistered', label: 'Boulder Blue filter registered on Jonah Ventures portal' }
];

const DEPARTURE_TASK_ITEMS = [
  { key: 'downloadQtrak', label: 'Download Q-Trak data to computer' },
  { key: 'shipSamples', label: 'Ship all lab samples' }
];

function renderBeforeLeavingSection(insp, locked) {
  const body = qs('#before-leaving-body');
  if (!body) return;
  body.innerHTML = '';

  const sourceChecks = insp.stepData?.['final-checks'] || insp.wrapUp || {};
  const sourceDeparture = insp._departureChecklist || {};
  const postAssessment = insp.stepData?.['post-assessment'] || insp.postAssessment || {};
  const shipping = postAssessment.shipping || {};
  const dataManagement = postAssessment.dataManagement || {};
  const finalCheck = postAssessment.finalCheck || {};
  const firstDefined = (...values) => values.find(value => value !== undefined);
  const sourceAnswers = {
    breezeCollected: firstDefined(sourceChecks.breezeCollected, shipping.breezeST),
    boulderBlueDone: firstDefined(sourceChecks.boulderBlueDone, shipping.boulderBlueShip),
    pfasCollected: firstDefined(sourceChecks.pfasCollected, shipping.pfasShip),
    waterLabeled: firstDefined(sourceChecks.waterLabeled, shipping.waterPanelShip),
    appliancesRestored: sourceChecks.appliancesRestored,
    doorsLightsRestored: sourceChecks.doorsLightsRestored,
    radonLeftInPlace: sourceChecks.radonLeftInPlace,
    formComplete: firstDefined(sourceChecks.formComplete, finalCheck.allSectionsComplete, finalCheck.assessmentComplete),
    photosUploaded: firstDefined(sourceChecks.photosUploaded, finalCheck.allPhotosUploaded),
    boulderBlueRegistered: sourceChecks.boulderBlueRegistered,
    downloadQtrak: firstDefined(sourceDeparture.downloadQtrak, dataManagement.qtrakExported),
    shipSamples: firstDefined(sourceDeparture.shipSamples, finalCheck.allSamplesShipped)
  };
  const reviewed = insp.reviewedData?.['before-leaving'] || {};
  const allItems = [
    ...BEFORE_LEAVING_ITEMS.map(item => ({ ...item, source: sourceAnswers, group: 'Final checks' })),
    ...DEPARTURE_TASK_ITEMS.map(item => ({ ...item, source: sourceAnswers, group: 'Departure tasks' }))
  ];

  const heading = el('div', { class: 'before-leaving-summary' });
  const count = el('strong', {});
  heading.append(
    el('div', {},
      el('h3', {}, 'Before Leaving Checklist'),
      el('p', {}, 'Saved inspector answers are preserved. Items without an app answer can be completed here for the report workflow.')
    ),
    count
  );
  body.appendChild(heading);

  const list = el('div', { class: 'before-leaving-list' });
  let lastGroup = '';
  const updateCount = () => {
    const completed = list.querySelectorAll('input[type="checkbox"]:checked').length;
    count.textContent = `${completed} / ${allItems.length} complete`;
  };

  allItems.forEach(item => {
    if (item.group !== lastGroup) {
      list.appendChild(el('div', { class: 'before-leaving-group' }, item.group));
      lastGroup = item.group;
    }
    const sourceRecorded = item.source[item.key] !== undefined;
    const reviewedRecorded = reviewed[item.key] !== undefined;
    const checked = reviewedRecorded ? reviewed[item.key] === true : item.source[item.key] === true;
    const status = el('span', {
      class: `before-leaving-status ${sourceRecorded ? 'source' : reviewedRecorded ? 'reviewed' : 'missing'}`
    }, sourceRecorded ? 'Saved by inspector' : reviewedRecorded ? 'Saved in portal' : 'Not recorded in app');
    const checkbox = el('input', {
      type: 'checkbox',
      ...(checked ? { checked: '' } : {}),
      ...(locked ? { disabled: '' } : {})
    });
    const row = el('label', { class: 'before-leaving-item' },
      checkbox,
      el('span', { class: 'before-leaving-label' }, item.label),
      status
    );
    if (!locked) {
      checkbox.addEventListener('change', async () => {
        status.className = 'before-leaving-status reviewed';
        status.textContent = 'Saving…';
        setReviewedField('before-leaving', item.key, checkbox.checked);
        updateCount();
        const saved = await saveField('before-leaving', item.key, checkbox.checked);
        status.textContent = saved ? 'Saved in portal' : 'Local recovery saved';
      });
    }
    list.appendChild(row);
  });
  body.appendChild(list);
  updateCount();
}

function testValuePresent(value) {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function collectTestSampleRecords(insp) {
  const records = [];
  const keys = new Set();
  const steps = insp.stepData || {};
  const confirmed = insp.testsConfirmed || {};
  const post = steps['post-assessment'] || insp.postAssessment || {};
  const shipping = post.shipping || {};

  const add = record => {
    const normalized = {
      type: sourceDisplayValue(record.type),
      status: sourceDisplayValue(record.status),
      location: sourceDisplayValue(record.location),
      sampleId: sourceDisplayValue(record.sampleId),
      details: sourceDisplayValue(record.details),
      source: sourceDisplayValue(record.source)
    };
    const key = [normalized.type, normalized.status, normalized.location, normalized.sampleId, normalized.details].join('|').toLowerCase();
    if (keys.has(key)) return;
    keys.add(key);
    records.push(normalized);
  };

  Object.entries(steps).forEach(([stepId, step]) => {
    if (!step || typeof step !== 'object') return;
    if (testValuePresent(step.atpPreRLU) || testValuePresent(step.atpPostRLU) || testValuePresent(step.atpSurface)) {
      add({
        type: 'ATP',
        status: step._completedAt ? 'Completed' : 'Recorded',
        location: step.atpSurfaceOther || step.atpSurface || step.roomName,
        sampleId: step.atpSampleId || insp.atpSampleId,
        details: `Pre ${sourceDisplayValue(step.atpPreRLU)} / ${sourceDisplayValue(step.atpPreStatus)} · Post ${sourceDisplayValue(step.atpPostRLU)} / ${sourceDisplayValue(step.atpPostStatus)} · Cleaned ${sourceDisplayValue(step.atpCleaned)}`,
        source: step.roomName || stepId
      });
    }
  });

  const water = steps['water-sample'] || {};
  if (testValuePresent(water.waterPanelPlanned) || testValuePresent(water.waterPanelCollected) || testValuePresent(water.waterSampleId) || shipping.waterPanelShip) {
    add({
      type: 'Water Panel',
      status: isAffirmative(water.waterPanelCollected) ? 'Collected' : (water.waterPanelPlanned || (shipping.waterPanelShip ? 'Prepared for shipping' : 'Recorded')),
      location: water.waterFaucetLocation || insp.postTestLocWater,
      sampleId: water.waterSampleId || insp.waterSampleId,
      details: shipping.waterPanelShip ? 'Shipping checklist complete' : water.notes,
      source: water.roomName || 'Water Samples'
    });
  }

  const device = steps['device-setup'] || {};
  const particulateMatter = getParticulateMatter(insp);
  if (testValuePresent(particulateMatter)) {
    add({
      type: 'Particulate Matter',
      status: 'Recorded',
      location: 'Property conditions',
      sampleId: '',
      details: particulateMatter,
      source: 'Property Details'
    });
  }

  if (testValuePresent(water.pfasStatus) || testValuePresent(water.pfasSampleId) || testValuePresent(device.pfasSetup) || testValuePresent(device.pfasKitNum) || shipping.pfasShip) {
    add({
      type: 'PFAS',
      status: water.pfasStatus || (shipping.pfasShip ? 'Prepared for shipping' : (isAffirmative(device.pfasSetup) ? 'Set up' : device.pfasSetup)),
      location: water.pfasLocation || insp.postTestLocPFAS || (isAffirmative(device.pfasSetup) ? 'Kitchen faucet' : ''),
      sampleId: water.pfasSampleId || insp.pfasSampleId || device.pfasKitNum || insp.pfasKitNum,
      details: [device.notes, shipping.pfasShip ? 'Shipping checklist complete' : ''].filter(Boolean).join(' · '),
      source: water.roomName || device.roomName || 'Device Setup'
    });
  }

  if (testValuePresent(water.microplasticsStatus) || testValuePresent(water.microplasticsSampleId) || shipping.microplasticsShip) {
    add({
      type: 'Microplastics',
      status: water.microplasticsStatus || (shipping.microplasticsShip ? 'Prepared for shipping' : 'Recorded'),
      location: water.microplasticsLocation || insp.postTestLocMicroplastics || water.waterFaucetLocation,
      sampleId: water.microplasticsSampleId || insp.microplasticsSampleId,
      details: shipping.microplasticsShip ? 'Shipping checklist complete' : water.notes,
      source: water.roomName || 'Water Samples'
    });
  }

  Object.entries(steps).forEach(([stepId, step]) => {
    if (!step || typeof step !== 'object') return;
    const room = step.roomName || step._roomName || stepId;
    if (isAffirmative(step.breezeDone)) {
      add({
        type: 'Breeze ET (Mold)',
        status: 'Conducted',
        location: step.breezeLocation || room,
        sampleId: step.breezeSampleId,
        details: room !== step.breezeLocation ? `Room: ${room}` : '',
        source: room
      });
    }
    if (isAffirmative(step.qtrakCaptured) || step.qtrakOutdoorDone === true) {
      add({
        type: 'Q-Trak / Air Data',
        status: 'Captured',
        location: step.qtrakLocation || (step.qtrakOutdoorDone ? 'Outdoor control' : room),
        sampleId: '',
        details: step.qtrakOutdoorDone ? 'Outdoor control reading' : '',
        source: room
      });
    }
  });

  const arrival = steps.arrival || {};
  const debrief = steps.debrief || {};
  if (testValuePresent(arrival.boulderBlueSampleId) || testValuePresent(arrival.boulderBlueTestLocation) || testValuePresent(arrival.boulderBlueStartTime) || testValuePresent(debrief.boulderBlueEndTime) || shipping.boulderBlueShip) {
    add({
      type: 'Boulder Blue (Allergen)',
      status: shipping.boulderBlueShip ? 'Prepared for shipping' : 'Recorded',
      location: arrival.boulderBlueTestLocation || insp.boulderBlueTestLocation || insp.postTestLocBoulderBlue,
      sampleId: arrival.boulderBlueSampleId || insp.boulderBlueSampleId,
      details: [
        arrival.boulderBlueStartTime ? `Start ${arrival.boulderBlueStartTime}` : '',
        debrief.boulderBlueEndTime ? `End ${debrief.boulderBlueEndTime}` : '',
        debrief.boulderBlueTestDuration ? `Duration ${debrief.boulderBlueTestDuration}` : '',
        shipping.boulderBlueShip ? 'Shipping checklist complete' : ''
      ].filter(Boolean).join(' · '),
      source: arrival.roomName || 'Arrival & Setup'
    });
  }

  const radon = steps.radon || {};
  const radonLocations = [];
  if (Array.isArray(radon.radonMonitors)) {
    radon.radonMonitors.forEach(monitor => radonLocations.push({
      location: monitor.location || monitor.roomName,
      sampleId: monitor.sampleId || monitor.serialNumber,
      details: monitor.notes || ''
    }));
  }
  [
    { location: radon.radonLocation || insp.radonMonitorLocation, sampleId: radon.radonSampleId || insp.radonSampleId, details: 'Monitor 1' },
    { location: radon.secondMonitorLocation || insp.secondRadonMonitorLocation, sampleId: radon.secondRadonSampleId || insp.secondRadonSampleId, details: 'Monitor 2' }
  ].forEach(monitor => {
    if (testValuePresent(monitor.location) && !/^n\/?a$/i.test(String(monitor.location).trim())) radonLocations.push(monitor);
  });
  if (radonLocations.length) {
    radonLocations.forEach(monitor => add({
      type: 'Radon',
      status: confirmed.testRadon ? 'Conducted' : 'Monitor placed',
      location: monitor.location,
      sampleId: monitor.sampleId,
      details: monitor.details,
      source: radon.roomName || 'Radon Monitor Setup'
    }));
  } else if (radon._visited || testValuePresent(radon.radonLocation)) {
    add({
      type: 'Radon',
      status: 'Not conducted',
      location: radon.radonLocation,
      sampleId: '',
      details: radon.notes,
      source: radon.roomName || 'Radon Monitor Setup'
    });
  }

  let moldRecordCount = 0;
  Object.entries(steps).forEach(([stepId, step]) => {
    if (!step || typeof step !== 'object') return;
    const room = step.roomName || step._roomName || stepId;
    ['moldSamples', 'moldSwabs'].forEach(key => {
      if (!Array.isArray(step[key])) return;
      step[key].forEach((sample, index) => {
        if (!sample || typeof sample !== 'object') return;
        moldRecordCount += 1;
        add({
          type: 'Mold Swab',
          status: sample.status || 'Collected',
          location: sample.location || sample.roomName || room,
          sampleId: sample.sampleId || sample.id,
          details: sample.notes || `Sample ${index + 1}`,
          source: room
        });
      });
    });
    Object.entries(step).forEach(([key, value]) => {
      const match = key.match(/^mold(?:Swab|Sample)(?:Location)?(\d*)$/i) || key.match(/^moldSwabLocation(\d*)$/i);
      if (!match || !testValuePresent(value) || typeof value === 'object') return;
      const index = match[1] || '1';
      moldRecordCount += 1;
      add({
        type: 'Mold Swab',
        status: 'Collected',
        location: value || room,
        sampleId: step[`moldSwabSampleId${index}`] || step[`moldSampleId${index}`] || step.moldSwabSampleId || step.moldSampleId,
        details: `Room: ${room}`,
        source: room
      });
    });
  });
  const confirmedMoldCount = Number(insp.moldSwabSampleCount || steps['final-checks']?.moldSwabSampleCount || 0);
  if (confirmedMoldCount > moldRecordCount || (confirmed.testMoldSwabs && moldRecordCount === 0)) {
    add({
      type: 'Mold Swabs',
      status: 'Confirmed',
      location: insp.postTestLocMold,
      sampleId: insp.moldSwabSampleId,
      details: confirmedMoldCount ? `${confirmedMoldCount} sample${confirmedMoldCount === 1 ? '' : 's'}` : '',
      source: 'Before Leaving confirmation'
    });
  }

  const typeMatchers = {
    testBreeze: /Breeze/i,
    testBoulderBlue: /Boulder Blue/i,
    testWaterPanel: /Water Panel/i,
    testPFAS: /^PFAS$/i,
    testMicroplastics: /Microplastics/i,
    testRadon: /^Radon$/i,
    testATP: /^ATP$/i,
    testMoldSwabs: /Mold Swab/i
  };
  TEST_DEFS.forEach(test => {
    if (!confirmed[test.key] || records.some(record => typeMatchers[test.key]?.test(record.type))) return;
    add({
      type: test.label,
      status: 'Confirmed complete',
      location: insp[`postTestLoc${test.label.replace(/\W/g, '')}`] || insp.reviewedData?.[`${test.key}_location`],
      sampleId: insp[test.sampleKey],
      details: '',
      source: 'Before Leaving confirmation'
    });
  });

  return records;
}

function renderAutoTestSummary(insp) {
  const wrap = qs('#tests-auto-summary');
  if (!wrap) return;
  wrap.innerHTML = '';
  const records = collectTestSampleRecords(insp);
  const completed = records.filter(record => !/not conducted|not requested|not recorded/i.test(record.status)).length;

  wrap.appendChild(el('div', { class: 'tests-summary-heading' },
    el('div', {},
      el('h3', {}, 'Inspection Test & Sample Summary'),
      el('p', {}, 'Auto-populated from every inspector app step. No manual re-entry required.')
    ),
    el('div', { class: 'tests-summary-counts' },
      el('strong', {}, `${records.length}`),
      el('span', {}, `${completed} active / completed`)
    )
  ));

  if (!records.length) {
    wrap.appendChild(el('p', { class: 'empty-state' }, 'No tests or samples have been recorded in the inspector app yet.'));
    return;
  }

  const tableWrap = el('div', { class: 'tests-summary-table-wrap' });
  const table = el('table', { class: 'tests-summary-table' });
  table.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'Test / Sample'),
    el('th', {}, 'Status'),
    el('th', {}, 'Location'),
    el('th', {}, 'Sample / Kit ID'),
    el('th', {}, 'Details'),
    el('th', {}, 'App Source')
  )));
  const tbody = el('tbody');
  records.forEach(record => {
    const statusClass = /not conducted|not requested|not recorded/i.test(record.status)
      ? 'not-done'
      : /requested|set up|monitor placed/i.test(record.status) ? 'in-progress' : 'done';
    tbody.appendChild(el('tr', {},
      el('td', { class: 'tests-summary-type' }, record.type),
      el('td', {}, el('span', { class: `tests-summary-status ${statusClass}` }, record.status)),
      el('td', {}, record.location),
      el('td', { class: 'tests-summary-id' }, record.sampleId),
      el('td', {}, record.details),
      el('td', { class: 'tests-summary-source' }, record.source)
    ));
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);
}

function renderFieldTestRecords(insp) {
  const wrap = qs('#field-test-records');
  if (!wrap) return;
  wrap.innerHTML = '';

  const buildRecord = (title, status, fields) => {
    const card = el('div', { class: 'field-test-record' },
      el('div', { class: 'field-test-record-header' },
        el('strong', {}, title),
        el('span', { class: 'field-test-record-status' }, status)
      )
    );
    const grid = el('div', { class: 'field-test-record-grid' });
    fields.forEach(([label, value]) => {
      grid.appendChild(el('div', { class: 'field-test-record-item' },
        el('span', {}, label),
        el('strong', {}, sourceDisplayValue(value))
      ));
    });
    card.appendChild(grid);
    return card;
  };

  const atp = insp.stepData?.['atp-kitchen'] || {};
  const water = insp.stepData?.['water-sample'] || {};

  wrap.appendChild(buildRecord('ATP Testing', atp._completedAt ? 'Captured in app' : 'Not completed', [
    ['Surface tested', atp.atpSurface || atp.atpSurfaceOther],
    ['Pre-test RLU', atp.atpPreRLU],
    ['Pre-test status', atp.atpPreStatus],
    ['Cleaned', atp.atpCleaned],
    ['Post-test RLU', atp.atpPostRLU],
    ['Post-test status', atp.atpPostStatus],
    ['Inspector notes', atp.notes]
  ]));

  wrap.appendChild(buildRecord('Water Samples', water._visited ? 'Captured in app' : 'Not visited', [
    ['Water panel planned', water.waterPanelPlanned || insp.waterPanelPlanned],
    ['Water panel collected', water.waterPanelCollected],
    ['Sample ID', insp.waterSampleId],
    ['Collection location', insp.postTestLocWater],
    ['Water source', insp.waterSource],
    ['Inspector notes', water.notes]
  ]));
}

function renderTestsSection(insp, locked) {
  renderAutoTestSummary(insp);
  renderFieldTestRecords(insp);
  const tbody = qs('#tests-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const reviewedTests = insp.reviewedData?.tests || {};

  for (const test of TEST_DEFS) {
    const tr = document.createElement('tr');
    const sampleVal    = reviewedTests[test.sampleKey] ?? insp.reviewedData?.[test.sampleKey] ?? insp[test.sampleKey] ?? '';
    const locationVal  = reviewedTests[test.key + '_location'] ?? insp.reviewedData?.[test.key + '_location'] ?? '';
    const notesVal     = reviewedTests[test.key + '_notes'] ?? insp.reviewedData?.[test.key + '_notes'] ?? '';
    const isConfirmed  = isTestConfirmedForReview(insp, test.key);

    const qtyVal = reviewedTests[test.key + '_qty'] ?? insp.reviewedData?.[test.key + '_qty'] ?? insp[test.key + '_qty'] ?? '';
    if (test.key === 'testATP') {
      const atp = insp.stepData?.['atp-kitchen'] || {};
      const surface = reviewedTests.testATP_surface ?? insp.reviewedData?.testATP_surface ?? atp.atpSurface ?? atp.atpSurfaceOther ?? '';
      const pre = reviewedTests.testATP_preRLU ?? insp.reviewedData?.testATP_preRLU ?? atp.atpPreRLU ?? '';
      const preStatus = reviewedTests.testATP_preStatus ?? insp.reviewedData?.testATP_preStatus ?? atp.atpPreStatus ?? '';
      const post = reviewedTests.testATP_postRLU ?? insp.reviewedData?.testATP_postRLU ?? atp.atpPostRLU ?? '';
      const postStatus = reviewedTests.testATP_postStatus ?? insp.reviewedData?.testATP_postStatus ?? atp.atpPostStatus ?? '';
      const cleaned = reviewedTests.testATP_cleaned ?? insp.reviewedData?.testATP_cleaned ?? atp.atpCleaned ?? '';
      const atpNotes = reviewedTests.testATP_notes ?? insp.reviewedData?.testATP_notes ?? atp.notes ?? '';
      tr.className = 'atp-test-row';
      tr.innerHTML = `
        <td class="test-name">ATP</td>
        <td colspan="5">
          <div class="atp-review-grid">
            <label><span>Surface tested</span><input type="text" class="inline-input" data-step="tests" data-field="testATP_surface" value="${escapeHTML(surface)}" ${locked ? 'readonly' : ''}></label>
            <label><span>Pre-test RLU</span><input type="number" class="inline-input" data-step="tests" data-field="testATP_preRLU" value="${escapeHTML(pre)}" ${locked ? 'readonly' : ''}></label>
            <label><span>Pre-test status</span><input type="text" class="inline-input" data-step="tests" data-field="testATP_preStatus" value="${escapeHTML(preStatus)}" ${locked ? 'readonly' : ''}></label>
            <label><span>Cleaned</span><input type="text" class="inline-input" data-step="tests" data-field="testATP_cleaned" value="${escapeHTML(cleaned)}" ${locked ? 'readonly' : ''}></label>
            <label><span>Post-test RLU</span><input type="number" class="inline-input" data-step="tests" data-field="testATP_postRLU" value="${escapeHTML(post)}" ${locked ? 'readonly' : ''}></label>
            <label><span>Post-test status</span><input type="text" class="inline-input" data-step="tests" data-field="testATP_postStatus" value="${escapeHTML(postStatus)}" ${locked ? 'readonly' : ''}></label>
            <label class="atp-review-notes"><span>Notes</span><input type="text" class="inline-input" data-step="tests" data-field="testATP_notes" value="${escapeHTML(atpNotes)}" ${locked ? 'readonly' : ''}></label>
            <label class="atp-review-confirm"><input type="checkbox" data-step="tests" data-field="testATP_confirmed" ${isConfirmed ? 'checked' : ''} ${locked ? 'disabled' : ''}> Confirmed</label>
          </div>
        </td>`;
    } else {
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
    }

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

function placementNameKey(value) {
  return String(value || '').trim().toLowerCase();
}

function placementRecordIsRoom(record) {
  const stepId = placementNameKey(record?.stepId);
  const type = placementNameKey(record?.room?.type || record?.step?.type);
  const name = placementNameKey(record?.room?.roomName || record?.step?.roomName || record?.stepId);
  if (/(bedroom|bathroom|additional-room|room-test)/.test(type)) return true;
  if (/^(bedroom-|bathroom-|lowest-room-|additional-room-)/.test(stepId)) return true;
  return ['attic', 'crawl space', 'living room', 'laundry room', 'utility room', 'kitchen'].includes(name);
}

function buildPhotoPlacementDestinations(insp) {
  const rooms = new Map();
  const tasks = new Map();
  const taskNames = new Set();
  const addRoom = roomName => {
    const room = String(roomName || '').trim();
    if (!room) return;
    const key = photoPlacementKey(room, '');
    if (!rooms.has(key)) rooms.set(key, { key, roomName: room, stepName: '', label: room });
  };
  const addTask = (roomName, stepName, customLabel = '') => {
    const room = String(roomName || '').trim();
    const task = String(stepName || '').trim();
    if (!task) return;
    if (room && placementNameKey(room) === placementNameKey(task)) return;
    const key = photoPlacementKey(room, task);
    if (!tasks.has(key)) {
      tasks.set(key, {
        key,
        roomName: room,
        stepName: task,
        label: customLabel || `${task}${room ? ` — ${room}` : ''}`
      });
    }
  };

  buildReviewRoomRecords(insp).forEach(record => {
    const name = record.room?.roomName || record.step?.roomName || record.stepId;
    if (placementRecordIsRoom(record)) addRoom(name);
    else {
      taskNames.add(placementNameKey(name));
      addTask('', name);
    }
  });
  (insp.photos || []).forEach(photo => {
    [
      { roomName: photo.originalRoomName, stepName: photo.originalStepName },
      { roomName: photo.roomName, stepName: photo.stepName }
    ].forEach(destination => {
      const roomIsTask = taskNames.has(placementNameKey(destination.roomName));
      if (!roomIsTask) addRoom(destination.roomName);
      addTask(roomIsTask ? '' : destination.roomName, destination.stepName || (roomIsTask ? destination.roomName : ''));
    });
  });
  addRoom('Kitchen');
  addRoom('Utility Room');
  STANDARD_ROOM_CHOICES.forEach(addRoom);

  const hasWaterEquipment = (insp.photos || []).some(photo =>
    /utility room/i.test(String(photo.roomName || '')) ||
    /water filtration|water treatment|uv system/i.test(String(photo.stepName || ''))
  );
  if (hasWaterEquipment) {
    addRoom('Utility Room');
    addTask('Utility Room', 'Water Treatment System', 'Water Treatment System — Utility Room');
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

function photoAuditText(photo = {}) {
  return [
    photo.roomName,
    photo.stepName,
    photo.originalRoomName,
    photo.originalStepName,
    photo.caption,
    photo.photoId
  ].filter(Boolean).join(' ').toLowerCase();
}

function classifyPhotoEvidenceRoles(photo) {
  const text = photoAuditText(photo);
  const roles = [];
  if (/\batp\b|adenosine|rlu|pre[-\s]?test|post[-\s]?test/.test(text)) roles.push('ATP');
  if (/\bbefore\b|pre[-\s]?clean|pre[-\s]?test|pretest/.test(text)) roles.push('Before');
  if (/\bafter\b|post[-\s]?clean|post[-\s]?test|posttest/.test(text)) roles.push('After');
  if (/flir|thermal|infrared/.test(text)) roles.push('FLIR');
  if (/q[-\s]?trak|qtrak|co2|particulate|humidity|temperature/.test(text)) roles.push('Q-Trak');
  if (/breeze/.test(text)) roles.push('Breeze');
  if (/pfas/.test(text)) roles.push('PFAS');
  if (/water|sample|microplastic|boulder blue|radon|swab|coc|chain of custody|kit/.test(text)) roles.push('Sample');
  return Array.from(new Set(roles));
}

function genericPhotoDestinationName(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  return /^(photos?|photo log|before|after|before after|before and after|field tests?|test photos?|sample photos?|water samples?|kitchen inspection|post assessment|final checks|arrival setup|device setup|exterior assessment)$/.test(text);
}

function suggestedPhotoRoom(photo) {
  const text = photoAuditText(photo);
  if (/kitchen|dishwasher|refrigerator|fridge|stove|sink|range|oven|atp/.test(text)) return 'Kitchen';
  if (/utility|hvac|furnace|filter|air handler|mechanical|water treatment|softener|filtration|uv system/.test(text)) return 'Utility Room';
  if (/basement/.test(text)) return 'Basement';
  if (/bathroom|toilet|shower|tub|vanity/.test(text)) return 'Bathroom';
  if (/bedroom|primary|guest|upper|lower/.test(text)) return 'Bedroom';
  const sourceRoom = String(photo.originalRoomName || '').trim();
  if (sourceRoom && !genericPhotoDestinationName(sourceRoom)) return sourceRoom;
  return '';
}

function buildPhotoPlacementAudit(insp, photos) {
  const destinations = buildPhotoPlacementDestinations(insp);
  const roomNames = new Set(destinations.rooms.map(destination => placementNameKey(destination.roomName)));
  const needsRealRoomRoles = new Set(['ATP', 'Before', 'After', 'FLIR', 'Q-Trak', 'Breeze']);
  const evidence = [];

  (photos || [])
    .filter(photo => photo.included !== false)
    .forEach(photo => {
      const roles = classifyPhotoEvidenceRoles(photo);
      if (!roles.length) return;
      const roomName = String(photo.roomName || '').trim();
      const stepName = String(photo.stepName || '').trim();
      const hasDestination = Boolean(roomName || stepName);
      const requiresRealRoom = roles.some(role => needsRealRoomRoles.has(role));
      const hasRealRoom = roomNames.has(placementNameKey(roomName));
      const genericRoom = genericPhotoDestinationName(roomName);
      const needsAttention =
        !hasDestination ||
        (requiresRealRoom && (!hasRealRoom || genericRoom));

      evidence.push({
        photo,
        roles,
        needsAttention,
        destination: [roomName, stepName].filter(Boolean).join(' / ') || 'Not assigned',
        suggested: suggestedPhotoRoom(photo)
      });
    });

  return {
    evidence,
    needsAttention: evidence.filter(item => item.needsAttention),
    placedCount: evidence.filter(item => !item.needsAttention).length
  };
}

function focusPhotoForPlacement(photoId) {
  if (!photoId || !_inspection) return;
  _activeFilter = 'all';
  _activeRoomFilter = 'all';
  const roomFilter = qs('#room-filter');
  if (roomFilter) roomFilter.value = 'all';
  qsa('.filter-btn').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === 'all');
  });
  const submittedState = getServerSubmittedReviewState(_inspection);
  renderPhotoGrid(_inspection.photos || [], submittedState.submitted || submittedState.statusSubmitted);
  window.requestAnimationFrame(() => {
    const escaped = window.CSS?.escape ? window.CSS.escape(photoId) : String(photoId).replace(/["\\]/g, '\\$&');
    const card = qs(`.photo-card[data-photo-id="${escaped}"]`);
    if (card) highlightFinishTarget(card);
  });
}

function renderPhotoPlacementAudit(insp, photos) {
  const mount = qs('#photo-placement-audit');
  if (!mount) return;
  mount.innerHTML = '';

  const audit = buildPhotoPlacementAudit(insp, photos);
  const ready = audit.needsAttention.length === 0;
  mount.className = `photo-placement-audit ${ready ? 'ready' : 'needs-work'}`;

  mount.appendChild(el('div', { class: 'photo-placement-audit-header' },
    el('div', {},
      el('div', { class: 'photo-placement-audit-title' }, 'Photo Placement Audit'),
      el('div', { class: 'photo-placement-audit-subtitle' }, 'Checks important evidence photos before Tanner gets the package.')
    ),
    el('div', { class: 'photo-placement-audit-count' },
      `${audit.placedCount}/${audit.evidence.length || 0} placed`
    )
  ));

  if (!audit.evidence.length) {
    mount.appendChild(el('div', { class: 'photo-placement-audit-empty' },
      'No key evidence photos were detected in the current photo set.'
    ));
    return;
  }

  if (!audit.needsAttention.length) {
    mount.appendChild(el('div', { class: 'photo-placement-audit-empty' },
      'All detected key evidence photos have a usable destination.'
    ));
    return;
  }

  const list = el('div', { class: 'photo-placement-audit-list' });
  audit.needsAttention.slice(0, 12).forEach(item => {
    const button = el('button', {
      class: 'photo-placement-audit-row',
      type: 'button',
      'data-photo-id': item.photo.photoId
    },
      el('span', { class: 'photo-placement-audit-role' }, item.roles.join(', ')),
      el('span', { class: 'photo-placement-audit-main' },
        item.photo.caption || item.photo.stepName || item.photo.photoId || 'Photo needs placement'
      ),
      el('span', { class: 'photo-placement-audit-destination' },
        item.suggested
          ? `${item.destination} - suggested: ${item.suggested}`
          : item.destination
      )
    );
    button.addEventListener('click', () => focusPhotoForPlacement(item.photo.photoId));
    list.appendChild(button);
  });
  mount.appendChild(list);

  if (audit.needsAttention.length > 12) {
    mount.appendChild(el('div', { class: 'photo-placement-audit-overflow' },
      `${audit.needsAttention.length - 12} more photo${audit.needsAttention.length - 12 === 1 ? '' : 's'} need placement attention.`
    ));
  }
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
  setupBulkPhotoReview(insp, locked);
  renderPhotoPlacementAudit(insp, photos);

  // Build room filter options
  const roomSelect = qs('#room-filter');
  if (roomSelect) {
    const rooms = [...new Set([
      ...photos.map(p => p.roomName).filter(Boolean),
      ...STANDARD_ROOM_CHOICES
    ])].sort((a, b) => a.localeCompare(b));
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

function setupBulkPhotoReview(insp, locked) {
  const button = qs('#include-all-unreviewed');
  if (!button) return;
  button.style.display = locked ? 'none' : '';
  if (locked) return;

  const updateButton = () => {
    const count = (insp.photos || []).filter(photo => photo.included === null).length;
    button.disabled = count === 0;
    button.textContent = count === 0
      ? '✓ All photos reviewed'
      : `✓ Include ${count} unreviewed photo${count === 1 ? '' : 's'}`;
  };
  updateButton();

  button.onclick = async () => {
    const unreviewed = (insp.photos || []).filter(photo => photo.included === null);
    if (!unreviewed.length) return;
    if (!confirm(
      `Include all ${unreviewed.length} currently unreviewed photos?\n\n` +
      'You can still exclude individual photos afterward.'
    )) return;

    button.disabled = true;
    button.textContent = `Saving ${unreviewed.length} photos…`;
    const priorIds = Array.isArray(insp.reviewedData?.bulkIncludedPhotoIds)
      ? insp.reviewedData.bulkIncludedPhotoIds
      : [];
    const bulkIncludedPhotoIds = Array.from(new Set([
      ...priorIds,
      ...unreviewed.map(photo => photo.photoId)
    ]));
    unreviewed.forEach(photo => { photo.included = true; });
    const saved = await saveField('summary', 'bulkIncludedPhotoIds', bulkIncludedPhotoIds);
    renderPhotoGrid(insp.photos || [], false);
    checkGate();
    updateButton();
    showToast(
      saved
        ? `${unreviewed.length} photos included`
        : 'Photo decisions kept in local recovery; cloud save needs a retry',
      saved ? 'success' : 'info'
    );
  };
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

  syncAllPhotoRotations();

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

  const evidenceRoles = classifyPhotoEvidenceRoles(photo);
  if (evidenceRoles.length) {
    const singleAudit = buildPhotoPlacementAudit(_inspection || {}, [photo]);
    const needsPlacement = singleAudit.needsAttention.length > 0;
    const destination = [photo.roomName, photo.stepName].filter(Boolean).join(' / ') || 'Not assigned';
    info.appendChild(el('div', {
      class: `photo-evidence-status ${needsPlacement ? 'needs-work' : 'ready'}`
    },
      el('span', { class: 'photo-evidence-role' }, evidenceRoles.join(', ')),
      el('span', { class: 'photo-evidence-copy' },
        needsPlacement ? `Needs placement - ${destination}` : `Placed - ${destination}`
      )
    ));
  }

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
  captionWrap.appendChild(el('label', { class: 'photo-caption-label' }, 'Review caption — editable'));
  const captionTA = el('textarea', {
    placeholder: 'Add or correct the caption shown in the review and report…',
    rows: '2',
    'data-photo-id': photo.photoId,
    ...(locked ? { readonly: '' } : {})
  });
  captionTA.value = photo.caption || '';
  if (!locked) {
    captionTA.addEventListener('blur', async () => {
      const newCaption = captionTA.value.trim();
      if (newCaption === String(photo.caption || '').trim()) return;
      await saveReviewedPhotoCaption(photo.photoId, newCaption);
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
        const resp = await visionProxyFetch({ imageUrl: photo.driveUrl, prompt });
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
    const rooms = roomRecords.length;
    const reviewedRooms = roomRecords.filter(record => roomReviewStatus(record, _inspection).complete).length;
    elRev.textContent = reviewedRooms;
    if (elRooms) elRooms.textContent = rooms;
  }
}

/* ============================================================
   PHOTO MODAL
   ============================================================ */

const PHOTO_ANNOTATION_COLOR = '#ef4444';
const PHOTO_ANNOTATION_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'White', value: '#ffffff' },
  { name: 'Blue', value: '#3b82f6' }
];
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
    photoAnnotationButton('↶ Rotate', 'Rotate photo 90 degrees left', { 'data-action': 'rotate-left' }),
    photoAnnotationButton('Rotate ↷', 'Rotate photo 90 degrees right', { 'data-action': 'rotate-right' }),
    photoAnnotationButton('Arrow', 'Arrow tool', { 'data-tool': 'arrow' }),
    photoAnnotationButton('Circle', 'Circle tool', { 'data-tool': 'circle' }),
    el('span', { class: 'photo-annotation-color-label' }, 'Color'),
    ...PHOTO_ANNOTATION_COLORS.map(color => photoAnnotationButton('', `${color.name} annotation color`, {
      class: 'photo-annotation-color',
      'data-color': color.value,
      style: `--annotation-color:${color.value}`
    })),
    photoAnnotationButton('Undo', 'Undo last annotation', { 'data-action': 'undo' }),
    photoAnnotationButton('Clear', 'Clear annotations', { 'data-action': 'clear' }),
    photoAnnotationButton('Save now', 'Save annotations now', { class: 'photo-annotation-btn save', 'data-action': 'save' }),
    el('span', { class: 'photo-annotation-status', 'data-annotation-status': '' }, '')
  );

  toolbar.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    if (!btn || !_photoModalState) return;
    const tool = btn.dataset.tool;
    const color = btn.dataset.color;
    const action = btn.dataset.action;

    if (tool) {
      _photoModalState.tool = tool;
      updatePhotoAnnotationToolbar();
      return;
    }

    if (color) {
      _photoModalState.color = color;
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

    if (action === 'rotate-left' || action === 'rotate-right') {
      const delta = action === 'rotate-left' ? -90 : 90;
      const rotation = normalizePhotoRotation((_photoModalState.rotation || 0) + delta);
      toolbar.querySelectorAll('[data-action^="rotate-"]').forEach(button => { button.disabled = true; });
      _photoModalState.rotation = rotation;
      configurePhotoAnnotationCanvas(_photoModalState);
      redrawPhotoAnnotationCanvas();
      const saved = await saveReviewedPhotoRotation(_photoModalState.photoId, rotation);
      toolbar.querySelectorAll('[data-action^="rotate-"]').forEach(button => { button.disabled = false; });
      const status = toolbar.querySelector('[data-annotation-status]');
      if (!saved && status) status.textContent = 'Rotation save failed';
      return;
    }

    if (action === 'save') {
      await saveCurrentPhotoAnnotations();
    }
  });

  return toolbar;
}

function updatePhotoAnnotationToolbar() {
  if (!_photoModalState?.toolbar) return;
  const { toolbar, tool, color, annotations, dirty, photoId } = _photoModalState;
  toolbar.querySelectorAll('[data-tool]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  toolbar.querySelectorAll('[data-color]').forEach(btn => {
    const selected = btn.dataset.color === color;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
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
        ? 'Will save automatically on close'
        : `${annotations.length} saved`;
  }
}

function pointFromCanvasEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = rect.width ? (event.clientX - rect.left) / rect.width : 0;
  const y = rect.height ? (event.clientY - rect.top) / rect.height : 0;
  const rotation = normalizePhotoRotation(_photoModalState?.rotation || 0);
  const point = rotation === 90 ? { x: y, y: 1 - x }
    : rotation === 180 ? { x: 1 - x, y: 1 - y }
      : rotation === 270 ? { x: 1 - y, y: x }
        : { x, y };
  return {
    x: Math.max(0, Math.min(1, point.x)),
    y: Math.max(0, Math.min(1, point.y))
  };
}

function drawPhotoAnnotation(ctx, annotation, draft = false, logicalWidth = ctx.canvas.width, logicalHeight = ctx.canvas.height) {
  if (!annotation?.points?.length || annotation.points.length < 2) return;
  const width = logicalWidth;
  const height = logicalHeight;
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
  const { ctx, canvas, image, annotations, draft, baseWidth, baseHeight } = state;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  const rotation = normalizePhotoRotation(state.rotation || 0);
  if (rotation === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate(Math.PI);
  } else if (rotation === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(image, 0, 0, baseWidth, baseHeight);
  annotations.forEach(annotation => drawPhotoAnnotation(ctx, annotation, false, baseWidth, baseHeight));
  if (draft) drawPhotoAnnotation(ctx, draft, true, baseWidth, baseHeight);
  ctx.restore();
}

function configurePhotoAnnotationCanvas(state) {
  if (!state?.canvas || !state.baseWidth || !state.baseHeight) return;
  const sideways = normalizePhotoRotation(state.rotation || 0) % 180 !== 0;
  state.canvas.width = sideways ? state.baseHeight : state.baseWidth;
  state.canvas.height = sideways ? state.baseWidth : state.baseHeight;
  state.canvas.dataset.photoRotation = String(normalizePhotoRotation(state.rotation || 0));
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
      color: state.color || PHOTO_ANNOTATION_COLOR,
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

async function saveCurrentPhotoAnnotations(options = {}) {
  const state = options.state || _photoModalState;
  const notify = options.notify !== false;
  if (!state?.photoId) {
    if (notify) showToast('Cannot save annotation without a photo ID', 'error');
    return false;
  }
  setPhotoAnnotations(state.photoId, state.annotations);
  const saved = await saveField(
    'photoAnnotations',
    state.photoId,
    _inspection.reviewedData.photoAnnotations[state.photoId]
  );
  if (saved) state.dirty = false;
  if (state === _photoModalState) updatePhotoAnnotationToolbar();
  if (saved && notify) showToast('Photo annotations saved', 'success');
  return saved;
}

async function savePhotoModalPendingEdits(state, options = {}) {
  if (!state?.photoId) return { hadChanges: false, saved: true };
  const notify = options.notify !== false;
  const caption = String(state.captionInput?.value ?? state.caption ?? '').trim();
  const captionChanged = caption !== String(state.caption || '').trim();
  const annotationsChanged = state.dirty === true;
  const hadChanges = captionChanged || annotationsChanged;
  if (!hadChanges) return { hadChanges: false, saved: true };

  let captionSaved = true;
  let annotationsSaved = true;
  if (captionChanged) {
    captionSaved = await saveReviewedPhotoCaption(state.photoId, caption, { notify: false });
    if (captionSaved) state.caption = caption;
  }
  if (annotationsChanged) {
    annotationsSaved = await saveCurrentPhotoAnnotations({ state, notify: false });
  }

  const saved = captionSaved && annotationsSaved;
  if (notify) {
    showToast(
      saved
        ? 'Photo edits saved automatically'
        : 'Photo edits kept in local recovery; cloud save needs a retry',
      saved ? 'success' : 'info'
    );
  }
  return { hadChanges, saved };
}

function openPhotoModal(url, caption, photoId = '') {
  const currentPhoto = (_inspection?.photos || []).find(item => item.photoId === photoId);
  if (currentPhoto) {
    url = currentPhoto.driveUrl || url;
    caption = currentPhoto.caption ?? caption;
  }

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
    closeBtn.addEventListener('click', () => { void closePhotoModal(); });
    modal.appendChild(closeBtn);
  }
  closeBtn.disabled = false;

  if (!modal.dataset.clickBound) {
    modal.addEventListener('click', e => {
      if (e.target === modal) void closePhotoModal();
    });
    modal.dataset.clickBound = 'true';
  }

  inner.innerHTML = '';
  const toolbar = buildPhotoAnnotationToolbar();
  const canvasWrap = el('div', { class: 'photo-canvas-wrap' });
  const canvas = el('canvas', { class: 'photo-annotation-canvas', 'aria-label': caption || 'Photo annotation canvas' });
  const ctx = canvas.getContext('2d');
  canvasWrap.appendChild(canvas);
  inner.appendChild(toolbar);

  const captionEditor = el('div', { class: 'photo-modal-caption-editor' });
  const captionLabel = el('label', { class: 'photo-modal-caption-label' }, 'Review caption - edits update everywhere and save on close');
  const captionInput = el('textarea', {
    class: 'photo-modal-caption-input',
    rows: '2',
    'data-photo-id': photoId,
    placeholder: 'Add or correct the caption shown in the room and photo summary…'
  });
  captionInput.value = caption || '';
  const captionSave = el('button', { class: 'photo-modal-caption-save', type: 'button' }, 'Save now');
  const photoDelete = el('button', { class: 'photo-modal-delete', type: 'button' }, 'Delete everywhere');
  const captionStatus = el('span', { class: 'photo-modal-caption-status' }, '');
  captionSave.addEventListener('click', async () => {
    captionSave.disabled = true;
    captionSave.textContent = 'Saving…';
    const saved = await saveReviewedPhotoCaption(photoId, captionInput.value);
    captionSave.disabled = false;
    captionSave.textContent = 'Save now';
    captionStatus.textContent = saved ? 'Saved everywhere' : 'Save failed';
    captionStatus.className = `photo-modal-caption-status${saved ? ' saved' : ' failed'}`;
    if (saved && _photoModalState) _photoModalState.caption = captionInput.value.trim();
  });
  captionInput.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') captionSave.click();
  });
  photoDelete.addEventListener('click', async () => {
    if (!photoId || !confirm('Delete this photo everywhere in this review, including cloud storage?\n\nUse the small X on a report slot if you only want to remove it from one section. This cannot be undone.')) return;
    photoDelete.disabled = true;
    photoDelete.textContent = 'Deleting…';
    try {
      await deleteReviewedPhoto(photoId);
    } catch (err) {
      photoDelete.disabled = false;
      photoDelete.textContent = 'Delete everywhere';
      captionStatus.textContent = err.message || 'Delete failed';
      captionStatus.className = 'photo-modal-caption-status failed';
      showToast('Photo was not deleted — no review data changed', 'error');
    }
  });
  captionEditor.appendChild(captionLabel);
  captionEditor.appendChild(captionInput);
  captionEditor.appendChild(el('div', { class: 'photo-modal-caption-actions' }, captionSave, photoDelete, captionStatus));
  inner.appendChild(captionEditor);
  inner.appendChild(canvasWrap);

  const annotations = getPhotoAnnotations(photoId);
  const photo = currentPhoto;
  const image = new Image();
  const state = {
    photoId,
    url,
    caption,
    tool: 'arrow',
    color: PHOTO_ANNOTATION_COLOR,
    annotations,
    rotation: normalizePhotoRotation(photo?.rotation || 0),
    dirty: false,
    drawing: false,
    draft: null,
    startPoint: null,
    toolbar,
    canvas,
    ctx,
    image,
    imageLoaded: false,
    captionInput,
    captionStatus,
    captionSave,
    closeBtn,
    closing: false
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
    state.baseWidth = Math.max(1, Math.round(naturalW * scale));
    state.baseHeight = Math.max(1, Math.round(naturalH * scale));
    configurePhotoAnnotationCanvas(state);
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

async function closePhotoModal(options = {}) {
  const modal = qs('#photo-modal');
  const state = _photoModalState;
  const skipSave = options && options.skipSave === true;
  if (state?.closing) return state.closePromise;

  if (state && !skipSave) {
    state.closing = true;
    const hasPendingEdits = state.dirty === true ||
      String(state.captionInput?.value ?? '').trim() !== String(state.caption || '').trim();
    if (hasPendingEdits) {
      state.closeBtn.disabled = true;
      state.captionSave.disabled = true;
      state.toolbar.querySelectorAll('button').forEach(button => { button.disabled = true; });
      state.captionStatus.textContent = 'Saving before close…';
      state.captionStatus.className = 'photo-modal-caption-status';
      state.closePromise = savePhotoModalPendingEdits(state);
      await state.closePromise;
    }
  }

  if (modal) modal.classList.add('hidden');
  if (_photoModalState === state) _photoModalState = null;
  document.body.style.overflow = '';
  return true;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _photoModalState) {
    e.preventDefault();
    void closePhotoModal();
  }
});

/* ============================================================
   SECTION 2 — COMPLETENESS GATE
   ============================================================ */

function checkGate() {
  if (!_inspection) return;
  const results = evaluateGate(_inspection);
  renderGate(results);
  renderFinishTracker(results);
  updateSubmitButton(results);
}

function isTestConfirmedForReview(insp, testKey) {
  const reviewedValue = insp.reviewedData?.tests?.[`${testKey}_confirmed`];
  if (reviewedValue !== undefined) return reviewedValue === true;
  const legacyValue = insp.reviewedData?.[`${testKey}_confirmed`];
  if (legacyValue !== undefined) return legacyValue === true;
  return insp.testsConfirmed?.[testKey] === true;
}

function isConductedValue(value) {
  if (value === true) return true;
  return ['yes', 'true', 'done', 'completed', 'recorded'].includes(String(value || '').trim().toLowerCase());
}

function evaluateGate(insp) {
  const photos  = insp.photos  || [];
  const tests   = insp.testsConfirmed || {};
  const reviewed = insp.reviewedData || {};
  const roomRecords = buildReviewRoomRecords(insp);
  const placementAudit = buildPhotoPlacementAudit(insp, photos);

  // 1. Every room needs an explicit review outcome:
  // either the inspector notes were reviewed or "No issues found" was checked.
  const completedRooms = roomRecords.filter(record => roomReviewStatus(record, insp).complete);
  const notesReviewed = completedRooms.length === roomRecords.length;
  const firstUnreviewedRoom = roomRecords.find(record => !roomReviewStatus(record, insp).complete);
  const firstUnreviewedRoomState = firstUnreviewedRoom ? roomReviewStatus(firstUnreviewedRoom, insp) : null;

  // 2. Require locations only for tests actually conducted in that room.
  // A saved "Breeze: No" must not manufacture a missing Breeze location.
  const roomsWithLocs = roomRecords.filter(record => 'qtrakLocation' in record.step || 'breezeLocation' in record.step);
  let requiredLocations = 0;
  let recordedLocations = 0;
  let firstMissingLocation = null;
  roomsWithLocs.forEach(record => {
    const reviewedStep = reviewed[record.stepId] || {};
    const qtrakLocation = String(reviewedStep.qtrakLocation ?? record.step.qtrakLocation ?? '').trim();
    const breezeLocation = String(reviewedStep.breezeLocation ?? record.step.breezeLocation ?? '').trim();
    const qtrakRequired = isConductedValue(record.step.qtrakDone ?? record.step.qtrakCaptured) || qtrakLocation !== '';
    const breezeRequired = isConductedValue(record.step.breezeDone) || breezeLocation !== '';
    if (qtrakRequired) {
      requiredLocations++;
      if (qtrakLocation) recordedLocations++;
      else if (!firstMissingLocation) firstMissingLocation = { stepId: record.stepId, field: 'qtrakLocation' };
    }
    if (breezeRequired) {
      requiredLocations++;
      if (breezeLocation) recordedLocations++;
      else if (!firstMissingLocation) firstMissingLocation = { stepId: record.stepId, field: 'breezeLocation' };
    }
  });
  const locsRecorded = recordedLocations === requiredLocations;

  // 3. Tests conducted confirmation (at least one source or portal confirmation)
  const confirmedTestCount = TEST_DEFS.filter(test => isTestConfirmedForReview(insp, test.key)).length;
  const anyTestConfirmed = confirmedTestCount > 0;

  // 4. All photos marked Include or Exclude (none in unreviewed state)
  const reviewedPhotoCount = photos.filter(photo => photo.included !== null).length;
  const allPhotosReviewed = reviewedPhotoCount === photos.length;
  const keyEvidencePlaced = placementAudit.needsAttention.length === 0;

  // 5. Report Builder Notes filled in
  const reportNotesEl = qs('#field-report-notes');
  const reportNotes   = (reportNotesEl?.value ?? insp.reportBuilderNotes ?? '').trim();
  const notesNotEmpty = reportNotes.length > 0;

  // 6. Sample IDs recorded (water + boulder blue if those tests confirmed)
  const reviewedTests = reviewed.tests || {};
  const waterOk   = !isTestConfirmedForReview(insp, 'testWaterPanel') ||
    String(reviewedTests.waterSampleId ?? reviewed.waterSampleId ?? insp.waterSampleId ?? '').trim() !== '';
  const boulderOk = !isTestConfirmedForReview(insp, 'testBoulderBlue') ||
    String(reviewedTests.boulderBlueSampleId ?? reviewed.boulderBlueSampleId ?? insp.boulderBlueSampleId ?? '').trim() !== '';
  const samplesOk = waterOk && boulderOk;
  const health = _reviewDataHealth || {};
  const protectedLegacy = LEGACY_STATIC_FALLBACK_INSPECTION_IDS.has(insp.inspectionId || insp.id);
  const expectedBackendPhotos = Math.max(
    photos.length,
    Number(health.basePhotoCount) || 0,
    Number(health.basePhotos) || 0
  );
  const workerStatus = health.workerStatus && typeof health.workerStatus === 'object'
    ? health.workerStatus
    : {};
  const workerMissingPhotoCount = Array.isArray(workerStatus.missingPhotoIds)
    ? workerStatus.missingPhotoIds.length
    : 0;
  const workerStoredPhotos = Number(workerStatus.storedPhotos || workerStatus.databasePhotos || 0) || 0;
  const workerExpectedPhotos = Number(workerStatus.expectedPhotos || expectedBackendPhotos || 0) || 0;
  const workerStatusComplete = Boolean(
    health.workerStatusLoaded &&
    workerStatus.complete !== false &&
    workerMissingPhotoCount === 0 &&
    (workerExpectedPhotos === 0 || workerStoredPhotos > 0)
  );
  const workerStatusDetail = health.workerStatusLoaded
    ? `${workerStoredPhotos}/${workerExpectedPhotos || workerStoredPhotos} source photos confirmed${workerMissingPhotoCount ? ` · ${workerMissingPhotoCount} missing` : ''}`
    : (health.workerStatusError || 'Worker status receipt not confirmed');
  const backendGateResults = IS_DEMO ? [] : [
    {
      key: 'reviewStorage',
      label: 'Review storage connected',
      pass: Boolean(health.reviewStorageLoaded && !health.reviewStorageError),
      selector: '#data-health-banner',
      action: 'backendCheck'
    },
    {
      key: 'sourceSnapshot',
      label: 'Source inspection backed up for handoff',
      pass: Boolean(health.reviewStorageRecoveryAvailable || (protectedLegacy && health.usedLegacyStaticFallback)),
      selector: '#data-health-banner',
      action: 'backendCheck'
    },
    {
      key: 'photoService',
      label: expectedBackendPhotos
        ? `Photo service confirmed (${Number(health.workerPhotos) || 0}/${expectedBackendPhotos})`
        : 'Photo service checked',
      pass: expectedBackendPhotos === 0 || Number(health.workerPhotos) > 0,
      selector: '#photos-card',
      action: 'backendCheck'
    },
    {
      key: 'workerStatus',
      label: 'Source-photo receipt confirmed',
      pass: workerStatusComplete,
      selector: '#data-health-banner',
      action: 'backendCheck',
      detail: workerStatusDetail
    }
  ];

  return [
    ...backendGateResults,
    {
      key: 'notes',
      label: `Room review complete (${completedRooms.length}/${roomRecords.length})`,
      pass: notesReviewed,
      selector: firstUnreviewedRoom ? `.room-section[data-room-step-id="${firstUnreviewedRoom.stepId}"]` : '#rooms-container',
      focusSelector: firstUnreviewedRoom
        ? (firstUnreviewedRoomState?.hasNotes ? `#vr-${firstUnreviewedRoom.stepId}` : `#nif-${firstUnreviewedRoom.stepId}`)
        : ''
    },
    {
      key: 'locs',
      label: `All required test locations recorded (${recordedLocations}/${requiredLocations})`,
      pass: locsRecorded,
      selector: firstMissingLocation ? `.room-section[data-room-step-id="${firstMissingLocation.stepId}"]` : '#rooms-container',
      focusSelector: firstMissingLocation ? `[data-step="${firstMissingLocation.stepId}"][data-field="${firstMissingLocation.field}"]` : ''
    },
    {
      key: 'tests',
      label: `Tests conducted confirmation complete (${confirmedTestCount} confirmed)`,
      pass: anyTestConfirmed,
      selector: '.tests-review-details',
      action: 'openDetails'
    },
    {
      key: 'photos',
      label: `All photos marked Include or Exclude (${reviewedPhotoCount}/${photos.length})`,
      pass: allPhotosReviewed,
      selector: '#photos-card',
      action: 'unreviewedPhotos'
    },
    {
      key: 'photoPlacement',
      label: `Key evidence photos placed (${placementAudit.placedCount}/${placementAudit.evidence.length})`,
      pass: keyEvidencePlaced,
      selector: '#photos-card',
      action: 'reportPhotos'
    },
    {
      key: 'rbnotes',
      label: 'Report Builder Notes filled in',
      pass: notesNotEmpty,
      selector: '#field-report-notes',
      focusSelector: '#field-report-notes'
    },
    {
      key: 'samples',
      label: 'Sample IDs recorded',
      pass: samplesOk,
      selector: '.tests-review-details',
      focusSelector: !waterOk
        ? '[data-step="tests"][data-field="waterSampleId"]'
        : (!boulderOk ? '[data-step="tests"][data-field="boulderBlueSampleId"]' : ''),
      action: 'openDetails'
    }
  ];
}

function buildReviewReadinessReceipt(results = []) {
  const items = Array.isArray(results) ? results : [];
  const blockers = items
    .filter(item => !item.pass)
    .map(item => ({
      key: item.key || '',
      label: item.label || '',
      detail: item.detail || ''
    }));
  const passed = items.length - blockers.length;
  return {
    status: blockers.length ? 'blocked' : 'ready',
    passed,
    total: items.length,
    blockerCount: blockers.length,
    blockers,
    checkedAt: new Date().toISOString(),
    portalVersion: REVIEW_PORTAL_VERSION
  };
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
    const gateItem = el(item.pass ? 'div' : 'button', {
      class: `gate-item${item.pass ? '' : ' gate-item-link'}`,
      ...(item.pass ? {} : { type: 'button', 'aria-label': `Go to ${item.label}` })
    },
      el('div', { class: `gate-icon ${item.pass ? 'pass' : 'fail'}` }, item.pass ? '✓' : '✕'),
      el('span', { class: `gate-item-text ${item.pass ? 'pass' : 'fail'}` }, item.label),
      item.pass ? null : el('span', { class: 'gate-item-go' }, 'Go →')
    );
    if (!item.pass) gateItem.addEventListener('click', () => goToFinishItem(item));
    list.appendChild(gateItem);
  }
}

function setFinishTrackerOpen(open) {
  _finishTrackerOpen = open;
  const tracker = qs('#finish-tracker');
  if (tracker) tracker.classList.toggle('open', open);
  const toggle = qs('#finish-tracker-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function expandFinishTarget(target) {
  const details = target?.matches?.('details') ? target : target?.closest?.('details');
  if (details) details.open = true;

  const room = target?.matches?.('.room-section') ? target : target?.closest?.('.room-section');
  if (room) {
    const body = room.querySelector('.room-body');
    const icon = room.querySelector('.collapse-icon');
    if (body) body.style.display = '';
    if (icon) icon.style.transform = '';
  }

  const card = target?.matches?.('.card') ? target : target?.closest?.('.card');
  if (card) card.classList.remove('collapsed');
}

function highlightFinishTarget(target) {
  if (!target) return;
  target.classList.add('finish-target-highlight');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => target.classList.remove('finish-target-highlight'), 2600);
}

function goToFinishItem(item) {
  if (!item) return;
  setFinishTrackerOpen(false);

  if (item.action === 'unreviewedPhotos') {
    const roomFilter = qs('#room-filter');
    if (roomFilter) {
      roomFilter.value = 'all';
      _activeRoomFilter = 'all';
    }
    qs('[data-filter="unreviewed"]')?.click();
  } else if (item.action === 'reportPhotos') {
    const roomFilter = qs('#room-filter');
    if (roomFilter) {
      roomFilter.value = 'all';
      _activeRoomFilter = 'all';
    }
    qs('[data-filter="all"]')?.click();
  }

  let target = item.selector ? qs(item.selector) : null;
  if (target) expandFinishTarget(target);

  if (item.action === 'openDetails' && target?.matches?.('details')) {
    target.open = true;
  }

  if (item.action === 'reportPhotos') {
    const unassignedBadge = qs('.photo-assign-badge.not-assigned');
    target = unassignedBadge?.closest('.photo-card') || target;
  }

  const focusTarget = item.focusSelector ? qs(item.focusSelector) : null;
  if (focusTarget) {
    expandFinishTarget(focusTarget);
    target = focusTarget;
  }

  window.requestAnimationFrame(() => {
    highlightFinishTarget(target);
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus({ preventScroll: true });
    }
  });
}

function renderFinishTracker(results) {
  const existing = qs('#finish-tracker');
  if (existing) existing.remove();
  if (!_inspection || _currentPage !== 'review') return;

  const status = String(_inspection.status || '').toLowerCase();
  if (status === 'submitted to tanner' || status === 'report complete') return;

  const failures = results.filter(item => !item.pass);
  const passed = results.length - failures.length;
  const ready = failures.length === 0;

  const tracker = el('aside', {
    id: 'finish-tracker',
    class: `finish-tracker${_finishTrackerOpen ? ' open' : ''}`,
    'aria-label': 'Finish Review'
  });

  const toggle = el('button', {
    id: 'finish-tracker-toggle',
    class: `finish-tracker-toggle${ready ? ' ready' : ''}`,
    type: 'button',
    'aria-expanded': _finishTrackerOpen ? 'true' : 'false',
    'aria-controls': 'finish-tracker-panel'
  },
    el('span', { class: 'finish-tracker-toggle-icon' }, ready ? '✓' : '☰'),
    el('span', {}, ready ? 'Ready to submit' : `Finish Review · ${failures.length} remaining`)
  );
  toggle.addEventListener('click', () => setFinishTrackerOpen(!_finishTrackerOpen));
  tracker.appendChild(toggle);

  const panel = el('div', { id: 'finish-tracker-panel', class: 'finish-tracker-panel' });
  const header = el('div', { class: 'finish-tracker-header' },
    el('div', {},
      el('div', { class: 'finish-tracker-title' }, 'Finish Review'),
      el('div', { class: 'finish-tracker-safe' }, 'Click any item to jump to it.')
    ),
    el('button', {
      class: 'finish-tracker-close',
      type: 'button',
      'aria-label': 'Close Finish Review',
      onclick: () => setFinishTrackerOpen(false)
    }, '×')
  );
  panel.appendChild(header);

  const progress = el('div', { class: 'finish-tracker-progress-wrap' },
    el('div', { class: 'finish-tracker-progress-label' },
      el('span', {}, ready ? 'All required items complete' : `${passed} of ${results.length} required items complete`),
      el('strong', {}, `${Math.round((passed / results.length) * 100)}%`)
    ),
    el('div', { class: 'finish-tracker-progress' },
      el('div', { class: 'finish-tracker-progress-fill', style: `width:${Math.round((passed / results.length) * 100)}%` })
    )
  );
  panel.appendChild(progress);

  const required = el('section', { class: 'finish-tracker-section' });
  required.appendChild(el('div', { class: 'finish-tracker-section-title' }, ready ? 'Required work complete' : 'Required before submitting'));
  if (ready) {
    required.appendChild(el('div', { class: 'finish-tracker-ready-message' }, 'Nothing is blocking submission.'));
  } else {
    failures.forEach(item => {
      const button = el('button', { class: 'finish-tracker-item', type: 'button' },
        el('span', { class: 'finish-tracker-item-icon' }, '!'),
        el('span', { class: 'finish-tracker-item-label' }, item.label),
        el('span', { class: 'finish-tracker-item-go' }, 'Go →')
      );
      button.addEventListener('click', () => goToFinishItem(item));
      required.appendChild(button);
    });
  }
  panel.appendChild(required);
  tracker.appendChild(panel);
  document.body.appendChild(tracker);
}

function updateSubmitButton(results) {
  const passing = results.every(r => r.pass);
  qsa('#submit-btn, #submit-btn-bottom').forEach(btn => {
    btn.disabled = !passing;
  });

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

  const guidanceWrap = qs('#submit-guidance-wrap');
  if (guidanceWrap) {
    guidanceWrap.innerHTML = '';
    guidanceWrap.appendChild(el('div', { class: 'submit-finish-note' },
      'Use Finish Review for the remaining items. When it says Ready to submit, this button unlocks.'
    ));
  }

  const notesPreview = qs('#notes-preview');
  if (notesPreview) {
    const notes = (insp.reportBuilderNotes || '').trim();
    notesPreview.textContent = notes || 'No notes yet.';
    notesPreview.className = `notes-preview ${notes ? '' : 'empty'}`;
  }

  if (locked) qsa('#submit-btn, #submit-btn-bottom').forEach(submitBtn => {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Already Submitted';
  });
}

async function submitToTanner() {
  if (IS_DEMO) {
    showToast('Demo mode — submission not sent', 'demo', 5000);
    return;
  }

  const { id, token } = getURLParams();
  if (_inspection) {
    const gateResults = evaluateGate(_inspection);
    const blockers = gateResults.filter(item => !item.pass);
    if (blockers.length) {
      renderGate(gateResults);
      renderFinishTracker(gateResults);
      updateSubmitButton(gateResults);
      setFinishTrackerOpen(true);
      showToast(`Finish Review has ${blockers.length} blocker${blockers.length === 1 ? '' : 's'} remaining.`, 'error', 5000);
      return;
    }
  }

  const submitButtons = qsa('#submit-btn, #submit-btn-bottom');
  submitButtons.forEach(btn => {
    btn.disabled = true;
    btn.textContent = 'Submitting…';
  });

  const finalGateResults = _inspection ? evaluateGate(_inspection) : [];
  const reviewReadiness = buildReviewReadinessReceipt(finalGateResults);
  const submittedAt  = new Date().toISOString();
  const notesEl      = qs('#field-report-notes');
  const reportBuilderNotes = notesEl ? notesEl.value : (_inspection?.reportBuilderNotes || '');
  const submissionReceipt = {
    status: 'Submitted to Tanner',
    submittedAt,
    reviewReadiness,
    readinessStatus: reviewReadiness.status,
    readinessCompleted: reviewReadiness.passed,
    readinessRequired: reviewReadiness.total,
    blockerCount: reviewReadiness.blockerCount
  };

  if (_inspection) {
    _inspection.reportBuilderNotes = reportBuilderNotes;
    if (!_inspection.reviewedData) _inspection.reviewedData = {};
    _inspection.reviewedData.reportBuilderNotes = reportBuilderNotes;
    if (!_inspection.reviewedData.summary) _inspection.reviewedData.summary = {};
    _inspection.reviewedData.summary.reportBuilderNotes = reportBuilderNotes;
  }

  let handoffResult = null;
  try {
    await saveReviewSubmissionAttempt(id, submissionReceipt, reportBuilderNotes);

    const submitResponse = ENABLE_WORKER_HANDOFF
      ? await requestWorkerHandoffPackage(id, {
          requestedBy: 'review-portal-submit',
          maxAttempts: getWorkerHandoffMaxAttempts(_inspection),
          submitAttempt: submissionReceipt,
          submittedAt,
          reviewReadiness,
          readinessStatus: reviewReadiness.status,
          readinessCompleted: reviewReadiness.passed,
          readinessRequired: reviewReadiness.total,
          blockerCount: reviewReadiness.blockerCount,
          reviewedData: _inspection?.reviewedData || {},
          reportBuilderNotes,
          photos: _inspection?.photos || []
        })
      : await apiFetch({}, 'POST', { action: 'submit', id, token,
          submittedAt,
          reviewReadiness,
          readinessStatus:  reviewReadiness.status,
          readinessCompleted: reviewReadiness.passed,
          readinessRequired: reviewReadiness.total,
          blockerCount: reviewReadiness.blockerCount,
          reviewedData:     _inspection?.reviewedData || {},
          reportBuilderNotes,
          photos:           _inspection?.photos || []
        }, { timeoutMs: API_HANDOFF_TIMEOUT_MS });
    if (submitResponse?.handoffWarning) {
      throw new Error('Tanner handoff failed: ' + submitResponse.handoffWarning);
    }
    const notificationWarning = submitResponse?.notificationWarning || '';
    handoffResult = submitResponse?.reviewPortalData || null;
    if (!handoffResult) {
      throw new Error('Tanner handoff did not return a package receipt.');
    }
    if (submitResponse?.tannerNotification && _inspection) {
      if (!_inspection.reviewedData) _inspection.reviewedData = {};
      if (!_inspection.reviewedData.system || typeof _inspection.reviewedData.system !== 'object') {
        _inspection.reviewedData.system = {};
      }
      _inspection.reviewedData.system.tannerNotification = submitResponse.tannerNotification;
      _inspection.reviewedData.tannerNotificationStatus = submitResponse.tannerNotification.status || '';
      _inspection.reviewedData.lastTannerNotificationError = submitResponse.tannerNotification.error || '';
    }
    await saveReviewHandoffReceipt(id, handoffResult);
    await verifyTannerHandoffPackage(id);
    await saveReviewSubmissionReceipt(id, submissionReceipt, reportBuilderNotes);
    if (notificationWarning) {
      showToast('Tanner package confirmed, but notification email needs attention: ' + notificationWarning, 'info', 10000);
    }
  } catch (err) {
    await saveReviewSubmissionFailure(id, err.message || String(err || 'Submission failed'));
    showToast(`Submission failed: ${err.message}`, 'error');
    submitButtons.forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Submit to Tanner →';
    });
    return;
  }

  showToast('Submitted. Tanner package confirmed.', 'success', 6000);
  if (_inspection) {
    _inspection.status = 'Submitted to Tanner';
    _inspection.submittedToTannerAt = submittedAt;
    _inspection.reviewedData = _inspection.reviewedData || {};
    _inspection.reviewedData.submission = submissionReceipt;
    if (handoffResult) {
      applyHandoffReceiptToInspection(handoffResult);
    }
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

  submitButtons.forEach(btn => { btn.textContent = 'Submitted ✓'; });

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
   REPORT SEARCH
   ============================================================ */

let _reportSearchMatches = [];
let _reportSearchIndex = -1;
let _reportSearchTimer = null;

function clearReportSearchHighlights() {
  qsa('mark.report-search-match').forEach(mark => {
    const parent = mark.parentNode;
    mark.replaceWith(document.createTextNode(mark.textContent || ''));
    parent?.normalize();
  });
  qsa('.report-search-field-match').forEach(field => field.classList.remove('report-search-field-match', 'active'));
  _reportSearchMatches = [];
  _reportSearchIndex = -1;
}

function expandReportSearchMatch(match) {
  match.closest('.card')?.classList.remove('collapsed');
  let details = match.closest('details');
  while (details) {
    details.open = true;
    details = details.parentElement?.closest('details');
  }
  const roomSection = match.closest('.room-section');
  if (roomSection) {
    const body = roomSection.querySelector('.room-body');
    if (body) body.style.display = '';
    const icon = roomSection.querySelector('.collapse-icon');
    if (icon) icon.style.transform = '';
  }
  const kitchenPanel = match.closest('.kitchen-photo-panel');
  if (kitchenPanel?.hidden) {
    const kitchenBody = kitchenPanel.closest('#kitchen-inspection-body');
    const panels = Array.from(kitchenBody?.querySelectorAll('.kitchen-photo-panel') || []);
    const index = panels.indexOf(kitchenPanel);
    panels.forEach((panel, panelIndex) => panel.hidden = panelIndex !== index);
    Array.from(kitchenBody?.querySelectorAll('.kitchen-photo-tab') || []).forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }
}

function activateReportSearchMatch(index) {
  if (!_reportSearchMatches.length) return;
  _reportSearchIndex = (index + _reportSearchMatches.length) % _reportSearchMatches.length;
  _reportSearchMatches.forEach(match => match.classList.remove('active'));
  const match = _reportSearchMatches[_reportSearchIndex];
  expandReportSearchMatch(match);
  match.classList.add('active');
  match.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const count = qs('#report-search-count');
  if (count) count.textContent = `${_reportSearchIndex + 1} / ${_reportSearchMatches.length}`;
}

function applyReportSearch() {
  clearReportSearchHighlights();
  const input = qs('#report-search-input');
  const count = qs('#report-search-count');
  const root = qs('.page-wrap');
  const term = String(input?.value || '').trim();
  if (!root || term.length < 2) {
    if (count) count.textContent = term ? 'Type 2+ characters' : '';
    return;
  }

  const needle = term.toLocaleLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (parent.closest('script, style, noscript, mark, .portal-feedback-overlay')) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.toLocaleLowerCase().includes(needle)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach(node => {
    const text = node.nodeValue || '';
    const lower = text.toLocaleLowerCase();
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let found = lower.indexOf(needle, cursor);
    while (found !== -1) {
      if (found > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, found)));
      const mark = el('mark', { class: 'report-search-match' }, text.slice(found, found + term.length));
      fragment.appendChild(mark);
      _reportSearchMatches.push(mark);
      cursor = found + term.length;
      found = lower.indexOf(needle, cursor);
    }
    if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
    node.replaceWith(fragment);
  });

  qsa('input, textarea, select', root).forEach(field => {
    const value = field.tagName === 'SELECT'
      ? field.options[field.selectedIndex]?.text || field.value
      : field.value;
    if (!String(value || '').toLocaleLowerCase().includes(needle)) return;
    field.classList.add('report-search-field-match');
    _reportSearchMatches.push(field);
  });

  if (!_reportSearchMatches.length) {
    if (count) count.textContent = '0 results';
    return;
  }
  activateReportSearchMatch(0);
}

function initReportSearch() {
  const input = qs('#report-search-input');
  const previous = qs('#report-search-prev');
  const next = qs('#report-search-next');
  const clear = qs('#report-search-clear');
  if (!input || input.dataset.ready === 'true') return;
  input.dataset.ready = 'true';
  input.addEventListener('input', () => {
    clearTimeout(_reportSearchTimer);
    _reportSearchTimer = setTimeout(applyReportSearch, 140);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      activateReportSearchMatch(_reportSearchIndex + (event.shiftKey ? -1 : 1));
    } else if (event.key === 'Escape') {
      input.value = '';
      clearReportSearchHighlights();
      const count = qs('#report-search-count');
      if (count) count.textContent = '';
    }
  });
  previous?.addEventListener('click', () => activateReportSearchMatch(_reportSearchIndex - 1));
  next?.addEventListener('click', () => activateReportSearchMatch(_reportSearchIndex + 1));
  clear?.addEventListener('click', () => {
    input.value = '';
    clearReportSearchHighlights();
    const count = qs('#report-search-count');
    if (count) count.textContent = '';
    input.focus();
  });
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
   REVIEW PORTAL FEEDBACK
   Separate from inspection/review storage. This feature never reads or writes
   reviewedData, review_data, inspection photos, or local review recovery keys.
   ============================================================ */

let _feedbackScreenshotDataUrl = '';
let _feedbackScreenshotName = '';

function feedbackId() {
  return 'REVIEW-FEEDBACK-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function feedbackContext() {
  const params = getURLParams();
  return {
    inspectionId: params.id || '',
    propertyAddress: _inspection?.propertyAddress || '',
    inspectorName: 'Review Portal User',
    screen: document.body.classList.contains('review-page') || location.pathname.includes('review.html')
      ? 'Review Portal - Inspection Review'
      : 'Review Portal - Inspection List',
    stepIndex: '',
    appVersion: 'REVIEW-PORTAL-' + REVIEW_PORTAL_VERSION,
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    online: navigator.onLine
  };
}

function compressFeedbackImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read screenshot.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not open screenshot.'));
      image.onload = () => {
        const maxEdge = 1600;
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Screenshot processing is unavailable.'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function sendPortalFeedback(feedback) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'appFeedback',
      'x-sync-secret': SYNC_SECRET,
      feedback
    })
  });
  if (!response.ok) throw new Error('Feedback request failed (' + response.status + ').');
  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch (error) {
    throw new Error(/^\s*</.test(responseText)
      ? 'Feedback service returned an access page. Please try again.'
      : 'Feedback service returned an invalid response.');
  }
  if (!result || result.status !== 'ok' || result.saved !== true) {
    throw new Error(result?.message || 'Cloud did not confirm the suggestion save.');
  }
  return result;
}

function closePortalFeedback() {
  document.getElementById('portal-feedback-overlay')?.remove();
  _feedbackScreenshotDataUrl = '';
  _feedbackScreenshotName = '';
}

function closeReviewActivityPanel() {
  document.getElementById('review-activity-overlay')?.remove();
}

function buildReviewActivityMetric(label, value) {
  return el('div', { class: 'review-activity-metric' },
    el('strong', {}, value),
    el('span', {}, label)
  );
}

function topActivitySections(sections = {}) {
  return Object.entries(sections)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)
    .map(([section, seconds]) => `${section} (${formatDuration(seconds)})`)
    .join(', ') || '—';
}

function buildReviewCoachingSignals(insp = {}, fieldSummary = {}) {
  const signals = [];
  const gateBlockers = evaluateGate(insp).filter(item => !item.pass);
  if (gateBlockers.length) {
    signals.push({
      level: 'needs-work',
      title: `${gateBlockers.length} review blocker${gateBlockers.length === 1 ? '' : 's'} still active`,
      detail: gateBlockers.slice(0, 4).map(item => item.label).join(' · ')
    });
  }

  const photoAudit = buildPhotoPlacementAudit(insp, insp.photos || []);
  if (photoAudit.needsAttention.length) {
    signals.push({
      level: 'needs-work',
      title: `${photoAudit.needsAttention.length} key evidence photo${photoAudit.needsAttention.length === 1 ? '' : 's'} need placement`,
      detail: 'Before/after, ATP, sample, HVAC, or spare evidence needs a clear room/task destination.'
    });
  }

  (fieldSummary.rows || []).forEach(row => {
    if (row.finalSubmitFailures) {
      signals.push({
        level: 'warning',
        title: `${row.inspector} had ${row.finalSubmitFailures} final submit failure${row.finalSubmitFailures === 1 ? '' : 's'}`,
        detail: `${row.finalSubmitSuccesses}/${row.finalSubmitAttempts} submit attempts succeeded. Check recent field app events for the failure reason.`
      });
    }
    if (row.syncFailures) {
      signals.push({
        level: 'warning',
        title: `${row.inspector} had ${row.syncFailures} cloud sync failure${row.syncFailures === 1 ? '' : 's'}`,
        detail: `${row.syncSuccesses}/${row.syncAttempts} syncs succeeded. This can explain missing portal data or delayed handoff.`
      });
    }
    if (row.blockers) {
      signals.push({
        level: 'info',
        title: `${row.inspector} hit ${row.blockers} app blocker${row.blockers === 1 ? '' : 's'}`,
        detail: `Most time: ${topActivitySections(row.steps)}.`
      });
    }
  });

  const health = _reviewDataHealth || {};
  const sourceCount = Math.max(Number(health.basePhotoCount) || 0, Number(health.basePhotos) || 0);
  const workerCount = Number(health.workerPhotos) || 0;
  if (sourceCount && workerCount && sourceCount !== workerCount) {
    signals.push({
      level: 'warning',
      title: 'Photo count mismatch detected',
      detail: `Source says ${sourceCount}; photo service says ${workerCount}; portal shows ${health.finalPhotos || countInspectionArray(insp.photos)}.`
    });
  }

  if (!signals.length) {
    signals.push({
      level: 'ready',
      title: 'No coaching alerts from current data',
      detail: 'No submit failures, sync failures, active blockers, or key photo placement issues are visible in this record.'
    });
  }

  return signals.slice(0, 8);
}

async function refreshReviewActivityCloudData() {
  if (!_inspection?.inspectionId || IS_DEMO) return;
  try {
    const cloud = await loadCloudReview(_inspection.inspectionId);
    const fieldData = cloud.fieldData || {};
    _reviewActivity.cloudSessions = fieldData._reviewActivitySessions || {};
    _reviewActivity.cloudEvents = fieldData._reviewActivityEvents || {};
  } catch (err) {
    _reviewActivity.loadWarning = err?.message || 'Activity refresh failed';
  }
}

async function openReviewActivityPanel() {
  if (!_inspection?.inspectionId) return;
  flushReviewActivitySession('activity-view', true);
  await _reviewActivitySaveChain.catch(() => {});
  await refreshReviewActivityCloudData();

  const sessions = {
    ..._reviewActivity.cloudSessions,
    [_reviewActivity.sessionId]: currentReviewActivitySessionPayload('activity-view')
  };
  const summary = summarizeReviewActivity(sessions, _reviewActivity.cloudEvents);
  const fieldSummary = summarizeFieldUsage(_inspection.fieldUsageMetrics);
  const lastOverallActivity = [summary.lastActiveAt, fieldSummary.lastActiveAt]
    .filter(Boolean)
    .sort()
    .pop() || '';

  const overlay = el('div', {
    id: 'review-activity-overlay',
    class: 'review-activity-overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'review-activity-title'
  });
  const panel = el('div', { class: 'review-activity-panel' });
  const heading = el('div', { class: 'review-activity-heading' });
  heading.append(
    el('div', {},
      el('h2', { id: 'review-activity-title' }, 'Review Activity'),
      el('p', {}, 'Field app usage and portal review activity for this inspection.')
    ),
    el('button', {
      type: 'button',
      class: 'portal-feedback-close',
      'aria-label': 'Close review activity'
    }, '×')
  );
  heading.querySelector('button')?.addEventListener('click', closeReviewActivityPanel);

  const metrics = el('div', { class: 'review-activity-metrics' },
    buildReviewActivityMetric('Field app time', formatDuration(fieldSummary.totalActiveSeconds)),
    buildReviewActivityMetric('Review portal time', formatDuration(summary.totalActiveSeconds)),
    buildReviewActivityMetric('Portal saves', String(summary.totalSaves)),
    buildReviewActivityMetric('Last activity', activityDateLabel(lastOverallActivity))
  );

  const coachingSection = el('div', { class: 'review-activity-section review-coaching-signals' });
  coachingSection.appendChild(el('h3', {}, 'Coaching Signals'));
  const coachingList = el('div', { class: 'review-coaching-list' });
  buildReviewCoachingSignals(_inspection, fieldSummary).forEach(signal => {
    coachingList.appendChild(el('div', { class: `review-coaching-signal ${signal.level}` },
      el('strong', {}, signal.title),
      el('span', {}, signal.detail)
    ));
  });
  coachingSection.appendChild(coachingList);

  const fieldSection = el('div', { class: 'review-activity-section' });
  fieldSection.appendChild(el('h3', {}, 'Field App Usage'));
  const fieldTable = el('table', { class: 'review-activity-table' });
  fieldTable.appendChild(el('thead', {},
    el('tr', {},
      el('th', {}, 'Inspector'),
      el('th', {}, 'Active Time'),
      el('th', {}, 'Fields'),
      el('th', {}, 'Photos'),
      el('th', {}, 'Saves'),
      el('th', {}, 'Syncs'),
      el('th', {}, 'Submit'),
      el('th', {}, 'Blockers'),
      el('th', {}, 'Main Steps')
    )
  ));
  const fieldTbody = el('tbody');
  if (!fieldSummary.rows.length) {
    fieldTbody.appendChild(el('tr', {}, el('td', { colspan: '9' }, 'No field app activity has been recorded for this inspection yet.')));
  } else {
    fieldSummary.rows.forEach(row => {
      fieldTbody.appendChild(el('tr', {},
        el('td', {}, row.inspector),
        el('td', {}, formatDuration(row.activeSeconds)),
        el('td', {}, `${row.fieldChanges} touch${row.fieldChanges === 1 ? '' : 'es'} / ${row.uniqueFields} field${row.uniqueFields === 1 ? '' : 's'}`),
        el('td', {}, String(row.photos)),
        el('td', {}, String(row.saves)),
        el('td', {}, `${row.syncSuccesses}/${row.syncAttempts} ok${row.syncFailures ? ' · ' + row.syncFailures + ' failed' : ''}`),
        el('td', {}, `${row.finalSubmitSuccesses}/${row.finalSubmitAttempts} ok${row.finalSubmitFailures ? ' · ' + row.finalSubmitFailures + ' failed' : ''}`),
        el('td', {}, String(row.blockers)),
        el('td', {}, topActivitySections(row.steps))
      ));
    });
  }
  fieldTable.appendChild(fieldTbody);
  fieldSection.appendChild(fieldTable);

  const portalSection = el('div', { class: 'review-activity-section' });
  portalSection.appendChild(el('h3', {}, 'Review Portal Usage'));
  const table = el('table', { class: 'review-activity-table' });
  table.appendChild(el('thead', {},
    el('tr', {},
      el('th', {}, 'Reviewer'),
      el('th', {}, 'Active Time'),
      el('th', {}, 'Saves'),
      el('th', {}, 'Sessions'),
      el('th', {}, 'Last Active'),
      el('th', {}, 'Main Sections')
    )
  ));
  const tbody = el('tbody');
  if (!summary.rows.length) {
    tbody.appendChild(el('tr', {}, el('td', { colspan: '6' }, 'No activity has been recorded yet.')));
  } else {
    summary.rows.forEach(row => {
      tbody.appendChild(el('tr', {},
        el('td', {}, row.reviewer),
        el('td', {}, formatDuration(row.activeSeconds)),
        el('td', {}, String(row.saves)),
        el('td', {}, String(row.sessions)),
        el('td', {}, activityDateLabel(row.lastActiveAt)),
        el('td', {}, topActivitySections(row.sections))
      ));
    });
  }
  table.appendChild(tbody);
  portalSection.appendChild(table);

  const eventsList = el('div', { class: 'review-activity-events' });
  eventsList.appendChild(el('h3', {}, 'Recent Field App Events'));
  const visibleFieldEvents = fieldSummary.recentEvents
    .filter(event => event.type !== 'session_start')
    .slice(0, 8);
  if (!visibleFieldEvents.length) {
    eventsList.appendChild(el('p', { class: 'text-muted' }, 'No field app events recorded yet.'));
  } else {
    visibleFieldEvents.forEach(event => {
      eventsList.appendChild(el('div', { class: 'review-activity-event' },
        el('strong', {}, `${event.actorName || 'Field App User'}: ${fieldUsageEventLabel(event)}`),
        el('span', {}, `${activityDateLabel(event.occurredAt)} · ${event.type || 'activity'}`)
      ));
    });
  }
  eventsList.appendChild(el('h3', {}, 'Recent Saves'));
  if (!summary.recentEvents.filter(event => event.type === 'save').length) {
    eventsList.appendChild(el('p', { class: 'text-muted' }, 'No save events recorded yet.'));
  } else {
    summary.recentEvents.filter(event => event.type === 'save').slice(0, 8).forEach(event => {
      eventsList.appendChild(el('div', { class: 'review-activity-event' },
        el('strong', {}, `${event.reviewerName || 'Review Portal User'} saved ${event.section || event.stepId || 'review data'}`),
        el('span', {}, `${activityDateLabel(event.occurredAt)} · ${event.stepId || ''}${event.fieldKey ? ' / ' + event.fieldKey : ''}`)
      ));
    });
  }

  const privacy = el('p', { class: 'review-activity-privacy' },
    'Activity records metadata only: user name, active time, section or step, field ID, save counts, blocker counts, photo counts, and sync status. Typed notes and captions are not copied into this log.'
  );

  if (_reviewActivity.loadWarning) {
    panel.appendChild(el('div', { class: 'review-activity-warning' }, _reviewActivity.loadWarning));
  }
  panel.append(heading, metrics, coachingSection, fieldSection, portalSection, eventsList, privacy);
  overlay.appendChild(panel);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeReviewActivityPanel();
  });
  document.body.appendChild(overlay);
}

function mountReviewActorButton() {
  if (document.getElementById('review-actor-button')) return;
  const navMeta = document.querySelector('.nav-meta');
  if (!navMeta) return;
  const button = el('button', {
    id: 'review-actor-button',
    class: 'review-actor-button',
    type: 'button',
    title: 'Set reviewer name for save history'
  }, `Reviewer: ${ensureReviewActivityReviewer(false)}`);
  button.addEventListener('click', () => {
    const nextName = window.prompt('Reviewer name for save history:', _reviewActivity.reviewerName || '');
    if (nextName !== null) setReviewActivityReviewer(nextName);
  });
  navMeta.appendChild(button);
}

function mountReviewActivityButton() {
  if (document.getElementById('review-activity-button')) return;
  const navMeta = document.querySelector('.nav-meta');
  if (!navMeta) return;
  const button = el('button', {
    id: 'review-activity-button',
    class: 'review-activity-button',
    type: 'button',
    title: 'Review activity and active time'
  }, 'Activity');
  button.addEventListener('click', openReviewActivityPanel);
  navMeta.appendChild(button);
}

function openPortalFeedback() {
  if (document.getElementById('portal-feedback-overlay')) return;
  _feedbackScreenshotDataUrl = '';
  _feedbackScreenshotName = '';

  const overlay = el('div', {
    id: 'portal-feedback-overlay',
    class: 'portal-feedback-overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'portal-feedback-title'
  });
  const panel = el('div', { class: 'portal-feedback-panel' });
  const heading = el('div', { class: 'portal-feedback-heading' });
  const headingCopy = el('div');
  headingCopy.append(
    el('h2', { id: 'portal-feedback-title' }, 'Suggest a Portal Fix'),
    el('p', {}, 'Describe what should change and attach a screenshot if something looks broken. Tanner monitors the shared Things to Fix tracker.')
  );
  const closeButton = el('button', {
    type: 'button',
    class: 'portal-feedback-close',
    'aria-label': 'Close suggestions'
  }, '×');
  closeButton.addEventListener('click', closePortalFeedback);
  heading.append(headingCopy, closeButton);

  const noteLabel = el('label', { class: 'field-label', for: 'portal-feedback-note' }, 'What should we fix or improve?');
  const note = el('textarea', {
    id: 'portal-feedback-note',
    class: 'field-input portal-feedback-note',
    rows: '5',
    placeholder: 'Describe what happened and what you expected…'
  });

  const screenshotInput = el('input', {
    id: 'portal-feedback-screenshot',
    class: 'hidden',
    type: 'file',
    accept: 'image/*'
  });
  const screenshotButton = el('button', {
    type: 'button',
    class: 'btn btn-outline portal-feedback-attach'
  }, '📷 Choose Screenshot');
  const screenshotStatus = el('div', { class: 'portal-feedback-media-status' }, 'No screenshot attached');
  const screenshotPreview = el('div', { class: 'portal-feedback-preview' });
  const screenshotSection = el('div', {
    class: 'portal-feedback-section portal-feedback-dropzone',
    role: 'button',
    tabindex: '0',
    'aria-label': 'Drop a screenshot here or choose one from your device'
  },
    el('div', { class: 'field-label' }, 'Screenshot'),
    el('p', { class: 'portal-feedback-help' }, 'Drag and drop a screenshot here, or choose one from your device.'),
    screenshotButton,
    screenshotInput,
    screenshotStatus,
    screenshotPreview
  );

  async function prepareScreenshot(file) {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      screenshotStatus.textContent = 'Please drop an image file.';
      return;
    }
    screenshotButton.disabled = true;
    screenshotSection.classList.add('processing');
    screenshotStatus.textContent = 'Preparing screenshot…';
    try {
      _feedbackScreenshotDataUrl = await compressFeedbackImage(file);
      _feedbackScreenshotName = file.name || 'review-portal-screenshot.jpg';
      const previewImage = el('img', { src: _feedbackScreenshotDataUrl, alt: 'Attached screenshot preview' });
      screenshotPreview.replaceChildren(previewImage);
      screenshotStatus.textContent = '✓ Screenshot attached: ' + _feedbackScreenshotName;
    } catch (error) {
      _feedbackScreenshotDataUrl = '';
      _feedbackScreenshotName = '';
      screenshotPreview.replaceChildren();
      screenshotStatus.textContent = error.message || 'Could not attach that screenshot.';
    } finally {
      screenshotButton.disabled = false;
      screenshotSection.classList.remove('processing');
    }
  }

  screenshotButton.addEventListener('click', () => screenshotInput.click());
  screenshotInput.addEventListener('change', () => prepareScreenshot(screenshotInput.files?.[0]));
  screenshotSection.addEventListener('click', event => {
    if (event.target === screenshotButton || event.target === screenshotInput) return;
    screenshotInput.click();
  });
  screenshotSection.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      screenshotInput.click();
    }
  });
  ['dragenter', 'dragover'].forEach(type => {
    screenshotSection.addEventListener(type, event => {
      event.preventDefault();
      event.stopPropagation();
      screenshotSection.classList.add('drag-active');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
  });
  ['dragleave', 'dragend'].forEach(type => {
    screenshotSection.addEventListener(type, event => {
      event.preventDefault();
      event.stopPropagation();
      screenshotSection.classList.remove('drag-active');
    });
  });
  screenshotSection.addEventListener('drop', event => {
    event.preventDefault();
    event.stopPropagation();
    screenshotSection.classList.remove('drag-active');
    prepareScreenshot(event.dataTransfer?.files?.[0]);
  });

  const sendStatus = el('div', { class: 'portal-feedback-send-status', role: 'status', 'aria-live': 'polite' });
  const sendButton = el('button', { type: 'button', class: 'btn btn-primary portal-feedback-send' }, 'Send Suggestion');
  sendButton.addEventListener('click', async () => {
    const typedNote = note.value.trim();
    if (!typedNote && !_feedbackScreenshotDataUrl) {
      sendStatus.textContent = 'Add a suggestion or screenshot first.';
      return;
    }
    sendButton.disabled = true;
    sendButton.textContent = 'Sending…';
    sendStatus.textContent = '';
    const feedbackNote = typedNote
      ? '[REVIEW PORTAL] ' + typedNote
      : '[REVIEW PORTAL] Screenshot attached';
    const feedback = {
      feedbackId: feedbackId(),
      submittedAt: new Date().toISOString(),
      note: feedbackNote,
      screenshotDataUrl: _feedbackScreenshotDataUrl,
      screenshotName: _feedbackScreenshotName,
      voiceDataUrl: '',
      voiceMimeType: '',
      context: feedbackContext()
    };
    try {
      await sendPortalFeedback(feedback);
      sendStatus.textContent = '✓ Saved in the shared Things to Fix tracker for Tanner';
      sendButton.textContent = 'Sent';
      setTimeout(closePortalFeedback, 1200);
    } catch (error) {
      sendStatus.textContent = error.message || 'Could not send. Your review data was not affected.';
      sendButton.disabled = false;
      sendButton.textContent = 'Try Again';
    }
  });

  const safetyNote = el('p', { class: 'portal-feedback-safety' }, 'Suggestions are stored separately and do not change this inspection or its review data.');
  panel.append(
    heading,
    noteLabel,
    note,
    screenshotSection,
    safetyNote,
    sendStatus,
    sendButton
  );
  overlay.append(panel);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closePortalFeedback();
  });
  document.body.append(overlay);
  note.focus();
}

function mountPortalFeedbackButton() {
  if (document.getElementById('portal-feedback-button')) return;
  const button = el('button', {
    id: 'portal-feedback-button',
    class: 'portal-feedback-button',
    type: 'button',
    title: 'Suggest a review portal fix',
    'aria-label': 'Suggest a review portal fix'
  }, '💡');
  button.addEventListener('click', openPortalFeedback);
  document.body.append(button);
}

function mountPortalVersionBadge() {
  if (document.getElementById('review-portal-version')) return;
  const nav = document.querySelector('.nav-bar');
  if (!nav) return;
  const badge = el('span', {
    id: 'review-portal-version',
    class: 'review-portal-version',
    title: 'Review Portal ' + REVIEW_PORTAL_VERSION,
    'aria-label': 'Review Portal version ' + REVIEW_PORTAL_VERSION.slice(1)
  }, REVIEW_PORTAL_VERSION);
  nav.append(badge);
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
  initReportSearch();
  mountPortalVersionBadge();
  if (page === 'review') {
    mountReviewActorButton();
    mountReviewActivityButton();
  }
  mountPortalFeedbackButton();
};

// Expose for inline HTML event attributes
window.submitToTanner = submitToTanner;
window.adminUnlock    = adminUnlock;
window.checkGate      = checkGate;
