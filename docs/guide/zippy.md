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

## Connect a probe

New apps from `@bear1210/create-rn-template` / `@bear1210/create-flutter-template` already wire Zippy in **debug** builds. Connect Zippy desktop → **Device** → host/port (default `9876`) → **Connect**.

### React Native (`@bear1210/zippy-rn`)

```bash
npm install @bear1210/zippy-rn react-native-tcp-socket buffer
```

```tsx
import { ZippyProbe } from '@bear1210/zippy-rn';

await ZippyProbe.start(); // no-op outside __DEV__ unless enabled: true
```

See [`packages/zippy_rn/README.md`](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_rn).

### Flutter (`zippy_flutter` zip / path)

```yaml
dependencies:
  zippy_flutter:
    path: packages/zippy_flutter
```

```dart
await ZippyProbe.start(); // no-op outside debug unless ZIPPY_PROBE=true
ZippyProbe.attachDio(dio);
```

Pack with `bash packages/zippy_flutter/scripts/pack.sh`, or let `create-flutter-template` unpack its vendor zip. See [`packages/zippy_flutter/README.md`](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_flutter).

Physical Android: use the device LAN IP, or `adb forward tcp:9876 tcp:9876` and connect to `127.0.0.1` (Zippy runs on the host and must reach the probe on the device — that needs `forward`, not `reverse`).

## Releases

Bump `@bear1210/zippy` and push to `main` to trigger the Zippy release workflow. Packaged builds publish a `.dmg` plus `download.json` / `latest.json` to GitHub Releases — the docs download panel above reads those assets automatically.
