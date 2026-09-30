# What is AppSetup?

AppSetup is a monorepo of **business-free** mobile scaffolds and macOS toolchain helpers. Use it when you want a production-shaped project shell without product domain code, Firebase, IAP, or OAuth credentials baked in.

## What you get

| Goal | Command |
| ---- | ------- |
| New React Native app | `npx @bear1210/create-rn-template <ProjectName>` ([name rules](./create-rn#project-name-rules)) |
| New Flutter app | `npx @bear1210/create-flutter-template <name>` |
| Android SDK / JDK (macOS) | `npx -p @bear1210/create-rn-template setup-rn-android-env` |
| iOS CocoaPods toolchain (macOS) | `npx -p @bear1210/create-rn-template setup-rn-ios-env` |
| Diagnose the machine | `npx -p @bear1210/create-rn-template check-mobile-env` |
| Inspect debug data (desktop) | [Download Zippy](./zippy#download) — connect to the scaffold probe on port `9876` |

## Requirements

- **Node.js** `>= 20`
- **macOS** for `setup-rn-*-env` helpers (Xcode required for iOS setup)
- **Flutter SDK** on `PATH` when creating Flutter apps

## 60-second start

```bash
# React Native — ProjectName must be a JS identifier (MyNewApp), not kebab-case
npx @bear1210/create-rn-template MyNewApp --package=com.example.mynewapp

# Flutter
npx @bear1210/create-flutter-template myFlutterApp --org=com.example
cd myFlutterApp && flutter run
```

Next: [Packages](./packages) · [Create RN app](./create-rn) · [Create Flutter app](./create-flutter) · [Zippy](./zippy)
