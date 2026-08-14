# 2D-04 Managed Provider and Authentication Proof

Status: **In progress — local preparation complete; managed proof not run**,
2026-08-14

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
They must never run from an unattended review agent or CI. The script must show
and validate the resolved account, project, region and unique spike prefix
before mutation; refuse a production project; use least-privilege credentials;
and allow `--destroy` to target only resources carrying that exact prefix and
ownership labels. Destruction must write a sanitised result, and
`--verify-destroyed` must inventory the same project and prove no labelled
resource remains before `--verify-evidence` can pass. No secret, account
identifier or signed URL may enter Git.

## Managed-hosting acceptance

The managed candidate must prove:

- the service, queue, private object bucket and every other data-bearing managed
  resource have captured and verified Australian locations; the renderer uses
  the pinned Linux image and initial concurrency one;
- one private queued job creates one private object directly rather than
  returning the PDF through a long API request;
- three cold and three warm fixture runs record duration, peak memory, output
  size, page/photo/font inspection and deterministic regeneration;
- forced instance termination during rendering leaves no published partial
  object and a queued retry completes exactly one report;
- object access is private, temporary local files are disposable, and logs and
  evidence contain no report payload or credentials;
- lifecycle, retry, timeout and scaling configuration are captured;
- measured platform, queue and storage cost is converted to an explicit
  per-report estimate with assumptions; and
- post-destroy inventory proves no resource with the spike prefix or ownership
  labels remains; and
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

Independent technical review verifies scripts, infrastructure boundaries,
sanitised evidence and repeatability. The owner then decides whether to approve
a provider and managed renderer size. G-02 remains open unless both reviews
pass; G-03 may remain open if portability, backup or export evidence is still
incomplete.
