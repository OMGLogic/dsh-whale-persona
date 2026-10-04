# 更新记录

本文件记录 dsh-whale-persona 的所有重要变更，格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## 0.3.0 - 2026-10-03

**新增：人设正文可以在界面上直接改。** 输入栏那颗胶囊保持不变（仍是一颗按钮，零多余控件），编辑入口放在**设置 →「鲸鱼人设」**一页里。

### 新增

- 设置页「鲸鱼人设」（`settings.section` 插槽）：一个全宽文本框 + 保存 / 恢复默认，带字数统计、未保存提示、保存中与失败提示；只读部署下会明确说明无法保存。
- 插件配置新增 volatile 字段 `persona`，默认值就是内置人设正文。**清空文本框与点「恢复默认」等价**——都写 `unset` 让 schema 默认值生效，profile 补丁里不留空串；手改 `cordis.patch.yml` 把 `persona` 写成空串同样回到默认。
- 客户端文案走 locale 字典（`zh` / `en` 两套，键集一致），插槽注册时声明 `locale`，跟随 Harness 语言设置切换。
- `lib/index.mjs` 导出 `DEFAULT_PERSONA`，README 的「默认人设」段与它逐字一致（有校验脚本守着）。

### 变更

- **人设正文改为纯文本**：提示词段注册时带 `interpolate: false`，注入时不做变量插值；文本改用函数形式提供，每次组装读当前引用。`enabled` 的语义不变。
- **默认人设去掉 `{{model}}` / `{{cwd}}`**：这两条信息 Harness 自己就会注入（部署层的 `system-prompt.personaPrefix/personaSuffix` 与各 preset 的 `dsh-persona`），人设里重复是多余的，而且会把提示词变量这种内部细节暴露给要改人设的人。改后语义完全一致，只是那句变成「你依然是功能完整的编码代理」。
- **关闭自动生成的插件配置表单**（`settings.configure({ auto: false })`）：Harness 客户端 primitives 没有 Textarea 组件，自动表单对长文本只能用单行输入框，不适合编辑人设；改由本插件自己的设置页负责。
- `dsh.client.inject` 增加 `@deepseek-ai/dsh-client-locale` 与 `@deepseek-ai/dsh-client-ui-settings-general`。
- README：「人设原文」改为「默认人设」并说明它只是默认值；新增「改人设」一节；结构表与说明同步。

### 修复

- **彻底消除提示词变量写坏会话的风险**：提示词插值是严格的，未知的 `{{...}}` 会让系统提示词组装抛错，而那是整个 profile 所有会话都发不出请求的级别。人设既然由用户自由编辑，就不该走插值——现在用户随手写下的任何花括号都只会原样出现。（`verify/interpolation-hazard.test.mjs` 复现了原风险并验证了修法。）

### 后续调整 - 2026-10-03（同一版本号，不单独发版）

- **默认人设还原为 0.1.0 的 `【PERSONA_LOAD】` 版本**（标签组 + 执行说明，一字未改），替代 0.3.0 初版采用的扩展分段版本。
- 该文本里带 `{{model}}` / `{{cwd}}`，而人设段是 `interpolate: false` 的，直接还原会让模型看到裸的花括号。因此 host 侧新增 `fillPersona()`：自己把 `{{provider}}` / `{{model}}` / `{{cwd}}` 替换成当前值，**其余花括号一律原样保留**。这样既忠实还原 0.1.0 的渲染效果，又保留了「任何未知 `{{...}}` 都不可能抛错」的安全性质。
- README 的「默认人设」段同步为 0.1.0 原文，并把「为什么人设里没有 `{{model}}` / `{{cwd}}`」那段改成说明这三个变量的替换规则与安全性。
- 版本号保持 `0.3.0` 不变。

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
