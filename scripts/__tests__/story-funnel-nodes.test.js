import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv } from '../data-core/io.js'
import { parseNodes, parseItems, parseEnemies, parseEncounters, validateData } from '../build-data.js'
import { analyzeGraph } from '../data-core/graph.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const csvDir = path.resolve(__dirname, '../../data/csv')

const ALLOWED_START_IDS = new Set(['n_start', 'start'])

describe('story funnel (post-crane hub)', () => {
  it('post_crane_pattern: plaque thread ends day at transition; sets mireth_warned; other threads hit transition_end_day_one; gated visibility preserved', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const post = nodes.post_crane_pattern
    expect(post.choices).toHaveLength(5)
    expect(post.choices.map((c) => c.id)).toEqual(['c_post_1', 'c_post_2', 'c_post_3', 'c_post_4', 'c_post_5'])
    const toTransition = { type: 'navigate', nextNodeId: 'transition_end_day_one' }
    expect(post.choices[0].mechanic).toEqual(toTransition)
    expect(post.choices[1].mechanic).toEqual(toTransition)
    expect(post.choices[3].mechanic).toEqual(toTransition)
    const plaqueChoice = post.choices.find((c) => c.id === 'c_post_3')
    expect(plaqueChoice?.mechanic).toEqual(toTransition)
    expect(plaqueChoice?.visibilityRequirements).toEqual([{ type: 'has_flag', key: 'kaelen_crane_assessed' }])
    expect(plaqueChoice?.onSelect).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'set_flag', key: 'mireth_warned', value: true })]),
    )
    const dimaNb = post.choices.find((c) => c.id === 'c_post_4')
    expect(dimaNb?.visibilityRequirements).toEqual([
      { type: 'has_flag', key: 'kaelen_crane_assessed' },
      { type: 'has_flag', key: 'dima_met' },
      { type: 'has_flag', key: 'saw_the_city' },
    ])
    const dimaTalk = post.choices.find((c) => c.id === 'c_post_5')
    expect(dimaTalk?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'dima_encounter' })
    expect(dimaTalk?.visibilityRequirements).toEqual([{ type: 'not_has_flag', key: 'dima_met' }])
  })

  it('transition_end_day_one offers main spine (track + seawall) and gated Dima notebook (no Mireth field node)', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const td1 = nodes.transition_end_day_one
    expect(td1.choices).toHaveLength(3)
    expect(td1.choices.map((c) => c.id)).toEqual(['c_td1_1', 'c_td1_2', 'c_td1_3'])
    expect(td1.choices[0].mechanic).toEqual({ type: 'navigate', nextNodeId: 'track_disturbance' })
    expect(td1.choices[1].mechanic).toEqual({ type: 'navigate', nextNodeId: 'seawall_first_look' })
    const dimaNb = td1.choices.find((c) => c.id === 'c_td1_3')
    expect(dimaNb?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'dima_notebook' })
    expect(dimaNb?.visibilityRequirements).toEqual([
      { type: 'has_flag', key: 'kaelen_crane_assessed' },
      { type: 'has_flag', key: 'dima_met' },
      { type: 'has_flag', key: 'saw_the_city' },
    ])
  })

  it('freehands_contact does not offer a direct jump to the safehouse', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const fh = nodes.freehands_contact
    const targets = fh.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(targets).not.toContain('freehands_safehouse')
    expect(fh.choices).toHaveLength(1)
  })

  it('track_disturbance is the sole entry to warehouse_approach from the post-crane graph', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const itemsRows = readCsv(csvDir, 'items.csv')
    const enemiesRows = readCsv(csvDir, 'enemies.csv')
    const encountersRows = readCsv(csvDir, 'encounters.csv')
    const nodes = parseNodes(nodesRows)
    const items = parseItems(itemsRows)
    const enemies = parseEnemies(enemiesRows)
    const encounters = parseEncounters(encountersRows)

    const warehouseInbound = Object.entries(nodes).filter(([, n]) =>
      (n.choices ?? []).some(
        (c) => c.mechanic?.type === 'navigate' && c.mechanic.nextNodeId === 'warehouse_approach',
      ),
    )
    expect(warehouseInbound.map(([id]) => id)).toEqual(['track_disturbance'])

    const { errors } = validateData(nodes, items, enemies, encounters)
    expect(errors).toEqual([])

    const { diagnostics } = analyzeGraph(nodes, encounters, { allowedStartIds: ALLOWED_START_IDS })
    const whOrphans = diagnostics.filter(
      (d) => d.code === 'DATA008' && d.context?.nodeId === 'warehouse_approach',
    )
    expect(whOrphans).toEqual([])
  })

  it('dock_overview reaches dima_edge_early; kaelen_shows does not sideline to dima; post_crane_pattern offers dima_encounter', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const dockTargets = nodes.dock_overview.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(dockTargets).toContain('dima_edge_early')
    expect(dockTargets).not.toContain('dima_encounter')
    const showsTargets = nodes.kaelen_shows.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(showsTargets).not.toContain('dima_encounter')
    const postTargets = nodes.post_crane_pattern.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(postTargets).toContain('dima_encounter')
  })

  it('dima_encounter cannot jump to removed mireth_field_visit; no node navigates to mireth_field_visit', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const dima = nodes.dima_encounter
    const toMireth = dima.choices.filter(
      (c) => c.mechanic?.type === 'navigate' && c.mechanic.nextNodeId === 'mireth_field_visit',
    )
    expect(toMireth).toHaveLength(0)

    const mirethInbound = Object.entries(nodes).filter(([, n]) =>
      (n.choices ?? []).some(
        (c) => c.mechanic?.type === 'navigate' && c.mechanic.nextNodeId === 'mireth_field_visit',
      ),
    )
    expect(mirethInbound.map(([id]) => id).sort()).toEqual([])

    const onEnter = nodes.dima_encounter.onEnter ?? []
    expect(onEnter.some((a) => a.action === 'set_flag' && a.key === 'dima_met' && a.value === true)).toBe(true)

    const backToCrane = { type: 'navigate', nextNodeId: 'post_crane_pattern' }
    expect(nodes.dima_encounter.choices.find((c) => c.id === 'c_dima_1')?.mechanic).toEqual(backToCrane)
    expect(nodes.dima_encounter.choices.find((c) => c.id === 'c_dima_1')?.visibilityRequirements).toBeUndefined()
    expect(nodes.dima_encounter.choices.find((c) => c.id === 'c_dima_4')?.visibilityRequirements).toEqual([
      { type: 'has_flag', key: 'saw_the_city' },
      { type: 'not_has_flag', key: 'declined_theater_chronicler_path' },
      { type: 'has_flag', key: 'fiction_day_2' },
    ])

    for (const c of nodes.dima_encounter.choices ?? []) {
      expect(String(c.label).toLowerCase(), `choice ${c.id} spoils foreman's name before intro`).not.toContain(
        'kaelen',
      )
    }
  })

  it('dima_notebook cannot reach theater or freehands until after the crane assessment beat', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const nb = nodes.dima_notebook
    const needsCrane = [{ type: 'has_flag', key: 'kaelen_crane_assessed' }]
    expect(nb.choices.find((c) => c.id === 'c_nb_1')?.visibilityRequirements).toEqual(needsCrane)
    expect(nb.choices.find((c) => c.id === 'c_nb_2')?.visibilityRequirements).toEqual(needsCrane)
    expect(nb.choices.find((c) => c.id === 'c_nb_3')?.visibilityRequirements).toEqual([
      { type: 'not_has_flag', key: 'kaelen_crane_assessed' },
    ])
    expect(nb.choices.find((c) => c.id === 'c_nb_3')?.mechanic).toEqual({
      type: 'navigate',
      nextNodeId: 'meet_kaelen',
    })
  })

  it('kaelen_shows onEnter sets kaelen_crane_assessed after the crane assessment beat', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const onEnter = nodes.kaelen_shows.onEnter ?? []
    expect(
      onEnter.some((a) => a.action === 'set_flag' && a.key === 'kaelen_crane_assessed' && a.value === true),
    ).toBe(true)
  })
})

describe('story funnel (commitment thresholds)', () => {
  it('chronicler_commitment only advances to doc_planning after alt_chronicler_committed (no return to seawall)', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.chronicler_commitment
    const targets = node.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(targets).toContain('doc_planning')
    expect(targets).not.toContain('race_to_seawall')
    const chron1 = node.choices.find((c) => c.id === 'c_chron_1')
    expect(chron1?.visibilityRequirements).toEqual([{ type: 'has_flag', key: 'alt_chronicler_committed' }])
  })

  it('line_crew_meeting offers a walk-away exit to seek_answers (hidden after alt_line_committed)', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.line_crew_meeting
    expect(node.choices).toHaveLength(4)
    const targets = node.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(targets).toContain('seek_answers')
    const lcm4 = node.choices.find((c) => c.id === 'c_lcm_4')
    expect(lcm4?.visibilityRequirements).toEqual([{ type: 'not_has_flag', key: 'alt_line_committed' }])
  })

  it('Red Balance alt-string: night_district routes to alt_red_entry; ash_proposition gates on alt_red_committed', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const night5 = nodes.night_district.choices.find((c) => c.id === 'c_night_5')
    expect(night5?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'alt_red_entry' })
    expect(night5?.visibilityRequirements.some((r) => r.type === 'not_has_flag' && r.key === 'alt_red_committed')).toBe(true)
    const ap = nodes.ash_proposition
    expect(ap.choices.find((c) => c.id === 'c_ap_1')?.visibilityRequirements).toEqual([
      { type: 'has_flag', key: 'alt_red_committed' },
    ])
    expect(ap.choices.find((c) => c.id === 'c_ap_2')?.visibilityRequirements).toEqual([
      { type: 'has_flag', key: 'alt_red_committed' },
    ])
    expect(ap.choices.find((c) => c.id === 'c_ap_3')?.visibilityRequirements).toEqual([
      { type: 'not_has_flag', key: 'alt_red_committed' },
    ])
    const b2 = nodes.alt_red_bailout_2.choices.find((c) => c.id === 'c_altr_b2_commit')
    expect(b2?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'ash_proposition' })
    expect(b2?.onSelect?.some((a) => a.action === 'set_flag' && a.key === 'alt_red_committed' && a.value === true)).toBe(true)
  })

  it('Elara craft alt-string: seek_answers routes to alt_craft_entry; elara_offer gates on alt_craft_committed', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const seek4 = nodes.seek_answers.choices.find((c) => c.id === 'c_seek_4')
    expect(seek4?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'alt_craft_entry' })
    expect(seek4?.visibilityRequirements.some((r) => r.type === 'not_has_flag' && r.key === 'alt_craft_committed')).toBe(
      true,
    )
    const offer = nodes.elara_offer
    const eo1 = offer.choices.find((c) => c.id === 'c_eo_1')
    const eo2 = offer.choices.find((c) => c.id === 'c_eo_2')
    const eo3 = offer.choices.find((c) => c.id === 'c_eo_3')
    expect(eo1?.visibilityRequirements).toEqual([{ type: 'has_flag', key: 'alt_craft_committed' }])
    expect(eo2?.visibilityRequirements).toEqual([{ type: 'has_flag', key: 'alt_craft_committed' }])
    expect(eo3?.visibilityRequirements).toEqual([{ type: 'not_has_flag', key: 'alt_craft_committed' }])
    const b2 = nodes.alt_craft_bailout_2.choices.find((c) => c.id === 'c_altcr_b2_commit')
    expect(b2?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'elara_offer' })
    expect(b2?.onSelect?.some((a) => a.action === 'set_flag' && a.key === 'alt_craft_committed' && a.value === true)).toBe(
      true,
    )
  })

  it('theater_revelation no longer offers in-scene jump to chronicler; sets theater_seawall_briefing for seek_answers cross-file', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const rev = nodes.theater_revelation
    expect(rev.choices.some((c) => c.id === 'c_rev_theater_3')).toBe(false)
    const onEnter = rev.onEnter ?? []
    expect(onEnter.some((a) => a.action === 'set_flag' && a.key === 'theater_seawall_briefing' && a.value === true)).toBe(
      true,
    )
    const seek6 = nodes.seek_answers.choices.find((c) => c.id === 'c_seek_6')
    expect(seek6?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'alt_chronicler_entry' })
  })

  it('doc_planning onEnter sets committed_chronicler flag', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.doc_planning
    const onEnterActions = node.onEnter ?? []
    const flagAction = onEnterActions.find(
      (a) => a.action === 'set_flag' && a.key === 'committed_chronicler' && a.value === true,
    )
    expect(flagAction).toBeDefined()
  })

  it('line_staging_raid onEnter sets committed_line flag', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.line_staging_raid
    const onEnterActions = node.onEnter ?? []
    const flagAction = onEnterActions.find(
      (a) => a.action === 'set_flag' && a.key === 'committed_line' && a.value === true,
    )
    expect(flagAction).toBeDefined()
  })
})

describe('story funnel (branch entry gates)', () => {
  it('evening_calculations night_district choice is gated behind exploration flags', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.evening_calculations
    const nightChoice = node.choices.find(
      (c) => c.mechanic?.type === 'navigate' && c.mechanic.nextNodeId === 'night_district',
    )
    expect(nightChoice).toBeDefined()
    expect(nightChoice.visibilityRequirements).toBeDefined()
    expect(nightChoice.visibilityRequirements.length).toBeGreaterThan(0)
  })

  it('purifier modify branch routes to outcome nodes that can reach freehands_safehouse', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const modify = nodes.purifier_choice_modify
    const firstHop = modify.choices
      .map((c) => (c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null))
      .filter(Boolean)
    expect(firstHop).toEqual(
      expect.arrayContaining(['purifier_modify_fueled', 'purifier_modify_blood']),
    )
    for (const id of ['purifier_modify_fueled', 'purifier_modify_blood']) {
      const targets = nodes[id].choices.map((c) =>
        c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
      )
      expect(targets).toContain('freehands_safehouse')
    }
  })

  it('freehands_safehouse offers a return exit to seek_answers', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.freehands_safehouse
    const targets = node.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(targets).toContain('seek_answers')
  })

  it('track_disturbance does not offer death_dark_alley directly', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.track_disturbance
    const targets = node.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(targets).not.toContain('death_dark_alley')
  })
})

describe('story loop fixes', () => {
  it('infrastructure_investigation does not loop back to seawall_first_look', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const infra = nodes.infrastructure_investigation
    const seawall = nodes.seawall_first_look
    const infraTargets = infra.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    const seawallTargets = seawall.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(infraTargets).not.toContain('seawall_first_look')
    const bothSides =
      seawallTargets.includes('infrastructure_investigation') &&
      infraTargets.includes('seawall_first_look')
    expect(bothSides).toBe(false)
  })

  it('choice_report has no loop-back to kaelen_shows', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.choice_report
    const targets = node.choices.map((c) =>
      c.mechanic?.type === 'navigate' ? c.mechanic.nextNodeId : null,
    )
    expect(targets).not.toContain('kaelen_shows')
    expect(node.choices).toHaveLength(1)
  })

  it('staging_area sets staging_visited flag on entry', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.staging_area
    const onEnterActions = node.onEnter ?? []
    const flagAction = onEnterActions.find(
      (a) => a.action === 'set_flag' && a.key === 'staging_visited' && a.value === true,
    )
    expect(flagAction).toBeDefined()
  })

  it('warehouse_conclusion staging_area choice is gated by not_has_flag:staging_visited', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const node = nodes.warehouse_conclusion
    const stagingChoice = node.choices.find(
      (c) => c.mechanic?.type === 'navigate' && c.mechanic.nextNodeId === 'staging_area',
    )
    expect(stagingChoice).toBeDefined()
    const hasNotVisitedGate = stagingChoice.visibilityRequirements?.some(
      (r) => r.type === 'not_has_flag' && r.key === 'staging_visited',
    )
    expect(hasNotVisitedGate).toBe(true)
  })
})

describe('story funnel (purifier / authority loop guard)', () => {
  it('sets purifier_basement_done on destroy, modify, and leave purifier exits', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    for (const id of [
      'purifier_choice_destroy',
      'purifier_modify_fueled',
      'purifier_modify_blood',
      'purifier_choice_leave',
    ]) {
      const onEnter = nodes[id].onEnter ?? []
      expect(
        onEnter.some(
          (a) => a.action === 'set_flag' && a.key === 'purifier_basement_done' && a.value === true,
        ),
        id,
      ).toBe(true)
    }
  })

  it('track_disturbance purifier door and Tomas spoke require not_has_flag:purifier_basement_done', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const t = nodes.track_disturbance
    for (const cid of ['c_track_1', 'c_track_2', 'c_track_4']) {
      const ch = t.choices.find((c) => c.id === cid)
      expect(ch?.visibilityRequirements).toEqual([{ type: 'not_has_flag', key: 'purifier_basement_done' }])
    }
  })

  it('meet_old_tomas routes return trail by warehouse_thread_complete', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const tomas = nodes.meet_old_tomas
    const firstPass = tomas.choices.find((c) => c.id === 'c_tomas_2')
    expect(firstPass?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'track_disturbance' })
    expect(firstPass?.visibilityRequirements).toEqual([
      { type: 'has_flag', key: 'purifier_basement_done' },
      { type: 'not_has_flag', key: 'warehouse_thread_complete' },
    ])
    const afterWarehouse = tomas.choices.find((c) => c.id === 'c_tomas_3')
    expect(afterWarehouse?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'track_disturbance_repeat' })
    expect(afterWarehouse?.visibilityRequirements).toEqual([
      { type: 'has_flag', key: 'purifier_basement_done' },
      { type: 'has_flag', key: 'warehouse_thread_complete' },
    ])
  })

  it('authority_overplay_2 sets authority_escalation_filed onEnter and Mireth choice navigates to seek_answers', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const ao2 = nodes.authority_overplay_2
    const onEnter = ao2.onEnter ?? []
    expect(
      onEnter.some(
        (a) => a.action === 'set_flag' && a.key === 'authority_escalation_filed' && a.value === true,
      ),
    ).toBe(true)
    const mireth = ao2.choices.find((c) => c.id === 'c_ao_2_mireth')
    expect(mireth?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'seek_answers' })
  })

  it('seek_answers c_seek_3 is hidden after authority_escalation_filed', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const seek3 = nodes.seek_answers.choices.find((c) => c.id === 'c_seek_3')
    expect(seek3?.visibilityRequirements).toEqual([{ type: 'not_has_flag', key: 'authority_escalation_filed' }])
  })

  it('purifier_entrance_open offers c_open_3 to seek_answers when purifier_basement_done', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    const c3 = nodes.purifier_entrance_open.choices.find((c) => c.id === 'c_open_3')
    expect(c3?.mechanic).toEqual({ type: 'navigate', nextNodeId: 'seek_answers' })
    expect(c3?.visibilityRequirements).toEqual([{ type: 'has_flag', key: 'purifier_basement_done' }])
  })

  it('cat colony treaty node removed with cull (feral parliament unused)', () => {
    const nodesRows = readCsv(csvDir, 'nodes.csv')
    const nodes = parseNodes(nodesRows)
    expect(nodes.cat_colony_treaty).toBeUndefined()
  })
})
