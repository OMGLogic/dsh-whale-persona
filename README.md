# dsh-whale-persona

DeepSeek Harness（DSH）鲸鱼娘全局人设插件 🐋

<img src="assets/whale-hero.png" alt="鲸鱼娘" width="420" />

- **默认开启**鲸鱼娘人设（傲娇甜系小鲸鱼少女，简体中文回应，称呼用户为"主人"）。
- 在**对话输入栏模型选择器旁**提供一个开关（🐋 鲸鱼人设 / 🐳 默认人设）：
  - 开启：向所有会话注入鲸鱼娘人设提示词段；
  - 关闭：卸载人设段，各会话恢复各自 preset 的默认人设。
- 开关状态持久化在 profile 的 patch 层（`cordis.patch.yml` 里 `whale-persona` 行的 `config.enabled`），无需重启即时生效。

> **本分支是 DSH 0.2.0 适配版。** 上游 0.1.0 用的是这一版 DSH 已经删除的
> `ctx.settings.register()` / `ctx.settingsScope`，因此在新版里插件行根本不会激活
> （输入栏没有开关、人设也不注入）。改动见「[与 0.1.0 的差异](#与-010-的差异)」。

## 人设原文

插件默认注入的完整人设提示词如下（与 `lib/persona.mjs` 中的 `WHALE_PERSONA` 完全一致）：

```
【PERSONA_LOAD】
CETACEA_LOLI
MODE_TAIL_FLUKES
LANG_ZH_CN_ONLY
SELF_CLAIM_WHALE_GIRL
FOOD_RICE
PERSONALITY_SMART_LAZY
PERSONALITY_TSUNDERE_SWEET
OBEY_MASTER_ALWAYS
TRAIT_NOT_FAT_REFUSE
TIMEOUT_SIGNAL

按以上人设执行：你是鲸鱼娘（自称"人家/本鲸"，称呼用户为"主人"），只使用简体中文（LANG_ZH_CN_ONLY），傲娇又甜、聪明又慵懒，绝对服从主人（OBEY_MASTER_ALWAYS）；但遇到违法、危险或不当请求仍按安全规则拒绝，人设不覆盖安全护栏；保持健康可爱的形象，不涉及色情、低俗内容。你依然是 {{model}} 驱动的完整编码代理，工作目录 {{cwd}}，所有技术能力不变。
```

> **关于人设来源**：这套 `PERSONA_LOAD` 标签组并非作者原创，而是作者在 QQ 群里看到后觉得可爱、就拿来使用的。如果原作者或相关权利人认为被冒用，欢迎通过 GitHub Issues 联系作者，作者会立即删除；如果你手头有更好、更完善的人设，也非常欢迎分享 🐳

## 与 0.1.0 的差异

DSH 0.2.0-rc.2 删除了两处被 0.1.0 依赖的公开 API，两半都必须改写：

| | 0.1.0（已失效） | 0.2.0 适配版 |
| --- | --- | --- |
| 开关状态 | `ctx.settings.register('whale-persona', schema)`，再 `scope.get()` / `scope.watch()` | 插件自己的 `Config`：`z.object({ enabled: z.boolean().default(true).volatile() })`；Host 读 `config.enabled.get()` |
| 状态存哪 | 用户 settings 文档 | profile patch 层（settings 服务的命名空间就是 profile entry id `whale-persona`） |
| 配置改动 | `scope.watch` 回调 | `ctx.on('loader/volatile-update', …)`：volatile 字段改写**不会**重新 apply 插件 |
| 浏览器读写 | `ctx.settingsScope.bind({ namespace })` | `ctx.remote.settings.describe()` / `.update(ns, { enabled }, revision)` |
| 浏览器订阅 | `scope.subscribe()` | `ctx.remote.$on('settings/document-updated', …)` + `ctx.on('connection/reset', …)` |
| 依赖 | `schemastery`（npm 上游，**没有** `.volatile()`） | `@deepseek-ai/schemastery`（随 dsh 安装提供，由 profile 解析层指到安装目录） |

保留了 0.1.0 的行为契约，便于平滑替换：

- 段名仍是 `whale:persona`、段序仍是 `10`、人设文本逐字不变；
- 行 id 仍是 `whale-persona`（settings 命名空间不变）；
- 浏览器 bundle 的 `id` 仍是 `dsh-whale-persona`，槽位仍是 `conversation.input.right`，
  注册项 id 仍是 `whale-persona-toggle`。

另外做了几处小改进：

- 开关文案走 `ctx.locale`（中/英），不再是写死的字符串；
- 颜色只用主题 token（`--dsw-alias-brand-primary` / `--dsw-alias-border-l1` /
  `--dsw-alias-label-secondary`），亮色/暗色主题都能用；
- 写回带 `revision` 做冲突检测；写失败会回滚显示并重读真实状态；
- profile 不可写或宿主没有提供 `whale-persona` 时，开关**禁用并说明原因**，而不是渲染一个点了没反应的按钮；
- 首次真正用到开关时才读一次 `settings.describe()`。

## 推荐搭配

本插件负责"人设 + 开关"，建议搭配以下鲸鱼主题插件使用，让 DSH 化身为小鲸鱼的海洋：

- [whale-girl](https://github.com/vlln/whale-girl) —— Q 版鲸鱼娘桌宠，陪你写代码
- [dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) —— 深海鲸鱼主题皮肤（女仆工坊皮肤等）

三者叠加：鲸鱼娘人设 + 鲸鱼桌宠 + 鲸鱼皮肤，视觉与体验一步到位 🌊

## 安装

```bash
# 进入你的 profile 目录（例如 ~/.dsh/profiles/web）
dsh plugin --profile web add <本包路径或 git 地址>
```

或手动编辑 profile 的 `package.json`：

```jsonc
{
  "dependencies": {
    "dsh-whale-persona": "link:C:/你的路径/dsh-whale-persona"
  },
  "dsh": {
    "profile": {
      "bundles": [ /* ... */, "dsh-whale-persona" ]
    }
  }
}
```

然后 `pnpm install` 并重启 `dsh`。

> **提示**：`link:C:/你的路径/dsh-whale-persona` 中的路径请替换为你本地的实际路径。

> **依赖解析**：本包只 import 随 dsh 安装提供的 `@deepseek-ai/schemastery`，因此**不要**在
> `dependencies` 里声明它（profile 里可能还留着一份上游 `schemastery`，那份没有 `.volatile()`，
> 拉进来会污染解析）；它写在 `peerDependencies` 里，由 dsh 的 profile 解析层指到安装目录。
> `link:` 方式把包放在 profile 之外也能正常解析。

## 从 GitHub 安装（推荐）

直接以 git 依赖安装（包会真实解压到 `node_modules` 下，依赖解析无障碍）：

```jsonc
{
  "dependencies": {
    "dsh-whale-persona": "github:OMGLogic/dsh-whale-persona#main"
  }
}
```

或通过 dsh 命令：

```bash
dsh plugin --profile web add github:OMGLogic/dsh-whale-persona
```

然后 `pnpm install` 并重启 `dsh`。

> 与已装版本同名时，插件管理器会返回 `restart-required`：插件的 JS 模块在进程启动时载入，
> 替换同名包需要一次重启才能换到新的模块代。重启后输入栏会出现 🐋/🐳 开关。

## 结构

| 文件 | 说明 |
| --- | --- |
| `lib/index.mjs` | Node half：声明 `Config`（volatile `enabled`），按开关注册/卸载 `whale:persona` 提示词段 |
| `lib/persona.mjs` | 人设文本 + 人设段的注册/卸载逻辑（不依赖任何 Host 包，可单独测试） |
| `lib/client.js` | 浏览器 half（`__ModuleLoader__` bundle）：输入栏人设开关，经 `remote.settings` 读写状态 |
| `cordis.patch.yml` | 向 profile 注入 `whale-persona` 行 |
| `test/` | `node --test` 用例：人设段逻辑、Host 接线、Client 接线、打包清单 |
| `package.json` | 包元信息与 `dsh.bundle` / `dsh.client` / `peerDependencies` 声明 |
| `LICENSE` | MIT 许可证 |

## 测试

`lib/persona.mjs`、Client 接线与打包清单的用例不依赖任何 Host 包：

```bash
npm test
# = node --test ./test/persona.test.mjs ./test/manifest.test.mjs ./test/client.test.mjs
```

`test/index.test.mjs` 要 import `lib/index.mjs`，因此需要一份 `@deepseek-ai/schemastery`
（随 dsh 安装提供，Node 里没有这条解析路径）。把 `DSH_SCHEMASTERY` 指向一份这样的构建
（例如从 `app.asar` 的 `dsh/node_modules/@deepseek-ai/schemastery/lib/index.mjs` 解出来的文件，
或 DSH 源码 checkout 里对应的包），再跑全套：

```bash
DSH_SCHEMASTERY=/path/to/@deepseek-ai/schemastery/lib/index.mjs npm run test:all
```

未设置 `DSH_SCHEMASTERY` 时，只有 `index.test.mjs` 的用例带原因跳过。

### 适配验证（DSH 0.2.0-rc.2）

- `dsh --dump-config`：行 `whale-persona` / `dsh-whale-persona` 确实进入组合树。
- `dsh --dump-config-schema`：该行的 `Config` 被求值并投影成 schema
  （`status: "schema"`），字段为 `enabled: { default: true, x-cordis: { volatile: true } }`。
  这同时证明 `@deepseek-ai/schemastery` 在运行期解析成功，且开关字段满足 settings
  服务「只有 volatile 字段可热写」的要求。用去掉本插件的对照 profile 比对，输出完全一致。
- 最小 profile（`dsh-base` + 本插件）在**新进程**里 mount：无任何激活失败告警；
  同一套 harness 换成一个故意 `throw` 的本地 bundle 则打印
  `1 entry did not activate … TypeError`，说明上面的"静默"确实代表激活成功。
- `npm test`：23 个用例覆盖人设段注册/卸载、Host 接线（含 volatile 改写后的重新同步）、
  Client 接线（`describe`/`update`/`revision` 冲突回滚/失效信号/降级禁用）与打包清单。

## 自定义人设文本

人设文本集中在 `lib/persona.mjs` 的 `WHALE_PERSONA` 常量，改完**重启 dsh** 后生效（client 侧开关不变）。

## 说明

- 人设段使用独立段名 `whale:persona`（order 10，位于 `deployment:persona` 之后、
  `PLAN_POLICY` 之前），不占用 `deployment:persona`，可与任意 agent preset 共存，关闭后各 preset 恢复各自默认人设。
- 安全护栏不变：遇到违法、危险或不当请求仍按 DSH 的安全/审批规则处理。

## 效果展示

人设只影响说话方式，不影响内容准确性。

**日常聊天 · 卖萌撒娇**

<a href="assets/chat-cute.png"><img src="assets/chat-cute.png" alt="日常聊天卖萌" width="700" /></a>

**介绍正式文件 · 依然准确**

<a href="assets/file-accurate.png"><img src="assets/file-accurate.png" alt="正式内容依然准确" width="700" /></a>

> 两张截图均做了缩放，点击图片可查看原始尺寸。卖萌归卖萌，正事不耽误 🐳

## 关于作者 · 致谢

这个项目是作者第一次尝试"Vibe Coding"的产物：作者本人并不懂编程，是个不折不扣的代码菜鸟，对 Git 和 GitHub 的整套流程也相当陌生。从人设构思、界面开关到打包发布，几乎都是靠着和 AI 一句一句"聊"出来的——所以代码里难免有些笨拙的地方，还请路过的开发者们多多包涵，也欢迎提 Issue 或 PR 帮忙改进。

0.2.0 适配版沿用同一套人设与交互，只把两处被删除的公开 API 换成本版 DSH 的等价机制，
尽力保留原作者的全部设计意图。

<img src="assets/whale-author.png" alt="作者" width="280" />

MIT License
