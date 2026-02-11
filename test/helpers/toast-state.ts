import { DEFAULT_TOAST_CORE } from '../../src/state'

export function resetToastState() {
  DEFAULT_TOAST_CORE.toasts = []
  DEFAULT_TOAST_CORE.dismissedToasts.clear()
  DEFAULT_TOAST_CORE.subscribers = []
}
