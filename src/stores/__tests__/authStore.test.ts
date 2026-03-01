import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../authStore'
import type { AuthSession } from '../../types/cloud'

const mockAuthProvider = {
  getSession: vi.fn((): Promise<AuthSession> =>
    Promise.resolve({ status: 'anonymous', user: { id: 'anonymous', isAnonymous: true } })),
  signInWithEmail: vi.fn((email: string): Promise<AuthSession> =>
    Promise.resolve({
      status: 'authenticated',
      user: { id: 'user_1', email, isAnonymous: false },
    })),
  signUpWithEmail: vi.fn((email: string): Promise<AuthSession> =>
    Promise.resolve({
      status: 'authenticated',
      user: { id: 'user_1', email, isAnonymous: false },
    })),
  signOut: vi.fn(() => Promise.resolve()),
}

vi.mock('../../services/providers/providerFactory', () => ({
  getProviders: () => ({
    authProvider: mockAuthProvider,
    saveProvider: {},
    analyticsProvider: {},
    storyPackageProvider: {},
  }),
}))

function makeStorage() {
  const data = new Map<string, string>()
  return {
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => { data.set(k, v) }),
    removeItem: vi.fn((k: string) => { data.delete(k) }),
  }
}

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('localStorage', makeStorage())
    vi.mocked(mockAuthProvider.getSession).mockResolvedValue({
      status: 'anonymous',
      user: { id: 'anonymous', isAnonymous: true },
    })
    vi.mocked(mockAuthProvider.signInWithEmail).mockResolvedValue({
      status: 'authenticated',
      user: { id: 'user_1', email: 'tester@example.com', isAnonymous: false },
    })
    vi.mocked(mockAuthProvider.signUpWithEmail).mockResolvedValue({
      status: 'authenticated',
      user: { id: 'user_1', email: 'tester@example.com', isAnonymous: false },
    })
  })

  it('boots as anonymous when no session exists', async () => {
    const store = useAuthStore()
    await store.bootstrap()
    expect(store.status).toBe('anonymous')
    expect(store.isAuthenticated).toBe(false)
  })

  it('signs in with email and becomes authenticated', async () => {
    const store = useAuthStore()
    await store.signInWithEmail('tester@example.com', 'test-password')
    expect(store.status).toBe('authenticated')
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.email).toBe('tester@example.com')
  })

  it('signs out back to anonymous mode', async () => {
    const store = useAuthStore()
    await store.signInWithEmail('tester@example.com', 'test-password')
    await store.signOut()
    expect(store.status).toBe('anonymous')
    expect(store.user?.isAnonymous).toBe(true)
  })
})
