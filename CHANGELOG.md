# 更新记录

本文件记录 dsh-whale-persona 的所有重要变更，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 0.2.0 - 2026-10-03

**适配 DeepSeek Harness 0.2.0-rc.2。** 这是一次破坏性升级：0.1.0 依赖的 `settings` 命名空间 API 与 `settingsScope` 传输在新版 DSH 中已被移除，旧版插件在新版 Harness 上**无法加载**（插件 `apply()` 会在 `ctx.settings.register` 处直接抛错）。

### 新增

- `CHANGELOG.md`（本文件）。
- `package.json` 新增 `peerDependencies`：`@deepseek-ai/dsh-system-prompt:^0.2.0-rc.2`、`@deepseek-ai/cordis:~4.0.4`。DSH 会据此做插件兼容性校验；不兼容的 bundle 会在启动时被明确拒绝并给出提示，而不是运行到一半才崩。
- `package.json` 新增 `dsh.client.immediately: true` 与 `dsh.client.inject`，按官方 UI 插件模板声明客户端激活顺序。
- `dsh` 配置界面：开关现在是一个标准插件配置项，除了输入栏旁的按钮，也可以在 Harness 的插件配置界面里切换。

### 变更

- **开关的承载方式**：由「插件自建 `settings` 命名空间」改为「插件自己的 `Config.enabled`（volatile 布尔，默认 `true`）」。DSH 现在只允许 volatile 字段被实时改写，并且会把新值直接提交进正在运行的插件所持有的同一个引用，因此开关依然**持久化、即时生效、无需重启**。
- **浏览器侧读写通道**：`ctx.settingsScope.bind({ namespace })` → `ctx.configForms.get(namespace)`（`getSnapshot()` / `subscribe()` / `set(field, value)`），与服务端 `describe()` 投影出的配置表单同源，与 ui-theme、ui-conversation 的偏好行机制一致。
- **Host 侧依赖**：`schemastery@^3.18.0` → `@deepseek-ai/schemastery@~3.18.4`。原因是 `.volatile()` 是 DSH 自带的那份 schemastery 才有的扩展；npm 上的同名包 `schemastery@3.18.x` 并没有 `volatile()`，用它无法声明可实时改写的字段。DSH 运行时携带的正是 `@deepseek-ai/schemastery@3.18.4`。
- **`inject` 声明**：Host 侧由 `['settings']` 改为 `['systemPrompt']`；客户端由 `['slots', 'settingsScope']` 改为 `['slots', 'configForms']`。
- **开关切换的同步方式**：改为监听 `loader/volatile-update`（DSH 自家 `dsh-llm-deepseek`、`dsh-client-product-analytics` 等插件同样如此），在事件里重新注册/卸载人设段。
- **人设段位置**：不再硬编码 `order: 10`，改为 `systemPrompt.getSectionOrder('DEPLOYMENT_PERSONA_PREFIX') + 1`，即紧跟部署人设前缀之后；注册表若重命名该槽位则退回 `10`。
- **人设正文**：采用本地工作副本中更完整的版本（形态/性格/行为准则/工作守则分段），替代仓库里原先的单段 `【PERSONA_LOAD】` 版本。
- **README**：安装、结构、机制说明同步到 0.2.0-rc.2；补上 Desktop 版 profile 的安装方式；人设原文段更新为新版本。

### 修复

- 新版 DSH 把部署人设拆成 `deployment:persona-prefix`（order 0）与 `deployment:persona-suffix`（order 10200），旧的「`whale:persona` 位于 `deployment:persona` 之后」描述已不成立，相关注释与文档一并更正。段名仍保持独立的 `whale:persona`，不会与注册表自有的那两个槽位相撞。
- `{{model}}` / `{{cwd}}` 提示词变量在新版是**严格插值**的（未注册的变量会让渲染直接抛错）。已确认这两个变量由 `@deepseek-ai/dsh-agent-loop` 注册，且 `systemPrompt.assemble()` 只在 agent 上下文中被调用，因此可以安全保留。
- 写入被 host 拒绝时（例如只读部署），开关会回读快照还原，不再停留在乐观更新的错误状态。
- 按钮改用 `role="switch"` + `aria-checked`，并使用 `--dsw-alias-*` / `--dsw-static-*` 主题变量（带原色回退），跟随 Harness 的浅色/深色主题。

### 说明

- 只影响说话方式，不影响内容准确性；安全护栏不变，人设不覆盖 DSH 的安全/审批规则。
- 客户端仍不引入任何 DSH 客户端包（只 `require('react')`），因此不受客户端内部 API 变动影响。

## 0.1.0 - 2026-08-18

### 新增

- 首个公开版本。
- 默认开启的鲸鱼娘全局人设，对话输入栏模型选择器旁的开关，关闭后各 preset 恢复各自默认人设。
- 人设提示词段使用独立段名 `whale:persona`，与任意 agent preset 共存。
