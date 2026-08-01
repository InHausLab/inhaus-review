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
  assert.match(appsScript, /getInspectionForReview\(id, data\.token\)/);
  assert.match(appsScript, /statusChanged: false/);
  assert.match(appsScript, /emailSent: false/);
});

test('backend success wrapper keeps transport status separate from action status', () => {
  assert.match(appsScript, /function successResponsePayload\(result\)/);
  assert.match(appsScript, /payload\.actionStatus = payload\.status/);
  assert.match(appsScript, /payload\.status = 'ok'/);
  assert.match(appsScript, /JSON\.stringify\(successResponsePayload\(result\)\)/);
  assert.match(appsScript, /JSON\.stringify\(successResponsePayload\(activeResult\)\)/);
  assert.match(appsScript, /JSON\.stringify\(successResponsePayload\(listResult\)\)/);
  assert.match(appsScript, /JSON\.stringify\(successResponsePayload\(inspectionResult\)\)/);
});

test('backend has a fast active-only cloud pickup list', () => {
  const start = appsScript.indexOf('function listActiveCloudInspections(token)');
  const end = appsScript.indexOf('function getInspectionForReview', start);
  const activeListFunction = appsScript.slice(start, end);
  assert.match(appsScript, /params\.action === 'listActive'/);
  assert.match(appsScript, /function listActiveCloudInspections\(token\)/);
  assert.match(appsScript, /function hasUsableResumeData\(data\)/);
  assert.doesNotMatch(activeListFunction, /normalizeInspectionForReviewApi/);
});

test('test training start shell creates pickup artifacts without a tracker row', () => {
  const start = appsScript.indexOf('function startInspectionShell(data)');
  const end = appsScript.indexOf('// ── REVIEW PORTAL DATA HANDOFF', start);
  const startShell = appsScript.slice(start, end);
  assert.match(startShell, /source\.isTestTraining = isTestTrainingInspection\(source\)/);
  assert.match(startShell, /getOrCreateReviewHandoffFolder\(source\)/);
  assert.match(startShell, /source\.isTestTraining[\s\S]*skipped_test_training[\s\S]*upsertReportTrackerHandoffRow/);
  assert.match(appsScript, /source_system: shellResult\.isTestTraining === true \? 'apps_script_start_shell_test_training'/);
  assert.doesNotMatch(startShell, /return skipped/);
});

test('tracker writer matches Tanner Report Tracker columns', () => {
  const start = appsScript.indexOf('function getTrackerColumns(sheet)');
  const end = appsScript.indexOf('function findNextAvailableTrackerRow', start);
  const trackerColumns = appsScript.slice(start, end);
  assert.match(trackerColumns, /assessmentType:[\s\S]*Assessment Type/);
  assert.match(trackerColumns, /client:[\s\S]*Name/);
  assert.match(trackerColumns, /serviceLocation:[\s\S]*Service Location/);
  assert.match(trackerColumns, /customerId:[\s\S]*Client ID/);
  assert.match(trackerColumns, /inhId:[\s\S]*Inspector App ID/);
  assert.doesNotMatch(trackerColumns, /inspector:/);
  assert.match(appsScript, /function inferServiceLocationForTracker\(source\)/);
  assert.match(appsScript, /writeTrackerCell\(sheet, row, columns\.serviceLocation, inferServiceLocationForTracker\(source\), false\)/);
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
