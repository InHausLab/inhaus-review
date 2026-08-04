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
globalThis.__buildPhotoPlacementAudit = buildPhotoPlacementAudit;
globalThis.__normalizeAppPhotoPlacement = normalizeAppPhotoPlacement;
globalThis.__mergeInspectionCheckpoints = mergeInspectionCheckpoints;
globalThis.__mergeMissingReviewData = mergeMissingReviewData;`, context);
  return context;
}

test('server review values are not replaced by stale local recovery values', () => {
  const context = loadPortalContext();
  const server = {
    reportBuilderNotes: 'Confirmed server note',
    'bedroom-0': { voiceReviewed: true, inspectorNotes: 'Server room note' }
  };
  const local = {
    reportBuilderNotes: '',
    'bedroom-0': { voiceReviewed: false, localOnlyDraft: 'Recovered draft' },
    'photo-test-1': { included: true }
  };

  const merged = context.__mergeMissingReviewData(server, local);

  assert.equal(merged.reportBuilderNotes, 'Confirmed server note');
  assert.equal(merged['bedroom-0'].voiceReviewed, true);
  assert.equal(merged['bedroom-0'].localOnlyDraft, 'Recovered draft');
  assert.equal(merged['photo-test-1'].included, true);
});

test('current Worker room values override stale recovery checkpoints', () => {
  const context = loadPortalContext();
  const merged = context.__mergeInspectionCheckpoints({
    status: 'Synced',
    rooms: [
      { stepId: 'bedroom-0', roomName: 'Renamed Bedroom', notes: 'Final inspector note.' }
    ],
    stepData: {
      'bedroom-0': { roomName: 'Renamed Bedroom', notes: 'Final inspector note.' }
    },
    resumeData: {
      status: 'Prepared',
      rooms: [
        { stepId: 'bedroom-0', roomName: 'Bedroom One' }
      ],
      stepData: {
        'bedroom-0': { roomName: 'Bedroom One' },
        utility: { notes: 'Recovered utility note.' }
      }
    }
  });

  assert.equal(merged.status, 'Synced');
  assert.equal(merged.rooms[0].roomName, 'Renamed Bedroom');
  assert.equal(merged.stepData['bedroom-0'].notes, 'Final inspector note.');
  assert.equal(merged.stepData.utility.notes, 'Recovered utility note.');
});

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
      { photoId: 'room-1', roomName: 'Bedroom 7', stepName: 'Photos', driveUrl: 'https://drive.google.com/file/d/roomPhotoOne/view', included: true },
      { photoId: 'room-2', roomName: 'Bedroom 7', stepName: 'FLIR Thermal Scan', driveUrl: 'https://drive.google.com/file/d/roomPhotoTwo/view', included: true }
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
      { photoId: 'room-1', roomName: 'Bedroom 7', stepName: 'Photos', driveUrl: 'https://drive.google.com/file/d/roomPhotoOne/view', included: true },
      { photoId: 'room-2', roomName: 'Bedroom 7', stepName: 'FLIR Thermal Scan', driveUrl: 'https://drive.google.com/file/d/roomPhotoTwo/view', included: true }
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
      { roomName: 'Photos', stepName: 'Before', driveUrl: 'https://drive.google.com/file/d/genericPhotoOne/view', included: true },
      { roomName: 'Before and After', stepName: 'ATP Before', driveUrl: 'https://drive.google.com/file/d/genericPhotoTwo/view', included: true }
    ],
    reviewedData: {},
    testsConfirmed: {}
  });

  const audit = context.__buildPhotoPlacementAudit(inspection, inspection.photos);

  assert.equal(audit.needsAttention.length, 2);
  assert.equal(audit.placedCount, 0);
});

test('app task buckets normalize to a dropdown destination instead of appearing blank', () => {
  const context = loadPortalContext();

  assert.deepEqual(
    { ...context.__normalizeAppPhotoPlacement('Exterior Assessment', 'Exterior Assessment') },
    { roomName: '', stepName: 'Exterior Assessment' }
  );
  assert.deepEqual(
    { ...context.__normalizeAppPhotoPlacement('Device Setup', 'PFAS Kit Registration Card') },
    { roomName: '', stepName: 'PFAS Kit Registration Card' }
  );
});

test('kitchen before and after photos retain the deterministic Kitchen room', () => {
  const context = loadPortalContext();
  const inspection = context.__normalizeInspectionForReview({
    inspectionId: 'INH-PHOTO-KITCHEN-SOURCE',
    photos: [
      {
        photoId: 'kitchen-before',
        roomName: 'Kitchen Inspection',
        stepName: 'Under Dishwasher — Before',
        driveUrl: 'https://drive.google.com/file/d/kitchenBefore/view',
        included: true
      }
    ],
    reviewedData: {
      'photo_kitchen-before': {
        included: true,
        placement: { roomName: '', stepName: 'Under Dishwasher — Before' }
      }
    },
    testsConfirmed: {}
  });

  assert.equal(inspection.photos[0].roomName, 'Kitchen');
  assert.equal(inspection.photos[0].stepName, 'Under Dishwasher — Before');
  const audit = context.__buildPhotoPlacementAudit(inspection, inspection.photos);
  assert.equal(audit.needsAttention.length, 0);
});
