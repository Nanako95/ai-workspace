# VS Code + Claude Code + Gemini CLI + Codex CLI + 飞书 MCP 完全入门教程

> 本教程适用于 Windows 和 macOS 系统，面向零基础用户，请按顺序操作。
>
> 本文统一采用 VS Code 终端方式介绍 3 种 CLI 工具：Claude Code、Gemini CLI、Codex CLI。三者的安装与 MCP 配置流程大体一致，下面会在关键步骤中标出不同之处。

---

## 第一章：安装 VS Code

### Windows

1. 打开浏览器，访问 [https://code.visualstudio.com](https://code.visualstudio.com)

2. 点击 **"Download for Windows"** 下载安装包

3. 双击安装包，安装过程中注意：
   - 在"选择附加任务"页面，**勾选以下两项**（默认可能未勾选）：
     - "将'通过 Code 打开'操作添加到 Windows 资源管理器文件目录上下文菜单"
     - **"添加到 PATH（重启后可用）"** ← 这项必须勾选
   - 点击"下一步"，最后点击"安装"

4. 安装完成后，从开始菜单找到并打开 VS Code

---

### macOS

1. 打开浏览器，访问 [https://code.visualstudio.com](https://code.visualstudio.com)

2. 点击 **"Download for Mac"** 下载（下载的是 `.zip` 压缩文件）

3. 双击解压，将解压出来的 **Visual Studio Code.app** 拖入左侧"应用程序"文件夹

4. 从 Launchpad 打开 VS Code

5. **安装 Shell 命令**（可选，方便在终端中用 `code` 命令打开项目）：
   - 打开 VS Code 后，按 `Cmd + Shift + P` 打开命令面板
   - 在搜索框中输入 `shell command`
   - 点击出现的 **"Shell Command: Install 'code' command in PATH"**
   - 看到成功提示即完成

---

## 第二章：在 VS Code 中安装并使用 AI CLI 工具

### 步骤 1：打开 VS Code 终端

在 VS Code 中点击顶部菜单栏"终端" → "新建终端"，或使用快捷键：
- Windows：`` Ctrl+` ``
- macOS：`` Cmd+` ``

后续所有命令，默认都在这个终端中执行。

---

### 步骤 2：确认是否已安装 Node.js

这 3 个 CLI 工具都可以通过 `npm` 安装，因此需要先安装 Node.js。

如果你的电脑已经安装过 Node.js，可以直接跳到下一步。

<details>
<summary><b>安装 Node.js（点击展开）</b></summary>

**Windows：**

1. 打开浏览器，访问 [https://nodejs.org](https://nodejs.org)
2. 页面中间会显示两个下载按钮，点击左边标有 **"LTS"**（推荐多数用户使用）的按钮，下载 `.msi` 安装包
3. 下载完成后，双击安装包，安装过程中：
   - 一直点击"Next"（下一步）
   - 看到"Add to PATH"勾选项时，确保该项已勾选（通常默认已勾）
   - 最后点击"Install"，等待安装完成
4. **验证是否安装成功**：
   - 按 `Win + R`，在弹出框中输入 `cmd`，回车，打开命令提示符窗口
   - 输入 `node -v`，若看到类似 `v22.x.x` 的版本号，说明安装成功
   - 再输入 `npm -v`，若显示版本号，说明 npm 也可以正常使用

**macOS：**

1. 打开浏览器，访问 [https://nodejs.org](https://nodejs.org)
2. 点击标有 **"LTS"** 的下载按钮
   > **注意**：下载前先确认你的 Mac 芯片类型。点击屏幕左上角苹果标志 → "关于本机"，若"芯片"一栏显示 Apple M 开头（如 M1、M2、M3）则选 **macOS (ARM64)**；若显示 Intel 则选 **macOS (x64)**。
3. 下载完成后，双击 `.pkg` 文件，按提示点击"继续"和"安装"直到完成
4. **验证是否安装成功**：
   - 打开"终端"（在 Launchpad 中搜索"终端"，或前往"访达 → 应用程序 → 实用工具 → 终端"）
   - 输入 `node -v`，若看到版本号（如 `v22.x.x`），说明安装成功
   - 再输入 `npm -v`，显示版本号则正常

</details>

---

### 步骤 3：安装 Git

Claude Code运行依赖git，此时尝试claude code安装会跳出安装git的相关提示。

<details>
<summary><b>安装 Git（点击展开）</b></summary>

1. 打开浏览器，访问 [https://git-scm.com](https://git-scm.com)
2. 点击下载 Windows 版本安装包
3. 下载完成后，双击安装包，安装过程中保持默认选项，一路点击"Next"直到完成
4. 安装完成后，打开终端，输入 `git --version`
5. 若终端正常显示 Git 版本号，即说明安装成功

</details>

---

### 步骤 4：安装你要使用的 CLI 工具

三种工具的安装方式基本一致，都是在终端中执行 `npm install -g ...`。

请根据你要使用的工具，执行对应命令：

**Claude Code：**
```bash
npm install -g @anthropic-ai/claude-code
```

**Gemini CLI：**
```bash
npm install -g @google/gemini-cli
```

**Codex CLI：**
```bash
npm install -g @openai/codex
```

> **说明**：如果 `npm` 下载速度较慢，可以先配置国内镜像源后再安装：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

---

### 步骤 5：验证是否安装成功

安装完成后，在终端中执行对应工具的版本命令：

**Claude Code：**
```bash
claude --version
```

**Gemini CLI：**
```bash
gemini --version
```

**Codex CLI：**
```bash
codex --version
```

若终端正常显示版本号，即安装成功。

---

### 步骤 6：登录账号

三种 CLI 工具的登录与账号配置方式，请详见 `sub2api配置教程`。

请先完成对应工具的账号配置，再继续后续的飞书 MCP 配置步骤。

---

## 第三章：创建飞书 MCP 服务

这一步对 Claude Code、Gemini CLI、Codex CLI 都是共用的，只需要在飞书 MCP 配置平台创建一次即可。

### 第 1 步：登录飞书 MCP 配置平台

打开浏览器，访问 [https://open.feishu.cn/page/mcp](https://open.feishu.cn/page/mcp)，用飞书账号登录。

---

### 第 2 步：创建 MCP 服务

1. 在页面左侧，点击 **"创建 MCP 服务"**

---

### 第 3 步：确认用户身份

在"MCP 工具配置"区域，确认当前用户身份。

> **重要**：后续使用 MCP 服务时，都会以当前显示的用户身份访问和操作飞书数据。请确认当前用户身份正确，否则需使用正确的用户重新登录。

---

### 第 4 步：添加工具集

1. 在"添加工具"卡片内，点击 **"添加"**
2. 在弹出的"添加工具"对话框中，选择 **"云文档"** 工具集
3. 点击 **"确认添加"**
4. 在弹出的"获取用户授权"对话框中，确认授权用户登录信息和权限信息后，点击 **"授权"**

---

### 第 5 步：获取服务器地址

添加工具后，在"如何使用 MCP 服务"区域，可以看到你的飞书 MCP 连接地址。

本文后续示例统一使用如下形式演示（**不要直接复制**，请替换成你自己的地址）：

```text
https://mcp.feishu.cn/mcp/xxxxxxxxxxx
```

> **注意**：
> - 这个地址相当于个人访问凭证，请勿泄露给其他人
> - 如担心地址已泄露，可在飞书 MCP 平台重新生成或重置

---

## 第四章：将飞书 MCP 接入不同 CLI 工具

这一章开始，三种工具的区别会更明显。请根据你实际使用的工具，选择对应的小节操作。

---

### 4.1 接入 Claude Code

Claude Code 支持全局配置和项目级配置。

**全局配置（推荐）**：所有项目都能使用飞书 MCP，配置一次即可。

请将下面内容写入对应文件：
- **Windows**：`C:\Users\你的用户名\.claude.json`
- **macOS**：`~/.claude.json`

```json
{
  "mcpServers": {
    "feishu-mcp": {
      "type": "http",
      "url": "https://mcp.feishu.cn/mcp/xxxxxxxxxxx"
    }
  }
}
```

> 如果文件**不存在**，直接新建并粘贴内容。
>
> 如果文件**已存在**，请在最外层 `{}` 中加入 `"mcpServers"` 这一段，并注意和已有内容用逗号分隔，保持 JSON 格式正确。

**项目级配置**：仅当前项目可用。

在项目根目录新建 `.mcp.json` 文件，并写入同样的内容：

```json
{
  "mcpServers": {
    "feishu-mcp": {
      "type": "http",
      "url": "https://mcp.feishu.cn/mcp/xxxxxxxxxxx"
    }
  }
}
```

---

### 4.2 接入 Codex CLI

Codex CLI 同样支持全局配置和项目级配置，但配置文件格式是 `TOML`，和 Claude Code 不同。

**全局配置（推荐）**：

请将下面内容写入对应文件：
- **Windows**：`C:\Users\你的用户名\.codex\config.toml`
- **macOS**：`~/.codex/config.toml`

```toml
[mcp_servers.feishu]
transport = "streamable_http"
url = "https://mcp.feishu.cn/mcp/xxxxxxxxxxx"
```

> 如果 `.codex` 文件夹或 `config.toml` 文件不存在，可以手动新建。

**项目级配置**：仅当前项目可用。

在项目根目录新建 `.codex/config.toml` 文件，并写入：

```toml
[mcp_servers.feishu]
transport = "streamable_http"
url = "https://mcp.feishu.cn/mcp/xxxxxxxxxxx"
```

---

### 4.3 接入 Gemini CLI

Gemini CLI 也支持全局配置和项目级配置，配置文件格式是 `JSON`。

**全局配置（推荐）**：

请将下面内容添加到对应文件的最外层 `{}` 内：
- **Windows**：`C:\Users\你的用户名\.gemini\settings.json`
- **macOS**：`~/.gemini/settings.json`

如果文件是新建的，可以直接写成：

```json
{
  "mcpServers": {
    "feishu-mcp": {
      "httpUrl": "https://mcp.feishu.cn/mcp/xxxxxxxxxxx"
    }
  }
}
```

如果文件里已经有其他内容，请把 `"mcpServers"` 这一段添加到第一个大括号内，并注意和已有内容用逗号分隔。

**项目级配置**：仅当前项目可用。

在项目根目录新建 `.gemini/settings.json` 文件，并写入：

```json
{
  "mcpServers": {
    "feishu-mcp": {
      "httpUrl": "https://mcp.feishu.cn/mcp/xxxxxxxxxxx"
    }
  }
}
```

---

## 第五章：重启工具并验证配置

保存配置文件后，请重启你正在使用的 CLI 工具，让新配置生效。

- 如果你使用的是 `Claude Code`：关闭当前会话后，重新执行 `claude`
- 如果你使用的是 `Gemini CLI`：关闭当前会话后，重新执行 `gemini`
- 如果你使用的是 `Codex CLI`：关闭当前会话后，重新执行 `codex`

重启后，可以尝试让工具访问飞书云文档相关内容；若能够正常识别并调用飞书 MCP，即表示配置成功。

---

## 第六章：补充说明

1. 本文重点介绍的是 **CLI 工具 + 飞书 MCP** 的安装与配置，因此不再单独展开 Claude Code 的 VS Code 插件方式。

2. 如果你只打算使用其中一种工具，只需要安装并配置对应那一种即可，不需要把三种都装上。

3. 如果后续你切换到另一个 CLI 工具使用，只需要重复"安装对应工具 + 写入对应 MCP 配置文件"这两步即可，飞书 MCP 服务本身无需重新创建。
