# 什么是 AppSetup？

AppSetup 是一套**无业务逻辑**的移动端脚手架与 macOS 工具链助手。适合想要「生产级项目壳」，但不想内置产品域、Firebase、内购或 OAuth 凭证的场景。

## 你能做什么

| 目标 | 命令 |
| ---- | ---- |
| 新建 React Native 应用 | `npx @bear1210/create-rn-template <ProjectName>`（[命名规范](./create-rn#项目名规范)） |
| 新建 Flutter 应用 | `npx @bear1210/create-flutter-template <name>` |
| Android SDK / JDK（macOS） | `npx -p @bear1210/create-rn-template setup-rn-android-env` |
| iOS CocoaPods 工具链（macOS） | `npx -p @bear1210/create-rn-template setup-rn-ios-env` |
| 诊断本机环境 | `npx -p @bear1210/create-rn-template check-mobile-env` |
| 查看调试数据（桌面端） | [下载 Zippy](./zippy#download) — 连接脚手架自带的 probe（端口 `9876`） |

## 环境要求

- **Node.js** `>= 20`
- **macOS**（`setup-rn-*-env` 仅支持 Mac；iOS 配置需要已安装 Xcode）
- 创建 Flutter 项目时，**Flutter SDK** 需在 `PATH` 中

## 一分钟上手

```bash
# React Native — 项目名须为 JS 标识符（MyNewApp），不要用 kebab-case
npx @bear1210/create-rn-template MyNewApp --package=com.example.mynewapp

# Flutter
npx @bear1210/create-flutter-template myFlutterApp --org=com.example
cd myFlutterApp && flutter run
```

接下来：[包一览](./packages) · [创建 RN 项目](./create-rn) · [创建 Flutter 项目](./create-flutter) · [Zippy](./zippy)
