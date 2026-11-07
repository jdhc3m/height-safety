# Icon source set (T2a, issue #35)

Authored SVG glyph sources for the Height Safety icon system. `design/DESIGN.md`
§9 is the source of truth for the icon list, colour meanings and rendering
rules; hue hexes come from `design/tokens.json` (single source, read at
generation time).

Each icon has one **authored source** file in this directory. The **tile** and
**free-glyph** variants under `tile/` and `free/`, and the owner-review contact
sheet `contact-sheet.html`, are derived from the sources by
`tools/design-icons/generate.mjs` and gated by `tools/design-icons.sh --check`.

This ticket deliberately stops at SVG sources, variants and the contact sheet.
Generating Android `ImageVector`s or the web SVG sprite is T2b (issue #66) and
must not start until the owner has reviewed and approved this source set.
Android screen call sites are unchanged by this ticket.

## Source convention

- `viewBox="0 0 24 24"`. Author inside the 2px keyline: keep ink inside the
  2..22 live area.
- Root attributes `data-name` (display name, exactly as listed in DESIGN.md §9)
  and `data-colour` (one of `blue`, `teal`, `orange`, `green`, `purple`, `red`,
  `slate`, `yellow`).
- Rounded outer corners on shapes; flat (butt) stroke caps; round stroke joins.
  No shadows, outlines, gradients or nested containers.
- Paths only (`<path>` elements), one of these roles via `data-role`:

  | Role | Meaning | Free glyph | Tile glyph |
  |---|---|---|---|
  | `base` | main glyph shape | hue base tone | white |
  | `detail` | secondary/depth shape | hue bold tone | white |
  | `mark` | interior accent that must stay light against the body | white | hue base tone |
  | `accent` | fixed-meaning coloured element (e.g. the Conflict alert badge); carries an explicit `fill` | explicit fill | explicit fill |
  | `accent-mark` | interior mark inside an accent element | white | white |

- Filled `base`/`detail`/`mark` paths use even-odd fill (added at generation
  time): extra subpaths inside the outline punch holes — transparent in free
  glyphs, tile colour in tile glyphs. Keep subpaths non-overlapping within one
  element.
- Stroked paths use `fill="none"`, a `data-role`, the 2px keyline
  `stroke-width="2"`, `stroke-linecap="butt"` and `stroke-linejoin="round"`;
  they never carry a colour (the role decides it).

## Variants (DESIGN.md §9)

- **Tile** (`tile/<slug>.svg`): full-bleed rounded square, 24px with radius 25%
  (6px), glyph in white; holes and marks show the tile colour. Rendered sizes
  20 / 24 / 32 / 40 / 48.
- **Free glyph** (`free/<slug>.svg`): the glyph filled in the tile hue — two
  tones allowed (base body + bold detail for depth) — on transparent. Rendered
  sizes 16 / 20 / 24.
- Tile colours and glyph hues are fixed tokens, identical in light and dark
  themes; only surfaces change. The contact sheet demonstrates both themes.

## Palette (from `design/tokens.json`)

| Hue | Base | Bold |
|---|---|---|
| blue | `#1D7AFC` | `#0C66E4` |
| teal | `#2898BD` | `#227D9B` |
| purple | `#9F8FEF` | `#6E5DC6` |
| green | `#22A06B` | `#1F845A` |
| orange | `#F38A3F` | `#E56910` |
| red | `#F15B50` | `#C9372C` |
| yellow | `#F5CD47` | `#CF9F02` |
| slate | `#758195` | `#44546F` |

## Inventory (39 glyphs, DESIGN.md §9)

| Source | Name | Hue | Group |
|---|---|---|---|
| `jobs.svg` | Jobs | blue | navigation |
| `sites.svg` | Sites | teal | navigation |
| `anchors.svg` | Anchors | orange | navigation |
| `reports.svg` | Reports | green | navigation |
| `review-queue.svg` | Review queue | purple | navigation |
| `sync.svg` | Sync | blue | navigation |
| `account.svg` | Account | blue | navigation |
| `settings.svg` | Settings | slate | navigation |
| `roof-anchor.svg` | Roof anchor | teal | navigation |
| `roof-zone.svg` | Roof zone | teal | navigation |
| `building.svg` | Building | purple | navigation |
| `client.svg` | Client | purple | navigation |
| `job-pack.svg` | Job pack | purple | navigation |
| `register.svg` | Register | teal | navigation |
| `photo.svg` | Photo | purple | navigation |
| `location.svg` | Location | blue | navigation |
| `schedule.svg` | Schedule | teal | navigation |
| `inspect.svg` | Inspect | blue | action |
| `capture-photo.svg` | Capture photo | purple | action |
| `sign.svg` | Sign | green | action |
| `submit.svg` | Submit | blue | action |
| `export-pdf.svg` | Export PDF | purple | action |
| `comment.svg` | Comment | blue | action |
| `request-changes.svg` | Request changes | orange | action |
| `found-anchor.svg` | Found anchor (new) | purple | action |
| `retry.svg` | Retry | red | action |
| `serviceable.svg` | Serviceable | green | status |
| `defective.svg` | Defective | red | status |
| `not-inspected.svg` | Not inspected | slate | status |
| `further-assessment.svg` | Further assessment | yellow | status |
| `overdue-lease-ending.svg` | Overdue / lease ending | red | status |
| `not-synced.svg` | Not synced | slate | status |
| `sending.svg` | Sending | blue | status |
| `synced.svg` | Synced | green | status |
| `conflict.svg` | Conflict | orange | status |
| `offline.svg` | Offline | yellow | status |
| `changes-requested.svg` | Changes requested | yellow | status |
| `under-review.svg` | Under review | purple | status |
| `removed-from-service.svg` | Removed from service | slate | status |

Notes:

- `sending.svg` and `not-synced.svg` intentionally share the §9 "cloud with up
  arrow" glyph geometry; only the fixed hue differs. They remain separate
  authored sources so review feedback can refine either independently.
- Status meanings are fixed: never reuse a status glyph's colour for anything
  else in the same view, and always pair the icon with a text label
  (DESIGN.md §8/§9).

## Review and regeneration

- Owner review sheet: `contact-sheet.html` (self-contained; tile and free
  variants for every glyph, light and dark themes, plus the source inventory).
- After editing any source, regenerate the derived outputs with
  `tools/design-icons.sh --generate` and commit them together with the source
  change. `tools/design-icons.sh --check` (part of `tools/verify.sh`) fails on
  drift, on missing or extra sources, on rule violations, and on forbidden
  vocabulary under `design/icons/`.
