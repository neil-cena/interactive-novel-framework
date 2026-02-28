/**
 * Graph layout helpers. Layout is currently done in graphAdapter (simple grid).
 * Can be extended for auto-layout (e.g. dagre) later.
 */

import type { Node } from '@vue-flow/core'

export function useGraphLayout() {
  function getNodePosition(nodeId: string, existingNodes: Node[]): { x: number; y: number } {
    const existing = existingNodes.find((n) => n.id === nodeId)
    if (existing?.position) return existing.position as { x: number; y: number }
    const col = existingNodes.length % 5
    const row = Math.floor(existingNodes.length / 5)
    return { x: col * 280, y: row * 80 }
  }
  return { getNodePosition }
}
