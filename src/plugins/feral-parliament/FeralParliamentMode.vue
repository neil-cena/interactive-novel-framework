<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'

const props = defineProps<{
  modeData: Record<string, unknown>
}>()

const emit = defineEmits<{
  exitMode: []
}>()

const playerStore = usePlayerStore()
const exitNodeId = computed(() => (props.modeData.exitNodeId as string) ?? 'cat_colony_treaty')

const sceneIndex = ref(0)

const scenes = [
  {
    gavel: 'ORDER. ORDER. THERE WILL BE ORDER.',
    speaker: 'THE CLERK OF THE HAIRBALL (tabby, tenure: unknown)',
    body: `The chamber is a laundry cavern. Socks hang from the ceiling like bunting. Someone has written "YEAR 83 — STILL NOT OUR FAULT" on a washboard in chalk.

The orange tomcat knocks a bottle cap off a crate. The bottle cap rings against stone with the resonance of a procedural gavel.

You are seated on an upturned bucket stenciled VISITOR — NON-VOTING — DO NOT PET THE MINUTES.

A motion is on the floor: whether to acknowledge your existence as (A) weather, (B) paperwork, or (C) a large mistake wearing a coat.`,
  },
  {
    gavel: 'THE WHISKERED OPPOSITION HAS THE FLOOR.',
    speaker: 'HONORABLE MEMBER FOR THE EASTERN DRAINPIPE (black, white socks)',
    body: `The honorable member does not speak. The honorable member places a dead moth on the minutes book. The moth is accepted into the record without objection.

Another member seconds the moth. A third abstains on grounds of nap.

Your diagnostic plate, which has survived crane fraud and CEA schematics, begins displaying a loading spiral and gives up.

The Clerk explains: "Ambient quorum is achieved when at least twelve souls agree that something is technically happening."

There are exactly twelve cats and you. Nobody is sure which category you count as. You are advised not to clarify.`,
  },
  {
    gavel: 'MOTION: EMERGENCY IMPORT OF FISH (OR REASONABLE FISH-SHAPED EQUIVALENT).',
    speaker: 'THE RIGHT HONOURABLE GINGER (one ear, two opinions)',
    body: `The motion passes by acclamation, which in this parliament means "everyone stared at you until you agreed it passed."

The Right Honourable Ginger taps a brass CEA button twice with a paw. The button is not wired to anything. Your instruments insist it is doing *something*.

You whisper: "That's not how anchors work."

The Clerk whispers back: "That's not how any of this works. You're adapting beautifully."

Someone begins a filibuster by falling asleep on the microphone. The filibuster is ruled authentic.`,
  },
  {
    gavel: 'RESOLUTION: BINDING (IN THE SENSE OF STRING).',
    speaker: 'PARLIAMENT OF THE CISTERN (collective, fuzzy jurisdiction)',
    body: `The colony resolves—without paper, without seal, without any respect for your training—to continue "the small sideways shove" that keeps the worst seepage from leaning on Elara's intake harder than it already does.

The cost, a cat explains without words, is paid in sheddings and attitude.

You are invited to never explain this to anyone who uses the word "throughput" in a sentence that also contains "people."

The orange tomcat head-butts your knee. It feels like a signature. It might actually be one.

The session is adjourned when a kitten steals the gavel-cap and runs into history.`,
  },
]

function advance(): void {
  if (sceneIndex.value < scenes.length - 1) {
    sceneIndex.value++
  } else {
    playerStore.navigateTo(exitNodeId.value)
    emit('exitMode')
  }
}

const scene = computed(() => scenes[sceneIndex.value]!)
const progress = computed(() => `${sceneIndex.value + 1} / ${scenes.length}`)
const isLast = computed(() => sceneIndex.value >= scenes.length - 1)
</script>

<template>
  <div
    class="feral-parliament flex min-h-[58vh] flex-col overflow-hidden rounded-xl border-4 border-orange-700 bg-gradient-to-b from-stone-950 via-orange-950/40 to-stone-950 shadow-2xl"
    role="region"
    aria-label="Feral parliament session"
  >
    <header class="border-b-4 border-dashed border-orange-600/80 bg-black/90 px-4 py-3 text-center sm:px-6">
      <p class="font-mono text-[10px] uppercase tracking-[0.35em] text-orange-500 sm:text-xs">
        Provisional Legislature of Karet Bay Annex
      </p>
      <h2 class="mt-1 font-serif text-xl font-bold tracking-tight text-orange-300 sm:text-2xl">
        THE FERAL PARLIAMENT
      </h2>
      <p class="mt-0.5 font-mono text-[10px] text-orange-700 sm:text-xs">(Visitors must supply their own bucket)</p>
    </header>

    <div class="border-b border-orange-900/60 bg-orange-950/20 px-4 py-2 sm:px-6">
      <p class="text-center font-mono text-xs font-bold uppercase tracking-widest text-orange-400">{{ scene.gavel }}</p>
      <p class="mt-1 text-center font-serif text-sm italic text-orange-200/90">{{ scene.speaker }}</p>
      <p class="mt-1 text-right font-mono text-[10px] text-orange-900">{{ progress }}</p>
    </div>

    <div class="min-h-[220px] flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
      <p
        v-for="(para, i) in scene.body.split('\n\n')"
        :key="i"
        class="mb-3 font-serif text-sm leading-relaxed text-stone-200 sm:text-base"
      >
        {{ para }}
      </p>
    </div>

    <footer class="border-t-4 border-orange-800 bg-black px-4 py-3 sm:px-6">
      <button
        type="button"
        class="w-full rounded-lg border-2 border-orange-600 bg-orange-950/50 py-3 font-mono text-sm font-bold uppercase tracking-widest text-orange-200 transition hover:bg-orange-800/40 hover:text-white"
        @click="advance"
      >
        {{ isLast ? 'Adjourn to reality' : 'Point of order (continue)' }}
      </button>
      <p class="mt-2 text-center font-mono text-[10px] text-orange-900">
        No minutes were taken. Several were chased.
      </p>
    </footer>
  </div>
</template>
