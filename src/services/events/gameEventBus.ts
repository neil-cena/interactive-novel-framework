type Handler<T> = (payload: T) => void

export interface ChoiceSelectedEvent {
  nodeId: string
  choiceId: string
}

export interface CombatResolvedEvent {
  outcome: 'victory' | 'defeat'
  encounterId: string
}

export interface RareMilestoneEvent {
  milestone: string
}

type EventMap = {
  choiceSelected: ChoiceSelectedEvent
  combatResolved: CombatResolvedEvent
  rareMilestone: RareMilestoneEvent
}

const handlers: Partial<Record<keyof EventMap, Set<Handler<unknown>>>> = {}

export function onGameEvent<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
  const set = handlers[event] ?? new Set<Handler<unknown>>()
  set.add(handler as Handler<unknown>)
  handlers[event] = set
  return () => set.delete(handler as Handler<unknown>)
}

export function emitGameEvent<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
  const set = handlers[event]
  if (!set) return
  set.forEach((handler) => handler(payload))
}
