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
 * 人设是**纯文本**：段注册时带 `interpolate: false`，注入时不做任何变量替换，
 * 写什么模型就看到什么。注册表的严格插值遇到未知的 `{{...}}` 会让整个组装抛错
 * （整个 profile 的会话都发不出请求），而人设是给人自由编辑的文本，不该有这种能力。
 * 文本用函数形式提供，每次组装都读取当前 volatile 引用，改完立刻生效。
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
 * 正文是 0.1.0 的 `【PERSONA_LOAD】` 标签组，原样注入，不含任何模板语法。
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
TIMEOUT_SIGNAL`

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
      // 人设是用户自由编辑的纯文本：关掉注册表的严格插值，原样注入。
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
