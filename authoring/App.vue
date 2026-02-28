<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import GraphCanvas from './components/GraphCanvas.vue'
import NodeInspector from './components/NodeInspector.vue'
import DiagnosticsPanel from './components/DiagnosticsPanel.vue'
import { useAuthoringData } from './composables/useAuthoringData'

const {
  flowElements,
  selectedNodeId,
  nodes,
  errors,
  warnings,
  loading,
  saveResult,
  load,
  save,
  validate,
  selectNode,
  updateNode,
} = useAuthoringData()
const saveError = ref<string | null>(null)

const selectedNode = computed(() =>
  selectedNodeId.value ? nodes.value[selectedNodeId.value] ?? null : null
)

async function doSave() {
  saveError.value = null
  try {
    await save()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(() => load())
</script>

<template>
  <div class="app">
    <header class="toolbar">
      <h1>Story Authoring</h1>
      <div class="actions">
        <button :disabled="loading" @click="load">Load</button>
        <button :disabled="loading" @click="validate">Validate</button>
        <button :disabled="loading" @click="doSave">Save</button>
      </div>
      <p v-if="saveResult" class="save-result">Saved. {{ saveResult.written.length }} file(s) written.</p>
      <p v-else-if="saveError" class="save-error">Save failed: {{ saveError }}</p>
    </header>
    <div class="main">
      <div class="graph-area">
        <GraphCanvas
          :flow-nodes="flowElements.flowNodes"
          :flow-edges="flowElements.flowEdges"
          :selected-id="selectedNodeId"
          @select-node="selectNode"
        />
      </div>
      <aside class="sidebar">
        <NodeInspector
          :node="selectedNode"
          @update:node="(id, patch) => updateNode(id, patch)"
        />
      </aside>
    </div>
    <DiagnosticsPanel :errors="errors" :warnings="warnings" />
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
}
.actions button {
  padding: 6px 12px;
  cursor: pointer;
}
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
  width: 320px;
  flex-shrink: 0;
  min-height: 0;
  overflow: auto;
}
</style>
