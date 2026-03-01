# Phase 6 checklist

Phase 6 covers PWA support, app-store readiness, and consent-first telemetry. Items **6.2** (Electron Desktop) and **6.4** (i18n) are **deferred** as future improvements.

## In-scope (6.1, 6.3, 6.5)

### 6.1 PWA support

- [x] Add `vite-plugin-pwa` and configure in `vite.config.ts` (registerType: prompt, manifest, workbox)
- [x] Manifest with name, short_name, theme_color, icons (192, 512)
- [x] Service worker registration; update prompt component `PwaUpdateNotice.vue`
- [x] Offline caching for static assets and game shell
- [x] Test: PWA registration / manifest presence; build produces `manifest.webmanifest` and `sw.js`
- [ ] Manual: Installable PWA in Chromium; offline reload; update flow

### 6.3 App store releases

- [x] Release kit docs: `docs/release/mobile-assets-checklist.md`, `docs/release/store-metadata-template.md`
- [x] Android signing guide: `docs/release/android-signing.md`
- [x] iOS signing guide: `docs/release/ios-signing.md`
- [x] npm scripts: `mobile:sync`, `mobile:android:release`, `mobile:ios:archive`
- [x] CI: `.github/workflows/android-release.yml`, `.github/workflows/ios-release.yml`
- [ ] Manual: Add/store app icons and splash per platform; configure signing; produce signed AAB and iOS archive

### 6.5 Analytics and telemetry

- [x] Consent store `telemetryConsentStore.ts` and banner `TelemetryConsentBanner.vue`
- [x] Analytics gated on consent in `analyticsClient.ts`
- [x] Extended event types: `node_visit`, `choice_selected`, `combat_outcome`
- [x] Instrumentation in NarrativeView and App (combat outcome)
- [x] Author dashboard `TelemetryDashboard.vue` in MainMenu
- [x] Privacy policy: `docs/privacy/telemetry-policy.md`, `public/privacy/telemetry-policy.html`
- [x] Opt-out / withdraw consent flow
- [x] Tests: consent gating, event schema, telemetryConsentStore

---

## Deferred (future improvements)

### 6.2 Electron Desktop Build

**When to revisit:** Need for desktop distribution (e.g. Steam, itch.io) or offline-first desktop users.

**Backlog criteria:**

- Decide runtime: Electron vs Tauri (bundle size, auto-update, native APIs).
- Plan filesystem save migration (replace or mirror localStorage).
- Define auto-update strategy (e.g. electron-updater, Tauri updater).

### 6.4 Internationalization (i18n)

**When to revisit:** Need for non-English markets or community translations.

**Backlog criteria:**

- Choose i18n strategy: CSV schema (e.g. `text_en`, `text_es`) vs separate locale files.
- Define RTL acceptance criteria and layout handling.
- Design language-switch UX (menu, persistence, reload behavior).

---

## Phase 6 gates (done when in-scope items are complete)

- [x] `npm run build` passes with PWA assets generated
- [x] `npm run test` passes with telemetry/consent coverage
- [ ] Android signed release artifact produced (CI or local with signing configured)
- [ ] iOS archive / TestFlight-ready artifact produced (CI or local)
- [x] Consent flow and privacy-safe telemetry verified
- [x] 6.2 and 6.4 marked deferred in ROADMAP and this checklist
