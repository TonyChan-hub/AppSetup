# @bear1210/create-rn-template

Scaffold CLI published to npm. Version in this `package.json` is the npm package version.

```bash
npx @bear1210/create-rn-template MyNewApp --package=com.example.mynewapp
```

**Project name:** must be a JS identifier (`MyNewApp` / `myNewApp`). Do not use kebab-case (`my-new-app`) or snake_case — React Native CLI rejects them. The CLI validates this before calling RN init.

Generated apps include TypeScript infra (logger, i18n, MMKV, SQLite) and wire `@bear1210/zippy-rn` in `__DEV__` (MMKV + SQLite with app `openDb`). Connect with [Zippy](../../docs/guide/zippy.md) on port `9876`.

See the [repo README](../../README.md), [Create RN docs](../../docs/guide/create-rn.md), and [RN template features](../../docs/guide/rn-template.md).
