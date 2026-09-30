# React Native template features

What `@bear1210/create-rn-template` puts into a new app.

## App shell

- Familiar `src/`-based structure
- Minimal `Home` screen + infrastructure shell
- No business domain screens or credentials

## Infrastructure

| Module | Package / notes |
| ------ | --------------- |
| Logger | Project `logger` service |
| i18n | Locale files under `src/i18n` |
| SQLite | `react-native-quick-sqlite` |
| MMKV | `react-native-mmkv` |
| HTTP | Shared `httpClient` (fetch + Zippy network hook in `__DEV__`) |
| Zippy | `@bear1210/zippy-rn` — `start()` in `__DEV__`; registers MMKV + SQLite with app `openDb` (see [Zippy](./zippy)) |

## Engineering

- React Native **0.81.6** bootstrap
- Base configs: `tsconfig`, ESLint, Prettier, Metro, Jest
- Git gates: `commitlint`, `husky`, `lint-staged`
- Cursor assets: `.cursor/rules`, `.cursor/skills`
- `patch-package` + `patches/`

## Generated shape (high level)

```text
MyNewApp/
├── src/
│   ├── components/
│   ├── constants/ / theme/
│   ├── hooks/ / stores/ / repositories/
│   ├── i18n/
│   ├── services/     # http, logger, mmkv, database
│   └── ...
├── android/ / ios/
├── package.json
└── .cursor/
```
