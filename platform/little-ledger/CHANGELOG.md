# 更新记录

## 2026-08-24

- 目标：发布移动端小账本的云端账户与数据同步版本。
- 新增用户名唯一识别、首次自动注册、密码登录和错误提示。
- 密码使用服务端 `scrypt` 哈希保存；新增 `.gitignore` 防止数据库和环境变量进入仓库。
- 验证：`node --check app.js`、`node --check server.mjs`、`git diff --check`，并完成注册、正确登录、错误密码 401 和密码不落明文 API 冒烟测试。
- 相关路径：`index.html`、`app.js`、`server.mjs`、`camera.css`、`package.json`、`README.md`。

## 2026-08-24 OCR 明细识别

- 长发票截图或网页拍照现在按 OCR 换行逐行解析，生成多条账目。
- 自动提取每行名称和金额，猜测吃喝、交通、房租、娱乐等分类。
- 自动过滤合计、税额、找零、优惠等汇总行，并在保存前显示明细预览。
- 验证：`node --check app.js`、`node --check server.mjs`、`git diff --check`，OCR 资源 HTTP 返回 200。

## 2026-08-24 快捷记账交互

- 首页“吃喝、交通、日常、收入”快捷卡片现在可点击。
- 点击卡片会直接打开录入弹窗并预选对应类型和分类。
- 增加触摸按压和键盘焦点反馈。

## 2026-08-24 在线地址

- 在 README 和部署说明中补充 Render 在线地址：`https://little-ledger.onrender.com/`。
