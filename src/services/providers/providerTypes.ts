import type { SaveSlotId } from '../../config'
import type {
  AnalyticsEventEnvelope,
  AuthSession,
  CloudSaveDocument,
  OutcomeStat,
  SessionOutcomeSummary,
  StoryPackageManifest,
} from '../../types/cloud'

export interface AuthProvider {
  getSession(): Promise<AuthSession>
  signInWithEmail(email: string, password: string): Promise<AuthSession>
  signUpWithEmail(email: string, password: string): Promise<AuthSession>
  signOut(): Promise<void>
}

export interface SaveProvider {
  listSaves(userId: string): Promise<Record<SaveSlotId, CloudSaveDocument | null>>
  getSave(userId: string, slotId: SaveSlotId): Promise<CloudSaveDocument | null>
  upsertSave(
    doc: CloudSaveDocument,
    options?: { expectedRevision?: number | null },
  ): Promise<{ ok: boolean; conflict?: CloudSaveDocument }>
  deleteSave(userId: string, slotId: SaveSlotId): Promise<void>
}

export interface AnalyticsProvider {
  ingestEvents(events: AnalyticsEventEnvelope[]): Promise<void>
  ingestSessionSummary(summary: SessionOutcomeSummary): Promise<void>
  getOutcomeStats(storyId: string): Promise<OutcomeStat[]>
}

export interface StoryPackageProvider {
  listPackages(): Promise<StoryPackageManifest[]>
}

export interface ProviderBundle {
  authProvider: AuthProvider
  saveProvider: SaveProvider
  analyticsProvider: AnalyticsProvider
  storyPackageProvider: StoryPackageProvider
}
