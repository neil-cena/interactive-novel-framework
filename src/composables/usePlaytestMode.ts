/**
 * Playtest mode: DEV-gated panel for teleport and state mutation.
 * Only active when import.meta.env.DEV is true (or explicit flag).
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/playerStore'
import { STORY_NODES } from '../data/nodes'
import type { PlayerAttributes } from '../types/player'

export function usePlaytestMode() {
  const playerStore = usePlayerStore()
  const isOpen = ref(false)

  const isPlaytestEnabled = import.meta.env.DEV

  const nodeIds = computed(() => Object.keys(STORY_NODES))
  const nodeList = computed(() =>
    nodeIds.value.map((id) => {
      const node = STORY_NODES[id]
      return {
        id,
        type: node?.type ?? 'unknown',
        text: (node?.text ?? '').slice(0, 50),
      }
    }),
  )

  function toggle() {
    if (!isPlaytestEnabled) return
    isOpen.value = !isOpen.value
  }

  function teleport(nodeId: string) {
    if (!STORY_NODES[nodeId]) return
    playerStore.navigateTo(nodeId)
  }

  function setFlag(key: string, value: boolean) {
    playerStore.setFlag(key, value)
  }

  function addItem(itemId: string, qty: number) {
    playerStore.addItem(itemId, qty)
  }

  function removeItem(itemId: string, qty: number) {
    playerStore.removeItem(itemId, qty)
  }

  function adjustHp(amount: number) {
    playerStore.adjustHp(amount)
  }

  function adjustCurrency(amount: number) {
    playerStore.adjustCurrency(amount)
  }

  function grantXp(amount: number) {
    playerStore.awardXp(amount)
  }

  function grantAttributePoint(attr: keyof PlayerAttributes) {
    playerStore.adjustAttribute(attr, 1)
  }

  function resetToDefaults() {
    playerStore.resetToDefaults()
  }

  const stateSnapshot = computed(() => ({
    metadata: { ...playerStore.metadata },
    vitals: { ...playerStore.vitals },
    attributes: { ...playerStore.attributes },
    progression: { ...playerStore.progression },
    flags: { ...playerStore.flags },
    inventory: { ...playerStore.inventory },
    equipment: { ...playerStore.equipment },
  }))

  function onKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault()
      toggle()
    }
  }

  onMounted(() => {
    if (isPlaytestEnabled) {
      window.addEventListener('keydown', onKeyDown)
    }
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })

  return {
    isPlaytestEnabled,
    isOpen,
    toggle,
    nodeIds,
    nodeList,
    teleport,
    setFlag,
    addItem,
    removeItem,
    adjustHp,
    adjustCurrency,
    grantXp,
    grantAttributePoint,
    resetToDefaults,
    stateSnapshot,
    playerStore,
  }
}
