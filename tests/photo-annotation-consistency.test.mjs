import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const portal = fs.readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const report = fs.readFileSync(new URL('../report.js', import.meta.url), 'utf8');
const reportStyles = fs.readFileSync(new URL('../report.css', import.meta.url), 'utf8');

test('saved photo annotations are rendered outside the modal', () => {
  assert.match(portal, /function appendPhotoAnnotationOverlay\(host, photo\)/);
  assert.match(portal, /function syncPhotoAnnotationViews\(photoId\)/);
  assert.match(portal, /preserveAspectRatio', 'xMidYMid slice'/);
  assert.match(portal, /appendPhotoAnnotationOverlay\(thumb, photo\)/);
  assert.match(portal, /appendPhotoAnnotationOverlay\(thumbWrap, photo\)/);
});

test('arrows and circles use the same saved annotation data in thumbnail overlays', () => {
  assert.match(portal, /const annotations = getPhotoAnnotations\(photo\.photoId\)/);
  assert.match(portal, /annotation\.type === 'circle'/);
  assert.match(portal, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'ellipse'\)/);
  assert.match(portal, /createElementNS\('http:\/\/www\.w3\.org\/2000\/svg', 'path'\)/);
  assert.match(portal, /syncPhotoAnnotationViews\(photoId\);/);
});

test('annotation overlay remains visible but never blocks photo controls', () => {
  assert.match(styles, /\.photo-annotation-overlay\s*\{[^}]*pointer-events:\s*none;/s);
  assert.match(styles, /\.photo-annotation-overlay\s*\{[^}]*position:\s*absolute;/s);
});

test('printable report photos retain saved arrows and circles', () => {
  assert.match(report, /function appendReportPhotoAnnotations\(host, image, photo\)/);
  assert.match(report, /reviewedData\?\.photoAnnotations/);
  assert.match(report, /appendReportPhotoAnnotations\(visual, img, photo\)/);
  assert.match(reportStyles, /\.report-photo-annotation-overlay\s*\{/);
});
