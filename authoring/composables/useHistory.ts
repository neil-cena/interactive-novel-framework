/**
 * Undo/redo history for authoring model. Stores deep snapshots of the full model.
 */

import { ref, computed, type Ref } from 'vue'
import type { AuthoringModel } from '../api/authoringClient'

const MAX_HISTORY = 50

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function useHistory(initialModel: Ref<AuthoringModel>) {
  const past = ref<AuthoringModel[]>([])
  const future = ref<AuthoringModel[]>([])

  function push(state: AuthoringModel) {
    past.value = [...past.value.slice(-(MAX_HISTORY - 1)), deepClone(state)]
    future.value = []
  }

  function undo(): AuthoringModel | null {
    if (past.value.length === 0) return null
    const prev = past.value[past.value.length - 1]
    future.value = [deepClone(initialModel.value), ...future.value]
    past.value = past.value.slice(0, -1)
    return prev
  }

  function redo(): AuthoringModel | null {
    if (future.value.length === 0) return null
    const next = future.value[0]
    past.value = [...past.value, deepClone(initialModel.value)]
    future.value = future.value.slice(1)
    return next
  }

  function clear() {
    past.value = []
    future.value = []
  }

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  return {
    push,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    get pastLength() {
      return past.value.length
    },
    get futureLength() {
      return future.value.length
    },
  }
}
