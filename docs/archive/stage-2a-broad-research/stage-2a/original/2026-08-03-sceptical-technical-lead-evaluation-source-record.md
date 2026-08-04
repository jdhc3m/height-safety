# Sceptical Technical-Lead Evaluation — Source Record

> Historical reference. This document does not define the current MVP scope.

## Provenance

| Field | Value |
| --- | --- |
| Received | 2026-08-03 |
| Supplied by | Project owner, in chat |
| Source type | Commissioned or generated technical evaluation |
| Evidence class | Unverified secondary analysis |
| Review state | Reviewed separately; not accepted as fact or requirement |
| Original title | Sceptical Technical-Lead Evaluation of the Proposed Stage 2B Height-Safety SaaS Project |

This file is a structured repository record of the submitted evaluation. The complete submission remains in the conversation record. It has been normalised here to remove repetition while preserving its arguments, identifiers, proposed controls, gates and recommendation. Citation markers such as `turn15search0` and `turn0file0` were supplied without a portable bibliography or source files. They are not usable repository citations and must be replaced with direct source records before relying on the associated claims.

## Submitted executive judgement

The evaluation recommends against approving Stage 2B as a conventional implementation project. It recommends a bounded, evidence-gated technical discovery and risk-reduction stage instead.

Its main argument is that the repository contains a Stage 2A research brief rather than completed Stage 2A findings or a validated Stage 2B proposal. It characterises the proposed product as a safety-significant records system and argues that implementation cannot yet be estimated or approved responsibly.

The submitted Stage 2B objective is:

> Demonstrate that a narrowly defined, evidence-backed inspection workflow can be represented, used offline without loss or silent conflict, reviewed by appropriately authorised people, rendered into reproducible reports, secured appropriately, and delivered within an explicit cost and support envelope.

The evaluation says the end-of-stage decision should permit no-build, buy/integrate, narrow-pilot or proceed-to-product-engineering outcomes.

## Submitted material unknowns

The evaluation identifies these missing or unresolved inputs:

- completed Stage 2A findings and source register;
- a written Stage 2B charter;
- initial customer segment and design partners;
- pilot jurisdiction;
- pilot asset families and manufacturer coverage;
- controlled meanings for inspection, pass, compliant, certification and recertification;
- role authority and separation between inspector, reviewer and certifier;
- applicable standards, editions, effective dates and interpretation ownership;
- operational documents and representative historical records;
- user-role inventory and observed workflows;
- workload, data-volume and connectivity measurements;
- supported devices and device-management expectations;
- data classification, privacy, retention and deletion rules;
- hosting region, subprocessors and cross-border data constraints;
- service levels, recovery objectives and degraded modes;
- integrations and systems of record;
- budget, delivery forecast, team capability and support model; and
- measurable product-success criteria.

## Submitted assumption and contradiction register

The evaluation supplied 38 assumptions. They are retained here as hypotheses, not findings.

| ID | Submitted hypothesis or challenge | Submitted priority |
| --- | --- | --- |
| A01 | Broad domain is known, but customer, jurisdiction and pilot asset scope are not. | High |
| A02 | Stage 2A has not yet established enough evidence for engineering. | Critical |
| A03 | The provisional office-to-mobile workflow may not reflect actual practice. | High |
| A04 | One generic workflow may not safely serve all listed asset systems. | Critical |
| A05 | Australian requirements may not be representable as one national rule set. | Critical |
| A06 | Standards references require edition and applicability control. | Critical |
| A07 | Standards titles or summaries are insufficient for clause-level software rules. | Critical |
| A08 | Regulator guidance must not automatically be treated as a universal mandatory specification. | High |
| A09 | Regulator guidance, standards and other sources may conflict or update at different times. | High |
| A10 | Inspection, pass, compliant, certified and recertified may not have stable shared meanings. | Critical |
| A11 | Inspector, reviewer and certifier authority may differ. | Critical |
| A12 | Pass/fail may be an inadequate outcome model. | High |
| A13 | Existing asset registers may be incomplete or incorrect. | High |
| A14 | Asset identifiers may not be unique or permanent in field records. | High |
| A15 | Inspection due dates may depend on more than one recurring interval. | Critical |
| A16 | Photographs may be sensitive and may not be sufficient evidence by themselves. | High |
| A17 | Record integrity, privacy, correction and retention obligations may conflict. | High |
| A18 | The extent of offline operation required has not been measured. | High |
| A19 | Offline support is a synchronisation and conflict problem, not only caching. | Critical |
| A20 | Some safety-significant concurrent edits may require human reconciliation. | Critical |
| A21 | Device clocks may not establish authoritative event ordering. | High |
| A22 | Entirely offline final approval may be unsafe or impractical. | Critical |
| A23 | Lost field devices may expose cached client and inspection data. | High |
| A24 | Tenant isolation may need to be a foundational control. | High |
| A25 | Hosting region and subprocessors may affect privacy and procurement. | High |
| A26 | Generated reports may need long-term provenance and reproducibility. | High |
| A27 | Later rule or template changes should not silently alter historical reports. | High |
| A28 | Generic application logs may not expose offline and evidence failures. | High |
| A29 | Reliability targets must be tied to user-visible journeys. | High |
| A30 | Recovery may differ for code, data, rules, templates, mobile versions and reports. | High |
| A31 | Libraries and hosted services introduce supply-chain and exit risks. | High |
| A32 | Required domain, mobile, security, test and operational skills are not yet evidenced. | High |
| A33 | Digitising forms may not produce field acceptance. | High |
| A34 | Historical spreadsheet and PDF import may require substantial reconciliation. | High |
| A35 | Scale and performance envelopes remain unknown. | Medium |
| A36 | Storage, rendering, backups, telemetry, support and egress may all affect cost. | Medium |
| A37 | Early vendor choices may create switching costs. | Medium |
| A38 | A fixed implementation budget or date is not yet defensible. | Critical |

The evaluation also highlights contradictions to resolve:

- the broad domain is known, while its commercial and compliance boundaries are not;
- a Stage 2B evaluation was requested without a completed Stage 2A evidence package or Stage 2B charter;
- an architecture diagram was requested while Stage 2A prohibits final architecture design;
- standards were named without editions or a portable source register;
- national product language may conflict with jurisdiction-specific applicability;
- certification language precedes an agreed authority model;
- offline operation, approval and immutable history may create conflicting requirements;
- long-lived evidence may conflict with unverified privacy and retention duties; and
- desired configurability has no established governance model.

## Submitted reference-model concerns

The evaluation includes a conceptual reference model solely as a test scaffold. It is not an approved architecture. Its proposed trust boundaries and concerns include:

- a field device with encrypted local job data, an outbox or mutation journal, media and device-bound credentials;
- identity, request validation, synchronisation and resumable uploads at the service boundary;
- job, inspection, rule, review, report and scheduling responsibilities;
- transactional records, object storage, audit provenance and versioned report inputs;
- delivery, telemetry, backup, secrets and third-party dependencies; and
- explicit tenant, device, application, operations and external-service trust boundaries.

The source proposes validation invariants for tenant scoping, idempotent replay, visible safety-significant conflicts, durable local saves, attachment reconciliation, reproducible approved reports, versioned rules, server-controlled revisions, bounded local data, complete recovery and audit-aware correction or deletion. These are candidate experiment criteria only.

## Submitted risk register

| ID | Submitted risk | Score |
| --- | --- | ---: |
| R01 | Implementation begins without completed Stage 2A evidence. | 25 Critical |
| R02 | Scope expands into a configurable national, multi-asset platform. | 20 Critical |
| R03 | Software or reports misrepresent legal, standards or manufacturer requirements. | 20 Critical |
| R04 | Offline synchronisation loses or overwrites evidence. | 20 Critical |
| R05 | Cost and schedule are committed before key constraints are known. | 20 Critical |
| R06 | Users or reports imply authority the actor does not possess. | 20 Critical |
| R07 | Applicable standards, instructions or jurisdictional requirements change. | 16 High |
| R08 | Field users reject the workflow or maintain parallel records. | 16 High |
| R09 | Personal or sensitive site information is exposed. | 16 High |
| R10 | The team lacks needed domain, mobile, security or test expertise. | 16 High |
| R11 | Testing misses real field and compliance variation. | 16 High |
| R12 | Approved reports cannot be reproduced. | 15 High |
| R13 | Tenant isolation fails in an API, file, export or support path. | 15 High |
| R14 | Device loss or account compromise exposes offline job data. | 16 High |
| R15 | Backups exist but full evidence recovery fails. | 15 High |
| R16 | Rule or template deployment produces incorrect reports. | 15 High |
| R17 | Legacy import creates duplicate or misidentified assets. | 12 High |
| R18 | Offline-client failures are invisible to operations. | 12 High |
| R19 | A critical dependency or service fails or is compromised. | 12 High |
| R20 | Support and incident obligations are underestimated. | 12 High |
| R21 | Deployment changes repeatedly degrade service. | 12 High |
| R22 | Telemetry fails to answer user-impact questions. | 12 High |
| R23 | Vendor lock-in makes change uneconomic. | 9 Medium |
| R24 | Storage, backup, egress or rendering costs exceed unit economics. | 9 Medium |
| R25 | The product is over-engineered before market evidence exists. | 12 High |
| R26 | The product is under-engineered as a generic forms application. | 16 High |

## Submitted validation agenda

The evaluation proposes the following sequence of gates:

1. Evidence completeness and claim-to-source traceability.
2. Direct observation of end-to-end operational workflows.
3. Collection of an anonymised operational-document corpus.
4. Controlled terminology and authority RACI.
5. Standards, jurisdiction and manufacturer applicability register.
6. Representative connectivity and device measurements.
7. Offline mutation, retry, conflict and attachment experiments.
8. Legacy asset-identity reconciliation experiments.
9. Report snapshot, reproducibility and tamper tests.
10. Governed configuration-change experiments.
11. Privacy data map and privacy impact assessment.
12. Security and tenant-boundary testing.
13. Software supply-chain and full-export testing.
14. Representative performance and cost tests.
15. Reliability, degraded-mode and recovery exercises.
16. Supervised field usability validation.
17. Unit-economics analysis.
18. Bottom-up P50 and P80 delivery forecasting.

Numeric sample sizes and performance thresholds in the submitted evaluation are proposals, not accepted criteria. They require a rationale and project-owner approval before use.

## Submitted alternatives

The evaluation asks the project to preserve these possible outcomes:

- complete Stage 2A before further technical work;
- run evidence-gated technical discovery;
- conduct a narrowly bounded pilot;
- use a general field-service platform with a specialised module;
- use a governed configurable inspection platform;
- use online-first operation with downloadable job packs;
- build only a document and evidence service;
- retain human-authorised decision support;
- offer dedicated deployment where commercially justified; or
- choose no-build or a partner solution.

Its suggested technical posture—modular monolith, downloadable job packs, online final approval, source-backed configuration, human-assigned outcomes and deterministic reports—is explicitly a recommendation from this source. It has not been adopted by the project.

## Submitted entry and exit criteria

The proposed entry criteria cover completed Stage 2A evidence, bounded customer and asset scope, controlled terminology, authority roles, current source access, representative operational records, measured connectivity and workloads, data classification, service expectations, and a named team and budget envelope.

The proposed exit criteria cover lossless and conflict-visible offline behaviour, reproducible reports, security testing, field usability, claim-to-source traceability, full recovery, accepted suppliers and residency, viable economics, an accepted P80 forecast, and committed design partners.

## Submitted final recommendation

> Proceed to evidence-gated discovery; reject production implementation, national scope, generic compliance automation and fixed delivery commitments until the stated gates have been demonstrated.

This recommendation is retained as an external proposal. It is not an approved project decision.
