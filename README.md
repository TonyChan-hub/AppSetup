# AppSetup (monorepo)

Business-free React Native / Flutter scaffolds and macOS mobile toolchain helpers.

**Docs site (EN / 中文):** https://tonychan-hub.github.io/AppSetup/ — built from `docs/` and deployed by [`.github/workflows/docs.yml`](.github/workflows/docs.yml) on push to `main` (publishes the `gh-pages` branch).

One-time GitHub Pages setup (required for the site URL to work):

1. Open [Settings → Pages](https://github.com/TonyChan-hub/AppSetup/settings/pages)
2. **Build and deployment → Source:** Deploy from a branch
3. **Branch:** `gh-pages` / `/ (root)` → Save

```bash
npm run docs:dev      # local preview
npm run docs:build    # static site → docs/.vitepress/dist
```

## Packages

| Package | npm | Version source |
| ------- | --- | -------------- |
| [`@bear1210/create-rn-template`](./packages/create-rn-template) | published | `packages/create-rn-template/package.json` |
| [`@bear1210/create-flutter-template`](./packages/create-flutter-template) | published | `packages/create-flutter-template/package.json` |
| [`@bear1210/zippy`](./packages/zippy) | not on npm (GitHub Releases / Tauri) | `packages/zippy/package.json` |
| [`@bear1210/zippy-probe-protocol`](./packages/zippy-probe-protocol) | published (shared probe protocol) | `packages/zippy-probe-protocol/package.json` |
| [`@bear1210/zippy-rn`](./packages/zippy_rn) | published (RN probe SDK) | `packages/zippy_rn/package.json` |
| [`zippy_flutter`](./packages/zippy_flutter) | Flutter probe SDK (zip / path) | `packages/zippy_flutter/pubspec.yaml` |

Root `package.json` is **private** (`@bear1210/app-setup@0.0.0`) and only orchestrates workspaces. Bump and publish npm versions on the packages that map to npm libraries—not the repo root. Zippy is private and ships via GitHub Releases (`zippy-release.yml`).

```bash
# bump CLI (example)
npm version patch -w @bear1210/create-rn-template
npm version patch -w @bear1210/create-flutter-template
# bump Zippy desktop (triggers macOS release on push to main)
npm version patch -w @bear1210/zippy
git push && git push --tags
# npm packages publish on push to main when their version is newer than npm
```

## Layout

```
packages/
  create-rn-template/       # RN CLI + template + setup/check scripts
    bin/
    scripts/
    template/
  create-flutter-template/  # Flutter CLI + business-free template
    bin/
    template/
    vendor/                 # zippy_flutter-*.zip for npx scaffolds
  zippy/                    # Tauri desktop inspector (Rust + Vite/TS)
    bin/
    src/
    src-tauri/
  zippy-probe-protocol/     # Shared JSON probe protocol
  zippy_rn/                 # React Native debug probe SDK (npm)
  zippy_flutter/            # Flutter debug probe SDK (zip / path)
```

## Zippy (desktop)

Tauri inspector for MMKV / SQLite / network / perf from a debug probe on device. Requires Node 20+ and a Rust stable toolchain. Packaged macOS builds ship via [GitHub Releases](https://github.com/TonyChan-hub/AppSetup/releases); download from the [docs Zippy page](https://tonychan-hub.github.io/AppSetup/guide/zippy#download).

```bash
npm install
npm run zippy
```

RN / Flutter scaffolds already call `ZippyProbe.start()` in debug. Connect from the **Device** panel (default port `9876`):

| Target | Host |
| ------ | ---- |
| Simulator / Emulator | `127.0.0.1` |
| Physical Android | LAN IP, or `adb forward tcp:9876 tcp:9876` then `127.0.0.1` |
| Physical iOS | LAN IP |

Use `adb forward` (host → device), not `reverse`. Full guide: [docs/guide/zippy.md](./docs/guide/zippy.md) · SDKs: [`zippy_rn`](./packages/zippy_rn) · [`zippy_flutter`](./packages/zippy_flutter).

## CLI usage

### React Native

```bash
npx @bear1210/create-rn-template MyNewApp --package=com.example.mynewapp
```

`<ProjectName>` must be a **JS identifier** (e.g. `MyNewApp`). Do **not** use kebab-case (`my-new-app`) or snake_case (`my_new_app`) — RN CLI will reject them. See [Create RN](docs/guide/create-rn.md).

Optional flags:

- `--skip-install` skip npm install in generated app
- `--package=<applicationId>` set Android package name when initializing app

### What the RN scaffold includes

- React Native 0.81.6 project bootstrap (via RN CLI)
- Base engineering configs (`tsconfig`, `eslint`, `prettier`, `metro`, `jest`)
- Infrastructure modules: `logger`, `i18n`, `sqlite` (`react-native-quick-sqlite`), `mmkv` (`react-native-mmkv`)
- Zippy probe (`@bear1210/zippy-rn`) — `ZippyProbe.start()` in `__DEV__` only; registers MMKV + SQLite (`openDb` from the app so Metro resolves `quick-sqlite`)
- Git quality gates: `commitlint`, `husky`, `lint-staged`
- Cursor assets: `.cursor/rules`, `.cursor/skills`
- `patch-package` + `patches/`

### Flutter

```bash
npx @bear1210/create-flutter-template myNewApp --org=com.example
cd myNewApp && flutter run
```

Optional flags:

- `--skip-install` skip `flutter pub get` / `gen-l10n` / npm tooling install
- `--org=<reverse-domain>` set Android/iOS organization (default `com.example`)

Full CLI docs: [`packages/create-flutter-template/README.md`](./packages/create-flutter-template/README.md).

### What the Flutter scaffold includes

- Flutter project bootstrap (via `flutter create`, Android + iOS)
- Layered `lib/` layout: `pages` / `router` / `providers` / `datasources` / `repositories` / `entities` / `services` / `core` / `l10n`
- Infrastructure: Dio + auth interceptor hook, sqflite logger, ScreenUtil theme (Poppins), GoRouter, Provider, permission helpers
- Zippy probe (`zippy_flutter` under `packages/`) — `ZippyProbe.start()` in debug only; connect from Zippy desktop on port `9876`
- `package.json` scripts for analyze / format / build / `gen:l10n`
- Git quality gates: `commitlint`, `husky`
- Cursor rules for architecture / Dart style / l10n / iOS private-API
- No business domain, Firebase, IAP, or OAuth credentials

## macOS environment setup

Global toolchain bootstrap (no project path needed):

```bash
# Android SDK / JDK / emulator (no Android Studio)
npx -p @bear1210/create-rn-template setup-rn-android-env

# iOS (requires Xcode.app already installed)
npx -p @bear1210/create-rn-template setup-rn-ios-env
```

Both commands only support macOS. They auto-detect your public IP country and pick mirrors:

- Mainland China (`CN`): Homebrew USTC + npm npmmirror + RubyGems ruby-china
- Elsewhere / detect failed: official sources

Force a region if needed:

```bash
RN_SETUP_MIRROR=cn npx -p @bear1210/create-rn-template setup-rn-android-env
RN_SETUP_MIRROR=global npx -p @bear1210/create-rn-template setup-rn-ios-env
```

iOS expects Xcode from the App Store. Android SDK packages still download from Google.

## Check environment

```bash
npx -p @bear1210/create-rn-template check-mobile-env
# machine-readable:
npx -p @bear1210/create-rn-template check-mobile-env --json
# treat Flutter as required:
npx -p @bear1210/create-rn-template check-mobile-env --strict-flutter
```

Reports Common / Android / iOS / React Native / Flutter readiness. Flutter is optional unless `--strict-flutter` is set.

## Local development

```bash
npm install
npm run check-mobile-env
npm run create-rn-template -- MyNewApp --package=com.example.mynewapp --skip-install
npm run create-flutter-template -- myFlutterApp --org=com.example --skip-install
```

## Generated app shape

- **RN**: familiar `src`-based structure, minimal `Home` screen + infra shell
- **Flutter**: layered `lib/` (same shape as production Flutter apps in this org), minimal `Home` + logs screens, no business domain

Generated Flutter apps also ship a project `README.md` under the app root with run / structure / i18n / script notes.
