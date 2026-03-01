# Mobile release assets checklist

Use this checklist before submitting to app stores.

## Icons and splash

- [ ] **Android** (`android/app/src/main/res/`)
  - `mipmap-*dpi/` launcher icons (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) or use adaptive icons in `mipmap-anydpi-v26/`
  - Optional: `drawable/` splash screen assets
- [ ] **iOS** (`ios/App/App/Assets.xcassets/`)
  - `AppIcon.appiconset/` — all required sizes (e.g. 20, 29, 40, 60, 76, 83.5, 1024 pt)
  - `Splash.imageset/` — splash image if custom
- [ ] **PWA** (`public/icons/`)
  - `icon-192.png`, `icon-512.png` for installable web app

## Store listing

- [ ] Short description (e.g. 80 chars)
- [ ] Full description
- [ ] Category (e.g. Games > Role Playing or Entertainment)
- [ ] Content rating questionnaire completed
- [ ] Screenshots (phone and optionally tablet) — see [store-metadata-template.md](./store-metadata-template.md)
- [ ] Privacy policy URL (e.g. in-app `/privacy/telemetry-policy.html` or external)

## Versioning

- [ ] Bump `version` in `package.json`
- [ ] Android: `versionCode` and `versionName` in `android/app/build.gradle` (or `variables.gradle`)
- [ ] iOS: `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` in Xcode project

## Signing

- [ ] Android: release keystore and credentials — see [android-signing.md](./android-signing.md)
- [ ] iOS: distribution certificate and provisioning profile — see [ios-signing.md](./ios-signing.md)

## Build commands

- `npm run build` — build web app to `dist/`
- `npm run mobile:sync` — copy `dist/` into native projects
- `npm run mobile:android:release` — build signed release AAB (after configuring signing)
- `npm run mobile:ios:archive` — open Xcode to archive (run locally on macOS)
