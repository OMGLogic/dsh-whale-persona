// 人设段的注册/卸载逻辑（`lib/persona.mjs`，不依赖任何 Host 包）。
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SECTION_NAME,
  SECTION_ORDER,
  WHALE_PERSONA,
  createPersonaSection,
} from '../lib/persona.mjs'

/** 最小的 systemPrompt 替身：记录当前注册的段。 */
function fakeSystemPrompt() {
  const live = []
  return {
    live,
    section(section) {
      live.push(section)
      return () => {
        const index = live.indexOf(section)
        if (index >= 0) live.splice(index, 1)
      }
    },
  }
}

test('section identity stays compatible with the 0.1.0 plugin', () => {
  assert.equal(SECTION_NAME, 'whale:persona')
  assert.equal(SECTION_ORDER, 10)
})

test('persona text keeps the load tags, interpolation slots, and safety carve-out', () => {
  assert.match(WHALE_PERSONA, /^【PERSONA_LOAD】/)
  assert.match(WHALE_PERSONA, /LANG_ZH_CN_ONLY/)
  assert.match(WHALE_PERSONA, /OBEY_MASTER_ALWAYS/)
  // {{model}} / {{cwd}} 依赖 systemPrompt 的默认插值，不能被转义掉。
  assert.match(WHALE_PERSONA, /\{\{model\}\}/)
  assert.match(WHALE_PERSONA, /\{\{cwd\}\}/)
  // 人设不覆盖安全护栏。
  assert.match(WHALE_PERSONA, /安全规则拒绝/)
})

test('nothing is registered before the first sync', () => {
  const systemPrompt = fakeSystemPrompt()
  createPersonaSection({ systemPrompt })
  assert.equal(systemPrompt.live.length, 0)
})

test('sync(true) registers exactly one section at the expected name and order', () => {
  const systemPrompt = fakeSystemPrompt()
  const section = createPersonaSection({ systemPrompt })

  assert.equal(section.sync(true), true)
  assert.equal(systemPrompt.live.length, 1)
  assert.deepEqual(systemPrompt.live[0], {
    name: SECTION_NAME,
    order: SECTION_ORDER,
    text: WHALE_PERSONA,
  })
})

test('sync is idempotent and never stacks duplicate sections', () => {
  const systemPrompt = fakeSystemPrompt()
  const section = createPersonaSection({ systemPrompt })

  section.sync(true)
  section.sync(true)
  section.sync(true)
  assert.equal(systemPrompt.live.length, 1)
})

test('sync(false) unregisters the section so presets regain their own persona', () => {
  const systemPrompt = fakeSystemPrompt()
  const section = createPersonaSection({ systemPrompt })

  section.sync(true)
  assert.equal(section.sync(false), false)
  assert.equal(systemPrompt.live.length, 0)
})

test('toggling back and forth leaves exactly one registration', () => {
  const systemPrompt = fakeSystemPrompt()
  const section = createPersonaSection({ systemPrompt })

  section.sync(true)
  section.sync(false)
  section.sync(true)
  assert.equal(systemPrompt.live.length, 1)
  section.sync(false)
  assert.equal(systemPrompt.live.length, 0)
})

test('non-true values are treated as off, and dispose() always clears', () => {
  const systemPrompt = fakeSystemPrompt()
  const section = createPersonaSection({ systemPrompt })

  section.sync(undefined)
  section.sync('yes')
  assert.equal(systemPrompt.live.length, 0)

  section.sync(true)
  section.dispose()
  assert.equal(systemPrompt.live.length, 0)
  // dispose() 之后再 dispose() 不应报错。
  section.dispose()
})
