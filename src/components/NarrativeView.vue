<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChoiceList from './ChoiceList.vue'
import { STORY_NODES } from '../data/nodes'
import { rollDice } from '../utils/dice'
import { isSaveSlotId } from '../utils/storage'
import { resolveAction } from '../engine/actionResolver'
import { usePlayerStore } from '../stores/playerStore'
import type { Choice } from '../types/story'

const emit = defineEmits<{
  combatStart: [encounterId: string]
}>()

const playerStore = usePlayerStore()
const lastRollSummary = ref('')
const processedNodes = ref<Set<string>>(new Set())
const visibilityState = computed(() => ({
  flags: playerStore.flags,
  inventory: playerStore.inventory,
  vitals: playerStore.vitals,
}))

const currentNode = computed(() => STORY_NODES[playerStore.metadata.currentNodeId])

watch(
  () => playerStore.metadata.currentNodeId,
  () => {
    const node = currentNode.value
    if (!node || !node.onEnter || processedNodes.value.has(node.id)) {
      return
    }

    node.onEnter.forEach((payload) => resolveAction(payload, playerStore))
    processedNodes.value.add(node.id)
  },
  { immediate: true },
)

function handleChoice(choice: Choice): void {
  if (choice.mechanic.type === 'navigate') {
    const shouldStartNewRun =
      choice.mechanic.nextNodeId === 'n_start' && currentNode.value?.id !== 'n_start'
    if (shouldStartNewRun) {
      if (playerStore.activeSaveSlot && isSaveSlotId(playerStore.activeSaveSlot)) {
        playerStore.startNewGame(playerStore.activeSaveSlot)
      } else {
        playerStore.resetToDefaults()
      }
      processedNodes.value = new Set()
      lastRollSummary.value = ''
      return
    }

    playerStore.navigateTo(choice.mechanic.nextNodeId)
    return
  }

  if (choice.mechanic.type === 'combat_init') {
    emit('combatStart', choice.mechanic.encounterId)
    return
  }

  const check = choice.mechanic
  const roll = rollDice(check.dice)
  lastRollSummary.value = `Roll ${check.dice}: [${roll.rolls.join(', ')}] ${roll.modifier >= 0 ? '+' : ''}${roll.modifier} = ${roll.total} vs DC ${check.dc}`

  if (roll.total >= check.dc) {
    playerStore.navigateTo(check.onSuccess.nextNodeId)
    return
  }

  if (check.onFailureEncounterId) {
    emit('combatStart', check.onFailureEncounterId)
    return
  }

  playerStore.navigateTo(check.onFailure.nextNodeId)
}
</script>

<template>
  <section class="rounded-lg border border-slate-700 bg-slate-900 p-6">
    <p v-if="currentNode" class="whitespace-pre-line text-base text-slate-100">{{ currentNode.text }}</p>
    <p v-else class="text-base text-red-300">Missing node: {{ playerStore.metadata.currentNodeId }}</p>

    <p v-if="lastRollSummary" class="mt-4 rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-200">
      {{ lastRollSummary }}
    </p>

    <ChoiceList
      v-if="currentNode?.choices && currentNode.choices.length > 0"
      :choices="currentNode.choices"
      :state="visibilityState"
      @select="handleChoice"
    />
  </section>
</template>
