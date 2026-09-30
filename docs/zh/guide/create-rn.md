# 创建 React Native 项目

生成无业务逻辑的 React Native 0.81 项目，包含 TypeScript、基础基建与工程门禁。

## 用法

```bash
npx @bear1210/create-rn-template <project-name> [--package=<id>] [--skip-install]
```

### 示例

```bash
npx @bear1210/create-rn-template myNewApp --package=com.example.mynewapp
cd myNewApp
npm start
```

### 参数

| 参数 | 说明 |
| ---- | ---- |
| `<project-name>` | 输出目录 / 应用名 |
| `--package=<applicationId>` | 初始化时的 Android applicationId |
| `--skip-install` | 跳过生成项目里的 `npm install` |

## 在本仓库内使用

```bash
npm install
npm run create-rn-template -- myNewApp --package=com.example.mynewapp
```

## CLI 做了什么

1. 通过 RN CLI 引导生成 React Native 0.81.6 项目
2. 覆盖 AppSetup `template/`（src 结构、基建、配置、Cursor 资源）
3. 除非加了 `--skip-install`，否则在新项目中安装依赖

模板内容详见 [RN 模板功能](./rn-template)。
