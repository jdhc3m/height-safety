# Android 3B-02 screen reference

Status: bounded implementation in Review. This slice downloads and opens a
versioned job pack. It does not capture inspection outcomes, photographs,
defects or recommendations yet; those belong to `3B-03`.

## State flow

```text
Jobs loaded
    -> Device unlock
        -> Downloading job pack -> Job pack opened
        -> Unlock declined -> Job-pack error -> Retry
    -> Job-pack error -> Retry
    -> Back to jobs
```

## Frames

| Frame | Visible content | Primary action |
| --- | --- | --- |
| Job card | Recorded reference, NSW/QLD jurisdiction, status, assignment and pack version | Open job pack |
| Device unlock | Platform device-credential confirmation before pack access | Confirm device access |
| Downloading | Progress indicator and download state | Wait |
| Job pack opened | Recorded job/site context, explicit jurisdiction, pack version, expected anchor register and offline lease | Review expected anchors; return to jobs |
| Job-pack error | Neutral failure or locked-access message; local evidence-preservation wording where relevant | Retry when safe; return to jobs |

## Boundary notes

- The API authorises the inspector and company before returning the pack.
- The released job version points to an immutable job/site/anchor snapshot;
  later register edits do not silently change a downloaded pack.
- The local database key uses company and job identity; a pack also validates
  site, jurisdiction, reference, version and anchor ownership before use.
- `NSW` and `QLD` remain recorded site context. The screen makes no legal,
  standards, compliance, certification or professional-approval claim.
- Device-credential failure, lease expiry and clock rollback do not delete
  local encrypted evidence.
- The opened screen is read-only in this slice. Anchor capture starts in
  `3B-03`.
