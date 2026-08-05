# Implementation Gap Analysis

Canonical roadmap handover: [roadmap current status](roadmap/CURRENT_STATUS.md).
Canonical implementation plan: [roadmap implementation plan](roadmap/IMPLEMENTATION_PLAN.md).

## Repository finding

The repository has no application source, database schema, migrations, API,
mobile project, web project, report renderer, CI test suite or deployment
configuration. Code implementation is therefore entirely outstanding; no
existing feature can be classified as aligned beyond the documentation baseline.

## Documentation-to-implementation gap

The structured product, requirements and architecture documents now define the
provisional target. They do not represent implemented behaviour.

## Required implementation changes

- **Database/migrations:** create the company-scoped entities in `DATA_MODEL.md`,
  status enums as changeable application values, inspection revisions, outbox
  records, private media metadata, report revisions and append-only audit events.
- **API:** authenticated tenant-scoped CRUD for clients, sites, anchors, jobs,
  assignments, inspection mutations, media upload lifecycle, review actions and
  report generation. Require idempotency keys and expected versions for sync.
- **Mobile:** assigned-job download, encrypted local persistence, durable
  mutation journal, retry state UI, camera/photo references, anchor-first forms,
  exception outcomes, submission and bounded cache cleanup.
- **Web:** role-based administration, anchor register/import, assignment,
  review queue, missing/failed evidence warnings, conflict review, report
  revision access and structured export.
- **Reports:** server-side deterministic PDF generation from an immutable
  inspection snapshot, template version and explicit prototype disclaimer.
- **Security:** server-side tenant checks, private signed media access,
  secure local storage, no sensitive logs, environment separation and
  cross-tenant tests.

## Broader-than-needed features to disable/postpone

Any generic asset catalogue, certification/recertification workflow,
standards/rules engine, unvalidated automatic interval exceptions,
multi-jurisdiction support,
other asset types, customer portal, billing, scheduling and AI conclusions
should be removed from active implementation plans or feature-flagged out.

## Risks from starting architecture

Because no implementation exists, the main risk is premature architecture
choice. Introducing a broad generic compliance model would increase scope and
make authority language harder to control. The highest technical risks to prove
early are offline durability and idempotency, photo-to-anchor association,
tenant isolation, report provenance and audit history.

## Recommended test inventory

Tenant isolation for every resource and file path; mutation replay idempotency;
version conflict visibility; local save/restart recovery; failed photo upload
retry; correct association of new/missing anchors; report reproducibility;
immutable revision behaviour; role permissions; and no sensitive data in logs.

## Deferred AS/NZS 1891.4:2025 candidates

The supplied 2025 material identified candidates beyond the current anchor
MVP. They are preserved for later qualified review and are not implementation
gaps for Stage 2C/2D:

- Component-level equipment register and lifetime inspection history.
- Traceability to manufacturer or user-installed identifier.
- Service-state transitions for failed, expired and fall-arrest-used equipment.
- Pre-use, post-use and periodic checklists by textile, metallic, connector,
  harness, device, anchor, HLL/HRS and fastener category.
- Rescue-plan and training evidence linked to each job.
- Task/environment hazards, dropped-object controls and product-instruction
  references.
- Structured clearance and free-fall calculations with visible inputs, units,
  formulas, assumptions and review.
- Anchorage-capacity/professional-engineer evidence and fastener proof tests.
- Connector compatibility, lock, orientation, roll-out and short-circuit checks.

Do not implement these candidates or automatic compliance conclusions without
partner evidence, qualified review and a recorded scope decision.

## Deferred AS 5532:2025 candidates

The supplied 62-page screenshot sequence identified a possible
product/manufacturing evidence layer. It is not part of the MVP site-inspection
workflow:

- Product register fields for fixed/portable class, model, batch/serial,
  attachment point, load directions, rating/person count and instruction
  version.
- Test-record fields for specimen, apparatus, static/dynamic/function
  procedure, force, hold time, mass/drop/peak load, suspension, roof
  structure, deviations, unusual observations and dated standard reference.
- Instruction and marking checklists for installation/use, limitations,
  compatibility, traceability, inspection/removal from service, personnel-only
  use and permanent manufacturer/batch/rating/standard markings.
- Report separation between manufacturing evidence under AS 5532 and onsite
  selection, installation, structural capacity, proof testing and inspection
  under the applicable field requirements.

Do not add this layer to the MVP or use AS 5532 product evidence alone to issue
a site compliance result.
