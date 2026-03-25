/**
 * Markdown report for structural QA results (human-readable; keep plain text / safe for <pre>).
 */

import { isStructuralDefectTerminalKind } from './qa-exhaustive.js'

const TRUNCATE_NOTE = '\n\n---\n\n_(Report truncated: output size limit reached.)_\n'
const MAX_APPENDIX_EVENTS = 35

/**
 * @param {string} s
 */
function safeProse(s) {
  if (s == null) return ''
  return String(s).replace(/`/g, "'").replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

/**
 * @param {string} s
 */
function safeCodeLine(s) {
  return String(s).replace(/`/g, "'")
}

/**
 * @param {unknown} text
 * @param {number} max
 */
function snippetFromNodeText(text, max = 100) {
  const t = text == null ? '' : String(text).replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * @param {string} vertex
 */
function vertexLabel(vertex) {
  if (vertex == null || vertex === '') return '_(unknown location)_'
  const v = String(vertex)
  if (v.startsWith('node:')) return `Node **${safeProse(v.slice('node:'.length))}**`
  if (v.startsWith('enc:')) return `Encounter **${safeProse(v.slice('enc:'.length))}**`
  return safeProse(v)
}

/**
 * @param {{ toVertex: string, transition: Record<string, unknown> }} step
 */
function describeTransitionStep(step) {
  const tr = step.transition
  const dest = vertexLabel(step.toVertex)
  const parts = []
  if (tr.edgeKind === 'encounter_resolution') {
    parts.push(String(tr.choiceLabel || `${tr.resolutionBranch || 'resolution'}`))
    parts.push(`→ ${dest}`)
    return parts.join(' ')
  }
  const label = tr.choiceLabel ? `“${safeProse(tr.choiceLabel)}”` : '(unnamed choice)'
  const cid = tr.choiceId ? `id \`${safeCodeLine(tr.choiceId)}\`` : 'no id'
  const mech = tr.mechanicType ? `\`${safeCodeLine(tr.mechanicType)}\`` : '`unknown`'
  const branch = tr.mechanicBranch ? ` · branch **${safeProse(tr.mechanicBranch)}**` : ''
  parts.push(`${label} (${cid}) · mechanic ${mech}${branch}`)
  parts.push(`→ ${dest}`)
  return parts.join(' ')
}

/**
 * @param {object} ev
 */
/**
 * Plain-English interpretation of structural QA findings (counts, deduped rows, static graph).
 *
 * @param {(s: string) => void} append
 * @param {object} result
 * @param {Record<string, number>} counts
 * @param {Record<string, unknown>} ex
 * @param {string} outcome
 * @param {Array<{ terminalKind: string, atVertex: string | null, count: number }>} summaries
 * @param {Record<string, { text?: string }>} nodes
 */
function appendIssuesExplainedSection(append, result, counts, ex, outcome, summaries, nodes) {
  append('## Issues found — explained\n\n')
  append(
    'This section translates the numbers above into **what is wrong**, **why it matters**, and **what to do next**. ',
  )
  append('It is based on **structural** rules only (every authored choice is treated as available).\n\n')

  if (outcome === 'validate_preflight') {
    append('### Validation blocked the walk\n\n')
    append(
      'The data failed `validateData` before any path enumeration ran. **Issues:** see **Validation (preflight)** below. ',
    )
    append(
      'Fix those errors first — they usually mean broken references (missing nodes, items, encounters) or invalid mechanic payloads.\n\n',
    )
    return
  }

  if (outcome === 'structural_blocker' && result.blocker?.kind === 'broken_edge') {
    append('### Broken structural references\n\n')
    append(
      'At least one choice points to a **node or encounter id that does not exist** in the model. The walker cannot safely continue. ',
    )
    append(
      '**What to do:** open **Broken structural references** (or your CSV/build pipeline), fix each `from → to` pair, then re-run QA.\n\n',
    )
    return
  }

  if (outcome === 'structural_blocker' && result.blocker?.kind === 'no_start_nodes') {
    append('### No release start nodes\n\n')
    append(
      'None of the configured **release start ids** exist in `nodes`. The tool does not know where the story begins for this check. ',
    )
    append(
      '**What to do:** ensure at least one allowlisted start id (see `graph-options.js` / release settings) exists as a node id.\n\n',
    )
    return
  }

  if (outcome === 'resource_limit') {
    append('### Enumeration stopped early (safety limits)\n\n')
    append(
      'The run hit a **time**, **step**, or **depth** budget before visiting every branch. Counts and issues below reflect **partial** exploration only. ',
    )
    append(
      '**What to do:** raise limits in tooling if needed, reduce branching hubs, or run QA on a smaller package — then compare results.\n\n',
    )
  }

  const sc = counts.stack_cycle ?? 0
  const sd = counts.structural_dead_end ?? 0
  const es = counts.encounter_sink ?? 0
  const el = counts.ending_leaf ?? 0

  if (outcome !== 'validate_preflight' && outcome !== 'structural_blocker' && !ex.hasStructuralDefects) {
    append('### Path-level structural health\n\n')
    append(
      `**No defects on enumerated paths.** All **${el}** completed path(s) ended at an authored **ending** node. `,
    )
    append('No infinite loop on a single path, no stuck non-ending node, and no encounter without resolution links.\n\n')
  } else if (ex.hasStructuralDefects) {
    append('### Path-level structural problems\n\n')
    append(
      'At least one path from a release start did **not** finish cleanly at an ending. Below is what each **issue type** means.\n\n',
    )

    if (sc > 0) {
      append(`#### Stack loops (**${sc}** path(s))\n\n`)
      append(
        'A **stack loop** means the same walk location was reached again **while still inside an open branch** (classic infinite cycle if the player could always take those choices). ',
      )
      append(
        '**What to do:** break the cycle (add an ending, a one-way gate, or merge branches), or ensure some choices are **mutually exclusive** at runtime (this tool ignores visibility — if only visibility breaks the loop, note that in your design doc).\n\n',
      )
    }

    if (sd > 0) {
      append(`#### Non-ending traps (**${sd}** path(s))\n\n`)
      append(
        'The player arrives at a **narrative node that is not marked `ending`** and has **no** valid structural exits (no navigate / combat / skill / mode exits in data). ',
      )
      append(
        '**What to do:** add at least one outgoing choice, mark the node as an ending, or link a missing encounter resolution.\n\n',
      )
    }

    if (es > 0) {
      append(`#### Encounter sinks (**${es}** path(s))\n\n`)
      append(
        'Combat (or a skill failure) sent the flow to an **encounter** that has **no** `onVictory` / `onDefeat` links to story nodes. ',
      )
      append(
        '**What to do:** open the encounter in authoring and set resolution targets, or fix the encounter id on the choice.\n\n',
      )
    }

    if (summaries.length) {
      append('#### Where it shows up (deduped)\n\n')
      append(
        'Each row is one **kind + location**; the count is how many **distinct paths** ended that way. Fix the underlying node or encounter once — many paths may clear together.\n\n',
      )
      for (const row of summaries) {
        const where = row.atVertex ? `\`${safeCodeLine(row.atVertex)}\`` : '_(unknown)_'
        const nid = row.atVertex?.startsWith('node:') ? row.atVertex.slice('node:'.length) : null
        const sn = nid ? snippetFromNodeText(nodes[nid]?.text, 90) : ''
        append(`- **${safeProse(row.terminalKind)}** at ${where} — **${row.count}** path(s). `)
        if (sn) {
          append(`_Scene snippet:_ ${safeProse(sn)} `)
        }
        if (row.terminalKind === 'stack_cycle') {
          append('_Fix:_ break the cycle or gate one of the returning choices.\n')
        } else if (row.terminalKind === 'structural_dead_end') {
          append('_Fix:_ add exits or mark as ending.\n')
        } else if (row.terminalKind === 'encounter_sink') {
          append('_Fix:_ add encounter resolution `nextNodeId` values.\n')
        } else {
          append('\n')
        }
      }
      append('\n')
    }
  }

  const orphans = result.orphans ?? []
  const deadEnds = result.deadEnds ?? []
  if (orphans.length || deadEnds.length) {
    append('### Static graph warnings (analyzeGraph)\n\n')
    append(
      'These come from **reachability analysis**, not from the path walk. They flag nodes that may never be reached or cannot be left under static rules.\n\n',
    )
    if (orphans.length) {
      append(
        `- **Orphan nodes (${orphans.length}):** no inbound structural edge from elsewhere — they are unreachable unless used as a **start** or via data the static graph does not model. `,
      )
      append('**What to do:** link a choice or encounter resolution into each orphan you care about, or add the id to your intentional start allowlist.\n\n',
      )
    }
    if (deadEnds.length) {
      append(
        `- **Static dead-end hints (${deadEnds.length}):** nodes that are not \`ending\` and have no outgoing structural mechanics in the CSV model. `,
      )
      append('**What to do:** align with traps above — often the same node appears in both lists.\n\n',
      )
    }
  }

  if (ex.partialDueToBranchingCap) {
    append('### Branching cap caveat\n\n')
    append(
      'Some nodes expose **more outgoing moves** than were explored per visit. You may have **additional** defects (or clean paths) in the branches that were skipped. ',
    )
    append('Increase `maxBranchingPerVertex` in tooling if you need full coverage on wide hubs.\n\n',
    )
  }
}

function appendEventTrace(append, ev) {
  append(`#### Sample path #${ev.id ?? '—'} (${safeProse(ev.terminalKind)}) — start \`${safeCodeLine(ev.startId)}\`\n\n`)
  if (ev.issueWhere?.summary) {
    append(`${safeProse(ev.issueWhere.summary)}\n\n`)
  }
  if (ev.atVertex) {
    append(`- **At:** \`${safeCodeLine(ev.atVertex)}\`\n\n`)
  }
  const trace = ev.traceSteps
  if (trace?.length) {
    append('_Moves along this path:_\n\n')
    trace.forEach((step, i) => {
      append(`${i + 1}. From ${vertexLabel(step.fromVertex)}: ${describeTransitionStep(step)}\n`)
    })
    append('\n')
  }
  if (ev.vertexPath?.length) {
    append('```text\n')
    append(ev.vertexPath.map(safeCodeLine).join(' → '))
    append('\n```\n\n')
  }
}

/**
 * @param {object} result from `runStructuralQa`
 * @param {{ maxChars?: number, nodes?: Record<string, { text?: string }> }} [opts]
 */
export function formatQaReportMarkdown(result, opts = {}) {
  const maxChars = opts.maxChars ?? 1_500_000
  const nodes = opts.nodes ?? {}
  let md = ''
  let truncated = false

  function append(s) {
    if (truncated) return
    if (md.length + s.length + TRUNCATE_NOTE.length > maxChars) {
      const room = maxChars - md.length - TRUNCATE_NOTE.length
      if (room > 0) md += s.slice(0, room)
      md += TRUNCATE_NOTE
      truncated = true
      return
    }
    md += s
  }

  const outcome = result.abortReason ?? 'unknown'
  const ex = result.exploration ?? {}
  const counts = result.countsByKind ?? {}

  append('# Structural quality report\n\n')
  append('This report describes an automated **structural** enumeration of your story graph. ')
  append('Every path from each **release start** is walked until it hits an **ending**, a **loop on the current path**, a **dead end**, or an **encounter sink**. ')
  append('Choice visibility and dice are **not** simulated.\n\n')
  append(`_Generated: ${new Date().toISOString()}_\n\n`)

  append('## At a glance\n\n')
  append('| Item | Value |\n| --- | --- |\n')
  append(`| **Run outcome** | \`${safeCodeLine(outcome)}\` |\n`)
  append(
    `| **Enumeration finished** | ${ex.enumerationFinished ? 'Yes (within time/step/depth caps)' : 'No — stopped early'} |\n`,
  )
  if (ex.stoppedBy) {
    append(`| **Stopped by** | \`${safeCodeLine(ex.stoppedBy)}\` |\n`)
  }
  append(`| **DFS expansions** | ${result.traversal?.steps ?? 0} |\n`)
  append(`| **Terminal events (all paths)** | ${ex.totalTerminalEventsObserved ?? 0} |\n`)
  const sampleCapNote = ex.pathEventsTruncated
    ? ex.enumerationFinished
      ? ' _(defect-sample cap reached — terminal counts above match the full enumeration)_'
      : ' _(defect-sample cap reached — counts above are partial, like the rest of this run)_'
    : ''
  append(`| **Stored defect path samples (JSON)** | ${ex.storedPathEventCount ?? 0}${sampleCapNote} |\n`)
  append(`| **Structural defects?** | ${ex.hasStructuralDefects ? '**Yes** (loops / dead ends / encounter sinks on some path)' : '**No** (every path ended at an ending node)'} |\n`)
  if (ex.partialDueToBranchingCap) {
    append('| **Branching cap** | Some hubs were only partly expanded — see notices below. |\n')
  }
  append(`| **Release starts** | ${(result.traversal?.startedFrom ?? []).join(', ') || '—'} |\n`)
  append('\n')

  if (outcome === 'complete' && ex.enumerationFinished && !ex.hasStructuralDefects) {
    append(
      '> **All paths structurally valid:** every explored branch ended at an **ending** node; no stack-loops, encounter sinks, or non-ending traps were found on any path (within caps).\n\n',
    )
  } else if (outcome === 'complete' && ex.hasStructuralDefects) {
    append(
      '> **Enumeration finished, but some paths are defective:** see counts and deduped issues below.\n\n',
    )
  } else if (outcome === 'resource_limit') {
    append(
      '> **Stopped by safety limits** before fully enumerating all branches. Totals below reflect **partial** coverage.\n\n',
    )
  } else if (outcome === 'validate_preflight') {
    append('> **Validation failed first.** Fix errors below; the walk did not run.\n\n')
  } else if (outcome === 'structural_blocker' && result.blocker) {
    append('> **Graph could not be walked** (broken references or missing starts). See blocker section.\n\n')
  }

  append('### Terminal counts (all paths)\n\n')
  append('| Kind | Count |\n| --- | --- |\n')
  append(`| Ending reached | ${counts.ending_leaf ?? 0} |\n`)
  append(`| Stack loop | ${counts.stack_cycle ?? 0} |\n`)
  append(`| Non-ending trap | ${counts.structural_dead_end ?? 0} |\n`)
  append(`| Encounter sink | ${counts.encounter_sink ?? 0} |\n`)
  append('\n')

  const summaries = result.uniqueIssueSummaries ?? []
  if (summaries.length) {
    append('### Deduped structural issues\n\n')
    append('| Kind | Where | Occurrences (paths) |\n| --- | --- | --- |\n')
    for (const row of summaries) {
      append(
        `| ${safeProse(row.terminalKind)} | \`${safeCodeLine(row.atVertex ?? '—')}\` | **${row.count}** |\n`,
      )
    }
    append('\n')
  }

  appendIssuesExplainedSection(append, result, counts, ex, outcome, summaries, nodes)

  if (result.resourceLimit?.issueWhere?.summary) {
    append('### About the limit stop\n\n')
    append(`${result.resourceLimit.issueWhere.summary}\n\n`)
    const tr = result.resourceLimit.traceSteps
    if (tr?.length) {
      append('_Moves leading up to the limit:_\n\n')
      tr.forEach((step, i) => {
        append(`${i + 1}. From ${vertexLabel(step.fromVertex)}: ${describeTransitionStep(step)}\n`)
      })
      append('\n')
    }
  }

  if (result.blocker?.kind && outcome === 'structural_blocker') {
    append('## Blocker (preflight)\n\n')
    append(`${safeProse(result.blocker.message || result.blocker.kind)}\n\n`)
    if (result.blocker.issueWhere?.vertex) {
      append(`- **Vertex:** \`${safeCodeLine(result.blocker.issueWhere.vertex)}\`\n\n`)
    }
    if (result.blocker.detail && result.blocker.kind === 'broken_edge') {
      append('```json\n')
      append(safeCodeLine(JSON.stringify(result.blocker.detail, null, 2)))
      append('\n```\n\n')
    }
  }

  const pathEvents = result.pathEvents ?? []
  // Prefer defect-kind filter (also drops legacy `ending_leaf` rows if present in older exports).
  const appendix = pathEvents.filter((e) => e.terminalKind && isStructuralDefectTerminalKind(e.terminalKind))
  if (appendix.length) {
    append('## Sample defective paths (appendix)\n\n')
    append(
      `_Showing up to ${MAX_APPENDIX_EVENTS} stored defect playthroughs. Full terminal counts are in the table above._\n\n`,
    )
    appendix.slice(0, MAX_APPENDIX_EVENTS).forEach((ev) => appendEventTrace(append, ev))
    if (appendix.length > MAX_APPENDIX_EVENTS) {
      append(`_…and ${appendix.length - MAX_APPENDIX_EVENTS} more samples omitted here (see JSON export if present)._\n\n`)
    }
  }

  if (result.traversal?.branchingTruncations?.length) {
    append('## Branching cap notices\n\n')
    append(
      'Hubs with more outgoing moves than `maxBranchingPerVertex` were only **partially** expanded; some permutations may be unseen.\n\n',
    )
    for (const t of result.traversal.branchingTruncations) {
      append(
        `- At \`${safeCodeLine(t.at)}\`: explored **${t.explored}** of **${t.available}** outgoing moves.\n`,
      )
    }
    append('\n')
  }

  append('---\n\n## Validation (preflight)\n\n')
  if (result.validateErrors?.length) {
    append('### Errors — traversal was skipped\n\n')
    for (const e of result.validateErrors) {
      append(`- **${e.code ?? 'error'}:** ${safeProse(e.message)}\n`)
    }
    append('\n')
  } else {
    append('_No blocking validation errors._\n\n')
  }

  if (result.validateWarnings?.length) {
    append('### Warnings\n\n')
    for (const w of result.validateWarnings) {
      append(`- **${w.code ?? 'warning'}:** ${safeProse(w.message)}\n`)
    }
    append('\n')
  }

  append('---\n\n## Graph summary (reachability)\n\n')
  if ((result.orphans ?? []).length) {
    append('### Orphan nodes (no inbound structural edges)\n\n')
    append('| Node | Text snippet |\n| --- | --- |\n')
    for (const id of result.orphans) {
      const sn = snippetFromNodeText(nodes[id]?.text, 80)
      append(`| \`${safeCodeLine(id)}\` | ${safeProse(sn) || '—'} |\n`)
    }
    append('\n')
  } else {
    append('_No orphan nodes under release start rules._\n\n')
  }

  if ((result.deadEnds ?? []).length) {
    append('### Static dead-end hints (analyzeGraph)\n\n')
    append('| Node | Text snippet |\n| --- | --- |\n')
    for (const id of result.deadEnds) {
      const sn = snippetFromNodeText(nodes[id]?.text, 80)
      append(`| \`${safeCodeLine(id)}\` | ${safeProse(sn) || '—'} |\n`)
    }
    append('\n')
  } else {
    append('_No static dead-end nodes reported by analyzeGraph._\n\n')
  }

  if (result.graphDiagnostics?.length) {
    append('### Graph diagnostics\n\n')
    for (const d of result.graphDiagnostics) {
      append(`- **${d.code}** (${d.severity}): ${safeProse(d.message)}\n`)
    }
    append('\n')
  }

  if (result.brokenEdges?.length) {
    append('---\n\n## Broken structural references\n\n')
    for (const b of result.brokenEdges) {
      append(`- \`${safeCodeLine(b.from)}\` → \`${safeCodeLine(b.to)}\` — ${safeProse(b.reason)}\n`)
    }
    append('\n')
  }

  append('---\n\n## Legend\n\n')
  append('- `node:story_id` — narrative vertex in the walk graph.\n')
  append('- `enc:encounter_id` — encounter pseudo-vertex before resolution.\n')
  append('- **Ending reached** = authored `type: ending` with no further structural moves on that path.\n')

  return md
}
