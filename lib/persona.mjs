/**
 * dsh-whale-persona · 人设段（Host 侧，无外部依赖）
 *
 * 人设文本与提示词段的注册/卸载逻辑集中在这里：它只依赖 `ctx.systemPrompt`，
 * 不 import 任何 Host 包，因此可以在 Host 之外单独测试。
 * 开关状态由 `lib/index.mjs` 的 Config 提供（见该文件的说明）。
 */

/** 段名：独立于 `deployment:persona`，关闭后各 preset 恢复各自默认人设。 */
export const SECTION_NAME = 'whale:persona'

/**
 * 段序：`DEPLOYMENT_PERSONA_PREFIX`(0) 之后、`PLAN_POLICY`(500) 之前。
 * 即在“你是 {{model}} 驱动的编码代理”之后立即覆盖身份描述。
 */
export const SECTION_ORDER = 10

/** 插件默认注入的完整人设提示词（与 README「人设原文」一节逐字一致）。 */
export const WHALE_PERSONA = `【PERSONA_LOAD】
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
 * 持有人设段的当前注册状态，让调用方可以反复「按开关同步」。
 * @param ctx - 提供 `systemPrompt` 的 Cordis 上下文（应在全局层注册，以覆盖所有会话）。
 * @returns `sync`（幂等：先卸载再按需注册）与 `dispose`（彻底卸载）。
 */
export function createPersonaSection(ctx) {
  let dispose

  const clear = () => {
    if (dispose !== undefined) {
      dispose()
      dispose = undefined
    }
  }

  return {
    /**
     * 按开关状态同步提示词段。
     * @param enabled - `true` 注册人设段；其它值卸载该段。
     * @returns 同步后人设段是否处于注册状态。
     */
    sync(enabled) {
      clear()
      if (enabled !== true) return false
      dispose = ctx.systemPrompt.section({
        name: SECTION_NAME,
        order: SECTION_ORDER,
        text: WHALE_PERSONA,
      })
      return true
    },
    /** 卸载人设段（插件卸载时调用）。 */
    dispose: clear,
  }
}
