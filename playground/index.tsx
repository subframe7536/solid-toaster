import { For, createSignal } from 'solid-js'
import { render } from 'solid-js/web'

import type { Position, ToasterProps } from '../src'

import { Toaster, toast } from '../src'

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
      new Promise<{ name: string }>((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() < 0.4) {
            reject(new Error('Upload failed'))
            return
          }

          resolve({ name: 'Report.pdf' })
        }, 1300)
      }),
      {
        loading: 'Uploading report…',
        success: (data) => `${data.name} uploaded`,
        error: 'Upload failed',
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
          toast.message('Dismissed')
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
    toast.success('Bottom-center toast', { position: 'bottom-center' })
    toast.error('Top-center toast', { position: 'top-center' })
  }

  return (
    <main
      style={{
        'font-family': 'Inter, ui-sans-serif, system-ui, sans-serif',
        padding: '48px 24px',
        'min-height': '100vh',
        background: '#f8fafc',
      }}
    >
      <h1 style={{ margin: '0', 'font-size': '30px', 'font-weight': '700' }}>
        solid-toaster playground
      </h1>
      <p style={{ margin: '8px 0 24px', color: '#64748b' }}>
        Sonner parity playground — hotkey: Alt+T
      </p>

      <section
        style={{
          display: 'grid',
          gap: '14px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          'border-radius': '12px',
          'max-width': '960px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
          <label style={{ display: 'grid', gap: '6px', 'font-size': '13px' }}>
            Theme
            <select
              value={theme()}
              onChange={(event) => setTheme(event.currentTarget.value as ToasterProps['theme'])}
            >
              <For each={themes}>
                {(currentTheme) => <option value={currentTheme}>{currentTheme}</option>}
              </For>
            </select>
          </label>

          <label style={{ display: 'grid', gap: '6px', 'font-size': '13px' }}>
            Position
            <select
              value={position()}
              onChange={(event) => setPosition(event.currentTarget.value as Position)}
            >
              <For each={positions}>
                {(currentPosition) => <option value={currentPosition}>{currentPosition}</option>}
              </For>
            </select>
          </label>

          <label
            style={{ display: 'flex', gap: '6px', 'align-items': 'center', 'font-size': '13px' }}
          >
            <input
              type="checkbox"
              checked={expand()}
              onChange={(event) => setExpand(event.currentTarget.checked)}
            />
            Expand by default
          </label>

          <label
            style={{ display: 'flex', gap: '6px', 'align-items': 'center', 'font-size': '13px' }}
          >
            <input
              type="checkbox"
              checked={richColors()}
              onChange={(event) => setRichColors(event.currentTarget.checked)}
            />
            Rich colors
          </label>

          <label
            style={{ display: 'flex', gap: '6px', 'align-items': 'center', 'font-size': '13px' }}
          >
            <input
              type="checkbox"
              checked={closeButton()}
              onChange={(event) => setCloseButton(event.currentTarget.checked)}
            />
            Close button
          </label>

          <button type="button" onClick={() => toast.dismiss()}>
            Dismiss all
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', 'flex-wrap': 'wrap' }}>
          <button
            type="button"
            onClick={() => toast('Default toast', { description: 'This is a default toast.' })}
          >
            Default
          </button>
          <button type="button" onClick={() => toast.success('Success toast')}>
            Success
          </button>
          <button type="button" onClick={() => toast.info('Info toast')}>
            Info
          </button>
          <button type="button" onClick={() => toast.warning('Warning toast')}>
            Warning
          </button>
          <button type="button" onClick={() => toast.error('Error toast')}>
            Error
          </button>
          <button type="button" onClick={() => toast.loading('Loading toast')}>
            Loading
          </button>
          <button type="button" onClick={firePromiseToast}>
            Promise
          </button>
          <button type="button" onClick={fireActionToast}>
            Action
          </button>
          <button type="button" onClick={fireTimerToast}>
            Timer
          </button>
          <button
            type="button"
            onClick={() => {
              toast.custom((id) => (
                <div>
                  Custom headless toast {id}{' '}
                  <button onClick={() => toast.dismiss(id)}>Close</button>
                </div>
              ))
            }}
          >
            Custom
          </button>
          <button type="button" onClick={firePositionedToasts}>
            Dynamic positions
          </button>
          <button
            type="button"
            onClick={() => {
              toast('To global toaster', { toasterId: 'global' })
              toast('To canvas toaster', { toasterId: 'canvas' })
            }}
          >
            Multi-toaster
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
    </main>
  )
}

render(() => <App />, document.getElementById('app')!)
