<script setup lang="ts">
import { computed } from 'vue'
import MechanicEditor from './MechanicEditor.vue'
import VisibilityEditor from './VisibilityEditor.vue'
import OnEnterActionEditor from './OnEnterActionEditor.vue'
import type { StoryNodeModel } from '../api/authoringClient'
import type { VisibilityReq } from './VisibilityEditor.vue'
import type { OnEnterAction } from './OnEnterActionEditor.vue'

const props = defineProps<{
  node: StoryNodeModel | null
  nodeIds?: string[]
  encounterIds?: string[]
  itemIds?: string[]
}>()
const emit = defineEmits<{
  'update:node': [id: string, patch: Partial<StoryNodeModel>]
  'update:choice-visibility': [nodeId: string, choiceId: string, reqs: VisibilityReq[]]
  'update:on-enter': [nodeId: string, actions: OnEnterAction[]]
}>()

const nodeIds = computed(() => props.nodeIds ?? [])
const encounterIds = computed(() => props.encounterIds ?? [])
const itemIds = computed(() => props.itemIds ?? [])

function updateText(id: string, text: string) {
  emit('update:node', id, { text })
}
function updateType(id: string, type: string) {
  emit('update:node', id, { type })
}

function updateChoices(id: string, choices: StoryNodeModel['choices']) {
  emit('update:node', id, { choices: choices ?? [] })
}

function updateChoiceLabel(id: string, index: number, label: string) {
  const choices = [...(props.node?.choices ?? [])]
  if (choices[index]) {
    choices[index] = { ...choices[index], label }
    updateChoices(id, choices)
  }
}

function updateChoiceMechanic(id: string, index: number, mechanic: Record<string, unknown>) {
  const choices = [...(props.node?.choices ?? [])]
  if (choices[index]) {
    choices[index] = { ...choices[index], mechanic }
    updateChoices(id, choices)
  }
}

function removeChoice(id: string, index: number) {
  const choices = (props.node?.choices ?? []).filter((_, i) => i !== index)
  updateChoices(id, choices)
}

function addChoice(id: string) {
  const choices = [...(props.node?.choices ?? [])]
  const nextId = `c_${id}_${choices.length + 1}`
  choices.push({
    id: nextId,
    label: 'New choice',
    mechanic: { type: 'navigate', nextNodeId: '' },
  })
  updateChoices(id, choices)
}
</script>

<template>
  <div v-if="node" class="node-inspector">
    <h3>Node: {{ node.id }}</h3>
    <div class="field">
      <label>Type</label>
      <select :value="node.type" @change="(e) => updateType(node.id, (e.target as HTMLSelectElement).value)">
        <option value="narrative">narrative</option>
        <option value="encounter">encounter</option>
        <option value="ending">ending</option>
      </select>
    </div>
    <div class="field">
      <label>Text</label>
      <textarea :value="node.text" @input="(e) => updateText(node.id, (e.target as HTMLTextAreaElement).value)" rows="4" />
    </div>
    <OnEnterActionEditor
      :actions="node.onEnter ?? []"
      :item-ids="itemIds"
      @update="(actions) => emit('update:on-enter', node.id, actions)"
    />
    <div class="choices-section">
      <h4>Choices ({{ node.choices?.length ?? 0 }})</h4>
      <div v-for="(c, idx) in node.choices" :key="c.id" class="choice-row">
        <input :value="c.label" @input="(e) => updateChoiceLabel(node.id, idx, (e.target as HTMLInputElement).value)" class="choice-label-inp" placeholder="Choice label" />
        <MechanicEditor
          :mechanic="(c.mechanic as Record<string, unknown>) ?? { type: 'navigate', nextNodeId: '' }"
          :node-ids="nodeIds"
          :encounter-ids="encounterIds"
          @update="(m) => updateChoiceMechanic(node.id, idx, m)"
        />
        <VisibilityEditor
          :requirements="c.visibilityRequirements ?? []"
          :item-ids="itemIds"
          @update="(reqs) => emit('update:choice-visibility', node.id, c.id, reqs)"
        />
        <button type="button" class="btn-remove" @click="removeChoice(node.id, idx)">Remove</button>
      </div>
      <button type="button" class="btn-add" @click="addChoice(node.id)">Add choice</button>
    </div>
  </div>
  <div v-else class="node-inspector empty">
    <p>Select a node</p>
  </div>
</template>

<style scoped>
.node-inspector { padding: 1rem; background: #fafafa; border-left: 1px solid #eee; overflow-y: auto; max-height: 100%; }
.node-inspector.empty { display: flex; align-items: center; justify-content: center; color: #999; }
.field { margin-bottom: 1rem; }
.field label { display: block; font-size: 0.85rem; color: #666; margin-bottom: 4px; }
.field select, .field textarea { width: 100%; padding: 6px 8px; }
.choices-section { margin-top: 1rem; }
.choices-section h4 { font-size: 0.9rem; margin-bottom: 6px; }
.choice-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; padding: 8px; background: #fff; border-radius: 4px; border: 1px solid #eee; }
.choice-label-inp { padding: 4px 8px; width: 100%; box-sizing: border-box; }
.btn-remove { padding: 4px 8px; cursor: pointer; align-self: flex-start; }
.btn-add { margin-top: 8px; padding: 6px 12px; cursor: pointer; }
</style>
