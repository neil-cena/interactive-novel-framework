<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import CombatView from '../../components/CombatView.vue'
import { COMBAT_ENCOUNTERS } from '../../data/encounters'
import { ENEMY_DICTIONARY } from '../../data/enemies'
import { GAME_CONFIG } from '../../config'
import { useAudio } from '../../composables/useAudio'
import { useNotificationStore } from '../../stores/notificationStore'
import { usePlayerStore } from '../../stores/playerStore'
import { emitGameEvent } from '../../services/events/gameEventBus'
import { trackOutcomeEvent } from '../../services/analyticsClient'

const props = defineProps<{
  modeData: Record<string, unknown>
}>()

const emit = defineEmits<{
  exitMode: []
  returnToMenu: []
}>()

const playerStore = usePlayerStore()
const { playSfx, playMusic, stopMusic } = useAudio()
const resolutionOutcome = ref<'victory' | 'defeat' | null>(null)
const resolutionTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)
const encounterId = ref((props.modeData.encounterId as string) ?? '')

watch(
  () => props.modeData.encounterId,
  (id) => {
    encounterId.value = (id as string) ?? ''
  },
)

onMounted(() => {
  stopMusic({ fadeMs: 300 })
  playMusic('combat', { loop: true, fadeMs: 200 })
})

function handleResolved(outcome: 'victory' | 'defeat'): void {
  const encounter = COMBAT_ENCOUNTERS[encounterId.value]
  if (!encounter) {
    emit('exitMode')
    return
  }

  playSfx(outcome)
  emitGameEvent('combatResolved', { outcome, encounterId: encounterId.value })
  trackOutcomeEvent({
    storyId: 'default',
    type: 'combat_outcome',
    ts: Date.now(),
    metadata: { encounterId: encounterId.value, outcome },
  })
  trackOutcomeEvent({
    storyId: 'default',
    type: outcome === 'victory' ? 'chapter_completed' : 'run_failed',
    ts: Date.now(),
    metadata: { encounterId: encounterId.value, outcome },
  })

  if (outcome === 'victory') {
    let totalXp = 0
    for (const spawn of encounter.enemies) {
      const template = ENEMY_DICTIONARY[spawn.enemyId]
      if (template) totalXp += template.xpReward * spawn.count
    }
    if (totalXp > 0) {
      const leveled = playerStore.awardXp(totalXp)
      if (leveled) {
        playSfx('level_up')
        const notificationStore = useNotificationStore()
        notificationStore.add(
          'level_up',
          `Level up! You are now level ${playerStore.progression.level}.`,
          `+${GAME_CONFIG.leveling.hpPerLevel} HP, +${GAME_CONFIG.leveling.attributePointsPerLevel} attribute point.`,
          5000,
        )
      }
    }
  }

  const nextNodeId =
    outcome === 'victory'
      ? encounter.resolution.onVictory.nextNodeId
      : encounter.resolution.onDefeat.nextNodeId

  playerStore.navigateTo(nextNodeId)
  resolutionOutcome.value = outcome
  if (resolutionTimeoutId.value != null) clearTimeout(resolutionTimeoutId.value)
  resolutionTimeoutId.value = window.setTimeout(() => {
    resolutionOutcome.value = null
    resolutionTimeoutId.value = null
    emit('exitMode')
  }, 1200)
}

function handleError(): void {
  emit('returnToMenu')
}
</script>

<template>
  <div class="relative">
    <CombatView
      :encounter-id="encounterId"
      @resolved="handleResolved"
      @error="handleError"
    />
    <Transition name="resolution-fade">
      <div
        v-if="resolutionOutcome"
        class="resolution-overlay absolute inset-0 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/95"
      >
        <p
          class="text-2xl font-bold"
          :class="resolutionOutcome === 'victory' ? 'text-emerald-400' : 'text-red-400'"
        >
          {{ resolutionOutcome === 'victory' ? 'Victory!' : 'Defeat' }}
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.resolution-fade-enter-active,
.resolution-fade-leave-active {
  transition: opacity 0.2s ease;
}
.resolution-fade-enter-from,
.resolution-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .resolution-fade-enter-active,
  .resolution-fade-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
