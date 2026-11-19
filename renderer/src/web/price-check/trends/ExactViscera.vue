<template>
  <div v-if="lookup" class="pb-2" aria-live="polite">
    <strong>Exact rolls<span v-if="entry?.quote?.price"> · {{ entry.quote.price }}</span></strong>
    <div v-for="label in lookup.labels" :key="label" class="text-sm">{{ label }}</div>
    <div v-if="entry?.quote" class="text-sm text-gray-400">
      <span v-if="entry.quote.total === 0">No exact listings found</span>
      <span v-else-if="!entry.quote.price">No verified exact price in the first {{ Math.min(10, entry.quote.total) }} results</span>
      <span v-else>Lowest verified asking price</span>
      · {{ entry.quote.total }} search matches · checked {{ age }} min ago
    </div>
    <button v-if="!entry?.quote || expired" class="btn mt-1" :disabled="entry?.loading" @click="check">
      {{ entry?.loading ? 'Checking…' : entry?.quote ? 'Refresh exact rolls' : 'Check exact rolls' }}
    </button>
    <div v-if="entry?.error" class="text-sm text-orange-400">{{ entry.error }}</div>
  </div>
</template>
<script lang="ts">
import { shallowReactive } from 'vue'
import { fetchExactQuote } from '../trade/exact-viscera'
type Quote = Awaited<ReturnType<typeof fetchExactQuote>>
const cache = shallowReactive(new Map<string, { quote?: Quote, loading?: boolean, error?: string }>())
</script>
<script setup lang="ts">
import { computed } from 'vue'
import { useNow } from '@vueuse/core'
import type { ParsedItem } from '@/parser'
import type { ItemFilters } from '../filters/interfaces'
import { AppConfig, poeWebApi } from '@/web/Config'
import { priceInterval } from '@/web/background/overview-cache'
import { exactLookup } from '../trade/exact-viscera'

const props = defineProps<{ item: ParsedItem, filters: ItemFilters, interval?: number }>()
const lookup = computed(() => exactLookup(props.item, props.filters, poeWebApi(), AppConfig().realm))
const entry = computed(() => lookup.value && cache.get(lookup.value.key))
const clock = useNow({ interval: 15_000 })
const age = computed(() => Math.max(0, Math.floor((clock.value.getTime() - (entry.value?.quote?.at ?? 0)) / 60_000)))
const expired = computed(() => age.value >= priceInterval(props.interval))

async function check () {
  const query = lookup.value
  if (!query || cache.get(query.key)?.loading) return
  const quote = cache.get(query.key)?.quote
  if (quote && Date.now() - quote.at < priceInterval(props.interval) * 60_000) return
  cache.set(query.key, { loading: true, quote })
  try {
    cache.set(query.key, { quote: await fetchExactQuote(query) })
  } catch (e) {
    cache.set(query.key, { quote, error: e instanceof Error ? e.message : 'Exact lookup failed' })
  }
  if (cache.size > 300) {
    for (const [key, state] of cache) {
      if (key !== query.key && !state.loading) { cache.delete(key); break }
    }
  }
}
</script>
