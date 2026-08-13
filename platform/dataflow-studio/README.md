# DataFlow 数据整理工作台

浏览器端 CSV 数据质量检查与清洗工具，支持多字段规则、拖拽优先级、结果预览和导出。数据只在当前浏览器处理，不上传服务器。

## 直接打开网页使用

在线版本已经部署到 GitHub Pages，点击或复制下面的链接即可打开：

<https://nanako95.github.io/ai-workspace/>

在线使用前不需要安装 Git、Node.js、AI/Codex 或其他开发工具，只需要一台能打开现代浏览器的电脑或手机。推荐使用最新版 Chrome、Edge、Safari 或 Firefox。

使用步骤：

1. 打开上面的网页链接。
2. 点击“导入 CSV”选择当前设备上的 CSV 文件，或点击“加载示例”。
3. 在数据整理、数据编辑、质量报告和数据分析之间切换。
4. 完成后导出 CSV。

数据分析使用建议：先选择分组字段、指标字段和聚合方式，再配置筛选字段和值；如果选择了日期字段，还可以按月或按年查看时间趋势。点击“分析看板”后再选择柱状排行、占比环图、时间趋势或明细排行，页面不会默认铺开全部看板。

点击“加载示例”会载入包含日期、地区、渠道、产品、分类、数量、金额和订单状态的多行订单数据，可直接练习透视汇总、条件筛选和时间趋势分析。

CSV 只在当前设备的浏览器中处理，不会自动上传到 GitHub，也不会自动同步到其他设备。不要在公共电脑上导入敏感数据。

手机或电脑也可以把网页保存为应用入口：

- iPhone：Safari 点击分享按钮，选择“添加到主屏幕”。
- Android：Chrome 菜单选择“安装应用”或“添加到主屏幕”。
- Windows/macOS：Chrome 或 Edge 地址栏右侧出现安装图标时，可点击安装。

## 本地开发（仅修改代码时需要）

如果只是使用网页，不需要执行本节命令。只有要让 AI 修改代码、调试或运行自己的本地版本时，才需要安装 Git 和 Node.js。

需要准备：

- Git：https://git-scm.com/downloads
- Node.js LTS：https://nodejs.org/

然后在项目目录执行：

双击 `start-dataflow.cmd`，或在 PowerShell 中运行：

```powershell
npm install
npm run dev -- --port 4317
```

电脑访问 `http://127.0.0.1:4317/`。同一 Wi-Fi 下，手机可访问终端显示的 `Network` 地址。

本地地址只对正在运行开发服务的电脑有效；想直接点击网页使用，请使用上面的 GitHub Pages 地址。

## 发布和交接

- 完整上传步骤见 `UPLOAD_GUIDE_CN.md`
- 产品与技术说明见 `docs/PRODUCT.md`
- 新 AI 修改项目时，先阅读 `AGENTS.md`
- 推送到 GitHub `main` 分支后，工作流会自动构建并发布 GitHub Pages
