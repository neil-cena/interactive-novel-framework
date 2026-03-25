/**
 * Author tools modal — behavior per RED gate `tdd/task_01_red_spec.md` (see also template `tdd/task_K_red_spec.md`).
 * RED author role: `xb-brt-forge`; executor: `xb-implementer` via `generalPurpose` Task.
 */
// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createPluginRegistry, PLUGIN_REGISTRY_KEY } from '../../plugins/registry'
import MainMenu from '../MainMenu.vue'

const featureState = vi.hoisted(() => ({
  sharedOutcomes: true,
  storyPackages: true,
  cloudSave: false,
}))

vi.mock('../../config', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../config')>()
  return {
    ...mod,
    GAME_CONFIG: new Proxy(mod.GAME_CONFIG, {
      get(target, prop, receiver) {
        if (prop === 'features') {
          return {
            ...target.features,
            sharedOutcomes: featureState.sharedOutcomes,
            storyPackages: featureState.storyPackages,
            cloudSave: featureState.cloudSave,
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    }),
  }
})

vi.mock('../../services/analyticsClient', () => ({
  getOutcomeStats: vi.fn().mockResolvedValue([]),
  trackOutcomeEvent: vi.fn(),
}))

vi.mock('../../services/providers/providerFactory', () => ({
  getProviders: vi.fn(() => ({
    storyPackageProvider: {
      listPackages: vi.fn().mockResolvedValue([]),
    },
  })),
}))

vi.mock('../../utils/storage', () => ({
  getAllSaves: vi.fn(() => [
    { slotId: 'save_slot_1', data: null },
    { slotId: 'save_slot_2', data: null },
    { slotId: 'save_slot_3', data: null },
  ]),
  getSlotSyncState: vi.fn(() => ({ status: 'idle' as const })),
  deleteSave: vi.fn(),
  resolveSlotConflict: vi.fn(),
  syncCloudSavesNow: vi.fn(),
}))

vi.mock('howler', () => ({
  Howl: class HowlStub {
    private vol = 1
    play = vi.fn()
    stop = vi.fn()
    unload = vi.fn()
    loop = vi.fn()
    fade = vi.fn()
    playing = vi.fn().mockReturnValue(false)
    volume(v?: number): number | void {
      if (v !== undefined) {
        this.vol = v
        return
      }
      return this.vol
    }
  },
}))

function mountMenu(pinia: Pinia) {
  return mount(MainMenu, {
    global: {
      plugins: [pinia],
      provide: {
        [PLUGIN_REGISTRY_KEY]: createPluginRegistry(),
      },
    },
    attachTo: document.body,
  })
}

describe('MainMenu author tools modal (tdd/task_01_red_spec.md)', () => {
  let pinia: Pinia

  beforeEach(() => {
    featureState.sharedOutcomes = true
    featureState.storyPackages = true
    featureState.cloudSave = false
    pinia = createPinia()
    setActivePinia(pinia)
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not render Shared Outcomes, Telemetry (Author), or Story Library inline on the main menu when flags are on (modal closed)', async () => {
    const wrapper = mountMenu(pinia)
    await flushPromises()
    const main = wrapper.get('main[aria-label="Main menu"]').element
    expect(main.querySelector('[role="dialog"]')).toBeNull()
    expect(main.textContent).not.toMatch(/Shared Outcomes/)
    expect(main.textContent).not.toMatch(/Telemetry \(Author\)/)
    expect(main.textContent).not.toMatch(/Story Library/)
    wrapper.unmount()
  })

  it('shows exactly one visible entry control (author-tools-open) when both entry features are on', async () => {
    const wrapper = mountMenu(pinia)
    await flushPromises()
    const openBtn = wrapper.get('[data-testid="author-tools-open"]')
    expect(openBtn.isVisible()).toBe(true)
    expect(wrapper.findAll('[data-testid="author-tools-open"]')).toHaveLength(1)
    wrapper.unmount()
  })

  it('opens a visible dialog with role=dialog and aria-modal=true', async () => {
    const wrapper = mountMenu(pinia)
    await flushPromises()
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    const dialogs = wrapper.findAll('[role="dialog"]')
    expect(dialogs).toHaveLength(1)
    const dialog = dialogs[0]
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.isVisible()).toBe(true)
    wrapper.unmount()
  })

  it('places Shared Outcomes, Telemetry (Author), and Story Library inside the dialog when flags are on', async () => {
    const wrapper = mountMenu(pinia)
    await flushPromises()
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]').element
    for (const label of ['Shared Outcomes', 'Telemetry (Author)', 'Story Library']) {
      const el = Array.from(dialog.querySelectorAll('h3')).find((h) => h.textContent?.includes(label))
      expect(el, label).toBeTruthy()
      expect(el!.closest('[role="dialog"]')).toBe(dialog)
    }
    wrapper.unmount()
  })

  it('hides Shared Outcomes when sharedOutcomes is off; keeps other enabled sections in dialog', async () => {
    featureState.sharedOutcomes = false
    featureState.storyPackages = true
    const wrapper = mountMenu(pinia)
    await flushPromises()
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]').element
    expect(dialog.textContent).not.toMatch(/Shared Outcomes/)
    expect(dialog.textContent).toMatch(/Story Library/)
    wrapper.unmount()
  })

  it('hides Story Library when storyPackages is off; keeps other enabled sections in dialog', async () => {
    featureState.sharedOutcomes = true
    featureState.storyPackages = false
    const wrapper = mountMenu(pinia)
    await flushPromises()
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]').element
    expect(dialog.textContent).not.toMatch(/Story Library/)
    expect(dialog.textContent).toMatch(/Shared Outcomes/)
    expect(dialog.textContent).toMatch(/Telemetry \(Author\)/)
    wrapper.unmount()
  })

  it.skip('telemetry independently gated — product ties TelemetryDashboard to sharedOutcomes only (see GREEN notes)', async () => {
    // Case 7 from tdd/task_01_red_spec.md: skipped per RED when telemetry is not independently gated.
  })

  it('closes the modal when the backdrop is clicked', async () => {
    const wrapper = mountMenu(pinia)
    await flushPromises()
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    await wrapper.get('[data-testid="author-tools-backdrop"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('closes the modal on Escape', async () => {
    const wrapper = mountMenu(pinia)
    await flushPromises()
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('closes the modal when the explicit close control is activated', async () => {
    const wrapper = mountMenu(pinia)
    await flushPromises()
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="author-tools-close"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('hides entry control and author dialog when both sharedOutcomes and storyPackages are off', async () => {
    featureState.sharedOutcomes = false
    featureState.storyPackages = false
    const wrapper = mountMenu(pinia)
    await flushPromises()
    expect(wrapper.find('[data-testid="author-tools-open"]').exists()).toBe(false)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('with only sharedOutcomes on: entry present, modal works, Story Library absent', async () => {
    featureState.sharedOutcomes = true
    featureState.storyPackages = false
    const wrapper = mountMenu(pinia)
    await flushPromises()
    expect(wrapper.find('[data-testid="author-tools-open"]').exists()).toBe(true)
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]').element
    expect(dialog.textContent).toMatch(/Shared Outcomes/)
    expect(dialog.textContent).not.toMatch(/Story Library/)
    await wrapper.get('[data-testid="author-tools-close"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('with only storyPackages on: entry present, modal works, Shared Outcomes absent', async () => {
    featureState.sharedOutcomes = false
    featureState.storyPackages = true
    const wrapper = mountMenu(pinia)
    await flushPromises()
    expect(wrapper.find('[data-testid="author-tools-open"]').exists()).toBe(true)
    await wrapper.get('[data-testid="author-tools-open"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]').element
    expect(dialog.textContent).toMatch(/Story Library/)
    expect(dialog.textContent).not.toMatch(/Shared Outcomes/)
    wrapper.unmount()
  })
})
