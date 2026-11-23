# Android Field Domain Boundary

Status: **accepted** (D-026). Canonical for product Android scaffolding from
`3A-01`. Kotlin Multiplatform (KMP) is deferred until a native iOS field app is
an owner-approved product; this document keeps that extraction cheap.

The approved field client remains native Android (D-017). NestJS-generated
OpenAPI remains the cross-platform wire contract. Do not introduce an iOS app,
the `org.jetbrains.kotlin.multiplatform` plugin, Compose Multiplatform, or a
repository-root `shared/` module until that later decision.

## Layers

Product Android code uses three layers. The bounded `apps/android/storage-spike/`
proof is not a fourth product layer and must not be copied as the application
shape.

| Layer            | Gradle module (`3A-01`)                 | Allowed to know                                                           |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| Field domain     | `:domain` under `apps/android/domain`   | Kotlin types, invariants, state machines, ports                           |
| Android adapters | `:app` and `:data` under `apps/android` | Room, SQLCipher, Keystore, WorkManager, CameraX, generated OpenAPI client |
| UI               | `:app`                                  | Jetpack Compose, navigation, Android resources                            |

`:domain` must not depend on `:app`, `:data`, `clients/kotlin`, Room, or any
Android library. Adapters depend on domain and map in both directions.

Server workflow, tenancy, review, snapshots and draft reports stay in NestJS.
The field domain owns only rules that must run on the device: local-first
capture, outbox identity, photo association, sync gates, conflict
classification, and offline-authorisation lease lock versus evidence
preservation (D-025).

## `:domain` module shape

`3A-01` creates `:domain` as a **Kotlin/JVM library**:

- Apply `org.jetbrains.kotlin.jvm`. Do not apply `com.android.library`,
  `com.android.application`, or `org.jetbrains.kotlin.multiplatform`.
- Source sets stay `src/main/kotlin` and `src/test/kotlin`.
- Package names must not include `android` (use `au.com.heightsafety.domain`).
- Unit tests run on the JVM with no Android SDK, emulator, or instrumented
  runner.

When iOS becomes an approved product, convert this module by changing the
plugin to Kotlin Multiplatform, moving sources to `commonMain` / `commonTest`,
and adding iOS targets. Room, WorkManager, CameraX and Keystore stay in
Android adapters. iOS gets its own adapters. UI is not shared.

## Allowed and forbidden in `:domain`

Allowed:

- Kotlin standard library
- `kotlinx-coroutines-core` (common artifact, not Android)
- `kotlinx-datetime` for civil time and instants
- `kotlinx-serialization-core` only for domain-owned serialisable types, not
  as a substitute for OpenAPI models
- Constructor-injected ports (interfaces) for clock, identifiers, job-pack
  storage, photo bytes, and outbox persistence
- JVM unit tests (`kotlin-test` or JUnit)

Forbidden:

- `android.*`, `androidx.*`, Jetpack Compose, Room, WorkManager, SQLCipher,
  CameraX, Android Keystore
- Generated `clients/kotlin` models or Retrofit/OkHttp
- `java.io.File`, `java.nio.file`, `java.net`, JDBC, `java.time`
- Expect/actual declarations (they exist only after KMP is adopted)
- Logging, dispatchers, or random/clocks that call Android or JVM-only APIs
  directly; inject them

Room entities, SQLCipher passphrases, WorkManager workers and Retrofit DTOs
are adapter types. Map them to domain types at the adapter boundary. Generated
API models do not become Room entities (already required by the Stage 2C
blueprint).

## What later KMP will not share

These remain Android-specific even after a KMP conversion:

- Encrypted Room + SQLCipher + Keystore (`2D-05` / D-023)
- WorkManager outbox drain
- CameraX capture
- Compose UI

Do not replace Room with SQLDelight, or Retrofit with Ktor, "to be ready".
Those are separate decisions when iOS work starts. The JVM OpenAPI client stays
the Android wire adapter until a KMP or Swift client is explicitly chosen.

## Existing proofs

- `apps/android/storage-spike/` remains the G-04 encryption proof. Product
  persistence may reuse its approach inside an Android adapter, not inside
  `:domain`.
- `tools/offline-lease/` remains the D-025 specification machine. Product
  lease transitions are reimplemented as JVM tests in `:domain` when `3C-04`
  lands; do not call Node from the Android app.

## `3A-01` acceptance for this boundary

The Android product scaffold is incomplete unless:

- `settings.gradle.kts` includes `:domain` as a Kotlin/JVM module;
- `:app` depends on `:domain` and contains no field workflow rules that belong
  in domain;
- `:domain` compiles and its unit tests pass without the Android plugin or
  `android.jar` on the compile classpath; and
- no KMP plugin, iOS target, or repository-root shared module is added.
