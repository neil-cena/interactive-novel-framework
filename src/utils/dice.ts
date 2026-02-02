export interface DiceResult {
  rolls: number[]
  modifier: number
  total: number
}

const DICE_PATTERN = /^(\d+)d(\d+)\s*([+-]\s*\d+)?$/i

export function rollDice(diceString: string): DiceResult {
  const normalized = diceString.trim()

  // Allow flat integers in payloads (for fixed values)
  if (!Number.isNaN(Number(normalized))) {
    const val = Number(normalized)
    return { rolls: [], modifier: val, total: val }
  }

  // Normalize spacing around modifiers ("1d6 + 2" -> "1d6+2")
  const sanitized = normalized.replace(/\s+/g, '')
  const match = DICE_PATTERN.exec(sanitized)
  if (!match) {
    console.warn(`Invalid dice notation fallback to 0: "${diceString}"`)
    return { rolls: [], modifier: 0, total: 0 }
  }

  const [, diceCountText, diceSidesText, modifierText] = match
  if (!diceCountText || !diceSidesText) {
    console.warn(`Missing dice values fallback to 0: "${diceString}"`)
    return { rolls: [], modifier: 0, total: 0 }
  }

  const diceCount = Number.parseInt(diceCountText, 10)
  const diceSides = Number.parseInt(diceSidesText, 10)
  const modifier = modifierText ? Number.parseInt(modifierText, 10) : 0

  if (diceCount <= 0 || diceSides <= 0) {
    console.warn(`Invalid dice bounds fallback to 0: "${diceString}"`)
    return { rolls: [], modifier: 0, total: 0 }
  }

  const rolls = Array.from({ length: diceCount }, () => {
    return Math.floor(Math.random() * diceSides) + 1
  })

  const baseTotal = rolls.reduce((sum, value) => sum + value, 0)
  return {
    rolls,
    modifier,
    total: baseTotal + modifier,
  }
}
