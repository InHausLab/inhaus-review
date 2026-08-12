import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const portalSource = fs.readFileSync(new URL('../portal.js', import.meta.url), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

const statusFunctions = [
  'normalizeTestReviewStatus',
  'testsNotConductedReviewStatus',
  'sourceTestReviewStatus',
  'getTestReviewStatus'
].map(name => extractFunction(portalSource, name)).join('\n');

function createStatusResolver() {
  const context = {
    isConductedValue: value => String(value || '').toLowerCase() === 'yes',
    isTestConfirmedForReview: (insp, key) => insp.testsConfirmed?.[key] === true
  };
  vm.runInNewContext(`${statusFunctions}; this.resolve = getTestReviewStatus;`, context);
  return context.resolve;
}

test('specific inspector source status overrides legacy confirmed booleans', () => {
  const resolve = createStatusResolver();
  const inspection = { reviewedData: {}, stepData: {}, testsConfirmed: { testPFAS: true } };
  assert.equal(resolve(inspection, { key: 'testPFAS' }, [{ type: 'PFAS', status: 'Not requested' }]), 'Not Requested');
});

test('legacy tests-not-conducted note produces a clear Not Requested label', () => {
  const resolve = createStatusResolver();
  const inspection = {
    reviewedData: {},
    stepData: {},
    testsConfirmed: { testMicroplastics: true },
    testsNotConducted: 'Water Panel, PFAS, Microplastics, ATP not requested by client.'
  };
  assert.equal(resolve(inspection, { key: 'testMicroplastics' }, []), 'Not Requested');
});

test('saved status remains authoritative and normalizes older casing', () => {
  const resolve = createStatusResolver();
  const inspection = {
    reviewedData: { tests: { testRadon_status: 'Not tested' } },
    stepData: {},
    testsConfirmed: { testRadon: true }
  };
  assert.equal(resolve(inspection, { key: 'testRadon' }, []), 'Not Tested');
});

test('portal exposes the requested status choices', () => {
  assert.match(portalSource, /'Not Requested'/);
  assert.match(portalSource, /'Not Tested'/);
  assert.match(portalSource, /'N\/A'/);
});
