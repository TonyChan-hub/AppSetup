# Zippy Flutter Probe SDK

Flutter debug probe for the Zippy desktop inspector. Starts a LAN WebSocket server in debug builds and exposes device info, MMKV, SQLite, network, and performance data.

## Install with one zip (recommended for host apps)

From this repo:

```bash
bash packages/zippy_flutter/scripts/pack.sh
# → packages/zippy_flutter/dist/zippy_flutter-0.0.1.zip
```

In the host app (e.g. tcg-scanner):

```bash
mkdir -p packages
unzip -o /path/to/zippy_flutter-0.0.1.zip -d packages
```

```yaml
dependencies:
  zippy_flutter:
    path: packages/zippy_flutter
```

```bash
flutter pub get
```

No monorepo path / pub.dev required — only that zip. `@bear1210/create-flutter-template` unpacks a vendor zip into `packages/zippy_flutter` automatically.

## Minimal code integration

Touch only the process entrypoint and your shared HTTP client. SQLite under the app documents directory is discovered automatically.

```dart
import 'package:zippy_flutter/zippy_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ZippyProbe.start(); // no-ops outside debug unless ZIPPY_PROBE=true
  runApp(const MyApp());
}
```

If the app uses Dio:

```dart
ZippyProbe.attachDio(dio); // one line; debug-only by default
```

## Optional helpers

```dart
ZippyProbe.registerMmkvStore('session', () => {'token': 'abc', 'userId': 42});
ZippyProbe.registerSqliteDatabase('app.db', dbPath); // only if auto-discovery misses it
```

## Connection

1. Run the host app in debug mode on a device/emulator.
2. Open Zippy desktop → **Device** → host/port (default `9876`) → **Connect**.
3. Pick the right host:

| Target | Host |
| ------ | ---- |
| iOS Simulator / Android Emulator | `127.0.0.1` |
| Physical Android | LAN IP, or `adb forward tcp:9876 tcp:9876` then `127.0.0.1` |
| Physical iOS | LAN IP |

Zippy runs on the Mac and must reach the probe on the device — use `adb forward`, not `reverse`. Path: `ws://host:9876/probe`.

## Example

See `example/` for a minimal demo app with SQLite seed data and sample network calls.

Docs: [Zippy guide](https://tonychan-hub.github.io/AppSetup/guide/zippy).
