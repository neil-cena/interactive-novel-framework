import type { SaveMergeChoice, SaveConflict } from '../../types/cloud'

export function isDivergedConflict(conflict: SaveConflict): boolean {
  return conflict.local.revision !== conflict.cloud.revision
}

export function pickWinner(conflict: SaveConflict, choice: Exclude<SaveMergeChoice, 'keep_both'>) {
  return choice === 'use_local' ? conflict.local : conflict.cloud
}
