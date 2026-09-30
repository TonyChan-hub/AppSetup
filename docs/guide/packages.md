# Packages

| Package | Publish | Role |
| ------- | ------- | ---- |
| [`@bear1210/create-rn-template`](https://www.npmjs.com/package/@bear1210/create-rn-template) | npm | RN scaffold CLI + env setup / check bins |
| [`@bear1210/create-flutter-template`](https://www.npmjs.com/package/@bear1210/create-flutter-template) | npm | Flutter scaffold CLI (embeds `zippy_flutter` vendor zip) |
| [`@bear1210/zippy`](/guide/zippy) | GitHub Releases | Tauri desktop tool — Git / Inspector / Tools ([download](/guide/zippy#download)) |
| `@bear1210/zippy-probe-protocol` | npm | Shared JSON probe protocol |
| [`@bear1210/zippy-rn`](https://www.npmjs.com/package/@bear1210/zippy-rn) | npm | React Native debug probe SDK ([README](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_rn)) |
| `zippy_flutter` | zip / path | Flutter debug probe SDK ([README](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_flutter)) |

Root `package.json` is private and only orchestrates workspaces. Bump versions on the package you publish — not the repo root.

## Monorepo layout

```text
packages/
  create-rn-template/       # RN CLI + template + setup/check scripts
  create-flutter-template/  # Flutter CLI + business-free template + vendor zip
  zippy/                    # Tauri desktop inspector
  zippy-probe-protocol/     # Shared probe protocol
  zippy_rn/                 # RN probe SDK (npm)
  zippy_flutter/            # Flutter probe SDK (zip / path)
```

## Local development

```bash
git clone https://github.com/TonyChan-hub/AppSetup.git
cd AppSetup
npm install

npm run check-mobile-env
npm run create-rn-template -- MyNewApp --package=com.example.mynewapp --skip-install
npm run create-flutter-template -- myFlutterApp --org=com.example --skip-install
```
