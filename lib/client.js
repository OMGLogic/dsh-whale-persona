// dsh-whale-persona · client half（浏览器侧）
//
// 预构建为 __ModuleLoader__ 可加载的 bundle：对话输入栏（模型选择器旁）的人设开关。
//
// 这一版 DSH 没有 `ctx.settingsScope`。开关状态改为走 host settings 的 Remote 命名空间：
//   - `ctx.remote.settings.describe()` 读出 `whale-persona` 命名空间里的 `enabled` 与 `revision`
//   - `ctx.remote.settings.update(ns, { enabled }, revision)` 写回（带 revision 做冲突检测）
//   - `ctx.remote.$on('settings/document-updated', …)` + `connection/reset` 作为失效信号
// 命名空间就是 profile entry id，与 cordis.patch.yml 里的行 id `whale-persona` 一致。
window.__ModuleLoader__.load({
  id: 'dsh-whale-persona',
  factory: (require) => {
    const React = require('react')

    /** Host settings 命名空间（= profile entry id，见 cordis.patch.yml）。 */
    const NAMESPACE = 'whale-persona'
    /** 输入栏工具行里「提交按钮之前的紧凑控件」槽位。 */
    const SLOT = 'conversation.input.right'

    const ZH = {
      'toggle.on': '鲸鱼人设',
      'toggle.off': '默认人设',
      'toggle.label': '鲸鱼娘人设开关',
      'toggle.title.on': '鲸鱼娘人设：已开启（点击关闭 → 恢复默认人设）',
      'toggle.title.off': '鲸鱼娘人设：已关闭（点击开启）',
      'toggle.title.busy': '鲸鱼娘人设：正在保存…',
      'toggle.title.loading': '鲸鱼娘人设：正在读取开关状态…',
      'toggle.title.readonly': '鲸鱼娘人设：当前 profile 的设置不可写，只能用 cordis.patch.yml 修改',
      'toggle.title.unavailable': '鲸鱼娘人设：宿主未提供 whale-persona 设置，开关不可用',
    }
    const EN = {
      'toggle.on': 'Whale persona',
      'toggle.off': 'Default persona',
      'toggle.label': 'Whale-girl persona switch',
      'toggle.title.on': 'Whale-girl persona: on (click to turn off and restore the default persona)',
      'toggle.title.off': 'Whale-girl persona: off (click to turn on)',
      'toggle.title.busy': 'Whale-girl persona: saving…',
      'toggle.title.loading': 'Whale-girl persona: reading the switch state…',
      'toggle.title.readonly': 'Whale-girl persona: this profile\u2019s settings are not writable; edit cordis.patch.yml instead',
      'toggle.title.unavailable': 'Whale-girl persona: the host serves no whale-persona setting, so this switch is unavailable',
    }

    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    /** 关掉一个开关值：Host 存的是布尔，缺失/异常一律当作默认的「开」。 */
    function enabledOf(view) {
      const value = view.value
      if (value === null || typeof value !== 'object') return true
      return value.enabled !== false
    }

    /**
     * 人设开关的唯一状态源：`whale-persona` settings 命名空间在浏览器侧的实时镜像。
     * @param ctx - 客户端根上下文，需带 `remote.settings`。
     */
    function createEnabledStore(ctx) {
      let snapshot = {
        status: 'idle',
        enabled: true,
        writable: false,
        revision: undefined,
        error: null,
      }
      const listeners = new Set()
      let inFlight

      const publish = (next) => {
        snapshot = next
        for (const listener of [...listeners]) listener()
      }

      const ready = (view, writable) => ({
        status: 'ready',
        enabled: enabledOf(view),
        writable,
        revision: view.revision,
        error: null,
      })

      /** 读一次 Host 文档；并发调用合并到同一次读。 */
      const load = () => {
        if (inFlight !== undefined) return inFlight
        inFlight = Promise.resolve()
          .then(() => ctx.remote.settings.describe())
          .then((response) => {
            if (!response.ok) {
              publish({ ...snapshot, status: 'unavailable', error: response.error.message })
              return
            }
            const view = response.value.namespaces.find((row) => row.ns === NAMESPACE)
            if (view === undefined) {
              publish({ ...snapshot, status: 'unavailable', error: null })
              return
            }
            publish(ready(view, response.value.writable))
          })
          .catch((error) => {
            publish({ ...snapshot, status: 'unavailable', error: messageOf(error) })
          })
          .finally(() => {
            inFlight = undefined
          })
        return inFlight
      }

      /** 写回开关；失败时回滚显示并重新读一次以拿到真实状态。 */
      const toggle = () => {
        if (snapshot.status !== 'ready' || snapshot.writable !== true) return
        const next = snapshot.enabled !== true
        const revision = snapshot.revision
        publish({ ...snapshot, status: 'saving', enabled: next, error: null })
        Promise.resolve()
          .then(() => ctx.remote.settings.update(NAMESPACE, { enabled: next }, revision))
          .then((response) => {
            if (!response.ok) {
              publish({ ...snapshot, status: 'ready', enabled: !next, error: response.error.message })
              return load()
            }
            publish(ready(response.value, true))
          })
          .catch((error) => {
            publish({ ...snapshot, status: 'ready', enabled: !next, error: messageOf(error) })
          })
      }

      return {
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        getSnapshot() {
          return snapshot
        },
        /** 首次使用时才读 Host，避免每个页面启动都多打一次 settings.describe。 */
        ensure() {
          if (snapshot.status === 'idle') load()
        },
        reload: load,
        toggle,
      }
    }

    /** 输入栏开关：默认人设 🐳 / 鲸鱼人设 🐋。 */
    function createToggle(store, t) {
      return function WhalePersonaToggle() {
        const snapshot = React.useSyncExternalStore(
          (listener) => store.subscribe(listener),
          () => store.getSnapshot(),
          () => store.getSnapshot(),
        )
        React.useEffect(() => {
          store.ensure()
        }, [])

        const enabled = snapshot.enabled === true
        const busy = snapshot.status === 'saving'
        const usable = snapshot.writable === true && (snapshot.status === 'ready' || busy)

        let title
        if (snapshot.status === 'idle') title = t('toggle.title.loading')
        else if (snapshot.status === 'unavailable') title = t('toggle.title.unavailable')
        else if (busy) title = t('toggle.title.busy')
        else if (snapshot.writable !== true) title = t('toggle.title.readonly')
        else if (snapshot.error !== null && snapshot.error !== undefined) title = snapshot.error
        else title = enabled ? t('toggle.title.on') : t('toggle.title.off')

        return React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => store.toggle(),
            disabled: !usable,
            title,
            'aria-pressed': enabled,
            'aria-label': t('toggle.label'),
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid ' + (enabled ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l1)'),
              background: 'transparent',
              color: enabled ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)',
              fontSize: '12px',
              lineHeight: '20px',
              whiteSpace: 'nowrap',
              cursor: usable ? 'pointer' : 'default',
              opacity: usable ? '1' : '0.6',
            },
          },
          React.createElement('span', { 'aria-hidden': true }, enabled ? '🐋' : '🐳'),
          React.createElement('span', null, enabled ? t('toggle.on') : t('toggle.off')),
        )
      }
    }

    function apply(ctx) {
      const locale = ctx.get('locale')
      if (locale !== undefined) {
        ctx.effect(() => locale.register(NAMESPACE, { zh: ZH, en: EN }), 'whale-persona: dictionaries')
      }
      const translate = locale === undefined ? (key) => key : locale.bind(NAMESPACE)

      const store = createEnabledStore(ctx)

      ctx.effect(() => {
        const disposers = [
          ctx.remote.$on('settings/document-updated', (ns) => {
            if (ns === undefined || ns === NAMESPACE) store.reload()
          }),
          ctx.on('connection/reset', () => store.reload()),
        ]
        return () => {
          for (const dispose of disposers) dispose()
        }
      }, 'whale-persona: settings invalidations')

      ctx.slots.inject(SLOT, () =>
        ctx.slots.register(
          { name: SLOT, id: 'whale-persona-toggle', order: -100 },
          createToggle(store, translate),
        ),
      )
    }

    return { inject: ['slots', 'remote', 'remote.settings'], apply }
  },
})
