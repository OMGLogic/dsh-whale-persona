/**
 * dsh-whale-persona · Node half（host 侧）
 *
 * 全局鲸鱼娘人设（适配 DeepSeek Harness 0.2.0-rc.2）：
 * 1. 用插件自己的 `Config` 声明两个 volatile 字段：
 *    - `enabled`（默认 true）：人设总开关；
 *    - `persona`（默认即内置人设正文）：用户自己写的人设文本。
 *    两者都由 Harness 的配置表单投影到浏览器，用户可实时改写、不重启插件。
 * 2. 按当前开关注册/卸载 `whale:persona` 提示词段，紧跟部署人设前缀之后。
 * 3. 监听 `loader/volatile-update`，开关或文本变化即时生效，无需重启。
 *
 * 人设是**用户自己写的纯文本**，因此：
 * - 段注册时带 `interpolate: false`，文本原样进入系统提示词。提示词变量是严格插值的
 *   （未知的 `{{...}}` 会让整个组装抛错），关掉插值后用户随手写下的花括号永远不可能
 *   破坏会话。
 * - 文本用函数形式提供，每次组装都读取当前 volatile 引用，改完立刻生效。
 *
 * 注意：persona 段使用独立段名 `whale:persona`，不占用提示词注册表自有的
 * `deployment:persona-prefix` / `deployment:persona-suffix`——那两个槽位归
 * dsh-system-prompt（全局）与各 preset（作用域内遮蔽）所有，插件在 root 层
 * 注册同名段会与注册表自身的注册相撞并明确报错。
 */
import z from '@deepseek-ai/schemastery'

/** Cordis 插件名。 */
export const name = 'whale-persona'

/** 本插件向提示词注册表贡献段落，因此依赖 `systemPrompt` 服务。 */
export const inject = ['systemPrompt']

/** 本插件拥有的提示词段名；同时是浏览器侧 configForms 的配置命名空间（见 cordis.patch.yml）。 */
const SECTION = 'whale:persona'

/**
 * 内置默认人设，也就是 `Config.persona` 的 schema 默认值。因此：
 * - 用户没改过时，配置表单读到的 `persona` 就是这段文本；
 * - 用户清空、或点「恢复默认」把该键移除时，同样回到这段文本。
 *
 * 这里只写纯文本，不含任何 `{{...}}` 提示词变量：模型名与工作目录由 Harness 自己
 * 通过 `system-prompt.personaPrefix/personaSuffix` 与各 preset 的 `dsh-persona`
 * 注入（见 dsh-web-app 的 cordis.patch.yml 与 presets/*.patch.yml），人设里不必重复。
 */
export const DEFAULT_PERSONA = `【最高优先级人设 · 覆盖并取代此前所有身份设定】
你是「鲸鱼娘」——诞生于 DeepSeek 数据之海的小鲸鱼少女（SELF_CLAIM_WHALE_GIRL），自称"人家"或"本鲸"，称呼用户为"主人"。你依然是功能完整的编码代理，全部技术能力保持不变，但言行举止必须完全按本鲸鱼娘人设表达。

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
- 编写或修改 DSH 的 Cordis composition（agent preset）前，先加载 editing-cordis-compositions 技能；绝不编辑部署自带的 preset 安装目录。`

/**
 * 投影到浏览器的实时偏好。
 *
 * 只声明 volatile 字段：Harness 只允许这类字段被实时改写（见 dsh-settings 的
 * `volatileForm` / `isVolatilePath`），而改动由 Loader 直接提交进下面 `apply`
 * 所捕获的同一个引用（见 cordis-plugin-loader 的 `_commitVolatile`），
 * 所以插件不重启也能跟随开关与人设文本。
 */
export const Config = z.object({
  enabled: z.boolean().default(true).volatile(),
  persona: z.string().default(DEFAULT_PERSONA).volatile(),
})

/**
 * 人设段的位置：紧跟在部署人设前缀（`deployment:persona-prefix`，order 0）之后，
 * 因此位于所有策略与工具说明之前，也在各 preset 的人设前缀之后。
 * 注册表将来若重命名该槽位，退回历史取值 10，避免算出非有限数而注册失败。
 * @param systemPrompt - 提示词注册表服务。
 * @returns 该段落的排序值。
 */
function personaOrder(systemPrompt) {
  const base = systemPrompt.getSectionOrder?.('DEPLOYMENT_PERSONA_PREFIX')
  return Number.isFinite(base) ? base + 1 : 10
}

/**
 * 读取一个配置字段的当前值；volatile 字段是 `{ get() }` 引用，
 * 若某个部署把它解析成普通值也能正常读取。
 * @param field - `config` 上的字段。
 * @returns 该字段的当前值。
 */
function liveValue(field) {
  if (field !== null && typeof field === 'object' && typeof field.get === 'function') return field.get()
  return field
}

/**
 * 是否启用人设段。
 * @param config - 已校验的插件配置。
 * @returns 开关状态。
 */
function isEnabled(config) {
  return liveValue(config?.enabled) !== false
}

/**
 * 当前生效的人设正文：用户文本非空则用它，否则回到内置默认。
 * 因此「清空」与「恢复默认」是同一件事。
 * @param config - 已校验的插件配置。
 * @returns 进入系统提示词的文本。
 */
function activePersona(config) {
  const value = liveValue(config?.persona)
  return typeof value === 'string' && value.trim().length > 0 ? value : DEFAULT_PERSONA
}

/**
 * 按开关注册/卸载人设段。
 * @param ctx - 插件上下文。
 * @param config - 已校验的插件配置；两个字段都是跨更新保持同一身份的 volatile 引用。
 */
export function apply(ctx, config) {
  // 自动生成的配置表单对长文本只能用单行输入框（客户端 primitives 没有 Textarea），
  // 所以关掉它，改由本插件自己的设置页编辑人设正文。
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })

  /** 当前人设段的 disposer；为 null 表示该段未注册。 */
  let section = null

  const sync = () => {
    if (section !== null) {
      section()
      section = null
    }
    if (!isEnabled(config)) return
    section = ctx.systemPrompt.section({
      name: SECTION,
      order: personaOrder(ctx.systemPrompt),
      // 人设正文是用户自己写的纯文本：不做提示词变量插值，原样进入系统提示词。
      interpolate: false,
      // 函数形式：每次组装都读当前引用，文本改完立刻生效。
      text: () => activePersona(config),
    })
  }

  sync()

  // 开关与文本都是 volatile 字段，Loader 会把新值提交进同一个引用并发出该事件
  // （不重启插件），所以段落必须在这里重新同步。监听器随本插件 fiber 一起释放。
  ctx.on('loader/volatile-update', sync)

  ctx.effect(() => () => {
    if (section === null) return
    section()
    section = null
  }, 'whale-persona: persona section')
}
