/**
 * dsh-whale-persona · Node half（Host 侧）
 *
 * 全局鲸鱼娘人设：
 * 1. 用插件自己的 `Config` 声明开关 `enabled`（默认 true）。
 *    这一版 DSH 没有 `ctx.settings.register()`：settings 服务把「插件行的 Config」
 *    投影成可编辑表单，命名空间就是 profile entry id（`whale-persona`）。
 *    字段标成 `.volatile()` 才会出现在该表单里，也才允许不重启热写。
 * 2. 在 prompt 组装时按开关注册/卸载 `whale:persona` 提示词段：
 *    - 开启（默认）：向所有会话注入鲸鱼娘人设段；
 *    - 关闭：卸载该段，各 preset 恢复各自的默认人设。
 * 3. 监听 `loader/volatile-update`：volatile 字段的改写不会重新 apply 插件，
 *    Loader 只把新值提交进运行中的引用并发这个事件，因此必须在这里重新同步。
 *
 * 关于 `@deepseek-ai/schemastery`：它随 DSH 安装提供（profile 插件的解析层会把
 * `@deepseek-ai/*` 指到 dsh 安装目录），所以本包不把它写进 dependencies。
 * 注意 profile 里可能还留着一份上游 `schemastery`，那份**没有** `.volatile()`，
 * 不能用。
 */
import z from '@deepseek-ai/schemastery'
import { createPersonaSection } from './persona.mjs'

export const name = 'whale-persona'
export const inject = ['systemPrompt']

/** settings 表单只暴露 volatile 字段；`enabled` 因此可在运行中热写。 */
export const Config = z.object({
  enabled: z.boolean().default(true).volatile(),
})

export function apply(ctx, config) {
  const section = createPersonaSection(ctx)
  const sync = () => section.sync(config.enabled.get())

  sync()
  ctx.on('loader/volatile-update', sync)
  ctx.effect(() => () => section.dispose(), 'whale-persona: prompt section cleanup')
}
