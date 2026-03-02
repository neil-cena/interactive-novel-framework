import { defineStore } from 'pinia'
import { isAndroid } from '../utils/platform'

export interface PlayGamesPlayer {
  id: string
  displayName: string
  isLogin: boolean
}

export const usePlayGamesStore = defineStore('playGames', {
  state: () => ({
    signedIn: false,
    player: null as PlayGamesPlayer | null,
    error: null as string | null,
  }),

  getters: {
    isSignedIn(state): boolean {
      return state.signedIn && state.player?.isLogin === true
    },
  },

  actions: {
    setSignedIn(player: PlayGamesPlayer | null) {
      this.player = player
      this.signedIn = !!player?.isLogin
      this.error = null
    },

    setError(message: string) {
      this.error = message
    },

    clearError() {
      this.error = null
    },

    /**
     * Sign in with Google Play Games. Only available on Android.
     * Does nothing when not on Android. On success updates signedIn and player.
     */
    async signInWithPlayGames(): Promise<void> {
      if (!isAndroid()) {
        this.setError('Play Games is only available on Android.')
        return
      }
      this.clearError()
      try {
        const { PlayGames } = await import('capacitor-play-games-services')
        const result = await PlayGames.login()
        if (result?.isLogin && result?.id) {
          this.setSignedIn({
            id: result.id,
            displayName: result.display_name ?? 'Player',
            isLogin: result.isLogin,
          })
        } else {
          this.setError(result?.message ?? 'Play Games sign-in did not complete.')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.setError(message || 'Play Games sign-in failed.')
      }
    },

    /**
     * Check current Play Games status. Android only.
     */
    async checkStatus(): Promise<{ isLogin: boolean }> {
      if (!isAndroid()) return { isLogin: false }
      try {
        const { PlayGames } = await import('capacitor-play-games-services')
        const status = await PlayGames.status()
        if (status?.isLogin) {
          this.setSignedIn({
            id: '',
            displayName: this.player?.displayName ?? 'Player',
            isLogin: true,
          })
        } else {
          this.setSignedIn(null)
        }
        return { isLogin: status?.isLogin ?? false }
      } catch {
        this.setSignedIn(null)
        return { isLogin: false }
      }
    },
  },
})
