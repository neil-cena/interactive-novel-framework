import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useNotificationStore } from '../notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds notification and keeps max 5', () => {
    const store = useNotificationStore()
    for (let i = 0; i < 7; i++) {
      store.add('info', `Message ${i}`)
    }
    expect(store.items).toHaveLength(5)
    expect(store.items[store.items.length - 1].message).toBe('Message 6')
  })

  it('dismiss removes by id', () => {
    const store = useNotificationStore()
    store.add('dice', 'Roll: 15')
    const id = store.items[0].id
    store.dismiss(id)
    expect(store.items).toHaveLength(0)
  })

  it('clear removes all', () => {
    const store = useNotificationStore()
    store.add('info', 'A')
    store.add('currency', 'B')
    store.clear()
    expect(store.items).toHaveLength(0)
  })

  it('stores kind and detail', () => {
    const store = useNotificationStore()
    store.add('skill_check', 'Passed', '1d20+2 = 15 vs DC 12')
    expect(store.items[0].kind).toBe('skill_check')
    expect(store.items[0].message).toBe('Passed')
    expect(store.items[0].detail).toBe('1d20+2 = 15 vs DC 12')
  })
})
