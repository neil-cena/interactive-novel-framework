import type { FrameworkPlugin } from '../types'
import FeralParliamentMode from './FeralParliamentMode.vue'

export const feralParliamentPlugin: FrameworkPlugin = {
  id: 'feral-parliament',

  mechanics: {
    feral_parliament_begin: (mechanic, ctx) => {
      ctx.startGameMode('feral_parliament', {
        exitNodeId: (mechanic.exitNodeId as string) ?? 'start',
      })
    },
  },

  gameModes: {
    feral_parliament: FeralParliamentMode,
  },
}
