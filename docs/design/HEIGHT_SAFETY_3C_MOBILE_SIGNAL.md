# Height Safety 3C Mobile Signal

Status: design source of truth for owner validation. The researched light
palette is applied to the current Android theme and semantic states. This
artifact does not approve a full production screen redesign, partner
terminology or a change to product scope.

## Direction

`Signal Field` is a third visual direction for the inspector flow. It keeps
the existing product concepts and synthetic debug values, but uses one
daylight, role-based colour system: Horizon blue for primary actions, deep
teal for information/evidence, violet for job-pack and discovery context, and
separate success, warning and danger families for semantic states.

The direction uses current field-software patterns as design input:

- mobile-first checklists and structured inspection forms;
- photo and issue evidence associated with the inspected record;
- offline capture with visible local and synchronisation states; and
- compact, touch-friendly Material 3 surfaces that can reflow on larger
  windows.

These are design inferences, not validated partner requirements.

The icon treatment takes design input from current Atlassian iconography and
the requested [Icons8 Color industry reference](https://icons8.com/icons/set/industry--style-color): rounded, consistent solid icons;
familiar metaphors; and labels alongside icons. Prominent symbols are
standalone, without coloured background tiles, and use two or three internal
colours. No third-party assets or product UI are copied. The Android symbols
are editable local Canvas vectors. This is visual design input, not a product
or partner requirement.

## Data basis

All visible job and site values come from the debug gateway or existing Android
strings. Values remain synthetic:

- Company ID: `aaa`;
- account: `debug.inspector@example.test`;
- jobs: `DEMO-NSW-001` and `DEMO-QLD-001`;
- planned date: `2026-09-03`;
- workflow status: `assigned`;
- job pack version: `1`;
- selected pack: `DEMO-NSW-001`;
- site: `Synthetic NSW roof site`;
- address: `1 Debug Street`;
- site reference: `DEBUG-NSW`;
- access note: `Synthetic debug data only.`;
- expected anchor: `A-001`;
- anchor location: `North roof, grid A-1`;
- anchor type: `single_point`;
- manufacturer/model: `Synthetic manufacturer` / `Synthetic model`.

No value is invented for inspection outcome, defect, recommendation, proof
test, photograph content or server acknowledgement. The prototype shows the
existing controlled vocabulary and empty states where the debug app has no
recorded value.

## Mobile measurements

Primary canvas is a compact Android viewport: `360 × 800dp`.

- status bar: `24dp`;
- top app bar: `64dp`;
- bottom navigation: `80dp` when present;
- primary action: at least `48dp` high;
- horizontal screen padding: `16dp`;
- section rhythm: `8dp`, `12dp`, `16dp`, `24dp`;
- surface radii: `12dp`, `16dp`, `24dp`;
- body text: `14–16sp`; labels and metadata: `12–13sp`.

The HTML companion uses CSS pixels as a 1:1 design reference for these dp
measurements. Content-heavy capture screens scroll; fixed-height phone frames
do not imply that all fields fit without scrolling.

## Screen map

`Sign in` → `Inspector jobs` → `Job pack` → `Anchor capture` → `Review before
submission` → `Queue`.

The selected-anchor workspace remains one evidence surface. Reconciliation,
recorded outcome, exception, confirmation, disposition, observations,
recommendations, optional proof-test fields and photos stay distinct. The
prototype adds a mobile shell for Jobs, Queue and Account navigation; this
remains a navigation proposal and must be validated before a full Android
screen redesign. The palette and semantic state roles are already aligned in
the current Android surfaces.

## Colour and component tokens

The palette is a research candidate, not an accessibility-conformance claim.
It applies Material 3-style role pairings and Atlassian-style semantic token
discipline. The evidence and contrast checks are recorded in
[HEIGHT_SAFETY_3C_COLOR_RESEARCH.md](HEIGHT_SAFETY_3C_COLOR_RESEARCH.md).

| Token | Value | Use |
| --- | --- | --- |
| `signal.background` | `#F4F8FD` | pale Horizon app background |
| `signal.surface` | `#FFFFFF` | cards and bars |
| `signal.surfaceContainer` | `#E9F1F8` | selected and raised surfaces |
| `signal.onSurface` | `#142235` | primary text |
| `signal.onSurfaceVariant` | `#4D6175` | readable supporting text and icons |
| `signal.outline` | `#567087` | meaningful control boundaries |
| `signal.outlineVariant` | `#C1CFDB` | decorative dividers only |
| `signal.primary` | `#1558B0` | primary action and focus |
| `signal.primaryContainer` | `#E5EFFF` | job context and selected primary surface |
| `signal.secondary` | `#006E70` | information, local/sync and evidence |
| `signal.secondaryContainer` | `#D5F3F0` | information/evidence surface |
| `signal.tertiary` | `#65429A` | job-pack/discovery icon context |
| `signal.tertiaryContainer` | `#EEE5FB` | job-pack/discovery surface |
| `signal.success` | `#176B49` | saved/synchronised state |
| `signal.successContainer` | `#D7F2E3` | saved/synchronised surface |
| `signal.warning` | `#7A4E00` | warning and review attention |
| `signal.warningContainer` | `#FFF1C7` | warning/review surface |
| `signal.danger` | `#B3261E` | failure or hard blocker only |
| `signal.dangerContainer` | `#F9DEDC` | danger/blocker surface |

Reusable components are documented in
[height-safety-3c-component-library.html](height-safety-3c-component-library.html)
and represented by editable native masters in Brilliant under
`Canvas` → `Signal Field native components`.

The Android application uses subtly elevated white cards, an opaque pale-blue
job context card and inset shaded evidence panels. The defect-description and
empty-photo states share that inset structure while retaining distinct red and
green state families and explicit text labels.

## Source-of-truth guardrails

- `NSW` is displayed as recorded site context. It does not select legal rules,
  intervals, authority or a compliance result.
- Status text and icons appear together. Colour is never the only state signal.
- `Serviceable`, `Defective`, `Not inspected` and `Further assessment required`
  remain recorded outcomes, not automatic conclusions.
- Local save, queued submission, photo upload and server acknowledgement remain
  separate states.
- The word `Draft` remains visible where report or review work is represented.
- No screen claims certification, compliance, standards approval, engineer
  approval or replacement of professional judgement.
