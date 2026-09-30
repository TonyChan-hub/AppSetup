# Zippy 调试器

Zippy 是基于 **Tauri 2** 的桌面应用，用于查看移动端调试数据（MMKV / SQLite / 网络 / 性能）。通过 **GitHub Releases** 分发，不发布到 npm。

<ZippyDownload locale="zh" />

## 前置条件

- Node.js 20+
- Rust stable（`rustup`）
- macOS（主要目标平台）

## 开发 {#develop}

```bash
npm install
npm run zippy
```

## 构建

```bash
npm run zippy:build
```

## 连接 probe

`@bear1210/create-rn-template` / `@bear1210/create-flutter-template` 生成的新项目在 **debug** 下已默认接入 Zippy。打开 Zippy 桌面端 → **Device** → 输入 host/port（默认 `9876`）→ **Connect**。

### React Native（`@bear1210/zippy-rn`）

```bash
npm install @bear1210/zippy-rn react-native-tcp-socket buffer
```

```tsx
import { ZippyProbe } from '@bear1210/zippy-rn';

await ZippyProbe.start(); // 非 __DEV__ 默认 no-op，除非 enabled: true
```

详见 [`packages/zippy_rn/README.md`](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_rn)。

### Flutter（`zippy_flutter` zip / path）

```yaml
dependencies:
  zippy_flutter:
    path: packages/zippy_flutter
```

```dart
await ZippyProbe.start(); // 非 debug 默认 no-op，除非 ZIPPY_PROBE=true
ZippyProbe.attachDio(dio);
```

用 `bash packages/zippy_flutter/scripts/pack.sh` 打包，或由 `create-flutter-template` 解压 vendor zip。详见 [`packages/zippy_flutter/README.md`](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_flutter)。

真机 Android：使用设备局域网 IP，或执行 `adb forward tcp:9876 tcp:9876` 后连 `127.0.0.1`（Zippy 在电脑端，要连到手机上的 probe，需要 `forward` 而不是 `reverse`）。

## 发版

Bump `@bear1210/zippy` 并推送到 `main` 会触发 Zippy 发版工作流。打包产物会把 `.dmg` 以及 `download.json` / `latest.json` 发布到 GitHub Releases，上方的下载面板会自动读取这些资源。
