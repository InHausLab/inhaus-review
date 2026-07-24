import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const review = readFileSync(new URL('../review.html', import.meta.url), 'utf8');

test('follow-up plan generator lives in the review portal', () => {
  assert.match(review, /id="follow-up-plan-generate"/);
  assert.match(review, /id="field-follow-up-plan"/);
  assert.match(review, />Client Follow-Up Plan</);
  assert.match(portal, /function renderFollowUpPlanSection\(/);
  assert.match(portal, /followUpPlanPrompt\(_inspection\)/);
});

test('generated and edited plans save to cloud review data', () => {
  assert.match(portal, /attachReviewedFieldSave\(textarea, 'summary', 'aiFollowUpPlan'\)/);
  assert.match(portal, /saveField\('summary', 'aiFollowUpPlan', plan\)/);
  assert.match(portal, /saveField\('summary', 'aiFollowUpPlanGeneratedAt', generatedAt\)/);
  assert.match(portal, /Plan generated and cloud-saved/);
});

test('older plans saved by the inspector app remain available', () => {
  assert.match(portal, /insp\.stepData\?\.debrief\?\.aiFollowUpPlan/);
  assert.match(portal, /sourceFollowUpPlan\(insp\)/);
});

test('the plan uses reviewed room findings and explicit inspector follow-ups', () => {
  assert.match(portal, /getRoomAISummary\(record, insp\)/);
  assert.match(portal, /getRoomInspectorNotes\(record, insp\)/);
  assert.match(portal, /sourceRoomFollowUpItem\(record, roomName\)/);
  assert.match(portal, /Preserve any explicit inspector timeframe/);
});
