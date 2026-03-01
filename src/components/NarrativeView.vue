<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChoiceList from './ChoiceList.vue'
import TypewriterText from './TypewriterText.vue'
import { useAudio } from '../composables/useAudio'
import { GAME_CONFIG } from '../config'
import { STORY_NODES } from '../data/nodes'
import { rollDice } from '../utils/dice'
import { isSaveSlotId } from '../utils/storage'
import { resolveAction } from '../engine/actionResolver'
import { trackOutcomeEvent } from '../services/analyticsClient'
import { emitGameEvent } from '../services/events/gameEventBus'
import { usePlayerStore } from '../stores/playerStore'
import type { Choice } from '../types/story'

const emit = defineEmits<{
  combatStart: [encounterId: string]
  requestQuit: []
}>()

const playerStore = usePlayerStore()
const { playSfx } = useAudio()
const lastRollSummary = ref('')
const nodeImageError = ref(false)
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
    nodeImageError.value = false
    const node = currentNode.value
    if (!node || !node.onEnter || processedNodes.value.has(node.id)) {
      return
    }

    node.onEnter.forEach((payload) => resolveAction(payload, playerStore))
    processedNodes.value.add(node.id)
    if (node.type === 'ending') {
      trackOutcomeEvent({
        storyId: 'default',
        type: 'ending_reached',
        ts: Date.now(),
        metadata: { nodeId: node.id },
      })
    }
  },
  { immediate: true },
)

function handleChoice(choice: Choice): void {
  emitGameEvent('choiceSelected', { nodeId: playerStore.metadata.currentNodeId, choiceId: choice.id })
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
  playSfx('dice_roll')
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
    trackOutcomeEvent({
      storyId: 'default',
      type: 'chapter_completed',
      ts: Date.now(),
      metadata: { nodeId: playerStore.metadata.currentNodeId, choiceId: choice.id, result: 'success' },
    })
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
  <section
    class="rounded-lg border border-slate-700 bg-slate-900 p-6"
    role="region"
    aria-label="Story narrative"
  >
    <template v-if="currentNode">
      <Transition name="node-fade" mode="out-in">
        <div :key="playerStore.metadata.currentNodeId" class="node-content">
          <img
            v-if="currentNode.image && !nodeImageError"
            :src="currentNode.image"
            :alt="currentNode.text?.slice(0, 80) ? `${currentNode.id}: ${currentNode.text.slice(0, 80)}…` : currentNode.id"
            loading="lazy"
            class="node-image mb-4 max-h-64 w-full rounded border border-slate-600 object-contain"
            @error="nodeImageError = true"
          />
          <TypewriterText
            :text="currentNode.text"
            :chars-per-second="30"
            :skip-on-click="true"
            :restart-key="playerStore.metadata.currentNodeId"
          />
          <p
            v-if="lastRollSummary"
            class="mt-4 rounded border border-slate-600 bg-slate-800 p-2 text-sm text-slate-200"
            role="status"
            aria-live="polite"
          >
            {{ lastRollSummary }}
          </p>
          <ChoiceList
            v-if="currentNode.choices && currentNode.choices.length > 0"
            :choices="currentNode.choices"
            :state="visibilityState"
            @select="handleChoice"
          />
        </div>
      </Transition>
    </template>
    <div v-else class="rounded border border-red-700 bg-slate-900/90 p-6">
      <p class="text-base font-medium text-red-300">Missing node</p>
      <p class="mt-1 text-sm text-slate-400">Node ID: {{ playerStore.metadata.currentNodeId }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
          aria-label="Return to main menu"
          @click="emit('requestQuit')"
        >
          Return to Main Menu
        </button>
        <button
          type="button"
          class="rounded border border-slate-500 bg-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-600"
          aria-label="Go to start node"
          @click="goToStart"
        >
          Go to Start
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.node-fade-enter-active,
.node-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.node-fade-enter-from,
.node-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .node-fade-enter-active,
  .node-fade-leave-active {
    transition-duration: 0.01ms;
  }
  .node-fade-enter-from,
  .node-fade-leave-to {
    transform: none;
  }
}
</style>
