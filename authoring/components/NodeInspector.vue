<script setup lang="ts">
import type { StoryNodeModel } from '../api/authoringClient'

const props = defineProps<{
  node: StoryNodeModel | null
}>()
const emit = defineEmits<{ 'update:node': [id: string, patch: Partial<StoryNodeModel>] }>()

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
    <div class="choices-section">
      <h4>Choices ({{ node.choices?.length ?? 0 }})</h4>
      <div v-for="(c, idx) in node.choices" :key="c.id" class="choice-row">
        <input :value="c.label" @input="(e) => updateChoiceLabel(node.id, idx, (e.target as HTMLInputElement).value)" class="choice-label-inp" />
        <template v-if="(c.mechanic as { type?: string })?.type === 'navigate'">
          <label>→ Node ID</label>
          <input :value="(c.mechanic as { nextNodeId?: string })?.nextNodeId ?? ''" @input="(e) => updateChoiceMechanic(node.id, idx, { ...c.mechanic, type: 'navigate', nextNodeId: (e.target as HTMLInputElement).value })" class="choice-mechanic-inp" />
        </template>
        <template v-else-if="(c.mechanic as { type?: string })?.type === 'combat_init'">
          <label>→ Encounter ID</label>
          <input :value="(c.mechanic as { encounterId?: string })?.encounterId ?? ''" @input="(e) => updateChoiceMechanic(node.id, idx, { ...c.mechanic, type: 'combat_init', encounterId: (e.target as HTMLInputElement).value })" class="choice-mechanic-inp" />
        </template>
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
.choices-section ul { margin: 0; padding-left: 1.2rem; font-size: 0.85rem; }
.choice-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; padding: 6px; background: #fff; border-radius: 4px; }
.choice-label-inp { flex: 1; min-width: 100px; padding: 4px 8px; }
.choice-mechanic-inp { flex: 1; min-width: 80px; padding: 4px 8px; font-family: monospace; }
.btn-remove { padding: 4px 8px; cursor: pointer; }
.btn-add { margin-top: 8px; padding: 6px 12px; cursor: pointer; }
</style>
