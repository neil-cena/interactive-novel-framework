import type { SaveSlotId } from '../../config'
import type { PersistedPlayerState } from '../../types/cloud'

export interface QueuedSaveWrite {
  userId: string
  slotId: SaveSlotId
  data: PersistedPlayerState
  enqueuedAt: string
}

const OFFLINE_QUEUE_KEY = 'phase5_offline_queue'

function readQueue(): QueuedSaveWrite[] {
  const raw = localStorage.getItem(OFFLINE_QUEUE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as QueuedSaveWrite[]
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedSaveWrite[]): void {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export function enqueueSaveWrite(write: QueuedSaveWrite): void {
  const queue = readQueue()
  queue.push(write)
  writeQueue(queue)
}

export function getQueuedSaveWrites(): QueuedSaveWrite[] {
  return readQueue()
}

export function clearQueuedSaveWrites(): void {
  writeQueue([])
}
