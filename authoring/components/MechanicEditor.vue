<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  mechanic: Record<string, unknown> | undefined
  nodeIds: string[]
  encounterIds: string[]
}>()
const emit = defineEmits<{ update: [mechanic: Record<string, unknown>] }>()

const type = computed(() => (props.mechanic?.type as string) ?? 'navigate')

function setType(t: string) {
  const m = { ...props.mechanic }
  m.type = t
  if (t === 'navigate') {
    m.nextNodeId = m.nextNodeId ?? ''
    delete m.encounterId
    delete m.dice
    delete m.dc
    delete m.onSuccess
    delete m.onFailure
    delete m.onFailureEncounterId
    delete m.attribute
  } else if (t === 'combat_init') {
    m.encounterId = m.encounterId ?? ''
    delete m.nextNodeId
    delete m.dice
    delete m.dc
    delete m.onSuccess
    delete m.onFailure
    delete m.onFailureEncounterId
    delete m.attribute
  } else if (t === 'skill_check') {
    m.dice = m.dice ?? '1d20'
    m.dc = m.dc ?? 10
    m.onSuccess = m.onSuccess ?? { nextNodeId: '' }
    m.onFailure = m.onFailure ?? { nextNodeId: '' }
    m.attribute = m.attribute ?? 'dexterity'
    delete m.nextNodeId
    delete m.encounterId
  }
  emit('update', m)
}

function patch(partial: Record<string, unknown>) {
  emit('update', { ...props.mechanic, ...partial })
}

const ATTRIBUTES = ['strength', 'dexterity', 'intelligence'] as const
</script>

<template>
  <div class="mechanic-editor">
    <div class="field">
      <label>Type</label>
      <select :value="type" @change="(e) => setType((e.target as HTMLSelectElement).value)">
        <option value="navigate">Navigate</option>
        <option value="combat_init">Combat</option>
        <option value="skill_check">Skill check</option>
      </select>
    </div>

    <template v-if="type === 'navigate'">
      <div class="field">
        <label>Target node</label>
        <select
          :value="(mechanic?.nextNodeId as string) ?? ''"
          @change="(e) => patch({ nextNodeId: (e.target as HTMLSelectElement).value })"
        >
          <option value="">— Select —</option>
          <option v-for="id in nodeIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </div>
    </template>

    <template v-else-if="type === 'combat_init'">
      <div class="field">
        <label>Encounter</label>
        <select
          :value="(mechanic?.encounterId as string) ?? ''"
          @change="(e) => patch({ encounterId: (e.target as HTMLSelectElement).value })"
        >
          <option value="">— Select —</option>
          <option v-for="id in encounterIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </div>
    </template>

    <template v-else-if="type === 'skill_check'">
      <div class="field">
        <label>Dice</label>
        <input
          :value="(mechanic?.dice as string) ?? '1d20'"
          type="text"
          @input="(e) => patch({ dice: (e.target as HTMLInputElement).value })"
        />
      </div>
      <div class="field">
        <label>DC</label>
        <input
          :value="(mechanic?.dc as number) ?? 10"
          type="number"
          @input="(e) => patch({ dc: Number((e.target as HTMLInputElement).value) || 10 })"
        />
      </div>
      <div class="field">
        <label>Attribute</label>
        <select
          :value="(mechanic?.attribute as string) ?? 'dexterity'"
          @change="(e) => patch({ attribute: (e.target as HTMLSelectElement).value })"
        >
          <option v-for="a in ATTRIBUTES" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
      <div class="field">
        <label>On success → node</label>
        <select
          :value="((mechanic?.onSuccess as { nextNodeId?: string })?.nextNodeId) ?? ''"
          @change="(e) => patch({ onSuccess: { ...(mechanic?.onSuccess as object), nextNodeId: (e.target as HTMLSelectElement).value } })"
        >
          <option value="">— Select —</option>
          <option v-for="id in nodeIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </div>
      <div class="field">
        <label>On failure → node</label>
        <select
          :value="((mechanic?.onFailure as { nextNodeId?: string })?.nextNodeId) ?? ''"
          @change="(e) => patch({ onFailure: { ...(mechanic?.onFailure as object), nextNodeId: (e.target as HTMLSelectElement).value } })"
        >
          <option value="">— Select —</option>
          <option v-for="id in nodeIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </div>
      <div class="field">
        <label>On failure encounter (optional)</label>
        <select
          :value="(mechanic?.onFailureEncounterId as string) ?? ''"
          @change="(e) => patch({ onFailureEncounterId: (e.target as HTMLSelectElement).value || undefined })"
        >
          <option value="">— None —</option>
          <option v-for="id in encounterIds" :key="id" :value="id">{{ id }}</option>
        </select>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mechanic-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.field label {
  font-size: 0.75rem;
  color: #666;
}
.field input,
.field select {
  padding: 4px 8px;
  font-size: 0.9rem;
}
.field select {
  min-width: 0;
}
</style>
