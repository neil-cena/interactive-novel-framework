import { GAME_CONFIG } from '../../config'
import { isFirebaseConfigured } from '../firebase/firebaseClient'
import {
  FirebaseAnalyticsProvider,
  FirebaseAuthProvider,
  FirebaseSaveProvider,
  FirebaseStoryPackageProvider,
} from './firebaseProvider'
import { LocalAnalyticsProvider, LocalAuthProvider, LocalSaveProvider, LocalStoryPackageProvider } from './localProvider'
import type { ProviderBundle } from './providerTypes'

let providerCache: ProviderBundle | null = null

function useFirebase(): boolean {
  const mode = import.meta.env.VITE_PROVIDER_MODE as string | undefined
  if (mode === 'local') return false
  if (mode === 'firebase') return isFirebaseConfigured()
  return GAME_CONFIG.features.cloudSave && isFirebaseConfigured()
}

export function getProviders(): ProviderBundle {
  if (providerCache) return providerCache
  if (useFirebase()) {
    providerCache = {
      authProvider: new FirebaseAuthProvider(),
      saveProvider: new FirebaseSaveProvider(),
      analyticsProvider: new FirebaseAnalyticsProvider(),
      storyPackageProvider: new FirebaseStoryPackageProvider(),
    }
  } else {
    providerCache = {
      authProvider: new LocalAuthProvider(),
      saveProvider: new LocalSaveProvider(),
      analyticsProvider: new LocalAnalyticsProvider(),
      storyPackageProvider: new LocalStoryPackageProvider(),
    }
  }
  return providerCache
}
