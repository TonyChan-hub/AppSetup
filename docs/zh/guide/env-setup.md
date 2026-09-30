# 配置 Android / iOS 环境

在 **macOS** 上做全局工具链引导，不需要指定项目路径。

## Android（SDK / JDK / 模拟器，无需 Android Studio）

```bash
npx -p @bear1210/create-rn-template setup-rn-android-env
```

## iOS（需已安装 Xcode.app）

```bash
npx -p @bear1210/create-rn-template setup-rn-ios-env
```

## 镜像

两条命令会根据公网 IP 国家自动选择镜像：

| 地区 | 源 |
| ---- | -- |
| 中国大陆（`CN`） | Homebrew USTC + npm npmmirror + RubyGems ruby-china |
| 其他 / 检测失败 | 官方源 |

强制指定地区：

```bash
RN_SETUP_MIRROR=cn npx -p @bear1210/create-rn-template setup-rn-android-env
RN_SETUP_MIRROR=global npx -p @bear1210/create-rn-template setup-rn-ios-env
```

::: tip
iOS 需要从 App Store 安装的 Xcode。Android SDK 包仍从 Google 下载。
:::
