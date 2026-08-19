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
cd /Users/a1518/Desktop/project/rn-template
npm install
npm link
create-rn-template my-new-app --package=com.example.mynewapp
```

Optional flags:

- `--skip-install` skip npm install in generated app
- `--package=<applicationId>` set Android package name when initializing app

## Generated app shape

- Keeps the familiar `src`-based structure
- Removes all previous business-domain code
- Leaves only minimal `Home` screen and app shell so you can start feature development directly
