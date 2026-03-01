<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import AudioControls from './components/AudioControls.vue'
import CombatView from './components/CombatView.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import InventoryPanel from './components/InventoryPanel.vue'
import MainMenu from './components/MainMenu.vue'
import NarrativeView from './components/NarrativeView.vue'
import PlaytestPanel from './components/PlaytestPanel.vue'
import PlayerHud from './components/PlayerHud.vue'
import { useAudio } from './composables/useAudio'
import { useAccessibilityStore } from './stores/accessibilityStore'
import { COMBAT_ENCOUNTERS } from './data/encounters'
import { ENEMY_DICTIONARY } from './data/enemies'
import { usePlayerStore } from './stores/playerStore'
import type { PlayerState } from './types/player'
import { GAME_CONFIG } from './config'
import { isSaveSlotId, saveGame, saveGameNow, type SaveSlotId } from './utils/storage'

const playerStore = usePlayerStore()
const accessibilityStore = useAccessibilityStore()
const { unlock: unlockAudio, playMusic, stopMusic, playSfx } = useAudio()
const currentView = ref<'menu' | 'game'>('menu')
const mainContentRef = ref<HTMLElement | null>(null)
const inventoryButtonRef = ref<HTMLElement | null>(null)
const gameMode = ref<'narrative' | 'combat'>('narrative')
const activeEncounterId = ref<string>('combat_1')
const showInventory = ref(false)
const levelUpMessage = ref<string | null>(null)

function handleStartGame(slotId: SaveSlotId, savedState: PlayerState | null): void {
  if (savedState) {
    playerStore.loadGame(slotId, savedState)
  } else {
    playerStore.startNewGame(slotId)
  }

  gameMode.value = 'narrative'
  currentView.value = 'game'
}

function handleCombatStart(encounterId: string): void {
  activeEncounterId.value = encounterId
  gameMode.value = 'combat'
}

const resolutionOutcome = ref<'victory' | 'defeat' | null>(null)
const resolutionTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

function handleCombatResolved(outcome: 'victory' | 'defeat'): void {
  const encounter = COMBAT_ENCOUNTERS[activeEncounterId.value]
  if (!encounter) {
    gameMode.value = 'narrative'
    return
  }
  playSfx(outcome)

  if (outcome === 'victory') {
    let totalXp = 0
    for (const spawn of encounter.enemies) {
      const template = ENEMY_DICTIONARY[spawn.enemyId]
      if (template) totalXp += template.xpReward * spawn.count
    }
    if (totalXp > 0) {
      const leveled = playerStore.awardXp(totalXp)
      if (leveled) {
        levelUpMessage.value = `Level Up! You are now level ${playerStore.progression.level}. +${GAME_CONFIG.leveling.hpPerLevel} HP, +${GAME_CONFIG.leveling.attributePointsPerLevel} Attribute Point.`
        window.setTimeout(() => { levelUpMessage.value = null }, 5000)
      }
    }
  }

  const nextNodeId =
    outcome === 'victory' ? encounter.resolution.onVictory.nextNodeId : encounter.resolution.onDefeat.nextNodeId

  playerStore.navigateTo(nextNodeId)
  resolutionOutcome.value = outcome
  if (resolutionTimeoutId.value != null) clearTimeout(resolutionTimeoutId.value)
  resolutionTimeoutId.value = window.setTimeout(() => {
    resolutionOutcome.value = null
    gameMode.value = 'narrative'
    resolutionTimeoutId.value = null
  }, 1200)
}

function handleSaveAndQuit(): void {
  const activeSlot = playerStore.activeSaveSlot
  if (activeSlot && isSaveSlotId(activeSlot)) {
    saveGameNow(activeSlot, playerStore.$state)
  }

  playerStore.activeSaveSlot = null
  currentView.value = 'menu'
  gameMode.value = 'narrative'
}

function focusFirstFocusableInGame(): void {
  nextTick(() => {
    const main = mainContentRef.value
    if (!main) return
    const focusable = main.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    focusable?.focus({ preventScroll: true })
  })
}

function handleReturnToMenu(): void {
  handleSaveAndQuit()
}

watch(
  [currentView, gameMode],
  () => {
    if (currentView.value === 'menu') {
      stopMusic({ fadeMs: 300 })
      playMusic('menu', { loop: true, fadeMs: 200 })
    } else if (gameMode.value === 'narrative') {
      stopMusic({ fadeMs: 300 })
      playMusic('narrative', { loop: true, fadeMs: 200 })
    } else {
      stopMusic({ fadeMs: 300 })
      playMusic('combat', { loop: true, fadeMs: 200 })
    }
    if (currentView.value === 'game') focusFirstFocusableInGame()
  },
  { immediate: true },
)

function onGameKeydown(e: KeyboardEvent): void {
  if (e.key === 'i' || e.key === 'I') {
    const target = e.target as HTMLElement
    if (target.closest('input') || target.closest('textarea')) return
    e.preventDefault()
    if (gameMode.value === 'narrative') showInventory.value = !showInventory.value
  }
}

onMounted(() => {
  playerStore.$subscribe(
    (_mutation, state) => {
      if (!state.activeSaveSlot || !isSaveSlotId(state.activeSaveSlot)) {
        return
      }

      saveGame(state.activeSaveSlot, state)
    },
    { detached: true },
  )
})
</script>

<template>
  <MainMenu v-if="currentView === 'menu'" @start-game="handleStartGame" />

  <ErrorBoundary v-else @return-to-menu="handleReturnToMenu">
    <main
      ref="mainContentRef"
      class="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4"
      :class="{ 'high-contrast': accessibilityStore.isHighContrast }"
      role="main"
      aria-label="Game content"
      @click="unlockAudio"
      @keydown="onGameKeydown"
    >
      <header class="flex items-center justify-between" role="banner">
        <h1 class="text-2xl font-bold text-slate-50">{{ GAME_CONFIG.ui.gameTitle }}</h1>
        <div class="flex items-center gap-2">
          <AudioControls />
          <button
            v-if="gameMode === 'narrative'"
            ref="inventoryButtonRef"
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            aria-label="Open inventory"
            @click="showInventory = true"
          >
            Inventory
          </button>
          <button
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            aria-label="Save and quit to menu"
            @click="handleSaveAndQuit"
          >
            Save and Quit
          </button>
          <button
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            :aria-label="accessibilityStore.highContrast ? 'Disable high contrast' : 'Enable high contrast'"
            @click="accessibilityStore.toggleHighContrast"
          >
            {{ accessibilityStore.highContrast ? 'High contrast on' : 'High contrast' }}
          </button>
        </div>
      </header>

      <PlayerHud />

      <div v-if="levelUpMessage" class="rounded border border-amber-600 bg-amber-900/40 p-3 text-sm text-amber-200">
        {{ levelUpMessage }}
      </div>

      <Transition name="view-fade" mode="out-in">
        <div v-if="gameMode === 'narrative'" :key="'narrative'">
          <NarrativeView @combat-start="handleCombatStart" @request-quit="handleReturnToMenu" />
        </div>
        <div v-else :key="'combat'" class="relative">
          <CombatView :encounter-id="activeEncounterId" @resolved="handleCombatResolved" @error="handleReturnToMenu" />
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
      </Transition>
    </main>

    <InventoryPanel
      v-if="showInventory"
      :return-focus-to="inventoryButtonRef"
      @close="showInventory = false"
    />

    <PlaytestPanel />
  </ErrorBoundary>
</template>

<style scoped>
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.25s ease;
}
.view-fade-enter-from,
.view-fade-leave-to {
  opacity: 0;
}

.resolution-fade-enter-active,
.resolution-fade-leave-active {
  transition: opacity 0.2s ease;
}
.resolution-fade-enter-from,
.resolution-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .view-fade-enter-active,
  .view-fade-leave-active,
  .resolution-fade-enter-active,
  .resolution-fade-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
