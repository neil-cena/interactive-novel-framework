import { Capacitor } from '@capacitor/core'

export type Platform = 'web' | 'ios' | 'android'

/**
 * Returns the current platform: 'web' | 'ios' | 'android'.
 */
export function getPlatform(): Platform {
  return Capacitor.getPlatform() as Platform
}

/**
 * True when running inside a native Capacitor app (iOS or Android).
 */
export function isNativePlatform(): boolean {
  const p = getPlatform()
  return p === 'ios' || p === 'android'
}

/**
 * True when running on Android (e.g. for Play Games sign-in).
 */
export function isAndroid(): boolean {
  return getPlatform() === 'android'
}
