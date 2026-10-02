// Client half 的接线测试（`lib/client.js`）。
//
// 用替身 `window.__ModuleLoader__` 加载 bundle，再用替身 React 渲染开关，
// 检查它确实经由 `remote.settings` 读写 `whale-persona` 命名空间。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

let definition
globalThis.window = {
  __ModuleLoader__: {
    load(value) {
      definition = value
    },
  },
}
await import('../lib/client.js')

const react = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
  useEffect: (effect) => {
    effect()
  },
}

const requireStub = (specifier) => {
  if (specifier === 'react') return react
  throw new Error(`unexpected require(${specifier})`)
}

const tick = () => new Promise((resolve) => setImmediate(resolve))

const NAMESPACE = 'whale-persona'
const SLOT = 'conversation.input.right'

/** 客户端上下文 + Host settings 替身。 */
function harness({ writable = true, served = true } = {}) {
  const state = { enabled: true, revision: 7, writable }
  const calls = { describe: 0, update: [], subscribed: [], hostEvents: [], locale: [], effects: [], slots: [] }
  const handlers = new Map()
  let component
  let options

  const locale = {
    register(ns, dicts) {
      calls.locale.push({ ns, dicts })
      return () => {}
    },
    bind: (ns) => (key) => `${ns}:${key}`,
  }

  const remote = {
    settings: {
      async describe() {
        calls.describe += 1
        return {
          ok: true,
          value: {
            writable: state.writable,
            hasDocument: true,
            namespaces: served
              ? [{
                  ns: NAMESPACE,
                  value: { enabled: state.enabled },
                  revision: state.revision,
                  applies: 'live',
                }]
              : [],
          },
        }
      },
      async update(ns, patch, expectedRevision) {
        calls.update.push({ ns, patch, expectedRevision })
        if (state.writable !== true) {
          return { ok: false, error: { code: 'settings/rejected', message: 'profile is read-only' } }
        }
        if (expectedRevision !== undefined && expectedRevision !== state.revision) {
          return { ok: false, error: { code: 'settings/conflict', message: 'stale revision' } }
        }
        state.enabled = patch.enabled
        state.revision += 1
        return { ok: true, value: { ns, value: { enabled: state.enabled }, revision: state.revision, applies: 'live' } }
      },
    },
    $on(event, listener) {
      calls.subscribed.push(event)
      handlers.set(event, listener)
      return () => handlers.delete(event)
    },
  }

  const ctx = {
    get: (name) => (name === 'locale' ? locale : undefined),
    remote,
    on(event, handler) {
      calls.hostEvents.push(event)
      handlers.set(event, handler)
      return () => handlers.delete(event)
    },
    effect(fn, label) {
      calls.effects.push(label)
      const disposer = fn()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    slots: {
      inject(key, callback) {
        calls.slots.push(key)
        callback()
        return () => {}
      },
      register(registration, Component) {
        options = registration
        component = Component
        return () => {}
      },
    },
  }

  return {
    state,
    calls,
    handlers,
    ctx,
    render: () => component(),
    registration: () => options,
  }
}

test('bundle identity matches the package name', () => {
  assert.equal(definition.id, pkg.name)
})

test('client plugin declares the services its switches need', () => {
  const plugin = definition.factory(requireStub)
  assert.deepEqual(plugin.inject, ['slots', 'remote', 'remote.settings'])
  assert.equal(typeof plugin.apply, 'function')
})

test('apply registers the composer switch and follows host settings', () => {
  const plugin = definition.factory(requireStub)
  const h = harness()
  plugin.apply(h.ctx)

  // 本地化文案：中英各一份。
  assert.equal(h.calls.locale.length, 1)
  assert.equal(h.calls.locale[0].ns, NAMESPACE)
  assert.equal(h.calls.locale[0].dicts.zh['toggle.on'], '鲸鱼人设')
  assert.equal(h.calls.locale[0].dicts.en['toggle.on'], 'Whale persona')

  // 槽位：输入栏模型选择器旁的紧凑控件。
  assert.deepEqual(h.calls.slots, [SLOT])
  assert.deepEqual(h.registration(), { name: SLOT, id: 'whale-persona-toggle', order: -100 })

  // 失效信号：host 文档变更 + 连接重置。
  assert.deepEqual(h.calls.subscribed, ['settings/document-updated'])
  assert.deepEqual(h.calls.hostEvents, ['connection/reset'])
})

test('the switch reads its state from remote.settings and writes it back', async () => {
  const plugin = definition.factory(requireStub)
  const h = harness()
  plugin.apply(h.ctx)

  // 首次渲染前不读 host；渲染后仍是「读取中」，先禁用，避免误触。
  assert.equal(h.calls.describe, 0, 'must not read settings until the switch is first used')
  const loading = h.render()
  assert.equal(loading.type, 'button')
  assert.equal(loading.props.disabled, true)

  await tick()
  assert.equal(h.calls.describe, 1)
  const on = h.render()
  assert.equal(on.props.disabled, false)
  assert.equal(on.props['aria-pressed'], true)
  assert.equal(on.props.title, `${NAMESPACE}:toggle.title.on`)
  assert.deepEqual(on.children[1].children, [`${NAMESPACE}:toggle.on`])

  // 点击 → 写回 host settings：ns + patch + expectedRevision。
  on.props.onClick()
  await tick()
  assert.deepEqual(h.calls.update, [{ ns: NAMESPACE, patch: { enabled: false }, expectedRevision: 7 }])

  const off = h.render()
  assert.equal(off.props['aria-pressed'], false)
  assert.equal(off.props.title, `${NAMESPACE}:toggle.title.off`)
  assert.deepEqual(off.children[1].children, [`${NAMESPACE}:toggle.off`])
})

test('a rejected write rolls the switch back to the host value', async () => {
  const plugin = definition.factory(requireStub)
  const h = harness()
  plugin.apply(h.ctx)
  h.render()
  await tick()

  // 别的写把 revision 推进了 → 本次写会 conflict。
  h.state.revision += 1
  h.render().props.onClick()
  await tick()

  assert.equal(h.calls.update.length, 1)
  assert.equal(h.calls.update[0].expectedRevision, 7)
  const rolledBack = h.render()
  assert.equal(rolledBack.props['aria-pressed'], true, 'failed write must not fake the new state')
})

test('host settings invalidation and reconnects refresh the switch', async () => {
  const plugin = definition.factory(requireStub)
  const h = harness()
  plugin.apply(h.ctx)
  h.render()
  await tick()
  assert.equal(h.render().props['aria-pressed'], true)

  // 另一个界面/引擎改了开关 → settings/document-updated 只对本命名空间生效。
  h.state.enabled = false
  h.state.revision += 1
  const before = h.calls.describe
  h.handlers.get('settings/document-updated')('other-namespace', 1)
  await tick()
  assert.equal(h.calls.describe, before, 'an unrelated namespace must not trigger a read')

  h.handlers.get('settings/document-updated')(NAMESPACE, 2)
  await tick()
  assert.equal(h.calls.describe, before + 1)
  assert.equal(h.render().props['aria-pressed'], false)

  // 重连后重新读一次。
  h.state.enabled = true
  h.state.revision += 1
  h.handlers.get('connection/reset')()
  await tick()
  assert.equal(h.render().props['aria-pressed'], true)
})

test('a read-only profile disables the switch instead of writing', async () => {
  const plugin = definition.factory(requireStub)
  const h = harness({ writable: false })
  plugin.apply(h.ctx)
  h.render()
  await tick()

  const button = h.render()
  assert.equal(button.props.disabled, true)
  assert.equal(button.props.title, `${NAMESPACE}:toggle.title.readonly`)
  button.props.onClick()
  await tick()
  assert.deepEqual(h.calls.update, [], 'a read-only namespace must not be written')
})

test('a host that serves no whale-persona namespace disables the switch', async () => {
  const plugin = definition.factory(requireStub)
  const h = harness({ served: false })
  plugin.apply(h.ctx)
  h.render()
  await tick()

  const button = h.render()
  assert.equal(button.props.disabled, true)
  assert.equal(button.props.title, `${NAMESPACE}:toggle.title.unavailable`)
  button.props.onClick()
  await tick()
  assert.deepEqual(h.calls.update, [])
})
