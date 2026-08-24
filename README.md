# AI Workspace

个人 AI 项目总仓库，按交付物类型统一归档。

## 目录

- `platform/`: 可直接运行的网站、平台和应用
- `skills/`: 可复用的 AI/Codex 技能
- `automations/`: 自动化脚本与工作流
- `documents/`: 非敏感模板和使用指南
- `experiments/`: 尚未正式发布的实验项目
- `archive/`: 已停止维护的历史项目

## 当前项目

- `platform/dataflow-studio`: CSV 数据整理与质量检查平台
- `platform/little-ledger`: 手机端云记账网站，支持拍照/截图 OCR、用户名密码账户、Supabase 云端账目和货币转换

DataFlow 由根目录的 GitHub Actions 工作流自动发布到 GitHub Pages。

小账本在线地址：<https://little-ledger.onrender.com/>

小账本使用 Render Web Service 运行后端，Supabase 保存账户和账目数据；原始拍照图片只在浏览器内存中用于识别，不写入手机相册或 GitHub。

完整的在线使用、本地运行和版本更新方法见 `使用与更新指南.md`。

不得提交密码、Token、客户数据、真实业务 CSV 或公司敏感资料。
