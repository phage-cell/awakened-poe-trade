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
    contents: "export { visceraEstimate, overviewCache } from './src/web/price-check/trends/viscera-estimate'; export { priceCheckHotkeys } from './src/web/settings/price-check-hotkeys'; export { parseClipboard } from './src/parser/Parser'; export { loadForLang } from './src/assets/data'; export { createFilters } from './src/web/price-check/filters/create-item-filters'; export { createTradeRequest } from './src/web/price-check/trade/pathofexile-trade'",
    resolveDir: fileURLToPath(root)
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
  banner: { js: `import { createRequire } from 'node:module'; const require = createRequire(${JSON.stringify(import.meta.url)});` },
  plugins: [{
    name: 'offline-host',
    setup (build) {
      build.onResolve({ filter: /^(@\/web\/Config|@\/web\/background\/IPC)$/ }, args => ({ path: args.path, namespace: 'offline-host' }))
      build.onLoad({ filter: /.*/, namespace: 'offline-host' }, () => ({
        contents: 'export const Host = {}; export const AppConfig = () => ({}); export const poeWebApi = () => { throw Error("Offline test") }'
      }))
    }
  }],
  define: { 'import.meta.env.BASE_URL': JSON.stringify(publicURL.href) }
})
const { visceraEstimate, overviewCache, priceCheckHotkeys, parseClipboard, loadForLang, createFilters, createTradeRequest } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'))
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
  const filters = createFilters(parsed.value, { league: 'Standard', merchantOnly: false, currency: null, collapseListings: 'app', exact: true, useEn: true })
  const { query } = createTradeRequest(filters, [])
  assert.equal(query.type, type)
  const slots = { Head: 'head', Torso: 'body', 'Upper Limb': 'arm', 'Lower Limb': 'leg' }
  assert.equal(query.filters.type_filters.filters.category.option, 'viscera.' + slots[slot])
  if (type) {
    filters.searchRelaxed.disabled = false
    const relaxed = createTradeRequest(filters, []).query
    assert.equal(relaxed.type, undefined)
    assert.equal(relaxed.filters.type_filters.filters.category.option, 'viscera.' + slots[slot])
  }
  const parsedStat = parsed.value.newMods.flatMap(mod => mod.stats).find(s => s.stat.ref === '#% increased Empowerment')
  assert.equal(parsedStat?.roll.value, 12)
  assert.deepEqual(parsedStat.stat.trade.ids.implicit, ['implicit.stat_2377438118'])
}
assert.ok(parseClipboard(clipboard('Unknown test name', 'Unknown slot')).isErr())
console.log('Passed four Viscera slot fixtures and an unknown-item control.')

const claw = parseClipboard('Item Class: Claws\nRarity: Unique\nThe Covetous Dark\nEye Gouger')
assert.ok(claw.isOk())
assert.equal(claw.value.category, 'Claw')
const clawFilters = createFilters(claw.value, { league: 'Standard', exact: true, useEn: true })
const { query } = createTradeRequest(clawFilters, [])
assert.equal(query.name, 'The Covetous Dark')
assert.equal(query.type, 'Eye Gouger')
console.log('Passed unique claw lookup and exact trade request.')
const hoof = parseClipboard(await readFile(new URL('fixtures/lesser-flaming-goat-hoof.txt', import.meta.url), 'utf8'))
assert.ok(hoof.isOk())
assert.equal(hoof.value.itemLevel, 47)
assert.equal(hoof.value.visceraTradeType, 'Flaming Goat Hoof')
const fire = hoof.value.newMods.flatMap(mod => mod.stats).find(s => s.stat.trade.ids.implicit?.includes('implicit.stat_3962278098'))
assert.equal(fire?.roll.value, 12)
console.log('Passed public trade clipboard with a verified implicit and roll.')

for (const [slot, type, id] of [
  ['head', "Al-Hezmin's Head", 'implicit.stat_3931566161'],
  ['arm', "Smuggler's Hand", 'implicit.stat_253956903'],
  ['body', 'Golemic Stone', 'implicit.stat_4262448838']
]) {
  const raw = await readFile(new URL('fixtures/' + slot + '.txt', import.meta.url), 'utf8')
  const parsed = parseClipboard(raw)
  assert.ok(parsed.isOk())
  const item = parsed.value
  const { query } = createTradeRequest(createFilters(item, { league: 'Covens', exact: true, useEn: true }), [])
  assert.equal(query.type, type)
  assert.equal(query.filters.type_filters.filters.category.option, 'viscera.' + slot)
  assert.ok(item.newMods.some(mod => mod.stats.some(s => s.stat.trade.ids.implicit?.includes(id))))
}
console.log('Passed additional live head, arm and torso clipboard fixtures.')

const row = { name: 'Lesser Flaming Goat Hoof', chaosValue: 2, tradeInfo: [{ mod: 'implicit.stat_3962278098' }] }
assert.equal(visceraEstimate(hoof.value, [row, { ...row, name: 'Flaming Goat Hoof', chaosValue: 20 }]), 2)
assert.equal(visceraEstimate(hoof.value, [{ ...row, name: 'Flaming Goat Hoof' }]), undefined)
assert.equal(visceraEstimate(hoof.value, [{ ...row, tradeInfo: [] }]), undefined)
assert.equal(visceraEstimate(hoof.value, [row, row]), undefined)
let time = 0
let calls = 0
let offline = false
const cached = overviewCache(async () => {
  calls++
  if (offline) throw Error('offline')
  return [row]
}, () => time)
const [first, same] = await Promise.all([cached('Covens'), cached('Covens')])
assert.equal(calls, 1)
assert.equal(first, same)
await cached('Standard')
assert.equal(calls, 2)
time += 31 * 60_000
offline = true
assert.equal(await cached('Covens'), first)
assert.equal(await cached('Covens'), first)
assert.equal(calls, 3)
offline = false
time += 5 * 60_000
assert.equal((await cached('Covens')).fetchedAt, time)
const config = { hotkeyHold: 'Ctrl', hotkey: 'D', hotkeyLocked: 'Ctrl + Alt + D' }
const keys = priceCheckHotkeys(config).items
keys[0].config.nonModKey.value = 'F'
keys[1].config.value = 'F7'
assert.equal(config.hotkey, 'F')
assert.equal(config.hotkeyLocked, 'F7')
console.log('Passed tier and variant matching, cache reuse, league isolation, retry and hotkey settings.')
