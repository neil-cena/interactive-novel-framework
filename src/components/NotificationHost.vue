<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useNotificationStore } from '../stores/notificationStore'
import type { NotificationKind } from '../stores/notificationStore'

const store = useNotificationStore()
const { items } = storeToRefs(store)

const kindClass: Record<NotificationKind, string> = {
  dice: 'border-slate-600 bg-slate-800/95 text-slate-200',
  skill_check: 'border-amber-700/60 bg-amber-900/30 text-amber-100',
  level_up: 'border-emerald-600/60 bg-emerald-900/30 text-emerald-100',
  currency: 'border-amber-600/60 bg-amber-900/20 text-amber-100',
  info: 'border-slate-600 bg-slate-800/95 text-slate-200',
}
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 sm:left-auto sm:right-4 sm:max-w-sm"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup name="toast">
      <div
        v-for="item in items"
        :key="item.id"
        class="pointer-events-auto rounded-lg border px-3 py-2 shadow-lg"
        :class="kindClass[item.kind]"
      >
        <p class="text-sm font-medium">{{ item.message }}</p>
        <p v-if="item.detail" class="mt-1 text-xs opacity-90">{{ item.detail }}</p>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
