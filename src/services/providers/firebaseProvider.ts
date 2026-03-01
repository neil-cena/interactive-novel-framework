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
import { auth, firestore, isFirebaseConfigured } from '../firebase/firebaseClient'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore'

const USERS_COLLECTION = 'users'
const SAVES_SUBCOLLECTION = 'saves'
const ANALYTICS_EVENTS_COLLECTION = 'analytics_events'
const ANALYTICS_SUMMARIES_COLLECTION = 'analytics_session_summaries'
const STORY_PACKAGES_COLLECTION = 'story_packages'
const AUTH_SESSION_KEY = 'phase5_auth_session'

function requireFirebase(): { auth: NonNullable<typeof auth>; firestore: NonNullable<typeof firestore> } {
  if (!isFirebaseConfigured() || !auth || !firestore) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* env and enable cloudSave.')
  }
  return { auth, firestore }
}

/** Firestore does not allow undefined; strip so setDoc/writeBatch don't throw. */
function withoutUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T
}

function userToSessionUser(user: User | null): AuthSession['user'] {
  if (!user) return { id: 'anonymous', isAnonymous: true }
  return {
    id: user.uid,
    email: user.email ?? undefined,
    isAnonymous: user.isAnonymous,
  }
}

export class FirebaseAuthProvider implements AuthProvider {
  async getSession(): Promise<AuthSession> {
    const { auth: a } = requireFirebase()
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(a, (user) => {
        unsub()
        const sessionUser = userToSessionUser(user)
        if (user) {
          localStorage.setItem(
            AUTH_SESSION_KEY,
            JSON.stringify({ userId: user.uid, email: user.email ?? undefined }),
          )
        } else {
          localStorage.removeItem(AUTH_SESSION_KEY)
        }
        resolve({
          status: user ? 'authenticated' : 'anonymous',
          user: sessionUser,
        })
      })
    })
  }

  async signInWithEmail(email: string, password: string): Promise<AuthSession> {
    const { auth: a } = requireFirebase()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) throw new Error('Please enter an email address.')
    if (!password) throw new Error('Please enter your password.')
    try {
      const credential = await signInWithEmailAndPassword(a, trimmed, password)
      const user = credential.user
      localStorage.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({ userId: user.uid, email: user.email ?? undefined }),
      )
      return { status: 'authenticated', user: userToSessionUser(user) }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/invalid-email') throw new Error('Please enter a valid email address.')
      if (code === 'auth/user-disabled') throw new Error('This account has been disabled.')
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.')
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password sign-in is not enabled in Firebase Console.')
      }
      throw err
    }
  }

  async signUpWithEmail(email: string, password: string): Promise<AuthSession> {
    const { auth: a } = requireFirebase()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) throw new Error('Please enter an email address.')
    if (!password) throw new Error('Please choose a password.')
    if (password.length < 6) throw new Error('Password must be at least 6 characters.')
    try {
      const credential = await createUserWithEmailAndPassword(a, trimmed, password)
      const user = credential.user
      localStorage.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({ userId: user.uid, email: user.email ?? undefined }),
      )
      return { status: 'authenticated', user: userToSessionUser(user) }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (code === 'auth/invalid-email') throw new Error('Please enter a valid email address.')
      if (code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Sign in instead.')
      }
      if (code === 'auth/weak-password') throw new Error('Password is too weak. Use at least 6 characters.')
      if (code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password sign-in is not enabled in Firebase Console.')
      }
      throw err
    }
  }

  async signOut(): Promise<void> {
    const { auth: a } = requireFirebase()
    await fbSignOut(a)
    localStorage.removeItem(AUTH_SESSION_KEY)
  }
}

export class FirebaseSaveProvider implements SaveProvider {
  private saveRef(userId: string, slotId: SaveSlotId) {
    const { firestore: db } = requireFirebase()
    return doc(db, USERS_COLLECTION, userId, SAVES_SUBCOLLECTION, slotId)
  }

  async getSave(userId: string, slotId: SaveSlotId): Promise<CloudSaveDocument | null> {
    const ref = this.saveRef(userId, slotId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snap.data() as CloudSaveDocument
  }

  async listSaves(userId: string): Promise<Record<SaveSlotId, CloudSaveDocument | null>> {
    const out = {} as Record<SaveSlotId, CloudSaveDocument | null>
    for (const slotId of GAME_CONFIG.save.slotKeys) {
      out[slotId] = await this.getSave(userId, slotId)
    }
    return out
  }

  async upsertSave(
    saveDoc: CloudSaveDocument,
    options: { expectedRevision?: number | null } = {},
  ): Promise<{ ok: boolean; conflict?: CloudSaveDocument }> {
    const current = await this.getSave(saveDoc.userId, saveDoc.slotId)
    if (current && options.expectedRevision != null && current.revision !== options.expectedRevision) {
      return { ok: false, conflict: current }
    }
    const ref = this.saveRef(saveDoc.userId, saveDoc.slotId)
    await setDoc(ref, saveDoc)
    return { ok: true }
  }

  async deleteSave(userId: string, slotId: SaveSlotId): Promise<void> {
    const ref = this.saveRef(userId, slotId)
    await deleteDoc(ref)
  }
}

export class FirebaseAnalyticsProvider implements AnalyticsProvider {
  async ingestEvents(events: AnalyticsEventEnvelope[]): Promise<void> {
    if (events.length === 0) return
    const { firestore: db } = requireFirebase()
    const batch = writeBatch(db)
    const coll = collection(db, ANALYTICS_EVENTS_COLLECTION)
    for (const ev of events) {
      const ref = doc(coll)
      batch.set(ref, withoutUndefined(ev as Record<string, unknown>))
    }
    await batch.commit()
  }

  async ingestSessionSummary(summary: SessionOutcomeSummary): Promise<void> {
    const { firestore: db } = requireFirebase()
    const ref = doc(db, ANALYTICS_SUMMARIES_COLLECTION, summary.sessionId)
    await setDoc(ref, withoutUndefined(summary as Record<string, unknown>))
  }

  async getOutcomeStats(storyId: string): Promise<OutcomeStat[]> {
    const { firestore: db } = requireFirebase()
    const coll = collection(db, ANALYTICS_SUMMARIES_COLLECTION)
    const q = query(coll, where('storyId', '==', storyId), limit(500))
    const snap = await getDocs(q)
    const summaries = snap.docs.map((d) => d.data() as SessionOutcomeSummary)
    if (summaries.length === 0) return []

    const counters = new Map<string, number>()
    for (const s of summaries) {
      for (const [key, value] of Object.entries(s.counters ?? {})) {
        if (value != null) counters.set(key, (counters.get(key) ?? 0) + value)
      }
    }
    const sampleSize = summaries.length
    const nowIso = new Date().toISOString()
    return Array.from(counters.entries()).map(([key, count]) => ({
      key,
      count,
      percentage: sampleSize > 0 ? Math.round((count / sampleSize) * 10000) / 100 : 0,
      sampleSize,
      updatedAt: nowIso,
    }))
  }
}

export class FirebaseStoryPackageProvider implements StoryPackageProvider {
  async listPackages(): Promise<StoryPackageManifest[]> {
    const { firestore: db } = requireFirebase()
    const coll = collection(db, STORY_PACKAGES_COLLECTION)
    const snap = await getDocs(coll)
    return snap.docs.map((d) => d.data() as StoryPackageManifest)
  }
}
