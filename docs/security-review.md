# Security hardening evidence

Reviewed 2026-10-22 in an isolated project. Source/tests are verified separately from native device and production verification.

## Dependency findings

The original npm audit contained 23 affected-package entries, not 23 independent vulnerabilities: 20 high and 3 moderate from three root advisories. The refreshed audit has 20 high, 0 moderate, 0 critical. Exact output: `dependency-audit.json`.

| Root dependency | Actual use / exposure | Action and remaining status |
| --- | --- | --- |
| decode-uri-component 0.2.2, moderate | Expo Router 57 -> query-string 7.1.3; mobile routing can receive malformed percent-encoded URLs | Official fixed 0.5.0 algorithm with an export-only CommonJS adaptation. Old consumer timed out after 3 seconds; fixed consumer completed in about 0.1 seconds in the verification environment. |
| braces 3.0.3, high | Expo/Metro -> metro-file-map -> micromatch; build-time glob patterns, not EPUB content. Deeply nested attacker-controlled patterns can exhaust the Node stack. | Official npm latest remains 3.0.3; advisory has no patch. Retained, unresolved. Do not load untrusted build configuration or expose Metro publicly. |
| node-forge 1.4.0, high | Expo CLI / code-signing-certificates; RSA PKCS#1 v1.5 signature verification, not community passwords or book reading | Official npm latest remains 1.4.0; advisory has no patch. Retained, unresolved. No EAS/OTA/signing service is configured. Resolve before adding such a signing trust path. |

Sources: [decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

The 20 remaining entries include Expo/React Native/plugins because npm propagates findings through dependency relationships. CLI packages can be declared under production dependencies, so `npm audit --omit=dev` does not alone determine mobile runtime reachability. Bundle evidence is recorded in `verification.md`. No forced Expo downgrade or major framework upgrade was performed; there is no clean-audit claim.

### Decoder provenance

`vendor/decode-uri-component/upstream.mjs` is unchanged source from the official npm 0.5.0 tarball, SHA-256 `f42d289f996e6c9f0e33d8f31de1fe9a7a077c612dca489cafdb2df4cbb6122f`. MIT license retained. `index.js` changes only the default export declaration to `module.exports`; a content-comparison test verifies exactly that transformation. Expo Router's query-string consumer requires CommonJS. The fixed algorithm was not rewritten or relabeled.

Tests compare Chinese/emoji, malformed percent sequences, overlong encodings, encoded/literal surrogates, BOM, null bytes and ordinary query characters against unchanged upstream. The real query-string consumer processes 120,000 adversarial characters in a bounded child process. The local adaptation is a maintenance obligation; remove it when Expo adopts a compatible fixed upstream dependency. A changed package version alone is not evidence of a fix.

## Community findings and fixes

- Reproduced direct-ID access to a third-party reply after blocking its thread author. Reply access/reporting now also checks parent visibility.
- New password hashes preserve whitespace and use versioned scrypt N=32768/r=8/p=3, random 128-bit salts, 64-byte hashes and a 48 MiB allocation ceiling. This is an [OWASP-listed configuration](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt). At most two hashes run concurrently. Legacy hashes retain old verification semantics and upgrade after successful login.
- Random 256-bit sessions are stored hashed, expire in seven days and are revoked on logout/account deletion. Bearer syntax is validated. HTTP 401 returns the client to an unauthenticated state; credentials are not placed in public variables.
- Positive integer IDs and title bounds are checked before SQL. Bodies are capped at 16 KB, decoded after collecting UTF-8 bytes and restricted to JSON objects. Queries use bound parameters. Per-IP/write limits remain and per-account login limits were added.
- Ownership checks reject others' deletions. Account deletion cascades through sessions/posts/replies/blocks; reporter identity on surviving reports becomes null. Sharing uploads only deliberately typed text/book title, never book bytes, private notes, cursor or cutoff.
- Re-reporting reopens a dismissed report. Moderation decisions now persist independently from deleted posts; history stores numeric report/post IDs, decision/time, without content or credentials.

Fresh HTTP and disk-SQLite tests cover these behaviors. No accounts/posts are preloaded. The service remains local-only.

## EPUB findings and fixes

- ZIP directory count could skip validation of entries. End-record/directory bounds, disk/count consistency and normalized duplicate paths are now checked.
- JSZip StreamHelper now caps markup at 4 MiB characters and each raster at 6 MiB decoded bytes while reading, pausing oversized streams. Per-chapter encoded images stay capped at 12 MiB. ZIP-level bounds remain. This is not a universal decompression sandbox.
- A pre-traversal check rejects more than 60,000 DOM nodes or nesting beyond 128. Active/remote content removal and isolated WebView CSP remain enabled.
- A narrow style whitelist retains emphasis, alignment, indentation and inline image sizing, rejecting URLs/imports/positioning/hidden content/font-size overrides. Semantic structure and direction/language survive. Arbitrary CSS, external stylesheets, SVG/MathML and fixed-layout EPUB remain unsupported.

## Exact remaining release blockers

1. No Android APK. The last bounded retry failed downloading official Google Maven `foundation-android-1.7.6.aar` with remote TLS handshake termination. No Gradle retry or system-network change occurred in this pass. Native import/PDF/WebView selection/lifecycle/accessibility tests await a successful compile.
2. iOS native compile/signing/device tests have not run; Windows has no Xcode. Hermes export is not an iOS build.
3. The two upstream toolchain advisories above remain unresolved before build/signing infrastructure can process untrusted inputs.
4. Custom EPUB rendering lacks real-book/device memory benchmarks. Large raster pixel dimensions and repeated embedded images can still stress decoded memory/persisted chapter size despite encoded-byte bounds. Complex layout/footnote/CJK fidelity needs real-book testing. Readium is not integrated.
5. Private EPUB has no verified local bytes. Initial helper invocation rejected a relative destination without downloading; its one absolute consumer-local retry produced no verified bytes and was stopped after a bounded wait. No copyrighted book was tested or packaged.
6. Public community prerequisites are absent: HTTPS hosting, tested backup/restore, password recovery/verified identity, moderator roles/ban/appeal policy, pagination beyond 50 roots/100 replies. Current per-process rate limits are not distributed abuse prevention. These features are not claimed complete.
7. Final icons, store privacy declarations, platform accessibility audit, account-deletion policy and signing/publication setup remain unverified. AI remains configuration-only as instructed; no model requests occur.
