# 2D-05 Android Encrypted Room Storage Proof

Status: **Done; independently reviewed**, 2026-08-15 (D-023)

## Objective and boundary

Close the technical part of G-04 with a bounded Android library spike that
proves Room-compatible database encryption, Android Keystore wrapping, restart
durability, an explicit Room migration and fail-closed key-loss behavior. This
is not the Android product scaffold, an offline-authorisation implementation or
a recovery service. It contains only fictional job-pack and outbox records.

The spike lives under `apps/android/storage-spike/`. Product screens, sign-in,
job download, photographs, WorkManager synchronisation and broader domain
models remain outside this ticket.

## Evidence-based candidate

The spike pins Room 2.8.4 and `net.zetetic:sqlcipher-android` 4.17.0. Zetetic's
current library describes `SupportOpenHelperFactory` integration with Room 2.x,
supports API 23 and the four common Android ABIs, and identifies itself as the
long-term replacement for the original library. The dependency gate rejects
`net.zetetic:android-database-sqlcipher`, whose own repository marks it
deprecated and no longer updated.

Primary sources reviewed through 2026-08-16:

- [Android Keystore](https://developer.android.com/privacy-and-security/keystore)
  documents non-exportable key material and key-use restrictions.
- [Room migration guidance](https://developer.android.com/training/data-storage/room/migrating-db-versions)
  requires preserving and testing schema history and warns that destructive
  migration deletes user data.
- [Room 3 migration guidance](https://developer.android.com/training/data-storage/room/migration-2-to-3)
  confirms that Room 3 requires a `SQLiteDriver` and removes the
  `SupportSQLiteOpenHelper` configuration seam used by this proof.
- [Android Auto Backup](https://developer.android.com/identity/data/autobackup)
  confirms that normal database paths are backed up while `noBackupFilesDir`
  is excluded.
- [SQLCipher for Android 4.17.0](https://github.com/sqlcipher/sqlcipher-android/tree/v4.17.0)
  documents its Room open-helper integration, API/ABI support, explicit native
  loading and log controls.
- [SQLCipher's Room 2.8.4 compatibility report](https://github.com/sqlcipher/sqlcipher-android/issues/81)
  records the read-transaction compatibility failure fixed by the explicit
  `beginTransactionReadOnly` implementation present in 4.17.0.
- [Zetetic's legacy migration guide](https://www.zetetic.net/sqlcipher/sqlcipher-for-android-migration/)
  identifies `sqlcipher-android` as the replacement artifact.
- [The legacy repository](https://github.com/sqlcipher/android-database-sqlcipher)
  states that `android-database-sqlcipher` is deprecated and no longer updated.
- [Maven Central](https://central.sonatype.com/artifact/net.zetetic/sqlcipher-android/4.17.0)
  records the 4.17.0 Community artifact and its source project.

This is current technical evidence, not a claim that a library guarantees the
application's security or compliance.

## Implemented proof

- Room 2.x uses SQLCipher through `SupportOpenHelperFactory`; no generated API
  model becomes a Room entity. A read-transaction regression, built with the
  module's minimum SDK set to 23 and executed on API 31, exercises the
  compatibility path that failed in earlier SQLCipher releases.
- A random 256-bit database passphrase is wrapped with an Android Keystore AES
  key using AES-GCM, versioned associated data and a bounded envelope format.
  The authenticated envelope records `PENDING` until the first eager database
  open succeeds, then transitions atomically to `INITIALIZED`.
- The key envelope and encrypted database live together below
  `noBackupFilesDir`, preventing an automatic restore of ciphertext without its
  device-bound Keystore key.
- Envelope installation and state transition use collision-safe same-directory
  temporary files, file and directory synchronisation, and atomic rename.
- Opening is eager. The caller receives either a working encrypted Room handle
  or a typed unavailable reason; a failed open is never treated as a fresh
  database.
- The full key/envelope/first-database-open transition is serialised per local
  database path. After authenticating the envelope, an initialized store must
  have a non-empty regular primary database; a missing or zero-length primary
  fails closed even if a sidecar remains.
- If a first-open interruption leaves only the app-owned wrapping-key alias,
  with no envelope or database footprint, the next open reuses that key to
  finish empty-store initialization. Any database footprint still fails closed
  when its envelope is absent.
- Database and outbox writes share one Room transaction. The schema 1 to 2
  migration adds a nullable recorded-outcome field while preserving the
  fictional job pack and pending mutation.
- There is no `fallbackToDestructiveMigration`, key regeneration, database
  deletion or automatic cleanup path when any database footprint exists.
- SQLCipher Java-client logging is disabled through its no-op logger. Native
  and core logging controls remain an adoption review item. The passphrase
  buffer is overwritten when the Room handle closes or opening fails.
- Room schema JSON and the resolved Gradle graph are committed. The check gate
  regenerates schema history into a temporary directory and byte-compares it
  with the committed files. The build also fails if the abandoned legacy
  SQLCipher artifact resolves.

Device authentication remains an application lock concern from D-014. The
spike does not bind the database-wrapping key directly to biometric enrolment,
which could permanently invalidate an authentication-bound Keystore key. That
policy and user flow belong with 2D-06 rather than this storage mechanism.

## Failure and recovery behavior

| Condition | Recorded local result | Automatic mutation |
| --- | --- | --- |
| No database, envelope or alias | Initialise one device-bound key and encrypted database | Creates only the new empty spike store |
| Wrapping-key alias exists, but no database or envelope | Reuse the existing key and finish empty-store initialization | Creates only the new empty spike store |
| Database exists, envelope missing | `KEY_MATERIAL_MISSING` | None |
| Envelope exists, alias missing | `KEYSTORE_KEY_MISSING` | None |
| Envelope malformed or replacement key cannot authenticate it | `KEY_MATERIAL_INVALID` | None |
| Keystore operation fails | `KEY_ACCESS_FAILED` | None |
| Authenticated initialized envelope exists, primary database missing or empty | `DATABASE_MISSING` | None |
| Cipher/Room open or migration fails | `DATABASE_OPEN_FAILED` | No delete or destructive migration |

A permanently lost Keystore key cannot decrypt the local SQLCipher passphrase.
The proven recovery behavior is therefore fail closed: lock access, retain the
encrypted database and surface a recovery-required state. It would be false to
claim that preserving the ciphertext makes it decryptable. Authorised recovery
or upload of unsynchronised evidence after revocation/device failure remains
G-05/2D-06 work and must be designed before partner data.

## Validation evidence

On 2026-08-16 the scoped non-device gate passed again after the bounded review
corrections:

```sh
tools/android-storage-spike.sh --check
```

It regenerated and compared Room schema history, compiled the debug library and
instrumentation APK, ran Android lint, checked the locked dependency graph and
rejected the abandoned-artifact condition.

The Android runtime gate also passed again on a Pixel 5 API 31 x86_64 emulator:

```sh
tools/android-storage-spike.sh --instrumented
```

All fourteen instrumentation tests passed:

1. encrypted job-pack/outbox restart;
2. encrypted Room schema 1 to 2 migration;
3. ciphertext header/content and framework-SQLite rejection;
4. Room read transactions through the SQLCipher adapter on API 31, with the
   module's minimum SDK set to 23;
5. missing Keystore alias with unchanged database hashes;
6. missing envelope with unchanged database hashes;
7. corrupt envelope with unchanged database hashes;
8. replacement key rejected with unchanged database hashes;
9. injected Keystore provider failure returned `KEY_ACCESS_FAILED` without a
   database or envelope;
10. interrupted envelope installation left an alias without evidence, then a
   restart reused the alias to create a restartable encrypted empty store;
11. missing initialized primary with a remaining sidecar returned
   `DATABASE_MISSING` without creating a replacement or changing either file;
12. zero-length initialized primary returned `DATABASE_MISSING` without
    modification;
13. tampered authenticated initialization state returned
    `KEY_MATERIAL_INVALID` before database-state evaluation; and
14. concurrent first opens produced one restartable encrypted store.

The root gate is:

```sh
tools/verify.sh
```

The complete root gate passed after the final corrections.

## Independent review

Two independent correction reviews covered the full uncommitted proof and the
related bounded PDF lock-wait repair. Findings were fixed for committed Room
schema drift detection, same-connection PDF deadline cleanup, typed Keystore
and native-library failures, temporary-schema cleanup and accurate repository
scope descriptions. A fresh closure review then reported no actionable
findings. `2D-05` is Done and the technical G-04 gate is closed.

A separate closure audit on 2026-08-16 found an untyped Keystore provider
failure path, fictional instrumentation-test artifacts, stale architecture
summaries and an over-broad logging claim. The bounded corrections added the
eighth provider-failure test and guarded fictional-data cleanup, aligned the
authoritative summaries with D-023 and narrowed the logging claim. The scoped
checks, eight API 31 tests and root gate passed; a fresh independent reviewer
then reported no actionable findings.

A further independent audit on 2026-08-16 found that partial database-file loss
could be masked by empty database recreation and that concurrent first opens
could race key/envelope initialization. The bounded correction authenticated
the database-initialization state inside the envelope, failed closed on a
missing initialized database, serialized initialization per database path and
added runtime regressions. A fresh re-review identified sidecar-only,
zero-length-primary and pre-authentication typing gaps; the second correction
requires an authenticated initialized envelope plus a non-empty regular primary
database. The twelve-test suite and both local gates passed again; a final fresh
review reported no actionable findings.

A follow-up independent audit on 2026-08-16 found that an interruption between
Keystore alias generation and envelope installation permanently stranded an
otherwise empty store. The bounded correction reuses the existing wrapping key
only when neither an envelope nor database footprint exists; evidence-bearing
states retain their fail-closed behavior. The scoped gate, thirteen API 31
tests and complete root gate passed. A fresh re-review found no implementation,
security, concurrency, typing or regression-test issue and requested only this
chronology clarification.

## Abandoned-library risk and exit triggers

The maintained library is still a third-party native dependency. Room 3.0 has
already replaced the support-open-helper configuration seam with a
`SQLiteDriver`, and no SQLCipher Room 3 driver has been proved here. Adoption
therefore requires all of these controls:

- keep the cipher behind the app-owned opener rather than importing it into
  entities or DAOs;
- retain the build-time ban on `android-database-sqlcipher`;
- review SQLCipher, SQLite and Room release/security notes at each dependency
  update and before a pilot release;
- review Java-client and native/core logging controls before product adoption;
- run migration, restart and key-loss instrumentation tests on the minimum API,
  a current API, and supported production ABIs when the product app is
  scaffolded;
- test a 16 KiB-page device image before Play distribution; and
- pause adoption if maintained Community releases, Room integration, required
  ABI/page-size support or acceptable licensing cease. A replacement must pass
  the same opener and evidence-preservation contract.
- remain on the proved Room 2.x boundary until a maintained Room 3-compatible
  cipher driver passes the same migration, restart, read-transaction and
  key-loss suite; do not treat the Room 3 support wrapper as an encryption
  driver.

The proof does not make a support SLA, FIPS, hardware-backed-on-every-device,
backup recovery or professional security-certification claim.
