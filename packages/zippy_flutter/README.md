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

No monorepo path / pub.dev required — only that zip.

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

Then open Zippy desktop → connect to `phone-lan-ip:9876`.

## Optional helpers

```dart
ZippyProbe.registerMmkvStore('session', () => {'token': 'abc', 'userId': 42});
ZippyProbe.registerSqliteDatabase('app.db', dbPath); // only if auto-discovery misses it
```

## Connection

1. Run the host app in debug mode on a device/emulator.
2. Use the device LAN IP from the desktop (not `127.0.0.1` on a physical phone unless you run `adb forward tcp:9876 tcp:9876`).
3. Open Zippy desktop and connect to `host:9876`.

## Example

See `example/` for a minimal demo app with SQLite seed data and sample network calls.
