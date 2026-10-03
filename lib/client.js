// dsh-whale-persona · client half（浏览器侧）
// 预构建为 __ModuleLoader__ 可加载的 bundle：对话输入栏模型选择器旁的人设开关。
//
// 状态读写走 host 侧配置表单服务 `configForms`（ui-theme / ui-conversation 的偏好行
// 走同一机制）：`getSnapshot().value` 读，`set(field, value)` 写，`subscribe()` 跟随。
// host 侧的 Config.enabled 是 volatile 字段，写入经由 profile 配置回灌进正在运行的
// 插件引用，因此开关状态持久、且与 host 侧人设段实时同步。
window.__ModuleLoader__.load({
  id: "dsh-whale-persona",
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" })
    var React = require("react")

    // 承载开关的 profile entry id，必须与 cordis.patch.yml 中 insert 的 id 完全一致：
    // configForms 以 entry id 为命名空间，改名会让开关读不到配置。
    const NAMESPACE = "whale-persona"
    // host 侧 Config 的布尔字段名。
    const FIELD = "enabled"
    // 对话输入栏里、模型选择器之前的紧凑控件槽位。
    const SLOT = "conversation.input.right"

    // 从共享配置表单快照读取开关；host 还没把配置送过来时，按 schema 默认值 true 显示。
    function readEnabled(form) {
      const snapshot = form.getSnapshot()
      const value = snapshot === undefined ? undefined : snapshot.value
      if (value !== null && typeof value === "object" && typeof value.enabled === "boolean") {
        return value.enabled
      }
      return true
    }

    function apply(ctx) {
      const form = ctx.configForms.get(NAMESPACE)

      const Toggle = () => {
        const [enabled, setEnabled] = React.useState(() => readEnabled(form))

        React.useEffect(() => form.subscribe(() => setEnabled(readEnabled(form))), [])

        const toggle = () => {
          const next = !enabled
          // 先乐观更新，再落盘；host 拒绝写入（例如只读部署）时回读快照还原。
          setEnabled(next)
          const rollback = () => setEnabled(readEnabled(form))
          const write = form.set(FIELD, next)
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
            title: enabled
              ? "鲸鱼娘人设：已开启（点击关闭 → 恢复默认人设）"
              : "鲸鱼娘人设：已关闭（点击开启）",
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
          React.createElement("span", null, enabled ? "鲸鱼人设" : "默认人设"),
        )
      }

      ctx.slots.inject(SLOT, () => ctx.slots.register(
        { name: SLOT, id: "whale-persona-toggle", order: -100 },
        Toggle,
      ))
    }

    const inject = ["slots", "configForms"]
    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
