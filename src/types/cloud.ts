import type { SaveSlotId } from '../config'
import type { PlayerState } from './player'

export type PersistedPlayerState = Omit<PlayerState, 'activeSaveSlot'>

export type AuthStatus = 'anonymous' | 'authenticating' | 'authenticated' | 'error'

export interface SessionUser {
  id: string
  email?: string
  isAnonymous: boolean
}

export interface AuthSession {
  status: AuthStatus
  user: SessionUser | null
  error?: string
}

export interface CloudSaveDocument {
  slotId: SaveSlotId
  userId: string
  revision: number
  updatedAt: string
  source: 'local' | 'cloud'
  data: PersistedPlayerState
}

export type SaveSyncStatus = 'synced' | 'pending' | 'conflict' | 'error'

export interface SaveConflict {
  slotId: SaveSlotId
  local: CloudSaveDocument
  cloud: CloudSaveDocument
}

export type SaveMergeChoice = 'use_local' | 'use_cloud' | 'keep_both'

export interface SaveSyncState {
  slotId: SaveSlotId
  status: SaveSyncStatus
  updatedAt?: string
  message?: string
  conflict?: SaveConflict
}

export type AnalyticsEventType =
  | 'chapter_completed'
  | 'ending_reached'
  | 'run_failed'
  | 'rare_milestone_unlocked'
  | 'node_visit'
  | 'choice_selected'
  | 'combat_outcome'

export interface AnalyticsEventEnvelope {
  storyId: string
  storyVersion?: string
  type: AnalyticsEventType
  ts: number
  userId?: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface SessionOutcomeSummary {
  storyId: string
  storyVersion?: string
  sessionId: string
  startedAt: number
  endedAt: number
  counters: Partial<Record<AnalyticsEventType, number>>
  milestones: string[]
}

export interface OutcomeStat {
  key: string
  count: number
  percentage: number
  sampleSize: number
  updatedAt: string
}

export interface StoryPackageManifest {
  storyId: string
  version: string
  title: string
  author: string
  description?: string
  createdAt: string
}
