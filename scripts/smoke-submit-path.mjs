#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const portalSource = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const workerUrl = portalSource.match(/const PHOTO_WORKER_URL = '([^']+)'/)?.[1];
const accessToken = portalSource.match(/const ACCESS_TOKEN\s+=\s+'([^']+)'/)?.[1];
const inspectionId = process.env.SMOKE_SUBMIT_ID || 'INH-READINESS-PROBE';

if (!workerUrl || !accessToken) {
  throw new Error('Worker URL and review access token must be configured in portal.js');
}

const url = new URL(workerUrl + '/submit-smoke');
url.searchParams.set('inspectionId', inspectionId);
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${accessToken}`, 'x-worker-token': accessToken }
});
const result = await response.json().catch(() => ({}));

if (!response.ok || result.status !== 'ok' || result.smoke !== true || result.authorized !== true) {
  throw new Error(`Submit smoke failed: ${JSON.stringify(result)}`);
}
if (result.statusChanged !== false || result.emailSent !== false) {
  throw new Error(`Submit smoke must not mutate or email: ${JSON.stringify(result)}`);
}

console.log(JSON.stringify(result));
