/**
 * InHaus Lab — Inspector App → Google Sheets Bridge
 * ===================================================
 * 
 * HOW TO SET UP:
 * 1. Go to https://script.google.com
 * 2. Create a new project, name it "InHaus Inspector Bridge"
 * 3. Paste this entire file into Code.gs (replace everything)
 * 4. Click Deploy → New Deployment
 * 5. Type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone
 * 8. Click Deploy
 * 9. Copy the web app URL
 * 10. Paste that URL into the GOOGLE_SCRIPT_URL constant in app.js
 * 11. Commit and push to GitHub
 *
 * WHAT IT DOES:
 * When the inspector taps "Submit Inspection" in the app,
 * this script receives the JSON data and:
 * - Creates/reuses the start-inspection shell for real jobs
 * - Reserves the assessment number, Drive folder, and tracker row at inspection start
 * - Creates or repairs the Tanner assessment folder in the Shared Drive
 * - Uses the folder name format "### – YYYY-MM-DD – LastName – Street Address"
 * - Routes test/training packages to _Test Assessments without tracker rows
 * - Creates the Review Portal Data spreadsheet with formatted and raw tabs
 * - Copies Drive-backed photos into the Photos subfolder when available
 * - Creates a Photo Log tab linking each photo back to its source
 * - Returns a receipt with folder, spreadsheet, tracker, raw backup, and photo counts
 */

// ── CONFIG ────────────────────────────────────────────────
// Set this to the ID of a Google Drive folder where inspection folders should be created
// (Get folder ID from the URL: https://drive.google.com/drive/folders/FOLDER_ID_HERE)
const DRIVE_FOLDER_ID = '11A2EXgQSFo4BAh3aYlJpHxqZKsfwe06l'; // Assessments/ — Products & Services Shared Drive
const DRIVE_FOLDER_ID_OLD = '11K48iY7zAB6IbXHOmLi9XVEAXih_3qeA'; // OLD: InHaus Lab — Inspection Data (personal Drive)
const USE_SHARED_DRIVE = true; // Phase 2: writing to Shared Drive
const TEST_ASSESSMENTS_FOLDER_NAME = '_Test Assessments';
// Temporary bridge writer switch.
// Keep true only while Apps Script is the approved manual fallback. Set false
// before enabling Worker W7 final handoff so Drive/tracker has one writer.
const ENABLE_APPS_SCRIPT_DRIVE_TRACKER_WRITER = true;

function requireAppsScriptDriveTrackerWriter(actionName) {
  if (ENABLE_APPS_SCRIPT_DRIVE_TRACKER_WRITER === true) return;
  throw new Error('Apps Script Drive/tracker writer is disabled for ' + actionName + '. Use Worker W7 handoff.');
}

// Set this to an existing spreadsheet ID to append all inspections as rows
// Leave empty to create a new spreadsheet per inspection
const MASTER_SHEET_ID = '';

// Assessment Tracker (Home Health Report_Tracker)
const TRACKER_SHEET_ID      = '1aqIKWTn-UoDt9gH5pwo7XoDUzVV4FgYUCb-KyPZvZUA';
const TRACKER_TAB_REPORT     = 'Report Tracker';          // main assessment rows
const TRACKER_TAB_ID_RECORDS = 'Customer & Home ID Records'; // C-ID / H-ID crosswalk
const TRACKER_DATA_START     = 8; // first real data row (1-based); rows 6-7 = header + sample

// Vision proxy for AI photo captions (Phase 1: silent comparison)
// Set to empty string to disable AI captions
const VISION_PROXY_URL = 'https://inhaus-vision-proxy.mjordanjay.workers.dev';

// ── ERROR ALERTING ───────────────────────────────────────
// Email sent on any unhandled sync failure
const ALERT_EMAIL = 'matt@inhauslab.com';
const ALERT_CC = 'tanner@inhauslab.com';

// Shared portal token for list/get fallback calls from the review portal.
// Read from Script Properties so it's not hardcoded in source.
// To set: Apps Script → Project Settings → Script Properties → add REVIEW_ACCESS_TOKEN
// Falls back to 'InHaus2026' if property not set.
const REVIEW_ACCESS_TOKEN_LEGACY = 'inhaus_review_2026';
function getReviewAccessToken() {
  return PropertiesService.getScriptProperties().getProperty('REVIEW_ACCESS_TOKEN') || 'InHaus2026';
}

// ── SUPABASE CONFIG (Phase 3) ────────────────────────────────────
// Service role key — server-side only, never expose to browser
// Store here since Apps Script runs server-side
const SUPABASE_URL = 'https://kvpaqvieacccojkkxqul.supabase.co';
const SUPABASE_ENABLED = true; // set false to disable without removing code
// SUPABASE_SERVICE_KEY is stored in Script Properties (not hardcoded)
// To set it: Apps Script → Project Settings → Script Properties → add SUPABASE_SERVICE_KEY
function getSupabaseKey() {
  return PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY');
}

function postToSupabase(table, payload) {
  if (!SUPABASE_ENABLED || !SUPABASE_URL || !getSupabaseKey()) return null;
  try {
    var options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': getSupabaseKey(),
        'Authorization': 'Bearer ' + getSupabaseKey(),
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var url = SUPABASE_URL + '/rest/v1/' + table;
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return JSON.parse(response.getContentText());
    } else {
      console.error('Supabase error ' + code + ': ' + response.getContentText());
      return null;
    }
  } catch(e) {
    console.error('Supabase POST failed:', e.message);
    return null;
  }
}

function logSyncRun(inspectionId, status, errorMessage, photoCount, photosUploaded, appVersion) {
  postToSupabase('ihl_sync_runs', {
    inspection_id: inspectionId,
    status: status,
    error_message: errorMessage || null,
    photo_count: photoCount || 0,
    photos_uploaded: photosUploaded || 0,
    app_version: appVersion || null,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    source_system: 'apps_script'
  });
}

function normalizeAssessmentStatusForSupabase(status) {
  var raw = String(status || '').trim();
  if (!raw) return 'synced';
  if (/in[-\s]?progress/i.test(raw)) return 'In Progress';
  if (/submitted to tanner/i.test(raw)) return 'Submitted to Tanner';
  if (/needs review/i.test(raw)) return 'Needs Review';
  if (/completed|complete/i.test(raw)) return 'Needs Review';
  return raw;
}

function syncToSupabase(data, driveResult) {
  if (!SUPABASE_ENABLED) return;
  try {
    // 1. Upsert assessment record
    var assessment = {
      inspection_id: data.inspectionId,
      report_id: null,
      inspector_name: data.inspectorName || null,
      inspection_date: data.inspectionDate || null,
      status: normalizeAssessmentStatusForSupabase(data.status || 'synced'),
      drive_folder_id: driveResult ? driveResult.folderId : null,
      assessment_folder_url: driveResult ? driveResult.folderUrl : null,
      water_source: data.waterSource || null,
      occupancy: data.occupancyDuringInspection || null,
      weather_conditions: data.weatherConditions || null,
      client_concerns: data.clientConcerns || null,
      known_problem_areas: data.knownProblemAreas || null,
      pets: data.pets || null,
      smoking_vaping: data.smokingVaping || null,
      stove_type: data.stoveType || null,
      fireplace: data.fireplace || null,
      carpeted_rooms: data.carpetedRooms || null,
      started_at: data.startedAt || null,
      ended_at: data.endedAt || null,
      completed_at: data.completedAt || null,
      app_version: data.appVersion || null,
      completion_score: null,
      completion_grade: null,
      same_day_bonus: false,
      payload_version: data.payloadVersion || null,
      raw_jsonb: data,
      source_system: isTestTrainingInspection(data || {}) ? 'apps_script_test_training' : 'apps_script',
      source_id: data.inspectionId
    };
    postToSupabase('ihl_assessments', assessment);

    // 2. Upsert room air quality records
    var rooms = data.rooms || [];
    rooms.forEach(function(room) {
      var roomRecord = {
        inspection_id: data.inspectionId,
        room_name: room.roomName || null,
        room_type: room.type || null,
        level: room.level || null,
        step_id: room.stepId || null,
        co2_ppm: parseFloat(room.co2) || null,
        co_ppm: parseFloat(room.co) || null,
        tvoc_ppb: parseFloat(room.tvoc) || null,
        temp_f: parseFloat(room.temp) || null,
        humidity_pct: parseFloat(room.humidity) || null,
        observations: room.observations || null,
        actions_taken: room.actionsTaken || null,
        follow_up: room.followUp || null,
        raw_data: room,
        source_system: 'apps_script',
        source_id: data.inspectionId + '_' + (room.stepId || room.roomName)
      };
      postToSupabase('ihl_air_quality_rooms', roomRecord);
    });

    // 3. Log sync run as success
    logSyncRun(
      data.inspectionId,
      'success',
      null,
      (data.photos || []).length,
      driveResult ? driveResult.photosUploaded : 0,
      data.appVersion
    );

  } catch(e) {
    console.error('syncToSupabase error:', e.message);
    logSyncRun(data.inspectionId, 'partial', e.message, 0, 0, data.appVersion);
  }
}


function sendErrorAlert(context, err, payload) {
  try {
    var subject = '⚠️ InHaus Apps Script Error — ' + context;
    var body = [
      'An error occurred in the InHaus Inspector Bridge.',
      '',
      'Context: ' + context,
      'Error: ' + (err ? err.message : 'unknown'),
      'Stack: ' + (err ? err.stack : 'none'),
      'Time: ' + new Date().toISOString(),
      '',
      'Inspection ID: ' + (payload ? (payload.inspectionId || 'unknown') : 'unknown'),
      'Client: ' + (payload ? (payload.clientName || 'unknown') : 'unknown'),
      'Address: ' + (payload ? (payload.propertyAddress || 'unknown') : 'unknown'),
    ].join('\n');
    MailApp.sendEmail({
      to: ALERT_EMAIL,
      cc: ALERT_CC,
      subject: subject,
      body: body
    });
  } catch (mailErr) {
    // If email itself fails, log it but don't throw
    console.error('Failed to send error alert:', mailErr);
  }
}

// ── SHARED DRIVE HELPERS ────────────────────────────────
// Phase 2: Assessments/ folder is in a Shared Drive.
// DriveApp.getFolderById() works on Shared Drive folders directly.
// No Drive Advanced Service needed.

function getOrCreateInspectionFolderInSharedDrive(parentFolderId, folderName, inspId, source) {
  var parentFolder = DriveApp.getFolderById(parentFolderId);
  var targetName = String(folderName || '').trim();
  var targetKey = targetName.replace(/[–—]/g, '-').replace(/\s+/g, ' ').toLowerCase();
  var idNeedle = String(inspId || '').trim();
  var clientLastName = getClientLastName((source && source.clientName) || '').toLowerCase();
  var fullAddress = String((source && (source.propertyAddress || source.address)) || '').trim();
  var streetAddress = fullAddress.indexOf(',') > -1 ? fullAddress.substring(0, fullAddress.indexOf(',')).trim() : fullAddress;
  var streetKey = streetAddress.replace(/[–—]/g, '-').replace(/\s+/g, ' ').toLowerCase();
  var legacyIdMatch = null;
  var clientAddressMatch = null;

  function tagFolder(folder) {
    if (!folder || !idNeedle) return folder;
    try {
      var marker = 'inspectionId: ' + idNeedle;
      var description = folder.getDescription() || '';
      if (description.indexOf(marker) === -1) {
        folder.setDescription(description ? description + '\n' + marker : marker);
      }
    } catch (e) {
      console.warn('Could not tag inspection folder:', e.message);
    }
    return folder;
  }

  var folders = parentFolder.getFolders();
  while (folders.hasNext()) {
    var f = folders.next();
    var existingName = f.getName() || '';
    var existingKey = existingName.replace(/[–—]/g, '-').replace(/\s+/g, ' ').toLowerCase();
    if (targetName && (existingName === targetName || existingKey === targetKey)) {
      return tagFolder(f);
    }
    if (idNeedle) {
      var description = '';
      try { description = f.getDescription() || ''; } catch (e) {}
      if (description.indexOf(idNeedle) > -1) return f;
      if (!legacyIdMatch && existingName.indexOf(idNeedle) > -1) legacyIdMatch = f;
    }
    if (!clientAddressMatch && clientLastName && streetKey &&
        existingKey.indexOf(clientLastName) > -1 && existingKey.indexOf(streetKey) > -1) {
      clientAddressMatch = f;
    }
  }
  if (legacyIdMatch) return tagFolder(legacyIdMatch);
  if (clientAddressMatch) return tagFolder(clientAddressMatch);
  return tagFolder(parentFolder.createFolder(folderName));
}

function getOrCreateNamedChildFolder(parentFolder, folderName) {
  var targetName = String(folderName || '').trim();
  var folders = parentFolder.getFolders();
  while (folders.hasNext()) {
    var folder = folders.next();
    if ((folder.getName() || '') === targetName) return folder;
  }
  return parentFolder.createFolder(targetName);
}

function getStreetAddressForFolder(source) {
  var fullAddress = String((source && (source.propertyAddress || source.address)) || '').trim();
  return fullAddress.indexOf(',') > -1 ? fullAddress.substring(0, fullAddress.indexOf(',')).trim() : fullAddress;
}

function explicitAssessmentType(source) {
  return String((source && (
    source.inspectionType ||
    source.assessmentType ||
    source.assessmentPurpose ||
    source.inspectionMode ||
    source.reportType
  )) || '').trim();
}

function isTestTrainingInspection(source) {
  if (source && (
    source.is_test === true ||
    source.isTest === true ||
    source.testTraining === true ||
    source.isTestTraining === true
  )) return true;
  var explicit = explicitAssessmentType(source);
  if (explicit) return /test|training|practice|demo/i.test(explicit);
  var inferred = [
    source && source.inspectionId,
    source && source.id,
    source && source.clientName,
    source && (source.propertyAddress || source.address)
  ].filter(Boolean).join(' ');
  return /(^|\b)(test|training|practice|demo)(\b|$)/i.test(inferred);
}

function getAssessmentParentFolder(source) {
  var root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  if (isTestTrainingInspection(source || {})) {
    return getOrCreateNamedChildFolder(root, TEST_ASSESSMENTS_FOLDER_NAME);
  }
  return root;
}

function assessmentSubfolderName(prefix, source) {
  var lastName = getClientLastName((source && source.clientName) || '');
  var street = getStreetAddressForFolder(source || {});
  return prefix + ' - ' + lastName + (prefix === 'Photos' && street ? ' (' + street + ')' : '');
}

function getOrCreateAssessmentPhotosFolder(parentFolder, source) {
  var targetName = assessmentSubfolderName('Photos', source || {});
  var folders = parentFolder.getFolders();
  var legacyMatch = null;
  while (folders.hasNext()) {
    var folder = folders.next();
    var name = folder.getName() || '';
    if (name === targetName) return folder;
    if (!legacyMatch && /^Technician Photos/i.test(name)) legacyMatch = folder;
  }
  return legacyMatch || parentFolder.createFolder(targetName);
}

function getOrCreateAssessmentCocsFolder(parentFolder, source) {
  return getOrCreateNamedChildFolder(parentFolder, assessmentSubfolderName('COCs', source || {}));
}

function getOrCreateAssessmentBackupFolder(parentFolder, source) {
  return getOrCreateNamedChildFolder(parentFolder, assessmentSubfolderName('Backup', source || {}));
}

function findInspectionFolderInsideParent(parentFolder, inspectionId) {
  var folders = parentFolder.getFolders();
  while (folders.hasNext()) {
    var folder = folders.next();
    var name = folder.getName() || '';
    var description = '';
    try { description = folder.getDescription() || ''; } catch(e) {}
    if (name.indexOf(inspectionId) > -1 || description.indexOf(inspectionId) > -1) return folder;
  }
  return null;
}

function findInspectionFolderForPhotoUpload(data) {
  var inspectionId = data.inspectionId || data.sourceInspectionId || '';
  if (!inspectionId) return null;
  var preferredParent = getAssessmentParentFolder(data || {});
  var folder = findInspectionFolderInsideParent(preferredParent, inspectionId);
  if (folder) return folder;
  var root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  folder = findInspectionFolderInsideParent(root, inspectionId);
  if (folder) return folder;
  var testParent = getOrCreateNamedChildFolder(root, TEST_ASSESSMENTS_FOLDER_NAME);
  return findInspectionFolderInsideParent(testParent, inspectionId);
}

function moveFileToSharedDriveFolder(fileId, destFolderId) {
  var file = DriveApp.getFileById(fileId);
  var destFolder = DriveApp.getFolderById(destFolderId);
  destFolder.addFile(file);
  try { DriveApp.getRootFolder().removeFile(file); } catch(e) {}
}
// ── WEB APP ENTRY POINTS ─────────────────────────────────

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    var result;
    if (data.action === 'saveReview') {
      result = saveReviewData(data);
    } else if (data.action === 'submitSmoke') {
      result = submitReviewSmokeCheck(data);
    } else if (data.action === 'submit') {
      result = submitReviewToTanner(data);
    } else if (data.action === 'startInspectionShell') {
      result = startInspectionShell(data);
    } else if (data.action === 'repairHandoff') {
      result = repairReviewHandoff(data);
    } else if (data.action === 'adminUnlock') {
      result = adminUnlockReview(data);
    } else if (data.photoUploadOnly) {
      result = processPhotoUpload(data);
    } else {
      result = processInspection(data);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', ...result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var payload = null;
    try { payload = JSON.parse(e.postData.contents); } catch(x) {}
    sendErrorAlert('doPost', err, payload);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var params = e ? e.parameter : {};
  if (params.action === 'listActive') {
    try {
      var activeResult = listActiveCloudInspections(params.token);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', ...activeResult }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  if (params.action === 'list') {
    try {
      var listResult = listReviewInspections(params.token);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', ...listResult }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  if (params.action === 'get' && params.id) {
    try {
      var inspectionResult = getInspectionForReview(params.id, params.token);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', ...inspectionResult }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  if (params.action === 'getReview' && params.id) {
    try {
      var result = getReviewData(params.id, params.token);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', ...result }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'InHaus Inspector Bridge is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── REVIEW DATA SAVE/LOAD ─────────────────────────────────
// Stores reviewer edits (captions, observations, notes) in a
// 'Review Data' sheet: one row per inspection, columns = inspectionId + JSON blob

var REVIEW_SHEET_NAME = 'Review Data';

function getOrCreateReviewSheet() {
  var ss;
  if (MASTER_SHEET_ID) {
    ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  } else {
    // Use a dedicated review data spreadsheet stored in the inspection data folder
    var folder = DRIVE_FOLDER_ID ? DriveApp.getFolderById(DRIVE_FOLDER_ID) : DriveApp.getRootFolder();
    var files = folder.getFilesByName('InHaus Review Data');
    var ssFile;
    if (files.hasNext()) {
      ssFile = files.next();
      ss = SpreadsheetApp.openById(ssFile.getId());
    } else {
      ss = SpreadsheetApp.create('InHaus Review Data');
      var newFile = DriveApp.getFileById(ss.getId());
      folder.addFile(newFile);
      try { DriveApp.getRootFolder().removeFile(newFile); } catch(e) {}
      DriveApp.getRootFolder().removeFile(newFile);
    }
  }
  var sheet = ss.getSheetByName(REVIEW_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(REVIEW_SHEET_NAME);
    sheet.appendRow(['inspectionId', 'reviewedData', 'lastUpdated']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  }
  return sheet;
}

function saveReviewData(data) {
  var id = data.id;
  var token = data.token;
  var field = data.field; // { stepId, key, value }
  if (!id || !field) throw new Error('Missing id or field');

  var sheet = getOrCreateReviewSheet();
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var existing = {};

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      rowIndex = i + 1; // 1-indexed
      try { existing = JSON.parse(rows[i][1] || '{}'); } catch(e) { existing = {}; }
      break;
    }
  }

  // Merge the new field value into existing data
  var stepId = field.stepId;
  var key = field.key;
  var value = field.value;

  if (stepId === 'summary' || stepId === 'photo') {
    existing[key] = value;
  } else {
    if (!existing[stepId]) existing[stepId] = {};
    existing[stepId][key] = value;
  }

  var now = new Date().toISOString();
  var json = JSON.stringify(existing);

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 2).setValue(json);
    sheet.getRange(rowIndex, 3).setValue(now);
  } else {
    sheet.appendRow([id, json, now]);
  }

  return { saved: true, id: id };
}

function getReviewData(id, token) {
  var sheet = getOrCreateReviewSheet();
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      var reviewedData = {};
      try { reviewedData = JSON.parse(rows[i][1] || '{}'); } catch(e) {}
      return { reviewedData: reviewedData, lastUpdated: rows[i][2] };
    }
  }
  return { reviewedData: {}, lastUpdated: null };
}

// ── REVIEW PORTAL API ────────────────────────────────────

function isPortalAccessToken(token) {
  return token === getReviewAccessToken() || token === REVIEW_ACCESS_TOKEN_LEGACY;
}

function requirePortalAccess(token) {
  if (!isPortalAccessToken(token)) {
    throw new Error('Invalid review portal access token');
  }
}

function requireReviewTokenForInspection(insp, token) {
  if (isPortalAccessToken(token)) return;
  if (!token) throw new Error('Missing review token');
  if (insp && insp.reviewToken && insp.reviewToken !== token) {
    throw new Error('Invalid review token');
  }
}

function getReviewAdminToken() {
  return PropertiesService.getScriptProperties().getProperty('REVIEW_ADMIN_TOKEN') || 'InHausAdmin2026';
}

function getFromSupabase(table, queryString) {
  if (!SUPABASE_ENABLED || !SUPABASE_URL || !getSupabaseKey()) return [];
  var options = {
    method: 'get',
    headers: {
      'apikey': getSupabaseKey(),
      'Authorization': 'Bearer ' + getSupabaseKey(),
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  var url = SUPABASE_URL + '/rest/v1/' + table + (queryString ? '?' + queryString : '');
  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  if (code >= 200 && code < 300) {
    var text = response.getContentText();
    return text ? JSON.parse(text) : [];
  }
  throw new Error('Supabase GET failed ' + code + ': ' + response.getContentText());
}

function parseRawJsonb(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch(e) { return {}; }
  }
  return raw;
}

function extractDriveIdForReview(photo) {
  if (!photo) return '';
  if (photo.driveId) return String(photo.driveId);
  var url = String(photo.driveUrl || photo.url || photo.imageUrl || '');
  var match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function thumbnailUrlForReview(photo) {
  if (photo.driveUrl) return photo.driveUrl;
  var driveId = extractDriveIdForReview(photo);
  return driveId ? 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(driveId) + '&sz=w1600' : '';
}

function photoReviewKey(photo) {
  var driveId = extractDriveIdForReview(photo);
  if (driveId) return 'drive:' + driveId;
  if (photo.driveUrl || photo.localUrl || photo.url || photo.imageUrl) {
    return 'url:' + (photo.driveUrl || photo.localUrl || photo.url || photo.imageUrl);
  }
  if (photo.photoId) return 'id:' + photo.photoId;
  return 'meta:' + [photo.roomName || '', photo.stepName || '', photo.caption || '', photo.timestamp || ''].join('|');
}

function makeReviewPhotoId(photo, index, usedIds) {
  var driveId = extractDriveIdForReview(photo).replace(/[^a-zA-Z0-9]/g, '');
  var base = photo.photoId || (driveId ? 'ph_' + driveId.slice(-12) : 'ph_' + String(index + 1).padStart(3, '0'));
  var id = base;
  var suffix = 2;
  while (usedIds[id]) id = base + '_' + suffix++;
  usedIds[id] = true;
  return id;
}

function cleanReviewPhoto(photo, context) {
  var out = {};
  Object.keys(photo || {}).forEach(function(key) {
    if (key !== 'imageData' && photo[key] !== undefined) out[key] = photo[key];
  });
  var driveUrl = thumbnailUrlForReview(out);
  if (driveUrl) out.driveUrl = driveUrl;
  var driveId = extractDriveIdForReview(out);
  if (driveId) out.driveId = driveId;
  out.roomName = out.roomName || context.roomName || '';
  out.stepName = out.stepName || context.stepName || '';
  out.caption = out.caption || '';
  out.timestamp = out.timestamp || '';
  if (out.included === undefined) out.included = null;
  return out;
}

function flattenInspectionPhotosForReview(insp) {
  var byKey = {};
  var order = [];

  function addPhoto(photo, context) {
    if (!photo || typeof photo !== 'object') return;
    var normalized = cleanReviewPhoto(photo, context || {});
    var hasUsefulData = normalized.driveUrl || normalized.driveId || normalized.localUrl || normalized.url ||
      normalized.imageUrl || normalized.caption || normalized.timestamp || normalized.roomName || normalized.stepName;
    if (!hasUsefulData) return;
    var key = photoReviewKey(normalized);
    if (byKey[key]) {
      Object.keys(normalized).forEach(function(field) {
        if ((byKey[key][field] === undefined || byKey[key][field] === '') &&
            normalized[field] !== undefined && normalized[field] !== '') {
          byKey[key][field] = normalized[field];
        }
      });
      return;
    }
    byKey[key] = normalized;
    order.push(key);
  }

  (insp.photos || []).forEach(function(photo) { addPhoto(photo, {}); });

  function walk(value, context, depth) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(function(item) { walk(item, context, depth); });
      return;
    }
    var nextContext = {
      roomName: value.roomName || value.name || context.roomName || '',
      stepName: value.stepName || value.stepId || value.type || context.stepName || ''
    };
    Object.keys(value).forEach(function(key) {
      var child = value[key];
      if (key === 'photos' && Array.isArray(child)) {
        if (depth > 0) child.forEach(function(photo) { addPhoto(photo, nextContext); });
      } else if (child && typeof child === 'object') {
        walk(child, nextContext, depth + 1);
      }
    });
  }

  walk(insp, {}, 0);

  var usedIds = {};
  return order.map(function(key) { return byKey[key]; })
    .sort(function(a, b) {
      var ta = a.timestamp ? Date.parse(a.timestamp) : NaN;
      var tb = b.timestamp ? Date.parse(b.timestamp) : NaN;
      if (!isNaN(ta) && !isNaN(tb) && ta !== tb) return ta - tb;
      return 0;
    })
    .map(function(photo, index) {
      photo.photoId = makeReviewPhotoId(photo, index, usedIds);
      return photo;
    });
}

function mergeDriveFolderPhotosForReview(photos, folderId) {
  if (!folderId) return photos;
  var existing = {};
  photos.forEach(function(photo) {
    var key = photoReviewKey(photo);
    existing[key] = true;
  });
  try {
    var folder = DriveApp.getFolderById(folderId);
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var mime = file.getMimeType() || '';
      var name = file.getName() || '';
      if (mime.indexOf('image/') !== 0 && !/\.(jpe?g|png|webp|heic)$/i.test(name)) continue;
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
      var fileId = file.getId();
      var drivePhoto = {
        photoId: 'ph_' + fileId.replace(/[^a-zA-Z0-9]/g, '').slice(-12),
        driveId: fileId,
        driveUrl: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1600',
        caption: file.getDescription() || name.replace(/\.[^.]+$/, ''),
        roomName: 'Drive Folder',
        stepName: 'Unassigned Drive Photo',
        timestamp: file.getDateCreated() ? file.getDateCreated().toISOString() : '',
        included: null
      };
      var key = photoReviewKey(drivePhoto);
      if (!existing[key]) {
        photos.push(drivePhoto);
        existing[key] = true;
      }
    }
  } catch (err) {
    console.error('mergeDriveFolderPhotosForReview failed:', err.message);
  }
  return photos;
}

function normalizeInspectionForReviewApi(data) {
  data.id = data.id || data.inspectionId;
  data.inspectionId = data.inspectionId || data.id;
  data.photos = mergeDriveFolderPhotosForReview(flattenInspectionPhotosForReview(data), data.folderId || '');
  data.photoCount = data.photos.length;
  return data;
}

function statusForReviewList(data) {
  var raw = data.reviewStatus || data.status || '';
  if (/submitted to tanner/i.test(raw)) return 'Submitted to Tanner';
  if (/report complete/i.test(raw)) return 'Report Complete';
  if (/in review/i.test(raw)) return 'In Review';
  if (/needs review/i.test(raw)) return 'Needs Review';
  if (/synced/i.test(raw)) return 'Synced';
  if (/complete/i.test(raw)) return 'Needs Review';
  if (/progress/i.test(raw)) return 'In Review';
  return raw || 'Needs Review';
}

function listEntryForReview(data) {
  return {
    inspectionId: data.inspectionId || data.id,
    id: data.id || data.inspectionId,
    clientName: data.clientName || '',
    propertyAddress: data.propertyAddress || '',
    inspectionDate: data.inspectionDate || '',
    inspectorName: data.inspectorName || '',
    status: statusForReviewList(data),
    photoCount: (data.photos || []).length,
    missingCount: data.missingCount || 0,
    spreadsheetId: data.spreadsheetId || '',
    folderId: data.folderId || '',
    syncedAt: data.syncedAt || '',
    lastUpdated: data.completedAt || data.endedAt || data.syncedAt || '',
    reviewedBy: data.reviewedBy || '',
    reviewedAt: data.reviewedAt || '',
    submittedAt: data.submittedAt || data.submittedToTannerAt || '',
    reportBuilderNotes: data.reportBuilderNotes || '',
    reviewToken: data.reviewToken || String(data.inspectionId || data.id || '').toLowerCase()
  };
}

function listReviewInspections(token) {
  requirePortalAccess(token);
  var rows = getFromSupabase(
    'ihl_assessments',
    'select=inspection_id,status,drive_folder_id,assessment_folder_url,raw_jsonb&order=inspection_id.desc'
  );
  var inspections = rows.map(function(row) {
    var data = parseRawJsonb(row.raw_jsonb);
    data.inspectionId = data.inspectionId || row.inspection_id;
    data.id = data.id || data.inspectionId;
    data.status = row.status || data.status;
    data.folderId = data.folderId || row.drive_folder_id;
    return listEntryForReview(normalizeInspectionForReviewApi(data));
  });
  return {
    generatedAt: new Date().toISOString(),
    count: inspections.length,
    inspections: inspections
  };
}

function activeCloudStatus(data, rowStatus) {
  var raw = String(
    (data && (data.reviewStatus || data.status)) ||
    rowStatus ||
    ''
  ).trim();
  if (/prepared/i.test(raw)) return 'prepared';
  if (/field active|in[-\s]?progress/i.test(raw)) return 'Field Active';
  return '';
}

function hasUsableResumeData(data) {
  return !!(
    data &&
    data.resumeData &&
    typeof data.resumeData === 'object' &&
    (data.resumeData.inspectionId || data.resumeData.id) &&
    data.resumeData.stepData &&
    typeof data.resumeData.stepData === 'object'
  );
}

function activeCloudListEntry(row) {
  var data = parseRawJsonb(row.raw_jsonb);
  data.inspectionId = data.inspectionId || row.inspection_id;
  data.id = data.id || data.inspectionId;
  var status = activeCloudStatus(data, row.status);
  if (!status || !hasUsableResumeData(data)) return null;
  var resume = data.resumeData || {};
  return {
    inspectionId: data.inspectionId || resume.inspectionId || row.inspection_id,
    id: data.id || data.inspectionId || resume.inspectionId || row.inspection_id,
    clientName: data.clientName || resume.clientName || '',
    propertyAddress: data.propertyAddress || resume.propertyAddress || '',
    inspectionDate: data.inspectionDate || resume.inspectionDate || '',
    inspectorName: data.inspectorName || resume.inspectorName || '',
    status: status,
    hasResumeData: true,
    photoCount: data.photoCount || (data.photoManifest || []).length || 0,
    folderId: data.folderId || data.driveFolderId || row.drive_folder_id || '',
    folderUrl: data.folderUrl || data.driveFolderUrl || row.assessment_folder_url || '',
    preparedAt: resume.preparedAt || data.preparedAt || '',
    startedAt: resume.startedAt || data.startedAt || '',
    updatedAt: resume.updatedAt || data.updatedAt || '',
    lastUpdated: resume.updatedAt || data.updatedAt || data.completedAt || data.endedAt || data.syncedAt || '',
    reviewToken: String(data.inspectionId || row.inspection_id || '').toLowerCase()
  };
}

function listActiveCloudInspections(token) {
  requirePortalAccess(token);
  var rows = getFromSupabase(
    'ihl_assessments',
    'select=inspection_id,status,drive_folder_id,assessment_folder_url,raw_jsonb&order=inspection_id.desc&limit=75'
  );
  var inspections = [];
  rows.forEach(function(row) {
    var entry = activeCloudListEntry(row);
    if (entry) inspections.push(entry);
  });
  return {
    generatedAt: new Date().toISOString(),
    mode: 'active',
    count: inspections.length,
    inspections: inspections
  };
}

function getInspectionForReview(id, token) {
  var rows = getFromSupabase(
    'ihl_assessments',
    'select=inspection_id,status,drive_folder_id,assessment_folder_url,raw_jsonb&inspection_id=eq.' + encodeURIComponent(id) + '&limit=1'
  );
  if (!rows.length) throw new Error('Inspection not found: ' + id);
  var row = rows[0];
  var data = parseRawJsonb(row.raw_jsonb);
  data.inspectionId = data.inspectionId || row.inspection_id || id;
  data.id = data.id || data.inspectionId;
  data.status = row.status || data.status;
  data.folderId = data.folderId || row.drive_folder_id;
  requireReviewTokenForInspection(data, token);
  data = normalizeInspectionForReviewApi(data);
  var review = getReviewData(id, token);
  data.reviewedData = Object.assign(data.reviewedData || {}, review.reviewedData || {});
  if (data.reviewedData.submission && data.reviewedData.submission.status) {
    data.status = data.reviewedData.submission.status;
    data.submittedToTannerAt = data.reviewedData.submission.submittedAt || data.submittedToTannerAt || '';
  }
  return { inspection: data };
}

function deepMergeReviewData(target, source) {
  target = target || {};
  Object.keys(source || {}).forEach(function(key) {
    var value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      target[key] = deepMergeReviewData(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target;
}

function upsertReviewDataRecord(id, patch) {
  if (!id) throw new Error('Missing inspection id');
  var sheet = getOrCreateReviewSheet();
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var existing = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      rowIndex = i + 1;
      try { existing = JSON.parse(rows[i][1] || '{}'); } catch(e) { existing = {}; }
      break;
    }
  }
  var merged = deepMergeReviewData(existing, patch || {});
  var now = new Date().toISOString();
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 2).setValue(JSON.stringify(merged));
    sheet.getRange(rowIndex, 3).setValue(now);
  } else {
    sheet.appendRow([id, JSON.stringify(merged), now]);
  }
  return { reviewedData: merged, lastUpdated: now };
}

function reviewPortalHandoffReviewPatch(handoffResult) {
  if (!handoffResult) return {};
  return {
    reviewPortalData: handoffResult,
    folderId: handoffResult.folderId || '',
    folderUrl: handoffResult.folderUrl || '',
    assessmentFolderId: handoffResult.folderId || '',
    assessmentFolderUrl: handoffResult.folderUrl || '',
    reviewPortalDataSpreadsheetId: handoffResult.spreadsheetId || '',
    reviewPortalDataSpreadsheetUrl: handoffResult.spreadsheetUrl || '',
    reviewPortalDataUrl: handoffResult.spreadsheetUrl || '',
    rawReviewDataUrl: handoffResult.rawJsonUrl || '',
    rawReviewDataJsonUrl: handoffResult.rawJsonUrl || '',
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
    handoffUpdatedAt: handoffResult.updatedAt || '',
    lastHandoffError: handoffResult.error || '',
    system: {
      tannerHandoff: handoffResult
    }
  };
}

function saveReviewHandoffState(id, state) {
  if (!id || !state) return;
  var cleanState = deepMergeReviewData({}, state || {});
  cleanState.updatedAt = cleanState.updatedAt || new Date().toISOString();
  cleanState.error = cleanState.error || '';
  upsertReviewDataRecord(id, {
    handoffStatus: cleanState.status || '',
    handoffUpdatedAt: cleanState.updatedAt,
    lastHandoffError: cleanState.error || '',
    system: {
      tannerHandoff: cleanState
    }
  });
}

function formatReviewReadiness_(readiness) {
  if (!readiness || typeof readiness !== 'object') return '';
  var status = readiness.status || (readiness.blockerCount ? 'blocked' : 'ready');
  var passed = readiness.passed;
  var total = readiness.total;
  var blockers = readiness.blockerCount || 0;
  var parts = [status];
  if (passed !== undefined && total !== undefined) {
    parts.push(String(passed) + '/' + String(total) + ' required complete');
  }
  if (blockers) parts.push(String(blockers) + ' blocker' + (blockers === 1 ? '' : 's'));
  return parts.join(' - ');
}

function notifyTannerSubmission(data, reviewedData) {
  var id = data.id || data.inspectionId;
  var inspectorName = data.inspectorName || data.inspector || data.inspector_name || 'Inspector';
  var subject = 'InHaus review submitted - ' + (data.propertyAddress || id);
  var reviewUrl = 'https://inhauslab.github.io/inhaus-review/review.html?id=' +
    encodeURIComponent(id) + '&token=' + encodeURIComponent(data.token || '');
  var submission = reviewedData && reviewedData.submission ? reviewedData.submission : {};
  var readiness = data.reviewReadiness || submission.reviewReadiness || {};
  var body = [
    inspectorName + ' submitted an inspection review for report building.',
    '',
    'Inspection ID: ' + id,
    'Address: ' + (data.propertyAddress || ''),
    'Client: ' + (data.clientName || ''),
    'Submitted: ' + (data.submittedAt || ''),
    'Review readiness: ' + formatReviewReadiness_(readiness),
    'Photos: ' + ((data.photos || []).length),
    '',
    'Report Builder Notes:',
    data.reportBuilderNotes || (reviewedData && reviewedData.reportBuilderNotes) || '',
    '',
    data.reviewPortalDataUrl ? 'Review Portal Data Sheet:' : '',
    data.reviewPortalDataUrl || '',
    data.reviewPortalDataUrl ? '' : '',
    'Open review:',
    reviewUrl
  ].join('\n');
  MailApp.sendEmail({
    to: ALERT_CC || ALERT_EMAIL,
    cc: ALERT_EMAIL,
    subject: subject,
    body: body
  });
  return {
    status: 'sent',
    sentAt: new Date().toISOString(),
    to: ALERT_CC || ALERT_EMAIL,
    cc: ALERT_EMAIL
  };
}

function submitReviewToTanner(data) {
  requireAppsScriptDriveTrackerWriter('submitReviewToTanner');
  var id = data.id || data.inspectionId;
  if (!id) throw new Error('Missing inspection id');
  if (!data.token) throw new Error('Missing review token');
  var submittedAt = data.submittedAt || new Date().toISOString();
  var patch = deepMergeReviewData({}, data.reviewedData || {});
  patch.reportBuilderNotes = data.reportBuilderNotes || patch.reportBuilderNotes || '';
  patch.photos = data.photos || patch.photos || [];
  patch.submission = {
    status: 'Submitted to Tanner',
    submittedAt: submittedAt,
    reviewReadiness: data.reviewReadiness || null,
    readinessStatus: data.readinessStatus || '',
    readinessCompleted: data.readinessCompleted || 0,
    readinessRequired: data.readinessRequired || 0,
    blockerCount: data.blockerCount || 0
  };
  var saved = { reviewedData: patch };
  data.id = id;
  data.inspectionId = id;
  data.submittedAt = submittedAt;
  var handoffResult = null;
  try {
    handoffResult = ensureReviewPortalDataHandoff(id, data, saved.reviewedData);
    if (handoffResult) {
      var handoffPatch = reviewPortalHandoffReviewPatch(handoffResult);
      saved = upsertReviewDataRecord(id, deepMergeReviewData(patch, handoffPatch));
      data.reviewPortalData = handoffResult;
      data.reviewPortalDataUrl = handoffResult.spreadsheetUrl || '';
      data.folderId = handoffResult.folderId || data.folderId || '';
      data.folderUrl = handoffResult.folderUrl || data.folderUrl || '';
      if (handoffResult.isTestTraining !== true) {
        try {
          postToSupabase('ihl_assessments', {
            inspection_id: id,
            drive_folder_id: handoffResult.folderId || null,
            assessment_folder_url: handoffResult.folderUrl || null
          });
        } catch(updateErr) {
          console.error('Submit Supabase handoff link update failed:', updateErr.message);
        }
      }
    }
  } catch(e) {
    var handoffError = e.message || String(e);
    console.error('Review Portal Data handoff failed:', handoffError);
    throw new Error('Review Portal Data handoff failed: ' + handoffError);
  }
  var trackerOk = handoffResult && (handoffResult.trackerUrl || handoffResult.isTestTraining === true);
  if (!handoffResult || !handoffResult.folderUrl || !handoffResult.spreadsheetUrl || !trackerOk) {
    throw new Error('Review Portal Data handoff did not return a complete folder/sheet/tracker receipt.');
  }
  if (handoffResult.isTestTraining !== true) {
    try {
      postToSupabase('ihl_assessments', {
        inspection_id: id,
        status: 'Submitted to Tanner',
        completion_score: null,
        completion_grade: null,
        same_day_bonus: false
      });
    } catch(e) {
      console.error('Submit Supabase status update failed:', e.message);
    }
  }
  var notificationResult;
  try {
    notificationResult = notifyTannerSubmission(data, saved.reviewedData);
  } catch(e) {
    notificationResult = {
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: e && e.message ? e.message : String(e)
    };
    console.error('Tanner submission notification failed:', notificationResult.error);
  }
  try {
    upsertReviewDataRecord(id, {
      tannerNotificationStatus: notificationResult.status || '',
      lastTannerNotificationError: notificationResult.error || '',
      system: {
        tannerNotification: notificationResult
      }
    });
  } catch(e) {
    console.error('Could not save Tanner notification receipt:', e.message);
  }
  return {
    submitted: true,
    id: id,
    status: 'Submitted to Tanner',
    submittedAt: submittedAt,
    reviewPortalData: handoffResult,
    tannerNotification: notificationResult,
    notificationWarning: notificationResult && notificationResult.error ? notificationResult.error : '',
    handoffWarning: ''
  };
}

function submitReviewSmokeCheck(data) {
  var id = data.id || data.inspectionId;
  if (!id) throw new Error('Missing inspection id');
  if (!data.token) throw new Error('Missing review token');
  var result = getInspectionForReview(id, data.token);
  return {
    smoke: true,
    authorized: true,
    id: id,
    inspectionFound: !!(result && result.inspection),
    statusChanged: false,
    emailSent: false,
    checkedAt: new Date().toISOString()
  };
}

function repairReviewHandoff(data) {
  requireAppsScriptDriveTrackerWriter('repairReviewHandoff');
  var id = data.id || data.inspectionId;
  if (!id) throw new Error('Missing inspection id');
  requirePortalAccess(data.token);

  var review = getReviewData(id, data.token);
  var fieldData = review.reviewedData || {};
  var recovery = fieldData.system && fieldData.system.inspectionRecovery
    ? fieldData.system.inspectionRecovery
    : {};
  var source = deepMergeReviewData(deepMergeReviewData({}, recovery), data || {});
  source.id = id;
  source.inspectionId = id;
  source.status = source.status || fieldData.status || 'Needs Review';
  source.reviewReadiness = source.reviewReadiness || (fieldData.submission && fieldData.submission.reviewReadiness) || null;

  var handoffResult = ensureReviewPortalDataHandoff(id, source, fieldData);
  var handoffPatch = reviewPortalHandoffReviewPatch(handoffResult);
  var saved = upsertReviewDataRecord(id, handoffPatch);
  return {
    repaired: true,
    id: id,
    reviewPortalData: handoffResult,
    reviewedDataUpdatedAt: saved.lastUpdated
  };
}

function adminUnlockReview(data) {
  var id = data.id || data.inspectionId;
  if (!id) throw new Error('Missing inspection id');
  if (data.adminToken !== getReviewAdminToken()) throw new Error('Invalid admin token');
  var unlockedAt = new Date().toISOString();
  var saved = upsertReviewDataRecord(id, {
    submission: {
      status: 'Needs Review',
      unlockedAt: unlockedAt
    }
  });
  try {
    postToSupabase('ihl_assessments', {
      inspection_id: id,
      status: 'Needs Review'
    });
  } catch(e) {
    console.error('Admin unlock Supabase status update failed:', e.message);
  }
  return { unlocked: true, id: id, status: 'Needs Review', unlockedAt: unlockedAt, lastUpdated: saved.lastUpdated };
}

// ── START-INSPECTION ASSESSMENT SHELL ─────────────────────

function saveStartInspectionShellState(id, result) {
  if (!id || !result) return;
  var cleanState = deepMergeReviewData({}, result || {});
  cleanState.updatedAt = cleanState.updatedAt || new Date().toISOString();
  cleanState.error = cleanState.error || '';
  upsertReviewDataRecord(id, {
    assessmentNumber: cleanState.assessmentNumber || '',
    folderId: cleanState.folderId || '',
    folderUrl: cleanState.folderUrl || '',
    driveFolderId: cleanState.folderId || '',
    driveFolderUrl: cleanState.folderUrl || '',
    trackerRow: cleanState.trackerRow || '',
    trackerUrl: cleanState.trackerUrl || '',
    trackerRowUrl: cleanState.trackerUrl || '',
    trackerStatus: cleanState.trackerStatus || '',
    startInspectionShellStatus: cleanState.status || '',
    startInspectionShellUpdatedAt: cleanState.updatedAt,
    lastStartInspectionShellError: cleanState.error || '',
    isTestTraining: cleanState.isTestTraining === true,
    system: {
      startInspectionShell: cleanState
    }
  });
}

function writeStartInspectionAssessmentRecord(source, shellResult) {
  requireAppsScriptDriveTrackerWriter('writeStartInspectionAssessmentRecord');
  if (!source || !source.inspectionId || !shellResult) return;
  postToSupabase('ihl_assessments', {
    inspection_id: source.inspectionId,
    report_id: null,
    inspector_name: source.inspectorName || null,
    inspection_date: source.inspectionDate || null,
    status: source.status || 'In Progress',
    drive_folder_id: shellResult.folderId || null,
    assessment_folder_url: shellResult.folderUrl || null,
    water_source: source.waterSource || null,
    occupancy: source.occupancyDuringInspection || null,
    weather_conditions: source.weatherConditions || null,
    client_concerns: source.clientConcerns || null,
    known_problem_areas: source.knownProblemAreas || null,
    pets: source.pets || null,
    smoking_vaping: source.smokingVaping || null,
    stove_type: source.stoveType || null,
    fireplace: source.fireplace || null,
    carpeted_rooms: source.carpetedRooms || null,
    started_at: source.startedAt || new Date().toISOString(),
    ended_at: source.endedAt || null,
    completed_at: source.completedAt || null,
    app_version: source.appVersion || null,
    completion_score: null,
    completion_grade: null,
    same_day_bonus: false,
    payload_version: source.payloadVersion || null,
    raw_jsonb: source,
    source_system: shellResult.isTestTraining === true ? 'apps_script_start_shell_test_training' : 'apps_script_start_shell',
    source_id: source.inspectionId
  });
}

function startInspectionShell(data) {
  requireAppsScriptDriveTrackerWriter('startInspectionShell');
  var id = data.inspectionId || data.id;
  if (!id) throw new Error('Missing inspection id for startInspectionShell');

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var source = deepMergeReviewData({}, data || {});
    source.inspectionId = id;
    source.id = source.id || id;
    source.status = 'In Progress';
    source.isTestTraining = isTestTrainingInspection(source);
    source.startedAt = source.startedAt || new Date().toISOString();

    var folderContext = getOrCreateReviewHandoffFolder(source);
    var folder = folderContext.folder;
    source.assessmentNumber = source.assessmentNumber || folderContext.assessmentNumber || '';
    source.isTestTraining = folderContext.isTestTraining === true || source.isTestTraining === true;
    if (source.isTestTraining) source.assessmentNumber = '';
    source.folderId = folder.getId();
    source.driveFolderId = folder.getId();
    source.folderUrl = folder.getUrl();
    source.driveFolderUrl = folder.getUrl();

    var photosFolder = getOrCreateAssessmentPhotosFolder(folder, source);
    var cocsFolder = getOrCreateAssessmentCocsFolder(folder, source);
    var backupFolder = getOrCreateAssessmentBackupFolder(folder, source);
    var trackerResult = source.isTestTraining
      ? { row: '', url: '', status: 'skipped_test_training' }
      : upsertReportTrackerHandoffRow(source, { folder: folder });

    var result = {
      status: 'ready',
      shellStatus: 'ready',
      isTestTraining: source.isTestTraining === true,
      inspectionId: id,
      assessmentNumber: source.assessmentNumber || '',
      folderId: folder.getId(),
      folderUrl: folder.getUrl(),
      folderName: folder.getName(),
      photosFolderId: photosFolder.getId(),
      photosFolderUrl: photosFolder.getUrl(),
      technicianPhotosFolderId: photosFolder.getId(),
      technicianPhotosFolderUrl: photosFolder.getUrl(),
      cocsFolderId: cocsFolder.getId(),
      cocsFolderUrl: cocsFolder.getUrl(),
      backupFolderId: backupFolder.getId(),
      backupFolderUrl: backupFolder.getUrl(),
      trackerRow: trackerResult.row,
      trackerUrl: trackerResult.url,
      trackerStatus: trackerResult.status || (source.isTestTraining ? 'skipped_test_training' : 'In Progress'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: ''
    };
    source.startInspectionShell = result;
    writeStartInspectionAssessmentRecord(source, result);
    saveStartInspectionShellState(id, result);
    return result;
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

// ── REVIEW PORTAL DATA HANDOFF ───────────────────────────

const RAW_REVIEW_DATA_TAB_NAME = 'Raw Review Data';
const REVIEW_PORTAL_DATA_TAB_NAME = 'Review Portal Data';
const SHEETS_SAFE_CELL_CHAR_LIMIT = 45000;

function ensureReviewPortalDataHandoff(id, submitData, reviewedData) {
  requireAppsScriptDriveTrackerWriter('ensureReviewPortalDataHandoff');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return ensureReviewPortalDataHandoffLocked(id, submitData, reviewedData);
  } finally {
    try { lock.releaseLock(); } catch(e) {}
  }
}

function ensureReviewPortalDataHandoffLocked(id, submitData, reviewedData) {
  var fieldData = reviewedData || {};
  var runId = 'handoff-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  saveReviewHandoffState(id, {
    status: 'running',
    runId: runId,
    startedAt: new Date().toISOString(),
    inspectionId: id
  });

  try {
    var source = buildReviewHandoffSource(id, submitData || {}, fieldData);
    var folderContext = getOrCreateReviewHandoffFolder(source);
    var folder = folderContext.folder;
    source.assessmentNumber = source.assessmentNumber || folderContext.assessmentNumber || '';
    source.isTestTraining = folderContext.isTestTraining === true || isTestTrainingInspection(source);
    var ss = getOrCreateReviewPortalDataSpreadsheet(folder, source);
    var cocsFolder = getOrCreateAssessmentCocsFolder(folder, source);
    var backupFolder = getOrCreateAssessmentBackupFolder(folder, source);
    var techPhotosFolder = getOrCreateTechnicianPhotosFolder(folder, source);
    var rawJsonUrl = createRawReviewDataJsonBackup(backupFolder, id, fieldData);
    var handoffPhotos = collectHandoffPhotos(source, fieldData);
    var technicianPhotoSync = syncTechnicianPhotosFolder(techPhotosFolder, handoffPhotos);
    if (technicianPhotoSync.failed > 0) {
      throw new Error('Photos folder copy failed for ' + technicianPhotoSync.failed + ' Drive-backed photo(s).');
    }

    writeReviewPortalDataSpreadsheet(ss, source, fieldData, rawJsonUrl);
    writePhotoLogSpreadsheetTab(ss, handoffPhotos, techPhotosFolder, technicianPhotoSync);
    var trackerResult = source.isTestTraining
      ? { row: '', url: '', status: 'skipped_test_training' }
      : upsertReportTrackerHandoffRow(source, {
          folder: folder,
          spreadsheet: ss,
          rawJsonUrl: rawJsonUrl,
          technicianPhotosFolder: techPhotosFolder
        });

    var result = {
      status: 'ready',
      isTestTraining: source.isTestTraining === true,
      runId: runId,
      updatedAt: new Date().toISOString(),
      assessmentNumber: source.assessmentNumber || '',
      folderId: folder.getId(),
      folderUrl: folder.getUrl(),
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      technicianPhotosFolderId: techPhotosFolder.getId(),
      technicianPhotosFolderUrl: techPhotosFolder.getUrl(),
      photosFolderId: techPhotosFolder.getId(),
      photosFolderUrl: techPhotosFolder.getUrl(),
      cocsFolderId: cocsFolder.getId(),
      cocsFolderUrl: cocsFolder.getUrl(),
      backupFolderId: backupFolder.getId(),
      backupFolderUrl: backupFolder.getUrl(),
      rawJsonUrl: rawJsonUrl,
      trackerRow: trackerResult.row,
      trackerUrl: trackerResult.url,
      trackerStatus: trackerResult.status || 'ready',
      error: '',
      rawKeyCount: Object.keys(fieldData).length,
      dynamicFieldCount: getDynamicReviewFieldRows(fieldData).length,
      photoLogCount: handoffPhotos.length,
      technicianPhotoCopyCount: technicianPhotoSync.copied,
      technicianPhotoExistingCount: technicianPhotoSync.existing,
      technicianPhotoSkippedCount: technicianPhotoSync.skipped,
      technicianPhotoFailedCount: technicianPhotoSync.failed
    };
    saveReviewHandoffState(id, result);
    return result;
  } catch(e) {
    saveReviewHandoffState(id, {
      status: 'failed',
      runId: runId,
      failedAt: new Date().toISOString(),
      inspectionId: id,
      error: e && e.message ? e.message : String(e)
    });
    throw e;
  }
}

function buildReviewHandoffSource(id, submitData, reviewedData) {
  var source = {};
  try {
    var rows = getFromSupabase(
      'ihl_assessments',
      'select=inspection_id,status,drive_folder_id,assessment_folder_url,raw_jsonb&inspection_id=eq.' +
        encodeURIComponent(id) + '&limit=1'
    );
    if (rows && rows.length) {
      source = parseRawJsonb(rows[0].raw_jsonb) || {};
      source.inspectionId = source.inspectionId || rows[0].inspection_id || id;
      source.folderId = source.folderId || rows[0].drive_folder_id || '';
      source.assessmentFolderUrl = source.assessmentFolderUrl || rows[0].assessment_folder_url || '';
      source.status = rows[0].status || source.status || '';
    }
  } catch(e) {
    console.warn('Could not hydrate assessment source for handoff:', e.message);
  }
  source = deepMergeReviewData(source || {}, submitData || {});
  source.inspectionId = source.inspectionId || id;
  source.id = source.id || source.inspectionId;
  source.reviewedData = reviewedData || {};
  source.status = (reviewedData && reviewedData.submission && reviewedData.submission.status) ||
    submitData.status || source.status || 'Submitted to Tanner';
  return source;
}

function getOrCreateReviewHandoffFolder(source) {
  var folderId = source.folderId || source.driveFolderId || source.drive_folder_id || '';
  if (folderId) {
    try {
      var existing = DriveApp.getFolderById(folderId);
      return {
        folder: existing,
        assessmentNumber: isTestTrainingInspection(source) ? '' : (source.assessmentNumber || parseAssessmentNumberFromFolderName(existing.getName() || '')),
        isTestTraining: isTestTrainingInspection(source)
      };
    } catch(e) {
      console.warn('Saved assessment folder ID could not be opened; falling back to folder search/create:', folderId, e.message);
      source.folderId = '';
      source.driveFolderId = '';
      source.drive_folder_id = '';
    }
  }

  var isTestTraining = isTestTrainingInspection(source);
  var assessmentNum = isTestTraining ? '' : (source.assessmentNumber || getNextAssessmentNumber());
  var folderName = generateFolderName(assessmentNum, source);
  var parentFolder = getAssessmentParentFolder(source);
  var folder = USE_SHARED_DRIVE
    ? getOrCreateInspectionFolderInSharedDrive(parentFolder.getId(), folderName, source.inspectionId, source)
    : parentFolder.createFolder(folderName);
  return {
    folder: folder,
    assessmentNumber: isTestTraining ? '' : (parseAssessmentNumberFromFolderName(folder.getName() || '') || assessmentNum),
    isTestTraining: isTestTraining
  };
}

function parseAssessmentNumberFromFolderName(name) {
  var match = String(name || '').match(/^(\d{3})\b/);
  return match ? match[1] : '';
}

function getOrCreateTechnicianPhotosFolder(parentFolder, source) {
  return getOrCreateAssessmentPhotosFolder(parentFolder, source);
}

function getOrCreateReviewPortalDataSpreadsheet(folder, source) {
  var id = source.inspectionId || source.id || '';
  var lastName = getClientLastName(source.clientName || '');
  var targetName = 'Review Portal Data — ' + lastName + ' — ' + id;
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (file.getMimeType() !== MimeType.GOOGLE_SHEETS) continue;
    var name = file.getName() || '';
    if (name.indexOf('Review Portal Data') > -1 && (!id || name.indexOf(id) > -1)) {
      return SpreadsheetApp.openById(file.getId());
    }
  }

  var ss = SpreadsheetApp.create(targetName);
  ss.getSheets()[0].setName(REVIEW_PORTAL_DATA_TAB_NAME);
  var ssFile = DriveApp.getFileById(ss.getId());
  folder.addFile(ssFile);
  try { DriveApp.getRootFolder().removeFile(ssFile); } catch(e) {}
  return ss;
}

function createRawReviewDataJsonBackup(folder, id, fieldData) {
  var name = 'Raw Review Data — ' + id + ' — latest.json';
  var payload = JSON.stringify({
    inspectionId: id,
    generatedAt: new Date().toISOString(),
    rawKeyCount: Object.keys(fieldData || {}).length,
    fieldData: fieldData || {}
  }, null, 2);
  var files = folder.getFilesByName(name);
  var file;
  if (files.hasNext()) {
    file = files.next();
    file.setContent(payload);
  } else {
    var blob = Utilities.newBlob(payload, 'application/json', name);
    file = folder.createFile(blob);
  }
  return file.getUrl();
}

function writeReviewPortalDataSpreadsheet(ss, source, fieldData, rawJsonUrl) {
  var formatted = getOrResetSheet(ss, REVIEW_PORTAL_DATA_TAB_NAME, 0);
  writeFormattedReviewPortalData(formatted, source, fieldData);

  var raw = getOrResetSheet(ss, RAW_REVIEW_DATA_TAB_NAME, 1);
  writeRawReviewData(raw, fieldData, rawJsonUrl);
}

function collectHandoffPhotos(source, fieldData) {
  var out = [];
  var seen = {};

  function addPhoto(photo) {
    if (!photo || typeof photo !== 'object') return;
    var id = photo.photoId || photo.photo_id || photo.id || '';
    var url = photo.driveUrl || photo.drive_url || photo.url || photo.highResUrl || photo.thumbnailUrl || '';
    var storagePath = photo.storagePath || photo.storage_path || '';
    var key = id || url || storagePath;
    if (!key || seen[key]) return;
    seen[key] = true;
    out.push({
      photoId: id,
      room: photo.roomName || photo.room_name || photo.room || '',
      step: photo.stepName || photo.step_name || photo.step || photo.slot || '',
      caption: photo.caption || photo.aiCaption || '',
      driveUrl: url,
      storagePath: storagePath,
      timestamp: photo.timestamp || photo.created_at || photo.createdAt || '',
      included: photo.included === true ? 'Yes' : (photo.included === false ? 'No' : '')
    });
  }

  function addPhotoArray(value) {
    if (!Array.isArray(value)) return;
    value.forEach(addPhoto);
  }

  addPhotoArray(source.photos);
  addPhotoArray(source.workerPhotos);
  addPhotoArray(fieldData && fieldData.photos);
  Object.keys(fieldData || {}).forEach(function(key) {
    var value = fieldData[key];
    if (/^photo_/.test(key) && value && typeof value === 'object') {
      addPhoto({
        photoId: key.replace(/^photo_/, ''),
        caption: value.caption || '',
        included: value.included
      });
    }
  });
  return out;
}

function getDriveFileIdFromUrl(url) {
  var text = String(url || '');
  var match = text.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
}

function safeDriveFileName(value, fallback) {
  var clean = String(value || fallback || 'Photo')
    .replace(/[\\/:*?"<>|#%{}~&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length > 140) clean = clean.substring(0, 140).trim();
  return clean || fallback || 'Photo';
}

function technicianPhotoCopyName(photo, sourceFileId, index) {
  var parts = [
    photo.photoId || sourceFileId || ('photo-' + (index + 1)),
    photo.room || '',
    photo.step || ''
  ].filter(Boolean);
  return safeDriveFileName(parts.join(' - '), 'Technician Photo ' + (index + 1));
}

function buildTechnicianPhotoExistingMap(folder) {
  var existing = {};
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var name = '';
    var desc = '';
    try { name = file.getName() || ''; } catch(e) {}
    try { desc = file.getDescription() || ''; } catch(e) {}
    var photoMatch = (desc + '\n' + name).match(/photoId:\s*([^\n]+)/i);
    var sourceMatch = (desc + '\n' + name).match(/sourceFileId:\s*([a-zA-Z0-9_-]+)/i);
    if (photoMatch) existing['photo:' + String(photoMatch[1]).trim()] = true;
    if (sourceMatch) existing['file:' + String(sourceMatch[1]).trim()] = true;
  }
  return existing;
}

function syncTechnicianPhotosFolder(folder, photos) {
  var result = { copied: 0, existing: 0, skipped: 0, failed: 0 };
  if (!folder || !photos || !photos.length) return result;
  var existing = buildTechnicianPhotoExistingMap(folder);
  photos.forEach(function(photo, index) {
    var sourceFileId = getDriveFileIdFromUrl(photo.driveUrl || '');
    if (!sourceFileId) {
      result.skipped++;
      return;
    }
    var photoKey = photo.photoId ? 'photo:' + photo.photoId : '';
    var fileKey = 'file:' + sourceFileId;
    if ((photoKey && existing[photoKey]) || existing[fileKey]) {
      result.existing++;
      return;
    }
    try {
      var sourceFile = DriveApp.getFileById(sourceFileId);
      var copy = sourceFile.makeCopy(technicianPhotoCopyName(photo, sourceFileId, index), folder);
      copy.setDescription([
        photo.photoId ? 'photoId: ' + photo.photoId : '',
        'sourceFileId: ' + sourceFileId,
        photo.room ? 'room: ' + photo.room : '',
        photo.step ? 'step: ' + photo.step : '',
        photo.caption ? 'caption: ' + photo.caption : ''
      ].filter(Boolean).join('\n'));
      try { copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(e) {}
      if (photoKey) existing[photoKey] = true;
      existing[fileKey] = true;
      result.copied++;
    } catch(e) {
      console.warn('Technician photo copy failed:', e.message);
      result.failed++;
    }
  });
  return result;
}

function writePhotoLogSpreadsheetTab(ss, photos, techPhotosFolder, technicianPhotoSync) {
  var sheet = getOrResetSheet(ss, 'Photo Log', 2);
  var folderUrl = techPhotosFolder ? techPhotosFolder.getUrl() : '';
  var sync = technicianPhotoSync || { copied: 0, existing: 0, skipped: 0, failed: 0 };
  var rows = [[
    'Photo ID',
    'Room',
    'Step',
    'Caption',
    'Drive URL',
    'Supabase Storage Path',
    'Included',
    'Timestamp',
    'Photos Folder',
    'Technician Folder Sync'
  ]];
  (photos || []).forEach(function(photo) {
    rows.push([
      photo.photoId || '',
      photo.room || '',
      photo.step || '',
      photo.caption || '',
      photo.driveUrl || '',
      photo.storagePath || '',
      photo.included || '',
      photo.timestamp || '',
      folderUrl,
      photo.driveUrl ? 'Drive copy/link checked' : 'No Drive URL; use Supabase storage path'
    ]);
  });
  if (rows.length === 1) rows.push(['No photos found in review/source payload.', '', '', '', '', '', '', '', folderUrl, '']);
  rows.push(['Technician folder sync summary', '', '', '', '', '', '', '', folderUrl,
    'copied=' + sync.copied + ', existing=' + sync.existing + ', skipped=' + sync.skipped + ', failed=' + sync.failed
  ]);
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#e8f1dc');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 320);
  sheet.setColumnWidth(5, 420);
  sheet.setColumnWidth(6, 320);
  sheet.setColumnWidth(9, 360);
  sheet.setColumnWidth(10, 240);
}

function normalizeTrackerHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[#&/()._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getReportTrackerHeaderMap(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), 41);
  var map = { exact: {}, normalized: {} };
  [6, 7].forEach(function(rowNum) {
    var row = sheet.getRange(rowNum, 1, 1, lastColumn).getValues()[0];
    row.forEach(function(value, index) {
      var exact = String(value || '').trim();
      if (!exact) return;
      var col = index + 1;
      if (!map.exact[exact]) map.exact[exact] = col;
      var normalized = normalizeTrackerHeader(exact);
      if (normalized && !map.normalized[normalized]) map.normalized[normalized] = col;
    });
  });
  return map;
}

function findTrackerColumn(headerMap, labels, fallbackCol) {
  for (var i = 0; i < labels.length; i++) {
    var label = String(labels[i] || '').trim();
    if (headerMap.exact[label]) return headerMap.exact[label];
    var normalized = normalizeTrackerHeader(label);
    if (headerMap.normalized[normalized]) return headerMap.normalized[normalized];
  }
  return fallbackCol || 0;
}

function getTrackerColumns(sheet) {
  var headers = getReportTrackerHeaderMap(sheet);
  return {
    trackerStatus: 1,
    assessment: findTrackerColumn(headers, ['Assessment #', 'Assessment No', 'Assessment Number', 'Assessment'], 2),
    customerId: findTrackerColumn(headers, ['C-ID', 'Customer ID', 'Customer Id', 'CID'], 3),
    homeId: findTrackerColumn(headers, ['H-ID', 'Home ID', 'HID'], 4),
    reportId: findTrackerColumn(headers, ['RPT-ID', 'Report ID', 'RPT ID', 'Report'], 5),
    address: findTrackerColumn(headers, ['Address', 'Property Address', 'Street Address'], 6),
    inspector: findTrackerColumn(headers, ['Inspector', 'Technician', 'Inspector Name'], 7),
    date: findTrackerColumn(headers, ['Date', 'Inspection Date', 'Assessment Date'], 8),
    status: findTrackerColumn(headers, ['Status', 'Report Status', 'Assessment Status'], 9),
    inhId: findTrackerColumn(headers, ['INH-ID', 'INH ID', 'Inspection ID', 'InspectionId'], 10),
    client: findTrackerColumn(headers, ['Client', 'Client Name', 'Customer', 'Customer Name', 'Name'], 11),
    folder: findTrackerColumn(headers, ['Assessment Folder', 'Folder Link', 'Drive Folder', 'Folder URL', 'Folder'], 41)
  };
}

function findNextAvailableTrackerRow(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), TRACKER_DATA_START);
  var values = sheet.getRange(TRACKER_DATA_START, 1, lastRow - TRACKER_DATA_START + 1, 11).getValues();
  for (var i = 0; i < values.length; i++) {
    var hasAnyValue = values[i].some(function(cell) {
      return String(cell || '').trim() !== '';
    });
    if (!hasAnyValue) return TRACKER_DATA_START + i;
  }
  return lastRow + 1;
}

function findTrackerRowByInspectionId(sheet, col, inspectionId) {
  if (!col || !inspectionId) return 0;
  var lastRow = sheet.getLastRow();
  if (lastRow < TRACKER_DATA_START) return 0;
  var values = sheet.getRange(TRACKER_DATA_START, col, lastRow - TRACKER_DATA_START + 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(inspectionId).trim()) {
      return TRACKER_DATA_START + i;
    }
  }
  return 0;
}

function trackerFormula(url, label) {
  if (!url) return '';
  return '=HYPERLINK("' + String(url).replace(/"/g, '""') + '","' + String(label || 'Open').replace(/"/g, '""') + '")';
}

function writeTrackerCell(sheet, row, col, value, overwrite) {
  if (!col || value === undefined || value === null || value === '') return;
  var range = sheet.getRange(row, col);
  if (!overwrite && String(range.getValue() || '').trim()) return;
  range.setValue(value);
}

function upsertReportTrackerHandoffRow(source, artifacts) {
  requireAppsScriptDriveTrackerWriter('upsertReportTrackerHandoffRow');
  var ss = SpreadsheetApp.openById(TRACKER_SHEET_ID);
  var sheet = ss.getSheetByName(TRACKER_TAB_REPORT);
  if (!sheet) throw new Error('Report tracker tab not found: ' + TRACKER_TAB_REPORT);
  var columns = getTrackerColumns(sheet);
  var inspectionId = source.inspectionId || source.id || '';
  var row = findTrackerRowByInspectionId(sheet, columns.inhId, inspectionId);
  if (!row) {
    row = findNextAvailableTrackerRow(sheet);
  }

  var folderUrl = artifacts.folder ? artifacts.folder.getUrl() : '';
  var assessmentNumber = source.assessmentNumber || parseAssessmentNumberFromFolderName(artifacts.folder ? artifacts.folder.getName() : '');
  var inspectionDate = source.inspectionDate || (source.submittedAt ? String(source.submittedAt).substring(0, 10) : '');
  var trackerStatus = 'In Progress';

  writeTrackerCell(sheet, row, columns.trackerStatus, trackerStatus, true);
  writeTrackerCell(sheet, row, columns.assessment, assessmentNumber, false);
  writeTrackerCell(sheet, row, columns.customerId, source.customerId || source.cId || source.cid || '', false);
  writeTrackerCell(sheet, row, columns.homeId, source.homeId || source.hId || source.hid || '', false);
  writeTrackerCell(sheet, row, columns.reportId, source.reportId || source.rptId || source.rpt_id || '', false);
  writeTrackerCell(sheet, row, columns.address, source.propertyAddress || source.address || '', false);
  writeTrackerCell(sheet, row, columns.inspector, source.inspectorName || source.inspector || '', false);
  writeTrackerCell(sheet, row, columns.date, inspectionDate, false);
  writeTrackerCell(sheet, row, columns.status, trackerStatus, true);
  writeTrackerCell(sheet, row, columns.inhId, inspectionId, false);
  writeTrackerCell(sheet, row, columns.client, source.clientName || '', false);
  writeTrackerCell(sheet, row, columns.folder, trackerFormula(folderUrl, 'Assessment Folder'), true);

  return {
    row: row,
    url: ss.getUrl() + '#gid=' + sheet.getSheetId() + '&range=A' + row,
    status: trackerStatus
  };
}

function getOrResetSheet(ss, title, zeroBasedIndex) {
  var sheet = ss.getSheetByName(title);
  if (!sheet) {
    sheet = ss.insertSheet(title, Math.max(0, zeroBasedIndex));
  } else {
    sheet.clear();
  }
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(zeroBasedIndex + 1);
  return sheet;
}

function naturalReviewKeyCompare(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

function serializeReviewValueForSheet(key, value, rawJsonUrl) {
  var type;
  var text;
  if (value === null || value === undefined) {
    return { value: '', type: 'null' };
  }
  if (Array.isArray(value)) {
    type = 'list';
    text = value.map(function(item) {
      return item && typeof item === 'object' ? JSON.stringify(item) : String(item);
    }).join(', ');
  } else if (typeof value === 'object') {
    type = 'json';
    text = JSON.stringify(value);
  } else if (typeof value === 'boolean') {
    type = 'boolean';
    text = value ? 'TRUE' : 'FALSE';
  } else if (typeof value === 'number') {
    type = 'number';
    text = String(value);
  } else {
    type = 'string';
    text = String(value);
  }

  if (text.length > SHEETS_SAFE_CELL_CHAR_LIMIT) {
    return {
      value: 'Full value exceeds Google Sheets single-cell limit. Complete unfiltered raw backup file: ' + rawJsonUrl,
      type: type + '-overflow'
    };
  }
  return { value: text, type: type };
}

function writeRawReviewData(sheet, fieldData, rawJsonUrl) {
  var rows = [['Key', 'Value', 'Type']];
  Object.keys(fieldData || {}).sort(naturalReviewKeyCompare).forEach(function(key) {
    var serialized = serializeReviewValueForSheet(key, fieldData[key], rawJsonUrl);
    rows.push([key, serialized.value, serialized.type]);
  });
  if (rows.length > 1) {
    sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  } else {
    sheet.getRange(1, 1, 1, 3).setValues(rows);
  }
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#e8f1dc');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 240);
  sheet.setColumnWidth(2, 620);
  sheet.setColumnWidth(3, 140);
}

function getDynamicReviewFieldRows(fieldData) {
  var re = /^(obs_\d+_(location|note|photoIds)|actionTaken_\d+_(desc|photoIds)|followUp_\d+_(desc|timeframe|photoIds))$/;
  return Object.keys(fieldData || {})
    .filter(function(key) { return re.test(key); })
    .sort(naturalReviewKeyCompare)
    .map(function(key) {
      var serialized = serializeReviewValueForSheet(key, fieldData[key], '');
      return [key, serialized.value, serialized.type];
    });
}

function writeFormattedReviewPortalData(sheet, source, fieldData) {
  var rows = [
    ['Review Portal Data', source.clientName || '', source.inspectionId || ''],
    ['Field', 'Value', 'Notes'],
    ['Status', source.status || '', 'From review portal submit'],
    ['Submitted At', source.submittedAt || (fieldData.submission && fieldData.submission.submittedAt) || '', ''],
    ['Review Readiness', formatReviewReadiness_(source.reviewReadiness || (fieldData.submission && fieldData.submission.reviewReadiness) || null), 'Required Finish Review items at submit'],
    ['Blockers At Submit', source.blockerCount || (fieldData.submission && fieldData.submission.blockerCount) || 0, ''],
    ['Review Updated At', new Date().toISOString(), ''],
    ['Report Builder Notes', fieldData.reportBuilderNotes || source.reportBuilderNotes || '', 'Tanner-facing note from review portal'],
    ['', '', '']
  ];

  appendTestRows(rows, source, fieldData);
  appendDynamicReviewFieldRows(rows, fieldData);
  appendPhotoDecisionRows(rows, fieldData);

  var width = 3;
  var padded = rows.map(function(row) {
    var out = row.slice(0, width);
    while (out.length < width) out.push('');
    return out;
  });
  sheet.getRange(1, 1, padded.length, width).setValues(padded);
  sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#e8f1dc');
  sheet.setFrozenRows(2);
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 520);
  sheet.setColumnWidth(3, 220);
}

function appendTestRows(rows, source, fieldData) {
  var tests = (fieldData && fieldData.tests) || source.tests || {};
  rows.push(['Testing IDs / Confirmations', '', '']);
  rows.push(['Test', 'ID / Value', 'Confirmed']);
  rows.push(['PFAS', tests.pfasSampleId || source.pfasSampleId || '', yesNoText(tests.testPFAS_confirmed)]);
  rows.push(['Water Panel', tests.waterSampleId || source.waterSampleId || '', yesNoText(tests.testWaterPanel_confirmed)]);
  rows.push(['Boulder Blue', tests.boulderBlueSampleId || source.boulderBlueSampleId || '', yesNoText(tests.testBoulderBlue_confirmed)]);
  rows.push(['Breeze', tests.breezeSampleId || source.breezeSampleId || '', yesNoText(tests.testBreeze_confirmed)]);
  rows.push(['Radon', tests.radonSampleId || source.radonSampleId || '', yesNoText(tests.testRadon_confirmed)]);
  rows.push(['Microplastics', tests.microplasticsSampleId || source.microplasticsSampleId || '', yesNoText(tests.testMicroplastics_confirmed)]);
  rows.push(['ATP', tests.atpSampleId || source.atpSampleId || '', yesNoText(tests.testATP_confirmed)]);
  rows.push(['', '', '']);
}

function appendDynamicReviewFieldRows(rows, fieldData) {
  var dynamicRows = getDynamicReviewFieldRows(fieldData);
  rows.push(['Dynamic Review Fields', '', '']);
  rows.push(['Key', 'Value', 'Type']);
  if (!dynamicRows.length) {
    rows.push(['No dynamic observation/action/follow-up fields recorded.', '', '']);
  } else {
    dynamicRows.forEach(function(row) { rows.push(row); });
  }
  rows.push(['', '', '']);
}

function appendPhotoDecisionRows(rows, fieldData) {
  var photoKeys = Object.keys(fieldData || {}).filter(function(key) {
    return /^photo_/.test(key);
  }).sort(naturalReviewKeyCompare);
  rows.push(['Included Photo Decisions', '', '']);
  rows.push(['Photo ID', 'Included', 'Caption']);
  if (!photoKeys.length) {
    rows.push(['No review photo decision fields recorded.', '', '']);
    return;
  }
  photoKeys.forEach(function(key) {
    var value = fieldData[key] || {};
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch(e) { value = {}; }
    }
    rows.push([
      key.replace(/^photo_/, ''),
      value.included === true ? 'Yes' : (value.included === false ? 'No' : ''),
      value.caption || ''
    ]);
  });
}

function yesNoText(value) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

// ── MAIN PROCESSING ──────────────────────────────────────

function processInspection(data) {
  requireAppsScriptDriveTrackerWriter('processInspection');
  var result;
  // Option A: Append to master sheet as a row
  if (MASTER_SHEET_ID) {
    result = appendToMasterSheet(data);
  } else {
    // Option B: Create individual sheet per inspection
    result = createInspectionSheet(data);
  }
  // Phase 3: POST to Supabase after Drive sync
  syncToSupabase(data, result);
  return result;
}

// ── OPTION A: MASTER SHEET (all inspections as rows) ─────

function appendToMasterSheet(data) {
  const ss = SpreadsheetApp.openById(MASTER_SHEET_ID);
  let sheet = ss.getSheetByName('Inspections');
  
  if (!sheet) {
    sheet = ss.insertSheet('Inspections');
    sheet.appendRow(getCSVHeaders());
  }
  
  sheet.appendRow(getCSVValues(data));
  
  return {
    spreadsheetUrl: ss.getUrl(),
    inspectionId: data.inspectionId
  };
}

// ── ASSESSMENT NUMBER & FOLDER NAMING ─────────────────────────────────────────
//
// getNextAssessmentNumber()
// Reads the Report Tracker col B, skips TEST/TRAINING rows, returns next
// available number as a zero-padded 3-digit string.  REUSABLE by tracker write.
//
function getNextAssessmentNumber() {
  var ss    = SpreadsheetApp.openById(TRACKER_SHEET_ID);
  var sheet = ss.getSheetByName(TRACKER_TAB_REPORT);
  if (!sheet) throw new Error('getNextAssessmentNumber: tab not found: ' + TRACKER_TAB_REPORT);

  var lastRow = sheet.getLastRow();
  if (lastRow < TRACKER_DATA_START) {
    throw new Error('getNextAssessmentNumber: no data rows found in ' + TRACKER_TAB_REPORT +
                    ' (lastRow=' + lastRow + ', expected >= ' + TRACKER_DATA_START + ')');
  }

  var numRows = lastRow - TRACKER_DATA_START + 1;
  var values  = sheet.getRange(TRACKER_DATA_START, 2, numRows, 1).getValues();

  var highest = -1;
  for (var i = 0; i < values.length; i++) {
    var cell = String(values[i][0]).trim();
    if (!cell || cell === '' || cell === 'N/A') continue;
    if (/^TEST/i.test(cell) || /^TRAIN/i.test(cell)) continue;
    var n = parseInt(cell, 10);
    if (!isNaN(n) && n > highest) highest = n;
  }

  if (highest < 0) {
    throw new Error('getNextAssessmentNumber: no valid numeric assessment numbers found in ' +
                    TRACKER_TAB_REPORT + ' — check tab name, column B, and TRACKER_DATA_START');
  }

  return String(highest + 1).padStart(3, '0');
}

// generateFolderName(assessmentNum, data)
// Produces: [###] – [YYYY-MM-DD] – [LastName] – [Street Address]
//
function generateFolderName(assessmentNum, data) {
  var lastName   = getClientLastName(data.clientName);
  var streetAddr = getStreetAddressForFolder(data);
  if (!streetAddr) streetAddr = data.inspectionId || 'Unknown';

  var dateStr = '';
  if (data.inspectionDate && /^\d{4}-\d{2}-\d{2}$/.test(data.inspectionDate)) {
    dateStr = data.inspectionDate;
  } else if (data.startedAt) {
    dateStr = data.startedAt.substring(0, 10);
  } else {
    dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  if (isTestTrainingInspection(data)) {
    return 'TEST – ' + dateStr + ' – ' + lastName + ' – ' + streetAddr;
  }
  return assessmentNum + ' – ' + dateStr + ' – ' + lastName + ' – ' + streetAddr;
}

// ── OPTION B: INDIVIDUAL SHEET PER INSPECTION ────────────

function getClientLastName(fullName) {
  if (!fullName) return 'Unknown';
  var parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1];
}

function createInspectionSheet(data) {
  requireAppsScriptDriveTrackerWriter('createInspectionSheet');
  var inspId = data.inspectionId || '';

  // Determine assessment number and canonical folder name (new format: ### – YYYY-MM-DD – LastName – Street)
  var isTestTraining = isTestTrainingInspection(data);
  var assessmentNum = isTestTraining ? '' : (data.assessmentNumber || getNextAssessmentNumber());
  var folderName    = generateFolderName(assessmentNum, data);
  // Deduplicate: search for existing folder/sheet with this inspectionId
  var inspFolder = null;
  var ss = null;

  if (USE_SHARED_DRIVE) {
    inspFolder = getOrCreateInspectionFolderInSharedDrive(getAssessmentParentFolder(data).getId(), folderName, inspId, data);
    if (inspId) {
      var sheetIter = inspFolder.getFiles();
      while (sheetIter.hasNext()) {
        var sf = sheetIter.next();
        if (sf.getMimeType() === MimeType.GOOGLE_SHEETS) {
          ss = SpreadsheetApp.openById(sf.getId());
          break;
        }
      }
    }
  } else {
    var parentFolder = getAssessmentParentFolder(data);
    if (inspId) {
      var folders = parentFolder.getFolders();
      while (folders.hasNext()) {
        var f = folders.next();
        if (f.getName().indexOf(inspId) > -1) {
          inspFolder = f;
          var files = f.getFiles();
          while (files.hasNext()) {
            var existingFile = files.next();
            if (existingFile.getMimeType() === MimeType.GOOGLE_SHEETS) {
              ss = SpreadsheetApp.openById(existingFile.getId());
              break;
            }
          }
          break;
        }
      }
    }
    if (!inspFolder) inspFolder = parentFolder.createFolder(folderName);
  }

  if (!ss) {
    const sheetName = 'InHaus Inspection \u2014 ' + (data.inspectionId || 'Unknown');
    ss = SpreadsheetApp.create(sheetName);
    if (USE_SHARED_DRIVE) {
      moveFileToSharedDriveFolder(ss.getId(), inspFolder.getId());
    } else {
      const file = DriveApp.getFileById(ss.getId());
      inspFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
    }
  } else {
    // Clear all sheets for rewrite; keep at least one sheet to avoid errors
    var existingSheets = ss.getSheets();
    for (var i = existingSheets.length - 1; i > 0; i--) {
      ss.deleteSheet(existingSheets[i]);
    }
    existingSheets[0].clearContents();
    existingSheets[0].setName('Summary');
  }
  
  const summary = ss.getActiveSheet();
  summary.setName('Summary');
  writeSummary(summary, data);
  
  const air = ss.insertSheet('Air Data');
  writeAirData(air, data);
  
  const rooms = ss.insertSheet('Room Details');
  writeRoomDetails(rooms, data);
  
  const csv = ss.insertSheet('CSV Output');
  writeCSVOutput(csv, data);
  
  getOrCreateAssessmentCocsFolder(inspFolder, data);
  getOrCreateAssessmentBackupFolder(inspFolder, data);
  const photosFolder = getOrCreateAssessmentPhotosFolder(inspFolder, data);
  const photoResults = uploadPhotosToFolder(photosFolder, data);

  const followUpRooms = (data.rooms || []).filter(r => r.followUpNeeded === 'Yes');
  if (followUpRooms.length > 0) {
    const followUp = ss.insertSheet('Follow-Up Items');
    writeFollowUpTab(followUp, data, photoResults);
  }

  if (photoResults.length > 0) {
    const photoLog = ss.insertSheet('Photo Log');
    writePhotoLog(photoLog, photoResults);
  }
  
  return {
    spreadsheetUrl: ss.getUrl(),
    spreadsheetId: ss.getId(),
    folderUrl: inspFolder.getUrl(),
    folderId: inspFolder.getId(),
    photosFolderUrl: photosFolder.getUrl(),
    photosFolderId: photosFolder.getId(),
    isTestTraining: isTestTraining,
    inspectionId: data.inspectionId,
    photosUploaded: photoResults.length
  };
}

// ── FOLLOW-UP PHOTO UPLOAD ───────────────────────────────

function processPhotoUpload(data) {
  requireAppsScriptDriveTrackerWriter('processPhotoUpload');
  var inspectionId = data.inspectionId;
  if (!inspectionId) throw new Error('No inspectionId in photo upload payload');

  var targetFolder = null;
  var targetSheet = null;

  if (USE_SHARED_DRIVE) {
    targetFolder = findInspectionFolderForPhotoUpload(data);
  } else {
    var parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    var folders = parentFolder.getFolders();
    while (folders.hasNext()) {
      var f = folders.next();
      if (f.getName().indexOf(inspectionId) > -1) {
        targetFolder = f;
        break;
      }
    }
  }

  if (!targetFolder) throw new Error('Inspection folder not found for ' + inspectionId);
  var photosFolder = getOrCreateAssessmentPhotosFolder(targetFolder, data);

  // Find spreadsheet in folder
  var files = targetFolder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      targetSheet = SpreadsheetApp.openById(file.getId());
      break;
    }
  }

  // Upload photos using the photos array at the top level
  var syntheticData = { rooms: [], photos: data.photos || [] };
  var syntheticSection = { name: 'Photos', data: syntheticData };

  var photoResults = [];
  var photos = data.photos || [];
  photos.forEach(function(photo, idx) {
    try {
      if (!photo.imageData) return;
      var base64Data = photo.imageData;
      if (base64Data.indexOf(',') > -1) base64Data = base64Data.split(',')[1];
      var ext = photo.imageData.indexOf('image/png') > -1 ? 'png' : 'jpg';
      var roomLabel = (photo.roomName || 'Photo').replace(/[^a-zA-Z0-9 \-]/g, '').trim();
      var captionLabel = (photo.caption || '').replace(/[^a-zA-Z0-9 \-]/g, '').trim();
      var filename = captionLabel
        ? roomLabel + ' - ' + captionLabel + '.' + ext
        : roomLabel + ' - Photo ' + String(idx + 1).padStart(2, '0') + '.' + ext;
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/' + ext, filename);
      var driveFile = photosFolder.createFile(blob);
      if (photo.caption || photo.timestamp) {
        var desc = [photo.caption, photo.timestamp ? 'Taken: ' + photo.timestamp : ''].filter(Boolean).join(' | ');
        driveFile.setDescription(desc);
      }
      // Make file viewable by anyone with the link so portal can render it
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileId = driveFile.getId();
      // Use direct embeddable URL (renders in <img> tags without auth)
      var embedUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600';
      photoResults.push({
        filename: filename,
        room: photo.roomName || '',
        step: photo.stepName || '',
        caption: photo.caption || '',
        timestamp: photo.timestamp || '',
        driveUrl: embedUrl,
        driveId: fileId
      });
    } catch (err) {
      photoResults.push({ filename: 'ERROR', room: '', step: '', caption: 'Upload failed: ' + err.message, driveUrl: '' });
    }
  });

  // Append to or create Photo Log sheet
  if (targetSheet && photoResults.length > 0) {
    var photoLog = targetSheet.getSheetByName('Photo Log');
    if (!photoLog) {
      photoLog = targetSheet.insertSheet('Photo Log');
      writePhotoLog(photoLog, photoResults);
    } else {
      photoResults.forEach(function(p) {
        var aiCaption = generateAiCaption(p.driveUrl, p.room, p.step);
        photoLog.appendRow([p.room || '', p.step || '', p.caption || '', aiCaption, p.driveUrl || '', p.timestamp || '']);
      });
    }
  }

  return { photosUploaded: photoResults.length, inspectionId: inspectionId, photos: photoResults };
}

// ── PHOTO UPLOAD ─────────────────────────────────────────

function uploadPhotosToFolder(folder, data) {
  const results = [];
  
  const sections = [
    { name: 'Arrival', data: data.arrivalSetup },
    { name: 'Device Setup', data: data.deviceSetup },
    { name: 'Exterior', data: data.exteriorAssessment },
    { name: 'Radon Setup', data: data.radonSetup },
    { name: 'Utility Room', data: data.utilityRoom },
    { name: 'Wrap Up', data: data.wrapUp },
    { name: 'Shipping', data: data.shippingChecklist },
    { name: 'Post Assessment', data: data.postAssessment }
  ];
  
  (data.rooms || []).forEach(function(room) {
    sections.push({ name: room.roomName || room.type || 'Room', data: room });
  });
  
  sections.forEach(function(section) {
    if (!section.data || !section.data.photos) return;
    
    section.data.photos.forEach(function(photo, idx) {
      try {
        if (!photo.imageData) return;
        
        var base64Data = photo.imageData;
        if (base64Data.indexOf(',') > -1) {
          base64Data = base64Data.split(',')[1];
        }
        
        var ext = 'jpg';
        if (photo.imageData.indexOf('image/png') > -1) ext = 'png';

        var roomLabel = (photo.roomName || section.name || 'Photo').replace(/[^a-zA-Z0-9 \-]/g, '').trim();
        var captionLabel = (photo.caption || '').replace(/[^a-zA-Z0-9 \-]/g, '').trim();
        var filename = captionLabel
          ? roomLabel + ' - ' + captionLabel + '.' + ext
          : roomLabel + ' - Photo ' + String(idx + 1).padStart(2, '0') + '.' + ext;
        
        var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/' + ext, filename);
        var driveFile = folder.createFile(blob);
        
        var description = '';
        if (photo.caption) description += photo.caption;
        if (photo.timestamp) description += (description ? ' | ' : '') + 'Taken: ' + photo.timestamp;
        if (description) driveFile.setDescription(description);
        
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        var fileId = driveFile.getId();
        var embedUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1600';
        results.push({
          filename: filename,
          room: photo.roomName || section.name,
          step: photo.stepName || '',
          caption: photo.caption || '',
          timestamp: photo.timestamp || '',
          driveUrl: embedUrl,
          driveId: fileId
        });
      } catch (err) {
        results.push({
          filename: 'ERROR',
          room: section.name,
          step: '',
          caption: 'Upload failed: ' + err.message,
          driveUrl: ''
        });
      }
    });
  });
  
  return results;
}

// ── AI CAPTION GENERATION ───────────────────────────────
// Calls the vision proxy to generate an AI caption for a photo.
// Returns the caption string, or empty string on failure.
// Silent — never throws, never blocks the main sync.

function generateAiCaption(driveUrl, roomName, stepName) {
  if (!VISION_PROXY_URL || !driveUrl) return '';
  try {
    var prompt = 'You are a professional home health inspector reviewing a photo taken during a residential inspection.' +
      (roomName ? ' Room: ' + roomName + '.' : '') +
      (stepName ? ' Context: ' + stepName + '.' : '') +
      ' Write one clear, factual sentence describing what is visible in this photo and its condition.' +
      ' Focus on anything relevant to home health: moisture, mold, damage, equipment condition, test setup.' +
      ' If nothing of concern: briefly describe what the photo shows.' +
      ' Plain sentence only — no bullet points, no markdown, no preamble.';

    var payload = JSON.stringify({ imageUrl: driveUrl, prompt: prompt });
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true
    };
    var resp = UrlFetchApp.fetch(VISION_PROXY_URL, options);
    if (resp.getResponseCode() !== 200) return '';
    var result = JSON.parse(resp.getContentText());
    var text = result.content && result.content[0] && result.content[0].text;
    return text ? text.trim() : '';
  } catch (e) {
    return '';
  }
}

// ── PHOTO LOG TAB ────────────────────────────────────────

function writePhotoLog(sheet, photoResults) {
  var headers = ['Room', 'Step', 'Inspector Caption', 'AI Caption', 'Photo URL', 'Timestamp'];
  sheet.appendRow(headers);

  photoResults.forEach(function(p) {
    var aiCaption = generateAiCaption(p.driveUrl, p.room, p.step);
    sheet.appendRow([
      p.room || '',
      p.step || '',
      p.caption || '',
      aiCaption,
      p.driveUrl || '',
      p.timestamp || ''
    ]);
  });

  // Style headers
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);

  // Highlight AI Caption column in light blue so it stands out
  sheet.getRange(1, 4, sheet.getLastRow(), 1).setBackground('#e8f0fe');
  sheet.getRange(1, 4, 1, 1).setBackground('#c9daf8').setFontWeight('bold');

  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 380);
  sheet.setColumnWidth(6, 160);
}

// ── FOLLOW-UP TAB ──────────────────────────────────────────

function writeFollowUpTab(sheet, data, photoResults) {
  const headers = ['Room', 'Re-check In', 'What to Watch For', 'Photo Link'];
  sheet.appendRow(headers);

  const photoMap = {};
  photoResults.forEach(function(p) {
    if (p.step === 'Follow-Up') {
      photoMap[p.room] = p.driveUrl || '';
    }
  });

  const rooms = data.rooms || [];
  rooms.forEach(function(room) {
    if (room.followUpNeeded === 'Yes') {
      const roomLabel = room.roomName || room.type || '';
      sheet.appendRow([
        roomLabel,
        room.followUpTimeframe || '',
        room.followUpNote || '',
        photoMap[roomLabel] || ''
      ]);
    }
  });

  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 350);
  sheet.setColumnWidth(4, 400);

  // Highlight header row in yellow to draw attention
  sheet.getRange(1, 1, 1, headers.length).setBackground('#fff2cc');
}

// ── SUMMARY TAB ──────────────────────────────────────────

function writeSummary(sheet, data) {
  const rows = [
    ['INHAUS LAB — INSPECTION DATA'],
    [''],
    ['BASIC INFORMATION'],
    ['Inspection ID', data.inspectionId || ''],
    ['Inspector', data.inspectorName || ''],
    ['Date', data.inspectionDate || ''],
    ['Client', data.clientName || ''],
    ['Address', data.propertyAddress || ''],
    [''],
    ['PROPERTY DETAILS'],
    ['Residence Type', data.residenceType || ''],
    ['Year Built', data.yearBuilt || ''],
    ['Square Footage', data.squareFootage || ''],
    ['Bedrooms', data.numberOfBedrooms || ''],
    ['Bathrooms', data.numberOfBathrooms || ''],
    ['Levels', data.numberOfLevels || ''],
    ['Basement', data.basement || ''],
    ['Carpeted Rooms', data.carpetedRooms || ''],
    ['Water Source', data.waterSource || ''],
    [''],
    ['SYSTEMS'],
    ['Stove Type', data.stoveType || ''],
    ['Fireplace', data.fireplace || ''],
    ['Pets', data.pets || ''],
    ['Smoking/Vaping', data.smokingVaping || ''],
    [''],
    ['HVAC (from Utility Room)'],
    ['Heating', getNestedValue(data, 'utilityRoom', 'heatingType')],
    ['AC', getNestedValue(data, 'utilityRoom', 'acType')],
    ['Ventilation', data.ventilationReadable || getNestedValue(data, 'utilityRoom', 'ventilationType')],
    ['Filter Size', getNestedValue(data, 'utilityRoom', 'filterSize')],
    ['Filter Rating', getNestedValue(data, 'utilityRoom', 'filterRating')],
    ['Radon Mitigation', getNestedValue(data, 'utilityRoom', 'radonMitigationPresent')],
    ['Water Filtration', getNestedValue(data, 'utilityRoom', 'waterFiltrationPresent')],
    ['Water Softener', getNestedValue(data, 'utilityRoom', 'waterSofteningPresent')],
    ['Water Soft Type', getNestedValue(data, 'utilityRoom', 'waterSoftType')],
    ['Air Filtration', getNestedValue(data, 'utilityRoom', 'airFiltrationPresent')],
    ['Air Filt Type', getNestedValue(data, 'utilityRoom', 'airFiltType')],
    [''],
    ['ASSESSMENT CONDITIONS'],
    ['Weather', data.weatherConditions || ''],
    ['Occupancy', data.occupancyDuringInspection || ''],
    ['Windows Open', data.windowsOpen || ''],
    ['Cleaning Frequency', data.cleaningFrequency || ''],
    ['Appliances Condition', data.appliancesCondition || ''],
    ['Rooms w/ Dampness', data.roomsWithDampness || 0],
    ['Rooms w/ Musty Smell', data.roomsWithMustySmell || 0],
    [''],
    ['CUSTOMER'],
    ['Concerns', data.clientConcerns || ''],
    ['Known Problem Areas', data.knownProblemAreas || ''],
    [''],
    ['ATP RESULTS'],
    ['Before Cleaning (RLU)', getAtpValue(data, 'atpPreRLU')],
    ['After Cleaning (RLU)', getAtpValue(data, 'atpPostRLU')],
    [''],
    ['TIMESTAMPS'],
    ['Started', data.startedAt || ''],
    ['Ended', data.endedAt || ''],
    ['Status', data.status || '']
  ];
  
  // Pad all rows to 2 columns so setValues works correctly
  const paddedRows = rows.map(r => r.length === 1 ? [r[0], ''] : r);
  sheet.getRange(1, 1, paddedRows.length, 2).setValues(paddedRows);
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 400);
  
  [1, 3, 10, 21, 26, 39, 49, 53, 57].forEach(r => {
    sheet.getRange(r, 1).setFontWeight('bold');
  });
}

// ── AIR DATA TAB ─────────────────────────────────────────

function writeAirData(sheet, data) {
  const rooms = data.rooms || [];
  
  const headers = ['Room', 'PM2.5 (µg/m³)', 'PM10 (µg/m³)', 'TVOCs (µg/m³)', 
    'Formaldehyde (ppm)', 'CO (ppm)', 'CO2 (ppm)', 'Ozone (ppm)', 
    'Chlorine (ppm)', 'NO2 (ppm)', 'Temp (°F)', 'Humidity (%)'];
  sheet.appendRow(headers);
  
  rooms.forEach(room => {
    if (room.qtrak_co2 || room.qtrak_pm25) {
      sheet.appendRow([
        room.roomName || room.type || '',
        room.qtrak_pm25 || '',
        room.qtrak_pm10 || '',
        room.qtrak_voc || '',
        room.formaldehyde || '',
        room.qtrak_co || '',
        room.qtrak_co2 || '',
        room.qtrak_ozone || '',
        room.qtrak_chlorine || '',
        room.qtrak_no2 || '',
        room.qtrak_temp || '',
        room.qtrak_humidity || ''
      ]);
    }
  });
  
  const dataRooms = rooms.filter(r => r.qtrak_co2 || r.qtrak_pm25);
  if (dataRooms.length > 0) {
    const lastRow = dataRooms.length + 1;
    sheet.appendRow([]);
    const avgRow = lastRow + 2;
    sheet.getRange(avgRow, 1).setValue('AVERAGES');
    sheet.getRange(avgRow, 1).setFontWeight('bold');
    for (let col = 2; col <= 12; col++) {
      const colLetter = String.fromCharCode(64 + col);
      sheet.getRange(avgRow, col).setFormula('=AVERAGE(' + colLetter + '2:' + colLetter + lastRow + ')');
    }
  }
  
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// ── ROOM DETAILS TAB ─────────────────────────────────────

function writeRoomDetails(sheet, data) {
  const rooms = data.rooms || [];
  
  const headers = ['Room', 'Type', 'Level', 'Observations', 'Notes', 
    'Breeze Done', 'Spore Trap ID', 'FLIR Done', 'FLIR Concerns'];
  sheet.appendRow(headers);
  
  rooms.forEach(room => {
    const obs = (room.observations || []).join(', ');
    sheet.appendRow([
      room.roomName || '',
      room.type || '',
      room.level || '',
      obs,
      room.notes || '',
      room.breezeDone || '',
      room.sporeTrapId || '',
      room.flirDone || '',
      room.flirConcerns || ''
    ]);
  });
  
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// ── CSV OUTPUT TAB ───────────────────────────────────────

function writeCSVOutput(sheet, data) {
  const headers = getCSVHeaders();
  const values = getCSVValues(data);
  
  sheet.appendRow(headers);
  sheet.appendRow(values);
  
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

// ── CSV FIELD MAPPING ────────────────────────────────────

function getCSVHeaders() {
  return [
    'Assessed By', 'Phone', 'Email', 'Address', 'Sample Date',
    'Overall Home Health Score', 'Percentile', 'Score Summary', 'Customer Concerns',
    'Air Quality Score', 'Air Quality Description',
    'Water Quality Score', 'Water Quality Description',
    'Radon Score', 'Radon Description',
    'Mold Score', 'Mold Description',
    'Surface Contaminants Score', 'Surface Contaminants Description',
    'Allergens Score', 'Allergens Description',
    'Action Item 1 Title', 'Action Item 1 Description', 'Action Item 1 Priority', 'Action Item 1 Timeframe',
    'Action Item 2 Title', 'Action Item 2 Description', 'Action Item 2 Priority', 'Action Item 2 Timeframe',
    'Action Item 3 Title', 'Action Item 3 Description', 'Action Item 3 Priority', 'Action Item 3 Timeframe',
    'Residence Type', 'Year Built', 'Liveable Space', 'Bedrooms', 'Bathrooms',
    'Basement', 'Carpeted Rooms', 'Primary Residence', 'Water Source',
    'Forced Air HVAC', 'Heating Source', 'AC Type', 'Ventilation Type',
    'Water Filter', 'Water Softener', 'HVAC Air Cleaning', 'Other Air Cleaning',
    'Radon Mitigation', 'Stove Type', 'Fireplace',
    'Cleaning Frequency', 'Windows Open Frequency',
    'Temperature', 'Temperature Range', 'Relative Humidity', 'Humidity Range',
    'Weather Conditions', 'Testing Duration', 'Home Occupancy',
    'Windows Open', 'Dampness or Mold', 'Musty Smell',
    'Appliances Condition', 'Pets', 'Technician Comments'
  ];
}

function getCSVValues(data) {
  const util = data.utilityRoom || {};
  const qtrakAvg = computeQtrakAverages(data);
  
  const techNotes = [];
  const arrivalNotes = getNestedValue(data, 'arrivalSetup', 'arrivalNotes');
  if (arrivalNotes) techNotes.push('Arrival: ' + arrivalNotes);
  const exteriorNotes = getNestedValue(data, 'exteriorAssessment', 'exteriorNotes');
  if (exteriorNotes) techNotes.push('Exterior: ' + exteriorNotes);
  (data.rooms || []).forEach(room => {
    if (room.notes) techNotes.push((room.roomName || room.type) + ': ' + room.notes);
  });
  const utilNotes = util.notes;
  if (utilNotes) techNotes.push('Utility: ' + utilNotes);
  
  let duration = '';
  if (data.startedAt && data.endedAt) {
    const ms = new Date(data.endedAt) - new Date(data.startedAt);
    duration = Math.round(ms / 3600000 * 100) / 100 + ' hours';
  }
  
  let waterSource = data.waterSource || '';
  if (waterSource === 'Municipal') waterSource = 'City / Municipal';
  if (waterSource === 'Other' && data.waterSourceDescription) waterSource = data.waterSourceDescription;
  
  const filterParts = [util.filterSize, util.filterRating].filter(Boolean);
  
  return [
    data.inspectorName || '',
    '',
    '',
    data.propertyAddress || '',
    data.inspectionDate || '',
    '', '', '',
    data.clientConcerns || '',
    '', '',
    '', '',
    '', '',
    '', '',
    '', '',
    '', '',
    '', '', '', '',
    '', '', '', '',
    '', '', '', '',
    data.residenceType || '',
    data.yearBuilt || '',
    data.squareFootage || '',
    data.numberOfBedrooms || '',
    data.numberOfBathrooms || '',
    data.basement || '',
    data.carpetedRooms || '',
    '',
    waterSource,
    '',
    util.heatingType || '',
    util.acType || '',
    data.ventilationReadable || util.ventilationType || '',
    util.waterFiltType || '',
    util.waterSoftType || '',
    filterParts.join(' - '),
    util.airFiltType || '',
    util.radonMitigationPresent === 'Yes' ? 'Yes' : 'No',
    data.stoveType || '',
    data.fireplace || '',
    data.cleaningFrequency || '',
    '',
    qtrakAvg.temp || '',
    '',
    qtrakAvg.humidity || '',
    '',
    data.weatherConditions || '',
    duration,
    data.occupancyDuringInspection || '',
    data.windowsOpen || '',
    data.roomsWithDampness || 0,
    data.roomsWithMustySmell || 0,
    data.appliancesCondition || '',
    data.pets || '',
    techNotes.join('\n')
  ];
}

// ── HELPER FUNCTIONS ─────────────────────────────────────

function getNestedValue(obj, key1, key2) {
  return (obj && obj[key1] && obj[key1][key2]) || '';
}

function getAtpValue(data, field) {
  const rooms = data.rooms || [];
  for (let i = 0; i < rooms.length; i++) {
    if (rooms[i].type === 'atp-kitchen' && rooms[i][field]) {
      return rooms[i][field];
    }
  }
  return '';
}

function computeQtrakAverages(data) {
  const rooms = data.rooms || [];
  const params = { pm25: [], pm10: [], voc: [], co: [], co2: [], ozone: [], chlorine: [], no2: [], temp: [], humidity: [] };
  
  rooms.forEach(room => {
    Object.keys(params).forEach(p => {
      const key = 'qtrak_' + p;
      const val = parseFloat(room[key]);
      if (!isNaN(val)) params[p].push(val);
    });
    const fVal = parseFloat(room.formaldehyde);
    if (!isNaN(fVal)) {
      if (!params.formaldehyde) params.formaldehyde = [];
      params.formaldehyde.push(fVal);
    }
  });
  
  const avg = {};
  Object.keys(params).forEach(p => {
    if (params[p] && params[p].length > 0) {
      const sum = params[p].reduce((a, b) => a + b, 0);
      avg[p] = Math.round(sum / params[p].length * 10000) / 10000;
    }
  });
  
  return avg;
}

// ── TEST FUNCTION ────────────────────────────────────────

function testWithSampleData() {
  const sampleData = {
    inspectionId: 'INH-20260403-TEST',
    inspectorName: 'David Kline',
    inspectionDate: '2026-04-03',
    clientName: 'Test Client',
    propertyAddress: '123 Test St, Minneapolis, MN 55401',
    numberOfBedrooms: '3',
    numberOfBathrooms: '2',
    numberOfLevels: '2',
    waterSource: 'Municipal',
    residenceType: 'Single-Family Home',
    yearBuilt: '1978',
    squareFootage: '1636',
    basement: 'Yes - Finished',
    carpetedRooms: '2',
    pets: 'Yes - Dog',
    smokingVaping: 'No',
    stoveType: 'Gas',
    fireplace: 'Yes - Wood Burning',
    clientConcerns: 'Concerned about mold',
    weatherConditions: '45F and sunny',
    cleaningFrequency: 'Weekly',
    occupancyDuringInspection: 'Yes',
    windowsOpen: 'No',
    appliancesCondition: 'Good (3-10 years)',
    roomsWithDampness: 0,
    roomsWithMustySmell: 0,
    startedAt: '2026-04-03T10:00:00',
    endedAt: '2026-04-03T13:00:00',
    status: 'complete',
    utilityRoom: {
      heatingType: 'Natural Gas Furnace',
      acType: 'Central AC',
      ventilationType: 'Bathroom Exhaust Fan(s)',
      filterSize: '16x20x1',
      filterRating: 'MERV 8',
      radonMitigationPresent: 'No',
      waterFiltrationPresent: 'No',
      waterSofteningPresent: 'Yes',
      waterSoftType: 'Culligan',
      airFiltrationPresent: 'Yes',
      airFiltType: 'HEPA purifier'
    },
    arrivalSetup: { arrivalNotes: 'Home in good condition' },
    exteriorAssessment: { exteriorNotes: 'Gutters need cleaning' },
    rooms: [
      {
        roomName: 'Living Room', type: 'living-area',
        qtrak_pm25: '1.5', qtrak_pm10: '2.2', qtrak_voc: '0.3',
        qtrak_co: '0.9', qtrak_co2: '920', qtrak_ozone: '0.05',
        qtrak_chlorine: '0.009', qtrak_no2: '0.04',
        qtrak_temp: '68', qtrak_humidity: '35',
        formaldehyde: '0.024',
        observations: [], notes: ''
      },
      {
        roomName: 'Kitchen Counter', type: 'atp-kitchen',
        atpPreRLU: '800', atpPostRLU: '45'
      }
    ]
  };
  
  const result = createInspectionSheet(sampleData);
  Logger.log('Sheet: ' + result.spreadsheetUrl);
  Logger.log('Folder: ' + result.folderUrl);
  Logger.log('Photos uploaded: ' + result.photosUploaded);
}
