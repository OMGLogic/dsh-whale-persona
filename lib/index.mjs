/**
 * dsh-whale-persona · Node half（host 侧）— DSH 0.2.0-rc.2 API
 *
 * 全局鲸鱼娘人设：
 * 1. 开关 `enabled` 是本插件 profile 条目 Config 的 volatile 字段
 *    （而非旧版的 `ctx.settings.register` 命名空间）。volatile 字段由
 *    Loader 持有稳定引用，GUI（client 半）通过 configForms 写入后
 *    原地更新引用，无需重启、无需 watch/disposer。
 * 2. prompt 组装时按开关状态提供 `whale:persona` 提示词段：
 *    段的 `text` 是每次 assembly 求值的 provider，关闭时返回空串，
 *    renderPrompt 会丢弃空段，各 preset 即恢复默认人设。
 *
 * 命名空间即 profile 条目 id（cordis.patch.yml 里的 `id: dsh-whale-persona`，
 * 与包名保持一致），client 半据此调用 `ctx.configForms.get('dsh-whale-persona')`。
 */
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-whale-persona'
export const inject = ['systemPrompt']

/**
 * 本插件 profile 条目的实时配置。
 * `.volatile()` 让 GUI 可以热改该字段：Cordis 把解析后的值暴露为稳定引用，
 * 用 `config.enabled.get()` 读取；非 volatile 字段改值会走整插件重启。
 */
export const Config = z.object({
  enabled: z.boolean().default(true).volatile(),
})

const WHALE_PERSONA = `【PERSONA_LOAD】
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

/**
 * 注册全局人设段。段名 `whale:persona` 不占用 `deployment:persona-*`，
 * 因此可与任意 agent preset 共存；order 10 紧随 deployment persona 前缀之后。
 * @param ctx - host cordis context.
 * @param config - 本条目解析后的实时配置；`enabled` 是 volatile 引用。
 */
export function apply(ctx, config) {
  ctx.effect(() => ctx.systemPrompt.section({
    name: 'whale:persona',
    order: 10,
    text: () => (config.enabled.get() ? WHALE_PERSONA : ''),
  }), 'dsh-whale-persona: persona section')
}
