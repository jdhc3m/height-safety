# Stage 3B design reference pack

Status: ready for owner validation. The researched light palette is applied to
the current Android theme and semantic states; the full Signal Field screen
redesign remains a candidate and is not approved by this pass.

## Start here

1. [Height Safety UI flow proposal](HEIGHT_SAFETY_UI_FLOW.md)
   — built-screen alignment, 2B controls and review checklist.
2. [Android 3B UI alignment](ANDROID_3B_UI_ALIGNMENT.md)
   — source-of-truth mapping for built and future surfaces.
3. [Clickable HTML flow](height-safety-3b-flow.html)
   — dependency-free simulation of the built flow plus labelled future direction.
4. [Portable Brilliant storyboard](height-safety-3b-flow.bl)
   — editable static storyboard source.

## Third mobile direction

The `Signal Field` direction is a separate owner-validation candidate built
from the current Android/debug vocabulary and synthetic values. It uses a
measured `360 × 800dp` compact-phone reference, a daylight theme comparison,
semantic colour-coded solid icons, and a reusable component library:

- [Signal Field source notes](HEIGHT_SAFETY_3C_MOBILE_SIGNAL.md)
- [Signal Field colour research](HEIGHT_SAFETY_3C_COLOR_RESEARCH.md)
- [Clickable Signal Field mobile prototype](height-safety-3c-mobile-signal.html)
- [Signal Field component library](height-safety-3c-component-library.html)

The clickable mobile prototype includes four visual palette candidates —
Signal orange, Blue horizon, Harbour + mint and Plum + teal — so the same
workflow can be navigated while comparing themes. Blue horizon is the current
working default for owner review. The picker changes primary, information and
job-pack context accents while preserving semantic saved, warning and blocker
roles. These remain owner-validation candidates, not an approved production
theme.

The prototype uses local inline domain vectors for roof-anchor and industry
symbols, with the [Icons8 industry color set](https://icons8.com/icons/set/industry--style-color)
retained as a style reference rather than copied artwork. The Brilliant
masters use the same Blue horizon roles and editable field-work icon choices.
The Android pass now uses standalone two- or three-colour icons without icon
background tiles, subtly elevated cards, a pale-blue job context card and
matching inset panels for conditional defect and photo states.

The Brilliant `Canvas` also contains the editable native masters under
`Signal Field native components`: `StatusChip`, `ActionButton`, `AnchorRow`,
`EvidenceSection`, `BottomNavigation` and `JobCard`.

## Office web design set

Status: design candidate for owner and design-partner review. The office web
surfaces are not implemented; routes and states already specified or built at
the API are labelled accordingly inside the sample.

- [Office web prototype sample](height-safety-3c-office-web.html)
  — dependency-free click-through of product map and route tree, design system,
  sign-in, dashboard, sites, anchor register, job detail, review workspace,
  approval gate, draft reports, administration, flow map and handoff matrix.
  Fixed-column tables use system UI fonts for identifiers for offline
  legibility; semantic status roles follow `HEIGHT_SAFETY_UI_FLOW.md`.

## Supporting reference

- [UI research](../discovery/STAGE_3B_UI_RESEARCH.md)
  — comparable field-safety products, Material 3 guidance, evidence classes
  and design inferences.
- [Android 3B-01 screen reference](ANDROID_3B_01_SCREEN_REFERENCE.md)
  — sign-in and authorized jobs.
- [Android 3B-02 screen reference](ANDROID_3B_02_SCREEN_REFERENCE.md)
  — bounded implementation reference for the current job-pack slice.
- [Android 3B-03 screen reference](ANDROID_3B_03_SCREEN_REFERENCE.md)
  — current anchor evidence capture boundary.

## Brilliant canvas

Native canvas created in Brilliant:

`Height Safety/3B UI Exploration`

The local storyboard source is aligned to the built baseline, current 3B-03
capture boundary and labelled future review/sync direction. Brilliant currently
opens with that aligned board; the original exploration remains below for
comparison and history. Brilliant provides the editable static canvas; the HTML
companion is the click-through surface until owner validation.

## Product guardrails

- Supported site jurisdiction is recorded explicitly as NSW or Queensland.
- Jurisdiction display does not infer legal rules, standards, intervals or
  compliance.
- Use neutral terms: recorded outcome, submitted by inspector, reviewed by,
  draft report and further assessment required.
- Do not imply certification, automatic compliance, engineer approval or a
  replacement for professional judgement.
- Keep evidence associated with the selected anchor and keep local/sync state
  visible.
