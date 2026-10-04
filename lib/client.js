// dsh-whale-persona · client half（浏览器侧）
// 预构建为 __ModuleLoader__ 可加载的 bundle，注册两处 UI：
//   1. conversation.input.right —— 对话输入栏的紧致人设开关（默认就是这一颗胶囊，零多余按钮）；
//   2. settings.section        —— 设置里的一页「鲸鱼人设」，用来编辑人设正文。
//
// 状态读写走 host 侧配置表单服务 `configForms`（ui-theme / ui-conversation 的偏好行
// 走同一机制）：`getSnapshot().value` 读，`set/unset(field)` 写，`subscribe()` 跟随。
// host 侧的 Config 字段是 volatile 的，写入经由 profile 配置回灌进正在运行的插件引用，
// 因此开关与人设文本都持久、且实时生效。
//
// 文案走 locale 服务：注册 `whale-persona` 命名空间字典，插槽注册时声明 `locale`，
// 渲染器会把 `t` 作为 prop 传进来，并跟随语言切换重渲染。
window.__ModuleLoader__.load({
  id: "dsh-whale-persona",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    var React = require("react")

    // 承载配置的 profile entry id，必须与 cordis.patch.yml 中 insert 的 id 完全一致：
    // configForms 以 entry id 为命名空间，改名会让这两处 UI 读不到配置。
    const NAMESPACE = "whale-persona"
    // host 侧 Config 的字段名。
    const ENABLED_FIELD = "enabled"
    const PERSONA_FIELD = "persona"
    // 对话输入栏里、模型选择器之前的紧凑控件槽位。
    const TOGGLE_SLOT = "conversation.input.right"
    // 设置里的一整页。
    const SECTION_SLOT = "settings.section"
    // 本插件自己的语言字典命名空间。
    const LOCALE_NS = "whale-persona"

    /** 简体中文字典（键集真源）。 */
    const zh = {
      "toggle.on": "鲸鱼人设",
      "toggle.off": "默认人设",
      "toggle.titleOn": "鲸鱼娘人设：已开启（点击关闭 → 恢复默认人设）",
      "toggle.titleOff": "鲸鱼娘人设：已关闭（点击开启）",
      "section.nav": "鲸鱼人设",
      "section.title": "人设正文",
      "section.description": "这段文字会原样注入每个会话的系统提示词。清空或点「恢复默认」即回到插件内置的默认人设。",
      "section.placeholder": "在这里写下你想要的人设……",
      "section.count": "{count} 个字符",
      "section.edited": "有未保存的修改",
      "section.save": "保存",
      "section.saving": "保存中…",
      "section.reset": "恢复默认",
      "section.saved": "已保存",
      "section.failed": "保存失败，请重试",
      "section.readonly": "当前部署的配置是只读的，无法保存。",
      "section.loading": "读取中…",
    }

    /** English dictionary; must cover the same key set as `zh`. */
    const en = {
      "toggle.on": "Whale persona",
      "toggle.off": "Default persona",
      "toggle.titleOn": "Whale-girl persona: on (click to turn off and restore the default persona)",
      "toggle.titleOff": "Whale-girl persona: off (click to turn on)",
      "section.nav": "Whale persona",
      "section.title": "Persona text",
      "section.description": "This text is injected verbatim into every session's system prompt. Clearing it, or pressing Reset, restores the plugin's built-in default persona.",
      "section.placeholder": "Write the persona you want here…",
      "section.count": "{count} characters",
      "section.edited": "Unsaved changes",
      "section.save": "Save",
      "section.saving": "Saving…",
      "section.reset": "Reset",
      "section.saved": "Saved",
      "section.failed": "Save failed, please retry",
      "section.readonly": "This deployment's configuration is read-only; changes cannot be saved.",
      "section.loading": "Loading…",
    }

    /** 读取共享配置表单快照里的值对象；host 还没送过来时返回 undefined。 */
    function readValue(form) {
      const snapshot = form.getSnapshot()
      const value = snapshot === undefined ? undefined : snapshot.value
      return value !== null && typeof value === "object" ? value : undefined
    }

    /** 读开关；host 未就绪时按 schema 默认值 true 显示。 */
    function readEnabled(form) {
      const value = readValue(form)
      return value !== undefined && typeof value.enabled === "boolean" ? value.enabled : true
    }

    /** 读人设正文；host 未就绪时给空串。 */
    function readPersona(form) {
      const value = readValue(form)
      return value !== undefined && typeof value.persona === "string" ? value.persona : ""
    }

    /** 一个按主题变量着色的朴素按钮。 */
    function buttonStyle(primary, disabled) {
      return {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "5px 14px",
        borderRadius: "var(--dsw-radius-sm, 8px)",
        border: primary ? "1px solid transparent" : "1px solid var(--dsw-alias-border-l4, rgba(128,128,128,0.35))",
        background: primary ? "var(--dsw-static-deepseek-500, #4176e6)" : "transparent",
        color: primary ? "#fff" : "inherit",
        font: "inherit",
        fontSize: "13px",
        lineHeight: "20px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }
    }

    function apply(ctx) {
      const form = ctx.configForms.get(NAMESPACE)

      // 字典注册随本插件 fiber 释放；t 由插槽渲染器注入，这里只登记命名空间。
      ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), "whale-persona: dictionaries")

      // ── 1. 输入栏开关 ────────────────────────────────────────────────
      const Toggle = (props) => {
        const { t } = props
        const [enabled, setEnabled] = React.useState(() => readEnabled(form))

        React.useEffect(() => form.subscribe(() => setEnabled(readEnabled(form))), [])

        const toggle = () => {
          const next = !enabled
          // 先乐观更新，再落盘；host 拒绝写入（例如只读部署）时回读快照还原。
          setEnabled(next)
          const rollback = () => setEnabled(readEnabled(form))
          const write = form.set(ENABLED_FIELD, next)
          if (write !== undefined && typeof write.then === "function") {
            write.then((accepted) => {
              if (accepted === false) rollback()
            }, rollback)
          }
        }

        return React.createElement(
          "button",
          {
            type: "button",
            role: "switch",
            "aria-checked": enabled,
            onClick: toggle,
            title: enabled ? t("toggle.titleOn") : t("toggle.titleOff"),
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "999px",
              border: "1px solid " + (enabled
                ? "var(--dsw-static-neutral-bluish-400, rgba(80,160,255,0.55))"
                : "var(--dsw-alias-border-l4, rgba(128,128,128,0.35))"),
              background: enabled
                ? "var(--dsw-alias-bg-module-platform, rgba(80,160,255,0.16))"
                : "transparent",
              color: "inherit",
              font: "inherit",
              fontSize: "12px",
              lineHeight: "20px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            },
          },
          React.createElement("span", null, enabled ? "🐋" : "🐳"),
          React.createElement("span", null, enabled ? t("toggle.on") : t("toggle.off")),
        )
      }

      ctx.slots.inject(TOGGLE_SLOT, () => ctx.slots.register(
        { name: TOGGLE_SLOT, id: "whale-persona-toggle", order: -100, locale: LOCALE_NS },
        Toggle,
      ))

      // ── 2. 设置页：编辑人设正文 ──────────────────────────────────────
      const PersonaSection = (props) => {
        const { t } = props
        const [snapshot, setSnapshot] = React.useState(() => form.getSnapshot())
        // draft === null 表示"跟随 host"，即文本框显示 host 当前生效的文本。
        const [draft, setDraft] = React.useState(null)
        const [busy, setBusy] = React.useState(false)
        const [notice, setNotice] = React.useState(null)

        React.useEffect(() => form.subscribe(() => setSnapshot(form.getSnapshot())), [])

        React.useEffect(() => {
          if (notice === null) return undefined
          const timer = setTimeout(() => setNotice(null), 2000)
          return () => clearTimeout(timer)
        }, [notice])

        const status = snapshot === undefined ? "loading" : snapshot.status
        const writable = snapshot !== undefined && snapshot.writable === true
        const stored = readPersona(form)
        const text = draft !== null ? draft : stored
        const dirty = draft !== null && draft !== stored
        const blocked = busy || status === "loading" || !writable

        const settle = (result) => {
          Promise.resolve(result).then((accepted) => {
            setBusy(false)
            if (accepted === false) {
              setNotice(t("section.failed"))
              return
            }
            // 交回 host 显示：保存后文本框总是显示真正生效的文本。
            setDraft(null)
            setNotice(t("section.saved"))
          }, () => {
            setBusy(false)
            setNotice(t("section.failed"))
          })
        }

        const save = () => {
          if (draft === null || blocked) return
          setBusy(true)
          setNotice(null)
          // 清空即恢复默认：写 unset 让 schema 默认值生效，profile 补丁里也不留空串。
          settle(draft.trim().length === 0 ? form.unset(PERSONA_FIELD) : form.set(PERSONA_FIELD, draft))
        }

        const reset = () => {
          if (blocked) return
          setBusy(true)
          setNotice(null)
          settle(form.unset(PERSONA_FIELD))
        }

        return React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "8px" } },
          React.createElement("div", {
            style: {
              color: "var(--dsw-alias-label-primary, inherit)",
              fontSize: "14px",
              lineHeight: "22px",
            },
          }, t("section.title")),
          React.createElement("div", {
            style: {
              color: "var(--dsw-alias-label-tertiary, rgba(128,128,128,1))",
              fontSize: "12px",
              lineHeight: "18px",
            },
          }, status === "loading" ? t("section.loading") : t("section.description")),
          React.createElement("textarea", {
            value: text,
            onChange: (event) => setDraft(event.target.value),
            placeholder: t("section.placeholder"),
            spellCheck: false,
            disabled: status === "loading",
            rows: 14,
            style: {
              width: "100%",
              boxSizing: "border-box",
              minHeight: "240px",
              resize: "vertical",
              padding: "10px 12px",
              borderRadius: "var(--dsw-radius-md, 12px)",
              border: "1px solid " + (dirty
                ? "var(--dsw-static-neutral-bluish-400, rgba(80,160,255,0.55))"
                : "var(--dsw-alias-border-l4, rgba(128,128,128,0.35))"),
              background: "var(--dsw-alias-bg-layer-2, transparent)",
              color: "inherit",
              font: "inherit",
              fontSize: "13px",
              lineHeight: "20px",
            },
          }),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" } },
            React.createElement("span", {
              style: {
                color: dirty
                  ? "var(--dsw-alias-label-secondary, rgba(128,128,128,1))"
                  : "var(--dsw-alias-label-tertiary, rgba(128,128,128,1))",
                fontSize: "12px",
                lineHeight: "18px",
              },
            }, dirty ? t("section.edited") : t("section.count", { count: Array.from(text).length })),
            React.createElement("span", { style: { flex: 1 } }),
            React.createElement("span", {
              style: {
                color: "var(--dsw-alias-label-tertiary, rgba(128,128,128,1))",
                fontSize: "12px",
                lineHeight: "18px",
              },
            }, !writable ? t("section.readonly") : (notice === null ? "" : notice)),
            React.createElement("button", {
              type: "button",
              onClick: reset,
              disabled: blocked,
              style: buttonStyle(false, blocked),
            }, t("section.reset")),
            React.createElement("button", {
              type: "button",
              onClick: save,
              disabled: blocked || !dirty,
              style: buttonStyle(true, blocked || !dirty),
            }, busy ? t("section.saving") : t("section.save")),
          ),
        )
      }

      ctx.slots.inject(SECTION_SLOT, () => ctx.slots.register({
        name: SECTION_SLOT,
        id: "whale-persona",
        order: 100,
        label: () => ctx.locale.bind(LOCALE_NS)("section.nav"),
        locale: LOCALE_NS,
      }, PersonaSection))
    }

    const inject = ["slots", "configForms", "locale"]
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
