import { LocalAnalyticsProvider, LocalAuthProvider, LocalSaveProvider, LocalStoryPackageProvider } from './localProvider'
import type { ProviderBundle } from './providerTypes'

let providerCache: ProviderBundle | null = null

export function getProviders(): ProviderBundle {
  if (providerCache) return providerCache
  providerCache = {
    authProvider: new LocalAuthProvider(),
    saveProvider: new LocalSaveProvider(),
    analyticsProvider: new LocalAnalyticsProvider(),
    storyPackageProvider: new LocalStoryPackageProvider(),
  }
  return providerCache
}
