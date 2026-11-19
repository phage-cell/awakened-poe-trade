import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const publicURL = new URL('public/', root)
globalThis.fetch = async url => new Response(await readFile(new URL(url)))
const bundle = await build({
  absWorkingDir: fileURLToPath(root),
  stdin: {
    contents: "export { parseClipboard } from './src/parser/Parser'; export { loadForLang } from './src/assets/data'",
    resolveDir: fileURLToPath(root)
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
  define: { 'import.meta.env.BASE_URL': JSON.stringify(publicURL.href) }
})
const { parseClipboard, loadForLang } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'))
await loadForLang('en')
const help = 'Take this to the Wickerman in a town or hideout to attach it.'
function clipboard (name, slot) {
  return ['Item Class: Viscera', name, '--------', slot, '--------', '12% increased Empowerment', '--------', help].join('\r\n')
}
for (const [name, slot, category, type] of [
  ["Al-Hezmin's Head", 'Head', 'Head Viscera', "Al-Hezmin's Head"],
  ['Greater Flaming Goat Hoof', 'Lower Limb', 'Lower Limb Viscera', 'Flaming Goat Hoof'],
  ["Lesser Smuggler's Hand", 'Upper Limb', 'Upper Limb Viscera', "Smuggler's Hand"],
  ['Unknown test name', 'Torso', 'Torso Viscera', undefined]
]) {
  const parsed = parseClipboard(clipboard(name, slot))
  assert.equal(parsed.isOk(), true, name)
  assert.equal(parsed.value.category, category)
  assert.equal(parsed.value.visceraTradeType, type)
  const parsedStat = parsed.value.newMods.flatMap(mod => mod.stats).find(s => s.stat.ref === '#% increased Empowerment')
  assert.equal(parsedStat?.roll.value, 12)
  assert.deepEqual(parsedStat.stat.trade.ids.implicit, ['implicit.stat_2377438118'])
}
assert.ok(parseClipboard(clipboard('Unknown test name', 'Unknown slot')).isErr())
console.log('Passed four Viscera slot fixtures and an unknown-item control.')
