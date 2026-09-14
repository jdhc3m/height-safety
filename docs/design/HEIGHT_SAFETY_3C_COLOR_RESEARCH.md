# Height Safety 3C daylight colour research

Status: research only. This file proposes a colour-system candidate for owner
validation. It does not approve production UI, establish accessibility
conformance, claim certification, or change product scope.

Research date: 2026-09-08

## Scope and context

The current `Signal Field` design note was inspected for context:
[HEIGHT_SAFETY_3C_MOBILE_SIGNAL.md](HEIGHT_SAFETY_3C_MOBILE_SIGNAL.md).
The user context is field work in bright outdoor daylight. The palette below
therefore favours a light neutral workspace, dark text, and high-contrast
action and state colours. The outdoor-readability conclusion is an explicit
design inference; it is not a substitute for testing on the target devices in
actual rooftop conditions.

The product remains the bounded NSW and Queensland workflow for installed
single-point roof anchors. Colour must not infer legal rules, intervals,
authority, compliance, certification, standards approval, engineer approval,
or replacement of professional judgement. `NSW` and `QLD` remain recorded site
context only. Recorded outcomes, including `Defective` and `Further assessment
required`, remain inspector-submitted evidence and review context.

## Executive conclusion

The existing light direction is close to a usable daylight system, but its
colours currently behave as a collection of individually plausible swatches
rather than one role-based system. The main problems are:

- `signal.faint` is too weak for normal supporting text if used as text;
- `signal.line` is too weak to be the only meaningful control boundary;
- the primary orange and success green lose margin on their pale containers;
- the raised neutral surface is almost indistinguishable from the canvas; and
- unrelated accent foregrounds and backgrounds can be mixed unless each pair is
  constrained by role.

The proposed direction is a Material 3-shaped, Atlassian-like token discipline:

1. one daylight neutral ramp for canvas, surfaces, text, icons and borders;
2. safety orange as the single brand/action family;
3. deep teal as the information/offline/evidence family;
4. indigo as the discovery/job-pack context family; and
5. separate green, amber and red semantic families for saved, attention and
   failure states.

Each family has a bold role plus an `on` colour, and a pale container plus an
`on-container` colour. Soft backgrounds and their foregrounds stay within the
same family. This is a design candidate, not a claim that the product or
implementation is WCAG-conformant.

## Primary sources and validated findings

### Material 3

- [Material Design 3: Color roles](https://m3.material.io/styles/color/roles)
  and [Color system overview](https://m3.material.io/styles/color/system/overview)
  define the role-based Material colour system.
- [Material 3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)
  says a scheme is built from five key colours, each related to a tonal palette;
  it assigns primary to prominent components and active states, secondary to
  less-prominent accents such as filter chips, and tertiary to balancing or
  heightened accents. It also documents the use of neutral surface roles for
  emphasis.
- The same Android guidance says to pair `on-primary` with `primary`,
  `on-primary-container` with `primary-container`, and equivalent `on-*` roles
  with their matching containers. It explicitly warns that mixing unrelated
  roles can create a poor-contrast component.
- [Material 3 `ColorScheme` API](https://developer.android.com/reference/kotlin/androidx/compose/material3/ColorScheme)
  describes `on*` roles as content colours for the matching surfaces and
  `outline` as the stronger outline role intended to add accessibility
  contrast, while `outlineVariant` is for lower-emphasis decorative boundaries.
- Material 3 supports light and dark schemes and Android 12+ dynamic colour;
  the Android guidance recommends a custom fallback when dynamic colour is not
  available. Whether this product should allow dynamic colour is still an open
  product decision.

### WCAG / W3C

- [WCAG 2.2, Success Criterion 1.4.3: Contrast (Minimum)](https://www.w3.org/TR/WCAG22/#contrast-minimum)
  requires at least `4.5:1` for normal text and `3:1` for large text, with
  exceptions for inactive controls, decoration and logos.
- [Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  defines the relative-luminance formula as `(L1 + 0.05) / (L2 + 0.05)` and
  says the comparison uses the colours expected to be adjacent in normal use.
- [WCAG 2.2, Success Criterion 1.4.11: Non-text Contrast](https://www.w3.org/TR/WCAG22/#non-text-contrast)
  requires `3:1` for visual information needed to identify active controls,
  their states, and meaningful graphics. [Understanding Non-text
  Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
  also warns that thin lines can appear fainter in practice and recommends
  exceeding the minimum where necessary.
- [WCAG 2.2, Success Criterion 1.4.1: Use of Color](https://www.w3.org/TR/WCAG22/#use-of-color)
  requires that colour is not the only way to convey information, action,
  response, or distinction. Text, icons, shape, labels, and state changes must
  carry the meaning with colour.

### Atlassian Design

- [Atlassian Color](https://atlassian.design/foundations/color) defines semantic
  roles including neutral, brand, information, success, warning, danger,
  discovery, accent, inverse and input. It says to choose the role that matches
  the situation, reserve accents for non-semantic categorisation, use inverse
  tokens on bold backgrounds, and apply interaction-state tokens.
- [Atlassian Accents](https://atlassian.design/foundations/color/accents) says
  accent foregrounds and backgrounds should be paired from the same colour
  family. It recommends avoiding yellow as a general accent because of its
  accessibility challenge, using borders when a subtle background needs more
  separation, and checking text/icon pairings against minimum contrast.
- Atlassian's colour guidance summarises `3:1` for essential UI/large text and
  `4.5:1` for smaller text. This research applies the stricter `4.5:1` target to
  all normal product text, regardless of whether a particular design review
  could classify it as large.

## Current candidate checks

Ratios below were calculated from the current values in the design note using
the WCAG relative-luminance formula. Displayed values are rounded to two
decimals; pass/fail decisions must use unrounded values. These checks are
colour-pair checks, not a product conformance assessment.

| Current pair | Ratio | Research implication |
| --- | ---: | --- |
| `signal.faint #708187` on `signal.surface #FFFFFF` | `4.05:1` | Fails the proposed `4.5:1` normal-text target. Reserve for decorative or non-essential treatment, or darken it. |
| `signal.orange #C94F12` on `signal.surface #FFFFFF` | `4.55:1` | Barely clears the normal-text target. It has little margin for opacity, anti-aliasing, glare, or a slightly different surface. |
| `signal.orange #C94F12` on `signal.orange-soft #FFF0E7` | `4.09:1` | Fails the normal-text target. Use the dark `on-primary-container` role on a pale orange container. |
| `signal.green #087F5B` on `signal.green-soft #DFF5E8` | `4.38:1` | Fails the normal-text target. Use a dark `on-success-container` role for text on the pale success surface. |
| `signal.line #D3DEE1` on `signal.surface #FFFFFF` | `1.37:1` | Not sufficient as the only meaningful boundary for an input or active control. It can remain a decorative separator only. |
| `signal.surfaceRaised #EEF3F4` against `signal.canvas #F5F8F9` | `1.05:1` | A tonal layer, not a reliable boundary. Pair it with content hierarchy or an appropriate outline when a boundary matters. |

The current `signal.text #172227` and `signal.textMuted #52636A` have strong
ratios on light surfaces (`16.22:1` and `6.27:1` respectively). The issue is
therefore not that every current colour is invalid; it is that roles, margins,
and pairings are not constrained consistently.

## Proposed daylight token candidate

Hex values are proposed values for owner validation, not official Material or
Atlassian values. The names intentionally follow Material-style role semantics
so the Android and HTML implementations can refer to the same intent.

### Neutral roles

| Role token | Value | Intended use | Pair/check |
| --- | --- | --- | --- |
| `signal.background` | `#F6F9FA` | Daylight app canvas | `onSurface` is `14.88:1` |
| `signal.surface` | `#FFFFFF` | Cards, bars and primary work surfaces | `onSurface` is `15.75:1` |
| `signal.surfaceContainer` | `#EFF4F5` | Tonal grouping/elevation, never the only state cue | `onSurface` is `14.19:1`; surface separation is only `1.05:1` from the canvas |
| `signal.onSurface` | `#16252B` | Primary text and essential icons | `15.75:1` on surface; `14.88:1` on background |
| `signal.onSurfaceVariant` | `#4F6167` | Supporting text and secondary icons | `6.49:1` on surface; `6.13:1` on background |
| `signal.outline` | `#5F7076` | Input borders, control boundaries and focus treatment | `5.16:1` on surface; `4.88:1` on background |
| `signal.outlineVariant` | `#C3D0D3` | Decorative dividers only | `1.58:1` on surface; do not use as the only essential boundary |
| `signal.inverseSurface` | `#25353B` | Rare high-emphasis inverse surface | White is `12.72:1` on it |

`signal.onSurfaceVariant` replaces the current very faint text/icon treatment
for any supporting information users need to read or interpret. Decorative
low-contrast separators may still use `signal.outlineVariant`, but meaningful
control boundaries use `signal.outline`.

### Semantic and accent role families

| Role family | Bold role | On-bold | Pale container | On-container | Bold/on-bold | On-container/container |
| --- | --- | --- | --- | --- | ---: | ---: |
| Brand / primary action | `#A84412` | `#FFFFFF` | `#FFE9DD` | `#4C1D08` | `6.00:1` | `12.08:1` |
| Information / offline / evidence | `#006C67` | `#FFFFFF` | `#D0F2EE` | `#003735` | `6.29:1` | `11.03:1` |
| Discovery / job-pack context | `#5D4A92` | `#FFFFFF` | `#ECE5FF` | `#27134E` | `7.34:1` | `13.35:1` |
| Success / locally saved / synchronised | `#176B49` | `#FFFFFF` | `#D7F2E3` | `#073B28` | `6.49:1` | `10.63:1` |
| Warning / review attention | `#7A4E00` | `#FFFFFF` | `#FFF1C7` | `#3C2800` | `7.20:1` | `12.48:1` |
| Danger / hard failure or blocker | `#B3261E` | `#FFFFFF` | `#F9DEDC` | `#410E0B` | `6.54:1` | `12.77:1` |

Additional same-family checks are above `5:1` for each bold role on its pale
container, but the prescribed pairing remains `on-container` on a container.
Do not place white text on a pale container, or place a role from one family on
another family's container, without a new contrast check.

## Application rules for the candidate

1. Use `primary` only for the main action, active emphasis, and focus/selection
   treatment. Use `on-primary` on its bold fill.
2. Use `secondary` for information, offline, evidence and in-progress states.
   Use `on-secondary-container` on the pale evidence surface.
3. Use `tertiary` for discovery or job-pack context, not for success, warning,
   failure, or legal/compliance meaning.
4. Use success, warning and danger only where the state has that semantic
   meaning. A recorded `Defective` outcome may be shown with the danger family
   as a visual aid, but the label and recorded-outcome wording remain primary;
   the colour must not turn it into an automatic compliance conclusion.
5. Use the same family for a semantic icon, its container and its border. Do
   not combine, for example, a lilac container with a teal status icon merely
   because the colours look attractive.
6. Every meaningful status must have at least two cues: text plus icon, shape,
   border, or layout. Colour alone cannot distinguish saved, warning, failure,
   recorded outcome, or review state.
7. Use `onSurfaceVariant` for readable metadata. Do not use `outlineVariant` or
   a faint accent as normal text. Recheck any alpha/disabled treatment against
   the actual background.
8. Use `outline` or a stronger same-family border for an input, selected state,
   or control whose boundary is needed to identify it. Use `outlineVariant` only
   for a decorative divider that is not carrying meaning.
9. Keep the light scheme deterministic for the source-of-truth candidate. If
   dynamic colour is later enabled on Android 12+, preserve these semantic
   relationships and re-test all role pairings rather than allowing wallpaper
   colours to redefine saved, warning, danger, or evidence meaning.

## Contrast-check matrix for implementation review

Before any UI change adopts this candidate, check these pairs at the actual
rendered opacity and adjacent surface:

| Check | Minimum target | Candidate result / rule |
| --- | ---: | --- |
| Normal body, label, metadata text | `4.5:1` | Use `onSurface`, `onSurfaceVariant`, or the matching `on-*Container` role. Proposed listed pairs are `6.13:1` or higher. |
| Large text | `3:1` | The candidate still targets `4.5:1` for normal product text to leave margin. |
| Meaningful icon or active control boundary | `3:1` | Use `onSurfaceVariant`, `outline`, or a bold same-family role. Proposed neutral/icon checks are `4.88:1` or higher. |
| Focus or selected-state indicator | `3:1` against adjacent colour | Use a visible border/icon/shape plus a role colour; do not rely on a surface fill difference of `1.05:1`. |
| Text/icon on pale semantic container | `4.5:1` for text; `3:1` minimum for meaningful graphics | Use the matching `on-*Container` role. Proposed pairs range from `10.63:1` to `13.35:1`. |
| Decorative divider | No claim of semantic contrast | `outlineVariant` may be used only when it is not needed to identify a control or state. |
| Disabled/inactive control | WCAG has an exception | Still keep it perceivable in field use; do not use the exception to hide a required workflow state. |

The test method is: identify the actual foreground, background and opacity;
calculate relative luminance using the WCAG formula; test the least-contrasting
expected adjacent pair; and inspect thin strokes and anti-aliased icons at
device scale. Do not round `2.999:1` up to `3:1`.

## Explicit inferences

- A light neutral canvas with dark neutral ink is the best starting point for
  the stated outdoor-daylight context. This is a product-design inference,
  not a claim that light mode alone solves glare or outdoor readability.
- Retaining orange as the primary family preserves continuity with the current
  direction and communicates action energy, but darkening it to `#A84412` gives
  more contrast margin than the current `#C94F12`. No validated brand decision
  currently requires orange.
- Teal is proposed for offline/evidence because it is distinct from orange and
  can be used as a semantic information family; indigo is proposed for
  job-pack/discovery context because it is an accent-like context cue rather
  than a workflow result. These mappings need partner validation.
- Amber is restricted to warning meaning rather than general decoration. This
  follows Atlassian's warning about yellow accessibility and keeps colour-role
  meaning stable.
- A fixed light candidate is preferable for a source-of-truth review because it
  makes screenshots, HTML, Android and design-tool comparisons deterministic.
  Dynamic Android colour may still be evaluated as a separate product choice.

## Open questions

- Does the product have an approved brand colour or logo constraint that should
  replace the proposed safety-orange primary?
- Which physical Android models and screen protectors will inspectors use, and
  can the candidate be reviewed in direct Queensland/NSW sunlight, shade,
  maximum brightness, glare and reduced-vision conditions?
- Should Android dynamic colour be disabled for this field workflow, or can it
  be limited to neutral surfaces while semantic role relationships remain
  fixed?
- Do inspectors and office reviewers interpret information, success, warning
  and danger in the proposed way, especially for `Defective`, `Not inspected`
  and `Further assessment required` recorded outcomes?
- What focus, pressed, selected, disabled and error-alpha states are required
  by the final component library, and what are their actual adjacent surfaces?
- Should a dark theme exist at all for this field workflow, or is the light
  candidate the only supported presentation for the initial pilot?
- Has the candidate been checked in grayscale, common colour-vision-deficiency
  simulations, large text settings, TalkBack and keyboard/focus navigation?

## Guardrail and next-step statement

This document records research and a colour candidate; the candidate roles
are now applied to the current Android light theme, HTML prototypes, component
library and Brilliant designs for comparison. The document does not approve a
full production screen redesign, modify product requirements, legal
interpretation or architecture. Owner/design-partner validation and device
testing are still required before broader implementation changes are
authorised. Any later implementation must preserve explicit NSW/Queensland
site context, durable offline evidence, visible synchronisation/conflict state,
photograph association, report revisions, auditability, and neutral recorded
outcome language.
