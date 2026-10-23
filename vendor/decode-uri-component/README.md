# CommonJS compatibility build

Source: official decode-uri-component 0.5.0 npm tarball, SHA-256 `f42d289f996e6c9f0e33d8f31de1fe9a7a077c612dca489cafdb2df4cbb6122f`.

Only the ESM default export declaration is changed to `module.exports`; decoder logic and MIT license are unchanged. Expo Router 57 uses query-string 7, which calls this decoder through CommonJS. A direct override to upstream ESM 0.5.0 returns a namespace and breaks that caller. This local compatibility build retains the upstream GHSA-vcc3-ghjq-m6fr fix without upgrading Expo or changing the decoder algorithm. Remove the override when the framework adopts a compatible fixed upstream dependency.
