<script setup lang="ts">
import { ref } from 'vue'
import { exportPackageFromApi, importPackageOnApi, type StoryPackage } from '../api/authoringClient'

const exportJson = ref('')
const importJson = ref('')
const loading = ref(false)
const message = ref<string | null>(null)
const diagnostics = ref<Array<{ severity?: string; code?: string; message?: string }>>([])

async function doExport() {
  loading.value = true
  message.value = null
  try {
    const pkg = await exportPackageFromApi()
    exportJson.value = JSON.stringify(pkg, null, 2)
    message.value = 'Package exported.'
  } catch (e) {
    message.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function doImport(commit: boolean) {
  loading.value = true
  message.value = null
  diagnostics.value = []
  try {
    const payload = JSON.parse(importJson.value) as StoryPackage
    const res = await importPackageOnApi(payload, commit)
    diagnostics.value = res.diagnostics ?? []
    message.value = commit ? 'Package imported.' : 'Preflight complete.'
  } catch (e) {
    message.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="rounded border border-slate-700 bg-slate-900/80 p-3">
    <h3 class="text-sm font-semibold text-slate-100">Story Package Import / Export</h3>

    <div class="mt-2 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700"
        :disabled="loading"
        @click="doExport"
      >
        Export Package
      </button>
      <button
        type="button"
        class="rounded border border-amber-700 bg-amber-900/30 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-900/50"
        :disabled="loading || !importJson.trim()"
        @click="doImport(false)"
      >
        Validate Import
      </button>
      <button
        type="button"
        class="rounded border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-900/50"
        :disabled="loading || !importJson.trim()"
        @click="doImport(true)"
      >
        Import Package
      </button>
    </div>

    <p v-if="message" class="mt-2 text-xs text-slate-300">{{ message }}</p>

    <label class="mt-3 block text-xs text-slate-400">Export JSON</label>
    <textarea
      v-model="exportJson"
      readonly
      class="mt-1 h-28 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-200"
    />

    <label class="mt-3 block text-xs text-slate-400">Import JSON</label>
    <textarea
      v-model="importJson"
      class="mt-1 h-28 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-200"
      placeholder="Paste package JSON here..."
    />

    <ul v-if="diagnostics.length > 0" class="mt-2 space-y-1 text-xs">
      <li v-for="(d, idx) in diagnostics" :key="idx" :class="d.severity === 'error' ? 'text-red-300' : 'text-amber-300'">
        [{{ d.code ?? 'diag' }}] {{ d.message }}
      </li>
    </ul>
  </section>
</template>
