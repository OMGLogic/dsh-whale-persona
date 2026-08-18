// dsh-whale-persona · client half（浏览器侧）
// 预构建为 __ModuleLoader__ 可加载的 bundle：对话输入栏模型选择器旁的人设开关。
// 状态读写走 host settings（settingsScope transport，与 ui-theme 的偏好行同一机制），
// 因此开关状态持久且与 host 侧人设段实时同步。
window.__ModuleLoader__.load({
  id: "dsh-whale-persona",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    var React = require("react")

    const NAMESPACE = "whale-persona"

    function readEnabled(scope) {
      const snap = scope.getSnapshot()
      if (snap && snap.value && typeof snap.value.enabled === "boolean") {
        return snap.value.enabled
      }
      return true
    }

    function apply(ctx) {
      const scope = ctx.settingsScope.bind({ namespace: NAMESPACE })

      ctx.slots.inject("conversation.input.right", () => ctx.slots.register(
        { name: "conversation.input.right", id: "whale-persona-toggle", order: -100 },
        () => {
          const [enabled, setEnabled] = React.useState(() => readEnabled(scope))
          React.useEffect(() => scope.subscribe(() => setEnabled(readEnabled(scope))), [])
          const toggle = () => {
            const next = !enabled
            setEnabled(next)
            scope.set("enabled", next)
          }
          return React.createElement(
            "button",
            {
              type: "button",
              onClick: toggle,
              title: enabled
                ? "鲸鱼娘人设：已开启（点击关闭 → 恢复默认人设）"
                : "鲸鱼娘人设：已关闭（点击开启）",
              "aria-pressed": enabled,
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 8px",
                borderRadius: "999px",
                border: "1px solid " + (enabled ? "rgba(80,160,255,0.55)" : "rgba(128,128,128,0.35)"),
                background: enabled ? "rgba(80,160,255,0.16)" : "transparent",
                color: "inherit",
                fontSize: "12px",
                lineHeight: "20px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              },
            },
            React.createElement("span", null, enabled ? "🐋" : "🐳"),
            React.createElement("span", null, enabled ? "鲸鱼人设" : "默认人设"),
          )
        },
      ))
    }

    const inject = ["slots", "settingsScope"]
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
