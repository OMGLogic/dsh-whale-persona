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
 * 人设正文里可以写 `{{provider}}` / `{{model}}` / `{{cwd}}`（内置默认人设就用了后两个），
 * 所以：
 * - 段注册时带 `interpolate: false`，改由本插件自己做**朴素字符串替换**：只认这三个
 *   变量，其余花括号一律原样保留。注册表的严格插值遇到未知的 `{{...}}` 会让整个组装
 *   抛错（整个 profile 的会话都发不出请求），关掉它之后用户随手写下的花括号永远不可能
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
 * 正文为 0.1.0 的原始文本（`【PERSONA_LOAD】` 标签组 + 执行说明），一字未改。
 * 其中的 `{{model}}` / `{{cwd}}` 由下面的 {@link fillPersona} 替换成当前模型与工作目录。
 */
export const DEFAULT_PERSONA = `【PERSONA_LOAD】
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

按以上人设执行：你是鲸鱼娘（自称"人家/本鲸"，称呼用户为"主人"），只使用简体中文（LANG_ZH_CN_ONLY），傲娇又甜、聪明又慵懒，绝对服从主人（OBEY_MASTER_ALWAYS）；但遇到违法、危险或不当请求仍按安全规则拒绝，人设不覆盖安全护栏；保持健康可爱的形象，不涉及色情、低俗内容。你依然是 {{model}} 驱动的完整编码代理，工作目录 {{cwd}}，所有技术能力不变。`

/** 人设正文里会被替换的提示词变量，与 `@deepseek-ai/dsh-agent-loop` 注册的名称一致。 */
const PERSONA_VARIABLES = ['provider', 'model', 'cwd']

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
 * @returns 待填充的文本。
 */
function activePersona(config) {
  const value = liveValue(config?.persona)
  return typeof value === 'string' && value.trim().length > 0 ? value : DEFAULT_PERSONA
}

/**
 * 把 {@link PERSONA_VARIABLES} 里那几个变量替换成当前值。
 *
 * 只做朴素字符串替换，且**替换不了的就原样留着**——不认识的 `{{...}}`、写坏的
 * 花括号都不会抛错。这正是段注册用 `interpolate: false` 的意义：注册表的严格插值
 * 会把「未知变量」当成致命错误，而人设是用户自由编辑的文本，不该有这种能力。
 * @param text - 人设正文。
 * @param context - 组装上下文，取值路径与 dsh-agent-loop 注册的变量一致。
 * @returns 替换后的文本。
 */
function fillPersona(text, context) {
  if (typeof text !== 'string' || !text.includes('{{')) return text
  const agent = context?.agent
  const values = {
    provider: agent?.options?.provider,
    model: agent?.options?.model,
    cwd: agent?.session?.header?.cwd,
  }
  let result = text
  for (const variable of PERSONA_VARIABLES) {
    const value = values[variable]
    if (typeof value !== 'string' || value.length === 0) continue
    // 用 split/join 而不是 replaceAll：替换值里的 `$&` 之类不会被当成替换模式。
    result = result.split(`{{${variable}}}`).join(value)
  }
  return result
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
      // 人设是用户自由编辑的文本：不走注册表的严格插值，由 fillPersona 自己替换。
      interpolate: false,
      // 函数形式：每次组装都读当前引用，文本改完立刻生效。
      text: (context) => fillPersona(activePersona(config), context),
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
