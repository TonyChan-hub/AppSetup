# Create a Flutter app

Scaffold a business-free Flutter app (Android + iOS) with a layered `lib/` layout and shared infrastructure.

## Requirements

- Node.js `>= 20`
- Flutter SDK on `PATH`
- For iOS builds: Xcode + CocoaPods (macOS)

Check first:

```bash
npx -p @bear1210/create-rn-template check-mobile-env --strict-flutter
```

## Usage

```bash
npx @bear1210/create-flutter-template <project-name> [--org=com.example] [--skip-install]
```

### Example

```bash
npx @bear1210/create-flutter-template myFlutterApp --org=com.example
cd myFlutterApp
flutter run
```

### Flags

| Flag | Description |
| ---- | ----------- |
| `<project-name>` | Output directory; also derives Dart package name (`snake_case`) |
| `--org=<reverse-domain>` | Android applicationId / iOS bundle id prefix (default `com.example`) |
| `--skip-install` | Skip `flutter pub get`, `gen-l10n`, and npm tooling install |

## What the CLI does

1. Runs `flutter create --org … --project-name … --platforms android,ios`
2. Overlays the business-free `template/`
3. Rewrites placeholder package name → your Dart package name
4. Injects camera / photo permission strings
5. Unless `--skip-install`: `flutter pub get` → `flutter gen-l10n` → `npm install`

See [Flutter template features](./flutter-template) for the full scaffold.
