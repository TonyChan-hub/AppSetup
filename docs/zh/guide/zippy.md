# Zippy 调试器

Zippy 是基于 **Tauri 2** 的桌面应用，顶层三个大模式：**Git**（多仓库 + SSH Profile）、**Inspector**（移动端调试数据）、**Tools**（adb / iOS Simulator 快捷命令）。通过 **GitHub Releases** 分发，不发布到 npm。

<ZippyDownload locale="zh" />

## 模式

### Git

多仓库工作区，按仓库绑定身份 / SSH Profile。配置与 GitSwitch 共用 `~/.gitswitch/config.json`（若已有 `~/.gitbench` 会继续沿用）。只写仓库 **local** git config，不改全局 `~/.gitconfig`。需要系统已安装 `git`。

| 区域 | 能做什么 |
| ---- | -------- |
| 仓库 | 添加 / 选择 / 移除本地仓库 |
| 分支 | 查看本地 / 远端跟踪分支，筛选，**切换分支** |
| 提交 / Remotes | 浏览近期提交与已配置 remotes |
| Profiles | 新建 / 编辑 / 删除身份 Profile（`user.name` / `user.email` / SSH 私钥），导入本机已知密钥，**应用到当前仓库** |

不包含：Fetch、Push、创建或删除分支，以及修改全局 git config。

### Inspector

连接移动端 debug probe，查看应用内数据。

| 面板 | 数据 |
| ---- | ---- |
| **Device** | 连接 `host:port`，查看应用 / 系统信息 |
| **MMKV / KV** | 已注册的键值存储 |
| **SQLite** | 已注册的数据库 — 表与行预览 |
| **Network** | 抓取的 HTTP（RN `attachFetch` / Flutter `attachDio`） |
| **Perf** | probe 上报的轻量性能采样 |

Probe WebSocket 路径固定为 `/probe`（`ws://host:9876/probe`）。默认端口：**9876**。

### Tools

对本机 `adb` / `xcrun simctl` 的白名单封装（不是任意 Shell）。选中设备后可操作：

| 区域 | 能做什么 |
| ---- | -------- |
| Devices | 列出 Android 设备 / AVD 与 iOS Simulator；启动 / 关机 |
| Ports | `adb forward` 转发 Zippy probe（默认 `9876`）；`adb reverse` 转发 Metro（默认 `8081`） |
| Capture | 截图、保存 PNG、录屏 / 停止 |
| App | 安装 / 卸载 / 启动 / 重启 / 强停 / 清数据；列出已装包 |
| Media / URL | 导入相册、打开深链 / URL、输入文字（Android） |
| Env | 授予 / 撤销权限、设置 GPS、切换浅色 / 深色外观 |
| Logs | 流式 `logcat` / `log stream`，支持 Start / Stop 与过滤 |

| 操作 | Android | iOS Simulator |
| ---- | ------- | ------------- |
| 设备 / AVD 列表 | `adb devices -l`、`emulator -list-avds` | `simctl list devices available` |
| 启动 / 关机 | 启动 AVD / `adb reboot -p` | `simctl boot` / `shutdown` |
| Probe 端口转发 | `adb forward`（默认 `9876`） | 不需要 — 用 `127.0.0.1` |
| Metro reverse | `adb reverse`（默认 `8081`） | — |
| 截图 / 录屏 | `screencap` / `screenrecord` | `simctl io screenshot` / `recordVideo` |
| 安装 / 卸载 / 启动 / 重启 / 强停 | `install` / `uninstall` / `monkey` / `force-stop` | `simctl install` / `uninstall` / `launch` / `terminate` |
| 清数据 | `pm clear` | —（重装） |
| 已装包列表 | `pm list packages -3` | `simctl listapps` |
| 导入相册 | `adb push` + 媒体扫描 | `simctl addmedia` |
| 打开 URL / 深链 | `am start -d` | `simctl openurl` |
| 输入文字 | `input text` | —（仅 Android） |
| 权限 | `pm grant` / `revoke` | `simctl privacy` |
| 定位 | `adb emu geo fix`（模拟器） | `simctl location set` |
| 外观 | `cmd uimode night` | `simctl ui appearance` |
| 日志 | `adb logcat`（Start / Stop） | `simctl spawn … log stream` |

需要 Android platform-tools（`adb` 或 `ANDROID_HOME`）和/或 Xcode（`xcrun`）。打包后的 Zippy 会尝试解析常见 Homebrew / SDK 路径。

典型 USB Android 流程：**Tools → Forward** → **Inspector → Connect** 到 `127.0.0.1:9876`。真机跑 Metro 用 **Reverse**（默认 `8081`）。

## 前置条件

- Node.js 20+
- Rust stable（`rustup`）
- 系统 `git`（Git 模式）
- `adb` / Xcode（Tools 模式，用到时才需要）
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

`@bear1210/create-rn-template` / `@bear1210/create-flutter-template` 生成的新项目在 **debug** 下已默认接入 Zippy。打开 Zippy → **Inspector** → **Device** → 输入 host/port → **Connect**。

### 该填哪个 host

| 目标 | Zippy 里填的 host |
| ---- | ----------------- |
| iOS Simulator / Android Emulator | `127.0.0.1`（多数可用；Android 有时需端口映射） |
| 真机 Android | 设备局域网 IP，**或** `adb forward tcp:9876 tcp:9876` 后填 `127.0.0.1` |
| 真机 iOS | 设备局域网 IP（仅 USB 不会暴露 probe 端口） |

Zippy 跑在 **电脑** 上，要连到 **手机** 上的 probe。USB Android 应使用 `adb forward`（主机 → 设备），**不要**用 `adb reverse`。

```bash
adb forward tcp:9876 tcp:9876
# 然后在 Zippy Inspector 连接 127.0.0.1:9876
# 或使用 Zippy → Tools → Forward
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
