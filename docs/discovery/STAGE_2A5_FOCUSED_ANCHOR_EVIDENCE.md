# Stage 2A.5 Focused Anchor Evidence

Status: **public-evidence pass complete** (2026-08-04). This closes Stage
2A.5 for repository research. It does **not** replace design-partner
observation, licensed Standard review, or legal/professional advice.

Scope boundary: Queensland installed **single-point roof anchors** only. Cable
systems, HLL/HRS, ladders, guardrails and PPE recertification remain out of
MVP scope (`docs/product/NON_GOALS.md`).

Authority language: findings describe common recorded evidence and workflow
risks. They do **not** authorise automatic compliance, certification, or
standards conclusions in the product.

Source register: [`sources/STAGE_2A5_SOURCE_REGISTER.md`](sources/STAGE_2A5_SOURCE_REGISTER.md).

## Method

1. Inspected current assumptions, field catalogue, workflows, report
   requirements and architecture.
2. Hard-searched public Australian/Queensland regulator, manufacturer,
   industry and template sources (see source register).
3. Mapped findings to `INSPECTOR_QUESTIONS.md` and `ASSUMPTIONS_TO_VALIDATE.md`.
4. Produced an MVP field cut that **defers** standards-derived candidates
   outside the single-point roof-anchor workflow.

## Answers to inspector questions (public evidence only)

| Q | Public finding | Confidence | Still needs partner |
| --- | --- | --- | --- |
| 1–2 Order / office vs field | Typical sequence: obtain register and prior records → site access → identify each anchor → visual/tactile checks → optional proof test where required by product/substrate → tag/update → written record → office review/issue. | Medium | Exact role split and review gates |
| 3 Missing / inaccessible / damaged / unlabelled / replaced | Defective or degraded anchors are marked unsafe and prevented from use; failed items need danger tagging / physical out-of-service control; undocumented anchors are a common risk; newly found and replaced anchors need explicit register states. | Medium | Partner exception vocabulary and photos |
| 4 Product variation | Checks vary by product and substrate (metal roof plate vs chemical/friction insert). Manufacturer instructions drive waterproofing, rigidity, fall indicators and proof-test need. | Medium | Representative device shortlist |
| 5 Outcome words | Industry templates use pass/fail/compliant/certified. MVP must keep neutral recorded outcomes and avoid implying certification. | High for risk | Partner glossary walkthrough |
| 6 Who may inspect / review / issue | Periodic inspection requires a competent person. QLD practice commonly also claims QBCC licence and manufacturer authorisation for “certify/inspect”; WHSQ says QBCC depends on scale/value and to consult QBCC. Product must not decide competence. | Low–Medium | Partner credentials and approval RACI |
| 7 Evidence later | Register + inspection history + proof-test evidence + photos/diagrams + competent-person identity are repeatedly required for defensibility. | Medium | Retention and export policy |
| 8 Offline | Public sources do not measure field connectivity. | Low | Site/device measurement |
| 9 Common omissions | Missing install docs, illegible tags, incomplete registers, no photos of tests, treating visual-only as sufficient when proof test is required. | Medium | Partner omission ranking |
| 10 Adoption | Speed of complete register-backed job, photo association, and draft report without silent loss. | Low | Partner success metrics |

## Evidence themes for MVP (keep narrow)

### Register identity

Public guidance and templates consistently expect a durable per-anchor
identity with location, type, manufacturer/model when known, install context
where available, and history of inspections/outcomes. WHSQ building-maintenance
guidance also expects intended function, installer identity, certifying
engineer details where applicable, and 12-monthly inspection/test evidence
including photographs for the insert-anchor cases it covers.

**MVP impact:** keep provisional register fields in `FIELD_CATALOGUE.md`. Do
not require full engineering Form 15 workflows in the prototype.

### Visual / condition checks

Manufacturer and template sources repeatedly list corrosion/pitting,
deformation, fixing condition, waterproofing/seal, label/tag legibility,
parent structure/substrate condition, and fall-indicator activation.

**MVP impact:** capture as observations, defects, notes and photographs—not as
an automated pass engine.

### Photographs

WHSQ guidance explicitly mentions photographs as evidence of test loading.
Templates emphasise close-ups of the anchor, mounting interface, label/tag and
any defect, plus location context.

**MVP impact:** require durable photo-to-anchor association. Exact mandatory
shot list remains partner-validated (A-004).

### Intervals and due dates

Public consensus for permanently installed single-point anchors under
AS/NZS 1891.4 framing is periodic competent-person inspection at intervals
**not exceeding 12 months**, with shorter intervals in harsh environments.
QLD WHS Regulation s306I is widely cited as requiring 6-monthly competent
inspection of fall-arrest harness **system components other than each
anchorage point**; industry sources disagree on whether single-point roof
anchors themselves must follow 6 or 12 months. Cable/static-line systems are
widely treated as 6-monthly in QLD and remain out of MVP scope.

**MVP impact:** record stated interval, last inspection and next-due as
human-entered context. Do not calculate compliance from regulation text.

### Proof testing

Proof loading appears for post-installed friction/chemical anchors at
installation and, historically, at periodic inspection (WHSQ guide citing
2009 Standard: axial ~50% design load; often cited as 7.5 kN for fall-arrest
inserts). 2025 industry commentary states multi-fastener anchors may avoid
repeat annual pull tests when specific installation/calculation/warranty/
install-proof documentation is available; single-fixing types still need
periodic pull testing. Metal roof multi-fastener products often rely on
manufacturer visual/recertification procedures rather than insert pull tests.

**MVP impact:** optional recorded proof-test fields (load, hold, result,
equipment/reference, photos). Not an automatic tester or compliance engine.

### Tags, signage and out-of-service

Industry practice expects per-anchor inspection tags (rating, next due) and
entry signage for systems. Failed or shock-loaded equipment must be removed
from service and physically controlled—not only noted in software.

**MVP impact:** record tag/sign observations and removed-from-service /
further-assessment outcomes. Physical lock-out remains organisational.

### Authority boundary (confirmed for product)

“Certification”, “compliant”, “pass for 12 months” and similar labels are
common commercially. This product records evidence and organisational draft
reports only. Competence, QBCC licensing, engineer approval and client
issuance stay outside the system’s automatic behaviour.

## MVP field cut (no scope expansion)

| Bucket | Items | Stage treatment |
| --- | --- | --- |
| Keep for MVP | Client/site; anchor stable ID, label/register ID, location, type, manufacturer/model when known, install context/notes, status/history link; job/assignment; observations; photographs; defects; recommendations; provisional outcomes (including inaccessible, unable to locate, newly discovered, replaced, removed from service, further assessment required); review actions; draft report revision; optional recorded interval/last/next-due; optional recorded proof-test evidence when performed | Stage 2B workflow/spec and later implementation |
| Later (partner/legal) | Severity taxonomies; signatures; mandatory shot list; import formats; retention schedule; competency/licence fields as recorded credentials only | After partner evidence |
| Never for MVP / defer | HLL/cable/rail asset families; rescue-plan and training registers as required gates; clearance/free-fall calculation engines; AS 5532 manufacturing/lab workflows as site inspection; automatic interval exceptions; standards rules engine; pass/fail compliance labelling | Remain candidates in standards docs only |

AS/NZS 1891.4 and AS 5532 candidate fields already listed in
`FIELD_CATALOGUE.md` stay **candidates**, not MVP requirements.

## Assumption outcomes from this pass

See updated rows in `ASSUMPTIONS_TO_VALIDATE.md`. Summary:

- Strengthened (still not partner-closed): A-001, A-004 direction, A-008,
  A-010, A-015, A-016.
- Unchanged / still open: A-018–A-021 (connectivity, photo volume, imports,
  exports) and partner terminology A-005, A-012, A-014.
- Product safety posture reconfirmed: A-007, A-011.

## Exit criteria for Stage 2A.5

| Criterion | Result |
| --- | --- |
| Focused public evidence gathered and sourced | Met |
| Assumptions updated with evidence class/confidence | Met |
| MVP field cut without scope expansion | Met |
| Practitioner/design-partner validation | **Not met** — remains Stage 4 / parallel discovery |
| Licensed Standard clause-level validation | **Not met** — remains blocker for any compliance wording |

Stage 2A.5 is therefore **complete for public research** and hands off to
Stage 2B workflow specification using the keep-bucket above, with partner
validation tracked as an open risk rather than a silent requirement.

## Next stage input

Stage 2B should specify:

1. Anchor-first job workflow and exception states from the keep-bucket.
2. Neutral outcome and draft-report wording (no certification claims).
3. Review completeness rules (missing photos/uploads/conflicts visible).
4. Explicit open questions reserved for the first design partner.
