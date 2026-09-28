# @bear1210/zippy

Tauri 2 desktop inspector for **Zippy** — mobile app debug data (MMKV / SQLite / network / perf).

## Prerequisites

- Node.js 20+
- Rust stable (`rustup`)
- macOS (primary target)

## Develop

From repo root:

```bash
npm install
npm run zippy
```

Or from this package:

```bash
npm run dev -w @bear1210/zippy
```

## Build

```bash
npm run zippy:build
```

Release builds sign updater artifacts with `TAURI_SIGNING_PRIVATE_KEY` (and optional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`). Generate a keypair once:

```bash
cd packages/zippy
npx tauri signer generate -w src-tauri/.updater-key --ci -p ""
# put the printed public key into src-tauri/tauri.conf.json → plugins.updater.pubkey
# store the private key contents in GitHub Actions secret TAURI_SIGNING_PRIVATE_KEY
```

## Connect to a Flutter probe

1. Add `zippy_flutter` to your app and call `await ZippyProbe.start()` in debug mode.
2. Run the app on a device/emulator reachable from your Mac.
3. Open Zippy → **Device** → enter host/port (default `9876`) → **Connect**.

See [`../zippy_flutter/README.md`](../zippy_flutter/README.md) for SDK integration.

## Auto-update

Packaged macOS builds use `tauri-plugin-updater` with GitHub Releases (`zippy-v{version}` tags) and `latest.json`. Bump this package version and push to `main` to trigger [`.github/workflows/zippy-release.yml`](../../.github/workflows/zippy-release.yml).

Unsigned Apple builds are fine for internal Phase 1 testing. macOS Gatekeeper may require right-click → Open the first time. Updater signatures are separate from Apple code signing.

## Version

This package is **private** (not published to npm). Bump the version to cut a GitHub Release:

```bash
npm version patch -w @bear1210/zippy
```
