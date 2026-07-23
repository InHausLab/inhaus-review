import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const review = readFileSync(new URL('../review.html', import.meta.url), 'utf8');

test('portal version and room-level follow-up editor are present', () => {
  assert.match(portal, /REVIEW_PORTAL_VERSION = 'V24'/);
  assert.match(portal, /function buildRoomFollowUpEditor\(/);
  assert.match(portal, /buildRoomFollowUpEditor\(record, insp, locked\)/);
  assert.match(portal, /stepId: item\?\.stepId \|\| ''/);
});

test('room follow-ups fall back to the inspector app fields', () => {
  assert.match(portal, /function sourceRoomFollowUpItem\(/);
  assert.match(portal, /firstValue\('followUpNeeded'\)/);
  assert.match(portal, /firstValue\('followUpTimeframe'\)/);
  assert.match(portal, /firstValue\('followUpNote'\)/);
  assert.match(portal, /sourceRoomFollowUpItem\(record, roomName\)/);
});

test('duplicate standalone follow-up card is removed', () => {
  assert.doesNotMatch(review, /id="follow-up-body"/);
  assert.doesNotMatch(review, />Follow-Up Items</);
  assert.match(portal, /General Follow-Up Actions/);
});
