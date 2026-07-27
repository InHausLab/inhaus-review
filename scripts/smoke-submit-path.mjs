#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const portalSource = readFileSync(new URL('../portal.js', import.meta.url), 'utf8');
const appsScriptUrl = portalSource.match(/const APPS_SCRIPT_URL = '([^']+)'/)?.[1];
const accessToken = portalSource.match(/const ACCESS_TOKEN\s+=\s+'([^']+)'/)?.[1];
const syncSecret = portalSource.match(/const SYNC_SECRET = '([^']+)'/)?.[1];
const inspectionId = process.env.SMOKE_SUBMIT_ID || 'INH-READINESS-PROBE';

if (!appsScriptUrl || appsScriptUrl === 'PLACEHOLDER_URL') {
  throw new Error('APPS_SCRIPT_URL is not configured in portal.js');
}
if (!accessToken || !syncSecret) {
  throw new Error('ACCESS_TOKEN and SYNC_SECRET must be configured in portal.js');
}

const response = await fetch(appsScriptUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({
    action: 'submitSmoke',
    id: inspectionId,
    token: accessToken,
    'x-sync-secret': syncSecret
  })
});

const responseText = await response.text();
let result;
try {
  result = JSON.parse(responseText);
} catch {
  throw new Error(`Submit smoke returned non-JSON HTTP ${response.status}: ${responseText.slice(0, 160)}`);
}

if (!response.ok || result.status !== 'ok' || result.smoke !== true || result.authorized !== true) {
  throw new Error(`Submit smoke failed: ${JSON.stringify(result)}`);
}
if (result.statusChanged !== false || result.emailSent !== false) {
  throw new Error(`Submit smoke must not mutate or email: ${JSON.stringify(result)}`);
}

console.log(`submit smoke passed for ${inspectionId}`);
