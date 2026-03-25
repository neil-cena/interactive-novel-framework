/**
 * Apply proofread fixes via readCsv → mutate → Papa.unparse (preserves 35 columns).
 * Run: node scripts/_proofread-roundtrip.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Papa from 'papaparse'
import { readCsv } from './data-core/io.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.join(__dirname, '../data/csv/nodes.csv')
const csvDir = path.dirname(csvPath)

const raw = fs.readFileSync(csvPath, 'utf8')
const headerLine = raw.split(/\r?\n/)[0]
const fields = Papa.parse(headerLine, { header: false }).data[0]
if (fields.length !== 35) {
  throw new Error(`Expected 35 header columns, got ${fields.length}`)
}

let rows = readCsv(csvDir, 'nodes.csv')

function byId(id) {
  const r = rows.find((x) => x.id === id)
  if (!r) throw new Error(`Missing node ${id}`)
  return r
}

// --- post_crane_pattern: repair shifted choice 4 ---
const post = byId('post_crane_pattern')
post.choice4_id = 'c_post_4'
post.choice4_label =
  "Dima's notebook still circles a building with music and odd emissions—follow it now."
post.choice4_visibility = 'has_flag:kaelen_crane_assessed|has_flag:dima_met|has_flag:saw_the_city'
post.choice4_mechanic = 'navigate:dima_notebook'
post.choice4_onselect = ''

// --- seek_answers ---
byId('seek_answers').text = byId('seek_answers').text.replace(
  /You have enough to demand answers\. Between the crane, Elara's purifier, and the drainage patterns, the picture is clear:/,
  "You have enough to demand answers. The crane's unauthorized reinforcement, the drainage signatures you've mapped, and every other thread you've pulled since morning—including Elara's purifier, if you traced the runoff that far—all point the same way:",
)

// --- cea_building_exterior ---
const cea = byId('cea_building_exterior')
cea.text = cea.text.replace(
  /The fact that it's parked outside the CEA building says they were working the same problem\.\r?\n\r?\nYou go inside\./,
  "The fact that it's parked outside the CEA building says they were working the same problem.\n\nThe Authority's entrance is a few steps away. The folding desk across the street is a different door into the same question—which you open first is up to you.",
)

// --- kaelen_shows: warn gate before death_touch_mod ---
const ks = byId('kaelen_shows')
ks.choice4_id = 'c_shows_4'
ks.choice4_label =
  'Reach toward the active line with a bare hand—the plate says the field is live; your nerves want to disagree.'
ks.choice4_visibility = ''
ks.choice4_mechanic = 'navigate:death_touch_warn'
ks.choice4_onselect = ''

// --- evacuation_coordination → evac_official ---
const ev = byId('evacuation_coordination')
ev.choice3_id = 'c_evac_3'
ev.choice3_label =
  'Call the CEA emergency line—put the failure on record before you improvise.'
ev.choice3_visibility = ''
ev.choice3_mechanic = 'navigate:evac_official'
ev.choice3_onselect = ''

// --- death_touch_mod opening (warn path) ---
const dtm = byId('death_touch_mod')
dtm.text = dtm.text.replace(
  /^Before Kaelen can stop you, your scholarly curiosity gets the better of your scholarly self-preservation\. You reach out and touch the active reinforcement circle with your bare finger\./,
  'You already had the warning. Your scholarly curiosity still gets the better of your scholarly self-preservation. You reach out and touch the active reinforcement circle with your bare finger.',
)

// --- Remove legacy orphan ending_chronicler ---
rows = rows.filter((r) => r.id !== 'ending_chronicler')

// --- Insert death_touch_warn before death_touch_mod ---
const dtwText = `Kaelen's hand closes on your wrist before your fingers cross the chalk. 'Don't,' he says quietly—too quietly for theater, loud enough for the crew. 'That's live reinforcement. Discharge follows the path of least resistance. Right now that's shaped like a Scholar with wet palms and a guilty conscience. My people use gloves. Grounded tools. You have a plate—use it without inventing new data points.'

You can step back into what you already measured. You can ask him to prove the reading another way. Or you can finish the thought your body started before your ethics caught up.`

const template = byId('start')
const deathWarn = {}
for (const f of fields) {
  deathWarn[f] = template[f] ?? ''
}
deathWarn.id = 'death_touch_warn'
deathWarn.type = 'narrative'
deathWarn.text = dtwText
deathWarn.image = ''
deathWarn.onEnter = ''
deathWarn.choice1_id = 'c_dtw_1'
deathWarn.choice1_label = 'Step back. The plate already told you enough.'
deathWarn.choice1_visibility = ''
deathWarn.choice1_mechanic = 'navigate:kaelen_shows'
deathWarn.choice1_onselect = ''
deathWarn.choice2_id = 'c_dtw_2'
deathWarn.choice2_label = 'Ask for a grounded demonstration—no skin contact.'
deathWarn.choice2_visibility = ''
deathWarn.choice2_mechanic = 'navigate:kaelen_shows'
deathWarn.choice2_onselect = ''
deathWarn.choice3_id = 'c_dtw_3'
deathWarn.choice3_label = 'Touch the line anyway. One fingertip. For the ledger.'
deathWarn.choice3_visibility = ''
deathWarn.choice3_mechanic = 'navigate:death_touch_mod'
deathWarn.choice3_onselect = ''
deathWarn.choice4_id = ''
deathWarn.choice4_label = ''
deathWarn.choice4_visibility = ''
deathWarn.choice4_mechanic = ''
deathWarn.choice4_onselect = ''
deathWarn.choice5_id = ''
deathWarn.choice5_label = ''
deathWarn.choice5_visibility = ''
deathWarn.choice5_mechanic = ''
deathWarn.choice5_onselect = ''
deathWarn.choice6_id = ''
deathWarn.choice6_label = ''
deathWarn.choice6_visibility = ''
deathWarn.choice6_mechanic = ''
deathWarn.choice6_onselect = ''

const dti = rows.findIndex((r) => r.id === 'death_touch_mod')
if (dti === -1) throw new Error('death_touch_mod not found')
rows.splice(dti, 0, deathWarn)

const data = rows.map((r) => fields.map((f) => (r[f] == null ? '' : String(r[f]))))
const out = Papa.unparse({ fields, data }, { newline: '\r\n' })
fs.writeFileSync(csvPath, out, 'utf8')

readCsv(csvDir, 'nodes.csv')
console.log('Round-trip OK:', csvPath)
