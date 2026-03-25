import { useNotificationStore } from '../stores/notificationStore'
import type { NotificationKind } from '../stores/notificationStore'

export function useNotifications() {
  const store = useNotificationStore()
  return {
    notify(kind: NotificationKind, message: string, detail?: string, ttlMs?: number) {
      store.add(kind, message, detail, ttlMs)
    },
    dismiss(id: number) {
      store.dismiss(id)
    },
    clear() {
      store.clear()
    },
  }
}
