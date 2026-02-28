<script setup lang="ts">
import { VueFlow } from '@vue-flow/core'
import { ref, watch } from 'vue'
import type { Node, Edge } from '@vue-flow/core'

const props = defineProps<{
  flowNodes: Node[]
  flowEdges: Edge[]
  selectedId: string | null
}>()
const emit = defineEmits<{ 'select-node': [id: string | null] }>()

const vueFlowRef = ref<InstanceType<typeof VueFlow> | null>(null)

function onNodeClick(event: { node: Node }) {
  const id = event.node.id.startsWith('enc:') ? null : event.node.id
  emit('select-node', id)
}

watch(
  () => [props.flowNodes.length, props.flowEdges.length],
  () => {
    setTimeout(() => {
      const vf = vueFlowRef.value as { fitView?: () => void } | null
      vf?.fitView?.()
    }, 50)
  }
)
</script>

<template>
  <div class="graph-canvas">
    <VueFlow
      ref="vueFlowRef"
      :nodes="flowNodes"
      :edges="flowEdges"
      :default-viewport="{ zoom: 0.8 }"
      fit-view-on-init
      class="vue-flow-wrap"
      @node-click="onNodeClick"
    >
      <template #node-default="{ node, data }">
        <div
          class="custom-node"
          :class="{
            orphan: data.isOrphan,
            'dead-end': data.isDeadEnd,
            selected: selectedId === node.id,
          }"
          :style="{ backgroundColor: data.backgroundColor ?? '#f5f5f5' }"
        >
          <div class="node-label">{{ data.label }}</div>
          <div class="node-meta">{{ data.nodeType }} · {{ data.id }}</div>
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<style>
.graph-canvas {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
.vue-flow-wrap {
  width: 100%;
  height: 100%;
}
.custom-node {
  padding: 8px 12px;
  border-radius: 8px;
  border: 2px solid #ccc;
  min-width: 120px;
}
.custom-node.orphan {
  border-color: #ff9800;
}
.custom-node.dead-end {
  border-color: #f44336;
}
.custom-node.selected {
  border-color: #2196f3;
  box-shadow: 0 0 0 2px #2196f3;
}
.node-label {
  font-weight: 600;
  font-size: 12px;
}
.node-meta {
  font-size: 10px;
  color: #666;
  margin-top: 4px;
}
</style>
