<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const error = ref<Error | null>(null)
const errorInfo = ref<string>('')

const emit = defineEmits<{
  returnToMenu: []
}>()

onErrorCaptured((err: Error, instance, info: string) => {
  error.value = err
  errorInfo.value = info
  console.error('[ErrorBoundary] Captured error:', err.message, '\nComponent:', instance, '\nInfo:', info, '\nStack:', err.stack)
  return false
})

function handleReturnToMenu() {
  error.value = null
  errorInfo.value = ''
  emit('returnToMenu')
}
</script>

<template>
  <div v-if="error" class="rounded-lg border border-red-700 bg-slate-900 p-6">
    <h2 class="text-xl font-semibold text-red-300">Something went wrong</h2>
    <p class="mt-2 text-sm text-slate-200">{{ error.message }}</p>
    <p v-if="errorInfo" class="mt-1 text-xs text-slate-400">{{ errorInfo }}</p>
    <button
      class="mt-4 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
      @click="handleReturnToMenu"
    >
      Return to Main Menu
    </button>
  </div>
  <slot v-else></slot>
</template>
