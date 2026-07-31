import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const portal = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');

function fakeElement() {
  return {
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    append() {},
    appendChild() {},
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    setAttribute() {},
    matches() { return false; },
    focus() {},
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false
  };
}

function loadPortalContext() {
  const context = {
    console,
    URL,
    URLSearchParams,
    fetch,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    alert() {},
    confirm() { return true; },
    navigator: { userAgent: 'node-test' },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    Image: class {},
    location: { hostname: 'localhost', search: '' },
    document: {
      createElement: fakeElement,
      createTextNode: value => value,
      body: fakeElement(),
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getElementById() { return null; },
      addEventListener() {},
      activeElement: null
    }
  };
  context.window = context;
  context.CSS = { escape: value => String(value) };
  vm.createContext(context);
  vm.runInContext(`${portal}
globalThis.__normalizeInspectionForReview = normalizeInspectionForReview;
globalThis.__buildPhotoPlacementAudit = buildPhotoPlacementAudit;`, context);
  return context;
}

test('real source room labels count as valid photo destinations', () => {
  const context = loadPortalContext();
  const inspection = context.__normalizeInspectionForReview({
    inspectionId: 'INH-PHOTO-REAL-ROOM',
    rooms: [
      { roomName: 'Bedroom 7', type: 'bedroom', stepId: 'bedroom-7', observations: 'Inspector notes present.' }
    ],
    stepData: {
      'bedroom-7': { roomName: 'Bedroom 7', type: 'bedroom', notes: 'Inspector notes present.', voiceReviewed: true }
    },
    photos: [
      { photoId: 'room-1', roomName: 'Bedroom 7', stepName: 'Photos', driveUrl: 'https://drive.google.com/file/d/roomPhotoOne/view' },
      { photoId: 'room-2', roomName: 'Bedroom 7', stepName: 'FLIR Thermal Scan', driveUrl: 'https://drive.google.com/file/d/roomPhotoTwo/view' }
    ],
    reviewedData: {},
    testsConfirmed: {}
  });

  const audit = context.__buildPhotoPlacementAudit(inspection, inspection.photos);

  assert.equal(audit.needsAttention.length, 0);
  assert.equal(audit.evidence.length, 1);
  assert.equal(audit.placedCount, 1);
});

test('portal-saved placement counts as a valid photo destination', () => {
  const context = loadPortalContext();
  const inspection = context.__normalizeInspectionForReview({
    inspectionId: 'INH-PHOTO-PORTAL-PLACEMENT',
    rooms: [
      { roomName: 'Bedroom 7', type: 'bedroom', stepId: 'bedroom-7', observations: 'Inspector notes present.' }
    ],
    stepData: {
      'bedroom-7': { roomName: 'Bedroom 7', type: 'bedroom', notes: 'Inspector notes present.', voiceReviewed: true }
    },
    photos: [
      { photoId: 'room-1', roomName: 'Bedroom 7', stepName: 'Photos', driveUrl: 'https://drive.google.com/file/d/roomPhotoOne/view' },
      { photoId: 'room-2', roomName: 'Bedroom 7', stepName: 'FLIR Thermal Scan', driveUrl: 'https://drive.google.com/file/d/roomPhotoTwo/view' }
    ],
    reviewedData: {
      'photo_room-1': {
        placement: { roomName: 'Bedroom 7', stepName: 'Photos' }
      },
      obs_1_photoIds: JSON.stringify(['room-2'])
    },
    testsConfirmed: {}
  });

  const audit = context.__buildPhotoPlacementAudit(inspection, inspection.photos);

  assert.equal(audit.needsAttention.length, 0);
  assert.equal(audit.evidence.length, 1);
  assert.equal(audit.placedCount, 1);
});

test('generic photo buckets without a room are not treated as placed', () => {
  const context = loadPortalContext();
  const inspection = context.__normalizeInspectionForReview({
    inspectionId: 'INH-PHOTO-GENERIC-BUCKET',
    photos: [
      { roomName: 'Photos', stepName: 'Before', driveUrl: 'https://drive.google.com/file/d/genericPhotoOne/view' },
      { roomName: 'Before and After', stepName: 'ATP Before', driveUrl: 'https://drive.google.com/file/d/genericPhotoTwo/view' }
    ],
    reviewedData: {},
    testsConfirmed: {}
  });

  const audit = context.__buildPhotoPlacementAudit(inspection, inspection.photos);

  assert.equal(audit.needsAttention.length, 2);
  assert.equal(audit.placedCount, 0);
});
