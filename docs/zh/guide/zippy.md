# Zippy 调试器

Zippy 是基于 **Tauri 2** 的桌面应用，用于查看移动端调试数据（MMKV / SQLite / 网络 / 性能）。通过 **GitHub Releases** 分发，不发布到 npm。

## 前置条件

- Node.js 20+
- Rust stable（`rustup`）
- macOS（主要目标平台）

## 开发

```bash
npm install
npm run zippy
```

## 构建

```bash
npm run zippy:build
```

## 连接 Flutter probe

1. 在应用中加入 `zippy_flutter`，并在 debug 模式下调用 `await ZippyProbe.start()`
2. 在 Mac 可访问的设备 / 模拟器上运行应用
3. 打开 Zippy → **Device** → 输入 host/port（默认 `9876`）→ **Connect**

SDK 细节见 [`zippy_flutter` 包 README](https://github.com/TonyChan-hub/AppSetup/tree/main/packages/zippy_flutter)。

## 发版

Bump `@bear1210/zippy` 并推送到 `main` 会触发 Zippy 发版工作流。打包产物通过 `tauri-plugin-updater` 对接 GitHub Releases。
