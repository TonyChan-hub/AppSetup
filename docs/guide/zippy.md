# Zippy inspector

Zippy is a **Tauri 2** desktop app for inspecting mobile debug data. It ships via **GitHub Releases**, not npm.

<ZippyDownload locale="en" />

## What it shows

| Panel | Data |
| ----- | ---- |
| **Device** | App / OS info + connect to a probe (`host:port`) |
| **MMKV / KV** | Registered key–value stores |
| **SQLite** | Registered databases — tables and row previews |
| **Network** | Captured HTTP (RN `attachFetch` / Flutter `attachDio`) |
| **Perf** | Lightweight performance samples from the probe |

Probe WebSocket path is always `/probe` (`ws://host:9876/probe`). Default port: **9876**.

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

New apps from `@bear1210/create-rn-template` / `@bear1210/create-flutter-template` already wire Zippy in **debug** builds. Open Zippy → **Device** → host/port → **Connect**.

### Host to use

| Target | Host in Zippy |
| ------ | ------------- |
| iOS Simulator / Android Emulator | `127.0.0.1` (often works; Android may need port mapping) |
| Physical Android | Device LAN IP, **or** `adb forward tcp:9876 tcp:9876` then `127.0.0.1` |
| Physical iOS | Device LAN IP (USB alone does not expose the probe port) |

Zippy runs on the **Mac** and must reach the probe on the **device**. For USB Android that means `adb forward` (host → device), **not** `adb reverse`.

```bash
adb forward tcp:9876 tcp:9876
# then connect Zippy to 127.0.0.1:9876
```

### React Native (`@bear1210/zippy-rn`)

```bash
npm install @bear1210/zippy-rn react-native-tcp-socket buffer
# peers for MMKV / SQLite panels (already in AppSetup RN template):
# react-native-mmkv react-native-quick-sqlite
```

```tsx
import { open } from 'react-native-quick-sqlite';
import { ZippyProbe } from '@bear1210/zippy-rn';
import { readMmkvSnapshot } from '@/services/mmkvStorage'; // or your own reader

if (__DEV__) {
  ZippyProbe.registerMmkvStore('default', () => readMmkvSnapshot('default'));
  // Pass openDb so Metro resolves quick-sqlite from the app (not from zippy-rn):
  ZippyProbe.registerSqliteDatabase('app.db', 'app.db', () =>
    open({ name: 'app.db' }),
  );

  void ZippyProbe.start({
    appInfo: { name: 'MyApp', version: '0.0.1' },
  });
}

// Optional — wrap shared fetch for the Network panel:
const fetchWithZippy = ZippyProbe.attachFetch(fetch);
```

`ZippyProbe.start()` is a no-op outside `__DEV__` unless you pass `enabled: true`.

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

// Optional — only if auto-discovery misses a DB under documents:
ZippyProbe.registerSqliteDatabase('app.db', dbPath);
ZippyProbe.registerMmkvStore('session', () => {'token': '…'});
```

Pack with `bash packages/zippy_flutter/scripts/pack.sh`, or let `create-flutter-template` unpack its vendor zip. See [`packages/zippy_flutter/README.md`](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_flutter).

## Releases

Bump `@bear1210/zippy` and push to `main` to trigger the Zippy release workflow. Packaged builds publish a `.dmg` plus `download.json` / `latest.json` to GitHub Releases — the docs download panel above reads those assets automatically.
