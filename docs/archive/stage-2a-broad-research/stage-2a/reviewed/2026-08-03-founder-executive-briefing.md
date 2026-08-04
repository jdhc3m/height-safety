# Founder Executive Briefing — Stage 2A

## 20 biggest findings

1. **Readiness is the largest finding.** The repository does not contain a completed Stage 2A evidence package; it contains a research prompt, intake material and mostly empty registers. This is directly checkable in the repository, but does not prove research is absent elsewhere. [Directly checkable; high confidence]
2. The product domain is broadly known: Australian height-safety inspection and recertification software. Customer segment, jurisdiction, asset scope and manufacturer coverage are not known. [`PROJECT_CONTEXT.md`; high confidence]
3. The supplied evaluation is useful as a challenge map, not as a verified requirements baseline. [Secondary analysis; low confidence for domain claims]
4. The 120-day controlled pilot-ready target is provisional, not a validated delivery commitment. [`PROJECT_CONTEXT.md`; medium confidence]
5. Founder capacity is known only in outline: an experienced Android/Kotlin developer at approximately 30 hours per week. Complete team capability is unknown. [`PROJECT_CONTEXT.md`; high/low confidence respectively]
6. The proposed office-to-field-to-review workflow has not been validated through observation. It may describe an intended process rather than actual practice.
7. The proposed asset catalogue is too broad to treat as one coherent first workflow: anchors, lines, ladders, walkways, guardrails and roof-access systems may differ materially.
8. “Inspection”, “pass”, “compliant”, “certified” and “recertified” are not safe product states until practitioners and qualified advisers define them.
9. Inspector, reviewer and certifier authority may be separated; the role model is unresolved.
10. A binary pass/fail model is unlikely to represent every operational outcome. Inaccessible, not inspected, defective, removed from service, conditional and remedial states need validation.
11. Asset identity is an operational problem, not merely a database field. Missing, duplicated, replaced, untagged and newly discovered assets must be reconciled.
12. Inspection timing may depend on more than a recurring interval, including manufacturer instructions, environment, incidents, alterations and repairs. This remains a hypothesis until sourced.
13. Standards and regulatory claims are not yet implementation-grade. The repository’s claim register marks all such claims unverified.
14. Standards editions and applicability require explicit control; the evaluation’s 2025 edition claims still require verification against authorised Standards Australia records and licensed texts.
15. Offline capability is a technical risk area, not a simple mobile cache feature. Disconnected edits, retries, stale credentials and conflicts require experiments.
16. Safety-significant conflicts cannot safely be assumed to resolve through “last writer wins”.
17. Issued reports may need reproducible source data, template, rule and approval history; the actual evidentiary expectation is unknown.
18. Photographs, location data, signatures, identities and site information may create privacy and security obligations; the actual data map is absent.
19. Retention, correction, export, deletion and legal-hold requirements are unresolved and may conflict with “keep complete history”.
20. The correct Stage 2B decision may be no-build, buy/integrate, narrow pilot or product engineering. Discovery must preserve all four outcomes rather than presuppose a build.

## 20 assumptions that were wrong

These are assumptions the evaluation disproves, materially weakens, or shows cannot be defended. They are not all externally verified facts.

1. **Wrong:** Stage 2A is complete enough to begin implementation. The repository evidence package is incomplete.
2. **Wrong:** The project has an approved Stage 2B implementation proposal. The supplied material is an evaluation/research brief, not an approved proposal.
3. **Wrong:** The domain is wholly unspecified. The broad product domain is recorded; the commercial and operational boundary is what remains unspecified.
4. **Wrong:** The 120-day target is a reliable schedule. It is a provisional target with unresolved scope, team and dependency risk.
5. **Wrong:** The founder alone represents sufficient delivery capability. Android/Kotlin expertise does not establish coverage for domain, offline sync, security, QA, privacy and operations.
6. **Wrong:** The proposed workflow is actual industry practice. It has not been observed in the field.
7. **Wrong:** All proposed asset families can share one generic checklist. Variation is explicitly a research question.
8. **Wrong:** “Australian” implies one uniform compliance rule set. Jurisdictional applicability remains to be verified.
9. **Wrong:** Standards names or summaries are sufficient to derive software rules. The claim register requires licensed source review and qualified interpretation.
10. **Wrong:** The cited standards baseline is edition-controlled. Editions, supersession and applicability are not recorded in the repository.
11. **Wrong:** Regulator guidance automatically equals mandatory product requirements. Evidence class and jurisdictional legal effect must be established.
12. **Wrong:** Inspection, compliance, certification and recertification are interchangeable labels. Their meanings and authority are unresolved.
13. **Wrong:** The field inspector is necessarily the final approver or certifier. The authority matrix is unknown.
14. **Wrong:** Pass/fail is a sufficient outcome model. The evaluation itself identifies exceptions and intermediate states.
15. **Wrong:** Asset registers and identifiers are clean. Real registers have not yet been obtained or profiled.
16. **Wrong:** A single recurring interval determines the next inspection date. Trigger sources and exceptions are unverified.
17. **Wrong:** Offline support is mostly local caching. Distributed consistency and conflict handling are first-class risks.
18. **Wrong:** Historical reports can be regenerated from current data. Reproducibility requires preserved versions and snapshots.
19. **Wrong:** “Maintain history” means retain everything indefinitely. Retention and privacy obligations are unknown.
20. **Wrong:** Building a broad custom SaaS is the default best answer. Buy/integrate, a narrow evidence service, online-first job packs or no-build remain viable.

## 20 unknowns that could break the product

1. Is the missing Stage 2A research held outside the repository, and can it be lawfully imported with durable citations?
2. Which initial customer segment will pay: small inspection firms, national providers, facilities owners, government contractors or another group?
3. Which state or territory is the pilot in, and what source regime applies there?
4. Which one or two asset families are genuinely coherent for the pilot?
5. Which manufacturers and product versions must be supported?
6. What does each outcome mean operationally and legally: inspected, serviceable, compliant, certified, recertified, rejected or provisional?
7. Who may inspect, review, approve, certify, amend, withdraw and issue a report?
8. What competencies, licences, qualifications or organisational permissions must be represented?
9. What are the real field workflow steps, exceptions and handoffs?
10. How are assets identified when labels are missing, duplicated, replaced or absent from the register?
11. How often and how long are users actually disconnected?
12. Which actions must work offline, and must final review or approval work offline?
13. What devices, operating systems, ownership models and mobile-management controls are required?
14. What data volumes exist: tenants, jobs, assets, photos, documents, retention years and annual growth?
15. What evidence must an issued report preserve to be reproducible and defensible?
16. Which data is personal, confidential, security-sensitive or location-sensitive?
17. What are the retention, correction, deletion, export, legal-hold and client-ownership rules?
18. What hosting region, subprocessors, identity providers and integrations are permitted?
19. What service hours, recovery objectives, support response and degraded modes will customers require?
20. What budget, price, gross-margin target, design-partner commitment and P80 delivery envelope make the product commercially viable?

## Top 10 MVP implications

1. **Bound the pilot hard:** one jurisdiction, one customer profile and no more than one or two related asset families.
2. Do not promise a national compliance platform, all manufacturers or the full proposed asset catalogue.
3. Make the MVP an evidence-capture and reviewed-report workflow, not an autonomous compliance or certification engine.
4. Define a controlled vocabulary for observations, defects, asset disposition, review status and report status before building screens.
5. Represent authority explicitly; separate field capture from final approval unless offline approval is proven safe.
6. Treat asset discovery and reconciliation as a first-class workflow, including duplicate, replacement and unlocated cases.
7. Use source-backed, versioned inspection guidance; expose uncertainty and unsupported cases instead of guessing.
8. Start with a bounded offline model such as downloadable job packs and durable local capture; require online final review if evidence supports that boundary.
9. Generate reports from an approved snapshot with template, source/rule versions, approver identity and revision history.
10. Define MVP success by field completion, omission/rework rate, sync integrity, report turnaround, user adoption and unit cost—not feature count.

## Top 10 architecture implications

1. Treat tenant isolation as a foundational invariant across APIs, search, exports, object storage and support tooling.
2. Use durable local saves and an idempotent mutation journal for mobile capture; network availability must not determine whether work appears saved.
3. Use server revisions and explicit version checks; do not rely on device clocks or silent last-writer-wins for safety-significant data.
4. Classify conflicts by semantic risk: mechanically merge only proven-safe metadata; route measurements, outcomes, identity and approvals to human reconciliation.
5. Model evidence attachments as a lifecycle with resumable upload, linkage state, orphan detection and reconciliation.
6. Bind approved reports to canonical snapshots, immutable revision history and exact template/source/rule versions.
7. Make rule and template changes effective-dated, reviewed, tested, scoped and reversible without changing previously issued reports.
8. Encrypt and minimise the offline cache, bound its expiry, and support device/session revocation.
9. Instrument user-centred reliability signals: local-save success, sync age, conflict count, attachment failures, stale rule packs, report mismatches and client-version lag.
10. Prefer the least complex architecture that passes the evidence gates; a modular monolith with managed identity and private object storage remains a candidate, not an approved design.

## Top 10 questions to ask inspectors

1. Walk us through your last complete inspection, from job preparation to report issue. What did you actually do, in order?
2. Which steps happen in the office, on site, after leaving site and during review?
3. What do you do when an asset is missing, inaccessible, damaged, unlabelled, duplicated or not in the register?
4. Which asset types require different checks, measurements, photographs, tools or decisions?
5. What exactly do “inspected”, “pass”, “failed”, “compliant”, “certified” and “recertified” mean in your work?
6. Who is allowed to make each decision, who reviews it, and who is permitted to issue the final document?
7. What evidence would you need six months later to defend an inspection or explain a changed outcome?
8. Where do you lose connectivity, how long does it last, and which work must continue during the outage?
9. What errors or omissions occur most often today, and what workaround do you use when a form or app does not fit the job?
10. What would make you stop using a new system after one job, and what measurable improvement would make it worth paying for?
