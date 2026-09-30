# Setup Android / iOS environment

Global toolchain bootstrap on **macOS only**. No project path required.

## Android (SDK / JDK / emulator, no Android Studio)

```bash
npx -p @bear1210/create-rn-template setup-rn-android-env
```

## iOS (requires Xcode.app already installed)

```bash
npx -p @bear1210/create-rn-template setup-rn-ios-env
```

## Mirrors

Both commands auto-detect your public IP country and pick mirrors:

| Region | Sources |
| ------ | ------- |
| Mainland China (`CN`) | Homebrew USTC + npm npmmirror + RubyGems ruby-china |
| Elsewhere / detect failed | Official sources |

Force a region:

```bash
RN_SETUP_MIRROR=cn npx -p @bear1210/create-rn-template setup-rn-android-env
RN_SETUP_MIRROR=global npx -p @bear1210/create-rn-template setup-rn-ios-env
```

::: tip
iOS expects Xcode from the App Store. Android SDK packages still download from Google.
:::
