const FOLLOW_UP_KEYS = {
  needed: 'followUpNeeded',
  note: 'followUpNote',
  timeframe: 'followUpTimeframe',
  photos: '_followUpPhotos'
};

const ACTION_GROUPS = [
  {
    verb: 'Inspected',
    fields: {
      fridgeChecked: 'beneath the refrigerator',
      dishwasherChecked: 'beneath the dishwasher',
      dishwasherFilterChecked: 'the dishwasher filter',
      underSinkChecked: 'beneath the sink',
      iceMakerChecked: 'the ice maker',
      backsplashChecked: 'the backsplash grout and caulking',
      stoveVentChecked: 'the stove vent',
      filtersChecked: 'the HVAC filters',
      servicePanelRemoved: 'the HVAC service compartment'
    }
  },
  {
    verb: 'Cleaned',
    fields: {
      fridgeCleaned: 'beneath the refrigerator',
      dishwasherCleaned: 'beneath the dishwasher',
      dishwasherFilterCleaned: 'the dishwasher filter',
      underSinkCleaned: 'beneath the sink',
      iceMakerCleaned: 'the ice maker',
      stoveVentCleaned: 'the stove vent'
    }
  }
];

const SIMPLE_ACTIONS = {
  flirDone: ['FLIR scan completed', 'Yes'],
  qtrakCaptured: ['Q-Trak reading captured', 'Yes'],
  breezeDone: ['Breeze test completed', 'Yes'],
  waterPanelCollected: ['Water-panel sample collected', 'Yes'],
  microplasticsStatus: ['Microplastics sample collected', 'Collected'],
  pfasStatus: ['PFAS sample collected', 'Collected'],
  bottlesLabeled: ['Water-sample bottles labeled', true],
  chainOfCustody: ['Chain-of-custody forms completed', true]
};

const ADVERSE_FIELDS = {
  hvacCondensation: 'HVAC condensation was noted',
  hvacLeaks: 'An HVAC leak was noted',
  moldVisible: 'Visible mold or elevated mold potential was identified',
  bathLeak: 'A bathroom leak was identified',
  flirConcerns: 'The FLIR scan identified a concern'
};

const NOTE_FIELDS = [
  'notes',
  'inspectorNotes',
  'applianceFindings',
  'exteriorNotes',
  'hvacDetails',
  'debriefNotes'
];

function isYes(value) {
  if (value === true) return true;
  return ['yes', 'true', 'done', 'completed', 'collected', 'recorded']
    .includes(String(value ?? '').trim().toLowerCase());
}

function hasExpectedValue(value, expected) {
  if (expected === true) return isYes(value);
  return String(value ?? '').trim().toLowerCase() === String(expected).trim().toLowerCase();
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function roomKey(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function authoritativeFollowUps(inspection) {
  const roomData = inspection?.reviewedData?.roomData || {};
  const submitted = parseList(roomData.authoritativeFollowUpItems);
  const reviewed = submitted.length ? submitted : parseList(roomData.followUpItems);
  return reviewed.map(item => ({
    stepId: cleanText(item?.stepId),
    roomName: cleanText(item?.room || item?.roomName || item?.stepId),
    timeframe: cleanText(item?.recheckIn || item?.timeframe || item?.followUpTimeframe),
    note: cleanText(item?.watchFor || item?.note || item?.followUpNote || item?.followUpPlan),
    photoIds: parseList(item?.photoIds).map(photo => cleanText(photo?.photoId || photo?.id || photo)).filter(Boolean)
  })).filter(item => item.stepId || item.roomName);
}

function stableHash(value) {
  let hash = 2166136261;
  const input = String(value ?? '');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function evidenceId(parts) {
  return `ev-${stableHash(parts.join('|'))}`;
}

function sentence(value) {
  const text = cleanText(value);
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function isRoutineNoIssueNote(value) {
  return /^(?:n\/?a|not applicable|intentionally left blank|no (?:issues?|concerns?)(?: found)?(?: in (?:this|the) room)?)[.!]?$/i
    .test(cleanText(value));
}

function listPhrase(values) {
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function parsePhotoIds(value) {
  const photos = Array.isArray(value) ? value : [];
  return photos.map(photo => cleanText(photo?.photoId || photo?.id)).filter(Boolean);
}

function stepPhotos(step) {
  const photos = [];
  Object.values(step || {}).forEach(value => {
    if (!Array.isArray(value)) return;
    value.forEach(photo => {
      if (photo && typeof photo === 'object' && cleanText(photo.photoId || photo.id)) photos.push(photo);
    });
  });
  return photos;
}

function isGenericPhotoCaption(value) {
  return /^(?:area of concern|fault|location(?: \/ context)?|other|close-up detail|zoomed-out overview|exterior assessment photo|photo)$/i
    .test(cleanText(value));
}

function isFaultEvidencePhoto(photo) {
  const purpose = cleanText(photo?.photoPurposeLabel || photo?.photoPurpose || photo?.photoRole);
  return /fault|issue|concern|damage|leak|stain|mold/i.test(purpose);
}

function normalizeRoomRecords(inspection) {
  const steps = inspection?.stepData && typeof inspection.stepData === 'object'
    ? inspection.stepData
    : {};
  const rooms = Array.isArray(inspection?.rooms) ? inspection.rooms : [];
  const hiddenValue = inspection?.reviewedData?.roomData?.hiddenRoomIds;
  let hiddenIds = [];
  if (Array.isArray(hiddenValue)) hiddenIds = hiddenValue;
  else if (typeof hiddenValue === 'string') {
    try { hiddenIds = JSON.parse(hiddenValue); } catch(e) { hiddenIds = []; }
  }
  const hidden = new Set((Array.isArray(hiddenIds) ? hiddenIds : []).map(id => cleanText(id)).filter(Boolean));
  const used = new Set();
  const records = [];

  rooms.forEach((room, index) => {
    const stepId = room.stepId || `room-${index + 1}`;
    if (hidden.has(stepId)) return;
    const step = { ...room, ...(steps[stepId] || {}) };
    records.push({
      stepId,
      roomName: cleanText(step.roomName || room.roomName || room.name || stepId),
      step
    });
    used.add(stepId);
  });

  Object.entries(steps).forEach(([stepId, step]) => {
    if (used.has(stepId) || hidden.has(stepId)) return;
    records.push({
      stepId,
      roomName: cleanText(step.roomName || step.name || stepId),
      step
    });
  });

  return records;
}

function reviewedStepFor(inspection, stepId) {
  const reviewed = inspection?.reviewedData || {};
  return reviewed[stepId] && typeof reviewed[stepId] === 'object'
    ? reviewed[stepId]
    : {};
}

function sourceValue(step, reviewedStep, key) {
  return Object.prototype.hasOwnProperty.call(reviewedStep, key)
    ? reviewedStep[key]
    : step[key];
}

function addEvidence(target, record) {
  const normalized = cleanText(record.text).toLowerCase();
  if (!normalized) return;
  if (target.some(existing => existing.category === record.category && existing.roomName === record.roomName && cleanText(existing.text).toLowerCase() === normalized)) return;
  target.push({
    ...record,
    text: sentence(record.text),
    photoIds: Array.from(new Set(record.photoIds || [])),
    evidenceIds: Array.from(new Set(record.evidenceIds || []))
  });
}

function actionEvidenceForRoom(inspectionId, record, reviewedStep) {
  const items = [];
  ACTION_GROUPS.forEach(group => {
    const matches = Object.entries(group.fields)
      .filter(([key]) => isYes(sourceValue(record.step, reviewedStep, key)))
      .map(([, label]) => label);
    if (!matches.length) return;
    const keys = Object.keys(group.fields).filter(key => isYes(sourceValue(record.step, reviewedStep, key)));
    items.push({
      category: 'action',
      roomName: record.roomName,
      stepId: record.stepId,
      text: `${group.verb} ${listPhrase(matches)}`,
      evidenceIds: keys.map(key => evidenceId([inspectionId, record.stepId, key])),
      sourceFields: keys,
      photoIds: []
    });
  });

  Object.entries(SIMPLE_ACTIONS).forEach(([key, [label, expected]]) => {
    if (!hasExpectedValue(sourceValue(record.step, reviewedStep, key), expected)) return;
    items.push({
      category: 'action',
      roomName: record.roomName,
      stepId: record.stepId,
      text: label,
      evidenceIds: [evidenceId([inspectionId, record.stepId, key])],
      sourceFields: [key],
      photoIds: []
    });
  });

  const pre = Number(sourceValue(record.step, reviewedStep, 'atpPreRLU'));
  const post = Number(sourceValue(record.step, reviewedStep, 'atpPostRLU'));
  const surface = cleanText(sourceValue(record.step, reviewedStep, 'atpSurfaceOther')) || cleanText(sourceValue(record.step, reviewedStep, 'atpSurface')) || 'surface';
  if (Number.isFinite(pre) || Number.isFinite(post)) {
    const parts = [];
    if (Number.isFinite(pre)) parts.push(`${pre} RLU before cleaning`);
    if (isYes(sourceValue(record.step, reviewedStep, 'atpCleaned'))) parts.push('surface cleaned with soap and water');
    if (Number.isFinite(post)) parts.push(`${post} RLU after cleaning`);
    const beforeIds = parsePhotoIds(sourceValue(record.step, reviewedStep, '_atpBeforePhotos'));
    const afterIds = parsePhotoIds(sourceValue(record.step, reviewedStep, '_atpAfterPhotos'));
    items.push({
      category: 'action',
      roomName: record.roomName,
      stepId: record.stepId,
      text: `ATP tested the ${surface}: ${parts.join('; ')}`,
      evidenceIds: ['atpPreRLU', 'atpCleaned', 'atpPostRLU'].map(key => evidenceId([inspectionId, record.stepId, key])),
      sourceFields: ['atpSurface', 'atpPreRLU', 'atpCleaned', 'atpPostRLU'],
      photoIds: [...beforeIds, ...afterIds]
    });
  }

  return items;
}

export function compileSection8(inspection) {
  const inspectionId = cleanText(inspection?.inspectionId || inspection?.id || 'unknown');
  const items = [];
  const exceptions = [];
  const records = normalizeRoomRecords(inspection);
  const canonicalFollowUps = authoritativeFollowUps(inspection);
  const consumedFollowUps = new Set();

  records.forEach(record => {
    const reviewedStep = reviewedStepFor(inspection, record.stepId);
    const step = record.step;

    const observationTags = sourceValue(step, reviewedStep, 'observations');
    if (Array.isArray(observationTags) && observationTags.length) {
      addEvidence(items, {
        category: 'observation',
        roomName: record.roomName,
        stepId: record.stepId,
        text: observationTags.join(', '),
        evidenceIds: [evidenceId([inspectionId, record.stepId, 'observations'])],
        sourceFields: ['observations'],
        photoIds: parsePhotoIds(sourceValue(step, reviewedStep, '_photos'))
      });
    }

    NOTE_FIELDS.forEach(key => {
      const note = cleanText(sourceValue(step, reviewedStep, key));
      if (!note || isRoutineNoIssueNote(note)) return;
      addEvidence(items, {
        category: 'observation',
        roomName: record.roomName,
        stepId: record.stepId,
        text: note,
        evidenceIds: [evidenceId([inspectionId, record.stepId, key])],
        sourceFields: [key],
        photoIds: parsePhotoIds(sourceValue(step, reviewedStep, '_photos'))
      });
    });

    const photos = stepPhotos(step);
    const exteriorRecord = record.stepId === 'exterior' || /exterior/i.test(record.roomName);
    if (exteriorRecord) {
      const issueDecision = cleanText(sourceValue(step, reviewedStep, 'exteriorIssuesFound'));
      const exteriorNote = cleanText(sourceValue(step, reviewedStep, 'exteriorNotes'));
      if (isYes(issueDecision) && !exteriorNote) {
        exceptions.push({
          type: 'missing-exterior-detail',
          roomName: record.roomName,
          stepId: record.stepId,
          message: 'Exterior issues are marked Yes, but no inspector description was recorded.'
        });
      }
      if (!issueDecision && !exteriorNote && photos.length) {
        exceptions.push({
          type: 'missing-exterior-decision',
          roomName: record.roomName,
          stepId: record.stepId,
          message: `${photos.length} exterior photo${photos.length === 1 ? '' : 's'} were captured, but the inspector did not record whether issues were found.`
        });
      }
      photos.filter(isFaultEvidencePhoto).forEach(photo => {
        const caption = cleanText(photo.caption);
        if (!caption || isGenericPhotoCaption(caption)) return;
        addEvidence(items, {
          category: 'observation',
          roomName: record.roomName,
          stepId: record.stepId,
          text: caption,
          evidenceIds: [evidenceId([inspectionId, record.stepId, photo.photoId || photo.id, 'caption'])],
          sourceFields: ['photoCaption'],
          photoIds: [cleanText(photo.photoId || photo.id)]
        });
      });
    }

    const hasRoomDetail = NOTE_FIELDS.some(key => cleanText(sourceValue(step, reviewedStep, key))) ||
      (Array.isArray(observationTags) && observationTags.length);
    Object.entries(ADVERSE_FIELDS).forEach(([key, label]) => {
      if (!isYes(sourceValue(step, reviewedStep, key))) return;
      addEvidence(items, {
        category: 'observation',
        roomName: record.roomName,
        stepId: record.stepId,
        text: label,
        evidenceIds: [evidenceId([inspectionId, record.stepId, key])],
        sourceFields: [key],
        photoIds: []
      });
      if (!hasRoomDetail) {
        exceptions.push({
          type: 'missing-detail',
          roomName: record.roomName,
          stepId: record.stepId,
          message: `${label}, but no supporting inspector detail was recorded.`
        });
      }
    });

    actionEvidenceForRoom(inspectionId, record, reviewedStep).forEach(item => addEvidence(items, item));

    const canonicalIndex = canonicalFollowUps.findIndex(item =>
      (item.stepId && item.stepId === record.stepId) ||
      (roomKey(item.roomName) && roomKey(item.roomName) === roomKey(record.roomName))
    );
    const canonical = canonicalIndex >= 0 ? canonicalFollowUps[canonicalIndex] : null;
    if (canonical) consumedFollowUps.add(canonicalIndex);
    const followUpNeeded = canonical ? true : sourceValue(step, reviewedStep, FOLLOW_UP_KEYS.needed);
    const followUpNote = canonical?.note || cleanText(sourceValue(step, reviewedStep, FOLLOW_UP_KEYS.note));
    const timeframe = canonical?.timeframe || cleanText(sourceValue(step, reviewedStep, FOLLOW_UP_KEYS.timeframe));
    const followUpRoomName = canonical?.roomName || record.roomName;
    if (isYes(followUpNeeded)) {
      if (!followUpNote) {
        exceptions.push({
          type: 'missing-follow-up-plan',
          roomName: followUpRoomName,
          stepId: record.stepId,
          message: 'Follow-up is marked Yes, but the inspector did not record the plan.'
        });
      } else {
        addEvidence(items, {
          category: 'follow-up',
          roomName: followUpRoomName,
          stepId: record.stepId,
          text: timeframe ? `${followUpNote} Re-check: ${timeframe}` : followUpNote,
          timeframe,
          evidenceIds: [
            evidenceId([inspectionId, record.stepId, FOLLOW_UP_KEYS.needed]),
            evidenceId([inspectionId, record.stepId, FOLLOW_UP_KEYS.note]),
            ...(timeframe ? [evidenceId([inspectionId, record.stepId, FOLLOW_UP_KEYS.timeframe])] : [])
          ],
          sourceFields: canonical
            ? ['roomData.authoritativeFollowUpItems']
            : [FOLLOW_UP_KEYS.needed, FOLLOW_UP_KEYS.note, FOLLOW_UP_KEYS.timeframe],
          photoIds: canonical?.photoIds?.length
            ? canonical.photoIds
            : parsePhotoIds(sourceValue(step, reviewedStep, FOLLOW_UP_KEYS.photos))
        });
      }
    }
  });

  canonicalFollowUps.forEach((followUp, index) => {
    if (consumedFollowUps.has(index)) return;
    if (!followUp.note) {
      exceptions.push({
        type: 'missing-follow-up-plan',
        roomName: followUp.roomName,
        stepId: followUp.stepId,
        message: 'Follow-up is listed in review data, but no plan was recorded.'
      });
      return;
    }
    addEvidence(items, {
      category: 'follow-up',
      roomName: followUp.roomName,
      stepId: followUp.stepId,
      text: followUp.timeframe ? `${followUp.note} Re-check: ${followUp.timeframe}` : followUp.note,
      timeframe: followUp.timeframe,
      evidenceIds: [evidenceId([inspectionId, followUp.stepId || followUp.roomName, 'authoritativeFollowUpItems'])],
      sourceFields: ['roomData.authoritativeFollowUpItems'],
      photoIds: followUp.photoIds
    });
  });

  (inspection?.findings || [])
    .filter(finding => finding && finding.status === 'approved')
    .forEach(finding => {
      const text = cleanText(finding.cleanedComment || finding.rawComment);
      if (!text) return;
      addEvidence(items, {
        category: 'observation',
        roomName: cleanText(finding.roomName || finding.reportSection || 'Inspection Finding'),
        stepId: cleanText(finding.stepId || ''),
        text,
        evidenceIds: [cleanText(finding.findingId) || evidenceId([inspectionId, 'finding', text])],
        sourceFields: ['approvedFinding'],
        photoIds: Array.from(new Set([
          ...(Array.isArray(finding.photoIds) ? finding.photoIds : []),
          finding.sourcePhotoId
        ].filter(Boolean)))
      });
    });

  const sections = {
    followUps: items.filter(item => item.category === 'follow-up'),
    actions: items.filter(item => item.category === 'action'),
    observations: items.filter(item => item.category === 'observation')
  };

  return {
    inspectionId,
    generatedAt: new Date().toISOString(),
    sections,
    exceptions,
    metrics: {
      roomCount: records.length,
      evidenceItemCount: items.length,
      followUpCount: sections.followUps.length,
      actionCount: sections.actions.length,
      observationCount: sections.observations.length,
      exceptionCount: exceptions.length
    }
  };
}

export function evaluateCompilationReadiness({ inspection, statusReceipt, reviewData }) {
  const inspectionId = cleanText(inspection?.inspectionId || inspection?.id);
  const rooms = Array.isArray(inspection?.rooms) ? inspection.rooms : [];
  const photos = Array.isArray(inspection?.photos) ? inspection.photos : [];
  const missingPhotoIds = Array.isArray(statusReceipt?.missingPhotoIds) ? statusReceipt.missingPhotoIds : [];
  const handoffReceipt = reviewData?.fieldData?.system?.handoffJob?.artifactReceipt || null;
  const sourceCounts = handoffReceipt?.counts || {};
  const expectedPhotos = Math.max(
    Number(statusReceipt?.expectedPhotos || 0),
    Number(inspection?.photoCount || 0),
    photos.length,
    Number(sourceCounts.sourcePhotoCount || 0),
    Number(sourceCounts.photoManifestCount || 0)
  );
  const storedPhotos = Math.max(
    Number(statusReceipt?.storedPhotos || statusReceipt?.databasePhotos || 0),
    Number(sourceCounts.photoFolderCopiedCount || 0),
    Number(sourceCounts.photoDriveUrlCount || 0),
    photos.length
  );
  const status = cleanText(inspection?.status).toLowerCase();
  const finalStatus = /synced|submitted|complete|review/.test(status);
  const photoComplete = missingPhotoIds.length === 0 && (expectedPhotos === 0 || storedPhotos >= expectedPhotos);
  const roomComplete = rooms.length > 0;
  const workerComplete = statusReceipt ? statusReceipt.complete !== false : true;
  const ready = Boolean(inspectionId && finalStatus && roomComplete && photoComplete && workerComplete);

  return {
    ready,
    inspectionId,
    status: inspection?.status || 'Unknown',
    appVersion: inspection?.appVersion || inspection?.version || 'Unknown',
    roomCount: rooms.length,
    expectedPhotos,
    storedPhotos,
    missingPhotoIds,
    sourceSnapshotHash: handoffReceipt?.checksums?.sourceSnapshotHash || '',
    packagedRoomCount: Number(sourceCounts.sourceRoomCount || 0),
    reasons: [
      ...(!inspectionId ? ['Inspection ID is missing'] : []),
      ...(!finalStatus ? [`Inspection status is ${inspection?.status || 'unknown'}, not final`] : []),
      ...(!roomComplete ? ['No source rooms were received'] : []),
      ...(!photoComplete ? [`${missingPhotoIds.length || Math.max(0, expectedPhotos - storedPhotos)} source photos are missing`] : []),
      ...(!workerComplete ? ['Worker source receipt is incomplete'] : [])
    ]
  };
}

export function mergeInspectionSources(liveInspection, reviewData) {
  const fields = reviewData?.fieldData && typeof reviewData.fieldData === 'object'
    ? reviewData.fieldData
    : {};
  const recovery = fields?.system?.inspectionRecovery || fields.inspectionRecovery || fields.sourceInspection || fields.submittedInspection || fields.inspection || {};
  const merged = deepMerge(recovery, liveInspection || {});
  const reviewFields = { ...fields };
  delete reviewFields.system;
  delete reviewFields.inspectionRecovery;
  delete reviewFields.sourceInspection;
  delete reviewFields.submittedInspection;
  delete reviewFields.inspection;
  merged.reviewedData = deepMerge(merged.reviewedData || {}, reviewFields);
  return merged;
}

function deepMerge(base, incoming) {
  if (incoming === undefined || incoming === null || incoming === '') return base;
  if (Array.isArray(incoming)) return incoming.length ? incoming.map(item => deepMerge(undefined, item)) : (Array.isArray(base) ? base : []);
  if (incoming && typeof incoming === 'object') {
    const output = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
    Object.entries(incoming).forEach(([key, value]) => {
      if (key === 'resumeData') return;
      output[key] = deepMerge(output[key], value);
    });
    return output;
  }
  return incoming;
}
