# InHaus Lab Inspector Review Portal

Static web portal for reviewing inspection data and producing Tanner's handoff package.

## Production Architecture

- Cloudflare Worker: the portal's only production API.
- Supabase: authoritative inspection, review, photo, job, and receipt storage.
- Google Drive and Report Tracker: generated handoff artifacts written by the Worker.
- GitHub Pages: static portal hosting.
- Apps Script: retired from the portal's production path.

The Worker URL and review access token are configured at the top of `portal.js`. Demo data is available only with `?demo=1`.

## Local Preview

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`. Use `http://localhost:8080/?demo=1` for the non-persistent sample.

## Non-Negotiable QA Protocol

A review portal release is not complete until all static tests and the production Worker submit smoke pass against the exact deployment candidate.

```bash
node --test tests/*.test.mjs
node scripts/smoke-submit-path.mjs
```

The smoke route validates production review authorization without changing an inspection, creating a handoff, reserving an assessment number, writing Drive or tracker artifacts, or sending a notification. The release is not complete until the production Worker submit path passes.

## Production API

The portal uses these Worker routes:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/inspections` | Review portal inspection inventory |
| `GET` | `/inspections/:inspectionId` | Canonical inspection and recovered checkpoints |
| `GET` | `/get-review` | Reviewer edits and submission receipts |
| `POST` | `/save-review` | One reviewer field update |
| `POST` | `/review-unlock` | Admin-only review reopen |
| `GET` | `/inspection-photos` | Supabase photo manifest |
| `GET` | `/photo` | Full-resolution photo response |
| `POST` | `/delete-review-photo` | Review photo deletion |
| `POST` | `/review-activity-events` | Portal usage event |
| `POST` | `/handoff-jobs` | Retryable Tanner package generation |
| `GET` | `/submit-smoke` | Non-mutating production readiness check |
| `POST` | `/app-feedback` | Portal suggestion storage |

## Status Flow

`Prepared -> In Progress -> Needs Review -> Submitted to Tanner -> Report Complete`

Submit remains locked until the persistent Finish Review tool reports no blockers. Submission writes a durable attempt receipt, runs the Worker handoff job, verifies the Drive/tracker package, then writes the confirmed submission receipt.

## Historical Recovery

Static JSON is not a production backend. Read-only protected recovery remains for Hubbard (`INH-20260722-VCMSTE`) and Hagist (`INH-20260727-86EZAT`) because those two reports predate the canonical Worker inspection API.
