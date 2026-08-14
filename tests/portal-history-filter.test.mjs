import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('history defaults to real usable inspections while retaining an explicit all-records view', () => {
  assert.match(portal, /function portalHistoryNoiseReason\(/);
  assert.match(portal, /function portalHistoryPartition\(/);
  assert.match(portal, /function setPortalHistoryShowAll\(/);
  assert.match(portal, /test\/incomplete record/);
  assert.match(index, /Show test\/incomplete records/);
  assert.match(index, /setPortalHistoryShowAll\(this\.checked\)/);
});

test('history recognizes explicit and legacy synthetic records', () => {
  assert.match(portal, /isTestTrainingInspectionRecord\(insp\)/);
  assert.match(portal, /test\|training\|smoke\|e2e\|probe\|phonefix/);
  assert.match(portal, /test\|codex\|automated smoke\|worker smoke test\|e2e/);
});

test('production shell does not flash three hard-coded inspection rows', () => {
  assert.match(index, /Loading inspections…/);
  assert.doesNotMatch(index, /INH-20260422-C7KYGW/);
  assert.doesNotMatch(index, /INH-20260506-DV4MDG/);
  assert.doesNotMatch(index, /INH-20260520-EAYNCM/);
});
