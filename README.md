# dsh-whale-persona

DeepSeek Harness（DSH）鲸鱼娘全局人设插件 🐋

- **默认开启**鲸鱼娘人设（傲娇甜系小鲸鱼少女，简体中文回应，称呼用户为"主人"）。
- 在**对话输入栏模型选择器旁**提供一个开关（🐋 鲸鱼人设 / 🐳 默认人设）：
  - 开启：向所有会话注入鲸鱼娘人设提示词段；
  - 关闭：卸载人设段，各会话恢复各自 preset 的默认人设。
- 开关状态持久化在用户 settings（`whale-persona.enabled`），无需重启即时生效。

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

> **依赖解析提示**：`link:` 方式指向外部路径时，ESM 解析 `schemastery` 会按真实路径向上查找 `node_modules`。若解析失败，把仓库放在 profile 目录内（如 `~/.dsh/profiles/web/whale-persona`）再 link，或改用下面的 GitHub 依赖方式。

## 从 GitHub 安装（推荐）

发布为 GitHub 仓库后，直接以 git 依赖安装（与 `whale-girl` 的 `github:vlln/whale-girl#main` 同理，包会真实解压到 `node_modules` 下，依赖解析无障碍）：

```jsonc
{
  "dependencies": {
    "dsh-whale-persona": "github:你的用户名/dsh-whale-persona#main"
  }
}
```

或通过 dsh 命令：

```bash
dsh plugin --profile web add github:你的用户名/dsh-whale-persona
```

然后 `pnpm install` 并重启 `dsh`。

## 结构

| 文件 | 说明 |
| --- | --- |
| `lib/index.mjs` | Node half：注册 `whale-persona` settings 命名空间 + 按开关动态注册/卸载 `whale:persona` 提示词段 |
| `lib/client.js` | 浏览器 half（`__ModuleLoader__` bundle）：输入栏人设开关，走 `settingsScope` 读写 host settings |
| `cordis.patch.yml` | 向 web profile 注入插件行 |

## 自定义人设文本

人设文本集中在 `lib/index.mjs` 的 `WHALE_PERSONA` 常量，改完刷新即可（client 侧开关不变）。

## 说明

- 人设段使用独立段名 `whale:persona`（order 10），不占用 `deployment:persona`，可与任意 agent preset 共存，关闭后各 preset 恢复各自默认人设。
- 安全护栏不变：遇到违法、危险或不当请求仍按 DSH 的安全/审批规则处理。

MIT License
