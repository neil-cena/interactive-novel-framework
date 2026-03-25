<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getOutcomeStats } from '../services/analyticsClient'
import { useTelemetryConsentStore } from '../stores/telemetryConsentStore'
import type { OutcomeStat } from '../types/cloud'

const consentStore = useTelemetryConsentStore()
const stats = ref<OutcomeStat[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function refresh(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    stats.value = await getOutcomeStats('default')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load telemetry'
  } finally {
    loading.value = false
  }
}

function withdrawConsent(): void {
  consentStore.resetConsent()
}

onMounted(() => {
  void refresh()
})
</script>

<template>
  <section class="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Telemetry (Author)</h3>
      <button
        type="button"
        class="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
        @click="refresh"
      >
        Refresh
      </button>
    </div>

    <p class="mt-2 text-xs text-slate-400">
      Aggregated outcome and event counts. Consent:
      <span :class="consentStore.consent === 'accepted' ? 'text-emerald-400' : consentStore.consent === 'declined' ? 'text-amber-400' : 'text-slate-400'">
        {{ consentStore.consent === 'accepted' ? 'Accepted' : consentStore.consent === 'declined' ? 'Declined' : 'Not set' }}
      </span>
      <a
        href="/privacy/telemetry-policy.html"
        target="_blank"
        rel="noopener noreferrer"
        class="ml-2 text-slate-300 underline hover:text-slate-100"
      >
        Privacy policy
      </a>
    </p>

    <button
      v-if="consentStore.consent !== null"
      type="button"
      class="mt-2 rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
      @click="withdrawConsent"
    >
      Withdraw consent (reset choice)
    </button>

    <p v-if="loading" class="mt-3 text-sm text-slate-300">Loading...</p>
    <p v-else-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
    <p v-else-if="stats.length === 0" class="mt-3 text-sm text-slate-400">
      No telemetry data yet.
    </p>
    <template v-else>
      <p class="mt-3 text-xs text-slate-400">
        Based on {{ stats[0]?.sampleSize ?? 0 }} session(s). Percentages are share of sessions.
      </p>
      <ul class="mt-3 space-y-2 text-sm">
        <li v-for="stat in stats" :key="stat.key" class="rounded border border-slate-700 bg-slate-800/50 p-2">
          <div class="flex items-center justify-between">
            <span class="text-slate-200">{{ stat.key }}</span>
            <span class="text-slate-300">{{ stat.percentage }}%</span>
          </div>
          <p class="text-xs text-slate-400">Count {{ stat.count }} • Sample {{ stat.sampleSize }}</p>
        </li>
      </ul>
    </template>
  </section>
</template>
