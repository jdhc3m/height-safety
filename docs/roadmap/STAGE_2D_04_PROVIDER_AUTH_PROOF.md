# 2D-04 Managed Provider and Authentication Proof

Status: **Done — owner approved Cloud Run as first managed renderer candidate (D-024); authentication vendor deferred**,
2026-08-18

## Objective

Produce decision-ready hosting and authentication evidence without treating an
evaluation candidate as the approved production provider. Close the managed-
hosting side of G-02 only after a real Australian-region candidate passes the
renderer, queue, private-storage, lifecycle and cost checks below.

Cloud Run in `australia-southeast1` is the first bounded evaluation candidate
because `2D-03` already records its relevant container constraints. It remains
a candidate. The comparison must also cover at least one credible alternative
and preserve PostgreSQL portability and S3-compatible storage semantics or a
tested adapter boundary.

## Allowed scope and artifacts

The ticket may add only provider-spike infrastructure, scripts and sanitised
fictional evidence plus the provider/authentication comparison. Expected
artifacts are:

- `infra/spikes/cloud-run/` for namespaced, disposable candidate resources;
- `tools/provider-spike.sh` as the guarded command entry point;
- `docs/roadmap/STAGE_2D_04_PROVIDER_COMPARISON.md` for the decision comparison;
- `docs/roadmap/STAGE_2D_04_MANAGED_EVIDENCE.json` for sanitised measurements;
  and
- decision/status updates only after owner and technical review.

Do not add product features, real inspection evidence, a production tenant,
state-specific rules, automatic compliance, certification or engineering
conclusions. Use only the checked-in fictional 30-anchor fixture.

## Command contract

The implementing agent must create and run these exact commands before Review:

```text
tools/provider-spike.sh --check
tools/provider-spike.sh --plan --candidate cloud-run --region australia-southeast1
tools/provider-spike.sh --deploy --candidate cloud-run --region australia-southeast1
tools/provider-spike.sh --exercise --candidate cloud-run --region australia-southeast1 --repetitions 3
tools/provider-spike.sh --terminate-during-render --candidate cloud-run --region australia-southeast1
tools/provider-spike.sh --collect-cost --candidate cloud-run --region australia-southeast1
tools/provider-spike.sh --destroy --candidate cloud-run --region australia-southeast1
tools/provider-spike.sh --verify-destroyed --candidate cloud-run --region australia-southeast1
tools/provider-spike.sh --verify-evidence
tools/verify.sh
```

`--check` and `--plan` are local/read-only preparation. `--deploy`,
`--exercise`, `--terminate-during-render`, `--collect-cost`, `--destroy` and
`--verify-destroyed` touch a cloud account and require explicit authorization
at execution time.
They must never run from CI or an unattended review agent. Cloud mutation
requires `HEIGHT_SAFETY_ALLOW_CLOUD_MUTATION` plus either an attended TTY
confirm, or the owner-authorised non-TTY pair
`HEIGHT_SAFETY_ALLOW_NON_TTY=I_AUTHORIZE_2D04_NON_TTY` and
`HEIGHT_SAFETY_SPIKE_CONFIRM=<project>/<region>/<prefix>`. The script must show
and validate the resolved account, project, region and unique spike prefix
before mutation; refuse a production project; use least-privilege credentials;
and allow `--destroy` to target only resources carrying that exact prefix and
ownership labels. Destruction must write a sanitised result, and
`--verify-destroyed` must inventory the same project and prove no active
labelled or prefix resource remains before `--verify-evidence` can pass. Soft-
deleted IAM service accounts can remain restorable for about 30 days and are
recorded as a limitation. No secret, account identifier or signed URL may
enter Git.

## Managed-hosting acceptance

The managed candidate must prove:

- the service, queue, private object bucket and every other data-bearing managed
  resource have captured and verified Australian locations; the renderer uses
  the pinned Linux image and initial concurrency one;
- one private queued job creates one private object directly rather than
  returning the PDF through a long API request;
- three queued jobs each record in-request cold and warm fixture timings,
  duration, peak memory, output size, page/photo/font inspection and
  deterministic regeneration; `platformColdProbe` is a revision-token match
  and is not a measured scale-to-zero start;
- forced instance termination during rendering leaves no published partial
  object and a queued retry completes exactly one report;
- object access is private, temporary local files are disposable, and logs and
  evidence contain no report payload or credentials;
- lifecycle, retry, timeout and scaling configuration are captured;
- measured request and warm-render durations are converted with hardcoded
  Sydney list-rate constants into an explicit per-report estimate; this is not
  an invoice line; and
- post-destroy inventory proves no active resource with the spike prefix or
  ownership labels remains; soft-deleted IAM service accounts can stay
  restorable for about 30 days and are recorded as a limitation; and
- the evidence JSON records limitations and `managedProviderApproved: false`.

Failure of any renderer limit or recovery assertion returns the ticket to
technical review. It must not be hidden by increasing limits, switching
providers or changing renderer libraries without recording the result.

## Authentication comparison

Compare invitation support, Administrator MFA, optional Inspector/Reviewer MFA,
tenant/role claims, session revocation, bounded offline authorization, audit
events, Australian data handling, export, cost and operational burden. This is
a comparison only; D-014 remains the policy and the owner selects a provider
after reviewing the evidence.

## Review and gate closure

Independent technical review verified scripts, infrastructure boundaries,
sanitised evidence and repeatability. On 2026-08-18 the owner approved Cloud
Run in `australia-southeast1` as the first managed draft-PDF renderer
candidate at 2 vCPU / 2 GiB and concurrency one (D-024). G-02 is closed.
Authentication remains a comparison only; the owner deferred the identity
vendor. G-03 remains open for production database, backup and export evidence.
The spike evidence JSON still records `managedProviderApproved: false` because
that file is the disposable run artifact, not the product decision.
