export interface EnemySpawn {
  enemyId: string
  count: number
}

export interface CombatResolution {
  onVictory: { nextNodeId: string }
  onDefeat: { nextNodeId: string }
}

export interface CombatEncounter {
  id: string
  type: 'combat'
  enemies: EnemySpawn[]
  resolution: CombatResolution
}

export interface EnemyTemplate {
  id: string
  name: string
  hp: number
  ac: number
  attackBonus: number
  damage: string
  xpReward: number
}

export interface CombatEnemyState {
  id: string
  name: string
  hpCurrent: number
  ac: number
  attackBonus: number
  damage: string
}
