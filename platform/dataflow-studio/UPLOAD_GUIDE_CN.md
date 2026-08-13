# DataFlow 上传、发布与后续修改教程

## 你会得到什么

完成后会有一个公开网址，手机和电脑都能打开。源码保存在 GitHub，新电脑上的 AI 可以克隆仓库、修改并推送；每次推送到 `main` 后，网站自动更新。

## 第一步：新建 GitHub 仓库

1. 登录 GitHub，打开 `https://github.com/new`。
2. `Repository name` 填 `dataflow-studio`。
3. 推荐选择 `Public`。GitHub Free 的公开仓库最适合直接使用 Pages。
4. 不要勾选 `Add a README file`、`.gitignore` 或 License，本项目已经包含这些文件。
5. 点击 `Create repository`。

## 第二步：上传项目

推荐用 Git，能完整上传 `.github` 自动部署文件。

在项目文件夹空白处右键，选择“在终端中打开”，依次运行：

```powershell
git init
git add .
git commit -m "Initial DataFlow release"
git branch -M main
git remote add origin https://github.com/你的GitHub用户名/dataflow-studio.git
git push -u origin main
```

第一次推送时浏览器可能要求登录 GitHub。不要把密码或访问令牌发给 AI。

也可以在空仓库页面点击 `uploading an existing file`，解压 `dataflow-studio-upload.zip` 后拖入全部文件。必须确认 `.github/workflows/deploy-pages.yml` 也已上传，否则不会自动发布。

## 第三步：打开 GitHub Pages

1. 进入仓库，点击顶部 `Settings`。
2. 左侧点击 `Pages`。
3. `Build and deployment` 下的 `Source` 选择 `GitHub Actions`。
4. 点击顶部 `Actions`，等待 `Deploy DataFlow to GitHub Pages` 变成绿色。
5. 回到 `Settings > Pages`，打开显示的网址，通常是 `https://你的用户名.github.io/dataflow-studio/`。

## 第四步：手机安装

- Android Chrome：打开网站，浏览器菜单选择“添加到主屏幕”或“安装应用”。
- iPhone Safari：打开网站，点分享按钮，选择“添加到主屏幕”。
- 电脑 Chrome/Edge：打开网站，点击地址栏右侧的安装图标。

CSV 始终在当前设备的浏览器里处理，不会自动同步到其他设备。

## 第五步：让新电脑上的 AI 修改

1. 新电脑安装 Git、Node.js 和 Codex/其他编程 AI。
2. 克隆项目并安装依赖：

```powershell
git clone https://github.com/你的GitHub用户名/dataflow-studio.git
cd dataflow-studio
npm install
npm run dev -- --port 4317
```

3. 对 AI 说：`先阅读 AGENTS.md 和 docs/PRODUCT.md，再按我的要求修改；完成后运行生产构建并检查手机和电脑布局。`
4. 修改完成后提交并推送：

```powershell
git add .
git commit -m "Describe the change"
git push
```

GitHub Actions 会自动重新发布，一般几分钟后网址内容更新。

## 常见问题

- Actions 红色失败：点进失败任务查看日志，交给 AI 修复。
- 网页空白：确认构建命令包含 `--base=./`。
- 手机打不开本地地址：手机和电脑要连接同一 Wi-Fi，并允许 Windows 防火墙访问 Node.js；长期使用应打开已发布的 HTTPS 地址。
- 上传后没有 Actions：检查 `.github/workflows/deploy-pages.yml` 是否存在于仓库。
