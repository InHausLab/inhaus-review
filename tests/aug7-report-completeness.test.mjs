import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const portal = fs.readFileSync(new URL('../portal.js', import.meta.url), 'utf8');

test('inspection summary surfaces Tanner system fields with nested-data fallbacks', () => {
  assert.match(portal, /Water Filtration/);
  assert.match(portal, /utility\.waterFiltrationPresent/);
  assert.match(portal, /Water Softener/);
  assert.match(portal, /utility\.waterSofteningPresent/);
  assert.match(portal, /Air Filtration \/ Cleansing/);
  assert.match(portal, /Other Air Cleaning Devices/);
  assert.match(portal, /Radon Mitigation/);
  assert.match(portal, /Fireplace\(s\)/);
  assert.match(portal, /Stove Ventilation/);
});

test('Photos folder is ready only when the folder and complete high-resolution package exist', () => {
  assert.match(portal, /const photosFolderReady = Boolean\(photosFolderUrl\)/);
  assert.match(portal, /workerStatusMirroredPhotos >= expectedPhotoCount/);
  assert.match(portal, /ok: photosFolderReady/);
  assert.doesNotMatch(portal, /ok: Boolean\(photosFolderUrl\) \|\| photoCount > 0/);
});
