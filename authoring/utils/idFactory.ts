/**
 * Deterministic ID generation for authorable entities with collision handling.
 * Prefixes: nodes (n_), choices (c_), encounters (enc_), items (item_), enemies (enemy_).
 */

const NODE_PREFIX = 'n_'
const CHOICE_PREFIX = 'c_'
const ENCOUNTER_PREFIX = 'enc_'
const ITEM_PREFIX = 'item_'
const ENEMY_PREFIX = 'enemy_'

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24) || 'node'
}

function nextCounter(existingIds: Set<string>, prefix: string): number {
  let n = 1
  while (existingIds.has(`${prefix}${n}`)) n++
  return n
}

function nextCounterWithSlug(
  existingIds: Set<string>,
  prefix: string,
  slug: string
): string {
  const base = slug ? `${prefix}${slug}_` : `${prefix}`
  let n = 1
  let id = `${base}${n}`
  while (existingIds.has(id)) {
    n++
    id = `${base}${n}`
  }
  return id
}

export interface IdFactoryContext {
  nodeIds: Set<string>
  encounterIds: Set<string>
  itemIds: Set<string>
  enemyIds: Set<string>
}

export function createIdFactory(context: IdFactoryContext) {
  const { nodeIds, encounterIds, itemIds, enemyIds } = context

  function nextNodeId(seed?: string): string {
    const slug = seed ? slugify(seed) : 'node'
    return nextCounterWithSlug(nodeIds, NODE_PREFIX, slug)
  }

  function nextChoiceId(nodeId: string, existingChoiceIds: string[]): string {
    const safe = nodeId.replace(/[^a-z0-9_]/g, '_').slice(0, 20)
    const prefix = `${CHOICE_PREFIX}${safe}_`
    const used = new Set(existingChoiceIds)
    let n = 1
    let id = `${prefix}${n}`
    while (used.has(id)) {
      n++
      id = `${prefix}${n}`
    }
    return id
  }

  function nextEncounterId(seed?: string): string {
    const slug = seed ? slugify(seed) : 'enc'
    return nextCounterWithSlug(encounterIds, ENCOUNTER_PREFIX, slug)
  }

  function nextItemId(seed?: string): string {
    const slug = seed ? slugify(seed) : 'item'
    return nextCounterWithSlug(itemIds, ITEM_PREFIX, slug)
  }

  function nextEnemyId(seed?: string): string {
    const slug = seed ? slugify(seed) : 'enemy'
    return nextCounterWithSlug(enemyIds, ENEMY_PREFIX, slug)
  }

  return {
    nextNodeId,
    nextChoiceId,
    nextEncounterId,
    nextItemId,
    nextEnemyId,
  }
}

export function collectIdContext(
  nodes: Record<string, { id: string; choices?: Array<{ id: string }> }>,
  encounters: Record<string, { id: string }>,
  items: Record<string, { id: string }>,
  enemies: Record<string, { id: string }>
): IdFactoryContext {
  return {
    nodeIds: new Set(Object.keys(nodes)),
    encounterIds: new Set(Object.keys(encounters)),
    itemIds: new Set(Object.keys(items)),
    enemyIds: new Set(Object.keys(enemies)),
  }
}
