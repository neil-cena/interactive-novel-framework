import { ref, computed, shallowRef, watch } from 'vue'
import { loadFromApi, saveToApi, validateOnApi, saveDraftToApi, loadDraftFromApi, type AuthoringModel, type Diagnostic, type StoryNodeModel, type ItemModel, type EnemyModel, type EncounterModel } from '../api/authoringClient'
import { modelToVueFlow } from '../adapters/graphAdapter'
import { analyzeGraph } from '@data-core/graph.js'
import { createIdFactory, collectIdContext } from '../utils/idFactory'
import { useHistory } from './useHistory'

type ChoiceModel = StoryNodeModel['choices'] extends (infer C)[] | undefined ? C : never
type MechanicModel = NonNullable<ChoiceModel>['mechanic']
type OnEnterAction = NonNullable<StoryNodeModel['onEnter']>[number]
type VisibilityReq = NonNullable<ChoiceModel>['visibilityRequirements'] extends (infer V)[] | undefined ? V : never

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export type DeleteNodeStrategy = 'block' | 'cascade' | 'rewire'
type CreateOptions = { customId?: string; title?: string; seed?: string }

export function useAuthoringData() {
  const nodes = shallowRef<Record<string, StoryNodeModel>>({})
  const items = shallowRef<Record<string, ItemModel>>({})
  const enemies = shallowRef<Record<string, EnemyModel>>({})
  const encounters = shallowRef<Record<string, EncounterModel>>({})
  const errors = ref<Diagnostic[]>([])
  const warnings = ref<Diagnostic[]>([])
  const selectedNodeId = ref<string | null>(null)
  const selectedEncounterId = ref<string | null>(null)
  const loading = ref(false)
  const saveResult = ref<{ written: string[]; backups: string[] } | null>(null)

  const model = computed<AuthoringModel>(() => ({
    nodes: nodes.value,
    items: items.value,
    enemies: enemies.value,
    encounters: encounters.value,
  }))

  const baseline = ref<AuthoringModel | null>(null)
  const dirty = computed(() => {
    if (!baseline.value) return false
    return JSON.stringify(baseline.value) !== JSON.stringify(model.value)
  })

  const history = useHistory(model)
  function pushHistory() {
    history.push(deepClone(model.value))
  }

  function setState(snapshot: AuthoringModel) {
    nodes.value = snapshot.nodes ?? {}
    items.value = snapshot.items ?? {}
    enemies.value = snapshot.enemies ?? {}
    encounters.value = snapshot.encounters ?? {}
  }

  function getIdFactory() {
    return createIdFactory(
      collectIdContext(nodes.value, encounters.value, items.value, enemies.value)
    )
  }

  const orphanSet = computed(() => {
    const { orphans } = analyzeGraph(nodes.value, encounters.value)
    return new Set(orphans)
  })
  const deadEndSet = computed(() => {
    const { deadEnds } = analyzeGraph(nodes.value, encounters.value)
    return new Set(deadEnds)
  })

  // Memoized: only recomputes when nodes, encounters, or graph analysis (orphans/deadEnds) change
  const flowElements = computed(() => {
    const { flowNodes, flowEdges } = modelToVueFlow(nodes.value, encounters.value, {
      orphanIds: orphanSet.value,
      deadEndIds: deadEndSet.value,
    })
    return { flowNodes, flowEdges }
  })

  async function load() {
    loading.value = true
    saveResult.value = null
    try {
      const data = await loadFromApi()
      nodes.value = data.nodes ?? {}
      items.value = data.items ?? {}
      enemies.value = data.enemies ?? {}
      encounters.value = data.encounters ?? {}
      errors.value = data.errors ?? []
      warnings.value = data.warnings ?? []
      baseline.value = deepClone(model.value)
      history.clear()
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
    baseline.value = deepClone(model.value)
    history.clear()
    return res
  }

  async function saveDraft() {
    const res = await saveDraftToApi(model.value)
    baseline.value = deepClone(model.value)
    return res
  }

  async function loadDraft() {
    const res = await loadDraftFromApi()
    if (!res.exists || !res.model) return res
    setState(res.model)
    baseline.value = deepClone(model.value)
    history.clear()
    return res
  }

  function selectNode(id: string | null) {
    selectedNodeId.value = id
    selectedEncounterId.value = null
  }

  function selectEncounter(id: string | null) {
    selectedEncounterId.value = id
    selectedNodeId.value = null
  }

  function updateNode(id: string, patch: Partial<StoryNodeModel>) {
    const next = { ...nodes.value }
    const current = next[id]
    if (!current) return
    next[id] = { ...current, ...patch }
    nodes.value = next
  }

  function normalizeCustomId(customId?: string): string | undefined {
    const id = customId?.trim()
    return id ? id : undefined
  }

  function createNode(type: 'narrative' | 'encounter' | 'ending', options?: CreateOptions): string | null {
    pushHistory()
    const idFactory = getIdFactory()
    const customId = normalizeCustomId(options?.customId)
    if (customId && nodes.value[customId]) return null
    const id = customId ?? idFactory.nextNodeId(options?.seed ?? options?.title)
    const node: StoryNodeModel = {
      id,
      type,
      text: options?.title?.trim() ?? '',
      choices: [],
    }
    nodes.value = { ...nodes.value, [id]: node }
    selectedNodeId.value = id
    return id
  }

  function deleteNode(nodeId: string, strategy: DeleteNodeStrategy = 'cascade', rewireTargetId?: string): boolean {
    if (!nodes.value[nodeId]) return false
    if (strategy === 'block') return false
    pushHistory()
    const nextNodes = { ...nodes.value }
    delete nextNodes[nodeId]
    if (strategy === 'rewire' && rewireTargetId && nextNodes[rewireTargetId]) {
      for (const node of Object.values(nextNodes)) {
        if (!node.choices) continue
        for (const choice of node.choices) {
          const m = choice.mechanic as Record<string, unknown> | undefined
          if (!m) continue
          if (m.nextNodeId === nodeId) (m as { nextNodeId: string }).nextNodeId = rewireTargetId
          if (m.onSuccess?.nextNodeId === nodeId) (m.onSuccess as { nextNodeId: string }).nextNodeId = rewireTargetId
          if (m.onFailure?.nextNodeId === nodeId) (m.onFailure as { nextNodeId: string }).nextNodeId = rewireTargetId
        }
      }
      for (const enc of Object.values(encounters.value)) {
        const r = enc.resolution
        if (r?.onVictory?.nextNodeId === nodeId) r.onVictory.nextNodeId = rewireTargetId
        if (r?.onDefeat?.nextNodeId === nodeId) r.onDefeat.nextNodeId = rewireTargetId
      }
    }
    nodes.value = nextNodes
    if (selectedNodeId.value === nodeId) selectedNodeId.value = null
    return true
  }

  function createChoice(nodeId: string, mechanicType: 'navigate' | 'combat_init' | 'skill_check'): string | null {
    const node = nodes.value[nodeId]
    if (!node) return null
    pushHistory()
    const idFactory = getIdFactory()
    const existingIds = (node.choices ?? []).map((c) => c.id)
    const choiceId = idFactory.nextChoiceId(nodeId, existingIds)
    let mechanic: Record<string, unknown> = { type: mechanicType }
    if (mechanicType === 'navigate') mechanic.nextNodeId = ''
    if (mechanicType === 'combat_init') mechanic.encounterId = ''
    if (mechanicType === 'skill_check') {
      mechanic = {
        type: 'skill_check',
        dice: '1d20',
        dc: 10,
        onSuccess: { nextNodeId: '' },
        onFailure: { nextNodeId: '' },
        attribute: 'dexterity',
      }
    }
    const choices = [...(node.choices ?? []), { id: choiceId, label: 'New choice', mechanic }]
    nodes.value = { ...nodes.value, [nodeId]: { ...node, choices } }
    return choiceId
  }

  function deleteChoice(nodeId: string, choiceId: string): boolean {
    const node = nodes.value[nodeId]
    if (!node?.choices) return false
    pushHistory()
    const choices = node.choices.filter((c) => c.id !== choiceId)
    nodes.value = { ...nodes.value, [nodeId]: { ...node, choices } }
    return true
  }

  function setChoiceMechanic(nodeId: string, choiceId: string, mechanic: MechanicModel | Record<string, unknown>): void {
    const node = nodes.value[nodeId]
    if (!node?.choices) return
    pushHistory()
    const choices = node.choices.map((c) =>
      c.id === choiceId ? { ...c, mechanic: mechanic ?? c.mechanic } : c
    )
    nodes.value = { ...nodes.value, [nodeId]: { ...node, choices } }
  }

  function setChoiceVisibility(nodeId: string, choiceId: string, visibilityRequirements: VisibilityReq[] | undefined): void {
    const node = nodes.value[nodeId]
    if (!node?.choices) return
    pushHistory()
    const choices = node.choices.map((c) =>
      c.id === choiceId ? { ...c, visibilityRequirements: visibilityRequirements ?? [] } : c
    )
    nodes.value = { ...nodes.value, [nodeId]: { ...node, choices } }
  }

  function setOnEnterActions(nodeId: string, onEnter: OnEnterAction[] | undefined): void {
    const node = nodes.value[nodeId]
    if (!node) return
    pushHistory()
    nodes.value = { ...nodes.value, [nodeId]: { ...node, onEnter: onEnter ?? [] } }
  }

  function reorderChoices(nodeId: string, fromIndex: number, toIndex: number): boolean {
    const node = nodes.value[nodeId]
    if (!node?.choices || fromIndex < 0 || toIndex < 0 || fromIndex >= node.choices.length || toIndex >= node.choices.length) return false
    pushHistory()
    const choices = [...node.choices]
    const [removed] = choices.splice(fromIndex, 1)
    choices.splice(toIndex, 0, removed)
    nodes.value = { ...nodes.value, [nodeId]: { ...node, choices } }
    return true
  }

  function createEncounter(options?: CreateOptions): string | null {
    pushHistory()
    const idFactory = getIdFactory()
    const customId = normalizeCustomId(options?.customId)
    if (customId && encounters.value[customId]) return null
    const id = customId ?? idFactory.nextEncounterId(options?.seed ?? options?.title)
    const enc: EncounterModel = {
      id,
      name: options?.title?.trim() || id,
      type: 'combat',
      enemies: [],
      resolution: { onVictory: { nextNodeId: '' }, onDefeat: { nextNodeId: '' } },
    }
    encounters.value = { ...encounters.value, [id]: enc }
    selectedEncounterId.value = id
    return id
  }

  function deleteEncounter(encounterId: string): boolean {
    if (!encounters.value[encounterId]) return false
    pushHistory()
    const next = { ...encounters.value }
    delete next[encounterId]
    encounters.value = next
    if (selectedEncounterId.value === encounterId) selectedEncounterId.value = null
    return true
  }

  function updateEncounter(id: string, patch: Partial<EncounterModel>): void {
    const current = encounters.value[id]
    if (!current) return
    pushHistory()
    encounters.value = { ...encounters.value, [id]: { ...current, ...patch } }
  }

  function createItem(options?: CreateOptions): string | null {
    pushHistory()
    const idFactory = getIdFactory()
    const customId = normalizeCustomId(options?.customId)
    if (customId && items.value[customId]) return null
    const id = customId ?? idFactory.nextItemId(options?.seed ?? options?.title)
    const item: ItemModel = {
      id,
      name: options?.title?.trim() || id,
      type: 'tool',
    }
    items.value = { ...items.value, [id]: item }
    return id
  }

  function deleteItem(itemId: string): boolean {
    if (!items.value[itemId]) return false
    pushHistory()
    const next = { ...items.value }
    delete next[itemId]
    items.value = next
    return true
  }

  function updateItem(id: string, patch: Partial<ItemModel>): void {
    const current = items.value[id]
    if (!current) return
    pushHistory()
    items.value = { ...items.value, [id]: { ...current, ...patch } }
  }

  function createEnemy(options?: CreateOptions): string | null {
    pushHistory()
    const idFactory = getIdFactory()
    const customId = normalizeCustomId(options?.customId)
    if (customId && enemies.value[customId]) return null
    const id = customId ?? idFactory.nextEnemyId(options?.seed ?? options?.title)
    const enemy: EnemyModel = {
      id,
      name: options?.title?.trim() || id,
      hp: 10,
      ac: 10,
      damage: '1d4',
      xpReward: 10,
    }
    enemies.value = { ...enemies.value, [id]: enemy }
    return id
  }

  function deleteEnemy(enemyId: string): boolean {
    if (!enemies.value[enemyId]) return false
    pushHistory()
    const next = { ...enemies.value }
    delete next[enemyId]
    enemies.value = next
    return true
  }

  function updateEnemy(id: string, patch: Partial<EnemyModel>): void {
    const current = enemies.value[id]
    if (!current) return
    pushHistory()
    enemies.value = { ...enemies.value, [id]: { ...current, ...patch } }
  }

  function disconnectChoiceTarget(nodeId: string, choiceId: string, branchType?: 'success' | 'failure'): void {
    const node = nodes.value[nodeId]
    const choice = node?.choices?.find((c) => c.id === choiceId)
    if (!choice) return
    const m = (choice.mechanic ?? {}) as Record<string, unknown>
    pushHistory()
    if (branchType === 'success' || branchType === 'failure') {
      const key = branchType === 'success' ? 'onSuccess' : 'onFailure'
      setChoiceMechanic(nodeId, choiceId, {
        ...m,
        type: 'skill_check',
        dice: m.dice ?? '1d20',
        dc: m.dc ?? 10,
        onSuccess: m.onSuccess as { nextNodeId: string },
        onFailure: m.onFailure as { nextNodeId: string },
        [key]: { nextNodeId: '' },
      })
    } else {
      if (m.type === 'navigate') setChoiceMechanic(nodeId, choiceId, { ...m, nextNodeId: '' })
      if (m.type === 'combat_init') setChoiceMechanic(nodeId, choiceId, { ...m, encounterId: '' })
    }
  }

  function clearEncounterResolutionTarget(encounterId: string, resolutionType: 'onVictory' | 'onDefeat'): void {
    const enc = encounters.value[encounterId]
    if (!enc) return
    pushHistory()
    const resolution = { ...enc.resolution }
    if (resolutionType === 'onVictory') resolution.onVictory = { nextNodeId: '' }
    else resolution.onDefeat = { nextNodeId: '' }
    encounters.value = { ...encounters.value, [encounterId]: { ...enc, resolution } }
  }

  function connectChoice(nodeId: string, choiceId: string, target: { type: 'node'; nodeId: string } | { type: 'encounter'; encounterId: string } | { type: 'skill_success'; nodeId: string } | { type: 'skill_failure'; nodeId: string }): void {
    const node = nodes.value[nodeId]
    const choice = node?.choices?.find((c) => c.id === choiceId)
    if (!choice) return
    const m = (choice.mechanic ?? {}) as Record<string, unknown>
    pushHistory()
    if (target.type === 'node') {
      setChoiceMechanic(nodeId, choiceId, { ...m, type: 'navigate', nextNodeId: target.nodeId })
    } else if (target.type === 'encounter') {
      setChoiceMechanic(nodeId, choiceId, { ...m, type: 'combat_init', encounterId: target.encounterId })
    } else if (target.type === 'skill_success') {
      const onSuccess = (m.onSuccess as { nextNodeId: string }) ?? { nextNodeId: '' }
      setChoiceMechanic(nodeId, choiceId, {
        ...m,
        type: 'skill_check',
        dice: m.dice ?? '1d20',
        dc: m.dc ?? 10,
        onSuccess: { nextNodeId: target.nodeId },
        onFailure: (m.onFailure as { nextNodeId: string }) ?? { nextNodeId: '' },
        attribute: m.attribute ?? 'dexterity',
      })
    } else if (target.type === 'skill_failure') {
      const onFailure = (m.onFailure as { nextNodeId: string }) ?? { nextNodeId: '' }
      setChoiceMechanic(nodeId, choiceId, {
        ...m,
        type: 'skill_check',
        dice: m.dice ?? '1d20',
        dc: m.dc ?? 10,
        onSuccess: (m.onSuccess as { nextNodeId: string }) ?? { nextNodeId: '' },
        onFailure: { nextNodeId: target.nodeId },
        attribute: m.attribute ?? 'dexterity',
      })
    }
  }

  function undo(): boolean {
    const prev = history.undo()
    if (!prev) return false
    setState(prev)
    return true
  }

  function redo(): boolean {
    const next = history.redo()
    if (!next) return false
    setState(next)
    return true
  }

  return {
    nodes,
    items,
    enemies,
    encounters,
    errors,
    warnings,
    selectedNodeId,
    selectedEncounterId,
    loading,
    saveResult,
    model,
    flowElements,
    orphanSet,
    deadEndSet,
    dirty,
    baseline,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    load,
    validate,
    save,
    saveDraft,
    loadDraft,
    selectNode,
    selectEncounter,
    updateNode,
    createNode,
    deleteNode,
    createChoice,
    deleteChoice,
    setChoiceMechanic,
    setChoiceVisibility,
    setOnEnterActions,
    reorderChoices,
    connectChoice,
    createEncounter,
    deleteEncounter,
    updateEncounter,
    createItem,
    deleteItem,
    updateItem,
    createEnemy,
    deleteEnemy,
    updateEnemy,
    undo,
    redo,
    disconnectChoiceTarget,
    clearEncounterResolutionTarget,
    getIdFactory,
  }
}
