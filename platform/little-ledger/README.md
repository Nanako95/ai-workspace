# 小账本

移动端记账网站，支持网页内拍照识别、截图识别、多语言逐行 OCR、用户名账户、密码登录、云端账目同步和货币转换。

## 在线使用

直接打开：<https://little-ledger.onrender.com/>

手机端请使用这个 HTTPS 地址访问；拍照、截图识别和跨设备云端账目同步都从这里进入。

## 手机分享导入

在 Android Chrome/Edge 中打开在线地址后，可从浏览器菜单添加到手机桌面。安装后的“小账本”会出现在系统分享列表中；在相册或支付应用中分享截图，选择“小账本”，网页会自动进入逐行 OCR 确认页。

iPhone 可将网页添加到主屏幕，并使用“快捷指令”把照片或分享文字打开到小账本。不同手机系统对 PWA 分享目标的支持不同，因此网页内仍保留拍照识别和选择截图入口。分享文件只在浏览器临时缓存中传递，识别后立即删除，不写入手机相册。

## 本地运行

```powershell
npm start
```

打开 `http://127.0.0.1:4173`。

## 云端部署

GitHub Pages 只能托管静态前端，不能运行本项目的账户 API 和数据服务。请将整个仓库部署到支持 Node.js 持久化存储的平台，例如 Render、Railway、Fly.io 或 VPS，并设置 `PORT` 环境变量。生产环境应把 `data/ledger.json` 换成 PostgreSQL、SQLite 持久磁盘或其他数据库。

公网部署后必须使用 HTTPS，手机浏览器才会允许网页调用摄像头。项目包含 `Dockerfile` 和 `render.yaml`，可部署到支持 Node.js 的公网服务；部署成功后使用服务商提供的 HTTPS URL，手机点击该链接即可进入。图片只在浏览器内存中用于 OCR，不写入手机相册，也不会上传原始图片；云端只保存识别后的结构化账目。

汇率来自 Frankfurter 最新工作日参考汇率，服务端缓存 6 小时。账目录入时可选择原始货币和记账货币，系统按实时查询到的汇率转换并保存原始金额、目标金额和汇率快照。

## Supabase 免费云存储

1. 在 Supabase 新建项目。
2. 打开 SQL Editor，粘贴并运行 `supabase-schema.sql`。
3. 在 Project Settings -> API 复制 Project URL 和 `service_role` key。
4. 在 Render 环境变量中填写 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。两个变量只放在 Render，不要提交到 GitHub。
5. 配置完成后，Node 服务会自动使用 Supabase；未配置时仅作为本地 JSON 开发回退。

## 账户规则

首次输入未注册的用户名和至少 6 位密码会自动注册。已存在的用户名必须输入正确密码；错误密码会拒绝登录。密码使用 Node.js `scrypt` 哈希保存，不保存明文密码。
