# Draft Report Requirements

Stage 2B generation and content rules:
`docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`.

First template title: **Prototype Draft Inspection Report**. Display `Draft`
prominently. Include available company, client, site, supported jurisdiction
(`NSW` or `QLD`), job, inspection date, inspector, reviewer, expected anchor
register, reconciliation notes,
anchor/location, observations, photographs, recorded outcomes, exceptions,
dispositions, defects, recommendations, entered proof-test evidence,
limitations, generation date, template version and revision number.

Do not display `certified`, `compliant`, `passed for 12 months`,
engineer-approved or standards-approved as a product conclusion. Human-entered
interval/last/next-due values are labelled as recorded context with their source
where available; the report does not infer them.

Jurisdiction is displayed as site context only. It does not cause the report to
claim a state-specific inspection interval, licence, proof-test requirement,
approval authority or compliance result.

Use:

> This report was generated using an early-stage inspection workflow prototype. Inspection outcomes, technical decisions and report approval remain the responsibility of the inspecting organisation and its authorised personnel.

Generate only from an exact inspection snapshot. Store immutable file,
inspection revision, template version, creation timestamp, creating user,
reviewing user when applicable, jurisdiction, revision number, checksums,
generation idempotency identity and audit references. A retry for the same
approved snapshot/template returns the existing report revision. Later edits
create a new revision; prior revisions do not silently change and may be marked
superseded. “Issued” is organisation-controlled; product generates a draft.

Audit events record important workflow actors, transitions and record
references without copying full notes or media content unnecessarily.

## Deferred report material

Clearance/free-fall calculations, rescue/training gates, broad equipment
inspection, AS 5532 manufacturing/lab evidence and standards-derived compliance
sections are not MVP report requirements. Candidate material remains preserved
in `docs/standards/` and `docs/requirements/FIELD_CATALOGUE.md`; adding it to the
active template requires partner/professional evidence and a recorded decision.
