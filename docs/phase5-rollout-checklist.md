# Phase 5 Rollout Checklist

Use this checklist to roll out Phase 5 safely with feature flags and observability.

## Implementation (Firebase)

- [x] Firebase client module and env template (`.env.example`, `src/services/firebase/firebaseClient.ts`).
- [x] Firebase providers: Auth, Save, Analytics, StoryPackage (`src/services/providers/firebaseProvider.ts`).
- [x] Provider factory selects Firebase when `cloudSave` is true and Firebase env is set (`src/services/providers/providerFactory.ts`).
- [x] Firestore security rules (`firestore.rules`): per-user saves, analytics write/read, story_packages read-only.
- [x] Cloud save: reconcile pull from cloud, conflict resolution rehydration, delete parity, observability (`src/services/saveRepository.ts`, `src/utils/storage.ts`, `src/services/phase5Diagnostics.ts`).
- [x] Shared outcomes: allowlist, PII stripping, flush guard, stats UI (`src/services/analyticsClient.ts`, `OutcomeStatsPanel.vue`).
- [x] Story package: sanitization (incl. node/choice ids), preflight blocks commit, asset validation (`scripts/data-core/package-schema.js`, `scripts/authoring-server-plugin.js`).
- [x] `npm run build`, `npm run authoring:build`, and `npm run test` pass. Manual smoke test (sign in, save, conflict resolve) should be run with a real Firebase project and `features.cloudSave: true`.

See README section **Firebase (Phase 5 cloud features)** for env setup and deployment steps.

## Feature Flags

- `GAME_CONFIG.features.cloudSave` enabled in dev only.
- `GAME_CONFIG.features.sharedOutcomes` enabled in dev only.
- `GAME_CONFIG.features.storyPackages` enabled in dev only.
- Promote flags to staging after QA pass.
- Enable in production gradually (internal users -> sampled users -> full rollout).

## Cloud Save Readiness

- Anonymous mode works without sign-in.
- Sign-in enables cloud sync and does not block gameplay.
- Local save + cloud save divergence triggers conflict resolution UI.
- `use_local`, `use_cloud`, and `keep_both` flows behave correctly.
- Offline writes queue and replay once authenticated.

## Shared Outcomes Readiness

- Only allowlisted events are emitted.
- Session aggregation uploads summary payloads.
- Outcome stats render with sample size and percentage.
- No PII present in analytics payloads.

## Story Package Readiness

- Export package endpoint returns manifest + model.
- Import preflight reports diagnostics without writing files.
- Import commit writes CSV files only when diagnostics have no errors.
- Sanitization strips script payloads from text fields.
- Asset magic-number validation rejects unsupported binary signatures.

## Observability Signals

- Sync failure rate: `getPhase5Diagnostics().syncFailures` (see `src/services/phase5Diagnostics.ts`). In dev, `window.__phase5_diagnostics()`.
- Conflict frequency: `getPhase5Diagnostics().conflictCount`.
- Analytics ingest errors: `getPhase5Diagnostics().analyticsIngestErrors`.
- Package import failure reasons: API response `diagnostics` when `committed: false`; server logs `[phase5] package import not committed:` with messages.

## Production Gate

- [x] `npm run build` passes.
- [x] `npm run authoring:build` passes.
- [x] `npm run test` passes.
- [x] Manual smoke test: menu -> sign in -> play -> save -> quit -> relaunch -> conflict resolve (run with Firebase configured and `cloudSave: true`).

**Phase 5 closed.** All implementation and gates complete. Rollout (feature flags, staging, production) remains at team discretion.

