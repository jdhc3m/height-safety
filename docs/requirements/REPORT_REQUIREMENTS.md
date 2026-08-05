# Draft Report Requirements

Stage 2B generation and content rules:
`docs/requirements/STAGE_2B_WORKFLOW_SPEC.md`.

First template title: **Prototype Draft Inspection Report**. Display `Draft`
prominently. Include available company, client, site, job, inspection date,
inspector, reviewer, expected anchor register, reconciliation notes,
anchor/location, observations, photographs, recorded outcomes, exceptions,
dispositions, defects, recommendations, entered proof-test evidence,
limitations, generation date, template version and revision number.

Do not display `certified`, `compliant`, `passed for 12 months`,
engineer-approved or standards-approved as a product conclusion. Human-entered
interval/last/next-due values are labelled as recorded context with their source
where available; the report does not infer them.

Use:

> This report was generated using an early-stage inspection workflow prototype. Inspection outcomes, technical decisions and report approval remain the responsibility of the inspecting organisation and its authorised personnel.

Generate only from an exact inspection snapshot. Store immutable file,
inspection revision, template version, creation timestamp, creating user,
reviewing user when applicable, revision number and audit events. Later edits
create a new revision; prior revisions do not silently change. “Issued” is
organisation-controlled; product generates a draft.

## Deferred report material

Clearance/free-fall calculations, rescue/training gates, broad equipment
inspection, AS 5532 manufacturing/lab evidence and standards-derived compliance
sections are not MVP report requirements. Candidate material remains preserved
in `docs/standards/` and `docs/requirements/FIELD_CATALOGUE.md`; adding it to the
active template requires partner/professional evidence and a recorded decision.
