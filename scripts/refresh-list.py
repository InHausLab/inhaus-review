#!/usr/bin/env python3
"""
Refresh /Users/hans/inhaus-review/api/list.json from the InHaus Report Tracker sheet.
Uses service account JWT — no gog dependency.
Run from anywhere; writes to the hardcoded output path.
"""
import json, time, base64, urllib.request, urllib.parse, sys

SA_KEY = '/Users/hans/.openclaw/credentials/inhaus-drive-mirror.json'
SHEET_ID = '1aqIKWTn-UoDt9gH5pwo7XoDUzVV4FgYUCb-KyPZvZUA'
SHEET_TAB = 'Report Tracker'
SHEET_RANGE = 'A1:P100'
OUTPUT = '/Users/hans/inhaus-review/api/list.json'

with open(SA_KEY) as f:
    sa = json.load(f)

def b64url(data):
    if isinstance(data, str): data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

now = int(time.time())
header = b64url(json.dumps({"alg": "RS256", "typ": "JWT"}))
claim = b64url(json.dumps({
    "iss": sa['client_email'],
    "scope": "https://www.googleapis.com/auth/spreadsheets.readonly",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": now + 3600,
    "iat": now
}))

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
pk = serialization.load_pem_private_key(sa['private_key'].encode(), password=None)
msg = f"{header}.{claim}".encode()
sig = pk.sign(msg, padding.PKCS1v15(), hashes.SHA256())
jwt = f"{header}.{claim}.{b64url(sig)}"

body = urllib.parse.urlencode({
    'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    'assertion': jwt
}).encode()
req = urllib.request.Request('https://oauth2.googleapis.com/token', data=body)
with urllib.request.urlopen(req) as r:
    token = json.loads(r.read())['access_token']

url = (
    f"https://sheets.googleapis.com/v4/spreadsheets/{SHEET_ID}/values/"
    + urllib.parse.quote(f"{SHEET_TAB}!{SHEET_RANGE}")
)
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
with urllib.request.urlopen(req) as r:
    rows = json.loads(r.read()).get('values', [])

# Find header row — the one with "Overall Status" in column 0
header_idx = next((i for i, r in enumerate(rows) if r and r[0] == 'Overall Status'), None)
if header_idx is None:
    print('ERROR: Could not find header row with "Overall Status"', file=sys.stderr)
    sys.exit(1)

headers = rows[header_idx]
data_rows = rows[header_idx + 1:]

COL = {h: i for i, h in enumerate(headers)}

def get(row, key, default=''):
    i = COL.get(key)
    if i is None or i >= len(row):
        return default
    return row[i].strip()

inspections = []
for row in data_rows:
    if not any(row):
        continue
    iid = get(row, 'Inspector App ID')
    if not iid:
        continue  # Skip rows without an app inspection ID
    inspections.append({
        'inspectionId': iid,
        'clientName': get(row, 'Name'),
        'propertyAddress': get(row, 'Address'),
        'inspectionDate': get(row, 'Assessment Date'),
        'inspectorName': 'Dave',
        'status': get(row, 'Overall Status', 'Needs Review'),
        'photoCount': '0',
        'missingCount': '0',
        'spreadsheetId': '',
        'folderId': '',
        'syncedAt': '',
        'reviewedBy': '',
        'reviewedAt': '',
        'submittedAt': '',
        'reportBuilderNotes': '',
        'reviewToken': get(row, 'Password', 'InHaus2026'),
    })

with open(OUTPUT, 'w') as f:
    json.dump(inspections, f, indent=2)

print(f'Written {len(inspections)} inspections to {OUTPUT}')
for insp in inspections:
    print(f"  {insp['inspectionId']}: {insp['clientName']} / {insp['propertyAddress']}")
