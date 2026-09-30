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
```

Then:

1. Put the **printed public key** into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
2. In GitHub → **Settings → Secrets and variables → Actions → Repository secrets** (not Environment secrets):
   - `TAURI_SIGNING_PRIVATE_KEY` = full private key from the generate output / `.updater-key` file (must decode to a minisign secret that starts with `untrusted comment:`)
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = leave unset / empty if you used `-p ""`

If the signing secret is missing or invalid, the release workflow still publishes the `.dmg` (docs download works); only in-app updater signatures are skipped.

## Connect to a mobile probe

1. **Flutter:** add `zippy_flutter` and call `await ZippyProbe.start()` in debug (scaffolds do this by default).
2. **React Native:** add `@bear1210/zippy-rn` and call `ZippyProbe.start()` in `__DEV__` (scaffolds do this by default).
3. Run the app on a device/emulator reachable from your Mac.
4. Open Zippy → **Device** → enter host/port (default `9876`) → **Connect**.

See [`../zippy_flutter/README.md`](../zippy_flutter/README.md) and [`../zippy_rn/README.md`](../zippy_rn/README.md) for SDK details.

## Auto-update & docs download

Packaged macOS builds use `tauri-plugin-updater` with GitHub Releases (`zippy-v{version}` tags), `latest.json` (updater), and `download.json` (docs site download panel). Bump this package version and push to `main` to trigger [`.github/workflows/zippy-release.yml`](../../.github/workflows/zippy-release.yml).

After a release, users can download the `.dmg` from the [docs Zippy page](https://tonychan-hub.github.io/AppSetup/guide/zippy#download).

Unsigned Apple builds are fine for internal Phase 1 testing. macOS Gatekeeper may require right-click → Open the first time. Updater signatures are separate from Apple code signing.

## Version

This package is **private** (not published to npm). Bump the version to cut a GitHub Release:

```bash
npm version patch -w @bear1210/zippy
```
