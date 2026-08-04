# Claim Verification Register — Technical-Lead Evaluation

This register converts externally checkable claims from the supplied evaluation into research tasks.

| Field | Value |
| --- | --- |
| Created | 2026-08-03 |
| Last verification pass | 2026-08-04 |
| Verifier | AI-assisted open-source verification; requires project-owner confirmation |
| Sources used | Publicly accessible primary and official publications only |
| Not used | Licensed Standards Australia texts, manufacturer manuals, legal advice |

A `Verified` status means the cited source says what the claim says. It does **not** mean the claim is a requirement for this product. The verification rule at the foot of this file still applies.

## Verification status

| Claim ID | Claim to verify | Status | Verification note |
| --- | --- | --- | --- |
| C-001 | Safe Work Australia guidance addresses equipment identification, inspection regimes, defect action, records and manufacturer instructions. | **Verified** | The model Code of Practice *Managing the risk of falls at workplaces* states the inspection regime should detail the equipment to be inspected including its unique identification, the frequency and type of inspection, action on finding defective equipment, means of recording inspections, training of users and a system of monitoring the regime. It also states the manufacturer or supplier should be consulted for product-specific requirements and that defective equipment must be withdrawn from use. [S1] |
| C-002 | Model WHS guidance has different legal effect across Australian jurisdictions. | **Verified** | The model laws are not law in themselves; each jurisdiction enacts its own Act, regulations and codes. The model Code itself instructs readers to check with their regulator whether it has legal effect in their jurisdiction. [S1][S2] |
| C-003 | Victoria operates under a materially different occupational health and safety framework. | **Verified** | Victoria is the only jurisdiction that has not implemented the model WHS laws and continues under the Occupational Health and Safety Act 2004 (Vic), administered by WorkSafe Victoria. Note that the Victorian OHS Regulations expire in April 2027 and are under review. [S2][S3] |
| C-004 | AS 5532 and AS/NZS 1891.4 had new editions published on 19 September 2025. | **Verified** | Both were published 19/09/2025. AS/NZS 1891.4:2025 supersedes AS/NZS 1891.4:2009 (Amd 1:2021) and is retitled *Personal equipment for work at height, Part 4: Selection, use and maintenance*. AS 5532:2025 supersedes AS/NZS 5532:2013 and was redesignated from AS/NZS to AS. The evaluation used the superseded title for 1891.4. [S4][S5][S6] |
| C-005 | Detailed software rules cannot be derived safely from standards titles or summaries. | **Open — method claim** | Not falsifiable from public sources, and supported by observation: publicly reported changes (rating tiers, revised test procedures, altered proof-testing conditions) are clause-level detail absent from official summaries. Licensed texts remain unread. |
| C-006 | Manufacturer instructions can add product-specific inspection or maintenance requirements. | **Partly verified** | The model Code directs consultation of the manufacturer or supplier for product-specific requirements. [S1] No actual manufacturer manual has been obtained, so the size and nature of the additional requirements remain unknown. |
| C-007 | Photographs, location data or related metadata may be personal information. | **Unverified** | Not re-checked against OAIC guidance in this pass. Applicability depends first on C-008/C-009. |
| C-008 | APP 8 may affect overseas disclosure and subprocessors. | **Conditional — applicability is the prior question** | The Privacy Act small business exemption (s 6D, turnover of $3 million or less) remains in force as at mid-2026. Its general removal is a stated government direction with no Bill and no commencement date. Exemptions that never applied include health service providers, credit providers and Commonwealth contractors; from 1 July 2026 AML/CTF reporting entities also lost it for AML-related handling. A statutory tort for serious invasions of privacy applies irrespective of turnover. [S7][S8] |
| C-009 | APP 11 may require security, destruction or de-identification controls. | **Conditional** | Same applicability threshold as C-008. Obligations are more likely to arrive first through customer contracts and procurement than through direct statutory coverage of a pre-revenue vendor. [S7] |
| C-010 | ASD released relevant software-development guidance in June 2026. | **Verified** | ASD's ISM *Guidelines for software development* was first published and last updated 09 June 2026. New controls include ISM-2120 (secure software development policy developed, implemented and maintained) and ISM-2121 (developers lacking sufficient cyber security knowledge and skills for their project or task should not be used). Guidance now expressly covers AI-assisted development. [S9] |
| C-011 | NIST SSDF 1.1 is final and SSDF 1.2 is draft. | **Verified** | SP 800-218 (SSDF 1.1) Final, released 03/02/2022. SP 800-218 Rev. 1 (SSDF 1.2) remains at Initial Public Draft, released 17/12/2025, comment period closed 30/01/2026, still listed as Draft as at August 2026. [S10] |
| C-012 | Weakly connected systems require explicit conflict handling and only suitable operations can merge automatically. | **Supported by established literature** | Bayou (Terry et al., 1995) and CRDT work (Shapiro et al., 2011) are correctly characterised. Applicability to this product's specific operations is not established. |
| C-013 | OpenTelemetry defines traces, metrics and logs as complementary telemetry signals. | **Supported** | Consistent with the OpenTelemetry specification; the specification was not re-read in this pass. Low decision impact. |
| C-014 | Error budgets and user-centred SLOs are appropriate reliability tools for this product. | **Not verifiable — normative** | The practice exists; its appropriateness here is a judgement requiring service expectations that do not yet exist. |
| C-015 | ASD recommends active open-source and supplier risk management, including SBOM-related practices. | **Verified** | ASD's software development guidelines address software bills of materials, third-party components and cyber supply-chain security. [S9] |

## Claims added by the 2026-08-04 verification pass

These arise from verification and were not in the submitted evaluation.

| Claim ID | Claim | Status | Note |
| --- | --- | --- | --- |
| C-016 | Multiple products already serve Australian height-safety and equipment inspection registers. | **Verified — market fact** | Publicly marketed examples include Veritas Inspect (anchor testing, height safety certification, recertification tracking, location-linked photos), Core Inspection, Ranger Inspection Gateway, LIFTIQ and SiteConnect, alongside proprietary portals operated by inspection service providers. [S11] The submitted evaluation contains no competitive analysis and scores no market or differentiation risk. |
| C-017 | AS/NZS 1891.4:2025 specifies inspection intervals and removed the previous manufacturer extension. | **Reported by secondary sources; requires licensed text** | Industry sources, including a firm represented on Standards Australia committee SF-015, report annual inspection for installed fall-arrest systems, six-monthly for PPE and removable items, removal of the former five-year manufacturer carve-out, and removal of mandatory annual proof testing for multi-fastener anchors where specified documentation exists. If correct, the baseline interval is more uniform than the evaluation's assumption A15 implies. [S6][S12] |
| C-018 | The detailed "uploaded brief" content the evaluation attributes to `turn0file0` is not present in this repository. | **Verified — repository fact** | `docs/prompts/stage-2a-domain-research-prompt.md` is a ten-line mandate. It does not contain the workflow description or the asset list (anchors, static lines, lifelines, rope-access anchors, ladders, walkways, guardrails, roof-access systems) that the evaluation repeatedly cites as explicit brief content. Assumptions A03, A04, A10, A11, A12, A13, A15, A18 and A34 rest on that attribution. |

## Sources

| Ref | Source | Publisher | Date | Accessed |
| --- | --- | --- | --- | --- |
| S1 | Model Code of Practice: Managing the risk of falls at workplaces | Safe Work Australia | Current edition (21 October 2022 revision available) | 2026-08-04 |
| S2 | History of the model WHS laws | Safe Work Australia | Current | 2026-08-04 |
| S3 | Occupational Health and Safety Act 2004 (Vic); OHS Regulations Review | Victorian legislation; WorkSafe Victoria | Act version 045, in force 6 August 2025 | 2026-08-04 |
| S4 | AS/NZS 1891.4:2025 product record | Standards Australia Store | Published 19/09/2025 | 2026-08-04 |
| S5 | AS 5532:2025 product record | Standards Australia Store / Intertek Inform | Published 19/09/2025; ISBN 978 1 76175 372 5; 34 pp; Committee SF-015 | 2026-08-04 |
| S6 | Changes to Height Safety Standards Support Safer Workplaces | Standards Australia | 19 September 2025 | 2026-08-04 |
| S7 | Privacy Act 1988 (Cth) ss 6C, 6D, 6DA; small business exemption status commentary | Federal Register of Legislation; legal commentary | Compilation current 4 June 2026 | 2026-08-04 |
| S8 | Privacy obligations under Tranche 2 AML/CTF reforms | HWL Ebsworth | Effective 1 July 2026 | 2026-08-04 |
| S9 | Guidelines for software development, Information Security Manual | Australian Signals Directorate | Published and updated 09 June 2026 | 2026-08-04 |
| S10 | SSDF publications index: SP 800-218 (Final, 03/02/2022); SP 800-218 Rev. 1 ipd (Draft, 17/12/2025) | NIST CSRC | Page updated 13 April 2026 | 2026-08-04 |
| S11 | Vendor marketing material for Veritas Inspect, Core Inspection, Ranger Inspection Gateway, LIFTIQ, SiteConnect | Vendors | Current | 2026-08-04 |
| S12 | AS/NZS 1891.4:2025 and AS 5532:2025 commentary | Height Safety Engineers (SF-015 committee member firm) | September 2025 | 2026-08-04 |

Source classes S11 and S12 are secondary and commercially interested. Per `docs/prompts/stage-2a-domain-research-prompt.md`, competitor behaviour is not authoritative for requirements. S12 is a lead for licensed-text verification, not a substitute for it.

## Verification rule

Do not convert a verified source statement directly into a product requirement. First record its applicability, conflicts, interpretation confidence and decision owner.
