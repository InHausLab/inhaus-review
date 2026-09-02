import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compileSection8,
  evaluateCompilationReadiness,
  mergeInspectionSources
} from '../section8-lab-core.js';

const html = readFileSync(new URL('../section8-lab.html', import.meta.url), 'utf8');
const client = readFileSync(new URL('../section8-lab.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const review = readFileSync(new URL('../review.html', import.meta.url), 'utf8');

function fixture() {
  return {
    inspectionId: 'INH-TEST-SECTION8',
    status: 'Synced',
    appVersion: 'v239',
    rooms: [
      { stepId: 'kitchen-appliance', roomName: 'Kitchen' },
      { stepId: 'atp-kitchen', roomName: 'ATP Testing' },
      { stepId: 'utility', roomName: 'Utility Room' },
      ...Array.from({ length: 8 }, (_, index) => ({ stepId: `room-${index + 1}`, roomName: `Room ${index + 1}` }))
    ],
    stepData: {
      'kitchen-appliance': {
        roomName: 'Kitchen',
        fridgeChecked: true,
        fridgeCleaned: true,
        dishwasherChecked: true,
        dishwasherCleaned: true,
        notes: 'Minor debris was present beneath the dishwasher.'
      },
      'atp-kitchen': {
        roomName: 'ATP Testing',
        atpSurface: 'Kitchen counter',
        atpPreRLU: 125,
        atpCleaned: 'Yes',
        atpPostRLU: 10,
        _atpBeforePhotos: [{ photoId: 'before-photo' }],
        _atpAfterPhotos: [{ photoId: 'after-photo' }]
      },
      utility: {
        roomName: 'Utility Room',
        hvacLeaks: 'Yes',
        followUpNeeded: 'Yes'
      },
      ...Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`room-${index + 1}`, {
        roomName: `Room ${index + 1}`,
        notes: `Source observation ${index + 1}`
      }]))
    },
    photos: [{ photoId: 'before-photo' }, { photoId: 'after-photo' }]
  };
}

test('lab is visibly experimental, read-only, and unlinked from the production portal', () => {
  assert.match(html, /EXPERIMENT · READ ONLY/);
  assert.match(html, /separate from the Review Portal/);
  assert.match(html, /cannot save changes, submit an inspection/);
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.doesNotMatch(index, /section8-lab/i);
  assert.doesNotMatch(review, /section8-lab/i);
  assert.doesNotMatch(client, /save-review|handoff-jobs|submitReview|saveField/);
  assert.doesNotMatch(client, /sharedSecret|inspection-status/);
  assert.doesNotMatch(client, /VISION|vision|AI request/i);
});

test('compiler generates traceable actions, observations, and exceptions without slot limits', () => {
  const result = compileSection8(fixture());
  assert(result.sections.actions.some(item => /Inspected beneath the refrigerator and beneath the dishwasher/.test(item.text)));
  assert(result.sections.actions.some(item => /ATP tested the Kitchen counter/.test(item.text)));
  const atp = result.sections.actions.find(item => /ATP tested/.test(item.text));
  assert.deepEqual(atp.photoIds, ['before-photo', 'after-photo']);
  assert.equal(result.sections.observations.filter(item => /^Source observation/.test(item.text)).length, 8);
  assert(result.exceptions.some(item => item.type === 'missing-follow-up-plan'));
  assert(result.exceptions.some(item => item.type === 'missing-detail'));
  assert(result.sections.actions.every(item => item.evidenceIds.length > 0));
});

test('follow-up source data becomes a source-backed Tanner item', () => {
  const inspection = fixture();
  inspection.stepData.utility.followUpNote = 'Re-check the condensate line for leakage.';
  inspection.stepData.utility.followUpTimeframe = '3 months';
  inspection.stepData.utility._followUpPhotos = [{ photoId: 'follow-photo' }];
  const result = compileSection8(inspection);
  assert.equal(result.sections.followUps.length, 1);
  assert.match(result.sections.followUps[0].text, /Re-check the condensate line/);
  assert.match(result.sections.followUps[0].text, /3 months/);
  assert.deepEqual(result.sections.followUps[0].photoIds, ['follow-photo']);
  assert(result.sections.followUps[0].evidenceIds.length >= 2);
});

test('submitted authoritative follow-ups include reviewer additions and replace matching inspector rows', () => {
  const inspection = fixture();
  inspection.stepData.utility.followUpNote = 'Inspector condensate note.';
  inspection.stepData.utility.followUpTimeframe = '3 months';
  inspection.reviewedData = {
    roomData: {
      authoritativeFollowUpItems: JSON.stringify([
        {
          stepId: 'utility',
          room: 'Utility Room',
          recheckIn: '6 months',
          watchFor: 'Reviewer-adjusted condensate plan.'
        },
        {
          stepId: 'room-1',
          room: 'Primary Bedroom—Bathroom',
          recheckIn: 'Next visit',
          watchFor: 'Check the bathroom moisture reading.'
        }
      ])
    }
  };

  const result = compileSection8(inspection);
  assert.equal(result.sections.followUps.length, 2);
  assert.match(result.sections.followUps.find(item => item.stepId === 'utility').text, /Reviewer-adjusted/);
  assert.doesNotMatch(result.sections.followUps.map(item => item.text).join('\n'), /Inspector condensate note/);
  assert.match(result.sections.followUps.find(item => item.stepId === 'room-1').roomName, /Primary Bedroom/);
  assert.match(result.sections.followUps.find(item => item.stepId === 'room-1').text, /bathroom moisture/);
  assert.equal(result.exceptions.some(item => item.type === 'missing-follow-up-plan' && item.stepId === 'utility'), false);
});

test('routine no-issue room notes do not inflate assessment observations', () => {
  const inspection = fixture();
  inspection.stepData['room-1'].notes = 'No issues found.';
  inspection.stepData['room-2'].notes = 'Not Applicable.';
  inspection.stepData['room-3'].notes = 'No issues found in this room, but staining was documented below it.';
  const result = compileSection8(inspection);
  const text = result.sections.observations.map(item => item.text).join('\n');
  assert.doesNotMatch(text, /^No issues found\.$/m);
  assert.doesNotMatch(text, /^Not Applicable\.$/m);
  assert.match(text, /staining was documented below it/);
});

test('rooms hidden in the review portal are excluded from Section 8 compilation', () => {
  const inspection = fixture();
  inspection.reviewedData = {
    roomData: { hiddenRoomIds: JSON.stringify(['room-1']) }
  };
  const result = compileSection8(inspection);
  assert.equal(result.metrics.roomCount, inspection.rooms.length - 1);
  assert.doesNotMatch(result.sections.observations.map(item => item.text).join('\n'), /Source observation 1/);
});

test('legacy exterior photos without an issue decision produce a visible exception', () => {
  const inspection = fixture();
  inspection.rooms.push({ stepId: 'exterior', roomName: 'Exterior' });
  inspection.stepData.exterior = {
    _exteriorAssessmentPhotos: [{
      photoId: 'exterior-legacy-photo',
      caption: 'Area of concern',
      photoPurpose: 'fault'
    }]
  };
  const result = compileSection8(inspection);
  assert(result.exceptions.some(item => item.type === 'missing-exterior-decision'));
  assert.doesNotMatch(result.sections.observations.map(item => item.text).join('\n'), /Area of concern/);
});

test('specific exterior fault captions become traceable observations', () => {
  const inspection = fixture();
  inspection.rooms.push({ stepId: 'exterior', roomName: 'Exterior' });
  inspection.stepData.exterior = {
    exteriorIssuesFound: 'Yes',
    exteriorNotes: 'Water staining was observed below the east window.',
    _exteriorAssessmentPhotos: [{
      photoId: 'exterior-fault-photo',
      caption: 'Failed caulking below the east window',
      photoPurposeLabel: 'Fault / Issue'
    }]
  };
  const result = compileSection8(inspection);
  const captionItem = result.sections.observations.find(item => /Failed caulking/.test(item.text));
  assert.deepEqual(captionItem.photoIds, ['exterior-fault-photo']);
  assert(captionItem.evidenceIds.length > 0);
  assert.equal(result.exceptions.some(item => item.type === 'missing-exterior-detail'), false);
});

test('exterior issue decision without detail remains blocking evidence work', () => {
  const inspection = fixture();
  inspection.rooms.push({ stepId: 'exterior', roomName: 'Exterior' });
  inspection.stepData.exterior = {
    exteriorIssuesFound: 'Yes',
    _exteriorAssessmentPhotos: [{ photoId: 'exterior-photo' }]
  };
  const result = compileSection8(inspection);
  assert(result.exceptions.some(item => item.type === 'missing-exterior-detail'));
});

test('source readiness blocks partial photo sync', () => {
  const inspection = fixture();
  const result = evaluateCompilationReadiness({
    inspection,
    statusReceipt: { complete: false, expectedPhotos: 2, storedPhotos: 1, missingPhotoIds: ['after-photo'] },
    reviewData: {}
  });
  assert.equal(result.ready, false);
  assert(result.reasons.some(reason => /source photos are missing/.test(reason)));
  assert(result.reasons.some(reason => /Worker source receipt is incomplete/.test(reason)));
});

test('source readiness uses verified handoff counts when an older snapshot omits its photo manifest', () => {
  const inspection = fixture();
  inspection.photos = [];
  const result = evaluateCompilationReadiness({
    inspection,
    statusReceipt: { complete: true, expectedPhotos: 0, storedPhotos: 2, missingPhotoIds: [] },
    reviewData: {
      fieldData: {
        system: {
          handoffJob: {
            artifactReceipt: {
              counts: { sourcePhotoCount: 2, photoManifestCount: 2, photoFolderCopiedCount: 2 }
            }
          }
        }
      }
    }
  });
  assert.equal(result.ready, true);
  assert.equal(result.expectedPhotos, 2);
  assert.equal(result.storedPhotos, 2);
});

test('source recovery and live inspection merge without turning system metadata into reviewed fields', () => {
  const merged = mergeInspectionSources(
    { inspectionId: 'INH-1', status: 'Synced', stepData: { room: { notes: 'Live note' } } },
    { fieldData: { system: { inspectionRecovery: { rooms: [{ stepId: 'room' }], stepData: { room: { roomName: 'Office' } } } }, room: { inspectorNotes: 'Reviewed note' } } }
  );
  assert.equal(merged.stepData.room.roomName, 'Office');
  assert.equal(merged.stepData.room.notes, 'Live note');
  assert.equal(merged.reviewedData.room.inspectorNotes, 'Reviewed note');
  assert.equal(merged.reviewedData.system, undefined);
});
