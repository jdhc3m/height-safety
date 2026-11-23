# New South Wales and Queensland Scope Extension

Status: **public-evidence pass complete; owner-approved prototype direction**
(2026-08-05). This extends the initial jurisdiction from Queensland to New
South Wales and Queensland. It is not legal advice, licensed Standard review or
professional validation.

The asset boundary remains installed single-point roof anchors. The product
continues to record human-entered evidence and organisational draft reports; it
does not determine compliance, competence, licensing, inspection intervals,
proof-test applicability or certification authority.

Source details: [`sources/STAGE_2A5_SOURCE_REGISTER.md`](sources/STAGE_2A5_SOURCE_REGISTER.md),
S-015–S-019.

## Evidence summary

- Safe Work Australia confirms that NSW and Queensland operate within the
  model-WHS framework, while jurisdictions can make local variations.
- NSW Work Health and Safety Regulation 2025 sections 78–80 establish the
  hierarchy for fall risks and rescue requirements, but do not provide a
  complete periodic roof-anchor inspection schema.
- The current SafeWork NSW falls code describes planned inspection programs
  with unique equipment identification, frequency/type, defect action,
  inspection records and manufacturer-specific requirements. Its anchorage
  section calls for competent-person testing/approval before use and regular
  inspection to manufacturer and relevant-standard requirements.
- Queensland has additional prescriptive construction provisions in WHS
  Regulation 2011 section 306I for fall-arrest harness anchorage design,
  first-use approval, capacity and prevention of use when impaired.
- Queensland's public anchor guide provides detailed register, inspection,
  test-evidence, photograph and competent-person themes.
- SafeWork NSW's anchor-specific fact sheet supports ongoing inspection
  programs, but it was updated in 2019 and references superseded regulation and
  older Standard editions. It cannot support current automatic rules.

## Product comparison

| Area | Shared prototype treatment | Unresolved jurisdiction detail |
| --- | --- | --- |
| Register | Stable anchor identity, site/location, available product/install context and history | State-specific documentation or credential expectations |
| Inspection | Human-entered observations, photographs, defects, recommendations and neutral outcomes | Exact checklist and required evidence by product/organisation |
| Defects | Visible defect evidence and recorded removal-from-service disposition | Who may approve return to use |
| Intervals | Record stated last/next/interval and source | Legal/Standards interpretation and exceptions |
| Proof testing | Record entered test evidence when performed | Whether, when and how testing is required |
| Authority | Record inspector/reviewer identity and optional credentials later | Licensing, competence, engineer and report-issue authority |
| Report | Neutral immutable prototype draft with jurisdiction displayed | Partner template, signature and issue language |

## Scope decision

One common workflow can support NSW and Queensland because it captures evidence
without encoding a state compliance conclusion. Jurisdiction is explicit data
on the site/job/report, not an inferred address value and not a rules-engine
selector.

The prototype must not:

- calculate a statutory inspection interval or next-due compliance state;
- validate NSW or Queensland licences, competence or engineering authority;
- infer proof-test requirements or results;
- claim a report or anchor complies with state law or a Standard; or
- silently apply one state's guidance to the other.

## Remaining validation

Before making jurisdiction-specific claims, obtain workflow evidence from at
least one practitioner operating in each state (or one organisation with
verified operations in both), confirm current regulator guidance and licensed
Standards with qualified reviewers, and record any differences through the
assumptions and decision logs.

## Stage 2C consequence

The technical blueprint must include an explicit supported-jurisdiction value
(`NSW` or `QLD`) in site/job snapshots, reports, exports and audit history. It
must keep regulatory interpretation outside application logic and allow later
additive jurisdiction profiles only after evidence and approval.
