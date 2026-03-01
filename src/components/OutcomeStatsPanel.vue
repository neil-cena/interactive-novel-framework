<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getOutcomeStats } from '../services/analyticsClient'
import type { OutcomeStat } from '../types/cloud'

const stats = ref<OutcomeStat[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function refresh(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    stats.value = await getOutcomeStats('default')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load outcome stats'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refresh()
})
</script>

<template>
  <section class="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Shared Outcomes</h3>
      <button
        type="button"
        class="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
        @click="refresh"
      >
        Refresh
      </button>
    </div>

    <p v-if="loading" class="mt-2 text-sm text-slate-300">Loading stats...</p>
    <p v-else-if="error" class="mt-2 text-sm text-red-300">{{ error }}</p>
    <p v-else-if="stats.length === 0" class="mt-2 text-sm text-slate-400">
      No shared outcomes yet.
    </p>
    <ul v-else class="mt-3 space-y-2 text-sm">
      <li v-for="stat in stats" :key="stat.key" class="rounded border border-slate-700 bg-slate-800/50 p-2">
        <div class="flex items-center justify-between">
          <span class="text-slate-200">{{ stat.key }}</span>
          <span class="text-slate-300">{{ stat.percentage }}%</span>
        </div>
        <p class="text-xs text-slate-400">Count {{ stat.count }} • Sample {{ stat.sampleSize }}</p>
      </li>
    </ul>
  </section>
</template>
