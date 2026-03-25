import type { FrameworkPlugin, MechanicHandler } from '../types'
import { rollDice } from '../../utils/dice'
import { GAME_CONFIG } from '../../config'

const skillCheck: MechanicHandler = (mechanic, ctx) => {
  const dice = mechanic.dice as string
  const dc = mechanic.dc as number
  const attribute = mechanic.attribute as string | undefined
  const skillId = mechanic.skillId as string | undefined
  const onSuccess = mechanic.onSuccess as { nextNodeId: string }
  const onFailure = mechanic.onFailure as { nextNodeId: string }
  const onFailureEncounterId = mechanic.onFailureEncounterId as string | undefined

  ctx.playSfx('dice_roll')

  let attrMod = attribute ? (ctx.playerStore.attributes[attribute] ?? 0) : 0
  if (skillId && ctx.playerStore.skillsProficiency[skillId]) {
    attrMod += GAME_CONFIG.skills.proficiencyBonus
  }

  const roll = rollDice(dice)
  const adjustedTotal = roll.total + attrMod

  const detail = attribute
    ? `[${roll.rolls.join(', ')}] ${roll.modifier >= 0 ? '+' : ''}${roll.modifier} + ${attrMod} (${attribute.toUpperCase()}) = ${adjustedTotal} vs DC ${dc}`
    : `[${roll.rolls.join(', ')}] ${roll.modifier >= 0 ? '+' : ''}${roll.modifier} = ${adjustedTotal} vs DC ${dc}`

  const success = adjustedTotal >= dc
  ctx.playSfx(success ? 'skill_success' : 'skill_fail')
  ctx.notify('skill_check', success ? 'Skill check passed' : 'Skill check failed', detail)

  if (success) {
    ctx.trackOutcome('chapter_completed', {
      nodeId: ctx.currentNodeId,
      choiceId: ctx.choiceId,
      result: 'success',
    })
    ctx.navigateTo(onSuccess.nextNodeId)
    return
  }

  if (onFailureEncounterId) {
    ctx.startGameMode('combat', { encounterId: onFailureEncounterId })
    return
  }

  ctx.navigateTo(onFailure.nextNodeId)
}

export const progressionPlugin: FrameworkPlugin = {
  id: 'progression',

  mechanics: {
    skill_check: skillCheck,
  },
}
