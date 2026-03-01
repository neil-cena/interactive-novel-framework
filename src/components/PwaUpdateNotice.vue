<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
  immediate: true,
})

function close(doRefresh: boolean) {
  if (doRefresh) {
    void updateServiceWorker(true)
  }
  needRefresh.value = false
  offlineReady.value = false
}
</script>

<template>
  <div
    v-if="needRefresh || offlineReady"
    class="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-slate-600 bg-slate-800 p-4 shadow-lg sm:left-auto sm:right-4 sm:max-w-sm"
    role="alert"
    aria-live="polite"
  >
    <p v-if="needRefresh" class="text-sm text-slate-200">
      New content available. Reload to update.
    </p>
    <p v-else-if="offlineReady" class="text-sm text-slate-200">
      App ready to work offline.
    </p>
    <div class="mt-3 flex gap-2">
      <button
        v-if="needRefresh"
        type="button"
        class="rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
        @click="close(true)"
      >
        Reload
      </button>
      <button
        type="button"
        class="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600"
        @click="close(false)"
      >
        {{ needRefresh ? 'Later' : 'OK' }}
      </button>
    </div>
  </div>
</template>
