# MyanRena Android release signing

The Android application ID is **com.myanrena.game**. Keep this value unchanged after the first public APK is distributed; Android uses both the application ID and signing certificate to determine whether an APK can update an existing installation.

## Create the release keystore once

Run this on a trusted computer with a JDK installed. Keep the generated keystore and its passwords in a secure offline backup. Do not commit the keystore or passwords to Git.

```bash
keytool -genkeypair -v \
  -keystore myanrena-release.jks \
  -alias myanrena \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000
```

Back up `myanrena-release.jks` in at least two secure locations. Losing it can prevent future APKs from updating installations signed with that key.

## Configure GitHub Actions secrets

In the repository settings, add these Actions secrets:

- `ANDROID_KEYSTORE_BASE64`: Base64-encoded contents of the JKS file.
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password.
- `ANDROID_KEY_ALIAS`: `myanrena` (or the alias chosen above).
- `ANDROID_KEY_PASSWORD`: Password for that key alias.

Create the Base64 value locally:

```bash
base64 -w 0 myanrena-release.jks
```

On macOS, use `base64 < myanrena-release.jks | tr -d '\\n'`.

Never paste the keystore or passwords into chat, commit them, or put them in workflow source.

## Build

Open **Actions → Build MyanRena Android APK → Run workflow**. Supply a version name and a positive, monotonically increasing version code.

- The Debug APK is built on every successful run.
- A signed Release APK is built only after all four signing secrets are configured.
- Before public distribution, install the signed APK on a test device and verify the application ID and signing certificate. The same release keystore must be used for every future update.

## Phase boundary

The current Android wrapper still loads the approved HTTPS website URL and uses the built web assets as its local error fallback. This is not yet the offline-first local UI / OTA implementation; that work is reserved for the later local-bundle and OTA phases.
