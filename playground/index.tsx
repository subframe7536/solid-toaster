import '@unocss/reset/tailwind.css'
import 'uno.css'
import '../src/styles/base.css'
import '../src/styles/theme.css'

import { For, createSignal } from 'solid-js'
import { render } from 'solid-js/web'

import type { Position, ToasterProps } from '../src'
import { CompactToaster, Toaster } from '../src'
import { toast } from '../src/state'

const positions: Position[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

const themes: Array<ToasterProps['theme']> = ['light', 'dark', 'system']

function App() {
  const [position, setPosition] = createSignal<Position>('bottom-right')
  const [theme, setTheme] = createSignal<ToasterProps['theme']>('light')
  const [expand, setExpand] = createSignal(false)
  const [richColors, setRichColors] = createSignal(false)
  const [closeButton, setCloseButton] = createSignal(false)

  function firePromiseToast() {
    toast.promise(
      new Promise<{ name: string }>((resolve) => {
        setTimeout(() => resolve({ name: 'Solid toaster' }), 1200)
      }),
      {
        loading: 'Fetching data... ',
        success: (value) => `Loaded ${value.name}`,
        error: (error) => `Failed: ${(error as Error).message}`,
      },
    )
  }

  function fireActionToast() {
    toast('Project deleted', {
      description: 'This can be undone for 5 seconds.',
      action: {
        label: 'Undo',
        onClick(event) {
          event.preventDefault()
          toast.success('Undo complete')
        },
      },
      cancel: {
        label: 'Dismiss',
        onClick() {
          toast('Dismissed')
        },
      },
    })
  }

  function fireTimerToast() {
    toast('Auto close in 5 seconds', {
      description: 'Hover to pause timer, then move away to resume.',
      duration: 5000,
      onAutoClose: () => {
        toast.success('Timer completed')
      },
    })
  }

  function firePositionedToasts() {
    toast('Top-left toast', { position: 'top-left' })
    toast('Top-left toast 2', { position: 'top-left' })
    toast.success('Bottom-center toast', { position: 'bottom-center' })
    toast.error('Top-center toast', { position: 'top-center' })
  }

  function fireCompactToast() {
    toast.loading('Compact toaster with custom styling', {
      toasterId: 'compact',
      style: { background: '#ecfdf5', color: '#065f46', border: '1px solid #10b981' },
    })
  }

  return (
    <main class="min-h-screen bg-slate-50 p-12 px-6 font-sans">
      <h1 class="m-0 text-3xl font-bold">solid-toaster playground</h1>
      <p class="mt-2 mb-6 text-slate-500">Sonner parity playground — hotkey: Alt+T</p>

      <section class="grid gap-4 p-4 max-w-4xl border border-slate-200 bg-white rounded-xl">
        <div class="flex flex-wrap items-center gap-3">
          <label class="grid gap-1.5 text-sm">
            Theme
            <select
              class="px-2 py-1 border border-slate-300 rounded text-sm bg-white"
              value={theme()}
              onChange={(event) => setTheme(event.currentTarget.value as ToasterProps['theme'])}
            >
              <For each={themes}>
                {(currentTheme) => <option value={currentTheme}>{currentTheme}</option>}
              </For>
            </select>
          </label>

          <label class="grid gap-1.5 text-sm">
            Position
            <select
              class="px-2 py-1 border border-slate-300 rounded text-sm bg-white"
              value={position()}
              onChange={(event) => setPosition(event.currentTarget.value as Position)}
            >
              <For each={positions}>
                {(currentPosition) => <option value={currentPosition}>{currentPosition}</option>}
              </For>
            </select>
          </label>

          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              class="w-4 h-4"
              checked={expand()}
              onChange={(event) => setExpand(event.currentTarget.checked)}
            />
            Expand by default
          </label>

          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              class="w-4 h-4"
              checked={richColors()}
              onChange={(event) => setRichColors(event.currentTarget.checked)}
            />
            Rich colors
          </label>

          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              class="w-4 h-4"
              checked={closeButton()}
              onChange={(event) => setCloseButton(event.currentTarget.checked)}
            />
            Close button
          </label>

          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={() => toast.dismiss()}
          >
            Dismiss all
          </button>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={() => toast('Default toast', { description: 'This is a default toast.' })}
          >
            Default
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-white bg-green-600 border border-green-600 rounded hover:bg-green-700 transition-colors"
            onClick={() => toast.success('Success toast')}
          >
            Success
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 transition-colors"
            onClick={() => toast.info('Info toast')}
          >
            Info
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 border border-amber-600 rounded hover:bg-amber-700 transition-colors"
            onClick={() => toast.warning('Warning toast')}
          >
            Warning
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded hover:bg-red-700 transition-colors"
            onClick={() => toast.error('Error toast')}
          >
            Error
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-white bg-slate-600 border border-slate-600 rounded hover:bg-slate-700 transition-colors"
            onClick={() => toast.loading('Loading toast')}
          >
            Loading
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={firePromiseToast}
          >
            Promise
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={fireActionToast}
          >
            Action
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={fireTimerToast}
          >
            Timer
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={() => {
              toast.custom((id) => (
                <div class="p-4 bg-white rounded-lg shadow-lg">
                  Custom headless toast {id}{' '}
                  <button
                    class="ml-2 px-2 py-1 text-xs bg-slate-200 rounded hover:bg-slate-300"
                    onClick={() => toast.dismiss(id)}
                  >
                    Close
                  </button>
                </div>
              ))
            }}
          >
            Custom
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={firePositionedToasts}
          >
            Dynamic positions
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            onClick={() => {
              toast('To global toaster', { toasterId: 'global' })
              toast('To canvas toaster', { toasterId: 'canvas' })
            }}
          >
            Multi-toaster
          </button>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 border border-emerald-600 rounded hover:bg-emerald-700 transition-colors"
            onClick={fireCompactToast}
          >
            Compact
          </button>
        </div>
      </section>

      <Toaster
        theme={theme()}
        position={position()}
        expand={expand()}
        richColors={richColors()}
        closeButton={closeButton()}
        visibleToasts={4}
      />

      <Toaster id="global" theme={theme()} position="top-right" />

      <Toaster
        id="canvas"
        position="top-left"
        theme={theme()}
        offset={{ top: 80, left: 24 }}
        mobileOffset={16}
      />

      <CompactToaster
        id="compact"
        theme={theme()}
        icons={{ loading: <div class="i-lucide:loader-2 animate-spin" /> }}
        position="bottom-left"
      />
    </main>
  )
}

render(() => <App />, document.getElementById('app')!)
