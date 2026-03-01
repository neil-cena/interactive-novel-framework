import { GAME_CONFIG, type SaveSlotId } from '../../config'
import type {
  AnalyticsEventEnvelope,
  AuthSession,
  CloudSaveDocument,
  OutcomeStat,
  SessionOutcomeSummary,
  StoryPackageManifest,
} from '../../types/cloud'
import type { AnalyticsProvider, AuthProvider, SaveProvider, StoryPackageProvider } from './providerTypes'

const AUTH_SESSION_KEY = 'phase5_auth_session'
const ANALYTICS_EVENTS_KEY = 'phase5_analytics_events'
const ANALYTICS_SUMMARIES_KEY = 'phase5_analytics_summaries'
const STORY_PACKAGES_KEY = 'phase5_story_packages'

function cloudSaveKey(userId: string, slotId: SaveSlotId): string {
  return `phase5_cloud_save:${userId}:${slotId}`
}

function nowIso(): string {
  return new Date().toISOString()
}

export class LocalAuthProvider implements AuthProvider {
  async getSession(): Promise<AuthSession> {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) {
      return {
        status: 'anonymous',
        user: { id: 'anonymous', isAnonymous: true },
      }
    }
    try {
      const parsed = JSON.parse(raw) as { userId: string; email?: string }
      return {
        status: 'authenticated',
        user: { id: parsed.userId, email: parsed.email, isAnonymous: false },
      }
    } catch {
      return {
        status: 'error',
        user: null,
        error: 'Failed to parse local auth session',
      }
    }
  }

  async signInWithEmail(email: string): Promise<AuthSession> {
    const trimmed = email.trim().toLowerCase()
    const userId = `user_${trimmed.replace(/[^a-z0-9]/g, '_') || 'player'}`
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ userId, email: trimmed, signedInAt: nowIso() }))
    return {
      status: 'authenticated',
      user: { id: userId, email: trimmed, isAnonymous: false },
    }
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(AUTH_SESSION_KEY)
  }
}

export class LocalSaveProvider implements SaveProvider {
  async listSaves(userId: string): Promise<Record<SaveSlotId, CloudSaveDocument | null>> {
    const out = {} as Record<SaveSlotId, CloudSaveDocument | null>
    for (const slotId of GAME_CONFIG.save.slotKeys) {
      out[slotId] = await this.getSave(userId, slotId)
    }
    return out
  }

  async getSave(userId: string, slotId: SaveSlotId): Promise<CloudSaveDocument | null> {
    const raw = localStorage.getItem(cloudSaveKey(userId, slotId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as CloudSaveDocument
    } catch {
      return null
    }
  }

  async upsertSave(
    doc: CloudSaveDocument,
    options: { expectedRevision?: number | null } = {},
  ): Promise<{ ok: boolean; conflict?: CloudSaveDocument }> {
    const current = await this.getSave(doc.userId, doc.slotId)
    if (current && options.expectedRevision != null && current.revision !== options.expectedRevision) {
      return { ok: false, conflict: current }
    }
    localStorage.setItem(cloudSaveKey(doc.userId, doc.slotId), JSON.stringify(doc))
    return { ok: true }
  }

  async deleteSave(userId: string, slotId: SaveSlotId): Promise<void> {
    localStorage.removeItem(cloudSaveKey(userId, slotId))
  }
}

export class LocalAnalyticsProvider implements AnalyticsProvider {
  async ingestEvents(events: AnalyticsEventEnvelope[]): Promise<void> {
    const raw = localStorage.getItem(ANALYTICS_EVENTS_KEY)
    const existing = raw ? (JSON.parse(raw) as AnalyticsEventEnvelope[]) : []
    localStorage.setItem(ANALYTICS_EVENTS_KEY, JSON.stringify([...existing, ...events]))
  }

  async ingestSessionSummary(summary: SessionOutcomeSummary): Promise<void> {
    const raw = localStorage.getItem(ANALYTICS_SUMMARIES_KEY)
    const existing = raw ? (JSON.parse(raw) as SessionOutcomeSummary[]) : []
    localStorage.setItem(ANALYTICS_SUMMARIES_KEY, JSON.stringify([...existing, summary]))
  }

  async getOutcomeStats(storyId: string): Promise<OutcomeStat[]> {
    const raw = localStorage.getItem(ANALYTICS_SUMMARIES_KEY)
    const summaries = raw ? (JSON.parse(raw) as SessionOutcomeSummary[]) : []
    const filtered = summaries.filter((s) => s.storyId === storyId)
    if (filtered.length === 0) return []

    const counters = new Map<string, number>()
    for (const summary of filtered) {
      for (const [key, value] of Object.entries(summary.counters)) {
        if (!value) continue
        counters.set(key, (counters.get(key) ?? 0) + value)
      }
    }
    const sampleSize = filtered.length
    return Array.from(counters.entries()).map(([key, count]) => ({
      key,
      count,
      percentage: sampleSize > 0 ? Math.round((count / sampleSize) * 10000) / 100 : 0,
      sampleSize,
      updatedAt: nowIso(),
    }))
  }
}

export class LocalStoryPackageProvider implements StoryPackageProvider {
  async listPackages(): Promise<StoryPackageManifest[]> {
    const raw = localStorage.getItem(STORY_PACKAGES_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as StoryPackageManifest[]
    } catch {
      return []
    }
  }
}
