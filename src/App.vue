<script setup lang="ts">
import { inject as injectVercelWebAnalytics } from '@vercel/analytics'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import AudioControls from './components/AudioControls.vue'
import AuthGate from './components/AuthGate.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import InventoryPanel from './components/InventoryPanel.vue'
import ProgressionPanel from './components/ProgressionPanel.vue'
import MainMenu from './components/MainMenu.vue'
import NarrativeView from './components/NarrativeView.vue'
import NotificationHost from './components/NotificationHost.vue'
import PwaUpdateNotice from './components/PwaUpdateNotice.vue'
import PlaytestPanel from './components/PlaytestPanel.vue'
import TelemetryConsentBanner from './components/TelemetryConsentBanner.vue'
import PlayerHud from './components/PlayerHud.vue'
import { useAudio } from './composables/useAudio'
import { useAccessibilityStore } from './stores/accessibilityStore'
import { useAuthStore } from './stores/authStore'
import { flushOutcomeEvents } from './services/analyticsClient'
import { usePlayerStore } from './stores/playerStore'
import { usePluginRegistry } from './plugins/registry'
import type { CharacterSheetPayload } from './types/characterSheet'
import type { PlayerState } from './types/player'
import { GAME_CONFIG } from './config'
import { isSaveSlotId, saveGame, saveGameNow, syncCloudSavesNow, type SaveSlotId } from './utils/storage'

const playerStore = usePlayerStore()
const accessibilityStore = useAccessibilityStore()
const authStore = useAuthStore()
const registry = usePluginRegistry()
const { unlock: unlockAudio, playMusic, stopMusic } = useAudio()
const currentView = ref<'menu' | 'game'>('menu')
const mainContentRef = ref<HTMLElement | null>(null)
const inventoryButtonRef = ref<HTMLElement | null>(null)
const gameMode = ref<string>('narrative')
const gameModeData = ref<Record<string, unknown>>({})
const showInventory = ref(false)
const showProgression = ref(false)
const progressionButtonRef = ref<HTMLElement | null>(null)

const gameModeComponent = computed(() => registry.gameModes[gameMode.value])

function handleStartGame(slotId: SaveSlotId, savedState: PlayerState | null, sheetPayload?: CharacterSheetPayload): void {
  if (savedState) {
    playerStore.loadGame(slotId, savedState)
  } else {
    playerStore.startNewGame(slotId, sheetPayload)
  }

  gameMode.value = 'narrative'
  currentView.value = 'game'
}

function handleStartGameMode(mode: string, data?: Record<string, unknown>): void {
  gameModeData.value = data ?? {}
  gameMode.value = mode
}

function handleExitMode(): void {
  gameModeData.value = {}
  gameMode.value = 'narrative'
}

function handleSaveAndQuit(): void {
  const activeSlot = playerStore.activeSaveSlot
  if (activeSlot && isSaveSlotId(activeSlot)) {
    saveGameNow(activeSlot, playerStore.$state)
  }

  playerStore.activeSaveSlot = null
  currentView.value = 'menu'
  gameMode.value = 'narrative'
  void flushOutcomeEvents('default')
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
    if (gameMode.value === 'narrative' && registry.hasPlugin('inventory')) {
      showInventory.value = !showInventory.value
    }
  }
}

let vercelWebAnalyticsInjected = false

onMounted(() => {
  if (typeof window !== 'undefined' && !vercelWebAnalyticsInjected) {
    vercelWebAnalyticsInjected = true
    injectVercelWebAnalytics()
  }
  if (GAME_CONFIG.features.cloudSave) {
    void authStore.bootstrap().then(() => syncCloudSavesNow())
  }
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

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (!GAME_CONFIG.features.cloudSave) return
    if (!isAuthenticated) return
    void syncCloudSavesNow()
  },
)

/** Snap the window to top (header, HUD, narrative). */
function scrollGameLayoutToTop(): void {
  window.scrollTo(0, 0)
}

/** Entering game from the menu leaves the old window scrollY; reset so the session starts at the top. */
watch(currentView, (view, prev) => {
  if (view !== 'game' || prev !== 'menu') return
  void nextTick(() => {
    scrollGameLayoutToTop()
  })
})

watch(
  () => playerStore.metadata.currentNodeId,
  () => {
    if (currentView.value !== 'game' || gameMode.value !== 'narrative') return
    void nextTick(() => {
      scrollGameLayoutToTop()
    })
  },
)
</script>

<template>
  <AuthGate>
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
      <header class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" role="banner">
        <h1 class="text-xl font-bold text-slate-50 sm:text-2xl">{{ GAME_CONFIG.ui.gameTitle }}</h1>
        <div class="flex flex-wrap items-center gap-2">
          <AudioControls />
          <button
            v-if="gameMode === 'narrative' && registry.hasPlugin('inventory')"
            ref="inventoryButtonRef"
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            aria-label="Open inventory"
            @click="showInventory = true"
          >
            Inventory
          </button>
          <button
            v-if="gameMode === 'narrative' && registry.hasPlugin('progression')"
            ref="progressionButtonRef"
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            aria-label="Open level and attributes"
            @click="showProgression = true"
          >
            Level & Attributes
          </button>
          <button
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            aria-label="Save and quit to menu"
            @click="handleSaveAndQuit"
          >
            <span class="sm:hidden">Save</span>
            <span class="hidden sm:inline">Save and Quit</span>
          </button>
          <button
            type="button"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            :aria-label="accessibilityStore.highContrast ? 'Disable high contrast' : 'Enable high contrast'"
            @click="accessibilityStore.toggleHighContrast"
          >
            <span class="sm:hidden">{{ accessibilityStore.highContrast ? 'Contrast on' : 'Contrast' }}</span>
            <span class="hidden sm:inline">{{ accessibilityStore.highContrast ? 'High contrast on' : 'High contrast' }}</span>
          </button>
        </div>
      </header>

      <PlayerHud />

      <Transition name="view-fade" mode="out-in">
        <div v-if="gameMode === 'narrative'" :key="'narrative'">
          <NarrativeView @start-game-mode="handleStartGameMode" @request-quit="handleReturnToMenu" />
        </div>
        <component
          v-else-if="gameModeComponent"
          :is="gameModeComponent"
          :key="gameMode"
          :mode-data="gameModeData"
          @exit-mode="handleExitMode"
          @return-to-menu="handleReturnToMenu"
        />
        <div v-else :key="'unknown-mode'" class="rounded border border-red-700 bg-slate-900/90 p-6">
          <p class="text-base font-medium text-red-300">Unknown game mode: {{ gameMode }}</p>
          <button
            type="button"
            class="mt-4 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            @click="handleExitMode"
          >
            Return to narrative
          </button>
        </div>
      </Transition>
    </main>

    <InventoryPanel
      v-if="showInventory && registry.hasPlugin('inventory')"
      :return-focus-to="inventoryButtonRef"
      @close="showInventory = false"
    />

    <ProgressionPanel
      v-if="showProgression && registry.hasPlugin('progression')"
      :return-focus-to="progressionButtonRef"
      @close="showProgression = false"
    />

    <NotificationHost />
    <PlaytestPanel />
    <PwaUpdateNotice />
    <TelemetryConsentBanner />
    </ErrorBoundary>
  </AuthGate>
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

@media (prefers-reduced-motion: reduce) {
  .view-fade-enter-active,
  .view-fade-leave-active {
    transition-duration: 0.01ms;
  }
}
</style>
