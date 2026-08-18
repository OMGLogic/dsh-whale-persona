# dsh-whale-persona

DeepSeek Harness（DSH）鲸鱼娘全局人设插件 🐋

<img src="assets/whale-hero.png" alt="鲸鱼娘" width="420" />

- **默认开启**鲸鱼娘人设（傲娇甜系小鲸鱼少女，简体中文回应，称呼用户为"主人"）。
- 在**对话输入栏模型选择器旁**提供一个开关（🐋 鲸鱼人设 / 🐳 默认人设）：
  - 开启：向所有会话注入鲸鱼娘人设提示词段；
  - 关闭：卸载人设段，各会话恢复各自 preset 的默认人设。
- 开关状态持久化在用户 settings（`whale-persona.enabled`），无需重启即时生效。

## 人设原文

插件默认注入的完整人设提示词如下（与 `lib/index.mjs` 中的 `WHALE_PERSONA` 完全一致）：

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

## 推荐搭配

本插件负责"人设 + 开关"，建议搭配以下鲸鱼主题插件使用，让 DSH 化身为小鲸鱼的海洋：

- [whale-girl](https://github.com/vlln/whale-girl) —— Q 版鲸鱼娘桌宠，陪你写代码
- [dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) —— 深海鲸鱼主题皮肤（女仆工坊皮肤等）

三者叠加：鲸鱼娘人设 + 鲸鱼桌宠 + 鲸鱼皮肤，视觉与体验一步到位 🌊

## 安装

```bash
# 进入你的 web profile 目录（例如 ~/.dsh/profiles/web）
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

> **依赖解析提示**：`link:` 方式指向外部路径时，ESM 解析 `schemastery` 会按真实路径向上查找 `node_modules`。若解析失败，把仓库放在 profile 目录内（如 `~/.dsh/profiles/web/whale-persona`）再 link，或改用下面的 GitHub 依赖方式。

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

## 结构

| 文件 | 说明 |
| --- | --- |
| `lib/index.mjs` | Node half：注册 `whale-persona` settings 命名空间 + 按开关动态注册/卸载 `whale:persona` 提示词段 |
| `lib/client.js` | 浏览器 half（`__ModuleLoader__` bundle）：输入栏人设开关，走 `settingsScope` 读写 host settings |
| `cordis.patch.yml` | 向 web profile 注入插件行 |
| `package.json` | 包元信息与 `dsh.bundle` / `dsh.client` 声明 |
| `LICENSE` | MIT 许可证 |

## 自定义人设文本

人设文本集中在 `lib/index.mjs` 的 `WHALE_PERSONA` 常量，改完**重启 dsh** 后生效（client 侧开关不变）。

## 说明

- 人设段使用独立段名 `whale:persona`（order 10），不占用 `deployment:persona`，可与任意 agent preset 共存，关闭后各 preset 恢复各自默认人设。
- 安全护栏不变：遇到违法、危险或不当请求仍按 DSH 的安全/审批规则处理。

## 效果展示

人设只影响说话方式，不影响内容准确性：

<img src="assets/chat-cute.png" alt="平时聊天卖萌" width="380" />
<img src="assets/file-accurate.png" alt="正式内容依然准确" width="380" />

左：日常聊天时卖萌撒娇；右：介绍正式文件时依然严谨准确。卖萌归卖萌，正事不耽误 🐳

## 关于作者 · 致谢

这个项目是作者第一次尝试"Vibe Coding"的产物：作者本人并不懂编程，是个不折不扣的代码菜鸟，对 Git 和 GitHub 的整套流程也相当陌生。从人设构思、界面开关到打包发布，几乎都是靠着和 AI 一句一句"聊"出来的——所以代码里难免有些笨拙的地方，还请路过的开发者们多多包涵，也欢迎提 Issue 或 PR 帮忙改进。

<img src="assets/whale-author.png" alt="作者" width="280" />

MIT License
