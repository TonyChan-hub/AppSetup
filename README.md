# RN Template CLI

Business-free React Native scaffold extracted from `paint-color-visualizer-c`.

## What is included

- React Native 0.81.6 project bootstrap (via RN CLI)
- Base engineering configs (`tsconfig`, `eslint`, `prettier`, `metro`, `jest`)
- Infrastructure modules:
  - `logger`
  - `i18n`
  - `sqlite` (`react-native-quick-sqlite`)
  - `mmkv` (`react-native-mmkv`)
- Git quality gates:
  - `commitlint`
  - `husky`
  - `lint-staged`
- Cursor assets:
  - `.cursor/rules`
  - `.cursor/skills`
- `patch-package` + `patches/`

## CLI usage

```bash
npx @bear1210/create-rn-template myNewApp --package=com.example.mynewapp
```

Optional flags:

- `--skip-install` skip npm install in generated app
- `--package=<applicationId>` set Android package name when initializing app

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
## Generated app shape

- Keeps the familiar `src`-based structure
- Removes all previous business-domain code
- Leaves only minimal `Home` screen and app shell so you can start feature development directly
