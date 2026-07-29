# InHaus Inspection Data Flow

Current local build reference: Inspector App `v149`, Review Portal `V48`.

```mermaid
flowchart LR
  A["Inspector App\nDave captures fields, notes, tests, photos"] --> B["Local Save + Photo Vault\nFull-res evidence retained on device"]
  A --> C["Usage Metrics\nTime, screens, blockers, saves, sync status\nNo note/caption text copied"]
  B --> D["Supabase Photo Storage / Photo Worker\nHigh-res image source + metadata"]
  A --> E["Apps Script Sync Record\nInspection summary, stepData, rooms, sample IDs"]
  A --> F["Review Storage field_data\nReviewer edits, recovery payload, submission receipt"]

  D --> G["Review Portal Load"]
  E --> G
  F --> G

  G --> H["Normalized Review Record\nStep 1 fields, rooms, tests, notes, photos"]
  H --> I["Room Review\nChecklist grid, test locations, no-issues state"]
  H --> J["Photo Review\nInclude/exclude, room/task placement, evidence role audit"]
  H --> K["Post-Inspection Content\nActions taken, observations, follow-ups"]
  H --> L["Finish Review\nSingle blocker tool before submit"]

  L --> M["Submit to Tanner"]
  M --> N["Apps Script Handoff"]
  N --> O["Assessment Drive Folder"]
  N --> P["Technician Photos Folder / Links"]
  N --> Q["Review Portal Data Sheet\nFormatted tabs + Raw Review Data"]
  N --> R["Raw JSON Backup\nComplete field_data safety copy"]
  N --> S["Report Tracker Row"]

  O --> T["Tanner Report Build"]
  P --> T
  Q --> T
  R --> T
  S --> T
```

## What Each Fix Protects

- `v149` app photo metadata keeps `photoKey`, `photoRole`, `sectionLabel`, and high-res source fields with every photo so evidence does not become anonymous later.
- `V48` portal photo placement blocks submit when key evidence photos are not assigned to a usable room/task.
- `V47` portal test-location cue makes missing Q-Trak/Breeze locations obvious inside the room card.
- Handoff backup creates both formatted review data and raw unfiltered review data so Tanner can recover anything even if a formatted tab misses a field.
- Usage tracking creates coaching data: time in app, time in portal, save counts, blockers, photo counts, and sync failures without storing private note text in the activity log.

## Failure Points To Watch

- If a photo has no high-res source or storage path, it is evidence at risk.
- If a key evidence photo is only labeled `Before`, `After`, or `ATP` without a room/task destination, it should block submit.
- If review list photo count and photo service count disagree, trust the photo service and flag the mismatch.
- If Tanner Package Check has no folder or Review Portal Data sheet, the handoff is not complete even if review notes exist.
- If `Raw Review Data` is missing from the Drive spreadsheet, the safety backup did not run.
