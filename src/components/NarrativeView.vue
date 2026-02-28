<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChoiceList from './ChoiceList.vue'
import { GAME_CONFIG } from '../config'
import { STORY_NODES } from '../data/nodes'
import { rollDice } from '../utils/dice'
import { isSaveSlotId } from '../utils/storage'
import { resolveAction } from '../engine/actionResolver'
import { usePlayerStore } from '../stores/playerStore'
import type { Choice } from '../types/story'

const emit = defineEmits<{
  combatStart: [encounterId: string]
  requestQuit: []
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
      choice.mechanic.nextNodeId === GAME_CONFIG.player.startingNodeId &&
      currentNode.value?.id !== GAME_CONFIG.player.startingNodeId
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
  const attrMod = check.attribute ? playerStore.attributes[check.attribute] : 0
  const roll = rollDice(check.dice)
  const adjustedTotal = roll.total + attrMod

  if (check.attribute) {
    const sign = attrMod >= 0 ? '+' : ''
    lastRollSummary.value = `Roll ${check.dice}: [${roll.rolls.join(', ')}] ${roll.modifier >= 0 ? '+' : ''}${roll.modifier} ${sign}${attrMod} (${check.attribute.toUpperCase()}) = ${adjustedTotal} vs DC ${check.dc}`
  } else {
    lastRollSummary.value = `Roll ${check.dice}: [${roll.rolls.join(', ')}] ${roll.modifier >= 0 ? '+' : ''}${roll.modifier} = ${adjustedTotal} vs DC ${check.dc}`
  }

  if (adjustedTotal >= check.dc) {
    playerStore.navigateTo(check.onSuccess.nextNodeId)
    return
  }

  if (check.onFailureEncounterId) {
    emit('combatStart', check.onFailureEncounterId)
    return
  }

  playerStore.navigateTo(check.onFailure.nextNodeId)
}

function goToStart(): void {
  processedNodes.value = new Set()
  lastRollSummary.value = ''
  playerStore.navigateTo(GAME_CONFIG.player.startingNodeId)
}
</script>

<template>
  <section class="rounded-lg border border-slate-700 bg-slate-900 p-6">
    <template v-if="currentNode">
      <p class="whitespace-pre-line text-base text-slate-100">{{ currentNode.text }}</p>
      <p v-if="lastRollSummary" class="mt-4 rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-200">
        {{ lastRollSummary }}
      </p>
      <ChoiceList
        v-if="currentNode.choices && currentNode.choices.length > 0"
        :choices="currentNode.choices"
        :state="visibilityState"
        @select="handleChoice"
      />
    </template>
    <div v-else class="rounded border border-red-700 bg-slate-900/90 p-6">
      <p class="text-base font-medium text-red-300">Missing node</p>
      <p class="mt-1 text-sm text-slate-400">Node ID: {{ playerStore.metadata.currentNodeId }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
          @click="emit('requestQuit')"
        >
          Return to Main Menu
        </button>
        <button
          class="rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
          @click="goToStart"
        >
          Go to Start
        </button>
      </div>
    </div>
  </section>
</template>
