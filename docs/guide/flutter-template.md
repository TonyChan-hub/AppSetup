# Flutter template features

What `@bear1210/create-flutter-template` puts into a new app.

## App shell

- Minimal `Home` page (sample list + counter) and `Logs` page
- `GoRouter` + `Provider`
- Shake-to-open logs in **debug** builds

## Infrastructure (`lib/core/`)

- Dio client + auth token store / 401 refresh interceptor hook
- sqflite-backed `LocalLogger` (query / export JSON·CSV)
- Material 3 theme (Poppins) + ScreenUtil (390×844)
- Camera / photo-library permission helpers

## Engineering

- `analysis_options.yaml` (`flutter_lints`)
- ARB i18n (`l10n.yaml` + `lib/l10n/`)
- `package.json` scripts for run / analyze / format / build / `gen:l10n`
- `commitlint` + `husky`
- Cursor rules: architecture, Dart style, l10n, no private iOS APIs

## Not included (intentionally)

- Product / business screens or APIs
- Firebase / IAP / OAuth credentials

## Included by default

- `zippy_flutter` probe (debug only) — scaffold copies/unpacks into `packages/zippy_flutter`

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
├── packages/zippy_flutter/ # Zippy debug probe (path dep)
├── assets/fonts/           # Poppins
├── android/ / ios/
├── pubspec.yaml
├── package.json
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
