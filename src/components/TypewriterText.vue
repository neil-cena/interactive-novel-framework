<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    charsPerSecond?: number
    skipOnClick?: boolean
    autoStart?: boolean
    /** When this key changes, animation restarts (e.g. node id). */
    restartKey?: string
  }>(),
  {
    charsPerSecond: 30,
    skipOnClick: true,
    autoStart: true,
    restartKey: '',
  },
)

const emit = defineEmits<{
  started: []
  completed: []
  skipped: []
}>()

const visibleLength = ref(0)
const isComplete = ref(false)
const isSkipped = ref(false)
let timerId: ReturnType<typeof setInterval> | null = null

const reducedMotion = ref(false)
let mediaQueryList: MediaQueryList | null = null

function checkReducedMotion(): void {
  try {
    reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    reducedMotion.value = false
  }
}

const displayText = computed(() => {
  if (reducedMotion.value || isSkipped.value) return props.text
  return props.text.slice(0, visibleLength.value)
})

function start(): void {
  visibleLength.value = 0
  isComplete.value = false
  isSkipped.value = false
  if (timerId) clearInterval(timerId)
  timerId = null

  if (reducedMotion.value || !props.text) {
    visibleLength.value = props.text.length
    isComplete.value = true
    emit('completed')
    return
  }

  emit('started')
  if (!props.autoStart) return

  const interval = props.charsPerSecond > 0 ? 1000 / props.charsPerSecond : 0
  if (interval <= 0) {
    visibleLength.value = props.text.length
    isComplete.value = true
    emit('completed')
    return
  }

  timerId = setInterval(() => {
    visibleLength.value += 1
    if (visibleLength.value >= props.text.length) {
      if (timerId) clearInterval(timerId)
      timerId = null
      isComplete.value = true
      emit('completed')
    }
  }, interval)
}

function skip(): void {
  if (isComplete.value || isSkipped.value) return
  if (timerId) clearInterval(timerId)
  timerId = null
  visibleLength.value = props.text.length
  isComplete.value = true
  isSkipped.value = true
  emit('skipped')
  emit('completed')
}

function handleClick(): void {
  if (props.skipOnClick && !isComplete.value) skip()
}

onMounted(() => {
  checkReducedMotion()
  mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)')
  mediaQueryList.addEventListener('change', checkReducedMotion)
  start()
})

onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId)
  if (mediaQueryList) mediaQueryList.removeEventListener('change', checkReducedMotion)
})

watch(
  () => [props.text, props.restartKey],
  () => start(),
)

onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId)
})
</script>

<template>
  <p
    class="whitespace-pre-line text-base text-slate-100"
    :class="{ 'cursor-pointer': skipOnClick && !isComplete }"
    role="paragraph"
    aria-live="polite"
    :aria-busy="!isComplete && !isSkipped"
    @click="handleClick"
  >
    {{ displayText }}
    <span v-if="!isComplete && !isSkipped && !reducedMotion" class="animate-pulse" aria-hidden="true">|</span>
  </p>
</template>
