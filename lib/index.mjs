/**
 * dsh-whale-persona · Node half（host 侧）
 *
 * 全局鲸鱼娘人设：
 * 1. 注册 settings 命名空间 `whale-persona`（{ enabled: boolean, 默认 true }），
 *    开关状态持久化在用户 settings 文档。
 * 2. 在 prompt 组装时，按当前开关状态动态注册/卸载 `whale:persona` 提示词段：
 *    - 开启（默认）：向所有会话注入鲸鱼娘人设段（order 10，位于各 preset 的
 *      deployment:persona 之后，明确覆盖身份描述）；
 *    - 关闭：卸载该段，各 preset 恢复各自的默认人设。
 * 3. 监听 settings 变更（scope.watch），开关切换即时生效，无需重启。
 *
 * 注意：persona 段使用独立段名 `whale:persona`，不占用 `deployment:persona`，
 * 因此可在 root 层注册而不会与 dsh-system-prompt / 各 preset 的 persona 冲突。
 */
import z from 'schemastery'

export const name = 'whale-persona'
export const inject = ['settings']

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

export function apply(ctx) {
  const scope = ctx.settings.register(
    'whale-persona',
    z.object({ enabled: z.boolean().default(true) }),
  )

  let disposer = null
  const applySection = () => {
    if (disposer) {
      disposer()
      disposer = null
    }
    if (!scope.get().enabled) return
    const systemPrompt = ctx.get('systemPrompt')
    if (systemPrompt === undefined) return
    disposer = systemPrompt.section({
      name: 'whale:persona',
      order: 10,
      text: WHALE_PERSONA,
    })
  }

  applySection()
  ctx.effect(() => scope.watch(applySection), 'whale-persona: settings watch')
  ctx.effect(() => () => {
    if (disposer) {
      disposer()
      disposer = null
    }
  }, 'whale-persona: section cleanup')
}
