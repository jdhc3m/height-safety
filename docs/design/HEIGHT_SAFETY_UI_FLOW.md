# Height Safety UI flow proposal

Status: design exploration only. The current Android screen is a bounded
3B-03 implementation; this proposal is not approved production redesign.

Purpose: replace the current 3B-01 visual direction with a field-first,
Material 3-informed flow for owner review before implementation.

## Product boundary

This proposal covers the inspector's field path:

`Sign in` → `Eligible jobs` → `Job pack` → `Anchor register` → `Anchor capture`
→ `Evidence` → `Review and save/submit`

The prototype uses fictional values only. `NSW` and `QLD` are displayed as
recorded site context. Nothing in the flow calculates or asserts legal rules,
certification, standards compliance or professional approval.

## Design direction

- Calm light surface with deep slate text and blue primary actions.
- Amber reserved for attention, pending evidence and review-needed context.
- Red reserved for errors or hard blockers.
- Strong job/site context at top of every working screen.
- One primary action per screen.
- Minimum 48dp equivalent target for every interactive control.
- Compact cards with restrained elevation and consistent M3 shape levels.
- Persistent local/sync state; no hidden offline behavior.
- Anchor-scoped photo, note, defect and recommendation evidence.
- `Recorded outcome` label remains explicit and neutral.

## Iteration record

### Round 1 — structure repair

Change: separate phone frames, remove nested full-screen gallery surfaces,
introduce one header and one primary action.

Why better: fixes the current blank/overlapping gallery and makes the flow
readable at a glance.

### Round 2 — field-first workflow

Change: add job-pack metadata, persistent sync status, anchor coverage count,
and an evidence count on each anchor.

Why better than Round 1: field user sees what job is active, what pack version
is being used, what work remains and whether local work is safely saved.

### Round 3 — M3 and evidence integrity

Change: use semantic colour roles, M3 type/shape hierarchy, 48dp controls,
explicit recorded-outcome wording, anchor-scoped evidence and a final review
gate.

Why better than Round 2: visual system becomes consistent and accessible while
the flow directly reflects offline evidence rules and avoids unsupported
compliance claims.

## Proposed clickable path

1. `Sign in`: company ID, provider-neutral note, prototype-only success action.
2. `Eligible jobs`: job reference, site, recorded jurisdiction, status, pack
   version, assignment and sync state.
3. `Job pack`: confirm version, site context and local authorisation state.
4. `Anchor register`: expected anchors, coverage progress and evidence counts.
5. `Anchor capture`: one selected anchor, observations and neutral recorded
   outcome choices.
6. `Evidence`: photo placeholder, note, defect/recommendation context and
   anchor association.
7. `Review`: coverage, missing evidence and recorded outcomes before local
   save or submission intent.
8. `Sync`: local, pending, synchronising, synchronised, failed and conflict
   examples.

## Owner review checklist

- Can a field user identify job, site and pack version immediately?
- Is recorded NSW/QLD context visible without implying a legal result?
- Is next action obvious on every screen?
- Can user distinguish local save from synchronised server state?
- Is every photo/note visibly attached to selected anchor?
- Are `Not inspected` and `Further assessment required` visibly distinct?
- Does any label imply certification, compliance, approval or engineer review?
- Does layout remain usable on phone and tablet widths?

## Artifacts

- [Research note](../discovery/STAGE_3B_UI_RESEARCH.md)
- [Brilliant storyboard](height-safety-3b-flow.bl)
- [Clickable HTML flow](height-safety-3b-flow.html)

The native Brilliant canvas `Height Safety/3B UI Exploration` is now created
and visually checked. Brilliant remains a static design canvas, so use the
HTML companion when click simulation is required.
