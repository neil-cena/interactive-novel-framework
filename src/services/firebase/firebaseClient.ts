/**
 * Firebase client bootstrap. Initialized only when env config is present.
 * Export app, auth, firestore for use by Firebase providers.
 */

import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined
const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined

const hasConfig =
  typeof apiKey === 'string' &&
  apiKey.length > 0 &&
  typeof authDomain === 'string' &&
  typeof projectId === 'string' &&
  typeof appId === 'string'

let auth: Auth | null = null
let firestore: Firestore | null = null

if (hasConfig) {
  const app = getApps().length > 0 ? getApp() : initializeApp({
    apiKey,
    authDomain,
    projectId,
    appId,
  })
  auth = getAuth(app)
  firestore = getFirestore(app)
}

export { auth, firestore }
export const isFirebaseConfigured = (): boolean => hasConfig
