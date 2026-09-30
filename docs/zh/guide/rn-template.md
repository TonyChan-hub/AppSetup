# RN 模板功能

`@bear1210/create-rn-template` 生成项目时包含的内容。

## 应用壳

- 熟悉的 `src/` 目录结构
- 最小 `Home` 页面 + 基建壳层
- 不含业务域页面或凭证

## 基建

| 模块 | 说明 |
| ---- | ---- |
| Logger | 项目内 `logger` 服务 |
| i18n | `src/i18n` 多语言 |
| SQLite | `react-native-quick-sqlite` |
| MMKV | `react-native-mmkv` |
| HTTP | 共用 `httpClient` |

## 工程化

- React Native **0.81.6** 引导
- 基础配置：`tsconfig`、ESLint、Prettier、Metro、Jest
- Git 门禁：`commitlint`、`husky`、`lint-staged`
- Cursor 资源：`.cursor/rules`、`.cursor/skills`
- `patch-package` + `patches/`

## 生成结构（概览）

```text
myNewApp/
├── src/
│   ├── components/
│   ├── constants/ / theme/
│   ├── hooks/ / stores/ / repositories/
│   ├── i18n/
│   ├── services/     # http, logger, mmkv, database
│   └── ...
├── android/ / ios/
├── package.json
└── .cursor/
```
