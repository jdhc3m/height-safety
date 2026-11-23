# Android Skills Guideline

This repository uses the official [Android skills](https://github.com/android/skills)
as local guidance for Android implementation, testing and review. The skills are
agent instructions and reference material; they are not product requirements,
runtime dependencies or permission to expand the roadmap.

## Authority and scope

Apply guidance in this order:

1. `AGENTS.md` and the repository's product, requirements, architecture and
   roadmap documents.
2. The applicable Android skill in `skills/<skill-name>/SKILL.md` or
   `.agents/skills/<skill-name>/SKILL.md`.
3. Current Android developer documentation for version-sensitive APIs and
   libraries.

Android skills must not override the product scope, tenant isolation, durable
offline evidence, idempotent synchronisation, photograph association, conflict
visibility, report revision history or auditability requirements. They must not
turn recorded inspection outcomes into certification, automatic compliance or
professional approval.

The product Android foundation is scaffolded under roadmap ticket `3A-01`.
Feature workflow remains deferred to dependency-ordered tickets. The scaffold
includes a Kotlin/JVM `:domain` module
(`docs/architecture/ANDROID_DOMAIN_BOUNDARY.md`). The existing
`apps/android/storage-spike/` is a bounded technical proof, not the product
application.

## Use the matching skill

Use only the skill relevant to the work being done. The most relevant skills for
this repository are:

| Work                                                                           | Skill                     | Guardrail                                                                                                               |
| ------------------------------------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Android CLI, SDK, emulator, UI inspection and current Android docs             | `android-cli`             | Use the CLI and official Android docs; do not create product scaffolding unless the roadmap authorises it.              |
| Native unit, instrumented, database, UI and screenshot tests                   | `testing-setup`           | Preserve the existing stack; prefer fakes; keep device-only database tests where SQLite behaviour matters.              |
| Manifest components, incoming intents, providers, services and `PendingIntent` | `android-intent-security` | Default components to non-exported and `PendingIntent` to immutable; validate every external boundary.                  |
| Compose layouts across phones, tablets and foldables                           | `adaptive`                | Use only after the app's Compose/navigation baseline exists; verify form factors without silently changing product UX.  |
| Camera and inspection-photo capture                                            | `camerax`                 | Treat permissions, lifecycle, hardware diversity, photo identity and offline evidence durability as part of the design. |
| Compose custom component styling                                               | `styles`                  | Experimental API; use only after dependency and adoption review.                                                        |
| Release shrinker and keep-rule review                                          | `r8-analyzer`             | Research/reporting only; validate release behaviour before changing rules.                                              |

Skills for TV, Wear, XR, Play distribution and unrelated Android surfaces are
available upstream but are not automatically applicable to this product.

## Android task workflow

1. Read `docs/roadmap/CURRENT_STATUS.md`, the applicable product and
   architecture documents, and the relevant skill file before changing code.
2. Use `android docs` or another primary Android source for claims that depend
   on a platform or library version.
3. Keep changes small and reviewable. Separate generated API models from Room
   entities and from the Kotlin/JVM field domain (D-026). Preserve the
   encrypted-storage and offline-sync boundaries. Do not put Android APIs,
   Room or Retrofit in `:domain`, and do not add a KMP plugin during `3A-01`.
4. Add the narrowest appropriate tests. Do not replace screenshot references
   automatically; inspect and approve visual changes separately.
5. Run the module checks and the root `tools/verify.sh` gate when the change is
   within their scope. Review `git diff --check` and the complete diff.

## Installation and refresh

The project copy is managed by the Android CLI. From the repository root:

```sh
android --no-metrics skills add --all --project=.
android --no-metrics skills list --long
```

Install one skill with `--skill=<skill-name>` when a full refresh is unnecessary.
Re-running `skills add` refreshes installed skills, so review the diff before
accepting upstream changes. Do not hand-edit the installed upstream skill files;
put repository-specific rules here or in `AGENTS.md`.

The CLI currently places Android skill material in both `skills/` and the
agent-visible `.agents/skills/` tree. Keep the two Android copies synchronised
when refreshing them. Existing non-Android agent skills and their lock file are
separate and must remain intact.

## Upstream

- Source: <https://github.com/android/skills>
- CLI reference: <https://developer.android.com/tools/agents/android-cli>
- The upstream repository is Apache-2.0 licensed; retain its notices when
  redistributing its material.
