# Create a React Native app

Scaffold a business-free React Native 0.81 project with TypeScript, infra modules, and engineering gates.

## Usage

```bash
npx @bear1210/create-rn-template <ProjectName> [--package=<id>] [--skip-install]
```

### Project name rules

React Native CLI requires a **JS identifier** (same rule as `npx @react-native-community/cli init`):

| Allowed | Not allowed |
| ------- | ----------- |
| `MyNewApp`, `myNewApp`, `AppSetupRn` | `my-new-app` (kebab-case) |
| Letters + digits, **must start with a letter** | `my_new_app` (snake_case), spaces, leading digits |

If the name is invalid, this CLI exits early with an error instead of failing inside RN CLI.

### Example

```bash
npx @bear1210/create-rn-template MyNewApp --package=com.example.mynewapp
cd MyNewApp
npm start
```

### Flags

| Flag | Description |
| ---- | ----------- |
| `<ProjectName>` | Output directory / app name (JS identifier only) |
| `--package=<applicationId>` | Android applicationId when initializing |
| `--skip-install` | Skip `npm install` in the generated app |

## From this monorepo

```bash
npm install
npm run create-rn-template -- MyNewApp --package=com.example.mynewapp
```

## What happens

1. Bootstraps a React Native 0.81.6 project (via RN CLI)
2. Overlays the AppSetup `template/` (src layout, infra, configs, Cursor assets)
3. Unless `--skip-install`, runs dependency install in the new app

See [RN template features](./rn-template) for what lands in the project.
