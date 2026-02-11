import { TOAST_STATE } from '../../src/state'

export function resetToastState() {
  TOAST_STATE.toasts = []
  TOAST_STATE.dismissedToasts.clear()
  TOAST_STATE.subscribers = []
}
