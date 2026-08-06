import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const portal = fs.readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const review = fs.readFileSync(new URL('../review.html', import.meta.url), 'utf8');

test('testing rows use an explicit status instead of an ambiguous conducted checkbox', () => {
  assert.match(review, />Status<\/th>/);
  assert.doesNotMatch(review, />Conducted\?<\/th>/);
  assert.match(portal, /TEST_REVIEW_STATUS_OPTIONS/);
  assert.match(portal, /'Not recorded'/);
  assert.match(portal, /'Conducted'/);
  assert.match(portal, /'Not requested'/);
  assert.match(portal, /'Not tested'/);
  assert.match(portal, /'N\/A'/);
});

test('test status preserves the existing confirmation contract', () => {
  assert.match(portal, /reviewedStatus === 'Conducted'/);
  assert.match(portal, /saveField\(statusInput\.dataset\.step, statusInput\.dataset\.field, statusInput\.value\)/);
  assert.match(portal, /`\$\{statusInput\.dataset\.testKey\}_confirmed`/);
});

test('known app values populate a useful testing status', () => {
  assert.match(portal, /water\.waterPanelPlanned/);
  assert.match(portal, /water\.pfasStatus/);
  assert.match(portal, /water\.microplasticsStatus/);
  assert.match(portal, /return 'Not tested'/);
  assert.match(portal, /return 'Not recorded'/);
});
