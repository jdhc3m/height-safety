# Android 3B UI alignment

Status: ready for owner validation. Design artifact only; no Android code is
changed by this alignment pass.

## Source of truth

Design decisions follow this order:

1. [Stage 2B Anchor Workflow Specification](../requirements/STAGE_2B_WORKFLOW_SPEC.md)
   for workflow concepts, required relationships and neutral language.
2. `apps/android/app/src/main/kotlin/au/com/heightsafety/app/FieldScreen.kt`
   for screens and interactions already built.
3. `FieldViewModel.kt` and the generated/API adapter boundary for state and
   authority behavior.
4. `DebugDemoGateway.kt` for the synthetic values used during physical review.

The HTML and Brilliant artifacts are visual proposals. They do not approve
production UI, add product scope or validate terminology with inspectors.

## Built screen baseline

| Built surface | Source behavior | Design treatment |
| --- | --- | --- |
| Sign-in | Company ID, provider-neutral sign-in note, sign-in and signing-in states | Calm centered entry, clear identity boundary, one primary action |
| Jobs | Account/company context, authorized jobs only, jurisdiction, workflow status, assignment, pack version and planned date | Work queue cards with readable metadata, status pills and sync banner |
| Jobs empty/error | Empty state, refresh, failed sync and retry | Persistent state card; error color only for failure |
| Job pack | Device credential gate, download/loading/error, versioned site and expected-anchor snapshot, offline lease | Context card first, pack metadata second, expected anchors as the main work list |
| Anchor capture | One selected anchor, reconciliation, recorded outcome, exception, confirmation, disposition, observations, conditional fields, proof-test fields, photos and local save | One scrollable anchor workspace; evidence sections remain visibly tied to selected anchor |

The current app has no separate anchor-register route: the expected-anchor list
is part of the opened job-pack surface. The current app has no separate
evidence route: evidence is captured inside the selected anchor workspace.
The design now follows those built boundaries.

Device unlock is a platform credential dialog, not a replacement product
screen. The design shows it as a system step and keeps the app's locked/error
copy neutral.

## 2B field model on screen

The following controls must stay distinct in the visual design:

- `Recorded outcome`: `Serviceable`, `Defective`, `Not inspected` and `Further
  assessment required`.
- `Exception reason`: at least `Inaccessible` and `Unable to locate` when the
  outcome is `Not inspected`.
- `Register reconciliation`: expected register anchor, newly discovered,
  replacement and duplicate proposals.
- `Disposition`: `Removed from service recorded`; software does not perform or
  verify physical isolation.
- Optional proof-test evidence: entered load, hold, result, equipment/reference
  and associated evidence. The UI must not calculate a pass or compliance
  result.
- Evidence: photos, observations, defects, recommendations and notes remain
  associated with the selected anchor inspection.
- Synchronisation: local, pending, synchronising, synchronised, failed and
  conflict remain separate from job workflow and recorded outcome.

No screen derives an outcome from a photo, jurisdiction, date, manufacturer,
model or standards material. `NSW` and `QLD` are recorded site context only.

## Proposed visual system

- Deep slate text and brand mark: `#102235`.
- Blue primary action: `#2E5AAC`; soft blue context: `#E2EAFE`.
- Amber for local/pending/review attention: `#815800` on `#FFF0D6`.
- Green for saved/synchronised information: `#17633A` on `#E2F3EA`.
- Red only for failed state or hard blocker: `#A33B3B` on `#FDE7E5`.
- Material 3 hierarchy with restrained cards, 12/16/24dp corner levels and
  48dp minimum interactive targets.
- Icons support scanning: work queue, location, pack, person, calendar, sync,
  device lock, anchor/safety, camera, warning and local save. Icon never acts
  as the only state signal; text stays visible.
- Phone first. Larger windows may use a two-column job/anchor list when space
  allows, without changing workflow or authority.

## Proposed versus built

`Sign in`, `Jobs`, `Job pack` and `Anchor capture` are alignment targets for the
current app. Review/submission and complete upload/conflict handling are
future design surfaces for `3B-04` and `3C`; they are visibly labelled as
future in the exploration and must not be read as implemented behavior.

The design deliberately does not add office review, draft-report generation,
automatic compliance, certification, engineering approval, standards
interpretation or jurisdiction-specific legal rules to the Android field
surface.

## Owner validation questions

- Does current screen order match how an inspector thinks about an assigned
  job, pack and expected anchor?
- Are job reference, site, recorded jurisdiction, pack version and local/sync
  state easy to find before capture?
- Are `Recorded outcome`, `Exception reason`, reconciliation and disposition
  visibly separate?
- Does the selected-anchor header make photo and note association obvious?
- Are `Not inspected` and `Further assessment required` distinct without
  implying a technical conclusion?
- Are the proposed icons useful in bright field conditions and still
  understandable with text and assistive technology?
- Which future review/submit wording should be validated before implementation?
