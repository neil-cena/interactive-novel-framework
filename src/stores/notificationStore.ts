import { defineStore } from 'pinia'

export type NotificationKind = 'dice' | 'skill_check' | 'level_up' | 'currency' | 'info'

export interface Notification {
  id: number
  kind: NotificationKind
  message: string
  detail?: string
  createdAt: number
}

const MAX_TOASTS = 5
const DEFAULT_TTL_MS = 4000

let nextId = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    items: [] as Notification[],
  }),

  actions: {
    add(kind: NotificationKind, message: string, detail?: string, ttlMs = DEFAULT_TTL_MS) {
      const id = ++nextId
      const item: Notification = {
        id,
        kind,
        message,
        detail,
        createdAt: Date.now(),
      }
      this.items = [...this.items.slice(-(MAX_TOASTS - 1)), item]

      if (ttlMs > 0) {
        const t = setTimeout(() => {
          this.dismiss(id)
          timers.delete(id)
        }, ttlMs)
        timers.set(id, t)
      }
    },

    dismiss(id: number) {
      const t = timers.get(id)
      if (t) {
        clearTimeout(t)
        timers.delete(id)
      }
      this.items = this.items.filter((n) => n.id !== id)
    },

    clear() {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
      this.items = []
    },
  },
})
