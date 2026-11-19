import type { ParsedItem } from '@/parser'

interface OverviewRow {
  name: string
  chaosValue: number
  tradeInfo?: Array<{ mod: string }>
}

export function visceraEstimate (item: ParsedItem, rows: OverviewRow[]) {
  if (item.info.refName !== 'Viscera' || item.unknownModifiers.length) return
  const stats = item.newMods.flatMap(mod => mod.stats)
  if (!stats.length) return
  const ids = stats.map(s => s.stat.trade.ids.implicit)
  if (ids.some(group => group?.length !== 1)) return
  const expected = ids.map(group => group![0]).sort()
  const matches = rows.filter(row => {
    if (row.name !== item.info.name || !Number.isFinite(row.chaosValue) || row.chaosValue <= 0) return false
    const mods = row.tradeInfo?.map(entry => entry.mod).sort()
    return mods?.length === expected.length && mods.every((id, i) => id === expected[i])
  })
  return matches.length === 1 ? matches[0].chaosValue : undefined
}

export function overviewCache (fetchRows: (league: string) => Promise<OverviewRow[]>, now = Date.now) {
  const entries = new Map<string, {
    snapshot?: { rows: OverviewRow[], fetchedAt: number }
    pending?: Promise<void>
    retryAt: number
  }>()
  return async (league: string) => {
    const entry = entries.get(league) ?? { retryAt: 0 }
    entries.set(league, entry)
    if (now() >= entry.retryAt && !entry.pending) {
      entry.pending = fetchRows(league).then(rows => {
        entry.snapshot = { rows, fetchedAt: now() }
        entry.retryAt = now() + 30 * 60_000
      }).catch(() => {
        entry.retryAt = now() + 4 * 60_000
      }).finally(() => { entry.pending = undefined })
    }
    await entry.pending
    return entry.snapshot
  }
}
