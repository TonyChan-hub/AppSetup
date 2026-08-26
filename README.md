# AppSetup (monorepo)

Business-free React Native scaffold and macOS mobile toolchain helpers.

## Packages

| Package | npm | Version source |
| ------- | --- | -------------- |
| [`@bear1210/create-rn-template`](./packages/create-rn-template) | published | `packages/create-rn-template/package.json` |
| [`@bear1210/zippy`](./packages/zippy) | not on npm (GitHub Releases / Electron) | `packages/zippy/package.json` |
| [`@bear1210/zippy-probe-protocol`](./packages/zippy-probe-protocol) | published (shared probe protocol) | `packages/zippy-probe-protocol/package.json` |
| [`zippy_flutter`](./packages/zippy_flutter) | Flutter probe SDK (path / pub) | `packages/zippy_flutter/pubspec.yaml` |

Root `package.json` is **private** (`@bear1210/app-setup@0.0.0`) and only orchestrates workspaces. Bump and publish npm versions on the packages that map to npm libraries—not the repo root. Zippy is private and ships via GitHub Releases (`zippy-release.yml`).

```bash
# bump CLI (example)
npm version patch -w @bear1210/create-rn-template
# bump Zippy desktop (triggers macOS release on push to main)
npm version patch -w @bear1210/zippy
git push && git push --tags
# npm packages publish on push to main when their version is newer than npm
```

## Layout

```
packages/
  create-rn-template/   # CLI + template + setup/check scripts
    bin/
    scripts/
    template/
  zippy/                # Electron desktop inspector
    bin/
    desktop/
    renderer/
  zippy-probe-protocol/ # Shared JSON probe protocol
  zippy_flutter/        # Flutter debug probe SDK
```

## Zippy (desktop)

```bash
npm install
npm run zippy
```

## CLI usage

```bash
npx @bear1210/create-rn-template myNewApp --package=com.example.mynewapp
```

Optional flags:

- `--skip-install` skip npm install in generated app
- `--package=<applicationId>` set Android package name when initializing app

### What the scaffold includes

- React Native 0.81.6 project bootstrap (via RN CLI)
- Base engineering configs (`tsconfig`, `eslint`, `prettier`, `metro`, `jest`)
- Infrastructure modules: `logger`, `i18n`, `sqlite` (`react-native-quick-sqlite`), `mmkv` (`react-native-mmkv`)
- Git quality gates: `commitlint`, `husky`, `lint-staged`
- Cursor assets: `.cursor/rules`, `.cursor/skills`
- `patch-package` + `patches/`

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
npm run create-rn-template -- myNewApp --package=com.example.mynewapp --skip-install
```

## Generated app shape

- Keeps the familiar `src`-based structure
- Removes all previous business-domain code
- Leaves only minimal `Home` screen and app shell so you can start feature development directly
