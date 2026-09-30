# 包一览

| 包 | 发布方式 | 作用 |
| -- | -------- | ---- |
| [`@bear1210/create-rn-template`](https://www.npmjs.com/package/@bear1210/create-rn-template) | npm | RN 脚手架 CLI + 环境配置 / 检查命令 |
| [`@bear1210/create-flutter-template`](https://www.npmjs.com/package/@bear1210/create-flutter-template) | npm | Flutter 脚手架 CLI |
| [`@bear1210/zippy`](/zh/guide/zippy) | GitHub Releases | Tauri 桌面调试器（[下载](/zh/guide/zippy#download)） |
| `@bear1210/zippy-probe-protocol` | npm | 共享 JSON probe 协议 |
| `zippy_flutter` | path / pub | Flutter 调试 probe SDK |

根目录 `package.json` 为 private，仅用于编排 workspaces。发版请在对应包上 bump 版本，不要改根包版本。

## 仓库结构

```text
packages/
  create-rn-template/       # RN CLI + 模板 + 环境脚本
  create-flutter-template/  # Flutter CLI + 无业务模板
  zippy/                    # Tauri 桌面调试器
  zippy-probe-protocol/     # 共享 probe 协议
  zippy_flutter/            # Flutter probe SDK
```

## 本地开发

```bash
git clone https://github.com/TonyChan-hub/AppSetup.git
cd AppSetup
npm install

npm run check-mobile-env
npm run create-rn-template -- myNewApp --package=com.example.mynewapp --skip-install
npm run create-flutter-template -- myFlutterApp --org=com.example --skip-install
```
