<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'

const props = defineProps<{
  modeData: Record<string, unknown>
}>()

const emit = defineEmits<{
  exitMode: []
}>()

const playerStore = usePlayerStore()
const exitNodeId = computed(() => (props.modeData.exitNodeId as string) ?? 'theater_revelation')

const currentScene = ref(0)
const showFinalChoices = ref(false)

const scenes = [
  {
    label: 'PROGRAMME NOTE',
    speaker: 'PETRA VOSS, ARTISTIC DIRECTOR',
    text: `Good evening, Citizens of Orvish.\n\nTonight, the Karet Bay Amateur Theatrical Society presents THE ACCEPTABLE LOSS REVUE: A Satirical Operetta in Two Acts and One Intermission That Ran Somewhat Over Budget.\n\nAll characters depicted herein are entirely fictional. Any resemblance to living persons, ongoing administrative malfeasances, or structural failures is a coincidence that we strongly advise you not to report to the CEA.\n\nPlease silence your diagnostic instruments. Do not attempt to assess the structural integrity of the stage. The stage knows.`,
  },
  {
    label: 'ACT I',
    speaker: 'THE SCHOLAR ARRIVES',
    text: `[A dock. Two crates. A crane, played with great commitment by a piece of rope.]

KAELEN (DOCKWORKER, ALSO PLAYING NARRATOR): There once was a Scholar with a ledger so fine,\nwho arrived in our district at half-past the nine.\nShe measured the crane and she measured the dock,\nshe measured the workers and she measured the clock.

SCHOLAR (played by LIRA in a borrowed coat, holding a very large ledger): Anomalous! Anomalous! Everything here!\n[consulting ledger] This crane is performing at twenty-three percent\nabove its rated structural load capacity.\nThis is suboptimal and requires documentation.

KAELEN: She wrote down a number. Then another. Then several more.\nShe did not, at this time, ask anyone their name.

MAREN (SECOND DOCKWORKER): [to audience] We have names. I just want to say that.

SCHOLAR: My calculations indicate that without intervention,\nthis crane will fail at some point between now and later.\n[very precisely] Between now and later. Thank you.\n\n[She begins measuring the water.]

KAELEN: She was very good at her job.

MAREN: [to audience] She still hadn't asked our names.`,
  },
  {
    label: 'INTERMISSION',
    speaker: 'FIFTEEN MINUTES',
    text: `[The house lights come up. Petra herself appears from the wings carrying a basket.]

PETRA: Intermission! Traditional Karet Bay theatrical tradition — the audience donates fuel blocks to support local infrastructure.

[She holds out the basket. It is, you note, genuinely full of standard fuel blocks. The basket is labeled "MAINTENANCE (NOT THEATER)."]

PETRA: This is a very important theatrical tradition. Very old. Goes back generations.

[She looks directly at you.]

PETRA: You have fuel blocks.

[Pause.]

PETRA: The basket is right there.

[A very long pause. Several cast members peek out from the wings to watch this moment unfold. Someone has brought popcorn.]`,
  },
  {
    label: 'ACT II',
    speaker: 'THE MANAGER AND THE MATHEMATICS (AN OPERETTA)',
    text: `[THE MANAGER enters. He is played by Petra in a very tall hat, an enormous coat with epaulettes, and what appears to be a pair of spectacles made from welded wire. He carries a clipboard labeled "ACCEPTABLE LOSS PROJECTIONS (Q3)." He sings.]

THE MANAGER: ♩ I've run the numbers and the numbers are clear!\n♩ Fifteen percent failure rate per year!\n♩ Distributed across the lower-cost zones,\n♩ which is just a technical term for your homes.

CHORUS (all cast members, entering with jazz hands):\n♩ That cost will come back! That cost will come back!\n♩ But it won't come back here! 'cause the math says—

THE MANAGER: ♩ I've served on three successive Council commissions!\n♩ I understand the systemic conditions!\n♩ It is not malice! It is architecture!\n♩ Please review the attached executive summary.

[He produces an extremely long executive summary. It unfurls across the entire stage. The last line reads: "IN CONCLUSION, EVERYONE IS FINE."]

KAELEN: [not singing, just standing there] My father built the seawall.

[Long silence. The Manager's jazz hands falter slightly.]

THE MANAGER: ♩ That is... a non-quantified variable... ♩

KAELEN: [still not singing] His circles are still in the foundation. He put them there so they would last.

[Longer silence. The Manager checks his clipboard several times. The clipboard does not have an answer for this.]

THE MANAGER: ♩ Next slide. ♩`,
  },
  {
    label: 'FINALE',
    speaker: 'THE WALL',
    text: `[The entire cast assembles. Someone has brought out a small model of the Karet Bay seawall. It is lovingly constructed from scrap metal, chalk circles, and what appears to be six months of genuine craft. It sits at the center of the stage. Everyone looks at it.]

PETRA: [out of character, for the first time] We've been performing this piece for four months. We keep changing the ending.

[She gestures at the model seawall.]

PETRA: At first, the ending was that the Scholar heroically saves everyone. Then we thought that was too simple. Then we tried the ending where she files the correct report and it works. Then we tried the ending where nobody wins. Then we tried the ending where the wall just doesn't fall, because one night during rehearsal, Kaelen here—

[Kaelen waves, embarrassed.]

PETRA: —accidentally over-activated the stage reinforcement circle during Act II, and we realized our model seawall was actually structurally sound now. More sound than when we started. Because he'd been using it as a practice object for Level 2 reinforcement work, and also Dima had been running drainage tests under the floor, and also I had been feeding the stage fuel reserves into the maintenance circles out of habit for four months—

[She stops. Looks at the model. Looks at the cast. Looks at you.]

PETRA: Hm.

[The model seawall stands very still. It looks extremely well-maintained.]

EVERYONE: [together, slowly] Oh.

[Curtain. Sort of. The curtain rope has been alchemically fused to the ceiling by someone during Act II. The cast stands in front of the curtain that will not close, looking at you.]`,
  },
]

function advance(): void {
  if (currentScene.value < scenes.length - 1) {
    currentScene.value++
  } else {
    showFinalChoices.value = true
  }
}

function exitNormal(): void {
  playerStore.navigateTo(exitNodeId.value)
  emit('exitMode')
}

function exitWithNotes(): void {
  const items = playerStore.inventory.items
  items['theater_report'] = (items['theater_report'] ?? 0) + 1
  playerStore.navigateTo(exitNodeId.value)
  emit('exitMode')
}

function attemptArrest(): void {
  playerStore.navigateTo('death_petra_arrested')
  emit('exitMode')
}

function joinTroupe(): void {
  playerStore.navigateTo('death_join_troupe')
  emit('exitMode')
}

const scene = computed(() => scenes[currentScene.value]!)
const progressLabel = computed(() => `${currentScene.value + 1} / ${scenes.length}`)
</script>

<template>
  <div class="theater-mode flex min-h-[60vh] flex-col rounded-lg border-2 border-amber-700 bg-slate-950 p-0 shadow-2xl">
    <!-- Header: Playbill title -->
    <div class="border-b-2 border-amber-700 bg-black px-6 py-4 text-center">
      <p class="font-mono text-xs uppercase tracking-[0.3em] text-amber-600">KARET BAY AMATEUR THEATRICAL SOCIETY</p>
      <h2 class="mt-1 font-serif text-2xl font-bold text-amber-400 sm:text-3xl">THE ACCEPTABLE LOSS REVUE</h2>
      <p class="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-amber-700">
        A SATIRICAL OPERETTA IN TWO ACTS
      </p>
    </div>

    <!-- Scene label -->
    <div class="border-b border-amber-900 bg-slate-950 px-6 pt-4">
      <div class="flex items-center justify-between">
        <p class="font-mono text-xs uppercase tracking-[0.25em] text-amber-600">{{ scene.label }}</p>
        <p class="font-mono text-xs text-slate-600">{{ progressLabel }}</p>
      </div>
      <p class="mt-0.5 pb-3 font-serif text-sm italic text-amber-500">{{ scene.speaker }}</p>
    </div>

    <!-- Scene text -->
    <div class="flex-1 overflow-y-auto px-6 py-5">
      <div class="scene-text font-mono text-sm leading-relaxed text-slate-200 sm:text-base">
        <template v-for="(line, i) in scene.text.split('\n')" :key="i">
          <span
            v-if="line.startsWith('[')"
            class="block my-1 text-xs italic text-amber-700"
          >{{ line }}</span>
          <span
            v-else-if="line.startsWith('♩')"
            class="block my-1 ml-4 text-amber-300"
          >{{ line }}</span>
          <span
            v-else-if="line.startsWith('CHORUS')"
            class="block my-1 uppercase tracking-wider text-amber-500 text-xs"
          >{{ line }}</span>
          <span
            v-else-if="line === ''"
            class="block my-2"
          ></span>
          <span v-else class="block my-0.5">{{ line }}</span>
        </template>
      </div>
    </div>

    <!-- Controls -->
    <div class="border-t border-amber-900 bg-black px-6 py-4">
      <!-- During the show -->
      <div v-if="!showFinalChoices" class="flex justify-center">
        <button
          type="button"
          class="rounded border border-amber-700 bg-slate-900 px-8 py-2 font-mono text-sm uppercase tracking-widest text-amber-400 transition hover:bg-amber-900/30 hover:border-amber-500"
          @click="advance"
        >
          {{ currentScene < scenes.length - 1 ? 'Continue →' : 'End of Programme' }}
        </button>
      </div>

      <!-- Final choices -->
      <div v-else class="flex flex-col gap-2">
        <p class="mb-2 text-center font-mono text-xs uppercase tracking-widest text-amber-700">— CURTAIN CALL —</p>
        <button
          type="button"
          class="rounded border border-amber-700 bg-slate-900 px-4 py-2 text-left font-mono text-sm text-amber-300 transition hover:bg-amber-900/20"
          @click="exitNormal"
        >
          Applaud. Leave before anyone asks questions.
        </button>
        <button
          type="button"
          class="rounded border border-slate-600 bg-slate-900 px-4 py-2 text-left font-mono text-sm text-slate-300 transition hover:bg-slate-800"
          @click="exitWithNotes"
        >
          Open your field ledger and begin documenting this. It is technically alchemy. Someone has to file a report.
        </button>
        <button
          type="button"
          class="rounded border border-red-900 bg-slate-900 px-4 py-2 text-left font-mono text-sm text-red-400 transition hover:bg-red-900/20"
          @click="attemptArrest"
        >
          <span class="font-bold">[OFFICIAL SCHOLAR ACTION]</span> Announce that unauthorized alchemy has been performed and place the cast under institutional review.
        </button>
        <button
          type="button"
          class="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-left font-mono text-sm text-slate-400 transition hover:bg-slate-800"
          @click="joinTroupe"
        >
          Ask Petra if they need a fifth cast member. You've been watching people do things today. You could play The Scholar.
        </button>
      </div>
    </div>

    <!-- Footer -->
    <div class="border-t border-amber-900 bg-black px-6 py-2 text-center">
      <p class="font-mono text-xs text-amber-900">
        "TECHNICALLY, EVERYTHING IS WITHIN ASSESSED PARAMETERS" — PATRON SAINT OF KARET BAY
      </p>
    </div>
  </div>
</template>

<style scoped>
.theater-mode {
  font-family: 'Georgia', 'Times New Roman', serif;
}
</style>
