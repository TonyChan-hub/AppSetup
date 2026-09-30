# @bear1210/create-flutter-template

Business-free Flutter scaffold CLI. Bootstraps a new Android + iOS app with a layered `lib/` layout and shared infrastructure (network, logging, theme, i18n, routing), without any product/business domain code.

Version in this `package.json` is the npm package version. Monorepo overview: [repo README](../../README.md).

## Requirements

- Node.js `>= 20`
- [Flutter SDK](https://docs.flutter.dev/get-started/install) on `PATH` (`flutter` must resolve)
- For iOS builds: Xcode + CocoaPods (macOS)

Check the machine first:

```bash
npx -p @bear1210/create-rn-template check-mobile-env --strict-flutter
```

## Quick start

```bash
npx @bear1210/create-flutter-template myFlutterApp --org=com.example
cd myFlutterApp
flutter run
```

From this monorepo:

```bash
npm install
npm run create-flutter-template -- myFlutterApp --org=com.example
```

## CLI

```text
create-flutter-template <project-name> [--org=com.example] [--skip-install]
```

| Argument / flag | Description |
| --------------- | ----------- |
| `<project-name>` | Output directory name. Also used to derive the Dart package name (`snake_case`) and display name. |
| `--org=<reverse-domain>` | Organization for Android applicationId / iOS bundle id prefix. Default: `com.example`. |
| `--skip-install` | Skip `flutter pub get`, `flutter gen-l10n`, and `npm install` (husky / commitlint). |

### What the CLI does

1. Runs `flutter create --org … --project-name … --platforms android,ios`
2. Overlays the business-free `template/` (lib, pubspec, tooling, Cursor rules, fonts)
3. Rewrites the placeholder package name `flutter_template_app` → your Dart package name
4. Injects camera / photo usage strings (iOS) and camera-related permissions (Android)
5. Unless `--skip-install`: `flutter pub get` → `flutter gen-l10n` → `npm install`

## What the scaffold includes

**App shell**

- Minimal `Home` page (sample list + counter) and `Logs` page
- `GoRouter` + `Provider`
- Shake-to-open logs in **debug** builds

**Infrastructure (`lib/core/`)**

- Dio client + auth token store / 401 refresh interceptor hook
- sqflite-backed `LocalLogger` (query / export JSON·CSV)
- Material 3 theme (Poppins) + ScreenUtil (390×844 design size)
- Camera / photo-library permission helpers

**Engineering**

- `analysis_options.yaml` (`flutter_lints`)
- ARB i18n (`l10n.yaml` + `lib/l10n/`)
- `package.json` scripts for run / analyze / format / build / `gen:l10n`
- `commitlint` + `husky` (commit-msg)
- Cursor rules: architecture, Dart style, l10n, no private iOS APIs

**Not included (intentionally)**

- Product/business screens, APIs, Firebase / IAP / OAuth credentials

**Included by default**

- `zippy_flutter` probe (debug only via `ZippyProbe.start()`; path dep under `packages/zippy_flutter`). Connect with [Zippy](../../docs/guide/zippy.md) on port `9876` (`adb forward` for USB Android).

## Generated layout

```text
myFlutterApp/
├── lib/
│   ├── main.dart, app.dart
│   ├── pages/              # Home, Logs
│   ├── router/             # GoRouter
│   ├── widgets/common/
│   ├── providers/
│   ├── datasources/local/
│   ├── repositories/ / entities/ / services/
│   ├── core/               # network, theme, logging, permissions
│   └── l10n/
├── packages/zippy_flutter/ # Zippy debug probe
├── assets/fonts/           # Poppins
├── android/ / ios/         # from flutter create (+ permission patches)
├── pubspec.yaml
├── package.json            # npm scripts + husky/commitlint
└── .cursor/rules/
```

## After generate

```bash
cd myFlutterApp
flutter run

# optional API base override
flutter run --dart-define=API_BASE_URL=https://your-host

# after editing ARB strings
flutter gen-l10n   # or: npm run gen:l10n
```

Useful npm scripts (Node tooling; Flutter commands still need the SDK):

| Script | Action |
| ------ | ------ |
| `npm run setup` | `flutter pub get` |
| `npm run analyze` | `flutter analyze` |
| `npm run format` | `dart format lib test` |
| `npm run run` / `dev` | `flutter run` |
| `npm run build:apk` | release APK (split ABI) |
| `npm run build:appbundle` | Play App Bundle |
| `npm run build:ipa` | iOS IPA |
| `npm run gen:l10n` | regenerate localizations |

Default API base URL lives in `lib/core/constants/app_constants.dart` (`API_BASE_URL`).

## Local package development

```bash
# from repo root
npm install
npm run create-flutter-template -- demoApp --org=com.example --skip-install
```

Bump / publish version from this package only:

```bash
npm version patch -w @bear1210/create-flutter-template
```

## License

MIT
