<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <div class="mt-6 flex flex-col gap-3">
    <button
      v-for="choice in visibleChoices"
      :key="choice.id"
      class="rounded-md border border-slate-500/70 bg-slate-800 px-4 py-3 text-left text-slate-100 transition hover:border-slate-300 hover:bg-slate-700"
      @click="emit('select', choice)"
    >
      {{ choice.label }}
    </button>
  </div>
</template>
