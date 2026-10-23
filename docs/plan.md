# Implementation plan

Goal: build local-first Android/iOS reading and an honest configurable community connection.

1. Domain and import boundary: typed books/locators/notes; bounded EPUB archive parser and sanitizer; tests for malicious archives and stable locators.
2. Persistence and import: SQLite migrations/repository; app-private durable files; rollback and duplicate detection; lifecycle reads/writes.
3. Native reading flow: Expo Router library, import states, PDF adapter, EPUB adapter, chapter navigation, font/theme controls, explicit cutoff, bookmarks and notes.
4. Configuration: disabled AI connection draft; no secret collection or runtime model calls.
5. Community: concrete HTTP contract, persisted local server, authentication, posts/replies, report/block/deletion, native disconnected/error/empty/connected screens.
6. Verification: typecheck, lint, unit/integration tests, JS bundle, native prebuild/build, emulator smoke where available. Record unrun checks and known limitations.

Ownership: routes in src/app compose features; domain in src/features/*/model; device adapters in src/services; shared native primitives in src/components. Native reader views expose locator and selection events, never update cutoff implicitly.
