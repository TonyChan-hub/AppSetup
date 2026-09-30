# Zippy inspector

Zippy is a **Tauri 2** desktop app for inspecting mobile debug data (MMKV / SQLite / network / perf). It ships via **GitHub Releases**, not npm.

<ZippyDownload locale="en" />

## Prerequisites

- Node.js 20+
- Rust stable (`rustup`)
- macOS (primary target)

## Develop {#develop}

```bash
npm install
npm run zippy
```

## Build

```bash
npm run zippy:build
```

## Connect a Flutter probe

1. Add `zippy_flutter` to your app and call `await ZippyProbe.start()` in debug mode
2. Run the app on a device/emulator reachable from your Mac
3. Open Zippy → **Device** → enter host/port (default `9876`) → **Connect**

See the [`zippy_flutter` package README](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_flutter) for SDK details.

## Releases

Bump `@bear1210/zippy` and push to `main` to trigger the Zippy release workflow. Packaged builds publish a `.dmg` plus `download.json` / `latest.json` to GitHub Releases — the docs download panel above reads those assets automatically.
