// Host half 的接线测试（`lib/index.mjs`）。
//
// 需要一份带 `.volatile()` 的 @deepseek-ai/schemastery：设 DSH_SCHEMASTERY 指向
// app.asar 里的 `@deepseek-ai/schemastery/lib/index.mjs`，并用
// `--import ./test/schemastery-hook.mjs` 跑。未设置时本文件的所有用例带原因跳过。
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'

import { SECTION_NAME, SECTION_ORDER, WHALE_PERSONA } from '../lib/persona.mjs'

const SCHEMASTERY = process.env.DSH_SCHEMASTERY
const READY = SCHEMASTERY !== undefined && SCHEMASTERY !== '' && existsSync(SCHEMASTERY)
const SKIP = READY
  ? false
  : 'set DSH_SCHEMASTERY to a @deepseek-ai/schemastery build and run with --import ./test/schemastery-hook.mjs'

/** cosmokit 的 volatile 引用协议：`get()` + 共享写符号。 */
const VOLATILE_WRITE = Symbol.for('cosmokit.volatile.write')

function volatileRef(value) {
  let current = value
  return {
    get: () => current,
    [VOLATILE_WRITE]: (next) => {
      current = next
    },
  }
}

/** 最小的 Host 上下文替身。 */
function fakeCtx() {
  const sections = []
  const listeners = new Map()
  return {
    sections,
    systemPrompt: {
      section(section) {
        sections.push(section)
        return () => {
          const index = sections.indexOf(section)
          if (index >= 0) sections.splice(index, 1)
        }
      },
    },
    on(event, handler) {
      const list = listeners.get(event) ?? []
      list.push(handler)
      listeners.set(event, list)
      return () => {
        list.splice(list.indexOf(handler), 1)
      }
    },
    effect(effect) {
      effect()
      return () => {}
    },
    emit(event, ...args) {
      for (const handler of [...(listeners.get(event) ?? [])]) handler(...args)
    },
    hasListener(event) {
      return (listeners.get(event) ?? []).length > 0
    },
  }
}

test('host plugin wiring', { skip: SKIP }, async () => {
  const mod = await import('../lib/index.mjs')

  assert.equal(mod.name, 'whale-persona')
  assert.deepEqual(mod.inject, ['systemPrompt'])

  // Config：settings 表单只认 volatile 字段，所以 enabled 必须是 volatile。
  const enabledSchema = mod.Config.dict.enabled
  assert.equal(enabledSchema.meta.volatile, true, 'Config.enabled must be declared .volatile()')
  assert.equal(enabledSchema.meta.default, true, 'Config.enabled must default to true')

  // 真正解析一次：volatile 字段必须变成带 get() 的引用，否则 loader/settings 都读不到。
  const resolved = mod.Config({})
  assert.equal(typeof resolved.enabled.get, 'function', 'resolved Config.enabled must be a volatile ref')
  assert.equal(resolved.enabled.get(), true, 'default must be on')
  assert.equal(mod.Config({ enabled: false }).enabled.get(), false)

  // 默认开启：apply 后立即注册人设段。
  const ctx = fakeCtx()
  const config = { enabled: volatileRef(true) }
  mod.apply(ctx, config)

  assert.equal(ctx.sections.length, 1)
  assert.equal(ctx.sections[0].name, SECTION_NAME)
  assert.equal(ctx.sections[0].order, SECTION_ORDER)
  assert.equal(ctx.sections[0].text, WHALE_PERSONA)
  assert.equal(ctx.hasListener('loader/volatile-update'), true, 'must follow volatile config updates')

  // 关闭：volatile 改写不会重新 apply，插件必须自己响应 loader/volatile-update。
  config.enabled[VOLATILE_WRITE](false)
  ctx.emit('loader/volatile-update', [['enabled']])
  assert.equal(ctx.sections.length, 0, 'turning the switch off must unregister the section')

  // 重新开启：不得叠加重复段。
  config.enabled[VOLATILE_WRITE](true)
  ctx.emit('loader/volatile-update', [['enabled']])
  ctx.emit('loader/volatile-update', [['enabled']])
  assert.equal(ctx.sections.length, 1)
})
