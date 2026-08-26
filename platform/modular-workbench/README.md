# Modular Workbench

一个配置驱动、可组合的个人工作台。它把页面、模块、布局和内容分开保存，用户可以在浏览器里创建页面、添加模块、编辑内容、拖动布局，并通过 JSON 备份和恢复整个工作台。

## 本地运行

```bash
npm install
npm run dev
```

打开终端显示的本地地址即可。生产构建：

```bash
npm run build
```

## 核心能力

- 多个工作台页面
- 模块库：文字卡片、待办、数据表格、文档、数据概览、时间提醒和自定义模块
- 编辑布局时可拖拽模块交换位置
- 模块设置、删除、内容持久化
- 自定义模块可组合标题、内容和字段
- 浏览器本地保存，不依赖后端
- JSON 导入和导出
- 响应式布局和深色模式

## GitHub Pages

本项目是 Vite 静态站点，构建结果位于 `dist`。仓库根目录包含 `.github/workflows/deploy-modular-workbench.yml`：推送本项目后会自动构建并发布到 GitHub Pages。首次使用时，在仓库 Settings → Pages → Build and deployment 中将 Source 设为 GitHub Actions。

当前数据默认保存在用户浏览器的 localStorage 中。若要多人协作或跨设备同步，下一阶段再接入账户和数据库服务。
