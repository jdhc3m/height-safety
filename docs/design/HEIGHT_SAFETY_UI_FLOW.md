# Height Safety UI flow proposal

Status: ready for owner validation. Design exploration only; no Android code is
changed by this alignment pass.

Purpose: align the 3B visual exploration with the built Android field screens
and the canonical Stage 2B workflow before any further UI implementation.

## Source of truth

- Workflow and field meaning:
  [Stage 2B Anchor Workflow Specification](../requirements/STAGE_2B_WORKFLOW_SPEC.md).
- Built screen behavior:
  [Android 3B UI alignment](ANDROID_3B_UI_ALIGNMENT.md) and
  `apps/android/app/src/main/kotlin/au/com/heightsafety/app/FieldScreen.kt`.
- Current capture boundary:
  [Android 3B-03 screen reference](ANDROID_3B_03_SCREEN_REFERENCE.md).

The design is fictional and reviewable. It does not approve production Android
UI, validate partner terminology or expand product scope.

## Built flow to align

`Sign in` → `Eligible jobs` → `Job pack` → `Anchor capture`

The opened job pack contains the expected anchor register. Anchor evidence is
captured in one selected-anchor workspace. There is no separate anchor-register
or evidence route in the current app.

Built state coverage:

- signed out, signing in, sign-in/session error;
- loading, loaded, empty and failed job sync;
- job-pack device-credential gate, loading, opened and error; and
- anchor draft editing, local save, local-save error and CameraX launch.

## 2B field controls

The selected-anchor workspace keeps these concepts separate:

- register reconciliation: expected, newly discovered, replacement and
  duplicate proposal;
- recorded outcome: Serviceable, Defective, Not inspected or Further assessment
  required;
- exception reason: Inaccessible or Unable to locate when Not inspected;
- identity/location confirmation;
- disposition: Removed from service recorded;
- observations, notes, defects and recommendations;
- optional entered proof-test load, hold, result, equipment/reference and
  associated evidence; and
- photos with explicit anchor-inspection association.

Every expected anchor must be accounted for before local submission. Conditional
relationships remain visible as validation issues. The UI must not calculate a
pass, compliance result or technical conclusion.

## Visual direction

- Calm light surface, deep slate text, blue primary actions.
- Amber for local/pending/review attention; green for saved/synchronised
  information; red only for failure or hard blocker.
- Compact Material 3 cards, clear section hierarchy and minimum 48dp targets.
- Text plus useful icons for work, location, pack, calendar, sync, lock, anchor,
  camera, warning and local save. Icons never replace labels or state text.
- Strong job/site/pack context before capture.
- Phone-first layout with clean reflow on larger windows.
- One primary action per screen or section; local save remains distinct from
  server submission.

Colour tokens carried from exploration:

| Role | Value |
| --- | --- |
| Deep slate | `#102235` |
| Primary blue | `#2E5AAC` |
| Soft blue | `#E2EAFE` |
| Attention amber | `#815800` / `#FFF0D6` |
| Saved green | `#17633A` / `#E2F3EA` |
| Failure red | `#A33B3B` / `#FDE7E5` |

## Future surfaces

The bounded 3B-04 local review/queue behavior is now represented by a built
Android screen. It shows hard capture/coverage blockers and office-review
warnings, freezes the local evidence revision, and states that server
submission is not confirmed.

Complete pending/uploaded/failed/conflict handling, server acknowledgement,
requested changes, exact snapshot approval and neutral draft-report handoff
remain future design surfaces for 3C and later. They must not silently rewrite
inspector evidence or claim certification, compliance, engineer approval or
standards approval.

## Owner review checklist

- Does screen order match field work: job, pack, expected anchor, capture?
- Can user find job reference, site, recorded jurisdiction, pack version and
  local/sync state before capture?
- Are reconciliation, recorded outcome, exception and disposition visibly
  distinct?
- Is every photo/note visibly tied to the selected anchor inspection?
- Are Not inspected and Further assessment required clearly different?
- Are proposed icons readable in field conditions and with assistive technology?
- Which future review/submit wording needs practitioner validation?

## Artifacts

- [2B-aligned screen map](ANDROID_3B_UI_ALIGNMENT.md)
- [3B-01 reference](ANDROID_3B_01_SCREEN_REFERENCE.md)
- [3B-02 reference](ANDROID_3B_02_SCREEN_REFERENCE.md)
- [3B-03 reference](ANDROID_3B_03_SCREEN_REFERENCE.md)
- [Clickable HTML flow](height-safety-3b-flow.html)
- [Portable Brilliant storyboard](height-safety-3b-flow.bl)
