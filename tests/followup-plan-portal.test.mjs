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
  assert.match(portal, /followUpPlanPrompt\(_inspection, inspectorDraft\)/);
  assert.match(portal, /Write the follow-up plan first/);
  assert.match(portal, /AI will only polish the inspector-written plan/);
});

test('generated and edited plans save to cloud review data', () => {
  assert.match(portal, /attachReviewedFieldSave\(textarea, 'summary', 'aiFollowUpPlan'\)/);
  assert.match(portal, /saveField\('summary', 'aiFollowUpPlan', plan\)/);
  assert.match(portal, /saveField\('summary', 'aiFollowUpPlanGeneratedAt', generatedAt\)/);
  assert.match(portal, /Plan polished and cloud-saved/);
});

test('older plans saved by the inspector app remain available', () => {
  assert.match(portal, /insp\.stepData\?\.debrief\?\.aiFollowUpPlan/);
  assert.match(portal, /sourceFollowUpPlan\(insp\)/);
});

test('the plan uses reviewed room findings and explicit inspector follow-ups', () => {
  assert.match(portal, /getRoomAISummary\(record, insp\)/);
  assert.match(portal, /getRoomInspectorNotes\(record, insp\)/);
  assert.match(portal, /sourceRoomFollowUpItem\(record, roomName\)/);
  assert.match(portal, /Preserve the same meaning, priorities, and timeframes/);
  assert.match(portal, /Do not add new concerns, test results, recommendations, room names, or follow-up items/);
});

test('one room-deduplicated follow-up list drives suggestions and final submission', () => {
  assert.match(portal, /function buildAuthoritativeFollowUpItems\(insp\)/);
  assert.match(portal, /buildFollowUpPlanSuggestions\(insp\)[\s\S]*buildAuthoritativeFollowUpItems\(insp\)/);
  assert.doesNotMatch(portal, /buildFollowUpPlanSuggestions\(insp\)[\s\S]{0,600}\.slice\(0,\s*8\)/);
  assert.match(portal, /saveField\('roomData', 'authoritativeFollowUpItems', authoritativeFollowUpItems\)/);
  assert.match(portal, /saveField\('summary', 'clientFollowUpPlan', clientFollowUpPlan\)/);
  assert.match(portal, /reviewerFollowUpPlan \|\| formatAuthoritativeFollowUpPlan\(authoritativeFollowUpItems\)/);
});

test('unfinished photo packaging leaves a visible retryable receipt', () => {
  assert.match(portal, /error\.code = pendingPhotos > 0 \? 'PHOTO_COPY_PENDING' : 'HANDOFF_INCOMPLETE'/);
  assert.match(portal, /error\.handoffReceipt = receipt/);
  assert.match(portal, /_inspection\.reviewedData\.system\.tannerHandoff = err\.handoffReceipt/);
  assert.match(portal, /renderTannerPackageCheck\(_inspection\)/);
});
