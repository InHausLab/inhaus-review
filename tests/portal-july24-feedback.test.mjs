import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');

test('Before Leaving maps post-assessment answers instead of reporting them missing', () => {
  assert.match(portal, /shipping\.breezeST/);
  assert.match(portal, /shipping\.boulderBlueShip/);
  assert.match(portal, /dataManagement\.qtrakExported/);
  assert.match(portal, /finalCheck\.allSamplesShipped/);
  assert.match(portal, /source: sourceAnswers/);
});

test('photo placement separates real rooms from inspection tasks', () => {
  assert.match(portal, /function placementRecordIsRoom/);
  assert.match(portal, /if \(placementRecordIsRoom\(record\)\) addRoom\(name\)/);
  assert.match(portal, /taskNames\.has\(placementNameKey\(destination\.roomName\)\)/);
  assert.match(portal, /optgroup', \{ label: 'Rooms' \}/);
  assert.match(portal, /optgroup', \{ label: 'Tasks' \}/);
  assert.doesNotMatch(portal, /label: `Room — \$\{room\}`/);
  assert.doesNotMatch(portal, /label: customLabel \|\| `Task —/);
});

test('portal feedback uses the Worker and never Apps Script', () => {
  assert.match(portal, /PHOTO_WORKER_URL \+ '\/app-feedback'/);
  assert.match(portal, /sharedSecret: PHOTO_UPLOAD_SHARED_SECRET/);
  assert.doesNotMatch(portal, /script\.google\.com/);
});
