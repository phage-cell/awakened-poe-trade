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
    contents: "export { exactLookup, summarizeExact } from './src/web/price-check/trade/exact-viscera'; export { overviewCache, priceInterval, refreshMinutes } from './src/web/background/overview-cache'; export { visceraEstimate } from './src/web/price-check/trends/viscera-estimate'; export { priceCheckHotkeys } from './src/web/settings/price-check-hotkeys'; export { parseClipboard } from './src/parser/Parser'; export { loadForLang } from './src/assets/data'; export { createFilters } from './src/web/price-check/filters/create-item-filters'; export { createTradeRequest } from './src/web/price-check/trade/pathofexile-trade'",
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
const { exactLookup, summarizeExact, visceraEstimate, overviewCache, priceInterval, refreshMinutes, priceCheckHotkeys, parseClipboard, loadForLang, createFilters, createTradeRequest } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'))
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
  return Response.json([row])
}, r => r.json(), () => time)
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

assert.deepEqual(refreshMinutes, [1, 3, 5, 10, 15, 30, 45, 60])
assert.equal(priceInterval(), 15)
assert.equal(priceInterval(7), 15)
for (const minutes of refreshMinutes) {
  let clock = 0
  let requests = 0
  const cache = overviewCache(async () => {
    requests++
    return Response.json([row])
  }, r => r.json(), () => clock)
  await cache('Covens', minutes)
  clock = minutes * 60_000 - 1
  await cache('Covens', minutes)
  assert.equal(requests, 1)
  clock++
  await cache('Covens', minutes)
  assert.equal(requests, 2)
}

let clock = 0
const validators = []
const responses = [
  Response.json([row], { headers: { ETag: '"snapshot"', 'Cache-Control': 'public, max-age=300' } }),
  new Response(null, { status: 304 }),
  new Response(null, { status: 429, headers: { 'Retry-After': '600' } }),
  Response.json([])
]
const revalidate = overviewCache(async (_league, headers) => {
  validators.push(headers['If-None-Match'])
  return responses.shift()
}, r => r.json(), () => clock)
const original = await revalidate('Covens', 60)
clock = 60_000
await revalidate('Covens', 1)
assert.equal(validators.length, 1)
clock = 300_000
const fresh = await revalidate('Covens', 1)
assert.equal(fresh.rows, original.rows)
assert.equal(fresh.fetchedAt, clock)
clock += 300_000
assert.equal(await revalidate('Covens', 1), fresh)
clock += 599_999
assert.equal(await revalidate('Covens', 1), fresh)
clock++
assert.deepEqual((await revalidate('Covens', 1)).rows, [])
assert.deepEqual(validators, [undefined, '"snapshot"', '"snapshot"', '"snapshot"'])
console.log('Passed all eight refresh intervals, default migration, server cache lifetime, ETag/304 and Retry-After.')

const rawClaw = await readFile(new URL('fixtures/king-crabs-claw.txt', import.meta.url), 'utf8')
const makeClaw = raw => parseClipboard(raw)._unsafeUnwrap()
const exactClaw = makeClaw(rawClaw)
const clawOptions = { league: 'Covens', exact: true, merchantOnly: true, useEn: true }
const exactFilters = createFilters(exactClaw, clawOptions)
const lookup = (item, filters = exactFilters) => exactLookup(item, filters, 'www.pathofexile.com', 'pc-ggg')
const fourFive = lookup(exactClaw)
assert.deepEqual(fourFive.body.query.stats[0].filters, [
  { id: 'implicit.stat_219391121', value: { min: 5, max: 5 } },
  { id: 'implicit.stat_979246511', value: { min: 4, max: 4 } }
])
const rawFiveFive = rawClaw.replace('Gain 4%', 'Gain 5%')
assert.notEqual(lookup(makeClaw(rawFiveFive)).key, fourFive.key)
assert.equal(lookup(makeClaw(rawClaw)).key, fourFive.key)
assert.notEqual(lookup(exactClaw, createFilters(exactClaw, { ...clawOptions, merchantOnly: false })).key, fourFive.key)
assert.notEqual(lookup(exactClaw, createFilters(exactClaw, { ...clawOptions, league: 'Standard' })).key, fourFive.key)
assert.equal(lookup({ ...exactClaw, unknownModifiers: [{ text: 'unknown' }] }), undefined)
const listing = (id, raw, priceAmount) => ({ id, clipboard: Buffer.from(raw).toString('base64'), priceAmount, priceCurrency: 'chaos' })
const listings = [listing('wrong', rawFiveFive, 10), listing('right', rawClaw, 21)]
assert.equal(summarizeExact(fourFive.signature, 2, ['wrong', 'right'], listings).price, '21 chaos')
assert.equal(summarizeExact(fourFive.signature, 1, ['wrong'], listings).price, undefined)
assert.equal(summarizeExact(fourFive.signature, 0, [], []).total, 0)
console.log('Passed exact-roll request, cache keys and verification of listing clipboards.')
