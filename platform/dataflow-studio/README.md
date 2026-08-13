# DataFlow 数据整理工作台

浏览器端 CSV 数据质量检查与清洗工具，支持多字段规则、拖拽优先级、结果预览和导出。数据只在当前浏览器处理，不上传服务器。

## 本地运行

双击 `start-dataflow.cmd`，或在 PowerShell 中运行：

```powershell
npm install
npm run dev -- --port 4317
```

电脑访问 `http://127.0.0.1:4317/`。同一 Wi-Fi 下，手机可访问终端显示的 `Network` 地址。

## 发布和交接

- 完整上传步骤见 `UPLOAD_GUIDE_CN.md`
- 产品与技术说明见 `docs/PRODUCT.md`
- 新 AI 修改项目时，先阅读 `AGENTS.md`
- 推送到 GitHub `main` 分支后，工作流会自动构建并发布 GitHub Pages
