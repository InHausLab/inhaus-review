import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const portal = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const review = readFileSync(new URL('../review.html', import.meta.url), 'utf8');

test('portal version and room-level follow-up editor are present', () => {
  assert.match(portal, /REVIEW_PORTAL_VERSION = 'V73'/);
  assert.match(portal, /function buildRoomFollowUpEditor\(/);
  assert.match(portal, /buildRoomFollowUpEditor\(record, insp, locked\)/);
  assert.match(portal, /stepId: item\?\.stepId \|\| ''/);
});

test('editable fields preserve immutable app-source values for audit display', () => {
  assert.match(portal, /let _sourceInspection = null/);
  assert.match(portal, /_sourceInspection = clonePlainObject\(insp\)/);
  assert.match(portal, /return _sourceInspection\[fieldKey\]/);
  assert.match(portal, /const step = _sourceInspection\.stepData\?\.\[stepId\]/);
  assert.match(portal, /showOriginalIfChanged\(input, 'summary', item\.key\)/);
});

test('submitted state must come from review-storage-confirmed package', () => {
  assert.match(portal, /function stripLocalOnlySubmissionState\(/);
  assert.match(portal, /delete data\.submission/);
  assert.match(portal, /delete data\.submittedToTannerAt/);
  assert.match(portal, /function getServerSubmittedReviewState\(/);
  assert.match(portal, /hasSubmittedPackage/);
  assert.match(portal, /Submission was not confirmed by review storage/);
});

test('finish tracker uses the live submission gate and supports exact navigation', () => {
  assert.match(portal, /function renderFinishTracker\(results\)/);
  assert.match(portal, /function goToFinishItem\(item\)/);
  assert.match(portal, /renderFinishTracker\(results\);/);
  assert.match(portal, /action: 'unreviewedPhotos'/);
  assert.match(portal, /focusSelector: firstMissingLocation/);
  assert.match(portal, /Use Finish Review for the remaining items/);
});

test('review readiness is consolidated into one persistent finish tool', () => {
  assert.match(portal, /function renderFinishTracker\(results\)/);
  assert.match(portal, /aria-label': 'Finish Review'/);
  assert.match(portal, /Ready to submit/);
  assert.match(portal, /Finish Review · \$\{failures\.length\} remaining/);
  assert.match(review, /id="submit-guidance-wrap"/);
  assert.doesNotMatch(review, /id="submit-score-wrap"/);
});

test('Attic and Crawl Space are standard room choices across photo selectors', () => {
  assert.match(portal, /STANDARD_ROOM_CHOICES = \['Attic', 'Crawl Space'\]/);
  assert.match(portal, /STANDARD_ROOM_CHOICES\.forEach\(addRoom\)/);
  assert.match(portal, /\.\.\.STANDARD_ROOM_CHOICES/);
});

test('portal feedback points Tanner to the shared tracker', () => {
  assert.match(portal, /Tanner monitors the shared Things to Fix tracker/);
  assert.match(portal, /Saved in the shared Things to Fix tracker for Tanner/);
  assert.doesNotMatch(portal, /Send to Matt/);
});

test('every room has a source-data coverage block for captured app fields', () => {
  assert.match(portal, /function buildCapturedRoomData\(/);
  assert.match(portal, /Captured Inspector Fields/);
  assert.match(portal, /const capturedRoomData = buildCapturedRoomData\(record\)/);
  assert.match(portal, /if \(capturedRoomData\) body\.appendChild\(capturedRoomData\)/);
});

test('photo recovery honors app tombstones and stable photo IDs', () => {
  assert.match(portal, /if \(photo\.photoId\) return `id:\$\{photo\.photoId\}`/);
  assert.match(portal, /insp\?\.photoTombstones, insp\?\.resumeData\?\.photoTombstones/);
  assert.match(portal, /tombstone\?\.status/);
  assert.match(portal, /deletedPhotoIds\.add\(photoId\)/);
});

test('captured app test records satisfy the test evidence gate', () => {
  assert.match(portal, /capturedSourceTestCount = collectTestSampleRecords\(insp\)/);
  assert.match(portal, /confirmedTestCount > 0 \|\| capturedSourceTestCount > 0/);
  assert.match(portal, /app captured/);
});

test('confirmed submission receipt controls the reloaded status badge', () => {
  assert.match(portal, /statusBadgeHTML\(isSubmitted \? 'Submitted to Tanner' : insp\.status\)/);
  assert.match(portal, /key: 'lastSubmissionFailure', value: null/);
});

test('Worker GET requests bypass stale browser caches', () => {
  assert.match(portal, /if \(opts\.method === 'GET'\) opts\.cache = 'no-store'/);
});

test('checkpoint recovery preserves the authoritative Worker status', () => {
  assert.match(portal, /const authoritativeStatus = inspection\.status/);
  assert.match(portal, /merged\.status = authoritativeStatus/);
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
