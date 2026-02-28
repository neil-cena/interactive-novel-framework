<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CombatView from './components/CombatView.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import InventoryPanel from './components/InventoryPanel.vue'
import MainMenu from './components/MainMenu.vue'
import NarrativeView from './components/NarrativeView.vue'
import PlayerHud from './components/PlayerHud.vue'
import { COMBAT_ENCOUNTERS } from './data/encounters'
import { ENEMY_DICTIONARY } from './data/enemies'
import { usePlayerStore } from './stores/playerStore'
import type { PlayerState } from './types/player'
import { GAME_CONFIG } from './config'
import { isSaveSlotId, saveGame, saveGameNow, type SaveSlotId } from './utils/storage'

const playerStore = usePlayerStore()
const currentView = ref<'menu' | 'game'>('menu')
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

function handleCombatResolved(outcome: 'victory' | 'defeat'): void {
  const encounter = COMBAT_ENCOUNTERS[activeEncounterId.value]
  if (!encounter) {
    gameMode.value = 'narrative'
    return
  }

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
}

function handleReturnToMenu(): void {
  handleSaveAndQuit()
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
    <main class="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 p-4">
      <header class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-slate-50">{{ GAME_CONFIG.ui.gameTitle }}</h1>
        <div class="flex gap-2">
          <button
            v-if="gameMode === 'narrative'"
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            @click="showInventory = true"
          >
            Inventory
          </button>
          <button
            class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
            @click="handleSaveAndQuit"
          >
            Save and Quit
          </button>
        </div>
      </header>

      <PlayerHud />

      <div v-if="levelUpMessage" class="rounded border border-amber-600 bg-amber-900/40 p-3 text-sm text-amber-200">
        {{ levelUpMessage }}
      </div>

      <NarrativeView v-if="gameMode === 'narrative'" @combat-start="handleCombatStart" @request-quit="handleReturnToMenu" />

      <CombatView v-else :encounter-id="activeEncounterId" @resolved="handleCombatResolved" @error="handleReturnToMenu" />
    </main>

    <InventoryPanel v-if="showInventory" @close="showInventory = false" />
  </ErrorBoundary>
</template>
