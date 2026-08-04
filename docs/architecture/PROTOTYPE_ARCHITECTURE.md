# Prototype Architecture

No application exists yet. Proposed lowest-complexity shape: modular monolith,
relational database, authenticated web API, Android client with encrypted local
database, private object storage for media/reports, deterministic server-side
PDF generation and append-only audit events.

Modules: identity/tenancy; clients/sites/anchors; jobs/assignments; inspections
and evidence; sync/media; review; reports; audit. Keep module boundaries clear
without microservices. Choose framework only after inspecting repository and
recording a decision.

Data flow: office prepares job; server authorises assigned download; mobile
saves locally first; outbox replays idempotent mutations; media uploads bind to
anchor inspection; server exposes failures/conflicts; connected review creates
snapshot and report revision.

Quality gates: cross-tenant tests, restart recovery, mutation replay, photo
association, conflict visibility, deterministic report reproduction and private
media access.
