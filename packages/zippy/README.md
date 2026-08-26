# @bear1210/zippy

Electron desktop inspector for **Zippy** — mobile app debug data (MMKV / SQLite / network / perf).

## Develop

From repo root:

```bash
npm install
npm run zippy
```

> If your shell exports `ELECTRON_RUN_AS_NODE=1` (common in some IDE sandboxes), clear it before launching, or use `npm run zippy` / `bin/zippy.mjs` which unset it for the Electron child process.

Build macOS artifacts locally:

```bash
npm run zippy:build
```

## Connect to a Flutter probe

1. Add `zippy_flutter` to your app and call `await ZippyProbe.start()` in debug mode.
2. Run the app on a device/emulator reachable from your Mac.
3. Open Zippy → **Device** → enter host/port (default `9876`) → **Connect**.

See [`../zippy_flutter/README.md`](../zippy_flutter/README.md) for SDK integration.

## Auto-update

Packaged macOS builds use `electron-updater` with GitHub Releases (`zippy-v{version}` tags). Bump this package version and push to `main` to trigger [`.github/workflows/zippy-release.yml`](../../.github/workflows/zippy-release.yml).

Unsigned builds are fine for internal Phase 1 testing. macOS Gatekeeper may require right-click → Open the first time.

## Version

This package is **private** (not published to npm). Bump the version to cut a GitHub Release:

```bash
npm version patch -w @bear1210/zippy
```
