# Platforms

可直接运行、部署或安装的应用项目。

- `dataflow-studio`: CSV 数据整理与质量检查平台
- `little-ledger`: 手机端云记账网站
  - 在线使用：<https://little-ledger.onrender.com/>
  - 功能：多语言逐行 OCR、网页拍照、手机分享导入、用户名密码登录、云端账目同步、货币转换和月/年看板
  - 手机使用：Android 通过系统分享菜单导入截图；iPhone 通过主屏幕 PWA 和快捷指令导入，详细步骤见 `little-ledger/README.md`
  - 部署：Render Docker Web Service
  - 数据：Supabase Free PostgreSQL；配置步骤见 `little-ledger/README.md`
