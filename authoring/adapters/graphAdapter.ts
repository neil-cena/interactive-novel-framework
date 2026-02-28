/**
 * Converts authoring model (nodes + encounters) to Vue Flow elements.
 */

import type { Node, Edge } from '@vue-flow/core'
import type { StoryNodeModel } from '../api/authoringClient'
import type { EncounterModel } from '../api/authoringClient'

const NODE_TYPE_COLORS: Record<string, string> = {
  narrative: '#e3f2fd',
  encounter: '#fff3e0',
  ending: '#e8f5e9',
}

export interface GraphLayoutNode {
  id: string
  label: string
  type: string
  isOrphan?: boolean
  isDeadEnd?: boolean
  hasInvalidRef?: boolean
}

export function modelToVueFlow(
  nodes: Record<string, StoryNodeModel>,
  encounters: Record<string, EncounterModel>,
  options: {
    orphanIds?: Set<string>
    deadEndIds?: Set<string>
    positions?: Map<string, { x: number; y: number }>
  } = {}
): { flowNodes: Node[]; flowEdges: Edge[] } {
  const { orphanIds = new Set(), deadEndIds = new Set(), positions = new Map() } = options
  const flowNodes: Node[] = []
  const flowEdges: Edge[] = []
  let y = 0
  const colWidth = 280
  let col = 0
  const used = new Set<string>()

  for (const [id, node] of Object.entries(nodes)) {
    const pos = positions.get(id) ?? { x: col * colWidth, y }
    flowNodes.push({
      id,
      type: 'default',
      position: pos,
      data: {
        label: node.text?.slice(0, 40) ?? id,
        nodeType: node.type,
        backgroundColor: NODE_TYPE_COLORS[node.type] ?? '#f5f5f5',
        isOrphan: orphanIds.has(id),
        isDeadEnd: deadEndIds.has(id),
      },
    })
    used.add(id)
    col++
    if (col > 4) {
      col = 0
      y += 80
    }
  }

  for (const enc of Object.values(encounters)) {
    const encNodeId = `enc:${enc.id}`
    if (!flowNodes.some((n) => n.id === encNodeId)) {
      flowNodes.push({
        id: encNodeId,
        type: 'default',
        position: positions.get(encNodeId) ?? { x: col * colWidth, y },
        data: {
          label: `[Encounter] ${enc.id}`,
          nodeType: 'encounter',
          backgroundColor: '#fff3e0',
        },
      })
      col++
      if (col > 4) {
        col = 0
        y += 80
      }
    }
  }

  let edgeId = 0
  for (const [sourceId, node] of Object.entries(nodes)) {
    if (!node.choices) continue
    for (const choice of node.choices) {
      const m = choice.mechanic as { type?: string; nextNodeId?: string; onSuccess?: { nextNodeId: string }; onFailure?: { nextNodeId: string } } | undefined
      if (!m) continue
      let targetId: string | null = null
      if (m.type === 'navigate' && m.nextNodeId) targetId = m.nextNodeId
      if (m.type === 'combat_init' && (m as { encounterId?: string }).encounterId) {
        const encId = (m as { encounterId: string }).encounterId
        flowEdges.push({
          id: `e${edgeId++}`,
          source: sourceId,
          target: `enc:${encId}`,
          label: choice.label ?? choice.id,
        })
        continue
      }
      if (m.type === 'skill_check') {
        if (m.onSuccess?.nextNodeId) {
          flowEdges.push({
            id: `e${edgeId++}`,
            source: sourceId,
            target: m.onSuccess.nextNodeId,
            label: `${choice.label} (success)`,
          })
        }
        if (m.onFailure?.nextNodeId) {
          flowEdges.push({
            id: `e${edgeId++}`,
            source: sourceId,
            target: m.onFailure.nextNodeId,
            label: `${choice.label} (fail)`,
          })
        }
        continue
      }
      if (targetId) {
        flowEdges.push({
          id: `e${edgeId++}`,
          source: sourceId,
          target: targetId,
          label: choice.label ?? choice.id,
        })
      }
    }
  }

  for (const enc of Object.values(encounters)) {
    const onVictory = enc.resolution?.onVictory?.nextNodeId
    const onDefeat = enc.resolution?.onDefeat?.nextNodeId
    const encNodeId = `enc:${enc.id}`
    if (onVictory) {
      flowEdges.push({
        id: `e${edgeId++}`,
        source: encNodeId,
        target: onVictory,
        label: 'victory',
      })
    }
    if (onDefeat) {
      flowEdges.push({
        id: `e${edgeId++}`,
        source: encNodeId,
        target: onDefeat,
        label: 'defeat',
      })
    }
  }

  return { flowNodes, flowEdges }
}
