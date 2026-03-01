import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '../authStore'

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
  })

  it('boots as anonymous when no session exists', async () => {
    const store = useAuthStore()
    await store.bootstrap()
    expect(store.status).toBe('anonymous')
    expect(store.isAuthenticated).toBe(false)
  })

  it('signs in with email and becomes authenticated', async () => {
    const store = useAuthStore()
    await store.signInWithEmail('tester@example.com')
    expect(store.status).toBe('authenticated')
    expect(store.isAuthenticated).toBe(true)
    expect(store.user?.email).toBe('tester@example.com')
  })

  it('signs out back to anonymous mode', async () => {
    const store = useAuthStore()
    await store.signInWithEmail('tester@example.com')
    await store.signOut()
    expect(store.status).toBe('anonymous')
    expect(store.user?.isAnonymous).toBe(true)
  })
})
