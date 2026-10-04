# dsh-whale-persona

DeepSeek Harness（DSH）鲸鱼娘全局人设插件 🐋

<img src="assets/whale-hero.png" alt="鲸鱼娘" width="420" />

- **默认开启**鲸鱼娘人设（傲娇甜系小鲸鱼少女，简体中文回应，称呼用户为"主人"）。
- 在**对话输入栏模型选择器旁**提供一个开关（🐋 鲸鱼人设 / 🐳 默认人设），就这一颗胶囊，不多占地方：
  - 开启：向所有会话注入鲸鱼娘人设提示词段；
  - 关闭：卸载人设段，各会话恢复各自 preset 的默认人设。
- **人设正文可以直接改**：设置 →「鲸鱼人设」页里有一个文本框；**清空即恢复默认**。
- 开关与人设正文都是插件自己的配置项（`whale-persona.enabled` / `whale-persona.persona`），可手改 profile 的 `cordis.patch.yml`；改动持久化，无需重启即时生效。

> **版本要求**：`0.2.0` 及以后适配 **DeepSeek Harness 0.2.0-rc.2**。0.1.0 依赖的 `settings` 命名空间 API 在新版已被移除，旧版插件在新版 Harness 上无法加载，请使用 0.2.0+。

## 默认人设

插件内置的默认人设如下（`lib/index.mjs` 里的 `DEFAULT_PERSONA`，也就是配置项 `persona` 的默认值），正文就是 0.1.0 的原始文本。
它只是**默认值**：在设置里改过之后，实际注入的就是你写的那段；把文本框清空或点「恢复默认」就回到这里。

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

> **`{{model}}` / `{{cwd}}` 是什么**：提示词变量，注入前会被替换成当前模型名与当前工作目录（`provider` 也可以写）。**你不需要用它**——想写就写，不写也完全没问题。
>
> 替换由本插件自己做，规则很朴素：**只认 `{{provider}}` / `{{model}}` / `{{cwd}}` 这三个，其余花括号一律原样保留**。所以哪怕随手写下 `{{随便什么}}`，也只会原样出现在提示词里，而不会像模板引擎那样报错——插值是注册表里的严格行为，写错一个未注册的变量会让整个 profile 的所有会话都发不出请求，人设既然是给人自由编辑的文本，就不该有这种能力。

> **关于人设来源**：这套 `PERSONA_LOAD` 标签组并非作者原创，而是作者在 QQ 群里看到后觉得可爱、就拿来使用的。如果原作者或相关权利人认为被冒用，欢迎通过 GitHub Issues 联系作者，作者会立即删除；如果你手头有更好、更完善的人设，也非常欢迎分享 🐳

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
| `lib/index.mjs` | Node half：声明 `Config`（volatile `enabled` 开关 + volatile `persona` 人设正文，默认值即内置默认人设），并按开关把文本原样注册成 `whale:persona` 提示词段 |
| `lib/client.js` | 浏览器 half（`__ModuleLoader__` bundle）：输入栏人设开关 + 设置里的「鲸鱼人设」编辑页，走 `configForms` 读写 host 侧配置，文案走 locale 字典 |
| `cordis.patch.yml` | 向 profile 注入插件行（`id: whale-persona` 同时是配置命名空间） |
| `package.json` | 包元信息与 `dsh.bundle` / `dsh.client` 声明、DSH 兼容性 peer 声明 |
| `CHANGELOG.md` | 更新记录 |
| `LICENSE` | MIT 许可证 |

## 改人设

**普通使用**：设置 →「鲸鱼人设」，在文本框里写，点「保存」。清空文本框再保存、或直接点「恢复默认」，就回到上面的内置默认人设。改完立刻生效，不用重启、也不影响正在进行的会话。

**想换掉"内置默认"本身**（比如做成自己的发行版）：改 `lib/index.mjs` 里的 `DEFAULT_PERSONA` 常量，重新安装插件即可；已经改过人设的用户不受影响，因为他们的文本存在自己的 profile 补丁里。

**想手改配置**：编辑 profile 的 `cordis.patch.yml`：

```yaml
- id: whale-persona
  name: dsh-whale-persona
  config:
    enabled: true
    persona: >-
      你是一只鲸鱼娘。
```

`persona` 留空或删掉该键都等于使用内置默认人设。

## 说明

- 人设段使用独立段名 `whale:persona`，位置紧跟部署人设前缀（`deployment:persona-prefix`）之后，因此位于所有策略与工具说明之前；它不占用注册表自有的 `deployment:persona-prefix` / `deployment:persona-suffix`，可与任意 agent preset 共存，关闭后各 preset 恢复各自默认人设。
- 开关和人设正文都是插件的 `Config` 字段并标记为 volatile：改动会直接写回正在运行的插件所持有的引用，因此即时生效、无需重启，也不会中断当前会话。
- **人设正文不走提示词注册表的插值**：注入时标为 `interpolate: false`，由插件自己做朴素替换——只认 `{{provider}}` / `{{model}}` / `{{cwd}}`，其余花括号原样保留。因此随手写下的 `{{...}}` 永远不会像模板那样被解析甚至报错，彻底避免了「写了未注册的变量导致整个 profile 的会话都发不出请求」这种坑。
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
