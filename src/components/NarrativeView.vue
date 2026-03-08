<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ChoiceList from './ChoiceList.vue'
import { useAudio } from '../composables/useAudio'
import { GAME_CONFIG } from '../config'
import { STORY_NODES } from '../data/nodes'
import { resolveAction } from '../engine/actionResolver'
import { trackOutcomeEvent } from '../services/analyticsClient'
import { usePlayerStore } from '../stores/playerStore'
import { useNotifications } from '../composables/useNotifications'
import { usePluginRegistry } from '../plugins/registry'
import { applyNarrativeChoice } from '../composables/applyNarrativeChoice'
import type { Choice } from '../types/story'

const emit = defineEmits<{
  startGameMode: [mode: string, data?: Record<string, unknown>]
  requestQuit: []
}>()

const playerStore = usePlayerStore()
const registry = usePluginRegistry()
const { playSfx } = useAudio()
const { notify } = useNotifications()
const nodeImageError = ref(false)
const visibilityState = computed(() => ({
  flags: playerStore.flags,
  inventory: playerStore.inventory,
  vitals: playerStore.vitals,
  worldState: playerStore.worldState,
}))

const currentNode = computed(() => STORY_NODES[playerStore.metadata.currentNodeId])

watch(
  () => playerStore.metadata.currentNodeId,
  () => {
    nodeImageError.value = false
    const node = currentNode.value
    if (!node) {
      return
    }

    // Re-entering first-intro after `meet_elara` is already in history (e.g. save dropped
    // `elara_met` or `onEnter` was skipped) would replay the full basement intro; route to
    // the return beat and heal the flag instead.
    if (node.id === 'meet_elara' && playerStore.visitedNodes.includes('meet_elara')) {
      if (playerStore.flags.elara_met !== true && node.onEnter) {
        node.onEnter.forEach((payload) => resolveAction(payload, playerStore))
      }
      playerStore.navigateTo('elara_basement_return')
      return
    }

    if (!node.onEnter || playerStore.visitedNodes.includes(node.id)) {
      return
    }

    node.onEnter.forEach((payload) => resolveAction(payload, playerStore))
    playerStore.markNodeVisited(node.id)
    trackOutcomeEvent({
      storyId: 'default',
      type: 'node_visit',
      ts: Date.now(),
      metadata: { nodeId: node.id, nodeType: node.type ?? 'standard' },
    })
    if (node.type === 'ending') {
      trackOutcomeEvent({
        storyId: 'default',
        type: 'ending_reached',
        ts: Date.now(),
        metadata: { nodeId: node.id },
      })
    }
  },
  { immediate: true, flush: 'post' },
)

function handleChoice(choice: Choice): void {
  applyNarrativeChoice(choice, {
    playerStore,
    currentNode: currentNode.value,
    registry,
    startGameMode: (mode, data) => emit('startGameMode', mode, data),
    notify: (type, message, detail) => notify(type as never, message, detail),
    playSfx: (id) => playSfx(id as never),
  })
}

function goToStart(): void {
  playerStore.navigateTo(GAME_CONFIG.player.startingNodeId)
}
</script>

<template>
  <section
    class="rounded-lg border border-slate-700 bg-slate-900 p-4 sm:p-6"
    role="region"
    aria-label="Story narrative"
    aria-live="polite"
    aria-atomic="true"
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
          <p class="narrative-text break-words whitespace-pre-line text-base leading-relaxed text-slate-100">
            {{ currentNode.text }}
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
    <div v-else class="rounded border border-red-700 bg-slate-900/90 p-4 sm:p-6">
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
