# Height Safety Anchor Inspection Prototype

This repository defines an early-stage mobile and web application for periodic
inspection and reporting of installed single-point roof anchors.

The initial target is small Australian height-safety inspection companies in
New South Wales and Queensland. The MVP records the site jurisdiction
explicitly while using one neutral evidence workflow. It supports office
preparation and review, mobile field capture with limited offline operation,
draft report generation, and basic anchor history for a design-partner pilot.

The application supports inspector workflow and professional judgement. It is
not a compliance, certification, engineering, or legal-decision system.

The bounded-pilot hosting target is GCP Sydney (`australia-southeast1`): Cloud
Run for the API, office web and PDF worker; Cloud Tasks for private async
delivery; Cloud SQL for PostgreSQL; and private Cloud Storage for
photos/reports. This target has not been deployed. See the
[GCP target platform](docs/architecture/GCP_TARGET_PLATFORM.md) and
[current status](docs/roadmap/CURRENT_STATUS.md).

Start with [current status](docs/roadmap/CURRENT_STATUS.md), then [product
vision](docs/product/PRODUCT_VISION.md), [current scope](docs/product/CURRENT_SCOPE.md)
and [MVP requirements](docs/requirements/ANCHOR_MVP_REQUIREMENTS.md). Historical
broad research is preserved under `docs/archive/` and is not current scope.
