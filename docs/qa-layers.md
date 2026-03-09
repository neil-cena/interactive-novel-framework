# QA layers and profiles

This project uses **layered** quality checks. Each layer answers a different question; results must not be conflated.

## Layers

| Layer | Question | Typical tooling |
|-------|----------|-----------------|
| **validate** | Are CSV rows well-formed and references consistent? | `validateData`, duplicate-ID checks (`lint-data`) |
| **graph** | Orphans, dead ends, release topology vs `RELEASE_GRAPH_OPTIONS`? | `analyzeGraph` (via `lint-data`) |
| **structural** | Exhaustive walk over structural transitions (ignores choice visibility)? | `runStructuralQa` |
| **narrative** | Prose/tokens/authoring-only checks (planned extension) | Orchestrator stage `narrative` (stub today) |

**Structural** results are **not** full “playability under flags/inventory”; they are **visibility-blind** by design unless a future checker explicitly models state.

## Exhaustiveness (`exhaustiveness` field)

- **`preflight`** — Fast gate; does **not** claim exhaustive structural enumeration. Used for **`ci-pr`**.
- **`release`** — Reserved for a profile that matches shipping bar (to be aligned with team policy).
- **`full`** — Intended maximum automated depth for this repo (e.g. **`nightly`**, **`local-full`**), including structural walk when that stage is enabled.

## Resource limits

Structural enumeration uses **step and wall-clock caps**. When a cap trips:

- Profiles declare `resourceLimitSemantics.wallClockExceeded` and `stepBudgetExceeded` as either **`failure`** or **`inconclusive`**.
- **`inconclusive`** means “we stopped early — do not treat as a clean bill of health,” not necessarily “bug in data.”

CI should use **named profiles** with identical caps in authoring vs batch for the same profile id.

## Merging phase outcomes

When combining outcomes from multiple stages, use **`mergeExitOutcomes`** from `scripts/data-core/qa-profiles.js`:

**precedence:** `failure` > `inconclusive` > `pass` (commutative).

## Built-in profile ids

See `QA_PROFILE_IDS` and `getQaProfile()` in `scripts/data-core/qa-profiles.js`.

- **`ci-pr`** — `preflight`; stages `validate`, `graph`, `narrative` (narrative checks stub); **no** `structural`.
- **`nightly`** / **`local-full`** — `full`; includes **`structural`**.

Override profile with `QA_PROFILE=…` or `node scripts/qa-ci.js --profile=nightly`.

## Orchestrator (`runFullProjectQa`)

Disk-based QA runs through `scripts/data-core/qa-orchestrator.js`:

- Loads CSVs once via `runCsvDataPreflight` (shared with `lint-data.js`).
- Applies `resolveGraphOptionsForProfile` so **graph analysis matches** `build:data` / structural QA (`getReleaseGraphAnalyzeOptions()` → release start IDs).
- Merges stage outcomes with `mergeExitOutcomes` from `qa-profiles.js`.

CLI entry: `npm run qa:ci` → `scripts/qa-ci.js` prints envelope `version`, `mergedOutcome`, and per-stage summaries.

## Report envelope

`createQaEnvelope` / `QA_REPORT_ENVELOPE_VERSION` live in `scripts/data-core/qa-envelope.js`. Authoring `POST /api/authoring/qa-exhaustive` includes a small `qaEnvelope` summary (`mergedOutcome` uses `local-full` resource semantics).

## Authoring hardening

- JSON bodies for validate / save / save-draft / import-package are **capped** (see `AUTHORING_JSON_BODY_LIMIT` in `scripts/authoring-server-plugin.js`).
- Set `AUTHORING_API_TOKEN` and send `Authorization: Bearer <token>` on mutating POSTs to require auth in shared environments.
- Save responses return **basenames** only for `written` / `backups`; draft save returns `file` (not an absolute path).

## Dynamic QA stub

`scripts/data-core/qa-dynamic-stub.js` reserves a future bounded-dynamic stage (no subprocess / no shell).

## Static vs dynamic

Batch QA is **static** with respect to runtime player state: the **`validate`** stage (`lint-data`, duplicate IDs, reference checks), the **`graph`** stage (orphans, dead ends, release topology vs `RELEASE_GRAPH_OPTIONS`), and the **structural** walk (`runStructuralQa`) all read CSV-backed data and declared transitions. Unless a future stage explicitly models flags, inventory, or visibility, those layers are **visibility-blind**—they can prove graph hygiene and structural reachability, not “what a given save would see” on the next beat.

**Dynamic** behavior—visible choices, mechanics, saves—belongs to the running app and to focused tests (for example `NarrativeView` and composable tests that drive `applyNarrativeChoice`). Treat batch results as necessary but not sufficient when triaging issues that depend on live state; reproduce in-app or in tests when visibility matters.

## Terminology

In design discussion, a **path** is one continuous narrative run from the wake-up to a **terminal** outcome (death, ending, etc.). Batch QA reports speak in **nodes**, **edges**, and **structural steps**; runtime logs and saves may use other vocabulary (e.g. session buckets) that the pipeline does not interpret.
