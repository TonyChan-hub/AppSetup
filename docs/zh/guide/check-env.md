# 检查移动端环境

汇报当前机器上 Common / Android / iOS / React Native / Flutter 的就绪情况。

```bash
npx -p @bear1210/create-rn-template check-mobile-env
```

### 选项

| 参数 | 说明 |
| ---- | ---- |
| `--json` | 输出机器可读 JSON |
| `--strict-flutter` | 将 Flutter 视为必需（缺失则失败） |

### 示例

```bash
npx -p @bear1210/create-rn-template check-mobile-env --json
npx -p @bear1210/create-rn-template check-mobile-env --strict-flutter
```

除非加了 `--strict-flutter`，否则 Flutter 为**可选**。

### 在本仓库内

```bash
npm run check-mobile-env
```
