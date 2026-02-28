import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  splitPipe,
  asNumber,
  asBoolean,
  parseAction,
  parseVisibility,
  parseMechanic,
  parseOnEnter,
  validateData,
  NODE_TYPES,
  ITEM_TYPES,
  DICE_NOTATION_REGEX,
} from '../build-data.js'

describe('splitPipe', () => {
  it('returns empty array for empty string', () => {
    expect(splitPipe('')).toEqual([])
  })
  it('returns single value', () => {
    expect(splitPipe('a')).toEqual(['a'])
  })
  it('splits by pipe and trims', () => {
    expect(splitPipe('a | b | c')).toEqual(['a', 'b', 'c'])
  })
  it('filters empty entries', () => {
    expect(splitPipe('a||b')).toEqual(['a', 'b'])
  })
})

describe('asNumber', () => {
  it('parses valid number strings', () => {
    expect(asNumber('42')).toBe(42)
    expect(asNumber('-5')).toBe(-5)
  })
  it('returns fallback for empty or invalid', () => {
    expect(asNumber('', 99)).toBe(99)
    expect(asNumber('x', 0)).toBe(0)
  })
})

describe('asBoolean', () => {
  it('parses true/false', () => {
    expect(asBoolean('true')).toBe(true)
    expect(asBoolean('false')).toBe(false)
  })
  it('returns fallback for empty or other', () => {
    expect(asBoolean('', true)).toBe(true)
    expect(asBoolean('yes', false)).toBe(false)
  })
})

describe('parseAction', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses set_flag', () => {
    expect(parseAction('set_flag:foo:true')).toEqual({ action: 'set_flag', key: 'foo', value: true })
  })
  it('parses add_item with qty', () => {
    expect(parseAction('add_item:potion:2')).toEqual({ action: 'add_item', itemId: 'potion', qty: 2 })
  })
  it('parses remove_item', () => {
    expect(parseAction('remove_item:key:1')).toEqual({ action: 'remove_item', itemId: 'key', qty: 1 })
  })
  it('parses adjust_hp', () => {
    expect(parseAction('adjust_hp:-3')).toEqual({ action: 'adjust_hp', amount: -3 })
  })
  it('parses adjust_currency', () => {
    expect(parseAction('adjust_currency:25')).toEqual({ action: 'adjust_currency', amount: 25 })
  })
  it('returns null for unknown action', () => {
    expect(parseAction('unknown:x')).toBeNull()
  })
  it('returns null for missing key in set_flag', () => {
    expect(parseAction('set_flag:')).toBeNull()
  })
})

describe('parseMechanic', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses navigate', () => {
    expect(parseMechanic('navigate:n_market')).toEqual({ type: 'navigate', nextNodeId: 'n_market' })
  })
  it('parses combat_init', () => {
    expect(parseMechanic('combat_init:enc_1')).toEqual({ type: 'combat_init', encounterId: 'enc_1' })
  })
  it('parses skill_check', () => {
    const result = parseMechanic('skill_check:1d20+2:12:n_win:n_fail')
    expect(result?.type).toBe('skill_check')
    expect(result?.dice).toBe('1d20+2')
    expect(result?.dc).toBe(12)
    expect(result?.onSuccess.nextNodeId).toBe('n_win')
    expect(result?.onFailure.nextNodeId).toBe('n_fail')
  })
  it('returns null for empty mechanic', () => {
    expect(parseMechanic('')).toBeNull()
  })
})

describe('parseVisibility', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('parses has_flag', () => {
    expect(parseVisibility('has_flag:ready')).toEqual([{ type: 'has_flag', key: 'ready' }])
  })
  it('parses has_item', () => {
    expect(parseVisibility('has_item:sword')).toEqual([{ type: 'has_item', itemId: 'sword' }])
  })
  it('parses stat_check', () => {
    const result = parseVisibility('stat_check:currency:>=:15')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('stat_check')
    expect(result[0].stat).toBe('currency')
    expect(result[0].operator).toBe('>=')
    expect(result[0].value).toBe(15)
  })
})

describe('parseOnEnter', () => {
  it('parses pipe-separated actions', () => {
    const result = parseOnEnter('adjust_currency:-15 | add_item:smoke_bomb:1')
    expect(result).toHaveLength(2)
    expect(result[0].action).toBe('adjust_currency')
    expect(result[1].action).toBe('add_item')
  })
  it('returns undefined for empty', () => {
    expect(parseOnEnter('')).toBeUndefined()
  })
})

describe('validateData', () => {
  it('reports error when navigate targets missing node', () => {
    const nodes = {
      n_a: { id: 'n_a', type: 'encounter', text: '', choices: [{ id: 'c1', label: 'Go', mechanic: { type: 'navigate', nextNodeId: 'n_missing' } }] },
    }
    const { errors } = validateData(nodes, {}, {}, {})
    expect(errors.some((e) => e.includes('n_missing') && e.includes('navigate'))).toBe(true)
  })
  it('reports error when encounter references missing enemy', () => {
    const encounters = {
      enc_1: { id: 'enc_1', type: 'combat', enemies: [{ enemyId: 'missing_enemy', count: 1 }], resolution: { onVictory: { nextNodeId: 'n_a' }, onDefeat: { nextNodeId: 'n_a' } } },
    }
    const nodes = { n_a: { id: 'n_a', type: 'encounter', text: '' } }
    const { errors } = validateData(nodes, {}, {}, encounters)
    expect(errors.some((e) => e.includes('missing_enemy'))).toBe(true)
  })
  it('reports error when encounter has no enemies', () => {
    const encounters = {
      enc_1: { id: 'enc_1', type: 'combat', enemies: [], resolution: { onVictory: { nextNodeId: 'n_a' }, onDefeat: { nextNodeId: 'n_a' } } },
    }
    const nodes = { n_a: { id: 'n_a', type: 'encounter', text: '' } }
    const { errors } = validateData(nodes, {}, {}, encounters)
    expect(errors.some((e) => e.includes('no enemies'))).toBe(true)
  })
  it('reports error for invalid node type', () => {
    const nodes = { n_a: { id: 'n_a', type: 'invalid', text: '' } }
    const { errors } = validateData(nodes, {}, {}, {})
    expect(errors.some((e) => e.includes('invalid type'))).toBe(true)
  })
  it('returns no errors for valid minimal data', () => {
    const nodes = { n_start: { id: 'n_start', type: 'encounter', text: 'Hi' } }
    const items = { potion: { id: 'potion', name: 'Potion', type: 'consumable' } }
    const enemies = { goblin: { id: 'goblin', name: 'Goblin', hp: 5, ac: 10, attackBonus: 0, damage: '1d4' } }
    const encounters = {
      enc_1: { id: 'enc_1', type: 'combat', enemies: [{ enemyId: 'goblin', count: 1 }], resolution: { onVictory: { nextNodeId: 'n_start' }, onDefeat: { nextNodeId: 'n_start' } } },
    }
    const { errors } = validateData(nodes, items, enemies, encounters)
    expect(errors).toHaveLength(0)
  })
})

describe('constants', () => {
  it('NODE_TYPES contains expected values', () => {
    expect(NODE_TYPES.has('narrative')).toBe(true)
    expect(NODE_TYPES.has('encounter')).toBe(true)
    expect(NODE_TYPES.has('ending')).toBe(true)
  })
  it('ITEM_TYPES contains expected values', () => {
    expect(ITEM_TYPES.has('weapon')).toBe(true)
    expect(ITEM_TYPES.has('consumable')).toBe(true)
    expect(ITEM_TYPES.has('tool')).toBe(true)
  })
  it('DICE_NOTATION_REGEX matches valid notation', () => {
    expect(DICE_NOTATION_REGEX.test('1d20')).toBe(true)
    expect(DICE_NOTATION_REGEX.test('2d6+3')).toBe(true)
    expect(DICE_NOTATION_REGEX.test('1d4-1')).toBe(true)
    expect(DICE_NOTATION_REGEX.test('abc')).toBe(false)
  })
})
