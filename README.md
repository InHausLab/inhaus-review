# InHaus Lab — Inspector Review Portal

Static web portal for reviewing inspection data before it goes to Tanner (the report builder).

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Inspection list page — shows all inspections with status, photo count, missing items |
| `review.html` | Single inspection review page — edit notes, mark photos, confirm tests, submit |
| `styles.css` | All styles — desktop-optimized, InHaus brand colors |
| `portal.js` | All JavaScript — vanilla JS, no frameworks |

---

## Setup

### Step 1 — Deploy the Apps Script

Deploy the InHaus Apps Script (`appsscript/`) and copy the web app URL.

### Step 2 — Swap the constants in `portal.js`

Open `portal.js` and replace the two placeholder constants at the top:

```js
const APPS_SCRIPT_URL = 'PLACEHOLDER_URL'; // ← paste your Apps Script URL here
const ACCESS_TOKEN    = 'PLACEHOLDER_TOKEN';  // ← paste the shared access token here
```

That's it. No build step. No npm. Just save the file.

### Step 3 — Serve the files

The portal is plain HTML/CSS/JS. Serve it from anywhere:

**Option A — Local dev (Python)**
```bash
cd /Users/hans/inhaus-review
python3 -m http.server 8080
# → open http://localhost:8080
```

**Option B — GitHub Pages**
Push to a repo, enable Pages on the `main` branch. Portal is live at `https://<org>.github.io/<repo>/`.

**Option C — Google Drive / any static host**
Upload the 4 files together. Open `index.html`.

### Repair the static photo data

When inspection JSON has photos nested under `rooms`, `exteriorAssessment`, `utilityRoom`, `wrapUp`, or other sections, run:

```bash
node scripts/repair-photo-pipeline.js
```

That flattens photos into each inspection's top-level `photos` array, keeps Drive thumbnail URLs in the portal shape, and rebuilds `api/list.json` with matching `photoCount` values. The portal uses the live Apps Script API first when available, then falls back to these static files.

---

## Non-Negotiable QA Protocol

A review portal QA pass is not complete until the production submit path passes a safe smoke test. Loading the page, checking photos, saving notes, and inspecting UI state are not enough.

Before anyone says the portal is ready:

1. Run the static tests:

```bash
node --test tests/*.test.mjs
```

2. Run the production submit-path smoke test:

```bash
node scripts/smoke-submit-path.mjs
```

The smoke test uses `INH-READINESS-PROBE` by default and calls the Apps Script `submitSmoke` action. That action must validate the same review token path as real Submit, but it must not change inspection status and must not email Tanner. If this test fails, the site is not ready, even if the UI looks correct.

If the Apps Script source changes, deploy Apps Script before running the production smoke test. A GitHub Pages push alone does not update Apps Script.

---

## Demo / Placeholder Mode

If `APPS_SCRIPT_URL` is still `'PLACEHOLDER_URL'`, the portal runs in **demo mode**:

- Shows hardcoded sample inspections on the list page
- Shows a full mock inspection (`INH-20260528-8F3KQ9`, 350 Popish Rd, Clay Lowery) on the review page
- Save/submit actions show a toast: "Demo mode — changes not saved"
- A yellow banner appears at the top of each page

This lets the UI be previewed and design-reviewed before the Apps Script is wired up.

---

## URL Structure

| URL | Page |
|---|---|
| `/index.html` | Inspection list |
| `/review.html?id=INH-xxx&token=abc123` | Single inspection review |

The `token` in the URL is the `reviewToken` stored in the Sheet per inspection. Not full auth — just enough to prevent casual snooping on hard-to-guess URLs.

---

## Status Flow

```
Synced → In Review → Submitted to Tanner → Report Complete
```

- **Synced** — Inspection synced from phone
- **In Review** — Dave is reviewing
- **Submitted to Tanner** — Gate passed, Dave clicked Submit. Page locks. Tanner is emailed.
- **Report Complete** — Tanner marks done (via Apps Script or Sheet)

---

## Completeness Gate

The Submit button stays disabled until all 6 gate items are green:

1. All room notes reviewed (voice review checkbox in each room)
2. All test locations recorded (QTrak + Breeze location fields)
3. Tests conducted confirmation complete (at least one test confirmed)
4. All photos marked Include or Exclude (no unreviewed photos)
5. Report Builder Notes filled in
6. Sample IDs recorded (for water panel + Boulder Blue if conducted)

---

## Apps Script — Expected API

### GET `?action=list&token={ACCESS_TOKEN}`
Returns all inspections summary:
```json
{
  "inspections": [
    {
      "id": "INH-20260528-8F3KQ9",
      "clientName": "Clay Lowery",
      "propertyAddress": "350 Popish Rd",
      "inspectionDate": "2026-05-28",
      "inspectorName": "Dave",
      "status": "In Review",
      "photoCount": 47,
      "missingCount": 3,
      "lastUpdated": "2026-05-28T14:32:00Z",
      "reviewToken": "abc123"
    }
  ]
}
```

### GET `?action=get&id={id}&token={reviewToken}`
Returns full inspection JSON (raw or reviewed, whichever is latest).

### POST `{ action: "saveReview", id, token, "x-sync-secret", field: { stepId, key, value } }`
Saves a single field edit to the reviewed JSON in Drive.

### POST `{ action: "submit", id, token, "x-sync-secret" }`
Locks the inspection, sets status → "Submitted to Tanner", emails Tanner.

### POST `{ action: "submitSmoke", id, token, "x-sync-secret" }`
Validates the production submit auth path without changing status or emailing Tanner. Required for smoke-test signoff.

### POST `{ action: "adminUnlock", id, token, adminToken }`
Reopens a submitted inspection (admin only).

---

## Design Decisions

- **No frameworks** — vanilla JS only, zero dependencies, no build step
- **Placeholder mode** — portal is fully previewable without a live backend
- **Chronological photos** — photos sorted by timestamp (order taken in field) — this is intentional per spec
- **Both Submit buttons** — one in the sticky nav bar, one in Section 6. They stay in sync via MutationObserver.
- **Original values** — when a field is edited, the original value shows below in gray so nothing is lost
- **Gate checks live** — gate re-evaluates on every edit, checkbox change, and photo toggle
- **Debounced saves** — 800ms debounce on input events, immediate save on blur
- **Locked state** — after Submit, all inputs get `readonly`/`disabled`, admin unlock link appears

---

## What's NOT in v1 (per spec)

- Login / auth system
- AI report generation
- Client-facing portal
- Sample map / test inventory table
- Photo category tagging
- Mobile UI

---

*Built May 28, 2026 — InHaus Lab Inspector Review Portal v1*
