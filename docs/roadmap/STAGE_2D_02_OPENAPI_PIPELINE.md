# 2D-02 OpenAPI Pipeline and Runtime Pinning

Status: **implementation complete; independent review pending**, 2026-08-10
(D-021)

## Objective

Prove the highest-risk application boundary before domain implementation:
NestJS code generates one reviewed wire contract, and that contract generates
clients that compile for both native Android and Next.js. The proof also makes
tool versions reproducible without requiring every developer or agent to adopt
one runtime manager.

This ticket may create a minimal NestJS application/health response and the
contract-generation machinery. It must not add inspection domain features,
cloud infrastructure, authentication or provider SDKs.

## Proposed contract pipeline

### 1. Generate from NestJS

- NestJS routes and DTOs remain the only source of truth.
- Use `@nestjs/swagger` and its CLI plugin for code-first schema generation.
- A dedicated non-listening script creates the application context, calls
  `SwaggerModule.createDocument()` and exits without requiring a database,
  network service or production secret.
- Write deterministic OpenAPI 3.0 JSON to
  `contracts/openapi/v1/openapi.json`.
- Check the artifact into Git and review every change in the same pull request
  as its NestJS source.

JSON is proposed instead of YAML because NestJS produces a serialisable object
directly and stable serialization makes drift checks less noisy. It remains
human-readable and can be rendered as API documentation later.

### 2. Lint the artifact

Use a pinned Redocly CLI development dependency with a checked-in
`contracts/openapi/redocly.yaml`. Begin with its recommended rules, then record
any project-specific override with a reason. An ignore file cannot be generated
or expanded merely to make CI pass.

### 3. Generate both clients

Use a pinned `@openapitools/openapi-generator-cli` development dependency and
checked-in generator configuration:

- Kotlin: `kotlin` generator, proving the `jvm-retrofit2`, coroutines and
  `kotlinx_serialization` combination under `clients/kotlin/`;
- TypeScript: stable `typescript-fetch` generator under `clients/typescript/`.

Generated files are committed but never edited manually. Kotlin generation
must not produce Room entities; API models remain separate from Android local
and domain models. The proof fails if either generated client does not compile.
If the proposed Kotlin combination fails, the ticket returns to technical
review rather than silently switching libraries or customising templates.
The proof schema must exercise an enum and a nullable field. Polymorphic wire
models are outside the current MVP contract; introducing `oneOf`, `anyOf` or a
discriminator requires a separate generator proof and technical review first.

### Known deterministic-generation risk

Byte-stable output is an acceptance risk, not an assumption. OpenAPI Generator
may vary property/import ordering or emit changing metadata such as timestamps.
The proof must run generation twice from the same inputs and compare every
artifact. Resolve instability first through exact generator pinning and
documented generator sorting/hide-timestamp options. Any deterministic
post-processing must be narrow, reviewed and tested; it must not rewrite
contract meaning or hide genuine generator changes.

Add a root `.gitattributes` entry marking `clients/**` as
`linguist-generated=true` so GitHub can collapse generated boilerplate while
reviewers focus on the NestJS and OpenAPI source changes. Generated clients
remain committed and reviewable despite that presentation hint.

### 4. Detect drift and incompatible changes

`tools/contracts.sh --check` must:

1. regenerate the OpenAPI document in a temporary directory;
2. lint it;
3. regenerate both clients using pinned configuration;
4. repeat generation and fail if identical inputs are not byte-stable;
5. compile both generated clients;
6. fail if generated results differ from committed artifacts; and
7. compare the proposed OpenAPI artifact with the default-branch artifact and
   fail on an incompatible API change.

Use a pinned OpenAPITools `openapi-diff` CLI artifact for the compatibility
check. It runs on the same JDK already required for Android/OpenAPI Generator,
avoiding an extra Go or Docker runtime. An intentional incompatible change
requires an explicit versioning decision and technical review; an agent cannot
waive the check by editing an ignore list.

## Runtime-pinning strategy

Use repository-owned, tool-manager-neutral declarations:

| Runtime/tool | Pinning source |
| --- | --- |
| Node.js | Exact version in root `.node-version`; mirrored by CI setup and checked by `tools/bootstrap.sh`. |
| Java/JDK | Exact Temurin version in root `.java-version`; CI installs that version and `tools/bootstrap.sh` requires an exact match. Security updates are deliberate reviewed pin changes. |
| pnpm | Exact version in root `package.json#packageManager`, with one root `pnpm-lock.yaml`. |
| Gradle | Checked-in Android Gradle Wrapper, exact distribution URL and `distributionSha256Sum`. |
| Contract tools | Exact development-dependency/artifact versions and checksums where applicable. |

Do not require mise, asdf, nvm, jenv or a globally bundled Corepack. Developers
may use any manager that honours the declarations. CI explicitly installs the
declared Node.js, JDK and pnpm versions. `tools/bootstrap.sh` validates those
versions before running a frozen-lockfile installation; it does not silently
upgrade a runtime or package manager.

The proof selects exact versions compatible with the current NestJS, Next.js,
Android Gradle Plugin and OpenAPI tools, records them in generated lock/wrapper
files and reports them in the ticket handoff.

## Minimal proof

The smallest useful proof contains:

- one non-domain health route with a typed response DTO;
- OpenAPI generation that does not start a listening server;
- one lint configuration;
- one committed Kotlin client and one committed TypeScript client;
- a `.gitattributes` generated-code marker for both clients;
- compile checks for both clients;
- a repeated-generation determinism test;
- a test that catches uncommitted generated drift; and
- a fixture proving that the compatibility check rejects a breaking response
  change.

## Ownership and handoff

- Primary agent type: backend/contract builder.
- Review agent types: independent API reviewer and Android build reviewer.
- Owner approval: toolchain and runtime-pinning strategy in this document.
- Estimate: one to two days for the proof, including client compilation and CI
  drift/breaking-change tests.
- Handoff: generated artifact, client configuration, validation output, exact
  versions and any generator limitations discovered.

## Acceptance scenarios

`2D-02` is complete when:

- the owner approves this pipeline;
- NestJS is demonstrably the source of the checked-in artifact;
- generation requires no database, cloud account or production secret;
- both committed clients regenerate deterministically and compile;
- generated client diffs are marked as generated without being excluded from
  review;
- lint, drift and incompatible-change checks fail on controlled bad fixtures;
- runtime declarations and bootstrap checks agree with CI; and
- `tools/verify.sh` can invoke the complete contract check non-interactively.

## Evidence basis

- NestJS documents generation from routes/DTOs and saving the resulting
  serialisable OpenAPI object as JSON or YAML:
  <https://docs.nestjs.com/openapi/introduction>.
- OpenAPI Generator documents stable Kotlin and `typescript-fetch` client
  generators and a pin-able CLI development dependency:
  <https://openapi-generator.tech/docs/generators/kotlin/>,
  <https://openapi-generator.tech/docs/generators/typescript-fetch/> and
  <https://openapi-generator.tech/docs/installation/>.
- Redocly documents checked configuration and CI-failing OpenAPI lint:
  <https://redocly.com/docs/cli/commands/lint>.
- Gradle recommends committing and using the Wrapper and supports a
  distribution checksum:
  <https://docs.gradle.org/current/userguide/gradle_wrapper.html>.
- OpenAPITools `openapi-diff` detects incompatible OpenAPI 3.x changes:
  <https://github.com/OpenAPITools/openapi-diff>.

## Proof result

The bounded proof is implemented with Node.js 24.18.0, Temurin JDK 21.0.11,
pnpm 11.4.0, OpenAPI Generator 7.22.0, Redocly CLI 2.46.0, Gradle 8.14.3 and
OpenAPI-diff 2.1.7. `tools/contracts.sh --check` passed locally on 2026-08-10:

- two independent generations were byte-identical and matched the committed
  OpenAPI and client artifacts;
- Redocly lint passed;
- the generated TypeScript and Kotlin clients compiled;
- the Kotlin `kotlinx_serialization` model compiled with enum, date-time and
  nullable string fields; and
- the controlled breaking-change fixture was rejected.

`.github/workflows/contracts.yml` runs the root verification command and, on
pull requests, compares the proposed artifact with the base-branch artifact.
The first change that introduces the artifact has no base contract to compare;
subsequent pull requests cannot bypass that comparison through an ignore list.

### Discovered limitations

- OpenAPI Generator's generated Gradle Wrapper JAR did not match Gradle's
  published wrapper checksum. Generated wrapper files are therefore excluded;
  the proof uses a repository-owned helper that downloads the pinned Gradle
  distribution and verifies its published checksum. The real Android Wrapper
  remains a reviewed `3A-01` artifact.
- The generated Kotlin project compiles but emits deprecation warnings for
  `-Xopt-in`, a Java URL constructor and Gradle features that will not be
  compatible with Gradle 9. These do not block the pinned Gradle 8.14.3 proof,
  but generator upgrades must re-run the build review.
- Polymorphic OpenAPI models have not been proven and are not authorised for
  the MVP contract without a separate compile proof and technical review.

## Approved decision

The owner approved the code-first JSON artifact, pinned Redocly/OpenAPI
Generator/OpenAPI-diff pipeline, proposed Kotlin and TypeScript generators and
tool-manager-neutral runtime declarations, with the deterministic-generation
risk and `.gitattributes` safeguard added (D-021). Implementation is ready for
the required independent API and Android build review.
