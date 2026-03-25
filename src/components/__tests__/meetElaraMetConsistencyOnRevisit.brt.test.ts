/**
 * BRT (Phase 2 /auto-debug): If `visitedNodes` already records `meet_elara` but `elara_met`
 * is missing/false (e.g. save merge dropped the flag), entering `meet_elara` again must not
 * leave the inconsistent state that exposes the first-intro `navigate:meet_elara` paths from
 * purifier entrances.
 *
 * **Public API under test:** `NarrativeView.vue` watch on `playerStore.metadata.currentNodeId`
 * (immediate, flush post) — same entry path as the running app when the current node changes.
 *
 * **Expected contract (either fix is valid):**
 * - `elara_met` becomes true after entry handling, or
 * - navigation redirects away from `meet_elara`.
 */
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { nextTick } from 'vue'
import NarrativeView from '../NarrativeView.vue'
import { createPluginRegistry, PLUGIN_REGISTRY_KEY } from '../../plugins/registry'
import { usePlayerStore } from '../../stores/playerStore'

vi.mock('../../services/analyticsClient', () => ({
  trackOutcomeEvent: vi.fn(),
}))

vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    unload: vi.fn(),
  })),
}))

describe('BRT: meet_elara entry reconciles elara_met when visitedNodes already has meet_elara', () => {
  let pinia: Pinia

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sets elara_met or redirects after navigating to meet_elara when the flag was dropped', async () => {
    const store = usePlayerStore()
    store.$patch({
      metadata: { currentNodeId: 'elara_basement_return' },
      visitedNodes: ['meet_elara'],
      flags: {},
    })
    expect(store.flags.elara_met).toBeUndefined()

    const wrapper = mount(NarrativeView, {
      global: {
        plugins: [pinia],
        provide: {
          [PLUGIN_REGISTRY_KEY]: createPluginRegistry(),
        },
        stubs: {
          ChoiceList: { props: ['choices', 'state'], template: '<div class="choice-stub" />' },
        },
      },
    })

    store.navigateTo('meet_elara')
    await nextTick()
    await flushPromises()

    const flagReconciled = store.flags.elara_met === true
    const redirectedAway = store.metadata.currentNodeId !== 'meet_elara'
    expect(
      flagReconciled || redirectedAway,
      'Engine must set elara_met or redirect when meet_elara is re-entered after a flag/visit desync',
    ).toBe(true)

    wrapper.unmount()
  })
})
