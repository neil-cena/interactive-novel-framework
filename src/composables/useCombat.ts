import { computed, ref } from 'vue'
import { ENEMY_DICTIONARY } from '../data/enemies'
import { ITEM_DICTIONARY } from '../data/items'
import { GAME_CONFIG } from '../config'
import type { CombatEncounter, CombatEnemyState } from '../types/combat'
import type { ActionPayload } from '../types/story'
import type { ProcessedAction } from '../engine/actionResolver'
import { rollDice } from '../utils/dice'

const { combat: combatConfig } = GAME_CONFIG

type CombatTurn = 'player' | 'enemy'
type CombatOutcome = 'victory' | 'defeat' | null

export interface TurnOrderEntry {
  id: string
  name: string
  initiative: number
  isPlayer: boolean
}

export function useCombat() {
  const turn = ref<CombatTurn>('player')
  const enemies = ref<CombatEnemyState[]>([])
  const roundCount = ref(1)
  const log = ref<string[]>([])
  const turnOrder = ref<TurnOrderEntry[]>([])

  const isResolved = computed<CombatOutcome>(() => {
    if (enemies.value.length === 0) {
      return null
    }

    if (enemies.value.every((enemy) => enemy.hpCurrent <= 0)) {
      return 'victory'
    }

    return null
  })

  function addLog(entry: string): void {
    log.value = [...log.value, entry]
  }

  function initCombat(
    encounter: CombatEncounter,
    playerDex: number = 0,
    hasSurprise: boolean = false,
  ): void {
    const spawned: CombatEnemyState[] = []

    encounter.enemies.forEach((spawn) => {
      const template = ENEMY_DICTIONARY[spawn.enemyId]
      if (!template) {
        console.warn('[useCombat] initCombat: missing enemy template for id:', spawn.enemyId)
        return
      }

      for (let i = 0; i < spawn.count; i += 1) {
        spawned.push({
          id: `${template.id}_${i + 1}`,
          name: spawn.count > 1 ? `${template.name} ${i + 1}` : template.name,
          hpCurrent: template.hp,
          ac: template.ac,
          attackBonus: template.attackBonus,
          damage: template.damage,
        })
      }
    })

    enemies.value = spawned

    const playerInitRoll = rollDice(`1d20+${playerDex}`)
    const playerInitiative = playerInitRoll.total + (hasSurprise ? 10 : 0)

    const order: TurnOrderEntry[] = [
      { id: 'player', name: 'You', initiative: playerInitiative, isPlayer: true },
    ]
    spawned.forEach((enemy) => {
      const enemyInitRoll = rollDice(`1d20+${enemy.attackBonus}`)
      order.push({ id: enemy.id, name: enemy.name, initiative: enemyInitRoll.total, isPlayer: false })
    })
    order.sort((a, b) => {
      if (b.initiative !== a.initiative) return b.initiative - a.initiative
      return a.isPlayer ? -1 : 1
    })
    turnOrder.value = order

    const firstActor = order[0]
    turn.value = firstActor?.isPlayer ? 'player' : 'enemy'
    roundCount.value = 1
    log.value = ['Combat begins.']
  }

  function playerAttack(
    enemyIndex: number,
    playerWeaponId: string | null,
    playerAttackBonus: number,
    onResult?: (hit: boolean) => void,
  ): void {
    const target = enemies.value[enemyIndex]
    if (!target || target.hpCurrent <= 0) {
      return
    }

    const weapon = playerWeaponId ? ITEM_DICTIONARY[playerWeaponId] : undefined
    if (playerWeaponId && !weapon) {
      console.warn('[useCombat] playerAttack: equipped weapon not in dictionary:', playerWeaponId)
    }
    const hitRoll = rollDice(
      `${combatConfig.attackRollDice}${playerAttackBonus >= 0 ? '+' : ''}${playerAttackBonus}`,
    )
    if (hitRoll.total >= target.ac) {
      const damageDice = weapon?.damage ?? combatConfig.unarmedDamage
      const damageResult = rollDice(damageDice)
      target.hpCurrent = Math.max(0, target.hpCurrent - damageResult.total)
      addLog(`You hit ${target.name} for ${damageResult.total} damage.`)
      onResult?.(true)
    } else {
      addLog(`You miss ${target.name}.`)
      onResult?.(false)
    }

    turn.value = 'enemy'
  }

  function enemyTurn(
    playerAc: number,
    onDamagePlayer: (amount: number) => void,
    onEnemyAttack?: (hit: boolean) => void,
  ): void {
    const livingEnemies = enemies.value.filter((enemy) => enemy.hpCurrent > 0)
    if (livingEnemies.length === 0) {
      return
    }

    livingEnemies.forEach((enemy) => {
      const hitRoll = rollDice(`${combatConfig.attackRollDice}+${enemy.attackBonus}`)
      if (hitRoll.total >= playerAc) {
        const damage = rollDice(enemy.damage).total
        onDamagePlayer(damage)
        addLog(`${enemy.name} hits you for ${damage} damage.`)
        onEnemyAttack?.(true)
      } else {
        addLog(`${enemy.name} misses you.`)
        onEnemyAttack?.(false)
      }
    })

    turn.value = 'player'
    roundCount.value += 1
  }

  function playerAoeAttack(
    playerWeaponId: string | null,
    playerAttackBonus: number,
    onResult?: (hit: boolean) => void,
  ): void {
    const weapon = playerWeaponId ? ITEM_DICTIONARY[playerWeaponId] : undefined
    const damageDice = weapon?.damage ?? combatConfig.unarmedDamage
    const livingEnemies = enemies.value.filter((e) => e.hpCurrent > 0)
    let anyHit = false
    let anyMiss = false

    livingEnemies.forEach((target) => {
      const hitRoll = rollDice(
        `${combatConfig.attackRollDice}${playerAttackBonus >= 0 ? '+' : ''}${playerAttackBonus}`,
      )
      if (hitRoll.total >= target.ac) {
        const damageResult = rollDice(damageDice)
        target.hpCurrent = Math.max(0, target.hpCurrent - damageResult.total)
        addLog(`You hit ${target.name} for ${damageResult.total} damage.`)
        anyHit = true
      } else {
        addLog(`You miss ${target.name}.`)
        anyMiss = true
      }
    })
    if (onResult) {
      if (anyHit) onResult(true)
      if (anyMiss) onResult(false)
    }

    turn.value = 'enemy'
  }

  function useItem(
    itemId: string,
    onResolveEffect: (effect: ActionPayload) => ProcessedAction,
  ): void {
    const item = ITEM_DICTIONARY[itemId]
    if (!item || item.type !== 'consumable' || !item.effect) return
    const result = onResolveEffect(item.effect)
    if (result.type === 'heal' && result.value != null) {
      addLog(`You used ${item.name} and recovered ${result.value} HP.`)
    } else {
      addLog(`You used ${item.name}.`)
    }
    turn.value = 'enemy'
  }

  function resetCombat(): void {
    turn.value = 'player'
    enemies.value = []
    roundCount.value = 1
    log.value = []
    turnOrder.value = []
  }

  return {
    turn,
    enemies,
    roundCount,
    log,
    turnOrder,
    isResolved,
    initCombat,
    playerAttack,
    playerAoeAttack,
    enemyTurn,
    useItem,
    resetCombat,
  }
}
