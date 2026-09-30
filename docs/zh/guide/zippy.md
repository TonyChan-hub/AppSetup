# Zippy 调试器

Zippy 是基于 **Tauri 2** 的桌面应用，用于查看移动端调试数据。通过 **GitHub Releases** 分发，不发布到 npm。

<ZippyDownload locale="zh" />

## 能看什么

| 面板 | 数据 |
| ---- | ---- |
| **Device** | 应用 / 系统信息，并在此连接 probe（`host:port`） |
| **MMKV / KV** | 已注册的键值存储 |
| **SQLite** | 已注册的数据库 — 表与行预览 |
| **Network** | 抓取的 HTTP（RN `attachFetch` / Flutter `attachDio`） |
| **Perf** | probe 上报的轻量性能采样 |

Probe WebSocket 路径固定为 `/probe`（`ws://host:9876/probe`）。默认端口：**9876**。

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

`@bear1210/create-rn-template` / `@bear1210/create-flutter-template` 生成的新项目在 **debug** 下已默认接入 Zippy。打开 Zippy → **Device** → 输入 host/port → **Connect**。

### 该填哪个 host

| 目标 | Zippy 里填的 host |
| ---- | ----------------- |
| iOS Simulator / Android Emulator | `127.0.0.1`（多数可用；Android 有时需端口映射） |
| 真机 Android | 设备局域网 IP，**或** `adb forward tcp:9876 tcp:9876` 后填 `127.0.0.1` |
| 真机 iOS | 设备局域网 IP（仅 USB 不会暴露 probe 端口） |

Zippy 跑在 **电脑** 上，要连到 **手机** 上的 probe。USB Android 应使用 `adb forward`（主机 → 设备），**不要**用 `adb reverse`。

```bash
adb forward tcp:9876 tcp:9876
# 然后在 Zippy 连接 127.0.0.1:9876
```

### React Native（`@bear1210/zippy-rn`）

```bash
npm install @bear1210/zippy-rn react-native-tcp-socket buffer
# MMKV / SQLite 面板所需 peer（AppSetup RN 模板已带）：
# react-native-mmkv react-native-quick-sqlite
```

```tsx
import { open } from 'react-native-quick-sqlite';
import { ZippyProbe } from '@bear1210/zippy-rn';
import { readMmkvSnapshot } from '@/services/mmkvStorage'; // 或你自己的 reader

if (__DEV__) {
  ZippyProbe.registerMmkvStore('default', () => readMmkvSnapshot('default'));
  // 传入 openDb，让 Metro 从宿主 App 解析 quick-sqlite（而不是从 zippy-rn）：
  ZippyProbe.registerSqliteDatabase('app.db', 'app.db', () =>
    open({ name: 'app.db' }),
  );

  void ZippyProbe.start({
    appInfo: { name: 'MyApp', version: '0.0.1' },
  });
}

// 可选 — 包装共用 fetch，供 Network 面板使用：
const fetchWithZippy = ZippyProbe.attachFetch(fetch);
```

`ZippyProbe.start()` 在非 `__DEV__` 下默认 no-op，除非传入 `enabled: true`。

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

// 可选 — 仅当 documents 下自动发现不到库时再注册：
ZippyProbe.registerSqliteDatabase('app.db', dbPath);
ZippyProbe.registerMmkvStore('session', () => {'token': '…'});
```

用 `bash packages/zippy_flutter/scripts/pack.sh` 打包，或由 `create-flutter-template` 解压 vendor zip。详见 [`packages/zippy_flutter/README.md`](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_flutter)。

## 发版

Bump `@bear1210/zippy` 并推送到 `main` 会触发 Zippy 发版工作流。打包产物会把 `.dmg` 以及 `download.json` / `latest.json` 发布到 GitHub Releases，上方的下载面板会自动读取这些资源。
