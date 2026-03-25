/**
 * Apply prose-writer output to four nodes only. Preserves all other columns.
 * Run: node scripts/_apply-prose-pass.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'
import { readCsv } from './data-core/io.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.join(__dirname, '../data/csv/nodes.csv')
const csvDir = path.dirname(csvPath)

const TEXT = {
  seek_answers: `The pattern is pointing upward—not deeper into the slums, but toward the CEA's own infrastructure.

You have enough to demand answers. The crane's unauthorized reinforcement, the drainage signatures you've mapped, and every other thread you've pulled since morning—including Elara's purifier, if you traced the runoff that far—all point the same way: this district's infrastructure has been systematically starved. The question is who decided to starve it.

The CEA district office is at the top of the administrative quarter. You walk toward it through streets that never quite empty—foot traffic, handcarts, the low rhythm of work that does not wait on any single bell—past children who have not yet learned to carry the particular exhaustion of the district on their faces. You pass the Drowning plaque again. Someone has left a single flower at its base. The flower is wilting.

You stop for a moment at the plaque. You have cited the Drowning incident three times in your work. From inside the district, the memorial reads less like a citation and more like a receipt—three sentences of formal accountability, polished thin by weather and by the habit of being read.`,

  post_crane_pattern: `The crane incident is behind you—however it resolved—and the district is still standing around it, unchanged. The quota clock still runs. Workers still move. The bay still smells of brine and old fuel. Life in Karet Bay doesn't wait for a Scholar to finish processing its problems.

You walk for a while without taking notes. Down to the water and back. Through the narrow streets between the warehouses, where the buildings lean slightly toward each other as though for warmth.

A family eats lunch on a doorstep—children, a grandmother, someone's dog asleep across everyone's feet. Two old men play a game on a crate, moving pieces made from stamped copper. A woman hangs laundry between two alchemically reinforced posts; the reinforcement is crude, clearly improvised, and the posts wobble slightly when the wind takes the sheets. She adjusts the line without looking up, in the practiced way of someone who has made something work that wasn't designed to work.

This is a place where people live. You write that down. You're not sure why.

Then you walk back toward the dock infrastructure and open your diagnostic plate again—and the district becomes, once more, a problem.

The pattern is everywhere once you know to look: improvised reinforcement circles in Tier 0 paste on load-bearing structures, water pipes bonded with materials already developing micro-fractures, the steady background noise of a system running on patch work because the materials for proper maintenance aren't available. The root problem isn't skill. It's the material allocation. Someone has been steering the requisitions so the flow on paper and the flow through the district are not the same exchange.`,

  start: `The 0500 bell sends a low vibration through the stone walls of the Measured Scholars' dormitory. You open your eyes to the familiar grey ceiling, its cracks mapped in your memory like the trade routes on your study charts.

Your name is Vael. Junior Field Evaluator, Measured Scholars. Twenty-three years old and already trusted with district-level field assessments. You are good at what you do: observation, calculation, the patient art of finding where the cost actually went. The less patient art of finding truth in people has, so far, never featured in the formal curriculum.

The morning air carries the sharp mineral smell of alchemical fuel blocks burning in the city's infrastructure converters—the deep machinery that keeps Orvish's water, heat, and structural maintenance running. Through the narrow window, the spires of the upper city catch the first pale light while the lower districts still sleep beneath a blanket of industrial haze. It is, from this safe altitude, almost picturesque.

Your field kit sits open on the desk: three pre-inscribed diagnostic plates, a pouch of chalk, calipers and stress gauges, and a sealed case holding your Tier 2 fuel blocks. Enough for a day's serious assessment work. Your ledger lies open beside it, yesterday's unfinished calculations waiting patiently for the version of you that will inevitably be too tired to finish them.`,

  epilogue_cea: `Dawn breaks over Karet Bay. Emergency crews have been working all night. Seventeen people are confirmed dead from the tenement collapse. Forty-three injured. The seawall breach is being temporarily reinforced with emergency materials that were apparently available all along when the situation became visible enough to require them. Interesting.

A CEA official finds you sitting on a chunk of broken masonry at first light and reads your preliminary report. He nods approvingly. 'Controlled failure mitigation. Excellent methodology, Scholar. You saved the district.'

You look at the sheet-covered forms being carried from the rubble. Seventeen of them.

In the days that follow, the CEA formally commends your assessment and decision-making. Controlled failure mitigation becomes a referenced protocol. Your name appears in technical documents. Senior scholars speak of you with something approaching awe. You are given a better office.

Nobody in Karet Bay speaks of you at all.

But Dima—Kaelen's youngest crew member—has started learning structural alchemy from a Freehand teacher, a woman whose name never made it into your paperwork. She was heard telling him: 'You need to know this because no one should ever have to make the choice that Scholar made. We give you knowledge so the exchange has more options.'

He asked her once what she thought of the Scholar who saved the district. She was quiet for a while. Then she said: 'I think they made the calculation correctly. I think the calculation was missing something important. I think they'll spend the rest of their life trying to figure out what it was.'

She didn't say that was a bad thing.

Your calculation was correct. You will spend the rest of your career wondering what correct means.

**[ENDING: THE PERFECT CALCULATION]**

*The Scholar's interpretation of Red Harrow: 'It wasn't a miracle. It was minimized loss.'*`,
}

const raw = fs.readFileSync(csvPath, 'utf8')
const headerLine = raw.split(/\r?\n/)[0]
const fields = Papa.parse(headerLine, { header: false }).data[0]
if (fields.length !== 35) throw new Error(`Expected 35 columns, got ${fields.length}`)

const rows = readCsv(csvDir, 'nodes.csv')
for (const id of Object.keys(TEXT)) {
  const r = rows.find((x) => x.id === id)
  if (!r) throw new Error(`Missing ${id}`)
  r.text = TEXT[id]
}

const data = rows.map((r) => fields.map((f) => (r[f] == null ? '' : String(r[f]))))
const out = Papa.unparse({ fields, data }, { newline: '\r\n' })
fs.writeFileSync(csvPath, out, 'utf8')
readCsv(csvDir, 'nodes.csv')
console.log('Applied prose pass:', Object.keys(TEXT).join(', '))
