import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const appsScript = readFileSync(new URL('../InHaus_Google_Apps_Script.gs', import.meta.url), 'utf8');
const smokeScript = readFileSync(new URL('../scripts/smoke-submit-path.mjs', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('backend has a non-mutating submit smoke action', () => {
  assert.match(appsScript, /data\.action === 'submitSmoke'/);
  assert.match(appsScript, /function submitReviewSmokeCheck\(data\)/);
  assert.match(appsScript, /requireReviewTokenForInspectionId\(id, data\.token\)/);
  assert.match(appsScript, /statusChanged: false/);
  assert.match(appsScript, /emailSent: false/);
});

test('real Apps Script POSTs carry the shared sync key', () => {
  assert.match(portal, /'x-sync-secret': body\['x-sync-secret'\] \|\| SYNC_SECRET/);
  assert.match(smokeScript, /action: 'submitSmoke'/);
  assert.match(smokeScript, /'x-sync-secret': syncSecret/);
  assert.match(smokeScript, /INH-READINESS-PROBE/);
});

test('QA protocol requires the submit smoke path before signoff', () => {
  assert.match(readme, /Non-Negotiable QA Protocol/);
  assert.match(readme, /node scripts\/smoke-submit-path\.mjs/);
  assert.match(readme, /not complete until the production submit path passes/);
});
