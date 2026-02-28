import { ref, computed, shallowRef } from 'vue'
import { loadFromApi, saveToApi, validateOnApi, type AuthoringModel, type Diagnostic } from '../api/authoringClient'
import { modelToVueFlow } from '../adapters/graphAdapter'
import { analyzeGraph } from '@data-core/graph.js'

export function useAuthoringData() {
  const nodes = shallowRef<Record<string, import('../api/authoringClient').StoryNodeModel>>({})
  const items = shallowRef<Record<string, import('../api/authoringClient').ItemModel>>({})
  const enemies = shallowRef<Record<string, import('../api/authoringClient').EnemyModel>>({})
  const encounters = shallowRef<Record<string, import('../api/authoringClient').EncounterModel>>({})
  const errors = ref<Diagnostic[]>([])
  const warnings = ref<Diagnostic[]>([])
  const selectedNodeId = ref<string | null>(null)
  const loading = ref(false)
  const saveResult = ref<{ written: string[]; backups: string[] } | null>(null)

  const model = computed<AuthoringModel>(() => ({
    nodes: nodes.value,
    items: items.value,
    enemies: enemies.value,
    encounters: encounters.value,
  }))

  const orphanSet = computed(() => {
    const n = nodes.value
    const enc = encounters.value
    const { orphans: o } = analyzeGraph(n, enc)
    return new Set(o)
  })
  const deadEndSet = computed(() => {
    const n = nodes.value
    const enc = encounters.value
    const { deadEnds: d } = analyzeGraph(n, enc)
    return new Set(d)
  })

  const flowElements = computed(() => {
    const { flowNodes, flowEdges } = modelToVueFlow(
      nodes.value,
      encounters.value,
      { orphanIds: orphanSet.value, deadEndIds: deadEndSet.value }
    )
    return { flowNodes, flowEdges }
  })

  async function load() {
    loading.value = true
    saveResult.value = null
    try {
      const data = await loadFromApi()
      nodes.value = data.nodes
      items.value = data.items
      enemies.value = data.enemies
      encounters.value = data.encounters
      errors.value = data.errors
      warnings.value = data.warnings
    } finally {
      loading.value = false
    }
  }

  async function validate() {
    const res = await validateOnApi(model.value)
    errors.value = res.errors
    warnings.value = res.warnings
    return res
  }

  async function save() {
    const res = await saveToApi(model.value)
    saveResult.value = { written: res.written, backups: res.backups }
    warnings.value = res.warnings
    return res
  }

  function selectNode(id: string | null) {
    selectedNodeId.value = id
  }

  function updateNode(id: string, patch: Partial<import('../api/authoringClient').StoryNodeModel>) {
    const next = { ...nodes.value }
    const current = next[id]
    if (!current) return
    next[id] = { ...current, ...patch }
    nodes.value = next
  }

  return {
    nodes,
    items,
    enemies,
    encounters,
    errors,
    warnings,
    selectedNodeId,
    loading,
    saveResult,
    model,
    flowElements,
    orphanSet,
    deadEndSet,
    load,
    validate,
    save,
    selectNode,
    updateNode,
  }
}
