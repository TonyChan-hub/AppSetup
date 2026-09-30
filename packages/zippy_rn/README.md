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
import { ZippyProbe } from '@bear1210/zippy-rn';
import { getMmkvStorage } from '@/services/mmkvStorage';

useEffect(() => {
  if (!__DEV__) return;

  ZippyProbe.registerMmkvStore('default', () => {
    const storage = getMmkvStorage('default');
    // expose keys your app cares about, or mirror getAllKeys if available
    return {};
  });
  ZippyProbe.registerSqliteDatabase('app.db', 'app.db');

  void ZippyProbe.start({
    appInfo: { name: 'MyApp', version: '0.0.1' },
  });

  return () => {
    void ZippyProbe.stop();
  };
}, []);
```

Instrument fetch:

```ts
import { ZippyProbe } from '@bear1210/zippy-rn';

const fetchWithZippy = ZippyProbe.attachFetch(fetch);

export async function getJson(url: string) {
  const response = await fetchWithZippy(url);
  // ...
}
```

## Connection

1. Run the app in debug mode on a device/emulator.
2. Open Zippy desktop → **Device** → host/port (default `9876`) → **Connect**.
3. Physical Android device: use the phone LAN IP, or `adb reverse tcp:9876 tcp:9876` and connect to `127.0.0.1`.

Probe URL path is always `/probe` (`ws://host:9876/probe`).

## API

| API | Role |
| --- | --- |
| `ZippyProbe.start({ port?, enabled?, appInfo? })` | Start probe (no-op outside `__DEV__` unless `enabled: true`) |
| `ZippyProbe.stop()` | Stop server |
| `ZippyProbe.registerMmkvStore(id, reader)` | Register MMKV/map-backed store |
| `ZippyProbe.registerSqliteDatabase(id, name)` | Register quick-sqlite DB name |
| `ZippyProbe.attachFetch(fetch?)` | Wrap fetch for Network panel |

Protocol: `@bear1210/zippy-probe-protocol` (same as Flutter `zippy_flutter`).
