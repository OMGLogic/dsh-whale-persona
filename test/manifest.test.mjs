// 打包清单测试：bundle patch、client 声明与文件是否自洽。
//
// 这些是「装上去不生效」最常见的失败点：patch 没包在 insert 里、缺 ./client 导出、
// client bundle 的 id 与包名不一致、把 Host 提供的包写进了 dependencies。
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
const patch = readFileSync(new URL('cordis.patch.yml', root), 'utf8')
const client = readFileSync(new URL('lib/client.js', root), 'utf8')

const at = (relative) => new URL(relative, root)

/** 转义进正则的字面量。 */
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

test('manifest declares an installable bundle', () => {
  assert.equal(pkg.name, 'dsh-whale-persona')
  assert.equal(pkg.type, 'module')

  const patchPath = pkg.dsh?.bundle?.patch
  assert.equal(typeof patchPath, 'string')
  assert.equal(existsSync(at(patchPath)), true, `${patchPath} must exist`)

  assert.equal(existsSync(at(pkg.main)), true, 'main must exist')
  assert.equal(pkg.exports['.'], './lib/index.mjs')
})

test('manifest declares the browser half', () => {
  assert.equal(pkg.dsh?.client?.platform, 'web')
  assert.equal(pkg.dsh?.client?.immediately, true)

  const clientRel = pkg.exports['./client']
  assert.equal(typeof clientRel, 'string', 'a dsh.client package must export "./client"')
  assert.equal(existsSync(at(clientRel)), true)
  assert.match(client, new RegExp(`id:\\s*'${escapeRegExp(pkg.name)}'`))
})

test('the bundle patch inserts the row for the profile entry id', () => {
  // 裸的 id/name 行是「按 id 覆盖」，行不存在时会被静默跳过，所以必须在 insert 里。
  assert.match(patch, /^-\s*insert:\s*$/m, 'the row must be wrapped in an `insert:` list')
  assert.match(patch, /^\s*- id: whale-persona$/m)
  // 包名两侧的 YAML 引号可有可无（上游写作 'dsh-whale-persona'）。
  assert.match(patch, new RegExp(`^\\s*name:\\s*['"]?${escapeRegExp(pkg.name)}['"]?\\s*$`, 'm'))
})

test('the client half targets the row id as its settings namespace', () => {
  // settings 的命名空间就是 profile entry id，两者必须一致。
  assert.match(patch, /^\s*- id: whale-persona$/m)
  assert.match(client, /const NAMESPACE = 'whale-persona'/)
})

test('host-provided packages stay out of dependencies and are declared as peers', () => {
  // dsh 安装目录已经提供这些包；写进 dependencies 会拉进第二份，甚至拉进没有
  // `.volatile()` 的上游 schemastery。
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), [])
  assert.equal(typeof pkg.peerDependencies?.['@deepseek-ai/schemastery'], 'string')
})

test('the host half reads the volatile field that settings exposes', () => {
  const host = readFileSync(new URL('lib/index.mjs', root), 'utf8')
  assert.match(host, /from '@deepseek-ai\/schemastery'/)
  assert.match(host, /\.volatile\(\)/, 'settings only exposes volatile fields')
  assert.match(host, /loader\/volatile-update/, 'volatile writes do not re-apply the plugin')
})
