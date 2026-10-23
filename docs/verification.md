# Verification checkpoint

Verification environment: Windows, using an isolated project directory.

| Check | Observed result |
| --- | --- |
| Node/npm/pnpm | 22.16.0 / 10.9.2 / 10.26.2 |
| JDK | installed JDK 17.0.15 and JDK 21; build uses 17 |
| Android tools | API 36, Build Tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1 present |
| Expo dependency check | Expo 57.0.31 / RN 0.86.3 / React 19.2.3 aligned; passed |
| TypeScript | passed after SDK alignment and repository extraction |
| ESLint | passed with no warnings after cleanup |
| Core tests | 19 passed, including upstream decoder provenance/adversarial performance, EPUB ZIP parsing and directory bounds, safe inline styles, markup depth/stream limits, reading boundary, API response validation, no AI runtime, SQLite reopen/cascade |
| Community integration | 7 passed through real localhost HTTP and SQLite/password modules; ownership, parent-thread block protection, report reopen/moderation history, versioned hashing, hashed tokens, expiry/logout/deletion, UTF-8 and input bounds |
| Android native generation | passed with Expo 57 |
| Expo Doctor | 21/21 passed |
| Android / iOS Hermes export | hardened final-source export passed: Android 1434 modules / 2,886,884 bytes; iOS 1323 modules / 2,648,080 bytes. Output `.private/hardened-export`, including source maps |
| Android APK compilation | failed: 240 tasks on first corrected run, then one cache-preserving retry reached 249 tasks and failed on a second Google Maven TLS handshake. Worklets Kotlin/Java compiled; no APK produced or verified |
| Android emulator/device | existing API 36 AVD started read-only; ADB connected and boot completed; original generated EPUB/PDF fixtures copied for testing. No app installed, launched or visually verified because no APK was produced |
| iOS native generation | attempted; Expo explicitly skipped Windows and requires macOS/Linux |
| iOS compile/device | not run; Windows host has no Xcode |
| Store/signing/public deployment | not performed |

The initial Expo 58 template required API 37. It was replaced with Expo 57/RN 0.86.3 based on the official version table and existing API 36 toolchain. npm peer conflicts were resolved by aligning React, React DOM and every Expo native module together, without force/legacy-peer-deps. A damaged global npm cache was avoided using this project's `.npm-cache`.

Initial restricted localhost tests failed to connect; the same integration suite passed with localhost access. Initial Hermes export failed writing to the default sandbox temporary directory; project-local TEMP/TMP resolved it.

Native build recovery: a PowerShell invocation split an unquoted Gradle property and failed with `Task '.builder.sdkDownload=false' not found`. `scripts/build-android.ps1` now supplies an explicit string argument array. The corrected build is resolving native dependencies using the existing toolchain. A bounded HEAD check against the official Google Maven `androidx.compose.ui:ui-android:1.11.0-beta02` POM returned HTTP 200; no proxy/security settings were changed.

Transport failure endpoint: `https://dl.google.com/dl/android/maven2/androidx/lifecycle/lifecycle-common/2.6.2/lifecycle-common-2.6.2.jar`. Gradle reported `Remote host terminated the handshake` using TLS 1.2/1.3. No certificate bypass, alternate mirror, global SDK installation or proxy change was attempted. The retry was started only after confirming the previous Gradle daemon had exited.

The single retry passed the previous dependency and worklets Kotlin/Java compilation, then failed after 4m 1s at `:expo-modules-core:compileDebugKotlin` while resolving `androidx.compose.foundation:foundation-android:1.7.6`. Exact official endpoint: `https://dl.google.com/dl/android/maven2/androidx/compose/foundation/foundation-android/1.7.6/foundation-android-1.7.6.aar`. Same TLS 1.2/1.3 remote-handshake termination; 249 tasks (14 executed, 235 cached). This is a dependency transport failure, not an identified application Kotlin error. Log: `.private/android-retry.log`. Retry stopped after this explicit exit 1; no approval request is pending. Next native step is to restore reliable access to the official Google Maven endpoint, rerun `scripts/build-android.ps1`, then install and exercise the app. No additional build was started.

After the failed retry, the task-owned Metro process and read-only emulator were stopped. Source, test fixtures, Hermes exports and Gradle caches remain available; no other running application was stopped.

Final source review found a UTF-8 request decoding bug: a Chinese character split across network chunks became replacement characters. The added HTTP test reproduced the failure. Buffering the bounded request body before decoding fixed it; invalid non-object JSON now returns 400. Typecheck, lint and all 15 tests passed after the fix. Mobile application code was unchanged since the final Hermes exports.

The earlier prototype source archive was not available locally for verified reuse. Private EPUB content was not materialized or included in this repository.

Hardened SDK 57 dependency audit: 20 high findings, 0 moderate/critical, down from 23 affected-package entries. The runtime decoder was fixed using official 0.5.0 source with an export-only CommonJS adaptation and provenance/consumer/performance regression tests. `braces` and `node-forge` have no official patched release at review time and remain unresolved. See `security-review.md` and `dependency-audit.json`; this is not a clean production audit.

Runtime reachability evidence: the final Android source map lists 1,423 sources and iOS lists 1,313. Both include `/vendor/decode-uri-component/index.js`; neither includes `braces`, `node-forge` or `micromatch`. This establishes absence from these exported JavaScript bundles, not safety of future build/signing configurations or native third-party code.

Private-book materialization in this hardening pass resolved the correct Library ID but produced no verified local file. The initial command rejected a relative destination; one retry used an absolute consumer-local destination with the current supported helper and stalled with a zero-byte temporary file. Only that owned transfer was stopped after a bounded wait. There was no raw-URL fallback and no private-book content entered the repository, export or archive.
