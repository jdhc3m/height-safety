# Icon source convention

One SVG file per glyph under `design/icons/`. `tools/design-icons/generate.mjs`
turns these sources into `HeightSafetyIcons` ImageVectors for the Android field
app; `tools/design-icons.sh --check` fails when the generated Kotlin drifts.

The glyph list, colour assignments and rendering rules come from
`design/DESIGN.md` §9; palette hexes come from `design/tokens.json` (single
source, read at generation time). This ticket (design-system T2, issue #35)
covers the 11 core glyphs for the first redesigned Android screens; remaining
action/proposal icons are added here incrementally by the screen tickets that
use them.

## File format

- `viewBox="0 0 24 24"`. Author inside the 2px keyline: keep ink inside the
  2..22 live area.
- Root attributes `data-name` (display name, exactly as listed in DESIGN.md §9)
  and `data-colour` (one of `blue`, `teal`, `orange`, `green`, `purple`, `red`,
  `slate`, `yellow`).
- Rounded outer corners on shapes; flat (butt) stroke caps; round stroke joins.
  No shadows, outlines, gradients or nested containers.
- Path roles via `data-role`:
  - `base` — main glyph shape. Free glyph: hue base tone. Tile glyph: white.
  - `detail` — secondary/depth shape. Free glyph: hue bold tone. Tile glyph:
    white.
  - `mark` — interior accent that must stay light against the body (for
    example the inbox tick). Free glyph: white. Tile glyph: the tile colour.
  - Filled `base`/`detail` paths always use even-odd fill: extra subpaths
    inside the outline punch holes (transparent in free glyphs, tile colour in
    tile glyphs). Keep subpaths non-overlapping within one element.
  - Stroked paths use `fill="none"`, a `data-role`, an explicit
    `stroke-width`, `stroke-linecap="butt"` and `stroke-linejoin="round"`.

## Variants

- **Tile** (generated): solid rounded square, radius 25% of the rendered size,
  glyph painted white; holes and marks show the tile colour. Sizes
  20 / 24 / 32 / 40 / 48.
- **Free glyph** (generated): the glyph filled in the tile hue, two tones
  allowed (base body + bold detail for depth), marks white, holes transparent.
  Sizes 16 / 20 / 24.

Tile colours and the two glyph tones are fixed hue tokens, identical in light
and dark themes ("tile colours unchanged"); the imported mockup sheets
(`design/icons-light.png`, `design/icons-dark.png`) show the intended
rendering. Dark-theme single-tone glyphs use the base (lighter) shade.

## Review

`apps/android/app/src/test/screenshots/height_safety_icons_light.png` and
`..._dark.png` are the Roborazzi contact sheets for owner review of the
authored set; `tools/android-theme.sh --check` gates them.
