import { ToastState } from '../../src/state'

export function resetToastState() {
  ToastState.toasts = []
  ToastState.dismissedToasts.clear()
  ToastState.subscribers = []
}
