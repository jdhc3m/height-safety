# 2D-03 PDF and Hosting Feasibility Spike

Status: **Done; corrected local proof, independent technical re-review, owner
architecture approval and constrained-Linux candidate proof passed**, 2026-08-12

## Outcome

The representative report is feasible with pinned Playwright and Chromium.
The owner approved a separate asynchronous worker (D-022): keep report
rendering out of the API process and begin with renderer concurrency one. This
is a renderer architecture decision, not a cloud provider selection.

Gate G-02 is closed (D-024). The renderer passed in constrained Linux
containers and then in a bounded Sydney Cloud Run candidate. Production
database, backup and export remain G-03. Authentication vendor selection
remains open.

## Representative fixture

The checked-in fictional fixture models a large prototype report:

- 30 installed single-point roof anchors;
- two deterministic synthetic 1280 by 960 JPEG photographs per anchor;
- 60 photographs and 31 A4 PDF pages in total;
- an embedded Noto Sans font;
- neutral draft wording with no compliance, certification or engineering
  conclusion; and
- an immutable generation timestamp used to make PDF metadata reproducible.

The fixture uses an NSW context, but contains no NSW rule automation. Renderer
load is jurisdiction-independent, so the result also applies to the same
neutral Queensland workflow. Synthetic images avoid introducing real customer
or safety evidence into this technical test.

## Engineering limits

These are prototype engineering limits, not industry, legal or safety rules:

| Measure | Spike limit |
| --- | ---: |
| Warm render duration | 60 seconds |
| Single-render process-tree peak memory | 1,536 MiB |
| Two concurrent shared-browser renders | 3,072 MiB |
| One generated PDF | 25 MiB |
| Interrupted generation | No committed report, temporary PDF or stale ownership record |
| Identical fresh generation | Identical SHA-256 hash |

## Harness

`tools/pdf-spike/` builds HTML without network access, generates deterministic
synthetic images in Chromium, embeds the pinned font and writes the PDF through
a temporary file followed by an atomic rename. The input snapshot, template
version and variant form the idempotency key. A manifest records the input hash,
PDF hash and byte count.

Chromium writes current creation and modification timestamps even when all
report inputs are identical. The harness found this six-byte difference and
now replaces only those two metadata values with the immutable snapshot
generation timestamp. The benchmark proves two fresh output directories then
produce the same bytes. If a future Chromium version changes the expected
metadata structure, generation fails rather than silently applying a broad PDF
rewrite.

After acquiring the report-generation ownership row, the renderer owns one
60-second deadline covering HTML/photo preparation and PDF printing. A
duplicate's lock-wait budget also covers bounded page/browser teardown, one
lease-expiry period and polling margin; it receives a fresh render deadline if
it must take over.
A direct fake-Chromium test stalls `page.pdf()` and proves the render deadline
closes the page and releases its lock. If page teardown stalls, the renderer
keeps the lock until browser termination completes. A delayed-write regression
test proves that Chromium cannot keep writing after a retry takes ownership.
The same ownership rule applies when page teardown rejects rather than stalls.
If browser termination itself rejects or exceeds the teardown bound, the
renderer deliberately preserves the ownership row and its temporary file and
raises a worker-termination-required error. The worker entry point then exits
immediately; only expired-lease recovery may release that key. Regression tests
prove the shutdown path is bounded, a retry cannot render while the failed
worker is still considered the owner, and recovery succeeds after simulated
worker death. Subprocess regressions prove both browser launch and shutdown are
bounded, reach the worker entry point's forced exit and verify exit code 70.
The Linux candidate run additionally proves that stopping the whole renderer
container removes Chromium descendants and that a fresh container recovers the
same job without reusing a partial result.

The termination test waits until a temporary PDF exists, starts a duplicate
retry, then sends `SIGTERM` to the ownership-row holder. The waiting retry takes
over only after cleanup and creates the report; a later retry reuses it without
rendering again. Only the recorded owner may remove its temporary files.

Report publication prepares a private manifest, then opens a short SQLite
`BEGIN IMMEDIATE` transaction. It verifies that the publishing token still owns
an unexpired lease, renews that lease, and performs both local renames
synchronously before releasing the transaction. This fences a renderer whose
event loop resumed after another worker took over: it cannot overwrite the new
owner's PDF or manifest. A takeover-during-manifest-preparation regression
proves the publication-time check, rather than only an earlier ownership check.
Cancellation during manifest preparation and local publication removes the
current attempt's temporary artifacts; a stale owner never deletes another
owner's published files.

The harness uses Node.js's built-in SQLite only as a local coordination model;
it does not select the production database. One short `BEGIN IMMEDIATE`
transaction atomically creates or replaces each ownership row, and a token-
conditional delete releases it. SQLite rolls back an unfinished transaction if
its worker process dies, so there is no second filesystem guard that can become
abandoned. A regression kills a child process while that transaction is open
and proves the next renderer acquires the key.

Each ownership row records a unique token, diagnostics and a renewable expiry.
Only that token can refresh or release the lease, and refresh after expiry is
rejected rather than reviving an ownership gap, including when SQLite
contention delays the heartbeat. Losing a heartbeat aborts the render, while
the publication transaction independently rechecks the token and expiry. Lock
acquisition also rechecks its absolute wait deadline after SQLite contention.
A retry may atomically replace the row only after expiry, so an
unrelated process that later receives the same PID cannot impersonate or
refresh the original renderer; regressions cover heartbeat ownership loss,
stale-owner publication and current-PID reuse.
Another regression simulates a persisted ownership row and partial PDF from a hard-
killed worker, then proves the retry removes those stale artifacts and
completes. A second regression covers a crash after PDF and manifest commit:
cached-result reuse also removes the terminated owner's stale row. Recovery
removes both temporary PDF and temporary manifest formats. This remains a local
process-level proof; production still requires PostgreSQL/queue uniqueness.

Resource sampling is part of the evidence gate. A missing, failed or malformed
process snapshot invalidates the benchmark instead of being recorded as zero
memory or CPU use.
Worker results are parsed only after child stdio closes; buffered output cannot
be truncated by the earlier process-exit event, and invalid JSON fails the run
with captured diagnostics.

Run the checks with:

```text
tools/pdf-spike.sh --install-browser
pnpm run pdf-spike:check
pnpm run pdf-spike:run
pnpm run pdf-spike:linux
pnpm run pdf-spike:linux-termination
```

The explicit install command downloads the Chromium revision pinned by the
locked Playwright package; dependency installation alone does not install that
binary. The full benchmark requires it. The root merge gate runs the static
fixture and script checks but not the resource-heavy benchmark.

## Local measurements

Environment: macOS x64, Node.js 24.18.0, Playwright 1.62.1, Chromium
151.0.7922.34, 12 logical CPUs and 16 GiB system memory.

| Scenario | Duration range | Peak-memory range | Peak interval CPU range |
| --- | ---: | ---: | ---: |
| Cold browser plus one report | 7.21–31.65 s | 727–804 MiB | 173–457% |
| Reused browser plus one report | 6.85–31.57 s | 742–835 MiB | 258–491% |
| Two reports sharing one browser | 7.22–40.67 s | 1,253–1,420 MiB | 298–844% |
| Two isolated renderer processes | 7.93–13.17 s | 1,641–1,785 MiB | 401–1,011% |

The warm PDF was 6,456,601 bytes. Automated PDF inspection found all 31 pages,
all 30 expected anchor labels, all 60 image operators and embedded Noto Sans.
Every engineering limit passed. The temporary-file interruption was observed, the
already-waiting retry took over cleanly, completed-output reuse succeeded, and
two fresh regenerations had the same SHA-256 value:
`74aa57dca054982f927ae6f13563362b51684b1bc1e133d90ff2d73136fcc3ad`.
Sanitised machine-readable evidence is in
`STAGE_2D_03_LOCAL_BENCHMARK.json`.

CPU percentages are process-tree CPU-time deltas divided by the wall time
between samples on a 12-logical-CPU laptop. Unlike `ps %cpu`, this avoids a
process-lifetime average. The short-interval peaks are useful for identifying
CPU pressure, not predicting a cloud bill or exact candidate sizing.
The slightly slower warm sample is ordinary local measurement variation and
does not imply a warm-start penalty.

After correcting browser-termination ownership, transactional dead-worker
recovery, fenced renewable ownership leases, bounded teardown, cold-memory
acceptance and CPU measurement, eighteen consecutive full repetitions passed. One
earlier development run reached the newly enforced 60-second deadline during
the interruption/retry scenario; its child did not identify the stage until
diagnostics were added. The failure has not repeated, but remains a reliability
warning: the Linux candidate run must keep stage diagnostics, repeat each
configuration and report any timeout rate rather than relying on one successful
sample.

## Constrained Linux measurements

Environment: Colima 0.10.3 using macOS Virtualization.Framework, pinned
`linux-x64` Playwright container, Node.js 24.18.0, Playwright 1.62.1 and
Chromium 151.0.7922.34. The base image and derived image are pinned by digest
in the machine-readable evidence.

| Profile and scenario | Corrected runs | Duration range | Peak-memory range |
| --- | ---: | ---: | ---: |
| 2 vCPU / 2 GiB / concurrency 1, cold | 3 | 8.03–8.67 s | 1,018–1,041 MiB |
| 2 vCPU / 2 GiB / concurrency 1, warm | 3 | 7.71–8.05 s | 1,078–1,095 MiB |
| 2 vCPU / 2 GiB / concurrency 1, isolated worker | 3 | 8.30–8.65 s | 1,225–1,255 MiB |
| 4 vCPU / 4 GiB / concurrency 2, cold | 4 | 7.51–8.71 s | 1,037–1,062 MiB |
| 4 vCPU / 4 GiB / concurrency 2, warm | 4 | 7.33–13.83 s | 1,043–1,107 MiB |
| 4 vCPU / 4 GiB / concurrency 2, isolated workers | 4 | 8.99–10.50 s | 2,222–2,269 MiB |

Every engineering acceptance check passed in every corrected run. Inspection
again found 31 pages, 60 images, all expected anchor content and embedded Noto
Sans. Fresh Linux regenerations were byte-stable with SHA-256
`5ae4b25af326be6da26be59647e598e1d6b7077aa20a7e722b2a3f6c0cee31ba`.
The Linux hash differs from macOS because the rendering platforms differ; the
required guarantee is deterministic regeneration within the same pinned
production environment.

The whole-container termination test observed a temporary PDF, stopped the
renderer container, verified that the container no longer existed, and then
proved a fresh constrained container regenerated cleanly with no temporary
artifacts. Its unique output directory makes the test safely repeatable.
Sanitised evidence is in `STAGE_2D_03_LINUX_BENCHMARK.json`.

Concurrency one remains the production starting direction. It stayed below
1,255 MiB in the isolated-worker case. Concurrency two reached 2,269 MiB and
did not provide a reliable duration advantage, including one 13.83-second warm
outlier. These are starting limits for managed-hosting evaluation, not an
approved production size.

## Architecture comparison

| Option | Evidence and trade-off | Result |
| --- | --- | --- |
| Render inside the API process | Lowest component count, but a single report used up to 835 MiB and briefly approached five local CPU cores. It would compete with API traffic and couple browser failure/restarts to the API. | Do not use for production rendering. |
| Separate asynchronous worker | Isolates memory and failure, supports queued retries and preserves one codebase. Two isolated processes consistently used more memory; local timing varied with machine load. | Recommended candidate, begin with concurrency one. |
| External renderer service | Could remove browser operations from this team, but sends report evidence to another processor and adds provider, Australian-region, retention, security and cost questions. It was not benchmarked because no vendor or real-data terms are approved. | Defer; retain as fallback. |

A separately deployed Gotenberg service is an intermediate alternative: it
keeps Chromium out of the API and supplies queue/shutdown controls, but still
adds another service and requires the same private-storage, retry and
idempotency integration. The custom worker is currently simpler because the
prototype already proves the required Playwright behavior directly.

## Candidate-hosting interpretation

Cloud Run remains an evaluation candidate only. Its documented service limits
can accommodate the measured PDF size and duration. Its writable filesystem is
memory-backed and counts against instance memory, so temporary files and
Chromium memory must be measured together. Configurable request concurrency is
important because the platform default is unsuitable for this CPU/memory-heavy
operation. The platform sends `SIGTERM` before forced termination, matching the
cleanup path exercised by the harness.

The constrained Linux test compared:

- 2 vCPU, 2 GiB memory and renderer concurrency one;
- 4 vCPU, 4 GiB memory and renderer concurrency two;
- cold and warm runs repeated at least three times;
- Linux font output and fresh byte stability;
- fresh-worker retry after whole-container termination.

`2D-04` must still test a managed candidate's queue retry, direct upload to
private object storage, Australian region, lifecycle configuration and a
duration-derived per-report cost estimate. Platform cold start is a
revision-token match, not a measured scale-to-zero start, and the cost figure
is not an invoice line.

The first configuration is a test starting point, not an approved production
size. The local two-report sample peaked above six aggregate CPU cores, so
concurrency two must not be enabled on a two-vCPU instance without deployed
evidence.

## Limitations and remaining gate

- Synthetic photographs reproduce dimensions, count and JPEG load but not the
  compression distribution of a real partner corpus.
- The Linux evidence uses local constrained containers, not a managed cloud
  service or Australian-region deployment.
- A transient earlier macOS timeout did not repeat in eighteen corrected local
  runs or seven corrected Linux profile runs.
- Queue, private object storage, database snapshot loading and network latency
  are represented by boundaries, not deployed integrations.
- The local SQLite ownership table proves process-level behavior only.
  Production idempotency still requires the approved PostgreSQL/queue
  uniqueness boundary and private object storage; the spike database is not a
  production technology selection.
- No external renderer's data processing, retention, Australian region or cost
  was approved or tested.
- The report wording and visual design remain prototype material for
  practitioner review.

The harness, constrained-Linux proof and separate-worker direction complete
`2D-03`. The owner later approved Cloud Run as the first managed renderer
candidate after `2D-04` (D-024). G-02 is closed. G-03 still blocks production
database, backup and export.

## 2026-08-15 merge-gate correction

While validating `2D-05`, two root-gate runs exposed the bounded SQLite lock
wait exceeding its 2,060 ms contract. The synchronous `DatabaseSync` busy wait
could consume most of the absolute deadline in one call. Lock acquisition now
uses 100 ms busy slices, treats SQLite busy result code 5 as contention, checks
the same absolute deadline between attempts and uses the already bounded
connection for best-effort cleanup if acquisition crosses the deadline. It does
not relax the existing duration assertion.

The unchanged PDF check passed three consecutive focused runs after the repair,
and the complete root gate passed. Independent correction review confirmed the
short busy-timeout slices and same-connection cleanup preserve the absolute
deadline contract.

## Evidence sources

Official documentation checked 2026-08-10:

- Cloud Run container lifecycle and memory-backed filesystem:
  <https://docs.cloud.google.com/run/docs/container-contract>.
- Cloud Run service concurrency:
  <https://docs.cloud.google.com/run/docs/about-concurrency>.
- Cloud Run memory configuration:
  <https://docs.cloud.google.com/run/docs/configuring/services/memory-limits>.
- Cloud Run quotas and request limits:
  <https://docs.cloud.google.com/run/quotas>.
- Cloud Run jobs, retry and timeout behavior:
  <https://cloud.google.com/run/docs/create-jobs>.
- Playwright container/browser requirements:
  <https://playwright.dev/docs/docker>.
- Gotenberg Chromium configuration and graceful shutdown:
  <https://gotenberg.dev/docs/configuration>.
- Gotenberg HTML-to-PDF route behavior:
  <https://gotenberg.dev/docs/convert-with-chromium/convert-html-to-pdf>.
