import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Google Sign-In on native (iOS/Android) uses @capawesome/capacitor-google-sign-in
 * with runtime config: clientId from VITE_GOOGLE_WEB_CLIENT_ID (Web client ID from
 * Google Cloud Console, same as used for Firebase).
 */
const config: CapacitorConfig = {
  appId: 'com.cellardebt.game',
  appName: 'The Cellar Debt',
  webDir: 'dist',
  bundledWebRuntime: false,
}

export default config
