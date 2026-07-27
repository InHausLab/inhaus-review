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
globalThis.__calculateCompletionScore = calculateCompletionScore;`, context);
  return context;
}

test('room-placed photos count toward photo placement score without report-section slots', () => {
  const context = loadPortalContext();
  const inspection = context.__normalizeInspectionForReview({
    inspectionId: 'INH-SCORE-ROOM-PHOTOS',
    rooms: [
      { roomName: 'Bedroom 7', type: 'bedroom', stepId: 'bedroom-7', observations: 'Inspector notes present.' }
    ],
    stepData: {
      'bedroom-7': { roomName: 'Bedroom 7', type: 'bedroom', notes: 'Inspector notes present.', voiceReviewed: true }
    },
    photos: [
      { roomName: 'Bedroom 7', stepName: 'Photos', driveUrl: 'https://drive.google.com/file/d/roomPhotoOne/view' },
      { roomName: 'Bedroom 7', stepName: 'FLIR Thermal Scan', driveUrl: 'https://drive.google.com/file/d/roomPhotoTwo/view' }
    ],
    reviewedData: {},
    testsConfirmed: {}
  });

  const score = context.__calculateCompletionScore(inspection);
  const photoCategory = score.categories.find(category => category.key === 'score-photos');

  assert.equal(photoCategory.score, 30);
  assert.equal(photoCategory.detail, '2 of 2 placed');
});

test('generic photo buckets without a room are not treated as placed', () => {
  const context = loadPortalContext();
  const inspection = context.__normalizeInspectionForReview({
    inspectionId: 'INH-SCORE-GENERIC-PHOTOS',
    photos: [
      { stepName: 'Photos', driveUrl: 'https://drive.google.com/file/d/genericPhotoOne/view' },
      { stepName: 'Photos', driveUrl: 'https://drive.google.com/file/d/genericPhotoTwo/view' }
    ],
    reviewedData: {},
    testsConfirmed: {}
  });

  const score = context.__calculateCompletionScore(inspection);
  const photoCategory = score.categories.find(category => category.key === 'score-photos');

  assert.equal(photoCategory.score, 0);
  assert.equal(photoCategory.detail, '0 of 2 placed');
});
