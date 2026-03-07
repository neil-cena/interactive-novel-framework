import type { FrameworkPlugin } from '../types'
import CombatMode from './CombatMode.vue'

export const combatPlugin: FrameworkPlugin = {
  id: 'combat',

  mechanics: {
    combat_init: (mechanic, ctx) => {
      ctx.startGameMode('combat', { encounterId: mechanic.encounterId as string })
    },
  },

  gameModes: {
    combat: CombatMode,
  },
}
