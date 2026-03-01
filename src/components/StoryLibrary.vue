<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getProviders } from '../services/providers/providerFactory'
import type { StoryPackageManifest } from '../types/cloud'

const packages = ref<StoryPackageManifest[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function refresh() {
  loading.value = true
  error.value = null
  try {
    const { storyPackageProvider } = getProviders()
    packages.value = await storyPackageProvider.listPackages()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load story packages'
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
      <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Story Library</h3>
      <button
        type="button"
        class="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
        @click="refresh"
      >
        Refresh
      </button>
    </div>
    <p v-if="loading" class="mt-2 text-sm text-slate-300">Loading story packages...</p>
    <p v-else-if="error" class="mt-2 text-sm text-red-300">{{ error }}</p>
    <p v-else-if="packages.length === 0" class="mt-2 text-sm text-slate-400">No community packages available.</p>
    <ul v-else class="mt-2 space-y-2">
      <li v-for="pkg in packages" :key="`${pkg.storyId}:${pkg.version}`" class="rounded border border-slate-700 bg-slate-800/50 p-2">
        <p class="text-sm text-slate-200">{{ pkg.title }} <span class="text-xs text-slate-400">({{ pkg.version }})</span></p>
        <p class="text-xs text-slate-400">By {{ pkg.author }}</p>
      </li>
    </ul>
  </section>
</template>
