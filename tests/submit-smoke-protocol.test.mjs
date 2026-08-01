import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const report = readFileSync(new URL('../report.js', import.meta.url), 'utf8');
const smokeScript = readFileSync(new URL('../scripts/smoke-submit-path.mjs', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

test('portal uses the Worker as its only production backend', () => {
  assert.match(portal, /workerFetchJson\('\/inspections'\)/);
  assert.match(portal, /workerFetchJson\(`\/inspections\/\$\{encodeURIComponent\(id\)\}`/);
  assert.match(portal, /requestWorkerHandoffPackage\(id/);
  assert.match(portal, /workerFetchJson\('\/review-unlock'/);
  assert.doesNotMatch(portal, /APPS_SCRIPT_URL/);
  assert.doesNotMatch(portal, /script\.google\.com/);
  assert.doesNotMatch(portal, /ENABLE_WORKER_HANDOFF/);
  assert.match(report, /REPORT_WORKER_URL/);
  assert.match(report, /\/get-review/);
  assert.match(report, /\/inspection-photos/);
  assert.doesNotMatch(report, /script\.google\.com|REPORT_REVIEW_API_URL|REPORT_BRIDGE_API_URL/);
});

test('review field saves explicitly transition the assessment to In Review', () => {
  assert.match(portal, /markInReview: options\.markInReview === true/);
  assert.match(portal, /\{ markInReview: true \}/);
  assert.match(portal, /_inspection\.status = remoteResult\.reviewStatus/);
});

test('submit smoke targets the non-mutating Worker route', () => {
  assert.match(smokeScript, /\/submit-smoke/);
  assert.match(smokeScript, /INH-READINESS-PROBE/);
  assert.match(smokeScript, /statusChanged !== false/);
  assert.match(smokeScript, /emailSent !== false/);
  assert.doesNotMatch(smokeScript, /Apps Script|APPS_SCRIPT_URL|x-sync-secret/);
});

test('QA protocol requires the production Worker smoke before signoff', () => {
  assert.match(readme, /Non-Negotiable QA Protocol/);
  assert.match(readme, /node scripts\/smoke-submit-path\.mjs/);
  assert.match(readme, /not complete until the production Worker submit path passes/);
});
