import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import MainMenu from '../MainMenu.vue'

describe('MainMenu cloud sync UI', () => {
  setActivePinia(createPinia())

  it('exports a component', () => {
    expect(MainMenu).toBeDefined()
  })
})
