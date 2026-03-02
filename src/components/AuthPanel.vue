<script setup lang="ts">
import { computed, ref } from 'vue'
import { getProviders } from '../services/providers/providerFactory'
import { useAuthStore } from '../stores/authStore'
import { usePlayGamesStore } from '../stores/playGamesStore'
import { isAndroid } from '../utils/platform'

const authStore = useAuthStore()
const playGamesStore = usePlayGamesStore()
const email = ref('')
const password = ref('')
const isSignUp = ref(false)

const googleSignInAvailable = computed(() => typeof getProviders().authProvider.signInWithGoogle === 'function')
const showPlayGamesSignIn = computed(() => isAndroid())
const isPlayGamesSigningIn = ref(false)

async function signIn() {
  if (!email.value.trim() || !password.value) return
  await authStore.signInWithEmail(email.value, password.value)
  if (!authStore.error) {
    email.value = ''
    password.value = ''
  }
}

async function signUp() {
  if (!email.value.trim() || !password.value) return
  await authStore.signUpWithEmail(email.value, password.value)
  if (!authStore.error) {
    email.value = ''
    password.value = ''
  }
}

async function handlePlayGamesSignIn() {
  if (!showPlayGamesSignIn.value) return
  isPlayGamesSigningIn.value = true
  playGamesStore.clearError()
  try {
    await playGamesStore.signInWithPlayGames()
  } finally {
    isPlayGamesSigningIn.value = false
  }
}

function submit() {
  if (isSignUp.value) signUp()
  else signIn()
}
</script>

<template>
  <section class="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
    <h3 class="text-sm font-semibold uppercase tracking-wide text-slate-300">Cloud Account</h3>

    <p v-if="authStore.isAuthenticated" class="mt-2 text-sm text-slate-200">
      Signed in as <span class="font-semibold">{{ authStore.user?.email ?? authStore.user?.id }}</span>
    </p>
    <p v-else class="mt-2 text-sm text-slate-300">
      Playing anonymously. Sign in to enable cloud sync.
    </p>

    <div v-if="showPlayGamesSignIn" class="mt-3 space-y-2">
      <p v-if="playGamesStore.isSignedIn" class="text-sm text-slate-200">
        Play Games: signed in as <span class="font-semibold">{{ playGamesStore.player?.displayName ?? 'Player' }}</span>
      </p>
      <div v-else class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
          :disabled="isPlayGamesSigningIn"
          aria-label="Sign in with Google Play Games"
          @click="handlePlayGamesSignIn"
        >
          {{ isPlayGamesSigningIn ? 'Signing in…' : 'Sign in with Play Games' }}
        </button>
      </div>
      <p v-if="playGamesStore.error" class="text-xs text-red-300">{{ playGamesStore.error }}</p>
    </div>

    <div v-if="!authStore.isAuthenticated" class="mt-3 space-y-2">
      <div v-if="googleSignInAvailable" class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
          :disabled="authStore.status === 'authenticating'"
          @click="authStore.signInWithGoogle"
        >
          Sign in with Google
        </button>
      </div>
      <p v-if="googleSignInAvailable" class="text-xs text-slate-500">Or use email and password below.</p>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          class="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 sm:w-auto sm:min-w-[200px]"
          placeholder="you@example.com"
          aria-label="Email"
        >
        <input
          v-model="password"
          type="password"
          :autocomplete="isSignUp ? 'new-password' : 'current-password'"
          class="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 sm:w-auto sm:min-w-[140px]"
          placeholder="Password"
          aria-label="Password"
          @keydown.enter="submit"
        >
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
          :disabled="authStore.status === 'authenticating'"
          @click="submit"
        >
          {{ authStore.status === 'authenticating' ? 'Please wait...' : (isSignUp ? 'Create account' : 'Sign in') }}
        </button>
        <button
          type="button"
          class="rounded border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
          :disabled="authStore.status === 'authenticating'"
          @click="isSignUp = !isSignUp"
        >
          {{ isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up' }}
        </button>
      </div>
    </div>
    <div v-else class="mt-3">
      <button
        type="button"
        class="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
        @click="authStore.signOut"
      >
        Sign out
      </button>
    </div>

    <p v-if="authStore.error" class="mt-2 text-xs text-red-300">{{ authStore.error }}</p>
  </section>
</template>
