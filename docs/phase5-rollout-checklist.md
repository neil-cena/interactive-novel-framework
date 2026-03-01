# Phase 5 Rollout Checklist

Use this checklist to roll out Phase 5 safely with feature flags and observability.

## Implementation (Firebase)

- [x] Firebase client module and env template (`.env.example`, `src/services/firebase/firebaseClient.ts`).
- [x] Firebase providers: Auth, Save, Analytics, StoryPackage (`src/services/providers/firebaseProvider.ts`).
- [x] Provider factory selects Firebase when `cloudSave` is true and Firebase env is set (`src/services/providers/providerFactory.ts`).
- [x] Firestore security rules (`firestore.rules`): per-user saves, analytics write/read, story_packages read-only.
- [x] `npm run build` and `npm run test` pass. Manual smoke test (sign in, save, conflict resolve) should be run with a real Firebase project and `features.cloudSave: true`.

See README section **Firebase (Phase 5 cloud features)** for env setup and deployment steps.

## Feature Flags

- [ ] `GAME_CONFIG.features.cloudSave` enabled in dev only.
- [ ] `GAME_CONFIG.features.sharedOutcomes` enabled in dev only.
- [ ] `GAME_CONFIG.features.storyPackages` enabled in dev only.
- [ ] Promote flags to staging after QA pass.
- [ ] Enable in production gradually (internal users -> sampled users -> full rollout).

## Cloud Save Readiness

- [ ] Anonymous mode works without sign-in.
- [ ] Sign-in enables cloud sync and does not block gameplay.
- [ ] Local save + cloud save divergence triggers conflict resolution UI.
- [ ] `use_local`, `use_cloud`, and `keep_both` flows behave correctly.
- [ ] Offline writes queue and replay once authenticated.

## Shared Outcomes Readiness

- [ ] Only allowlisted events are emitted.
- [ ] Session aggregation uploads summary payloads.
- [ ] Outcome stats render with sample size and percentage.
- [ ] No PII present in analytics payloads.

## Story Package Readiness

- [ ] Export package endpoint returns manifest + model.
- [ ] Import preflight reports diagnostics without writing files.
- [ ] Import commit writes CSV files only when diagnostics have no errors.
- [ ] Sanitization strips script payloads from text fields.
- [ ] Asset magic-number validation rejects unsupported binary signatures.

## Observability Signals

- [ ] Sync failure rate metric available.
- [ ] Conflict frequency metric available.
- [ ] Analytics ingest error count available.
- [ ] Package import failure reasons logged and queryable.

## Production Gate

- [x] `npm run build` passes.
- [x] `npm run authoring:build` passes.
- [x] `npm run test` passes.
- [ ] Manual smoke test: menu -> sign in -> play -> save -> quit -> relaunch -> conflict resolve (run with Firebase configured and `cloudSave: true`).
