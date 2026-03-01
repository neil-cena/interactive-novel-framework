import { describe, expect, it, vi } from 'vitest'
import { getProviders } from '../providerFactory'

describe('providerFactory', () => {
  it('returns a provider bundle with auth, save, analytics, and storyPackage providers', () => {
    const bundle = getProviders()
    expect(bundle.authProvider).toBeDefined()
    expect(bundle.saveProvider).toBeDefined()
    expect(bundle.analyticsProvider).toBeDefined()
    expect(bundle.storyPackageProvider).toBeDefined()
    expect(typeof bundle.authProvider.getSession).toBe('function')
    expect(typeof bundle.authProvider.signInWithEmail).toBe('function')
    expect(typeof bundle.authProvider.signOut).toBe('function')
    expect(typeof bundle.saveProvider.getSave).toBe('function')
    expect(typeof bundle.saveProvider.listSaves).toBe('function')
    expect(typeof bundle.saveProvider.upsertSave).toBe('function')
    expect(typeof bundle.analyticsProvider.ingestEvents).toBe('function')
    expect(typeof bundle.analyticsProvider.getOutcomeStats).toBe('function')
    expect(typeof bundle.storyPackageProvider.listPackages).toBe('function')
  })

  it('returns the same bundle on subsequent calls', () => {
    const a = getProviders()
    const b = getProviders()
    expect(a).toBe(b)
    expect(a.authProvider).toBe(b.authProvider)
  })
})
