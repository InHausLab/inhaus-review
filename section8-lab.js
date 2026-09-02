import {
  compileSection8,
  evaluateCompilationReadiness,
  mergeInspectionSources
} from './section8-lab-core.js?v=20260902-1';

const WORKER_URL = 'https://inhaus-photo-worker.inhauslab.workers.dev';
const params = new URLSearchParams(window.location.search);
const form = document.querySelector('#lab-load-form');
const idInput = document.querySelector('#inspection-id');
const tokenInput = document.querySelector('#portal-token');
const statusBox = document.querySelector('#lab-status');
const results = document.querySelector('#lab-results');

idInput.value = params.get('id') || '';
tokenInput.value = params.get('token') || '';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setStatus(message, tone = '') {
  statusBox.className = `lab-status ${tone}`.trim();
  statusBox.textContent = message;
}

async function fetchJson(path, token, options = {}) {
  const response = await fetch(`${WORKER_URL}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'x-worker-token': token,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
  return payload;
}

async function loadInspection(inspectionId, token) {
  const [detail, review] = await Promise.all([
    fetchJson(`/inspections/${encodeURIComponent(inspectionId)}`, token),
    fetchJson(`/get-review?inspectionId=${encodeURIComponent(inspectionId)}`, token)
  ]);
  const liveInspection = detail.inspection || detail;
  const inspection = mergeInspectionSources(liveInspection, review);
  const handoffJob = review?.fieldData?.system?.handoffJob || null;
  const artifactReceipt = handoffJob?.artifactReceipt || null;
  const counts = artifactReceipt?.counts || artifactReceipt || {};
  const failedPhotos = Number(counts.photoFolderFailedCount || 0);
  const pendingPhotos = Number(counts.photoFolderPendingCount || 0);
  const receiptStatus = String(artifactReceipt?.status || handoffJob?.status || '').toLowerCase();
  const statusReceipt = artifactReceipt ? {
    complete: ['ready', 'complete', 'completed', 'succeeded'].includes(receiptStatus) && failedPhotos === 0 && pendingPhotos === 0,
    expectedPhotos: Number(counts.sourcePhotoCount || counts.photoManifestCount || 0),
    storedPhotos: Math.max(
      Number(counts.photoFolderCopiedCount || 0),
      Number(counts.photoDriveUrlCount || 0),
      Number(counts.photoFolderAlreadyPackagedCount || 0)
    ),
    missingPhotoIds: []
  } : null;
  return { inspection, review, statusReceipt };
}

function renderMetric(label, value) {
  return `<div class="lab-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderSources(item) {
  const fields = (item.sourceFields || []).join(', ') || 'source record';
  const photos = item.photoIds?.length ? ` · ${item.photoIds.length} photo${item.photoIds.length === 1 ? '' : 's'}` : '';
  return `${escapeHtml(item.roomName || 'Inspection')} · ${escapeHtml(fields)}${photos}`;
}

function renderSection(title, subtitle, items) {
  const body = items.length
    ? `<ol class="lab-items">${items.map(item => `
        <li>
          <p><strong class="lab-room-name">${escapeHtml(item.roomName || 'Inspection')}:</strong> <span>${escapeHtml(item.text)}</span></p>
          <details>
            <summary>Sources</summary>
            <div>${renderSources(item)}</div>
            <code>${escapeHtml((item.evidenceIds || []).join(', '))}</code>
          </details>
        </li>`).join('')}</ol>`
    : '<p class="lab-empty">No source-backed items were compiled.</p>';
  return `<section class="lab-section">
    <div class="lab-section-heading">
      <div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div>
      <strong>${items.length}</strong>
    </div>
    ${body}
  </section>`;
}

function renderExperiment(inspection, readiness, compilation) {
  const readyLabel = readiness.ready ? 'Complete source received' : 'Incomplete source — preview only';
  const readinessClass = readiness.ready ? 'ready' : 'blocked';
  const exceptions = compilation.exceptions.length
    ? `<ul class="lab-exceptions">${compilation.exceptions.map(item => `<li><strong>${escapeHtml(item.roomName)}</strong><span>${escapeHtml(item.message)}</span></li>`).join('')}</ul>`
    : '<p class="lab-empty">No rule-based exceptions detected.</p>';
  const reasons = readiness.reasons.length
    ? `<ul>${readiness.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>`
    : '';

  results.innerHTML = `
    <section class="lab-audit ${readinessClass}">
      <div>
        <span class="lab-kicker">Source audit</span>
        <h2>${escapeHtml(readyLabel)}</h2>
        ${reasons}
      </div>
      <div class="lab-metrics">
        ${renderMetric('Inspection', readiness.inspectionId)}
        ${renderMetric('Status', readiness.status)}
        ${renderMetric('App version', readiness.appVersion)}
        ${renderMetric('Rooms', readiness.roomCount)}
        ${renderMetric('Photos', readiness.expectedPhotos ? `${readiness.storedPhotos}/${readiness.expectedPhotos}` : `${readiness.storedPhotos} verified`)}
        ${renderMetric('Exceptions', compilation.metrics.exceptionCount)}
      </div>
    </section>

    <section class="lab-exception-section">
      <div class="lab-section-heading">
        <div><h2>Exception Inbox Preview</h2><p>Questions the system would send back to the inspector. Nothing is sent in this experiment.</p></div>
        <strong>${compilation.exceptions.length}</strong>
      </div>
      ${exceptions}
    </section>

    ${renderSection('General Follow-Up Actions', 'Consolidated from the authoritative inspector and reviewer follow-up list.', compilation.sections.followUps)}
    ${renderSection('Actions Taken During Assessment', 'Generated only from explicit completed actions, tests, and collection records.', compilation.sections.actions)}
    ${renderSection('Assessment Observations', 'Built from inspector notes, approved findings, observation tags, and explicit adverse conditions.', compilation.sections.observations)}

    <section class="lab-evidence-summary">
      <h2>Experiment Measurements</h2>
      <div class="lab-metrics compact">
        ${renderMetric('Evidence items', compilation.metrics.evidenceItemCount)}
        ${renderMetric('Follow-ups', compilation.metrics.followUpCount)}
        ${renderMetric('Actions', compilation.metrics.actionCount)}
        ${renderMetric('Observations', compilation.metrics.observationCount)}
        ${renderMetric('Exceptions', compilation.metrics.exceptionCount)}
      </div>
      <p>This baseline uses deterministic rules only. It does not call AI, save reviewer edits, change inspection status, or update Tanner’s package.</p>
    </section>`;
  results.hidden = false;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const inspectionId = idInput.value.trim();
  const token = tokenInput.value.trim();
  if (!inspectionId || !token) {
    setStatus('Inspection ID and portal access token are required.', 'error');
    return;
  }
  setStatus('Loading source inspection and checking synchronization…', 'loading');
  results.hidden = true;
  try {
    const { inspection, review, statusReceipt } = await loadInspection(inspectionId, token);
    const readiness = evaluateCompilationReadiness({ inspection, statusReceipt, reviewData: review });
    const compilation = compileSection8(inspection);
    renderExperiment(inspection, readiness, compilation);
    setStatus('Read-only experiment generated. No inspection or report data was changed.', 'success');
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('id', inspectionId);
    nextUrl.searchParams.set('token', token);
    window.history.replaceState({}, '', nextUrl);
  } catch (error) {
    setStatus(`Could not load experiment: ${error.message}`, 'error');
  }
});

if (idInput.value && tokenInput.value) form.requestSubmit();
