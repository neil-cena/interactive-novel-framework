import type { FrameworkPlugin } from './plugins/types'
import { vitalsPlugin } from './plugins/vitals'
import { inventoryPlugin } from './plugins/inventory'
import { worldStatePlugin } from './plugins/world-state'
import { theaterPlugin } from './plugins/theater'
import { feralParliamentPlugin } from './plugins/feral-parliament'
import { progressionPlugin } from './plugins/progression'
import { reputationPlugin } from './plugins/reputation'

export const GAME_PLUGINS: FrameworkPlugin[] = [
  vitalsPlugin,
  inventoryPlugin,
  worldStatePlugin,
  theaterPlugin,
  feralParliamentPlugin,
  progressionPlugin,
  reputationPlugin,
]
