import type { FrameworkPlugin } from '../types'
import CharacterSheetPicker from './CharacterSheetPicker.vue'

export const characterCreationPlugin: FrameworkPlugin = {
  id: 'character-creation',
  newGameComponent: CharacterSheetPicker,
}
