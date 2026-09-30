# Check mobile environment

Report Common / Android / iOS / React Native / Flutter readiness on the current machine.

```bash
npx -p @bear1210/create-rn-template check-mobile-env
```

### Options

| Flag | Description |
| ---- | ----------- |
| `--json` | Machine-readable JSON output |
| `--strict-flutter` | Treat Flutter as required (fail if missing) |

### Examples

```bash
npx -p @bear1210/create-rn-template check-mobile-env --json
npx -p @bear1210/create-rn-template check-mobile-env --strict-flutter
```

Flutter is **optional** unless `--strict-flutter` is set.

### From monorepo

```bash
npm run check-mobile-env
```
