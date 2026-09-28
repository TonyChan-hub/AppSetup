# Flutter Template

Business-free Flutter scaffold (Android + iOS). Start feature work on top of the layered `lib/` layout — no product domain code is included.

## Requirements

- Flutter SDK on `PATH`
- Xcode (iOS) / Android SDK (Android)

## Run

```bash
flutter pub get
flutter run
```

Or via npm scripts (after `npm install`):

```bash
npm run setup
npm run run
```

### API base URL

Defaults from `AppConstants.apiBaseUrl`. Override at run/build time:

```bash
flutter run --dart-define=API_BASE_URL=https://your-host
# or
npm run run:api   # uses $API_BASE_URL from the environment
```

## Structure

Layer + feature layout under `lib/` (see `.cursor/rules/project-architecture.mdc`).

```text
lib/
├── main.dart, app.dart
├── pages/                    # route pages (Home, Logs, …)
├── router/                   # GoRouter
├── widgets/                  # UI by area (start with common/)
├── providers/                # ChangeNotifiers → app_providers.dart
├── datasources/<feature>/
├── repositories/<feature>/
├── entities/<feature>/
├── services/<feature>/
├── core/                     # network, theme, logging, permissions
└── l10n/                     # ARB + generated localizations
```

| Add… | Put it in… |
| ---- | ---------- |
| New screen | `lib/pages/` + register in `lib/router/app_router.dart` |
| Shared widget | `lib/widgets/<area>/` |
| HTTP / mock source | `lib/datasources/<feature>/` |
| Repository | `lib/repositories/<feature>/` |
| Model | `lib/entities/<feature>/` |
| Domain logic | `lib/services/<feature>/` |
| App-wide state | `lib/providers/` + `app_providers.dart` |

Cross-folder imports use `package:<your_app>/…` (not deep `../../`).

## i18n

- Source strings: `lib/l10n/app_en.arb`
- After ARB edits: `flutter gen-l10n` or `npm run gen:l10n`
- In UI:

```dart
final l10n = AppLocalizations.of(context)!;
Text(l10n.homeTitle);
```

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run analyze` | `flutter analyze` |
| `npm run format` | Format `lib` / `test` |
| `npm run test` | `flutter test` |
| `npm run build:apk` | Release APK (split per ABI) |
| `npm run build:appbundle` | Play App Bundle |
| `npm run build:ios` / `build:ipa` | iOS release / IPA |
| `npm run gen:l10n` | Regenerate localizations |

## Dev notes

- **Logs**: shake the device ~3 times in **debug** builds, or open `/logs` from Home. Export JSON/CSV from the logs screen.
- **Permissions**: camera / photo library use the system dialogs (`permission_handler` / `gal`). Usage strings are set in `Info.plist` / `AndroidManifest.xml` at scaffold time.
- **Theme**: `AppTheme` + Poppins; layout scaling via `flutter_screenutil` (design size 390×844).
- **Network**: `DioClient` in `lib/core/network/`. Wire `refreshAuthSession` when you add real auth.
- **Git hooks**: `husky` + `commitlint` (conventional commits) after `npm install`.
