# 创建 Flutter 项目

生成无业务逻辑的 Flutter 应用（Android + iOS），采用分层 `lib/` 结构与共用基建。

## 环境要求

- Node.js `>= 20`
- Flutter SDK 在 `PATH` 中
- iOS 构建：Xcode + CocoaPods（macOS）

建议先检查：

```bash
npx -p @bear1210/create-rn-template check-mobile-env --strict-flutter
```

## 用法

```bash
npx @bear1210/create-flutter-template <project-name> [--org=com.example] [--skip-install]
```

### 示例

```bash
npx @bear1210/create-flutter-template myFlutterApp --org=com.example
cd myFlutterApp
flutter run
```

### 参数

| 参数 | 说明 |
| ---- | ---- |
| `<project-name>` | 输出目录；同时推导 Dart 包名（`snake_case`） |
| `--org=<reverse-domain>` | Android applicationId / iOS bundle 前缀（默认 `com.example`） |
| `--skip-install` | 跳过 `flutter pub get`、`gen-l10n` 与 npm 工具安装 |

## CLI 做了什么

1. 执行 `flutter create --org … --project-name … --platforms android,ios`
2. 覆盖无业务 `template/`
3. 将占位包名替换为你的 Dart 包名
4. 注入相机 / 相册权限相关文案
5. 向 Android Gradle 注入阿里云 Maven / 腾讯云 Gradle 发行包镜像，并在可写时给 Flutter SDK 的 `flutter_tools/gradle` 打上同样镜像（`includeBuild` 需要；升级 Flutter 后可能需重新生成或手动补丁）
6. 除非 `--skip-install`：依次 `flutter pub get` → `flutter gen-l10n` → `npm install`

完整能力见 [Flutter 模板功能](./flutter-template)。
