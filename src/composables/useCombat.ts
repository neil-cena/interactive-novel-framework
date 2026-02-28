import { computed, ref } from 'vue'
import { ENEMY_DICTIONARY } from '../data/enemies'
import { ITEM_DICTIONARY } from '../data/items'
import { GAME_CONFIG } from '../config'
import type { CombatEncounter, CombatEnemyState } from '../types/combat'
import { rollDice } from '../utils/dice'

const { combat: combatConfig } = GAME_CONFIG

type CombatTurn = 'player' | 'enemy'
type CombatOutcome = 'victory' | 'defeat' | null

export function useCombat() {
  const turn = ref<CombatTurn>('player')
  const enemies = ref<CombatEnemyState[]>([])
  const roundCount = ref(1)
  const log = ref<string[]>([])

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

  function initCombat(encounter: CombatEncounter): void {
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
    turn.value = 'player'
    roundCount.value = 1
    log.value = ['Combat begins.']
  }

  function playerAttack(
    enemyIndex: number,
    playerWeaponId: string | null,
    playerAttackBonus: number,
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
    } else {
      addLog(`You miss ${target.name}.`)
    }

    turn.value = 'enemy'
  }

  function enemyTurn(playerAc: number, onDamagePlayer: (amount: number) => void): void {
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
      } else {
        addLog(`${enemy.name} misses you.`)
      }
    })

    turn.value = 'player'
    roundCount.value += 1
  }

  function resetCombat(): void {
    turn.value = 'player'
    enemies.value = []
    roundCount.value = 1
    log.value = []
  }

  return {
    turn,
    enemies,
    roundCount,
    log,
    isResolved,
    initCombat,
    playerAttack,
    enemyTurn,
    resetCombat,
  }
}
