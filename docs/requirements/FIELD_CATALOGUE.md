# Field Catalogue

Provisional catalogue. Requiredness and terminology need partner validation.
Stage 2A.5 public cut: see
`docs/discovery/STAGE_2A5_FOCUSED_ANCHOR_EVIDENCE.md`.

| Record | Fields |
| --- | --- |
| Company | name, settings, created/updated timestamps |
| User | company, identity, role, active state |
| Client | name, contact details, external reference |
| Site | client, name/address, access notes, site reference |
| Anchor | stable ID, site, label/register ID, location, type, manufacturer/model when known, install context, history/status, notes |
| Job | site, reference, planned date, workflow status, assigned inspector, job-pack version |
| Inspection | job, revision, inspector, started/submitted timestamps, workflow status, submission intent, notes |
| Anchor inspection | anchor or provisional-anchor reference, location/identity confirmation, observations, recorded outcome, exception reason, reconciliation proposal, disposition, notes |
| Photo | private object key, capture time, local ID, anchor-inspection link, upload state, checksum, metadata policy |
| Defect | anchor inspection, recorded description, severity if validated, evidence links |
| Recommendation | anchor inspection, recorded action, owner/due context if validated |
| Review issue/action | inspection/record reference, blocker/warning/conflict/change type, status, reviewer, comment/reason, timestamp |
| Report revision | job, source inspection revision, template version, file, creator/reviewer, created time |

Conditional until partner validation: measurements, equipment references,
signatures, recorded inspection frequency / last / next-due, optional
proof-test evidence (load, hold, result, reference, photos), replacement
links, history references and import provenance. Never infer a compliance
result from any field.

## AS/NZS 1891.4:2025 integration candidates

These fields are derived from the supplied screenshot sequence and remain
**deferred candidates**, not MVP requirements, until Stage 2B+ partner and
qualified review decide otherwise:

| Record | Additional candidate fields |
| --- | --- |
| Job / task | work-area access, fall-hazard access prevention, movement constraints, tools/equipment interactions, selected fall-protection system, selection rationale, task/environment hazards, dropped-object controls, fragile-surface controls, movable-platform state |
| Fall-protection selection | system type: total restraint, restrained fall, limited free fall, free fall, restraint technique; hierarchy position; alternative considered; jurisdictional control notes |
| System configuration | anchor/anchorage type, connecting-system type, harness type, minimum rating basis, configuration evidence, maximum permitted fall check, free-fall class, work-positioning safeguard |
| Anchor inspection | anchor vs anchorage distinction, anchor type (single-point/HLL/HRS/diversion), accessibility, identification/marking, location, observed condition, evidence, anchorage-capacity basis, professional-engineer certificate reference, transition safety, connector-count check |
| Clearance assessment | anchor-to-impact distance, fall clearance inputs, swing-fall considerations, fall-distance result, fragile-surface fall distance, deflection/contact hazard, assumptions, reviewer |
| Equipment / use | product instructions reference, permanent marking check, before-use result, after-use result, failed-equipment quarantine, fall-arrest-event disposition |
| Rescue plan | equipment list, external-help process, all-site-location coverage, competent rescuers, first aid, target rescue time, suspension-trauma controls, self-rescue/pre-rigged option |
| Training / competency | task training required, all-system-component training, worker competency evidence, supervision/training notes, unresolved competency gap |

## AS 5532:2025 integration candidates

These fields represent product/manufacturing evidence from the supplied
screenshots. They are deferred from MVP site-inspection scope. They do not
replace site assessment or AS/NZS 1891.4 inspection.

| Record | Additional candidate fields |
| --- | --- |
| Anchor / product evidence | dated standard reference, manufacturer/supplier, model, batch/serial number, fixed/portable class, device type, attachment point, permitted load directions, marked rating, permitted person count, limited/free-fall rating, product-instruction version, personnel-only marking |
| Anchor test evidence | specimen, procedure/clause, test date, apparatus, force-measurement method/sample rate, static force, hold time, dynamic mass/drop height/peak load, suspension result, function-test result, SRL bracket/extension-cable details, roof structure, deviations, unusual observations |
| Product instructions | installation/use instructions, limitations, temperature range, product life, corrosion warning, connecting-equipment restrictions, alteration warning, AS/NZS 1891.4 references, traceability/inspection/removal-from-service directions |
| Product design review | thread engagement, through-anchor back-plate, inspection access, material compatibility, feature radius, threaded-component bending/shear observations |

Store source clause, screenshot sequence, assessor, assumptions and review
status for every AS 5532 evidence item. Never infer compliance from a field.

Do not calculate or label an outcome as compliant from these fields alone.
Store source clause, source screenshot sequence, assessor, assumptions and
review status for every rule-backed decision.
