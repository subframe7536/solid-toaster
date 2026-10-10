import { TOAST_STATE } from '../../src/state'

export function resetToastState() {
  TOAST_STATE.reset?.()
  TOAST_STATE.toasts = []
  TOAST_STATE.subscribers = []
}
