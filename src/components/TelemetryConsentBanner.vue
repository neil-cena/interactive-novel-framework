<script setup lang="ts">
import { computed } from 'vue'
import { useTelemetryConsentStore } from '../stores/telemetryConsentStore'

const consentStore = useTelemetryConsentStore()

const showBanner = computed(() => consentStore.hasConsent() === null)

function accept(): void {
  consentStore.setConsent(true)
}

function decline(): void {
  consentStore.setConsent(false)
}
</script>

<template>
  <div
    v-if="showBanner"
    class="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-600 bg-slate-900 p-4 shadow-lg"
    role="dialog"
    aria-label="Analytics consent"
  >
    <p class="text-sm text-slate-200">
      We use anonymous analytics to improve the game (e.g. outcomes and popular choices). No personal data is collected.
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
        @click="accept"
      >
        Accept
      </button>
      <button
        type="button"
        class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
        @click="decline"
      >
        Decline
      </button>
    </div>
  </div>
</template>
