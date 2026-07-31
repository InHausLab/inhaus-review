#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const inspectionsDir = path.join(root, 'api', 'inspections');
const listPath = path.join(root, 'api', 'list.json');
const args = process.argv.slice(2);
const argSet = new Set(args);
const shouldFetchDrive = argSet.has('--drive') || process.env.INHAUS_FETCH_DRIVE_PHOTOS === '1';
const preserveListFromGit = argSet.has('--preserve-list-from-git');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonIfChanged(filePath, value) {
  const next = JSON.stringify(value, null, 2) + '\n';
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (current !== next) {
    fs.writeFileSync(filePath, next);
    return true;
  }
  return false;
}

function getInspection(raw) {
  return raw && raw.inspection && typeof raw.inspection === 'object' ? raw.inspection : raw;
}

function getDriveId(photo) {
  if (!photo || typeof photo !== 'object') return '';
  if (photo.driveId) return String(photo.driveId);
  if (photo.fileId) return String(photo.fileId);
  if (photo.id && !photo.mimeType) return String(photo.id);
  const url = String(photo.driveUrl || photo.thumbnailUrl || photo.webViewLink || photo.webContentLink || photo.url || photo.imageUrl || '');
  const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function thumbnailUrlFor(photo) {
  if (photo.driveUrl) return photo.driveUrl;
  const driveId = getDriveId(photo);
  return driveId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w1600` : '';
}

function photoDedupeKey(photo) {
  const driveId = getDriveId(photo);
  if (driveId) return `drive:${driveId}`;
  const url = photo.driveUrl || photo.localUrl || photo.url || photo.imageUrl;
  if (url) return `url:${url}`;
  if (photo.photoId) return `id:${photo.photoId}`;
  return `meta:${photo.roomName || ''}|${photo.stepName || ''}|${photo.caption || ''}|${photo.timestamp || ''}`;
}

function photoIdFor(photo, index, usedIds) {
  const existing = photo.photoId ? String(photo.photoId) : '';
  let base = existing;
  if (!base) {
    const driveId = getDriveId(photo).replace(/[^a-zA-Z0-9]/g, '');
    base = driveId ? `ph_${driveId.slice(-12)}` : `ph_${String(index + 1).padStart(3, '0')}`;
  }
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  usedIds.add(candidate);
  return candidate;
}

function cleanPhoto(photo, context) {
  const out = {};
  for (const [key, value] of Object.entries(photo || {})) {
    if (['imageData', 'dataUrl', 'thumbnailDataUrl'].includes(key)) continue;
    if (value !== undefined) out[key] = value;
  }

  const driveUrl = thumbnailUrlFor(out);
  if (driveUrl) out.driveUrl = driveUrl;

  const driveId = getDriveId(out);
  if (driveId) out.driveId = driveId;
  if (driveId && !out.fileId) out.fileId = driveId;

  out.roomName = out.roomName || context.roomName || '';
  out.stepName = out.stepName || context.stepName || '';
  out.caption = out.caption || '';
  out.timestamp = out.timestamp || '';
  if (out.included === undefined) out.included = null;

  return out;
}

function flattenPhotos(insp) {
  const photosByKey = new Map();

  function addPhoto(photo, context) {
    if (!photo || typeof photo !== 'object') return;
    const normalized = cleanPhoto(photo, context || {});
    const hasImageReference = normalized.driveUrl || normalized.driveId || normalized.localUrl || normalized.url || normalized.imageUrl;
    const hasUsefulMetadata = normalized.caption || normalized.timestamp || normalized.roomName || normalized.stepName;
    if (!hasImageReference && !hasUsefulMetadata) return;

    const key = photoDedupeKey(normalized);
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

  (insp.photos || []).forEach(photo => addPhoto(photo, {}));

  function walk(value, context, pathParts) {
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

  walk(insp, {}, []);

  const usedIds = new Set();
  return Array.from(photosByKey.values())
    .sort((a, b) => {
      const ta = a.timestamp ? Date.parse(a.timestamp) : NaN;
      const tb = b.timestamp ? Date.parse(b.timestamp) : NaN;
      if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
      return 0;
    })
    .map((photo, index) => ({
      ...photo,
      photoId: photoIdFor(photo, index, usedIds),
      driveUrl: photo.driveUrl || '',
      caption: photo.caption || '',
      roomName: photo.roomName || '',
      stepName: photo.stepName || '',
      timestamp: photo.timestamp || '',
      included: photo.included === undefined ? null : photo.included
    }));
}

function getDriveAccessToken() {
  const envToken = process.env.GOOGLE_DRIVE_ACCESS_TOKEN || process.env.GOOGLE_ACCESS_TOKEN;
  if (envToken) return envToken.trim();
  try {
    return execFileSync('gcloud', ['auth', 'print-access-token'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch (err) {
    return '';
  }
}

async function listDriveFolderImages(folderId, token) {
  if (!folderId || !token) return [];
  const photos = [];
  let pageToken = '';
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`);
    url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink,imageMediaMetadata)');
    url.searchParams.set('pageSize', '1000');
    url.searchParams.set('supportsAllDrives', 'true');
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Drive folder ${folderId} fetch failed (${response.status}) ${body.slice(0, 180)}`);
    }
    const data = await response.json();
    for (const file of data.files || []) {
      photos.push({
        photoId: file.id ? `drive_${String(file.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(-18)}` : '',
        driveId: file.id || '',
        fileId: file.id || '',
        fileName: file.name || '',
        mimeType: file.mimeType || '',
        driveUrl: file.id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w1600` : '',
        highResUrl: file.id ? `https://drive.google.com/uc?id=${encodeURIComponent(file.id)}&export=download` : '',
        webViewLink: file.webViewLink || '',
        caption: '',
        roomName: '',
        stepName: 'Drive Folder',
        timestamp: file.createdTime || file.modifiedTime || '',
        source: 'drive-folder',
        width: file.imageMediaMetadata?.width,
        height: file.imageMediaMetadata?.height,
        included: null
      });
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return photos;
}

function mergeListEntries(primaryEntries, secondaryEntries) {
  const merged = [];
  const seen = new Set();
  const add = item => {
    if (!item) return;
    const id = item.id || item.inspectionId || '';
    const key = [
      id,
      item.reviewToken || '',
      item.syncedAt || '',
      item.folderId || '',
      item.spreadsheetId || ''
    ].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  };
  (primaryEntries || []).forEach(add);
  (secondaryEntries || []).forEach(add);
  return merged;
}

function readGitListBaseline() {
  if (!preserveListFromGit) return null;
  try {
    return JSON.parse(execFileSync('git', ['show', 'HEAD:api/list.json'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }));
  } catch (err) {
    console.warn('Could not read HEAD:api/list.json for preservation:', err.message);
    return null;
  }
}

function listStatus(insp) {
  const raw = insp.reviewStatus || insp.status || '';
  if (/submitted to tanner/i.test(raw)) return 'Submitted to Tanner';
  if (/report complete/i.test(raw)) return 'Report Complete';
  if (/in review/i.test(raw)) return 'In Review';
  if (/needs review/i.test(raw)) return 'Needs Review';
  if (/synced/i.test(raw)) return 'Synced';
  if (/complete/i.test(raw)) return 'Needs Review';
  if (/progress/i.test(raw)) return 'In Review';
  return raw || 'Needs Review';
}

function pruneUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

function buildListEntry(insp, fileName, existing) {
  const id = insp.id || insp.inspectionId || path.basename(fileName, '.json');
  return pruneUndefined({
    inspectionId: id,
    id,
    propertyAddress: insp.propertyAddress || existing.propertyAddress || '',
    clientName: insp.clientName || existing.clientName || '',
    inspectionDate: insp.inspectionDate || existing.inspectionDate || '',
    inspectorName: insp.inspectorName || existing.inspectorName || '',
    status: listStatus(insp),
    completedAt: insp.completedAt || insp.endedAt || existing.completedAt || null,
    photoCount: (insp.photos || []).length,
    missingCount: existing.missingCount || 0,
    spreadsheetId: insp.spreadsheetId || existing.spreadsheetId,
    folderId: insp.folderId || existing.folderId,
    syncedAt: insp.syncedAt || existing.syncedAt,
    reviewedBy: insp.reviewedBy || existing.reviewedBy || '',
    reviewedAt: insp.reviewedAt || existing.reviewedAt || '',
    submittedAt: insp.submittedAt || insp.submittedToTannerAt || existing.submittedAt || '',
    reportBuilderNotes: insp.reportBuilderNotes || existing.reportBuilderNotes || '',
    reviewToken: insp.reviewToken || existing.reviewToken || id.toLowerCase()
  });
}

async function main() {
  const existingList = fs.existsSync(listPath) ? readJson(listPath) : { inspections: [] };
  const gitList = readGitListBaseline();
  const seedEntries = mergeListEntries(gitList?.inspections || [], existingList.inspections || []);
  const existingById = new Map(seedEntries.map(item => [item.id || item.inspectionId, item]));
  const files = fs.readdirSync(inspectionsDir).filter(file => file.endsWith('.json')).sort();
  const repairedInspections = [];
  const repairedById = new Map();
  const repairedIds = new Set();
  let changedInspectionFiles = 0;
  let drivePhotosAdded = 0;
  const driveToken = shouldFetchDrive ? getDriveAccessToken() : '';
  if (shouldFetchDrive && !driveToken) {
    throw new Error('Drive photo fetch requested, but no Google Drive access token is available. Set GOOGLE_DRIVE_ACCESS_TOKEN or run gcloud auth first.');
  }

  for (const file of files) {
    const filePath = path.join(inspectionsDir, file);
    const raw = readJson(filePath);
    const insp = getInspection(raw);
    const id = insp.id || insp.inspectionId || path.basename(file, '.json');
    insp.id = id;
    insp.inspectionId = id;
    if (shouldFetchDrive && (insp.folderId || existingById.get(id)?.folderId)) {
      const folderPhotos = await listDriveFolderImages(insp.folderId || existingById.get(id).folderId, driveToken);
      if (folderPhotos.length) {
        insp.photos = (Array.isArray(insp.photos) ? insp.photos : []).concat(folderPhotos);
        drivePhotosAdded += folderPhotos.length;
      }
    }
    insp.photos = flattenPhotos(insp);
    insp.photoCount = insp.photos.length;

    if (writeJsonIfChanged(filePath, raw)) changedInspectionFiles++;
    const entry = buildListEntry(insp, file, existingById.get(id) || {});
    repairedInspections.push(entry);
    repairedById.set(id, entry);
    repairedIds.add(id);
  }

  if (shouldFetchDrive) {
    for (const existing of seedEntries) {
      const id = existing.id || existing.inspectionId;
      if (!id || repairedIds.has(id) || !existing.folderId) continue;
      const folderPhotos = await listDriveFolderImages(existing.folderId, driveToken);
      if (!folderPhotos.length) continue;
      drivePhotosAdded += folderPhotos.length;
      const raw = {
        status: 'success',
        inspection: {
          ...existing,
          id,
          inspectionId: id,
          status: existing.status || 'Needs Review',
          photos: folderPhotos
        }
      };
      raw.inspection.photos = flattenPhotos(raw.inspection);
      raw.inspection.photoCount = raw.inspection.photos.length;
      const filePath = path.join(inspectionsDir, `${id}.json`);
      if (writeJsonIfChanged(filePath, raw)) changedInspectionFiles++;
      const entry = buildListEntry(raw.inspection, `${id}.json`, existing);
      repairedInspections.push(entry);
      repairedById.set(id, entry);
      repairedIds.add(id);
    }
  }

  const inspections = [];
  const pushedRepaired = new Set();
  seedEntries.forEach(existing => {
    const id = existing.id || existing.inspectionId;
    if (repairedById.has(id)) {
      if (!pushedRepaired.has(id)) {
        inspections.push(repairedById.get(id));
        pushedRepaired.add(id);
      }
    } else {
      inspections.push(existing);
    }
  });
  repairedInspections.forEach(entry => {
    const id = entry.id || entry.inspectionId;
    if (!pushedRepaired.has(id)) inspections.push(entry);
  });

  const existingComparable = JSON.stringify({
    count: existingList.count,
    inspections: existingList.inspections || []
  });
  const nextComparable = JSON.stringify({
    count: inspections.length,
    inspections
  });

  const nextList = {
    generatedAt: existingComparable === nextComparable && existingList.generatedAt
      ? existingList.generatedAt
      : new Date().toISOString(),
    count: inspections.length,
    inspections
  };
  const listChanged = writeJsonIfChanged(listPath, nextList);

  console.log(`Inspections repaired: ${files.length}`);
  console.log(`Inspection files changed: ${changedInspectionFiles}`);
  console.log(`List changed: ${listChanged ? 'yes' : 'no'}`);
  if (shouldFetchDrive) console.log(`Drive folder image records discovered before dedupe: ${drivePhotosAdded}`);
  repairedInspections.forEach(insp => {
    console.log(`${insp.inspectionId}: ${insp.photoCount} photos`);
  });
  const preserved = inspections.length - repairedInspections.length;
  if (preserved > 0) console.log(`Preserved existing list-only entries: ${preserved}`);
}

main().catch(err => {
  console.error(err.stack || err.message);
  process.exitCode = 1;
});
