import { createSignal, onCleanup, onMount } from 'solid-js'
import { isServer } from 'solid-js/web'

export function useIsDocumentHidden() {
  if (isServer) {
    return () => true
  }
  const [isDocumentHidden, setIsDocumentHidden] = createSignal(false)

  onMount(() => {
    const callback = () => setIsDocumentHidden(document.hidden)
    document.addEventListener('visibilitychange', callback)
    onCleanup(() => document.removeEventListener('visibilitychange', callback))
  })

  return isDocumentHidden
}
