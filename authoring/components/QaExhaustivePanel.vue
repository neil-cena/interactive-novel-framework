<script setup lang="ts">
import { ref } from 'vue'
import { runQaExhaustiveOnApi, type AuthoringModel } from '../api/authoringClient'

const props = defineProps<{
  model: AuthoringModel
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const copyMessage = ref<string | null>(null)
const preview = ref('')
const lastMarkdown = ref('')
const lastEnvelope = ref<{ version: string; profileId: string; mergedOutcome: string } | null>(null)

async function runQa() {
  loading.value = true
  error.value = null
  try {
    const { markdown, qaEnvelope } = await runQaExhaustiveOnApi(props.model)
    lastMarkdown.value = markdown
    lastEnvelope.value = qaEnvelope ?? null
    const cap = 14_000
    preview.value =
      markdown.length > cap ? `${markdown.slice(0, cap)}\n\n… (${markdown.length} chars total — export for full report)` : markdown
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    preview.value = ''
    lastMarkdown.value = ''
    lastEnvelope.value = null
  } finally {
    loading.value = false
  }
}

function exportMd() {
  if (!lastMarkdown.value) return
  const blob = new Blob([lastMarkdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `qa-report-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
}

async function copyReport() {
  copyMessage.value = null
  if (!lastMarkdown.value) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(lastMarkdown.value)
      copyMessage.value = 'Copied full report to clipboard.'
      return
    }
    throw new Error('no_clipboard_api')
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = lastMarkdown.value
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      copyMessage.value = ok ? 'Copied full report to clipboard.' : 'Copy failed — use Export.'
    } catch {
      copyMessage.value = 'Copy failed — use Export.'
    }
  }
}
</script>

<template>
  <section class="qa-panel" aria-label="Structural QA">
    <h2 class="qa-title">Structural QA</h2>
    <p class="qa-hint">
      Enumerates <strong>all structural paths</strong> from release starts (visibility ignored) until each branch
      hits an ending, a loop on the path, a trap, or an encounter sink. JSON lists sample playthroughs only for
      <strong>defective</strong> outcomes (loops, traps, encounter sinks); healthy endings appear in counts only.
      Large graphs may hit time/step caps.
    </p>
    <div class="qa-actions">
      <button type="button" class="btn" :disabled="loading" @click="runQa">
        {{ loading ? 'Running…' : 'Run structural QA' }}
      </button>
      <button
        type="button"
        class="btn secondary"
        :disabled="!lastMarkdown"
        aria-label="Copy full Markdown report to clipboard"
        @click="copyReport"
      >
        Copy report
      </button>
      <button type="button" class="btn secondary" :disabled="!lastMarkdown" @click="exportMd">Export report (.md)</button>
    </div>
    <p v-if="copyMessage" class="qa-copy-msg" role="status">{{ copyMessage }}</p>
    <p v-if="lastEnvelope" class="qa-envelope" role="status">
      Report envelope v{{ lastEnvelope.version }} — outcome:
      <strong>{{ lastEnvelope.mergedOutcome }}</strong>
      ({{ lastEnvelope.profileId }})
    </p>
    <p v-if="error" class="qa-error" role="alert">{{ error }}</p>
    <pre v-if="preview" class="qa-preview">{{ preview }}</pre>
  </section>
</template>

<style scoped>
.qa-panel {
  border-top: 1px solid #333;
  padding: 12px 16px;
  background: #121212;
  color: #e0e0e0;
  max-height: 40vh;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.qa-title {
  margin: 0;
  font-size: 1rem;
}
.qa-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #aaa;
}
.qa-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn.secondary {
  opacity: 0.95;
  border: 1px solid #555;
  background: #2a2a2a;
  color: #fff;
}
.qa-copy-msg {
  margin: 0;
  font-size: 0.8rem;
  color: #8c8;
}
.qa-envelope {
  margin: 0;
  font-size: 0.75rem;
  color: #9cf;
}
.qa-error {
  color: #f66;
  margin: 0;
  font-size: 0.85rem;
}
.qa-preview {
  margin: 0;
  padding: 8px;
  background: #0d0d0d;
  border: 1px solid #333;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: auto;
  flex: 1;
  min-height: 80px;
  max-height: 28vh;
}
</style>
