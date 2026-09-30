# @bear1210/zippy-rn

React Native debug probe for the Zippy desktop inspector. Starts a LAN WebSocket server in `__DEV__` builds and exposes device info, MMKV, SQLite, network, and performance data.

## Install

```bash
npm install @bear1210/zippy-rn react-native-tcp-socket buffer
# peers already in AppSetup RN template:
# react-native-mmkv react-native-quick-sqlite
cd ios && pod install
```

## Minimal integration

```tsx
import { useEffect } from 'react';
import { open } from 'react-native-quick-sqlite';
import { ZippyProbe } from '@bear1210/zippy-rn';
import { readMmkvSnapshot } from '@/services/mmkvStorage';

useEffect(() => {
  if (!__DEV__) return;

  ZippyProbe.registerMmkvStore('default', () => readMmkvSnapshot('default'));
  // Prefer passing openDb so Metro resolves quick-sqlite from the app
  // (zippy-rn cannot reliably require the native module itself):
  ZippyProbe.registerSqliteDatabase('app.db', 'app.db', () =>
    open({ name: 'app.db' }),
  );

  void ZippyProbe.start({
    appInfo: { name: 'MyApp', version: '0.0.1' },
  });

  return () => {
    void ZippyProbe.stop();
  };
}, []);
```

Instrument fetch for the Network panel:

```ts
import { ZippyProbe } from '@bear1210/zippy-rn';

const fetchWithZippy = ZippyProbe.attachFetch(fetch);

export async function getJson(url: string) {
  const response = await fetchWithZippy(url);
  // ...
}
```

AppSetup’s RN scaffold does the above in `App.tsx` automatically.

## Connection

1. Run the app in debug mode on a device/emulator.
2. Open Zippy desktop → **Device** → host/port (default `9876`) → **Connect**.
3. Pick the right host:

| Target | Host |
| ------ | ---- |
| iOS Simulator / Android Emulator | `127.0.0.1` |
| Physical Android | LAN IP, or `adb forward tcp:9876 tcp:9876` then `127.0.0.1` |
| Physical iOS | LAN IP |

`adb forward` is host → device (Zippy on Mac talking to the probe on phone). Do **not** use `adb reverse`.

Probe URL path is always `/probe` (`ws://host:9876/probe`).

## API

| API | Role |
| --- | --- |
| `ZippyProbe.start({ port?, enabled?, appInfo? })` | Start probe (no-op outside `__DEV__` unless `enabled: true`) |
| `ZippyProbe.stop()` | Stop server |
| `ZippyProbe.registerMmkvStore(id, reader)` | Register MMKV/map-backed store |
| `ZippyProbe.registerSqliteDatabase(id, name, openDb?)` | Register DB; pass `openDb` from the app (recommended) |
| `ZippyProbe.attachFetch(fetch?)` | Wrap fetch for Network panel |

Protocol: `@bear1210/zippy-probe-protocol` (same as Flutter `zippy_flutter`). Docs: [Zippy guide](https://tonychan-hub.github.io/AppSetup/guide/zippy).
