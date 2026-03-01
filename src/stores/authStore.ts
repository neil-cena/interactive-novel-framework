import { defineStore } from 'pinia'
import type { AuthSession, AuthStatus, SessionUser } from '../types/cloud'
import { getProviders } from '../services/providers/providerFactory'

export const useAuthStore = defineStore('auth', {
  state: (): AuthSession => ({
    status: 'anonymous',
    user: { id: 'anonymous', isAnonymous: true },
    error: undefined,
  }),

  getters: {
    isAuthenticated(state): boolean {
      return state.status === 'authenticated' && !!state.user && !state.user.isAnonymous
    },
    userId(state): string | null {
      return state.user?.id ?? null
    },
  },

  actions: {
    setSession(status: AuthStatus, user: SessionUser | null, error?: string) {
      this.status = status
      this.user = user
      this.error = error
    },
    async bootstrap() {
      this.setSession('authenticating', this.user)
      const timeoutMs = 5000
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth bootstrap timeout')), timeoutMs)
      )
      try {
        const { authProvider } = getProviders()
        const session = await Promise.race([authProvider.getSession(), timeout])
        this.setSession(session.status, session.user, session.error)
      } catch (e) {
        this.setSession('error', null, e instanceof Error ? e.message : 'Failed to bootstrap auth')
      }
    },
    async signInWithEmail(email: string, password: string) {
      this.setSession('authenticating', this.user)
      try {
        const { authProvider } = getProviders()
        const session = await authProvider.signInWithEmail(email, password)
        this.setSession(session.status, session.user, session.error)
      } catch (e) {
        this.setSession('error', null, e instanceof Error ? e.message : 'Failed to sign in')
      }
    },
    async signUpWithEmail(email: string, password: string) {
      this.setSession('authenticating', this.user)
      try {
        const { authProvider } = getProviders()
        const session = await authProvider.signUpWithEmail(email, password)
        this.setSession(session.status, session.user, session.error)
      } catch (e) {
        this.setSession('error', null, e instanceof Error ? e.message : 'Failed to create account')
      }
    },
    async signOut() {
      try {
        const { authProvider } = getProviders()
        await authProvider.signOut()
      } finally {
        this.setSession('anonymous', { id: 'anonymous', isAnonymous: true })
      }
    },
  },
})
