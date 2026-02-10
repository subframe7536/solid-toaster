import { ToastCore } from '../../src/state'

export function resetToastState() {
  ToastCore.toasts = []
  ToastCore.dismissedToasts.clear()
  ToastCore.subscribers = []
}
