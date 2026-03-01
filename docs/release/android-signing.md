# Android release signing

To build a release AAB/APK you must configure a keystore and signing config.

## 1. Create a keystore (one-time)

```bash
keytool -genkey -v -keystore cellardebt-release.keystore -alias cellardebt -keyalg RSA -keysize 2048 -validity 10000
```

Store the keystore file and passwords securely. **Do not commit the keystore to the repo.**

## 2. Local build (gradle)

Create `android/keystore.properties` (add to `.gitignore`):

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=cellardebt
storeFile=../cellardebt-release.keystore
```

In `android/app/build.gradle`, add inside `android { }`:

```groovy
signingConfigs {
    release {
        def keystorePropertiesFile = rootProject.file("keystore.properties")
        if (keystorePropertiesFile.exists()) {
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

Then run:

```bash
npm run mobile:sync
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

## 3. CI (GitHub Actions)

Store secrets in the repo or environment:

- `ANDROID_KEYSTORE_BASE64` — base64-encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The workflow decodes the keystore, writes `keystore.properties`, and runs the release build. See `.github/workflows/android-release.yml`.

## 4. Play App Signing (recommended)

When you upload the first AAB, opt in to **Play App Signing**. Google holds the app signing key; you upload keys (or use the upload key). This allows key rotation and is required for new apps in many cases.
