import { parseClipboard, type ParsedItem } from '@/parser'
import type { ItemFilters } from '../filters/interfaces'
import { createTradeRequest, requestResults, requestTradeResultList } from './pathofexile-trade'

function exactStats (item: ParsedItem) {
  if (!item.visceraTradeType || item.unknownModifiers.length) return
  const filters: Array<{ id: string, value?: { min: number, max: number } }> = []
  const labels: string[] = []
  for (const mod of item.newMods) {
    for (const s of mod.stats) {
      const ids = s.stat.trade.ids.implicit
      const template = s.translation.string
      if (ids?.length !== 1 || mod.info.type !== 'implicit' || s.stat.trade.option ||
          (template.match(/#/g) ?? []).length > 1 || filters.some(f => f.id === ids[0])) return
      const n = s.roll?.value
      if (n == null && template.includes('#')) return
      if (n != null && !Number.isFinite(n)) return
      const value = n == null ? undefined : s.stat.trade.inverted ? -n : n
      filters.push({ id: ids[0], value: value == null ? undefined : { min: value, max: value } })
      labels.push(n == null ? template : template.replace('#', String(s.translation.negate ? -n : n)))
    }
  }
  if (!filters.some(f => f.value)) return
  return { filters: filters.sort((a, b) => a.id.localeCompare(b.id)), labels }
}

export function exactLookup (item: ParsedItem, filters: ItemFilters, endpoint: string, realm: string) {
  const stats = exactStats(item)
  if (!stats || realm !== 'pc-ggg') return
  const body = createTradeRequest({ ...filters, searchRelaxed: undefined, searchExact: { baseType: item.visceraTradeType, category: item.category } }, [])
  body.query.stats = [{ type: 'and', filters: stats.filters }]
  const signature = JSON.stringify([item.info.name, stats.filters])
  const league = filters.trade.league
  return { body, league, signature, labels: stats.labels, key: JSON.stringify([endpoint, realm, league, signature, body]) }
}

export async function fetchExactQuote (lookup: NonNullable<ReturnType<typeof exactLookup>>) {
  const search = await requestTradeResultList(lookup.body, lookup.league, true)
  const ids = search.result.slice(0, 10)
  const listings = ids.length ? await requestResults(search.id, ids, { accountName: '', fresh: true }) : []
  return summarizeExact(lookup.signature, search.total, ids, listings)
}

export function summarizeExact (signature: string, total: number, ids: string[], listings: Array<{
  id: string, clipboard?: string, priceAmount: number, priceCurrency: string
}>) {
  // Check the printed tier and complete implicit set before quoting a price.
  for (const id of ids) {
    const listing = listings.find(r => r.id === id)
    if (!listing?.clipboard || !(listing.priceAmount > 0)) continue
    const bytes = Uint8Array.from(atob(listing.clipboard), c => c.charCodeAt(0))
    const parsed = parseClipboard(new TextDecoder().decode(bytes))
    if (parsed.isErr()) continue
    const stats = exactStats(parsed.value)
    if (stats && JSON.stringify([parsed.value.info.name, stats.filters]) === signature) {
      return { price: listing.priceAmount + ' ' + listing.priceCurrency, total, at: Date.now() }
    }
  }
  return { total, at: Date.now(), price: undefined }
}
