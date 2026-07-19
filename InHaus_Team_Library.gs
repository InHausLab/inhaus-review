// InHaus Inspector v163 - company comment library and atomic team field merging.
// Add this file to the same Apps Script project as InHaus_Google_Apps_Script.gs.

var COMMENT_LIBRARY_RECORD_ID = '__INHAUS_COMMENT_LIBRARY_V1__';

function normalizeLibraryComment(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getCommentLibraryRecordLocation() {
  var sheet = getOrCreateReviewSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === COMMENT_LIBRARY_RECORD_ID) {
      return { sheet: sheet, rowIndex: i + 1, json: rows[i][1] || '{}', lastUpdated: rows[i][2] || '' };
    }
  }
  return { sheet: sheet, rowIndex: -1, json: '{}', lastUpdated: '' };
}

function getCommentLibraryState() {
  var location = getCommentLibraryRecordLocation();
  var state = { version: 1, comments: [], candidates: [], updatedAt: '' };
  try { state = Object.assign(state, JSON.parse(location.json || '{}')); } catch(e) {}
  if (!Array.isArray(state.comments)) state.comments = [];
  if (!Array.isArray(state.candidates)) state.candidates = [];
  state.lastUpdated = location.lastUpdated || state.updatedAt || '';
  return state;
}

function writeCommentLibraryState(state) {
  var location = getCommentLibraryRecordLocation();
  var now = new Date().toISOString();
  state.version = 1;
  state.updatedAt = now;
  if (location.rowIndex > 0) {
    location.sheet.getRange(location.rowIndex, 2).setValue(JSON.stringify(state));
    location.sheet.getRange(location.rowIndex, 3).setValue(now);
  } else {
    location.sheet.appendRow([COMMENT_LIBRARY_RECORD_ID, JSON.stringify(state), now]);
  }
  return state;
}

function withCommentLibraryLock(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return callback(); }
  finally { lock.releaseLock(); }
}

function getApprovedCommentLibrary() {
  return getCommentLibraryState().comments.filter(function(item) {
    return item && item.status === 'approved' && item.cleanedText;
  }).sort(function(a, b) {
    return String(b.updatedAt || b.approvedAt || '').localeCompare(String(a.updatedAt || a.approvedAt || ''));
  });
}

function submitCommentLibraryCandidate(data) {
  requirePortalAccess(data.token);
  var incoming = data.comment || {};
  var cleanedText = String(incoming.cleanedText || '').trim().replace(/\s+/g, ' ');
  if (!cleanedText) throw new Error('Missing cleaned comment');
  return withCommentLibraryLock(function() {
    var state = getCommentLibraryState();
    var key = normalizeLibraryComment(cleanedText);
    var approved = state.comments.filter(function(item) { return normalizeLibraryComment(item.cleanedText) === key && item.status === 'approved'; })[0];
    if (approved) return { comment: approved, alreadyApproved: true };
    var candidate = state.candidates.filter(function(item) { return normalizeLibraryComment(item.cleanedText) === key; })[0];
    var now = new Date().toISOString();
    if (!candidate) {
      candidate = {
        commentId: String(incoming.commentId || ('company-comment-' + Utilities.getUuid())),
        cleanedText: cleanedText,
        severity: incoming.severity || 'Observation',
        reportSection: incoming.reportSection || '',
        status: 'pending_review',
        submittedBy: incoming.submittedBy || '',
        submittedAt: incoming.submittedAt || now,
        sourceInspectionId: data.inspectionId || '',
        sourceFindingId: incoming.sourceFindingId || '',
        updatedAt: now
      };
      state.candidates.unshift(candidate);
    } else {
      candidate.updatedAt = now;
      candidate.submittedBy = candidate.submittedBy || incoming.submittedBy || '';
    }
    writeCommentLibraryState(state);
    return { comment: candidate, pendingReview: true };
  });
}

function updateCommentLibraryAdmin(data) {
  if (data.adminToken !== getReviewAdminToken()) throw new Error('Invalid admin token');
  var command = String(data.command || '');
  var commentId = String(data.commentId || '');
  if (!command || !commentId) throw new Error('Missing library command or comment id');
  return withCommentLibraryLock(function() {
    var state = getCommentLibraryState();
    var now = new Date().toISOString();
    var candidateIndex = state.candidates.findIndex(function(item) { return String(item.commentId) === commentId; });
    var commentIndex = state.comments.findIndex(function(item) { return String(item.commentId) === commentId; });
    var item = candidateIndex >= 0 ? state.candidates[candidateIndex] : (commentIndex >= 0 ? state.comments[commentIndex] : null);
    if (!item) throw new Error('Comment not found');
    if (command === 'approve') {
      item.cleanedText = String(data.cleanedText || item.cleanedText || '').trim().replace(/\s+/g, ' ');
      if (!item.cleanedText) throw new Error('Approved wording is required');
      item.severity = data.severity || item.severity || 'Observation';
      item.reportSection = data.reportSection || item.reportSection || '';
      item.status = 'approved';
      item.approvedBy = data.approvedBy || 'InHaus Admin';
      item.approvedAt = now;
      item.updatedAt = now;
      if (candidateIndex >= 0) state.candidates.splice(candidateIndex, 1);
      if (commentIndex < 0) state.comments.unshift(item);
    } else if (command === 'update') {
      if (commentIndex < 0) throw new Error('Only approved comments can be updated');
      item.cleanedText = String(data.cleanedText || item.cleanedText || '').trim().replace(/\s+/g, ' ');
      item.severity = data.severity || item.severity;
      item.reportSection = data.reportSection || item.reportSection;
      item.updatedAt = now;
    } else if (command === 'archive') {
      item.status = 'archived';
      item.archivedAt = now;
      item.updatedAt = now;
      if (candidateIndex >= 0) state.candidates.splice(candidateIndex, 1);
    } else {
      throw new Error('Unsupported library command');
    }
    writeCommentLibraryState(state);
    return { comment: item, library: state };
  });
}

function teamTimeValue(value) {
  var parsed = Date.parse(value || '');
  return isNaN(parsed) ? 0 : parsed;
}

function teamClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function teamMergeById(remoteItems, incomingItems, idKey, limit) {
  var map = {};
  (remoteItems || []).concat(incomingItems || []).forEach(function(item) {
    var id = item && item[idKey];
    if (!id) return;
    var current = map[id];
    if (!current || teamTimeValue(item.updatedAt || item.createdAt) >= teamTimeValue(current.updatedAt || current.createdAt)) map[id] = teamClone(item);
  });
  var values = Object.keys(map).map(function(id) { return map[id]; });
  values.sort(function(a, b) { return teamTimeValue(b.createdAt || b.updatedAt) - teamTimeValue(a.createdAt || a.updatedAt); });
  return limit ? values.slice(0, limit) : values;
}

function teamLooksLikePhotos(value) {
  return Array.isArray(value) && value.length && value[0] && value[0].photoId;
}

function teamMergePhotos(remotePhotos, incomingPhotos) {
  var map = {};
  (remotePhotos || []).concat(incomingPhotos || []).forEach(function(photo) {
    if (!photo || !photo.photoId) return;
    var current = map[photo.photoId];
    if (!current) { map[photo.photoId] = teamClone(photo); return; }
    var useIncoming = teamTimeValue(photo.updatedAt || photo.timestamp) >= teamTimeValue(current.updatedAt || current.timestamp);
    var newer = useIncoming ? photo : current;
    var older = useIncoming ? current : photo;
    map[photo.photoId] = Object.assign({}, teamClone(older), teamClone(newer), {
      dataUrl: newer.dataUrl || older.dataUrl,
      thumbnailDataUrl: newer.thumbnailDataUrl || older.thumbnailDataUrl,
      originalDataUrl: newer.originalDataUrl || older.originalDataUrl
    });
  });
  return Object.keys(map).map(function(id) { return map[id]; });
}

function teamMergeStep(remoteStep, incomingStep) {
  remoteStep = remoteStep || {};
  incomingStep = incomingStep || {};
  var incomingNewer = teamTimeValue(incomingStep._updatedAt) >= teamTimeValue(remoteStep._updatedAt);
  var merged = Object.assign({}, teamClone(incomingNewer ? remoteStep : incomingStep), teamClone(incomingNewer ? incomingStep : remoteStep));
  var remoteUpdates = remoteStep._fieldUpdates || {};
  var incomingUpdates = incomingStep._fieldUpdates || {};
  var mergedUpdates = Object.assign({}, teamClone(remoteUpdates));
  var keys = {};
  Object.keys(remoteStep).concat(Object.keys(incomingStep)).forEach(function(key) { keys[key] = true; });
  Object.keys(keys).forEach(function(key) {
    if (key === '_fieldUpdates') return;
    var remoteValue = remoteStep[key];
    var incomingValue = incomingStep[key];
    if (teamLooksLikePhotos(remoteValue) || teamLooksLikePhotos(incomingValue)) {
      merged[key] = teamMergePhotos(remoteValue, incomingValue);
      return;
    }
    var remoteMeta = remoteUpdates[key];
    var incomingMeta = incomingUpdates[key];
    if (remoteMeta || incomingMeta) {
      var useIncoming = teamTimeValue(incomingMeta && incomingMeta.updatedAt) >= teamTimeValue(remoteMeta && remoteMeta.updatedAt);
      var chosen = useIncoming ? incomingValue : remoteValue;
      if (chosen === undefined) delete merged[key];
      else merged[key] = teamClone(chosen);
      if (useIncoming && incomingMeta) mergedUpdates[key] = teamClone(incomingMeta);
    }
  });
  merged._fieldUpdates = mergedUpdates;
  return merged;
}

function teamMergeLibrary(remoteItems, incomingItems) {
  var map = {};
  (remoteItems || []).concat(incomingItems || []).forEach(function(item) {
    var key = normalizeLibraryComment(item && (item.cleanedText || item.text));
    if (!key) return;
    var current = map[key];
    if (!current || teamTimeValue(item.updatedAt || item.approvedAt) >= teamTimeValue(current.updatedAt || current.approvedAt)) map[key] = teamClone(item);
  });
  return Object.keys(map).map(function(key) { return map[key]; });
}

function teamMergeInspectionRecords(remote, incoming) {
  remote = remote || {};
  incoming = incoming || {};
  var merged = Object.assign({}, teamClone(remote), teamClone(incoming));
  var stepData = {};
  var stepIds = {};
  Object.keys(remote.stepData || {}).concat(Object.keys(incoming.stepData || {})).forEach(function(id) { stepIds[id] = true; });
  Object.keys(stepIds).forEach(function(id) { stepData[id] = teamMergeStep(remote.stepData && remote.stepData[id], incoming.stepData && incoming.stepData[id]); });
  merged.stepData = stepData;
  merged.findings = teamMergeById(remote.findings, incoming.findings, 'findingId');
  merged.sparePhotos = teamMergePhotos(remote.sparePhotos, incoming.sparePhotos);
  merged.commentLibrary = teamMergeLibrary(remote.commentLibrary, incoming.commentLibrary);
  merged.auditTrail = teamMergeById(remote.auditTrail, incoming.auditTrail, 'auditId', 500);
  merged.photoTombstones = Object.assign({}, teamClone(remote.photoTombstones || {}));
  Object.keys(incoming.photoTombstones || {}).forEach(function(photoId) {
    var candidate = incoming.photoTombstones[photoId];
    var existing = merged.photoTombstones[photoId];
    if (!existing || teamTimeValue(candidate.updatedAt) >= teamTimeValue(existing.updatedAt)) merged.photoTombstones[photoId] = teamClone(candidate);
  });
  var remoteCollab = remote.collaboration || {};
  var incomingCollab = incoming.collaboration || {};
  var collaboration = Object.assign({}, teamClone(remoteCollab), teamClone(incomingCollab));
  collaboration.enabled = !!(remoteCollab.enabled || incomingCollab.enabled);
  collaboration.members = teamMergeById(remoteCollab.members, incomingCollab.members, 'memberId');
  collaboration.activity = teamMergeById(remoteCollab.activity, incomingCollab.activity, 'activityId', 100);
  collaboration.assignments = Object.assign({}, teamClone(remoteCollab.assignments || {}));
  Object.keys(incomingCollab.assignments || {}).forEach(function(stepId) {
    var candidate = incomingCollab.assignments[stepId];
    var existing = collaboration.assignments[stepId];
    if (!existing || teamTimeValue(candidate.updatedAt) >= teamTimeValue(existing.updatedAt)) collaboration.assignments[stepId] = teamClone(candidate);
  });
  collaboration.presence = Object.assign({}, teamClone(remoteCollab.presence || {}));
  Object.keys(incomingCollab.presence || {}).forEach(function(deviceId) {
    var candidate = incomingCollab.presence[deviceId];
    var existing = collaboration.presence[deviceId];
    if (!existing || teamTimeValue(candidate.updatedAt) >= teamTimeValue(existing.updatedAt)) collaboration.presence[deviceId] = teamClone(candidate);
  });
  collaboration.serverMergedAt = new Date().toISOString();
  merged.collaboration = collaboration;
  merged._serverMergedAt = collaboration.serverMergedAt;
  return merged;
}

function mergeTeamInspection(data) {
  requirePortalAccess(data.token);
  var incomingExport = data.inspection || {};
  var incomingResume = incomingExport.resumeData || incomingExport;
  var id = String(incomingResume.inspectionId || incomingExport.inspectionId || data.inspectionId || '');
  if (!id) throw new Error('Missing inspection id');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var rows = getFromSupabase('ihl_assessments', 'select=inspection_id,assessment_num,raw_jsonb&inspection_id=eq.' + encodeURIComponent(id) + '&limit=1');
    var remoteExport = rows.length ? parseRawJsonb(rows[0].raw_jsonb) : {};
    var remoteResume = remoteExport.resumeData || remoteExport;
    var mergedResume = teamMergeInspectionRecords(remoteResume, incomingResume);
    mergedResume.inspectionId = id;

    // Preserve the report-oriented export envelope while making resumeData the
    // authoritative collaboration record. A final submit rebuilds all report
    // sections from the fully merged resume state.
    var mergedExport = Object.assign({}, teamClone(remoteExport), teamClone(incomingExport));
    mergedExport.inspectionId = id;
    mergedExport.resumeData = mergedResume;
    mergedExport.findings = teamClone(mergedResume.findings || []);
    mergedExport.commentLibrary = teamClone(mergedResume.commentLibrary || []);
    mergedExport.collaboration = teamClone(mergedResume.collaboration || {});
    mergedExport.auditTrail = teamClone(mergedResume.auditTrail || []);
    mergedExport.photoTombstones = teamClone(mergedResume.photoTombstones || {});
    var saved = postToSupabase('ihl_assessments', {
      assessment_num: rows.length && rows[0].assessment_num ? String(rows[0].assessment_num) : String(incomingExport.assessmentNum || id),
      inspection_id: id,
      inspector_name: mergedResume.inspectorName || mergedExport.inspectorName || null,
      inspection_date: mergedResume.inspectionDate || mergedExport.inspectionDate || null,
      status: mergedResume.status || mergedExport.status || 'in_progress',
      app_version: mergedResume.appVersion || mergedExport.appVersion || null,
      raw_jsonb: mergedExport,
      source_system: 'apps_script_team_merge',
      source_id: id
    }, 'inspection_id');
    if (!saved || !saved.length) throw new Error('Supabase rejected the team merge');
    return { merged: true, inspection: mergedResume, resumeData: mergedResume, serverMergedAt: mergedResume._serverMergedAt };
  } finally {
    lock.releaseLock();
  }
}
