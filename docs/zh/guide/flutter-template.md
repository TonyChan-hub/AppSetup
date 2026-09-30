# Flutter 模板功能

`@bear1210/create-flutter-template` 生成项目时包含的内容。

## 应用壳

- 最小 `Home` 页（示例列表 + 计数器）与 `Logs` 页
- `GoRouter` + `Provider`
- **debug** 下摇一摇打开日志

## 基建（`lib/core/`）

- Dio 客户端 + token 存储 / 401 刷新拦截钩子
- 基于 sqflite 的 `LocalLogger`（查询 / 导出 JSON·CSV）
- Material 3 主题（Poppins）+ ScreenUtil（390×844）
- 相机 / 相册权限助手

## 工程化

- `analysis_options.yaml`（`flutter_lints`）
- ARB 国际化（`l10n.yaml` + `lib/l10n/`）
- `package.json` 脚本：run / analyze / format / build / `gen:l10n`
- `commitlint` + `husky`
- Cursor 规则：架构、Dart 风格、l10n、禁止 iOS 私有 API

## 刻意不包含

- 产品 / 业务页面或 API
- Firebase / 内购 / OAuth 凭证

## 默认包含

- `zippy_flutter` probe（仅 debug）— 脚手架会解压/拷贝到 `packages/zippy_flutter`

## 生成结构

```text
myFlutterApp/
├── lib/
│   ├── main.dart, app.dart
│   ├── pages/              # Home, Logs
│   ├── router/             # GoRouter
│   ├── widgets/common/
│   ├── providers/
│   ├── datasources/local/
│   ├── repositories/ / entities/ / services/
│   ├── core/               # network, theme, logging, permissions
│   └── l10n/
├── packages/zippy_flutter/ # Zippy debug probe（path 依赖）
├── assets/fonts/           # Poppins
├── android/ / ios/
├── pubspec.yaml
├── package.json
└── .cursor/rules/
```

## 生成之后

```bash
cd myFlutterApp
flutter run

# 可选：覆盖 API 基址
flutter run --dart-define=API_BASE_URL=https://your-host

# 修改 ARB 后
flutter gen-l10n   # 或: npm run gen:l10n
```

| 脚本 | 作用 |
| ---- | ---- |
| `npm run setup` | `flutter pub get` |
| `npm run analyze` | `flutter analyze` |
| `npm run format` | `dart format lib test` |
| `npm run run` / `dev` | `flutter run` |
| `npm run build:apk` | 正式版 APK（按 ABI 分包） |
| `npm run build:appbundle` | Play App Bundle |
| `npm run build:ipa` | iOS IPA |
| `npm run gen:l10n` | 重新生成本地化 |
