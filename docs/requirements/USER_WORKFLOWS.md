# User Workflows

Canonical Stage 2B details:
`docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`.

## Office preparation

1. Office creates the client, site, anchor register and versioned job pack.
2. Office creates a draft job and assigns one primary inspector.
3. Inspector downloads the assigned pack; download state remains separate from
   job workflow state.

## Field capture and submission

1. Inspector accounts for each expected anchor with a completed inspection or
   `Not inspected` plus an exception reason.
2. Inspector records observations, associated photos, defects,
   recommendations, one recorded outcome and optional entered test evidence.
3. Newly discovered, duplicate and replacement cases remain explicit register
   reconciliation proposals. Removed from service is a separate disposition.
4. Local saves survive restart/connectivity loss. Submission intent and all
   queued evidence retain visible sync state.

## Office review and report

1. Reviewer sees submitted revisions, coverage gaps, conditional-field errors,
   failed/pending uploads, warnings, requested changes and conflicts.
2. Reviewer requests changes or resolves review issues without silently
   overwriting inspector evidence.
3. Approval requires all hard blockers to be clear and records the exact source
   snapshot, reviewer and time.
4. Connected generation creates a neutral, immutable prototype draft report
   revision; later corrections create new revisions.
