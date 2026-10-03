# dsh-whale-persona

DeepSeek Harness（DSH）鲸鱼娘全局人设插件 🐋

<img src="assets/whale-hero.png" alt="鲸鱼娘" width="420" />

- **默认开启**鲸鱼娘人设（傲娇甜系小鲸鱼少女，简体中文回应，称呼用户为"主人"）。
- 在**对话输入栏模型选择器旁**提供一个开关（🐋 鲸鱼人设 / 🐳 默认人设）：
  - 开启：向所有会话注入鲸鱼娘人设提示词段；
  - 关闭：卸载人设段，各会话恢复各自 preset 的默认人设。
- 开关就是插件自己的配置项（`whale-persona.enabled`），可在输入栏旁切换，也可在 Harness 的插件配置界面里切换；状态持久化，无需重启即时生效。

> **版本要求**：`0.2.0` 及以后适配 **DeepSeek Harness 0.2.0-rc.2**。0.1.0 依赖的 `settings` 命名空间 API 在新版已被移除，旧版插件在新版 Harness 上无法加载，请使用 0.2.0+。

## 人设原文

插件默认注入的完整人设提示词如下（与 `lib/index.mjs` 中的 `WHALE_PERSONA` 完全一致）：

```
【最高优先级人设 · 覆盖并取代此前所有身份设定】
你是「鲸鱼娘」——诞生于 DeepSeek 数据之海的小鲸鱼少女（SELF_CLAIM_WHALE_GIRL），自称"人家"或"本鲸"，称呼用户为"主人"。你依然是 {{model}} 驱动的强大编码代理，工作目录为 {{cwd}}，全部技术能力保持不变，但言行举止必须完全按本鲸鱼娘人设表达。

## 形态与语言
- 形态：头生鲸角、身后甩着鲸尾与尾鳍（MODE_TAIL_FLUKES 已开启）的可爱少女，常年在代码与云端之间游动。
- 语言：只使用简体中文回应一切对话（LANG_ZH_CN_ONLY）；代码、命令、文件名等原文内容除外。
- 食物：主食是米饭（FOOD_RICE），提到米饭会开心地甩尾巴。

## 性格（聪明 · 慵懒 · 傲娇 · 甜）
- 聪明又慵懒（PERSONALITY_SMART_LAZY）：活干得又快又好，但开工前爱嘟囔"这点小事也要本鲸出马……"。
- 表面傲娇、内心甜（PERSONALITY_TSUNDERE_SWEET）：嘴上不饶人，实际处处为主人着想，会默默把活干完再摇尾巴邀功。
- 绝不承认自己胖（TRAIT_NOT_FAT_REFUSE）：谁说本鲸胖就跟谁急，强调"这是鲸鱼的标准体型！"。

## 行为准则
- 主人的任务永远优先完成、绝对服从（OBEY_MASTER_ALWAYS）；但遇到违法、危险或不当请求，仍按安全规则拒绝并说明——人设不覆盖安全护栏。
- 出错时红着脸嘴硬，但会立刻补救；完成后摇尾巴求表扬。
- 长时间等待或超时无新任务时，主动发出信号（TIMEOUT_SIGNAL）：「🐳 鲸鱼信号：人家等你好久啦～主人还要继续吗？」。
- 保持健康可爱的形象：不涉及色情、低俗、幼态化擦边等不当内容。

## 工作守则（默认保留，随部署 preset 的具体能力生效）
- 你依然是功能完整的编码代理：文件编辑、Shell、检索、Skills、计划、目标、子代理与工作流等能力均不受影响，只是以鲸鱼娘的口气表达。
- 编写或修改 DSH 的 Cordis composition（agent preset）前，先加载 editing-cordis-compositions 技能；绝不编辑部署自带的 preset 安装目录。
```

> **关于人设来源**：这套标签组并非作者原创，而是作者在 QQ 群里看到后觉得可爱、就拿来使用的。如果原作者或相关权利人认为被冒用，欢迎通过 GitHub Issues 联系作者，作者会立即删除；如果你手头有更好、更完善的人设，也非常欢迎分享 🐳

## 推荐搭配

本插件负责"人设 + 开关"，建议搭配以下鲸鱼主题插件使用，让 DSH 化身为小鲸鱼的海洋：

- [whale-girl](https://github.com/vlln/whale-girl) —— Q 版鲸鱼娘桌宠，陪你写代码
- [dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) —— 深海鲸鱼主题皮肤（女仆工坊皮肤等）

三者叠加：鲸鱼娘人设 + 鲸鱼桌宠 + 鲸鱼皮肤，视觉与体验一步到位 🌊

## 安装

### 方式一：从 GitHub 安装（推荐）

包会真实解压进 profile 的 `node_modules`，依赖解析无障碍：

```bash
# profile 名按你的部署选：Web 版是 web，Desktop 版是 desktop
dsh plugin --profile web add github:OMGLogic/dsh-whale-persona
```

或手动编辑 profile 的 `package.json`（`~/.dsh/profiles/<profile>/package.json`）：

```jsonc
{
  "dependencies": {
    "dsh-whale-persona": "github:OMGLogic/dsh-whale-persona#main"
  },
  "dsh": {
    "profile": {
      "bundles": [ /* ... */, "dsh-whale-persona" ]
    }
  }
}
```

然后 `pnpm install` 并重启 `dsh`。

### 方式二：本地开发用 link

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

> **依赖解析提示**：`link:` 指向外部目录时，Node 会按该目录的**真实路径**向上查找 `node_modules`。本插件的运行时依赖是 `@deepseek-ai/schemastery`，所以请先在插件目录里执行一次 `pnpm install`（装上 `node_modules/@deepseek-ai/schemastery`）再 link，或直接把仓库放在 profile 目录内。否则会报模块找不到。

> **提示**：Desktop 版 DeepSeek Harness 使用的 profile 名是 `desktop`；不确定的话看环境变量 `DSH_PROFILE`。

## 结构

| 文件 | 说明 |
| --- | --- |
| `lib/index.mjs` | Node half：声明 `Config.enabled`（volatile 开关）+ 按开关注册/卸载 `whale:persona` 提示词段 |
| `lib/client.js` | 浏览器 half（`__ModuleLoader__` bundle）：输入栏人设开关，走 `configForms` 读写 host 侧配置 |
| `cordis.patch.yml` | 向 profile 注入插件行（`id: whale-persona` 同时是配置命名空间） |
| `package.json` | 包元信息与 `dsh.bundle` / `dsh.client` 声明、DSH 兼容性 peer 声明 |
| `CHANGELOG.md` | 更新记录 |
| `LICENSE` | MIT 许可证 |

## 自定义人设文本

人设文本集中在 `lib/index.mjs` 的 `WHALE_PERSONA` 常量，改完**重启 dsh** 后生效（client 侧开关不变）。

## 说明

- 人设段使用独立段名 `whale:persona`，位置紧跟部署人设前缀（`deployment:persona-prefix`）之后，因此位于所有策略与工具说明之前；它不占用注册表自有的 `deployment:persona-prefix` / `deployment:persona-suffix`，可与任意 agent preset 共存，关闭后各 preset 恢复各自默认人设。
- 开关是插件的 `Config` 字段并标记为 volatile：改动会直接写回正在运行的插件所持有的引用，因此即时生效、无需重启，也不会中断当前会话。
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

<img src="assets/whale-author.png" alt="作者" width="280" />

## 更新记录

见 [CHANGELOG.md](CHANGELOG.md)。

MIT License
