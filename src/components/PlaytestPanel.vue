<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlaytestMode } from '../composables/usePlaytestMode'
import type { PlayerAttributes } from '../types/player'

const PLAYTEST_HOTKEY = 'Ctrl+Shift+P'

const {
  isPlaytestEnabled,
  isOpen,
  toggle,
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
} = usePlaytestMode()

const filterText = ref('')
const filterType = ref('')
const teleportTarget = ref('')
const flagKey = ref('')
const flagValue = ref(true)
const itemId = ref('')
const itemQty = ref(1)
const hpDelta = ref(0)
const currencyDelta = ref(0)
const xpDelta = ref(50)

const filteredNodes = computed(() => {
  let list = nodeList.value
  if (filterType.value) {
    list = list.filter((n) => n.type === filterType.value)
  }
  if (filterText.value.trim()) {
    const q = filterText.value.toLowerCase()
    list = list.filter((n) => n.id.toLowerCase().includes(q) || n.text.toLowerCase().includes(q))
  }
  return list
})

const attrs: (keyof PlayerAttributes)[] = ['strength', 'dexterity', 'intelligence']
</script>

<template>
  <template v-if="isPlaytestEnabled">
    <button
      type="button"
      class="playtest-toggle"
      :class="{ open: isOpen }"
      :title="`${PLAYTEST_HOTKEY}`"
      @click="toggle"
    >
      QA
    </button>
    <div v-show="isOpen" class="playtest-panel">
      <div class="playtest-header">
        <h3>Playtest</h3>
        <button type="button" @click="toggle">Close</button>
      </div>
      <section class="playtest-section">
        <h4>Teleport</h4>
        <div class="row">
          <input v-model="filterText" placeholder="Filter by ID/text" />
          <select v-model="filterType">
            <option value="">All types</option>
            <option value="narrative">narrative</option>
            <option value="encounter">encounter</option>
            <option value="ending">ending</option>
          </select>
        </div>
        <select v-model="teleportTarget" size="6" class="node-list">
          <option v-for="n in filteredNodes" :key="n.id" :value="n.id">
            {{ n.id }} — {{ n.text }}
          </option>
        </select>
        <button type="button" @click="teleport(teleportTarget)">Go to node</button>
      </section>
      <section class="playtest-section">
        <h4>State</h4>
        <pre class="state-pre">{{ JSON.stringify(stateSnapshot, null, 2) }}</pre>
      </section>
      <section class="playtest-section">
        <h4>Flags</h4>
        <div class="row">
          <input v-model="flagKey" placeholder="Flag key" />
          <label><input v-model="flagValue" type="checkbox" /> true</label>
          <button type="button" @click="flagKey && setFlag(flagKey, flagValue)">Set</button>
        </div>
      </section>
      <section class="playtest-section">
        <h4>Items</h4>
        <div class="row">
          <input v-model="itemId" placeholder="Item ID" />
          <input v-model.number="itemQty" type="number" min="1" />
          <button type="button" @click="itemId && addItem(itemId, itemQty)">Add</button>
          <button type="button" @click="itemId && removeItem(itemId, itemQty)">Remove</button>
        </div>
      </section>
      <section class="playtest-section">
        <h4>Vitals</h4>
        <div class="row">
          <input v-model.number="hpDelta" type="number" placeholder="HP delta" />
          <button type="button" @click="adjustHp(hpDelta)">HP</button>
          <input v-model.number="currencyDelta" type="number" placeholder="Currency delta" />
          <button type="button" @click="adjustCurrency(currencyDelta)">Currency</button>
        </div>
      </section>
      <section class="playtest-section">
        <h4>Progression</h4>
        <div class="row">
          <input v-model.number="xpDelta" type="number" />
          <button type="button" @click="grantXp(xpDelta)">Grant XP</button>
          <span v-for="attr in attrs" :key="attr">
            <button type="button" @click="grantAttributePoint(attr)">+1 {{ attr }}</button>
          </span>
        </div>
      </section>
      <section class="playtest-section">
        <button type="button" class="btn-reset" @click="resetToDefaults">Reset to defaults</button>
      </section>
    </div>
  </template>
</template>

<style scoped>
.playtest-toggle {
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 9998;
  padding: 6px 10px;
  font-size: 12px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.playtest-toggle.open {
  background: #1976d2;
}
.playtest-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 360px;
  max-width: 95vw;
  max-height: 100vh;
  z-index: 9999;
  background: #1e1e1e;
  color: #e0e0e0;
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  font-size: 12px;
}
.playtest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #444;
}
.playtest-header h3 {
  margin: 0;
  font-size: 14px;
}
.playtest-section {
  padding: 8px 12px;
  border-bottom: 1px solid #333;
}
.playtest-section h4 {
  margin: 0 0 6px 0;
  font-size: 12px;
  color: #aaa;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.row input,
.row select {
  padding: 4px 6px;
  font-size: 12px;
}
.node-list {
  width: 100%;
  margin-bottom: 6px;
}
.state-pre {
  margin: 0;
  font-size: 10px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
.btn-reset {
  padding: 8px 12px;
  background: #c62828;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
