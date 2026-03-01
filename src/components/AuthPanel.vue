<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const email = ref('')

async function signIn() {
  if (!email.value.trim()) return
  await authStore.signInWithEmail(email.value)
  email.value = ''
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

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <template v-if="!authStore.isAuthenticated">
        <input
          v-model="email"
          type="email"
          class="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400"
          placeholder="you@example.com"
          aria-label="Email for sign in"
        >
        <button
          type="button"
          class="rounded border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
          :disabled="authStore.status === 'authenticating'"
          @click="signIn"
        >
          {{ authStore.status === 'authenticating' ? 'Signing in...' : 'Sign in' }}
        </button>
      </template>
      <button
        v-else
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
