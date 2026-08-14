
• 可以，本地能装 browser-use CLI，但你这台机器现在还缺稳定的 Python/uv 环境。

  DevTools 怎么用
  有两层含义：

  1. Chrome DevTools UI：你手动按 F12 / Ctrl+Shift+I 打开的调试工具，看 Elements、Console、Network。
  2. Chrome DevTools Protocol/CDP：给程序控制浏览器用的接口。浏览器启动时开调试端口，工具通过 http://127.0.0.1:<port> 或 websocket 控制标签页、执行
     JS、截图、点按钮等。

  browser-agent 是什么
  这是我刚给你本地做的一个轻量封装，不是官方产品。位置在：

  .codex/skills/browser-agent/SKILL.md:1

  作用是：

  - 启动一个独立 Chrome profile：不碰你日常 Chrome 登录态。
  - 自动开 CDP 调试端口：不用固定 9222，避免端口冲突。
  - 把 endpoint 存到 C:\Users\shenqing01\.codex\browser-agent\session.json。
  - 后续我可以快速复用这个浏览器做打开网页、列标签、轻量快照、执行 JS。

  当前状态：刚才的 browser-agent endpoint 已经 stale，需要重新跑 start-chrome.ps1 才能复用。

  browser-use CLI
  可以装。官方文档现在推荐：

  uv tool install browser-use
  browser-use --help

  官方也说明它支持本地 Chrome/Chromium、云浏览器、以及任意 CDP endpoint，并且可以通过 BU_CDP_URL / BU_CDP_WS 指向已有 DevTools 浏览器。来源：
  Browser Use 官方 CLI 文档。
  https://docs.browser-use.com/open-source/browser-use-cli

  你本机现状：

  - node / npx 有。
  - uv 没有。
  - python / py 只是 WindowsApps 启动别名，而且我们已经遇到过登录会话异常，不适合作为依赖基础。

  低成本推荐配置是：

  1. 先装稳定的 uv 和 Python 3.12/3.11。
  2. 再装 browser-use：

     uv tool install browser-use
     browser-use --doctor
     browser-use skill install

  3. 以后简单浏览器任务优先用：

     browser-use open https://example.com
     browser-use state
     browser-use click 3
     browser-use input 1 "text"
     browser-use screenshot page.png

  我的建议：
  playwright-cli 继续用于当前已经能跑的直接操作；browser-use 更适合长期、快速、低 token 的浏览器控制；browser-agent 可以作为本地隔离 Chrome/CDP 后
  备方案。



  "D:\working document 2026\waba2026\测试名单\企业微信截图_17846131323466.png"

  截至七月，
内催S1（D1~D7）模块 WABA覆盖率达62%， 整体S模块达57%， 集中在S1-1、S1-2模块
外包S1（D1~D7）模块 WABA覆盖率已达96%， 并且已开始测试S2阶段使用WABA催收，
S模块整体上WABA占比达54%

整体上， S1模块经办WABA覆盖率达70%， 全部S模块经办WABA覆盖率达56%

"D:\working document 2026\waba2026\测试名单\企业微信截图_17846147667884.png"

![7月 WABA 策略图](waba2026/测试名单/7月策略图_D1-D5.png)

策略说明：
- 提醒阶段不配置催收策略，仅做统一观察。
- 人工策略从 D1 开始持续催收，并延续到 D6+。
- 非人工策略按逾期老客、无逾期老客、新客三类客群执行。
- 非人工策略统一归为 WABA+AI/IVR，按触达周期分为 D1-D3 和 D1-D5 两类。
- 非人工触达到期后统一流入人工承接，后续继续由人工跟进。

 新增策略说明（更新版）：
  - D3前：不配置催收策略，仅合并观察。
  - D3-D5：由 IVR 催收，按客群质量（好/坏）、新客、第一期还款表现分层触达。
  - D6-D15：作为同一策略阶段，在同一列下按金额拆成两行策略。
  - D6-D15 <35000K：使用 IVR+AI，并按 3/6/9 次拨打节奏催收。
  - D6-D15 ≥35000K：使用 IVR+AI 3/6/9 次拨打，同时叠加人工催收。
  - >D15：全部转人工承接，统一跟进回收。

模板发送成本分析（2026年7月）
- 7月客户覆盖 149,984 人，较5月增加 17.7%；回复 40,565 人，较5月增加 60.8%；回款 42,723 人，较5月增加 44.3%。
- 7月客户回复率 27.0%，较5月提升 7.3pp；回款率 28.5%，较5月提升 5.2pp，互动和回款转化更集中。
- 模板侧7月整体送达率 66.6%，较5月提升 1.8pp；失败率优化至 13.9%，较5月改善 2.3pp，发送质量更稳定。
- 分 bucket 看，S1-1Small 表现最突出：回复率 38.6%（+13.6pp）、回款率 49.7%（+17.4pp）；S1-1Big 回复率 41.4%、回款率 44.7%，高质量客群转化保持较强。
- S1-2 回复率提升至 24.8%（+9.5pp）、回款率提升至 23.1%（+7.1pp）；S2Mix 覆盖人数增至 40,265 人，回复率和回款率也有提升，扩量后仍保持正向承接。
- 结论：7月在客户覆盖、回复和回款结果上整体强于5月，且模板送达质量同步改善，可作为后续分层策略放大的依据。