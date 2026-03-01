<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { PlayerState } from '../types/player'
import type { Choice } from '../types/story'
import { isChoiceVisible } from '../engine/visibilityResolver'

const props = defineProps<{
  choices: Choice[]
  state: Pick<PlayerState, 'flags' | 'inventory' | 'vitals'>
}>()

const emit = defineEmits<{
  select: [choice: Choice]
}>()

const visibleChoices = computed(() => {
  return props.choices.filter((choice) => isChoiceVisible(choice.visibilityRequirements, props.state))
})

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.closest('input') || target.closest('textarea')) return
  const key = e.key
  if (key !== '1' && key !== '2' && key !== '3') return
  const index = key === '1' ? 0 : key === '2' ? 1 : 2
  const choice = visibleChoices.value[index]
  if (choice) {
    e.preventDefault()
    emit('select', choice)
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="mt-6 flex flex-col gap-3" role="list" aria-label="Story choices">
    <TransitionGroup name="choice-list" tag="div" class="choice-list flex flex-col gap-3">
      <button
        v-for="(choice, index) in visibleChoices"
        :key="choice.id"
        type="button"
        class="choice-list-item break-words rounded-md border border-slate-500/70 bg-slate-800 px-4 py-3 text-left text-slate-100 transition hover:border-slate-300 hover:bg-slate-700"
        role="listitem"
        :aria-label="`Choice ${index + 1}: ${choice.label}`"
        @click="emit('select', choice)"
      >
        {{ choice.label }}
      </button>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.choice-list-enter-active,
.choice-list-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.choice-list-enter-from,
.choice-list-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
.choice-list-move {
  transition: transform 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .choice-list-enter-active,
  .choice-list-leave-active,
  .choice-list-move {
    transition-duration: 0.01ms;
  }
  .choice-list-enter-from,
  .choice-list-leave-to {
    transform: none;
  }
}
</style>
