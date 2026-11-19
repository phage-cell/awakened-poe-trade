<template>
  <div class="pb-3" aria-live="polite">
    <template v-if="price != null && snapshot">
      <strong>{{ price.toLocaleString() }} chaos</strong>
      <div class="text-sm text-gray-400">poe.ninja variant estimate · checked {{ age }} min ago</div>
    </template>
    <span v-else class="text-sm text-gray-400">{{ loading ? 'Loading Viscera estimates…' : 'No matching cached estimate' }}</span>
  </div>
</template>
<script lang="ts">
import { Host } from '@/web/background/IPC'
import { overviewCache } from '@/web/background/overview-cache'

const overview = overviewCache((league, headers) => Host.proxy('poe.ninja/poe1/api/economy/stash/current/item/overview?' + new URLSearchParams({ league, type: 'Viscera' }), { headers }), async response => {
  const { lines } = await response.json()
  if (!Array.isArray(lines)) throw new Error('Missing Viscera overview')
  return lines
})
</script>
<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useNow } from '@vueuse/core'
import type { ParsedItem } from '@/parser'
import { visceraEstimate } from './viscera-estimate'

const props = defineProps<{ item: ParsedItem, league?: string, interval?: number }>()
const clock = useNow({ interval: 60_000 })
const minute = computed(() => Math.floor(clock.value.getTime() / 60_000))
const snapshot = shallowRef<Awaited<ReturnType<typeof overview>>>()
const loading = shallowRef(false)
watch([() => props.league, () => props.interval, minute], async ([league], old, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  if (league !== old?.[0]) snapshot.value = undefined
  loading.value = Boolean(league)
  const result = league ? await overview(league, props.interval) : undefined
  if (current) {
    snapshot.value = result
    loading.value = false
  }
}, { immediate: true })
const price = computed(() => snapshot.value && visceraEstimate(props.item, snapshot.value.rows))
const age = computed(() => Math.max(0, Math.floor((clock.value.getTime() - (snapshot.value?.fetchedAt ?? 0)) / 60_000)))
</script>
