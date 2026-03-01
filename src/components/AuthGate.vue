<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const ready = computed(() => authStore.status !== 'authenticating')
</script>

<template>
  <div v-if="ready">
    <slot />
  </div>
  <div v-else class="flex min-h-screen items-center justify-center text-slate-300">
    Preparing session...
  </div>
</template>
