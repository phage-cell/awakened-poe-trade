export const refreshMinutes = [1, 3, 5, 10, 15, 30, 45, 60]
export function priceInterval (value?: number) {
  return value != null && refreshMinutes.includes(value) ? value : 15
}

export function overviewCache<T> (
  fetchResponse: (league: string, headers: Record<string, string>) => Promise<Response>,
  read: (response: Response) => Promise<T>,
  now = Date.now
) {
  const entries = new Map<string, {
    snapshot?: { rows: T, fetchedAt: number }
    maxAge: number
    etag?: string
    waitUntil: number
    pending?: Promise<void>
  }>()
  return async (league: string, interval?: number) => {
    const entry = entries.get(league) ?? { waitUntil: 0, maxAge: 0 }
    entries.set(league, entry)
    const due = !entry.snapshot || now() - entry.snapshot.fetchedAt >= priceInterval(interval) * 60_000
    if (due && now() >= entry.waitUntil && !entry.pending) {
      entry.pending = (async () => {
        const response = await fetchResponse(league, entry.etag ? { 'If-None-Match': entry.etag } : {})
        if (response.status === 429 || response.status === 503) {
          const retry = response.headers.get('retry-after')
          if (retry) entry.waitUntil = /^\d+$/.test(retry) ? now() + Number(retry) * 1000 : Date.parse(retry) || 0
        }
        if (response.status === 304 && entry.snapshot) {
          entry.snapshot = { ...entry.snapshot, fetchedAt: now() }
        } else {
          if (!response.ok) throw new Error(String(response.status))
          entry.snapshot = { rows: await read(response), fetchedAt: now() }
          entry.etag = undefined
        }
        entry.etag = response.headers.get('etag') ?? entry.etag
        const policy = response.headers.get('cache-control')
        if (policy !== null || response.status !== 304) {
          entry.maxAge = Number(policy?.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1] ?? 0)
        }
        const age = Number(response.headers.get('age')) || 0
        entry.waitUntil = now() + Math.max(0, entry.maxAge - age) * 1000
      })().catch(() => {
        entry.waitUntil = Math.max(entry.waitUntil, now() + 4 * 60_000)
      }).finally(() => { entry.pending = undefined })
    }
    await entry.pending
    return entry.snapshot
  }
}
