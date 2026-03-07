import type { FrameworkPlugin } from '../types'
import TheaterMode from './TheaterMode.vue'

export const theaterPlugin: FrameworkPlugin = {
  id: 'theater',

  mechanics: {
    theater_begin: (mechanic, ctx) => {
      ctx.startGameMode('theater', {
        exitNodeId: (mechanic.exitNodeId as string) ?? 'theater_revelation',
      })
    },
  },

  gameModes: {
    theater: TheaterMode,
  },
}
