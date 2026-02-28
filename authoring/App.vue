<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import GraphCanvas from './components/GraphCanvas.vue'
import NodeInspector from './components/NodeInspector.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import EntityTabs from './components/EntityTabs.vue'
import EncountersEditor from './components/EncountersEditor.vue'
import ItemsEditor from './components/ItemsEditor.vue'
import EnemiesEditor from './components/EnemiesEditor.vue'
import type { EdgeData } from './components/GraphCanvas.vue'
import { useAuthoringData } from './composables/useAuthoringData'

const {
  flowElements,
  selectedNodeId,
  selectedEncounterId,
  nodes,
  encounters,
  items,
  enemies,
  errors,
  warnings,
  loading,
  saveResult,
  dirty,
  canUndo,
  canRedo,
  load,
  save,
  validate,
  selectNode,
  selectEncounter,
  saveDraft,
  loadDraft,
  updateNode,
  createNode,
  deleteNode,
  createChoice,
  connectChoice,
  setChoiceVisibility,
  setOnEnterActions,
  createEncounter,
  deleteEncounter,
  updateEncounter,
  createItem,
  deleteItem,
  updateItem,
  createEnemy,
  deleteEnemy,
  updateEnemy,
  disconnectChoiceTarget,
  clearEncounterResolutionTarget,
  undo,
  redo,
} = useAuthoringData()
const saveError = ref<string | null>(null)
const selectedEdge = ref<EdgeData | null>(null)
const addNodeMenuOpen = ref(false)
const sidebarTab = ref<'node' | 'encounters' | 'items' | 'enemies'>('node')
const isSidebarCollapsed = ref(false)
const selectedItemId = ref<string | null>(null)
const selectedEnemyId = ref<string | null>(null)
const autosaveEnabled = ref(false)
const autosaveError = ref<string | null>(null)
const draftInfo = ref<string | null>(null)
const draftBadge = ref<{ status: 'saved' | 'loaded'; savedAt: string } | null>(null)
let autosaveTimer: ReturnType<typeof setTimeout> | null = null
const AUTOSAVE_DEBOUNCE_MS = 2000

const selectedNode = computed(() =>
  selectedNodeId.value ? nodes.value[selectedNodeId.value] ?? null : null
)
const draftBadgeText = computed(() => {
  if (!draftBadge.value) return null
  const action = draftBadge.value.status === 'loaded' ? 'Draft loaded' : 'Draft saved'
  return `${action}: ${new Date(draftBadge.value.savedAt).toLocaleString()}`
})

function scheduleAutosave() {
  if (!autosaveEnabled.value) return
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(async () => {
    autosaveTimer = null
    autosaveError.value = null
    try {
      const res = await validate()
      if (res.errors.length > 0) return
      await save()
    } catch (e) {
      autosaveError.value = e instanceof Error ? e.message : String(e)
    }
  }, AUTOSAVE_DEBOUNCE_MS)
}

watch(dirty, (isDirty) => {
  if (isDirty && autosaveEnabled.value) scheduleAutosave()
})

function handleConnect(connection: { source: string; target: string }) {
  const { source, target } = connection
  const isEnc = target.startsWith('enc:')
  const encounterId = isEnc ? target.slice(4) : ''
  const choiceId = createChoice(
    source,
    isEnc ? 'combat_init' : 'navigate'
  )
  if (!choiceId) return
  if (isEnc) connectChoice(source, choiceId, { type: 'encounter', encounterId })
  else connectChoice(source, choiceId, { type: 'node', nodeId: target })
}

function handleSelectEdge(data: EdgeData | null) {
  selectedEdge.value = data
}

function handleDeleteNode() {
  if (!selectedNodeId.value) return
  deleteNode(selectedNodeId.value, 'cascade')
  selectedEdge.value = null
}

function handleDeleteEdge() {
  const e = selectedEdge.value
  if (!e) return
  if (e.sourceNodeId && e.choiceId !== undefined) {
    disconnectChoiceTarget(e.sourceNodeId, e.choiceId, e.branchType ?? undefined)
  } else if (e.encounterId && e.resolutionType) {
    clearEncounterResolutionTarget(e.encounterId, e.resolutionType)
  }
  selectedEdge.value = null
}

function handleAddNode(type: 'narrative' | 'encounter' | 'ending') {
  const customId = window.prompt('Node ID (optional):')?.trim() || undefined
  const title = window.prompt('Node title (optional):')?.trim() || undefined
  const id = createNode(type, { customId, title, seed: title })
  if (!id) window.alert(`Node ID "${customId}" already exists.`)
  addNodeMenuOpen.value = false
}

function handleCreateItem() {
  const customId = window.prompt('Item ID (optional):')?.trim() || undefined
  const title = window.prompt('Item title (optional):')?.trim() || undefined
  const id = createItem({ customId, title, seed: title })
  if (!id) {
    window.alert(`Item ID "${customId}" already exists.`)
    return
  }
  selectedItemId.value = id
  sidebarTab.value = 'items'
}

function handleCreateEnemy() {
  const customId = window.prompt('Enemy ID (optional):')?.trim() || undefined
  const title = window.prompt('Enemy title (optional):')?.trim() || undefined
  const id = createEnemy({ customId, title, seed: title })
  if (!id) {
    window.alert(`Enemy ID "${customId}" already exists.`)
    return
  }
  selectedEnemyId.value = id
  sidebarTab.value = 'enemies'
}

function handleCreateEncounter() {
  const customId = window.prompt('Encounter ID (optional):')?.trim() || undefined
  const title = window.prompt('Encounter title (optional):')?.trim() || undefined
  const id = createEncounter({ customId, title, seed: title })
  if (!id) {
    window.alert(`Encounter ID "${customId}" already exists.`)
    return
  }
  sidebarTab.value = 'encounters'
}

async function doSave() {
  saveError.value = null
  try {
    const res = await validate()
    if (res.errors.length > 0) {
      errors.value = res.errors
      warnings.value = res.warnings
      handleDiagnosticFocus(res.errors[0])
      return
    }
    await save()
    draftBadge.value = null
    draftInfo.value = null
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  }
}

async function doSaveDraft() {
  saveError.value = null
  try {
    const res = await saveDraft()
    draftInfo.value = `Draft saved at ${new Date(res.savedAt).toLocaleString()}`
    draftBadge.value = { status: 'saved', savedAt: res.savedAt }
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  }
}

async function doLoadDraft() {
  saveError.value = null
  try {
    const res = await loadDraft()
    if (!res.exists) {
      draftInfo.value = 'No draft found.'
      return
    }
    draftInfo.value = `Draft loaded from ${new Date(res.savedAt ?? '').toLocaleString()}`
    draftBadge.value = { status: 'loaded', savedAt: res.savedAt ?? new Date().toISOString() }
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  }
}

function isInputTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
}

function onKeyDown(e: KeyboardEvent) {
  if (isInputTarget(e.target)) return
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    doSave()
    return
  }
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedEdge.value) {
      e.preventDefault()
      handleDeleteEdge()
    } else if (selectedNodeId.value) {
      e.preventDefault()
      handleDeleteNode()
    }
  }
}

const onBeforeUnload = (e: BeforeUnloadEvent) => {
  if (dirty.value) e.preventDefault()
}

onMounted(() => {
  load()
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('keydown', onKeyDown)
})

function handleDiagnosticFocus(diagnostic: { context?: Record<string, unknown> }) {
  const ctx = diagnostic.context
  if (!ctx) return
  if (ctx.nodeId && typeof ctx.nodeId === 'string') {
    selectNode(ctx.nodeId)
    sidebarTab.value = 'node'
  }
  if (ctx.encounterId && typeof ctx.encounterId === 'string') {
    selectEncounter(ctx.encounterId)
    sidebarTab.value = 'encounters'
  }
  if (ctx.itemId && typeof ctx.itemId === 'string') {
    selectedItemId.value = ctx.itemId
    sidebarTab.value = 'items'
  }
  if (ctx.enemyId && typeof ctx.enemyId === 'string') {
    selectedEnemyId.value = ctx.enemyId
    sidebarTab.value = 'enemies'
  }
}
</script>

<template>
  <div class="app">
    <header class="toolbar">
      <h1>Story Authoring</h1>
      <div class="actions">
        <div class="dropdown">
          <button type="button" :disabled="loading" class="btn" @click="addNodeMenuOpen = !addNodeMenuOpen">
            Add node
          </button>
          <div v-if="addNodeMenuOpen" class="dropdown-menu">
            <button type="button" @click="handleAddNode('narrative')">Narrative</button>
            <button type="button" @click="handleAddNode('encounter')">Encounter</button>
            <button type="button" @click="handleAddNode('ending')">Ending</button>
          </div>
        </div>
        <button type="button" :disabled="!selectedNodeId || loading" @click="handleDeleteNode">
          Delete node
        </button>
        <button type="button" :disabled="!selectedEdge || loading" @click="handleDeleteEdge">
          Delete edge
        </button>
        <button type="button" :disabled="!canUndo" @click="undo">Undo</button>
        <button type="button" :disabled="!canRedo" @click="redo">Redo</button>
        <button type="button" :disabled="loading" @click="load">Load</button>
        <button type="button" :disabled="loading" @click="validate">Validate</button>
        <button type="button" :disabled="loading" @click="doLoadDraft">Load Draft</button>
        <button type="button" :disabled="loading" @click="doSaveDraft">Save Draft</button>
        <button type="button" :disabled="loading" @click="doSave">Save</button>
        <label class="autosave-label"><input v-model="autosaveEnabled" type="checkbox" /> Autosave</label>
      </div>
      <p v-if="autosaveError" class="autosave-error">Autosave failed: {{ autosaveError }}</p>
      <p v-if="draftBadgeText" class="draft-badge">{{ draftBadgeText }}</p>
      <p v-else-if="draftInfo" class="draft-info">{{ draftInfo }}</p>
      <p v-else-if="dirty" class="dirty-hint">Unsaved changes</p>
      <p v-else-if="saveResult" class="save-result">Saved. {{ saveResult.written.length }} file(s) written.</p>
      <p v-else-if="saveError" class="save-error">Save failed: {{ saveError }}</p>
    </header>
    <div class="main">
      <div class="graph-area">
        <GraphCanvas
          :flow-nodes="flowElements.flowNodes"
          :flow-edges="flowElements.flowEdges"
          :selected-node-id="selectedNodeId"
          :selected-edge="selectedEdge"
          :connectable="true"
          @select-node="selectNode"
          @select-edge="handleSelectEdge"
          @connect="handleConnect"
        />
      </div>
      <aside class="sidebar" :class="{ collapsed: isSidebarCollapsed }">
        <button
          type="button"
          class="sidebar-toggle"
          :aria-label="isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="isSidebarCollapsed = !isSidebarCollapsed"
        >
          {{ isSidebarCollapsed ? '>' : '<' }}
        </button>
        <template v-if="!isSidebarCollapsed">
          <EntityTabs v-model:active-tab="sidebarTab" />
          <div class="sidebar-content">
          <NodeInspector
            v-show="sidebarTab === 'node'"
            :node="selectedNode"
            :node-ids="Object.keys(nodes)"
            :encounter-ids="Object.keys(encounters)"
            :item-ids="Object.keys(items)"
            @update:node="(id, patch) => updateNode(id, patch)"
            @update:choice-visibility="(id, choiceId, reqs) => setChoiceVisibility(id, choiceId, reqs)"
            @update:on-enter="(id, actions) => setOnEnterActions(id, actions)"
          />
          <EncountersEditor
            v-show="sidebarTab === 'encounters'"
            :encounters="encounters"
            :nodes="nodes"
            :enemies="enemies"
            :selected-id="selectedEncounterId"
            @select="(id) => selectEncounter(id)"
            @create="handleCreateEncounter"
            @delete="(id) => deleteEncounter(id)"
            @update="(id, patch) => updateEncounter(id, patch)"
          />
          <ItemsEditor
            v-show="sidebarTab === 'items'"
            :items="items"
            :selected-id="selectedItemId"
            @select="(id) => (selectedItemId = id)"
            @create="handleCreateItem"
            @delete="(id) => { deleteItem(id); if (selectedItemId === id) selectedItemId = null }"
            @update="(id, patch) => updateItem(id, patch)"
          />
          <EnemiesEditor
            v-show="sidebarTab === 'enemies'"
            :enemies="enemies"
            :selected-id="selectedEnemyId"
            @select="(id) => (selectedEnemyId = id)"
            @create="handleCreateEnemy"
            @delete="(id) => { deleteEnemy(id); if (selectedEnemyId === id) selectedEnemyId = null }"
            @update="(id, patch) => updateEnemy(id, patch)"
          />
          </div>
        </template>
      </aside>
    </div>
    <DiagnosticsPanel :errors="errors" :warnings="warnings" @focus="handleDiagnosticFocus" />
  </div>
</template>

<style>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, sans-serif;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #1e1e1e;
  color: #fff;
}
.toolbar h1 {
  margin: 0;
  font-size: 1.25rem;
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.actions button,
.actions .btn {
  padding: 6px 12px;
  cursor: pointer;
}
.dropdown {
  position: relative;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #333;
  border-radius: 4px;
  padding: 4px 0;
  min-width: 120px;
  z-index: 10;
}
.dropdown-menu button {
  display: block;
  width: 100%;
  padding: 6px 12px;
  text-align: left;
  border: none;
  background: transparent;
  color: #fff;
  cursor: pointer;
}
.dropdown-menu button:hover {
  background: #444;
}
.dirty-hint {
  margin: 0;
  font-size: 0.85rem;
  color: #ffc107;
}
.autosave-label { margin: 0; font-size: 0.85rem; display: flex; align-items: center; gap: 4px; cursor: pointer; }
.autosave-error { margin: 0; font-size: 0.85rem; color: #f44336; }
.draft-info { margin: 0; font-size: 0.85rem; color: #90caf9; }
.draft-badge { margin: 0; font-size: 0.85rem; color: #1e3a8a; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 999px; padding: 2px 8px; }
.save-result {
  margin: 0;
  font-size: 0.85rem;
  color: #8bc34a;
}
.save-error {
  margin: 0;
  font-size: 0.85rem;
  color: #f44336;
}
.main {
  flex: 1;
  display: flex;
  min-height: 0;
}
.graph-area {
  flex: 1;
  min-width: 0;
}
.sidebar {
  width: 360px;
  flex-shrink: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.2s ease;
}
.sidebar.collapsed {
  width: 40px;
}
.sidebar-toggle {
  width: 100%;
  height: 32px;
  border: none;
  border-bottom: 1px solid #ddd;
  background: #f5f5f5;
  cursor: pointer;
  font-weight: 600;
}
.sidebar-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
