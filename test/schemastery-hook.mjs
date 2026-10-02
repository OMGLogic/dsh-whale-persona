// 测试专用 Node 解析钩子。
//
// Host 侧 `import '@deepseek-ai/schemastery'` 由 dsh 安装目录提供（profile 插件的解析层
// 把 `@deepseek-ai/*` 指到 dsh 安装目录），Node 里没有这条解析路径，因此这里用
// `DSH_SCHEMASTERY` 指向一份带 `.volatile()` 的 @deepseek-ai/schemastery（app.asar 里的
// 3.18.4）。未设置时钩子什么都不做，相关用例会带原因跳过。
//
//   node --import ./test/schemastery-hook.mjs --test test/*.test.mjs
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const target = process.env.DSH_SCHEMASTERY
if (target !== undefined && target !== '' && existsSync(target)) {
  const url = pathToFileURL(target).href
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === '@deepseek-ai/schemastery') return { url, shortCircuit: true }
      return nextResolve(specifier, context)
    },
  })
}
