# Assumptions to Validate

Every row is a hypothesis, not a compliance requirement. Stage 2A.5 public
evidence updates are recorded in Decision/correction; partner validation remains
required where Status is not Accepted.

| ID | Assumption / current hypothesis | Evidence | Confidence | Product impact | Validation method | Status | Decision/correction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-001 | Register needs stable ID, location, type, manufacturer/model, install context and notes. | Public templates + WHSQ site-doc themes (S-002, S-009); no partner register yet. | Medium | Schema/import | Review partner registers/reports | Partially supported | Stage 2A.5: keep as MVP register core; install/engineer docs optional recorded refs. |
| A-002 | Existing tags/register plus location identify anchors; new anchors need provisional identity. | Industry tag/sign practice (S-007, S-009); unverified operationally. | Low–Medium | Reconciliation | Observe jobs | Open | Stage 2A.5: retain newly discovered / unlabelled exception states. |
| A-003 | Single-point anchors cover pilot asset mix without universal manufacturer logic. | Founder scope + manufacturer variation confirms product-specific checks (S-003, S-004). | Medium | Scope/content | Sample partner assets/manuals | Open | Do not add HLL/cable to MVP. |
| A-004 | Required photographs vary by anchor condition and partner checklist; identity, overall, label/tag and defect shots are common. | WHSQ mentions test photos (S-002); templates emphasise anchor/mount/label/defect (S-009, S-010). | Medium | Form/report | Compare partner checklists | Partially supported | Record association mandatory; shot list not hard-coded yet. |
| A-005 | Serviceable, defective, inaccessible, unable to locate and further assessment required are usable outcomes. | Industry uses pass/fail/certified; MVP neutral vocabulary still provisional. | Low | UX/report | Terminology walkthrough | Open | Avoid compliant/certified labels in product. |
| A-006 | Defect severity can start as recorded text or small list. | Templates use risk rating language; no partner corpus. | Low | Review | Inspect defect language | Open | — |
| A-007 | Recommendations are recorded actions, not generated remediation decisions. | Product safety posture. | Medium | Safety wording | Review examples | Open | Reconfirmed Stage 2A.5. |
| A-008 | Inspection frequency is recorded context, not calculated by product. | Public 12-month single-point framing, dated NSW guidance and QLD component/anchorage distinctions require interpretation (S-011–S-013, S-016–S-019). | High | Schema | Ask due-date process in both states | Partially supported | Do not encode interval automation for NSW or QLD. |
| A-009 | Manufacturer variation can remain notes/references initially. | SafetyLink vs insert-anchor proof-test differences (S-003, S-002, S-005). | Medium | Scope | Compare products | Partially supported | Product-specific checklists later. |
| A-010 | Measurements, test equipment and proof-load details may be useful but not MVP-required gates. | Proof test common for inserts; multi-fastener/metal-roof paths often visual/docs (S-002, S-005, S-006). | Medium | Fields | Inspect records/tools | Partially supported | Optional recorded proof-test fields only. |
| A-011 | Submission/declaration wording must avoid certification claims. | Commercial templates use certification language (S-007, S-009). | High | UX/report | Partner/legal review | Partially supported | Reconfirmed; draft disclaimer retained. |
| A-012 | Reviewer checks completeness, conflicts and changes; approval authority varies. | Provisional workflow; public sources emphasise written records and competent person. | Low | Review | Observe office review | Open | — |
| A-013 | Draft report needs stable structure and visible disclaimer. | Provisional report spec + authority risk from template wording. | Medium | PDF | Review sample reports | Open | — |
| A-014 | Signatures may be partner-specific and must not be implied. | Templates include certifier signature; no partner policy. | Low | Report | Ask partner/legal review | Open | — |
| A-015 | Missing, replaced and newly discovered anchors need explicit states. | Out-of-service tagging and undocumented-anchor risk (S-002, S-006). | Medium–High | History | Walk exception cases | Partially supported | Keep exception outcomes in MVP. |
| A-016 | Previous history is useful at anchor level with source revision links. | Register/history repeatedly required (S-002, S-006, S-009). | Medium | History | Test historical reports | Partially supported | — |
| A-017 | Remediation tracking is outside first workflow except simple recommendation state. | Scope boundary. | Medium | Scope | Validate pilot success | Open | — |
| A-018 | One disconnected visit is representative offline duration. | Unmeasured; public sources silent. | Low | Local storage | Measure sites/devices | Open | Owner accepted a 24-hour prototype lease (D-025); partner measurement still required before G-05. |
| A-019 | Typical photo volume suits background upload. | Unmeasured. | Low | Storage/UX | Sample jobs | Open | — |
| A-020 | CSV/structured import/export is sufficient first register migration. | Provisional. | Low | Onboarding | Test partner files | Open | — |
| A-021 | Exports need register, evidence and draft-report references. | Aligns with public documentation themes; unvalidated with partner. | Low–Medium | Export | Ask partner | Open | — |
| A-022 | One neutral evidence workflow can support NSW and Queensland when jurisdiction is explicit and legal rules are not automated. | Both use model-WHS concepts and regulator guidance shares identity, inspection, defect and record themes; local differences remain (S-015–S-019). | Medium | Scope/data/report | Validate with practitioners operating in each state | Partially supported | Owner approved dual-state prototype direction; jurisdiction-specific rules remain deferred. |

Partner interviews remain required using `INSPECTOR_QUESTIONS.md`. Public
evidence does not close Status to Accepted without operational confirmation.
