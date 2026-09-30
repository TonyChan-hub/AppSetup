# 创建 React Native 项目

生成无业务逻辑的 React Native 0.81 项目，包含 TypeScript、基础基建与工程门禁。

## 用法

```bash
npx @bear1210/create-rn-template <ProjectName> [--package=<id>] [--skip-install]
```

### 项目名规范

React Native CLI 要求项目名是合法的 **JS 标识符**（与 `npx @react-native-community/cli init` 相同）：

| 可用 | 不可用 |
| ---- | ------ |
| `MyNewApp`、`myNewApp`、`AppSetupRn` | `my-new-app`（kebab-case） |
| 字母 + 数字，**必须以字母开头** | `my_new_app`（snake_case）、空格、数字开头 |

名称不合法时，本 CLI 会提前报错退出，而不会等到 RN CLI 内部失败。

### 示例

```bash
npx @bear1210/create-rn-template MyNewApp --package=com.example.mynewapp
cd MyNewApp
npm start
```

### 参数

| 参数 | 说明 |
| ---- | ---- |
| `<ProjectName>` | 输出目录 / 应用名（仅 JS 标识符） |
| `--package=<applicationId>` | 初始化时的 Android applicationId |
| `--skip-install` | 跳过生成项目里的 `npm install` |

## 在本仓库内使用

```bash
npm install
npm run create-rn-template -- MyNewApp --package=com.example.mynewapp
```

## CLI 做了什么

1. 通过 RN CLI 引导生成 React Native 0.81.6 项目
2. 覆盖 AppSetup `template/`（src 结构、基建、配置、Cursor 资源）
3. 除非加了 `--skip-install`，否则在新项目中安装依赖

模板内容详见 [RN 模板功能](./rn-template)。
