# InHaus Inspector Platform — Tanner Handoff V3 Rewrite

## Instructions for Hans

Use this document to revise:

https://inhaus-inspector.netlify.app/tanner-handoff.html

Preserve the current page’s InHaus styling, system inventory, historical timeline, quick-reference links, and descriptions of the current production stack. Replace the strategic framing, independence plan, build sequence, critical rules, and handoff-completion criteria with the content below.

The revised page should be labeled:

**Tanner Handoff V3 — Platform Reliability, Reproducibility, and Shared Ownership**

---

## 1. Replace the Current Goal

### Current framing to remove

> Tanner operates the full stack without Hans, Mac mini, or Matt’s personal accounts.

### New goal

> Any competent InHaus engineer can understand the system, recover it, make a safe change, and complete a verified production deployment without depending on one specific person.

The handoff is not complete merely because Tanner can operate the platform. It is complete when the platform no longer has a single-person operating dependency.

### Success metric

**Time to first safe deployment for a new engineer: two business days.**

The engineer should be able to accomplish this using only:

- Repository access
- Shared credentials from the company vault
- The onboarding runbook
- A seeded staging inspection
- Automated tests and deployment verification
- The rollback procedure

Tanner owns process, inspection quality, scoring policy, report requirements, and the product roadmap. Tanner must not be the only person capable of deploying, diagnosing, or recovering the platform.

---

## 2. State the Four Platform Guarantees

### Guarantee 1 — Never Lose an Inspection

An inspection is a paid client visit that may be impossible to repeat. Losing or corrupting one is not an ordinary software bug.

The platform must provide:

- Continuous cloud checkpointing during the inspection
- Per-photo immediate upload with stable photo identity
- Resumable and idempotent synchronization
- An immutable source snapshot when the inspector submits
- A visible sync state showing local, uploaded, reconciled, and finalized data
- Submission receipts containing record counts and a source-data checksum
- Recovery history rather than destructive overwrites
- Automated comparison of expected photos against stored photos
- Alerts for incomplete uploads, divergent records, and failed mirrors
- A documented recovery procedure that does not depend on the inspector’s phone remaining open

The inspector app, review portal, and report generator must all read from the same authoritative inspection record or from explicitly versioned derivatives of that record.

### Guarantee 2 — Every Score Is Reproducible

The scoring engine is a core InHaus product asset. It must not exist only as editable formulas in an unversioned Google Sheet.

Every finalized report must permanently record:

- Scoring-engine version
- Rubric version
- Hash of the exact scoring rules
- Immutable snapshot of the source inputs used
- Component scores and calculation trace
- Final score
- Report-generation timestamp
- Report template version
- Author and reason for any later amendment
- Original and amended values

Historical reports must never be silently recalculated using new rules.

When scoring rules change:

1. Create a new immutable scoring-engine version.
2. Record what changed, when, why, who approved it, and the supporting evidence.
3. Apply the new version only to reports explicitly assigned to it.
4. Preserve the ability to regenerate the original historical report exactly.
5. Optionally replay older source data against the new version for comparison, without replacing the issued score.

### Guarantee 3 — Production Proves What Is Running

Repository state, intended deployment state, and actual production state are different facts. All three must be recorded and compared automatically.

Every deployable component must expose a health/version response containing:

```json
{
  "environment": "production",
  "build_sha": "abc1234",
  "release_version": "v211",
  "schema_version": "inspection-v3",
  "deployed_at": "2026-07-24T18:00:00Z"
}
```

The Apps Script response must additionally include:

```json
{
  "apps_script_version": 86,
  "deployment_id": "production-deployment-id"
}
```

`Code.gs` should contain a generated `BUILD_SHA` value. The deployment process must compare the health response with the intended deployment manifest. A mismatch fails verification.

The deployment manifest must record:

- Git repository and commit SHA
- Release version
- Environment
- Deployment target and ID
- Apps Script version, when applicable
- Schema/API version
- Deployment timestamp
- Person or automation that deployed it
- Smoke-test result
- Rollback target

### Guarantee 4 — Every Production Change Is Recoverable

Each component needs a one-page rollback procedure with:

- Exact rollback trigger
- Required access
- Exact commands or console clicks
- Last-known-good release
- Data compatibility considerations
- Verification steps
- Escalation contact

A rollback drill must be completed in staging before the handoff is considered complete.

---

## 3. Convert Human-Memory Rules Into Enforcement

The current “Critical Rules” section should remain as historical context, but each rule must have an automated enforcement mechanism.

| Risk | Required enforcement |
|---|---|
| App files change without cache version changing | CI fails when cache-sensitive files change and `CACHE_NAME` or release version does not |
| Deleted photo tombstones accidentally appear | Create an approved active-photo view/API that filters tombstones; migrate consumers before restricting raw reads |
| Apps Script deploy is verified only with GET | Deployment script runs the required POST test and fails loudly |
| Repository and Apps Script production drift | Deployment manifest plus production `BUILD_SHA` health response |
| Duplicate or missing photos | Canonical photo identity, idempotency constraint, reconciliation job, and alert |
| Review data diverges between Sheet and Supabase | Supabase becomes authoritative; Sheets become a derived export |
| A new release breaks active inspections | Staging fixture, integration tests, backward-compatibility check, and rollback target |
| Scoring rules are edited in place | Immutable scoring versions and report-level scoring stamps |

Documentation explains why a rule exists. Automation prevents the same incident from happening again.

---

## 4. Clarify the Current Architecture

Keep the current stack inventory, with these additions and clarifications:

### Supabase and the Cloudflare Worker

Supabase should become the authoritative operational datastore. Browser clients must not receive service-role credentials.

The inspector app and review portal should access protected inspection data through the authenticated Cloudflare Worker API. The Worker is responsible for:

- Inspection-level authorization
- Stable versioned API contracts
- Idempotent writes
- Validation
- Audit events
- Signed photo access
- Submission receipts
- Retryable asynchronous jobs

### Apps Script

Apps Script is currently load-bearing and has repeatedly caused concurrency, timeout, deployment, and production-drift failures.

It must leave the user-facing critical path in stages:

1. Portal and report reads move to the Worker/Supabase API.
2. Inspector checkpoint and submission writes move to the Worker/Supabase API.
3. Apps Script becomes an asynchronous adapter for required Drive and Sheets exports.
4. Apps Script is removed if those exports are retired.

This migration is required by the business plan. Load testing should measure capacity and prioritize bottlenecks, but must not be used to decide whether the migration happens.

### Google Drive

Do not remove Drive until every downstream dependency is documented, including:

- Tanner’s assessment-folder workflow
- Technician Photos
- Tracker links
- Photo Log
- Report-generation inputs
- Client or legal retention requirements
- Any integrations that scan folders

After the dependency audit, Drive must become either:

- A retryable asynchronous archive/export generated from the authoritative record, or
- A retired dependency

**Decision trigger: Denver launch or 40 inspections per week, whichever occurs first.**

### Photo tables

Do not merge `inspector_photo_uploads` and `ihl_photos` until the photo lifecycle is defined.

First define:

- Canonical `photo_id`
- Raw-ingestion state
- Review-ready state
- Placement and caption history
- Annotation and rotation derivatives
- Tombstone/deletion behavior
- Drive-mirror state
- Report-publication state

Raw ingestion and report-ready photos may legitimately remain separate tables, but their identities and transition rules must be explicit and enforced.

---

## 5. Add a Reliability Architecture

### Authoritative record

For each inspection, Supabase must contain:

- Current working checkpoint
- Append-only checkpoint history or recoverable revisions
- Immutable submitted source snapshot
- Photo manifest
- Review-state revisions
- Final report snapshot
- Scoring-engine version
- Deployment/schema versions involved

### Photo reconciliation

“Best effort” is not an acceptable final state for required photo exports.

Implement:

- Durable mirror-job queue
- Exponential retry
- Idempotent Drive writes
- Nightly comparison of the Supabase photo manifest against required Drive exports
- Repair of missing exports
- Alert when repair cannot complete
- Dashboard showing expected, uploaded, mirrored, reviewed, and published counts

### Review data

Supabase becomes the source of truth for review edits. Google Sheets may remain a scheduled or event-driven export for operational visibility, but it must not be an equal independent write path.

---

## 6. Add Scoring-Engine Versioning to Phase 1

The first implementation can be small, but it must establish the correct permanent model.

Minimum Phase 1 deliverables:

1. Assign the current scoring rules an immutable version.
2. Export or encode the rules in a version-controlled format.
3. Generate a deterministic rubric hash.
4. Stamp every newly generated report with the engine version and hash.
5. Store the exact scoring input snapshot and component results.
6. Add a scoring changelog with approval and rationale.
7. Build a replay test using at least three historical inspections.
8. Confirm an issued report can be regenerated byte-for-byte or data-for-data from stored source and versioned rules.

Do not wait until hundreds of reports exist to add this.

---

## 7. Replace the Existing Build Sequence

### Phase 0 — Make the Current System Safe

Target: approximately two weeks.

- Resolve the Apps Script production/HEAD discrepancy
- Add deployment manifests
- Add production `BUILD_SHA` and version health responses
- Write and test rollback procedures
- Rotate exposed or shared secrets
- Move credentials into 1Password, Bitwarden, or an equivalent company vault
- Ensure two authorized humans have access to GitHub, Cloudflare, Supabase, Netlify, Google Workspace, and recovery credentials
- Correct contradictory deployment instructions in the current handoff page
- Automate the existing critical-rule checks
- Document current Drive dependencies

### Phase 1 — Reproducibility and Safe Onboarding

Target: Tanner’s first month.

- One-command local setup
- Staging Supabase project
- Staging Worker
- Staging site deployments
- Seeded inspection fixture containing every supported field, room, test, sample, photo state, finding, follow-up, and Before Leaving item
- Integration tests covering capture through report
- Scoring-engine versioning and historical reproducibility
- Canonical photo identity and lifecycle definition
- CHANGELOG and release discipline
- First rollback drill
- New-engineer deployment walkthrough

### Phase 2 — Reads Leave Apps Script

- Define the versioned inspection API
- Make the review portal read from Worker/Supabase
- Make report generation read from Worker/Supabase
- Preserve Apps Script as an export adapter temporarily
- Compare generated reports against current production output
- Measure latency, correctness, and operational failures

Report generation is the preferred wedge because it creates an immediate business benefit while removing Apps Script from the most fragile read path.

### Phase 3 — Writes Leave Apps Script

- Continuous inspection checkpoints write through the Worker
- Submission creates an immutable Supabase snapshot
- Worker returns a durable submission receipt
- Drive/Sheets work moves to retryable background jobs
- Add reconciliation dashboard and alerts
- Remove dual-write review behavior
- Complete the Drive decision at the stated trigger

### Phase 4 — Authentication and Scale

- Inspector identities and roles
- Inspection-level access control
- External-inspector onboarding
- Organization/account separation if required
- Capacity testing and production observability
- Disaster-recovery exercises

---

## 8. Add Shared Ownership

### Tanner

Owns:

- Inspection process
- Data-quality requirements
- Scoring policy
- Report content and templates
- Lab and sample workflows
- Product priorities
- Acceptance criteria

### Product/operations owner

Owns:

- Business priorities
- Customer impact decisions
- Launch timing
- Operational escalation
- Approval of material scoring changes

### Infrastructure engineer

Use a fractional senior engineer for approximately ten hours per month, focused on:

- Architecture review
- Deployment and rollback safety
- Security and credential management
- Database migrations
- Reliability and reconciliation
- Incident review
- Mentoring additional operators

This role is insurance against Tanner or any other single person becoming the new bus factor.

### Minimum access policy

Every production credential and vendor account must have:

- At least two authorized company-controlled users
- Recovery information stored in the shared vault
- Named owner and backup owner
- Rotation schedule
- Offboarding procedure

Do not store production secrets in `config.js`, chat history, personal notes, or personal password managers.

---

## 9. Redefine Handoff Completion

The handoff is complete only when all of the following are demonstrated:

- A new engineer completes setup from a clean machine using only the runbook
- The engineer loads the seeded staging inspection
- The engineer makes a small change
- CI validates the change
- The engineer deploys it to staging
- The engineer verifies the reported `BUILD_SHA`
- The engineer promotes it through the documented production process
- Production smoke tests pass
- The engineer rolls the staging release back successfully
- An inspection can be recovered without the original phone
- A historical report can be regenerated with its original scoring version
- Two people can access and recover every critical vendor account
- No production step requires Hans’s Mac mini or a personal account
- No production step requires Tanner specifically

Passing this exercise is the handoff deliverable.

---

## 10. Immediate “Do First” Checklist

Add this near the top of the revised page.

- [ ] Resolve and document the actual Apps Script production version
- [ ] Add `BUILD_SHA` and health/version responses
- [ ] Create the deployment-manifest format
- [ ] Write the rollback runbook
- [ ] Rotate secrets and establish the shared vault
- [ ] Add a second authorized operator to every production system
- [ ] Build the complete staging fixture inspection
- [ ] Version the current scoring engine
- [ ] Store scoring inputs and calculation traces for new reports
- [ ] Define canonical photo identity and lifecycle
- [ ] Map every Drive dependency
- [ ] Implement continuous inspection checkpoint verification
- [ ] Add photo/export reconciliation and alerts

---

## 11. Keep These Existing Sections

The following existing sections are useful and should remain, updated for accuracy:

- What We Built
- End-to-end inspection workflow
- Engineering timeline
- Full stack inventory
- Supabase schema inventory
- Current scaling risks
- Production URLs and quick reference
- Known production-versus-repository discrepancies
- Historical incidents and why current safeguards exist

Do not remove the history. It explains why the new safeguards are required.

---

## 12. Specific Existing Statements to Change

### Change

> Tanner operates the full stack without any access to Hans, Mac mini, or Matt’s personal accounts.

### To

> Any trained InHaus engineer can safely operate, deploy, verify, recover, and roll back the platform without relying on a particular person or personal account.

### Change

> Build 2 — Real Backend — MEDIUM, before 20/week.

### To

> Critical-path migration — move reads and writes from Apps Script to the authenticated Worker/Supabase API in controlled stages. Capacity tests inform timing and sizing but do not gate the migration.

### Change

> GitHub is the source of truth.

### To

> GitHub is the intended source of truth. Production health responses and deployment manifests verify what is actually running.

### Change

> Drive mirror is best effort.

### To

> Drive is currently a downstream operational dependency. Required exports must use a durable retry queue, reconciliation job, and alerting until Drive is formally retired.

### Clarify

The page currently says Tanner can edit and paste `Code.gs`, while also saying Apps Script HEAD must not be deployed. State clearly:

> Apps Script production changes are blocked until the production/HEAD discrepancy is resolved and parity tests pass. After that, all changes must follow the manifest, health verification, POST smoke test, and rollback process.

---

## 13. Final Message for the Page

> InHaus is not finished when the software works on a good day. The platform is ready when inspections cannot be silently lost, reports can be reproduced years later, production can prove exactly what code and scoring rules created each result, and more than one person can safely operate and recover the system.

> Tanner’s handoff is therefore not a transfer of dependency from one person to another. It is the creation of a reliable, versioned, recoverable, and independently operable inspection platform.
