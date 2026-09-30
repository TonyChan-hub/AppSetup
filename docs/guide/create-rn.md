# Create a React Native app

Scaffold a business-free React Native 0.81 project with TypeScript, infra modules, and engineering gates.

## Usage

```bash
npx @bear1210/create-rn-template <project-name> [--package=<id>] [--skip-install]
```

### Example

```bash
npx @bear1210/create-rn-template myNewApp --package=com.example.mynewapp
cd myNewApp
npm start
```

### Flags

| Flag | Description |
| ---- | ----------- |
| `<project-name>` | Output directory / app name |
| `--package=<applicationId>` | Android applicationId when initializing |
| `--skip-install` | Skip `npm install` in the generated app |

## From this monorepo

```bash
npm install
npm run create-rn-template -- myNewApp --package=com.example.mynewapp
```

## What happens

1. Bootstraps a React Native 0.81.6 project (via RN CLI)
2. Overlays the AppSetup `template/` (src layout, infra, configs, Cursor assets)
3. Unless `--skip-install`, runs dependency install in the new app

See [RN template features](./rn-template) for what lands in the project.
