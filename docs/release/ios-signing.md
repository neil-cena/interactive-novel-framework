# iOS release signing and distribution

iOS release builds require an Apple Developer account, certificates, and provisioning profiles.

## 1. Apple Developer account

- Enroll at [developer.apple.com](https://developer.apple.com).
- Create an App ID matching your bundle ID: `com.cellardebt.game` (from `capacitor.config.ts` and Xcode project).

## 2. Certificates and profiles

- **Distribution certificate:** In Certificates, Identifiers & Profiles, create an “Apple Distribution” certificate. Download and install it in Keychain.
- **Provisioning profile:** Create a distribution profile for your App ID (e.g. “App Store”) and download it. In Xcode, set the project to use “Automatically manage signing” with your team, or assign this profile manually for Release.

## 3. Xcode project settings

1. Open `ios/App/App.xcworkspace` in Xcode (use the workspace, not the project).
2. Select the **App** target → **Signing & Capabilities**.
3. Choose your **Team** and ensure **Release** uses your distribution profile.
4. Set **Version** (`MARKETING_VERSION`) and **Build** (`CURRENT_PROJECT_VERSION`) for the store.

## 4. Archive and upload

1. Build the web app and sync:
   ```bash
   npm run build
   npm run mobile:sync
   ```
2. In Xcode: **Product → Archive**.
3. In Organizer, **Distribute App** → **App Store Connect** → upload.
4. In App Store Connect, complete the version metadata and submit for review.

## 5. CI (GitHub Actions) — optional

Automated iOS builds typically run on **macos-latest** and require:

- Installed Xcode and CocoaPods.
- Imported distribution certificate and provisioning profile (e.g. from secrets).
- Fastlane or `xcodebuild` + `xcrun altool` for archive and upload.

See `.github/workflows/ios-release.yml` for a workflow that builds the web app, runs `cap sync`, and builds the iOS app (signing must be configured for your runner/certs).

## 6. TestFlight

After uploading a build, use TestFlight in App Store Connect to invite testers before submitting to the store.
