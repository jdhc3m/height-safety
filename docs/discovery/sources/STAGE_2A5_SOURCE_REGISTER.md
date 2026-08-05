# Stage 2A.5 Source Register

Access date: S-001–S-014 on 2026-08-04; S-015–S-019 on 2026-08-05. Sources are
public secondary material unless marked otherwise. None replace a
design-partner corpus, licensed Standard text, or legal advice.

| ID | Source | Type | Applicability | Evidence class | Confidence | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| S-001 | Work Health and Safety Regulation 2011 (Qld) s306I summaries via AustLII/classic mirrors and industry citations | Regulation (secondary text) | Queensland fall-arrest harness systems | Secondary legal text | Medium | Direct fetch of legislation.qld.gov.au and AustLII was blocked/timed out; wording corroborated across multiple secondary copies. Anchorage capacity bands and 6-month inspection of system components *other than* each anchorage point are repeatedly cited. |
| S-002 | Workplace Health and Safety Queensland, *Anchors for building maintenance* (PN12492, 2019) | Regulator guide | Post-installed masonry anchors for building maintenance in QLD | Primary public guidance | High | PDF from worksafe.qld.gov.au. Covers proof testing, site documentation, marking, competent-person inspections, QBCC note. References AS/NZS 1891.4:2009; edition supersession must be tracked. |
| S-003 | SafetyLink *Anchors Handbook* (public PDF) | Manufacturer instructions | SafetyLink single-point roof anchors | Manufacturer public | Medium–High | 12-month competent-person inspection; visual corrosion/deterioration; rigidity; waterproofing; parent structure; fall-indicator expansion; chemical-anchor proof load at install and recertification. Product-specific. |
| S-004 | GMAC Safety 3 Sixty top-mount anchor brochure | Manufacturer marketing + claims | One metal/timber roof top-mount product | Manufacturer marketing | Low–Medium | States 12-month inspection/certification by competent person per AS/NZS 1891.4:2009 and AS/NZS 5532:2013. Not a full inspection procedure. |
| S-005 | Height Safety Engineers, “What do the 2025 fall protection standards mean for you?” (2025-09-12) | Industry commentary | AS/NZS 1891.4:2025 and AS 5532:2025 transition | Secondary industry | Medium | Author sits on standards committee per article. Useful for multi-fastener proof-test documentation exception and annual installed-device inspections. Not licensed Standard text. |
| S-006 | Anchor Testing Australia blog on AS/NZS 1891.4:2025 inspection | Vendor technical blog | Installed fall-arrest anchors (national framing) | Secondary vendor | Medium | Register contents, pre-use vs periodic vs proof test distinction, harsh-environment shorter intervals, out-of-service physical control. Commercial interest. |
| S-007 | Safe At Heights, inspection and certification article | Vendor article | Queensland practice claims | Secondary vendor | Low–Medium | Claims QBCC licence + manufacturer authorisation + insurance for QLD certify/inspect. Aligns partially with WHSQ “consult QBCC” caution; licence class not independently verified here. |
| S-008 | Height Dynamics, becoming a height safety installer | Vendor article | QLD QBCC for install/inspect/recertify | Secondary vendor | Low–Medium | Claims QBCC required; lists example licence classes. Not QBCC primary guidance. |
| S-009 | MapTrack free “anchor point annual certification” template page | Public template marketing | Commercial form fields | Secondary template | Low–Medium | Useful field inventory (register, visual, load test, defects, next due, certifier). Uses pass/fail/compliant language the MVP must avoid. |
| S-010 | MangoApps rooftop fall-protection annual inspection templates | Public template | International/general HVAC rooftop anchors | Secondary template | Low | Photo guidance (anchor, mount, label, defect) and identity/condition/disposition pattern. Not Australia-specific. |
| S-011 | Australian Height Safety / Workplace Access articles on QLD inspection frequency | Vendor opinion | QLD 306I vs 306G interpretation | Secondary opinion | Low | Conflicting claims that QLD requires 6-monthly roof-anchor inspection. Treat as unresolved interpretation risk, not product rule. |
| S-012 | WAHA / LinkedIn summary of WorkSafe QLD clarifications (Alistair Merricks post) | Industry summary of regulator answers | QLD static-line vs end-anchor frequency | Secondary rumour | Low | Claims PPE/static-line components 6-monthly; end anchors yearly; differs from AS 1891.4. Needs direct WorkSafe QLD confirmation. |
| S-013 | Repository standards integrations | Internal screenshot reviews | AS/NZS 1891.4:2025 and AS 5532:2025 | Internal provisional | Medium | `docs/standards/AS-NZS-1891.4-2025-INTEGRATION.md`, `docs/standards/AS-5532-2025-INTEGRATION.md`. Not licensed text. |
| S-014 | Existing product/requirements docs | Internal | MVP scope and non-goals | Product decisions | High for scope | `CURRENT_SCOPE`, `NON_GOALS`, `FIELD_CATALOGUE`, `ANCHOR_MVP_REQUIREMENTS`. |
| S-015 | [Safe Work Australia, *Model WHS laws*](https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws) | National policy authority | NSW/Queensland jurisdiction framing | Primary public authority | High | Confirms both states use the model-WHS framework and that jurisdictions may make local variations. Does not resolve anchor-specific differences. |
| S-016 | [Queensland, *Work Health and Safety Regulation 2011*, s306I](https://www.legislation.qld.gov.au/view/whole/html/inforce/2025-02-25/sl-2011-0240) | In-force regulation | Queensland construction work using fall-arrest harness systems | Primary legislation | High | Direct Queensland legislation accessed. Contains anchorage design/first-use approval/capacity and impaired-anchor controls; six-month written-record rule excludes each anchorage point. Applicability requires professional interpretation. |
| S-017 | [NSW, *Work Health and Safety Regulation 2025*, ss78–80](https://legislation.nsw.gov.au/view/whole/html/inforce/current/sl-2025-0440/lh) | In-force regulation | NSW workplace fall risks and fall-arrest systems | Primary legislation | High | Current regulation sets hierarchy, adequate protection and rescue duties. It does not itself define the complete periodic single-point-anchor inspection workflow. |
| S-018 | [SafeWork NSW, *Managing the risk of falls at workplaces* Code of Practice](https://www.safework.nsw.gov.au/__data/assets/pdf_file/0018/50076/Managing-the-risk-of-falls-at-workplaces-COP.pdf) | Regulator code | NSW fall controls and inspection programs | Primary public guidance | High | Calls for unique identification, inspection frequency/type, defect action, records and manufacturer requirements; anchorages tested/approved by a competent person before use and components inspected regularly. Public text still cites AS/NZS 1891.4:2009. |
| S-019 | [SafeWork NSW, *Fall arrest anchors* fact sheet (updated 2019)](https://www.safework.nsw.gov.au/resource-library/construction/fall-arrest-anchors) | Regulator fact sheet | NSW installed single-point anchors | Primary public guidance, dated | Medium | Supports AS/NZS 1891.4-based inspection programs and distinguishes AS/NZS 5532 manufacturing scope, but cites the repealed 2017 Regulation and older Standards. Use as a lead, not a current automatic rule. |

## Search coverage notes

Searched for Queensland WHS roof-anchor inspection, AS/NZS 1891.4 periodic
inspection, Safe Work Australia / WorkSafe QLD guides, manufacturer checklists,
public report templates, QBCC licensing, and 2025 standards updates. Primary
legislation HTML fetches were unreliable; WHSQ PDF and manufacturer handbook
fetched successfully. No anonymised partner registers, photographs, or reports
were obtained.

The 2026-08-05 scope-extension pass compared current NSW/Queensland legislation,
falls codes and regulator anchor guidance. It supports a shared neutral evidence
workflow, not state-specific compliance automation. NSW inspection authority/
licensing and current 2025 Standards application remain professionally
unvalidated.
