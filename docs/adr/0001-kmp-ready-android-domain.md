# Keep Android field domain as Kotlin/JVM and defer KMP

The prototype field client is Android-only (D-017), but a later iOS app is
expected. Sharing a Kotlin Multiplatform module now would reopen the Room /
SQLCipher / WorkManager / Retrofit proofs before any iOS product exists.
D-026 therefore keeps field rules in a Kotlin/JVM `:domain` module with no
Android or JVM-only I/O APIs, and defers the KMP plugin, iOS targets and UI
sharing until iOS is an owner-approved product.

## Considered options

- Adopt KMP for domain in `3A-01`: pays Gradle, client and persistence tax
  with no second client.
- Put workflow rules in `:app` with Room and Compose: cheap now, expensive to
  extract.
- Framework-free JVM `:domain` now, convert to `commonMain` later: chosen.

## Consequences

OpenAPI remains the Android / web / future-iOS wire contract. NestJS remains
the server domain. `3A-01` must create `apps/android/domain` as
`org.jetbrains.kotlin.jvm`. Constraints: `docs/architecture/ANDROID_DOMAIN_BOUNDARY.md`.
