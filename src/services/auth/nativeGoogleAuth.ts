/**
 * Native Google Sign-In via @capawesome/capacitor-google-sign-in.
 * Only call this when running on native (iOS/Android); on web use Firebase popup.
 * Uses dynamic import so the plugin is not loaded on web.
 */

const GOOGLE_SCOPES = ['profile', 'email'] as const

export interface NativeGoogleSignInResult {
  idToken: string
}

/**
 * Performs Google Sign-In using the native plugin. Returns the ID token for
 * use with Firebase signInWithCredential. Call only when isNativePlatform().
 *
 * @throws Error with message "Sign-in cancelled" when user cancels
 * @throws Error when client ID is missing or sign-in fails
 */
export async function signInWithGoogleNative(): Promise<NativeGoogleSignInResult> {
  const clientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined
  if (!clientId?.trim()) {
    throw new Error(
      'Google Sign-In is not configured for native. Set VITE_GOOGLE_WEB_CLIENT_ID (Web client ID from Google Cloud Console).',
    )
  }

  const { GoogleSignIn, ErrorCode } = await import('@capawesome/capacitor-google-sign-in')

  try {
    await GoogleSignIn.initialize({
      clientId,
      scopes: [...GOOGLE_SCOPES],
    })
    const result = await GoogleSignIn.signIn()
    if (!result?.idToken) {
      throw new Error('Google Sign-In did not return an ID token.')
    }
    return { idToken: result.idToken }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: string })?.code
    if (code === ErrorCode.SignInCanceled || /cancel|cancelled/i.test(message)) {
      throw new Error('Sign-in cancelled')
    }
    if (err instanceof Error) throw err
    throw new Error(message || 'Google sign-in failed')
  }
}
