# Android 3B-03 screen reference

Status: current bounded implementation plus design alignment for owner
validation. This document does not approve production UI or partner-validate
terminology.

## Current state flow

```text
Job pack opened
    -> Anchor capture
        -> Editing local draft
        -> Saving locally
        -> Saved locally
        -> Local save error
    -> Back to job pack
```

Camera capture is an Android adapter step launched from the selected anchor.
The JPEG is stored in app-private no-backup storage and its stable reference,
checksum and anchor association are persisted locally. Upload, retry and
synchronisation remain later work.

## Screen structure

| Section | Required visible meaning |
| --- | --- |
| Context header | Job reference, site, recorded `NSW`/`QLD` context, selected anchor and local state |
| Anchor record | Expected register, newly discovered, replacement or duplicate proposal; never silently merge identities |
| Recorded outcome | `Serviceable`, `Defective`, `Not inspected` or `Further assessment required` |
| Exception | `Inaccessible` or `Unable to locate` when outcome is `Not inspected`; preserve search/location context |
| Confirmation | Identity and location confirmation for a completed inspection |
| Disposition | `Removed from service recorded`; software does not perform or verify isolation |
| Evidence | Observations, notes, defects, recommendations and optional entered proof-test data |
| Photos | Capture action, count and explicit association with selected anchor inspection |
| Local save | Editing, saving, saved locally or failed state; no claim of server submission |

## 2B guardrails

- Every expected anchor needs a completed inspection or `Not inspected` with an
  exception before local submission is allowed.
- `Defective` requires defect description and supporting observation.
- `Further assessment required` requires reason and recommended follow-up or
  review note.
- Proof-test fields remain entered evidence. The app does not calculate pass or
  compliance.
- `Newly discovered`, replacement, duplicate and removed-from-service values
  are not recorded outcomes.
- Photos remain bound to one anchor inspection through the local evidence
  boundary.
- The screen never claims certification, compliance, engineer approval,
  standards approval or replacement of professional judgement.

## Owner review target

The selected anchor should remain obvious while scrolling. Primary action is
local save. Camera, outcome, exception and evidence controls use text plus
icons and retain accessible labels. The design should remain usable on phone
widths and reflow cleanly on larger windows without changing field rules.
