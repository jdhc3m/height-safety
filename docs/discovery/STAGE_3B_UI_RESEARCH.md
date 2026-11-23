# Stage 3B UI research: field safety inspection apps and Material 3

Date: 2026-09-02

Status: design input only. This note does not change product scope or approve
any jurisdiction-specific rule, compliance conclusion or professional
authority.

## Research question

What interaction and visual patterns should inform a field-first Android flow
for installed single-point roof-anchor inspections in NSW and Queensland?

The repository product remains narrower than the products reviewed here:
one neutral evidence workflow, explicit NSW/QLD context, local-first capture,
visible synchronisation and draft report generation. Vendor claims below are
evidence about advertised product patterns, not validation that those products
are suitable for this product or that the patterns work for our inspectors.

## First-party product evidence

| Product | Evidence class | Relevant advertised pattern | Confidence |
| --- | --- | --- | --- |
| SafetyCulture | First-party product page and training guide | Mobile inspections; offline work; photos/video; actions; asset history; manual sync and recovery steps | Medium: product/vendor evidence, not partner usability evidence |
| Inspectivity Go | First-party product pages and product help | Online/offline inspections; searchable asset, inspection, issue and media registers; photo/video capture; annotations; structured templates | Medium: product/vendor evidence, not partner usability evidence |
| HammerTech | First-party product page | Mobile-first jobsite workflows; daily logs; safety observations; permits; central visibility for field and office | Medium: product/vendor evidence, not partner usability evidence |
| Fieldwire by Hilti | First-party product page | Pre-loaded inspection checklists; issue reporting; photos; safety concerns from mobile; report distribution | Medium: product/vendor evidence, not partner usability evidence |
| Procore | First-party product page and field guide | Inspections from any device; real-time capture; inspection templates; safety forms; issue tracking | Medium: product/vendor evidence, not partner usability evidence |

Sources:

- [SafetyCulture mobile product overview](https://safetyculture.com/text-me-the-app/)
- [SafetyCulture Frontline User Training Guide](https://assets.ctfassets.net/wum34wy9buzj/2JsRvVzB5bv6GZtCWiy8eg/bb5d1f9e34e4adc83ee3de05686807a1/SafetyCulture___Frontline_User_Training_Guide.pdf)
- [Inspectivity inspection management](https://inspectivity.com/)
- [Inspectivity field data capture](https://inspectivity.com/solutions/use-cases/data-capture/)
- [Inspectivity Go offline inspection help](https://inspectivity.atlassian.net/wiki/spaces/IKB/pages/3019833345/Go%2BCreate%2BInspections)
- [HammerTech construction safety software](https://www.hammertech.com/en-us/)
- [Fieldwire construction inspection software](https://www.fieldwire.com/building-inspection-app/)
- [Procore construction site inspections](https://www.procore.com/quality-safety/inspections)

## Material 3 evidence

Official Android guidance identifies three core Material 3 theme systems:
color scheme, typography and shapes. Compose components consume those theme
roles, so the proposed design should define a small product token set rather
than styling each screen independently.

Official accessibility guidance says interactive elements should have a
minimum 48dp touch target. Official Material guidance also covers adaptive
layouts and large-screen navigation; this matters when the field flow runs on
a tablet or foldable rather than only a phone.

Sources:

- [Material 3 in Jetpack Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Material 3 theming codelab](https://developer.android.com/codelabs/jetpack-compose-theming)
- [Compose accessibility API defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults)

## Design implications

The following are design inferences from the product evidence, Material 3
guidance and the repository requirements. They are proposals, not validated
partner facts.

1. Put job/site context before task controls. A field user should see job
   reference, site, recorded NSW/QLD context, pack version and synchronisation
   state before opening an anchor.
2. Make one primary action obvious per screen. Use large touch targets and
   avoid competing actions beside the capture control.
3. Treat offline state as a persistent status, not a toast. Show whether work
   is saved locally, pending synchronisation, synchronised, failed or in
   conflict.
4. Keep the expected anchor register visible. The user needs progress and
   coverage context, not an unstructured checklist.
5. Keep evidence association explicit. Photos, notes, defects and
   recommendations belong to the selected anchor inspection; the UI should
   show that relationship.
6. Use neutral recorded-outcome language. Display `Recorded outcome`, not a
   derived compliance verdict. Preserve `Further assessment required` and
   `Not inspected` as distinct states.
7. Use attention colours sparingly. Amber can draw attention to review or
   incomplete evidence; red should be reserved for a real blocker or failure.
   Colour must not be the only state signal.
8. Use cards as information containers, not as decoration. Strong hierarchy,
   restrained elevation and consistent 12/16/24dp shape levels should make
   dense field data scannable.
9. Design the phone flow first, then reflow it for larger windows. A tablet
   can expose the anchor list and selected anchor detail together without
   changing field rules.

## Three design iterations

### Iteration 1 — repair structure

Remove the current screen-in-screen gallery problem. Use separate phone-sized
frames, a single clear header, compact job cards and one primary action. This
is better than the current prototype because the user can identify where one
screen ends, what action is next and what data is authoritative.

### Iteration 2 — field-first context

Add a persistent sync banner, job-pack metadata, anchor coverage progress and
explicit evidence counts. Move from a generic list to a field work queue. This
is better than Iteration 1 because it answers the field user's immediate
questions: which job, which pack, what remains, and whether work is safe to
leave on the device.

### Iteration 3 — Material 3 and evidence integrity

Use Material 3 semantic colour roles, type scale, shape scale and 48dp
interaction targets. Add explicit recorded-outcome labels, anchor-scoped
evidence and a review gate before submission. This is better than Iteration 2
because it combines visual consistency with the product's evidence and
offline rules, while avoiding any automatic compliance or certification
claim.

## Open validation questions

These remain design-partner questions, not assumptions to silently promote:

- Which labels and outcome words are natural for NSW and Queensland inspectors?
- Which photos are mandatory, and what is an acceptable no-photo reason?
- What information must remain visible while an inspector is on a roof?
- Is anchor progress best shown as a count, a register list, or both?
- What offline/sync wording is understood without training?
- Which tablet or foldable layouts are needed for the first partner?

## Brilliant constraint

Brilliant's official MCP page says its current canvas is editable but static;
interactive prototyping is on its roadmap. Its Codex setup also requires the
desktop app to be open and the Codex session to be restarted after connection.
At initial preparation, no running local Brilliant server or installed desktop
app was available. On 2026-09-02 the desktop bridge was found running and the
native canvas `Height Safety/3B UI Exploration` was created and visually
checked in Brilliant.

Sources:

- [Brilliant MCP design tool](https://brilliant.design/mcp)
- [Brilliant: connect Codex](https://brilliant.design/docs/agents/codex)
- [Brilliant Blueprint specification](https://github.com/brilliant-hq/blueprint)

The repository companion artifacts contain:

- an authored `.bl` storyboard for import/opening in Brilliant; and
- a separate dependency-free HTML flow for click simulation.

The live Brilliant canvas is a visual review board only. Use the HTML
companion for click simulation until Brilliant adds interactive prototyping.
