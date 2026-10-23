# Licensing and third-party notices

First-party contributions to Jianxu are licensed under **AGPL-3.0-only**, version 3 only, as set out in [LICENSE](LICENSE). This declaration does not replace third-party licenses or copyright notices. The current application, local community service, tests and documentation were added or modified in 2026. Third-party components remain subject to their own terms.

## Material included in this source repository

| Material | Origin and attribution | License and retained notice |
| --- | --- | --- |
| Initial Expo project template and the six placeholder PNGs under `assets/` | Expo / 650 Industries, Inc.; inherited from the initial template | MIT; the complete original notice is retained in [licenses/Expo-MIT.txt](licenses/Expo-MIT.txt). These are template assets, not final product branding. |
| `vendor/decode-uri-component/upstream.mjs` | decode-uri-component 0.5.0, Sam Verschueren | MIT; [original license](vendor/decode-uri-component/license) and [source provenance](vendor/decode-uri-component/README.md) are retained. |
| `vendor/decode-uri-component/index.js` | Same upstream decoder, modified in 2026 only to export through CommonJS | MIT; decoder logic and upstream notice are unchanged. The compatibility change is documented alongside the source. |

Original test-book fixtures are generated from `scripts/create-test-fixtures.cjs`. User-supplied books, credentials, local databases, migration archives, build caches and dependency directories are not part of this source distribution.

## Registry dependencies

`package-lock.json` records exact package versions and the publishers' license metadata. Installed packages retain their own license files. This source repository does not vendor `node_modules`, native dependency archives, fonts fetched by packages, or application binaries.

The dependency metadata review identified the following additional obligations and license choices. It is a screening record, not a complete legal approval of future binary distributions.

| Dependency | Applicable terms and handling |
| --- | --- |
| JSZip | Use the offered MIT licensing path; retain the upstream copyright and MIT notice when distributing its code. |
| node-forge | Use the offered BSD-3-Clause path; retain its copyright, conditions and disclaimer. |
| `@expo-google-fonts/material-symbols` | Package metadata is MIT **AND** Apache-2.0. Retain both the package `LICENSE` and font `LICENSE_FONT`, plus any applicable notices, if distributing this material. The project does not directly import these fonts. |
| pako | MIT **AND** Zlib; retain both sets of upstream terms and attribution when distributing it. |
| caniuse-lite | CC-BY-4.0 browser-support data, from [caniuse-lite](https://github.com/browserslist/caniuse-lite) and [Can I use](https://caniuse.com/). Retain upstream attribution, license link and change indications if redistributing the data. No data modifications are made here. |
| lightningcss and platform packages | MPL-2.0. Preserve MPL notices and source availability obligations. Before distributing any combined binary, verify the relevant source version and whether the MPL secondary-license mechanism applies; do not assume package metadata resolves that question. The standard license's Exhibit B example alone is not evidence that a component has opted out. |
| argparse | Python-2.0; retain the package's complete historical copyright/license notices. |
| glob, minimatch, minipass, path-scurry, nested lru-cache and sax | BlueOak-1.0.0 in the lockfile. Preserve the relevant package notices and [license text or link](https://blueoakcouncil.org/license/1.0.0), including any package-specific exceptions. |
| type-fest; fb-dotslash | Where dual terms are offered, use MIT and retain the upstream notice. |

Most remaining lockfile entries declare MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD or Unlicense. Preserve each dependency's actual notices rather than relabeling them AGPL. The linked local decoder entry inherits MIT from `vendor/decode-uri-component/package.json` and its license file; the symlink entry's missing license metadata does not indicate an unknown license.

Native PDF engines, Android/iOS libraries and any material actually bundled in a release need an artifact-level notice and corresponding-source review before APK, AAB, IPA or store distribution. Source publication and store distribution are separate checkpoints. Any public deployment of a modified AGPL-covered service must address the applicable source-offer requirements; no public service is deployed by this repository preparation.

References: [AGPL-3.0-only identifier and text](https://spdx.org/licenses/AGPL-3.0-only.html), [MPL 2.0 sections 1.5, 1.12 and 3.3](https://www.mozilla.org/en-US/MPL/2.0/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
