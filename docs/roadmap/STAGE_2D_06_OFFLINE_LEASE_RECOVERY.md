# 2D-06 Offline Lease and Evidence Recovery

Status: **Done — owner approved D-025**, 2026-08-18 (G-05 remains open for design-partner review)

## Objective and boundary

Specify the offline-authorisation lease, lock behaviour and authorised recovery
of unsynchronised local evidence after account revocation or device failure.
Prove the state transitions with a bounded, in-repository machine and tests.
This ticket does not scaffold product Android, choose an authentication vendor,
or implement 3C synchronisation. Owner accepted D-025. Design-partner review is
still required before G-05 can close for a controlled pilot.

The spike lives under `tools/offline-lease/`. It uses only fictional inspector,
company, mutation and photo identifiers. It does not open a database, call a
cloud API or delete real files.

## Decisions used

- D-004: offline use is limited to assigned jobs and one primary inspector.
- D-014: invitation-only managed authentication, device lock, non-destructive
  logout and a bounded offline-authorisation lease. Duration and recovery were
  left open.
- D-015: local-first durable outbox, stable photo association and visible
  conflicts.
- D-018: no silent deletion; authorised cleanup only after empty outbox,
  completed required uploads, resolved conflicts and server acknowledgement.
- D-023: permanent Keystore-key loss fails closed and does not regenerate keys
  or delete ciphertext when evidence exists.
- D-024: authentication vendor remains deferred. The lease is application-
  issued; no identity provider can enforce it on a disconnected device.

## Working durations

These values are **owner-approved prototype defaults** (D-025). The state
machine stays parameterised so partner measurement can change the numbers
later without rewriting transitions.

| Clock | Default | Why this default |
| --- | --- | --- |
| Capture lease | 24 hours from last successful online authorisation | Covers one disconnected field day plus overnight travel without making the revocation delay multi-day |
| Recovery window | 1 hour from administrator authorisation | Long enough to drain a pending outbox on a recovered device; short enough that upload-only access is not a standing exception |

A-018 remains Open for field measurement. Partner evidence can change the
lease duration; it does not reopen the lock/preserve/recovery rules.

## State model

Keep server and device knowledge separate.

| Field | Meaning |
| --- | --- |
| `serverAccountStatus` | Current company account state. Online API requests use this immediately. |
| `deviceAccountStatus` | Last account state observed by the device. |
| `leaseExpiresAtMs` / `leaseElapsedDeadlineMs` | Application-issued capture lease, bounded by wall clock and elapsed runtime so a frozen wall clock cannot hold capture open indefinitely. |
| `mode` | `CAPTURE`, `LOCKED` or `UPLOAD_ONLY`. |
| `lockReason` | `NONE`, `DEVICE`, `LEASE_EXPIRED`, `CLOCK_ROLLBACK`, `REVOCATION` or `KEYSTORE_LOST`. Stronger reasons replace weaker ones. |
| pending mutations/photos | Fictional outbox and media that must be preserved until acknowledged. |
| `recovery` | Short-lived, company-scoped, administrator-granted upload-only window. It does not restore the account. |

Device PIN/biometric is an application lock from D-014. It does not bind the
SQLCipher wrapping key. Failed device authentication does not delete evidence.

## Required transitions

1. A valid lease and active device account allow capture. Capture writes the
   evidence change and outbox/media together as pending, unsynchronised work.
2. Lease expiry locks capture and preserves pending mutations and photos.
3. A successful online refresh while the account is active renews the lease.
4. A failed network refresh does not lock a still-valid lease and does not
   delete evidence.
5. Central revocation denies server access immediately. A disconnected device
   may continue capture until the lease expires or it next refreshes. That
   delay must be described honestly in product language. Pending
   outbox/media must not be acknowledged or cleaned while the server account
   is revoked, even if the device has not yet learned the revoke, except
   during a live administrator recovery window.
6. Confirmed revocation, including an online refresh after a server-side
   revoke, locks capture without deleting queued evidence. A live recovery
   window survives that refresh so upload-only drain can finish.
7. Logout and local cleanup are blocked while mutations, photos or conflicts
   remain, or while the server has not acknowledged the evidence.
8. Logout with an empty, acknowledged store may proceed; local cleanup then
   removes only that empty store.
9. Authorised recovery requires an Administrator in the same company, a
   working Keystore and a device that has passed device authentication. The
   window is upload-only: pending outbox and media may sync; capture stays
   denied; the account stays revoked.
10. After recovery acknowledgement, local cleanup may run. Capture remains
    denied.
11. Permanent Keystore loss locks the store, rejects recovery and cleanup while
    evidence exists, and makes local ciphertext undecryptable. It is false to
    claim that preserved ciphertext can be recovered.
12. Wall-clock rollback beyond a five-minute tolerance fails closed until a
    successful online refresh while the account is still active. Elapsed
    runtime still expires the lease if the wall clock is frozen.
13. Cross-company recovery is denied.

There is no offline destructive override, no remote wipe, no temporary account restoration, and no automatic compliance or certification claim.

## Recovery paths

| Condition | Capture | Local evidence | Authorised next step |
| --- | --- | --- | --- |
| Lease expired, account still active | Locked | Preserved | Reconnect, refresh, then continue |
| Account revoked, device offline | Continues until lease expiry or refresh | Preserved | After lock, administrator recovery |
| Account revoked, device notified or refreshed | Locked | Preserved | Device unlock plus administrator upload-only recovery |
| Device lost or Keystore key permanently gone | Locked | Ciphertext retained and undecryptable | No local recovery; server has only previously acknowledged evidence |
| Logout requested with pending outbox/media | Unchanged | Preserved | Block logout; user may only lock the app |

Lost-device unsynchronised evidence is unrecoverable. The specification does
not add remote wipe.

## Validation

```sh
tools/offline-lease.sh --check
tools/verify.sh
```

`tools/offline-lease.sh --check` covers expiry, elapsed-clock expiry, renewal,
offline versus notified revocation, blocked acknowledgement after unnotified
revoke, blocked logout for pending mutations, photos and conflicts, empty-store
logout/cleanup, upload-only recovery, recovery that survives reconnect,
denied capture after recovery, cross-company and non-administrator recovery,
Keystore loss, device lock, failed device authentication, clock rollback,
clock-rollback recovery on active refresh, failed refresh and recovery-window
expiry.

## Residual risks

- A device that freezes both wall clock and elapsed runtime can delay lease
  expiry until reboot or reconnect. Reconnect still learns revocation.
- Soft-deleted identity-provider users and authentication-vendor behaviour
  remain outside this ticket.
- 3C-04 implements these transitions in the Android application. This proof is
  the specification gate, not the product implementation.

## Owner and design-partner questions

Owner accepted D-025 on 2026-08-18:

- 24-hour capture lease: accepted as the prototype default.
- One-hour upload-only recovery window: accepted.
- Device unlock: PIN/biometric remains required. Same-company Administrator
  grants recovery. The physical holder may be the inspector if still trusted
  with the phone, or office staff who has the device.
- Lost-device and permanent Keystore-loss unsynchronised evidence:
  accepted as unrecoverable.
- Offline destructive override and remote wipe: remain out of scope.

G-05 remains open until design-partner review of those same points before a
controlled pilot.

## Handoff

`2D-06` is Done. D-025 is owner-approved. Next implementation ticket is
`3A-01`. Authentication vendor selection remains deferred. Do not treat this
machine as the Android product.
