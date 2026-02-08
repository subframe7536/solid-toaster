import type { JSX } from 'solid-js'

import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { toast } from '../src/state'
import { Toaster, useToaster } from '../src/toaster'
import { resetToastState } from './helpers/toast-state'

describe('Toaster', () => {
  beforeEach(() => {
    resetToastState()
    document.documentElement.removeAttribute('dir')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders a toast with default props', async () => {
    render(() => <Toaster />)

    toast('My Toast')

    expect(await screen.findByText('My Toast')).toBeInTheDocument()

    const toastItem = document.querySelector('[data-sonner-toast]')
    expect(toastItem).not.toHaveAttribute('data-type')
  })

  it('renders toast actions and dismisses on action click', async () => {
    const onActionClick = vi.fn()

    render(() => <Toaster closeButton />)

    toast('Action Toast', {
      action: {
        label: 'Undo',
        onClick: onActionClick,
      },
    })

    const actionButton = await screen.findByRole('button', { name: 'Undo' })
    actionButton.click()

    expect(onActionClick).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(screen.queryByText('Action Toast')).not.toBeInTheDocument()
    })
  })

  it('shows close button with custom aria label', async () => {
    render(() => <Toaster closeButton toastOptions={{ closeButtonAriaLabel: 'Dismiss notice' }} />)

    toast('Closable')

    expect(await screen.findByRole('button', { name: 'Dismiss notice' })).toBeInTheDocument()
  })

  it('filters by toaster id', async () => {
    render(() => (
      <>
        <Toaster />
        <Toaster id="secondary" />
      </>
    ))

    toast('Global toast')
    toast('Secondary toast', { toasterId: 'secondary' })

    await screen.findByText('Global toast')
    await screen.findByText('Secondary toast')

    const lists = document.querySelectorAll('[data-sonner-toaster]')

    expect(lists).toHaveLength(2)
    expect(lists[0]?.textContent).toContain('Global toast')
    expect(lists[0]?.textContent).not.toContain('Secondary toast')
    expect(lists[1]?.textContent).toContain('Secondary toast')
    expect(lists[1]?.textContent).not.toContain('Global toast')
  })

  it('sets custom and default aria labels', () => {
    const { unmount } = render(() => <Toaster hotkey={['altKey', 'KeyT']} />)

    expect(screen.getByLabelText('Notifications alt+T')).toBeInTheDocument()

    unmount()

    render(() => <Toaster customAriaLabel="Custom notifications" />)
    expect(screen.getByLabelText('Custom notifications')).toBeInTheDocument()
  })

  it('renders toaster theme based on prop', async () => {
    render(() => <Toaster theme="dark" />)

    toast('Dark themed toast')
    await screen.findByText('Dark themed toast')

    const toasterList = document.querySelector('[data-sonner-toaster]')
    expect(toasterList).toHaveAttribute('data-sonner-theme', 'dark')
  })

  it('adds toast testId as data-testid', async () => {
    render(() => <Toaster />)

    toast('With test id', { testId: 'my-test-toast' })

    expect(await screen.findByTestId('my-test-toast')).toBeInTheDocument()
    expect(await screen.findByText('With test id')).toBeInTheDocument()
  })

  it('applies offset styles from number and object values', async () => {
    render(() => <Toaster offset={12} mobileOffset={{ top: 4, left: '3rem' }} />)

    toast('Offset toast')
    await screen.findByText('Offset toast')

    const list = document.querySelector('[data-sonner-toaster]')
    expect(list).toHaveAttribute(
      'style',
      expect.stringContaining(
        '--offset-top: 12px; --offset-right: 12px; --offset-bottom: 12px; --offset-left: 12px;',
      ),
    )
    expect(list).toHaveAttribute('style', expect.stringContaining('--mobile-offset-top: 4px;'))
    expect(list).toHaveAttribute(
      'style',
      expect.stringContaining(
        '--mobile-offset-right: 16px; --mobile-offset-bottom: 16px; --mobile-offset-left: 3rem;',
      ),
    )
  })

  it('renders dir from document element when not explicitly provided', async () => {
    document.documentElement.setAttribute('dir', 'rtl')

    render(() => <Toaster />)
    toast('RTL toast')

    await screen.findByText('RTL toast')
    const list = document.querySelector('[data-sonner-toaster]')
    expect(list).toHaveAttribute('dir', 'rtl')

    document.documentElement.removeAttribute('dir')
  })

  it('renders ltr dir when explicit auto and computed style is ltr', async () => {
    document.documentElement.setAttribute('dir', 'auto')
    const originalGetComputedStyle = window.getComputedStyle.bind(window)

    const styleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
      const computed = originalGetComputedStyle(element)

      if (element === document.documentElement) {
        return new Proxy(computed, {
          get(target, property) {
            if (property === 'direction') {
              return 'ltr'
            }

            return Reflect.get(target, property)
          },
        }) as CSSStyleDeclaration
      }

      return computed
    })

    render(() => <Toaster dir="auto" />)
    toast('Auto dir toast')

    await screen.findByText('Auto dir toast')

    const list = document.querySelector('[data-sonner-toaster]')
    expect(list).toHaveAttribute('dir', 'ltr')

    styleSpy.mockRestore()
  })

  it('resolves system theme and fallback matchMedia listener API', async () => {
    const addListener = vi.fn()
    const removeListener = vi.fn()

    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: true,
          media: '(prefers-color-scheme: dark)',
          onchange: null,
          addEventListener: () => {
            throw new Error('unsupported')
          },
          removeEventListener: vi.fn(),
          addListener,
          removeListener,
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    )

    const { unmount } = render(() => <Toaster theme="system" />)

    toast('System theme toast')
    await screen.findByText('System theme toast')

    const list = document.querySelector('[data-sonner-toaster]')
    expect(list).toHaveAttribute('data-sonner-theme', 'dark')
    expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
    expect(addListener).toHaveBeenCalledTimes(1)

    unmount()
    expect(removeListener).toHaveBeenCalledTimes(1)
  })

  it('updates system theme when media query event listener fires', async () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | undefined

    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: false,
          media: '(prefers-color-scheme: dark)',
          onchange: null,
          addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
            if (typeof listener === 'function') {
              changeHandler = listener as (event: MediaQueryListEvent) => void
            }
          },
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    )

    render(() => <Toaster theme="system" />)
    toast('Theme toggle toast')

    await screen.findByText('Theme toggle toast')

    const list = document.querySelector('[data-sonner-toaster]')
    expect(list).toHaveAttribute('data-sonner-theme', 'light')

    changeHandler?.({ matches: true } as MediaQueryListEvent)

    await waitFor(() => {
      expect(list).toHaveAttribute('data-sonner-theme', 'dark')
    })
  })

  it('renders custom loading icon and close node icon', async () => {
    const closeNode = document.createElement('span')
    closeNode.textContent = 'X'

    render(() => (
      <Toaster
        closeButton
        icons={{
          loading: <span data-testid="custom-loader">L</span>,
          close: closeNode as unknown as JSX.Element,
        }}
      />
    ))

    toast.loading('Loading custom icon')
    toast('Closable icon')

    expect(await screen.findByTestId('custom-loader')).toBeInTheDocument()
    expect(await screen.findByText('X')).toBeInTheDocument()
  })

  it('renders loading icon wrapper when icons.loading is direct node', async () => {
    render(() => <Toaster icons={{ loading: <span data-testid="node-loader">N</span> }} />)

    toast.loading('Node loading')

    await screen.findByText('Node loading')
    expect(screen.getByTestId('node-loader')).toBeInTheDocument()

    const loader = document.querySelector('.sonner-loader')
    expect(loader).toBeInTheDocument()
  })

  it('skips icon section when icon is explicitly null', async () => {
    render(() => <Toaster />)

    toast.success('No icon', {
      icon: null,
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('No icon')

    const toastItem = document.querySelector('[data-sonner-toast]')
    expect(toastItem?.querySelector('[data-icon]')).toBeNull()
  })

  it('renders text cancel/action nodes when not action objects', async () => {
    render(() => <Toaster />)

    toast('String buttons', {
      cancel: 'Cancel node' as any,
      action: 'Action node' as any,
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('String buttons')

    const toastItem = document.querySelector('[data-sonner-toast]')
    expect(toastItem?.textContent).toContain('Cancel node')
    expect(toastItem?.textContent).toContain('Action node')
  })

  it('keeps toast when action handler prevents default', async () => {
    render(() => <Toaster />)

    toast('Prevent close', {
      action: {
        label: 'Stay',
        onClick: (event) => {
          event.preventDefault()
        },
      },
      duration: Number.POSITIVE_INFINITY,
    })

    const actionButton = await screen.findByRole('button', { name: 'Stay' })
    fireEvent.click(actionButton)

    expect(screen.getByText('Prevent close')).toBeInTheDocument()
  })

  it('does not dismiss when action value is not an action object', async () => {
    render(() => <Toaster />)

    toast('Non action value', {
      action: 'Action text' as any,
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('Action text')

    const actionButton = document.querySelector('[data-action]')
    expect(actionButton).toBeNull()
    expect(screen.getByText('Non action value')).toBeInTheDocument()
  })

  it('dismisses through close button and triggers onDismiss callback', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()

    render(() => <Toaster closeButton />)

    toast('Close me', { onDismiss, duration: Number.POSITIVE_INFINITY })

    const closeButton = await screen.findByRole('button', { name: 'Close toast' })
    fireEvent.click(closeButton)

    expect(onDismiss).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(250)
    await waitFor(() => {
      expect(screen.queryByText('Close me')).not.toBeInTheDocument()
    })
  })

  it('does not dismiss non-dismissible toast via close button', async () => {
    render(() => <Toaster closeButton />)

    toast('Pinned', {
      dismissible: false,
      duration: Number.POSITIVE_INFINITY,
    })

    const closeButton = await screen.findByRole('button', { name: 'Close toast' })
    fireEvent.click(closeButton)

    expect(screen.getByText('Pinned')).toBeInTheDocument()
  })

  it('does not render close button for loading toast', async () => {
    render(() => <Toaster closeButton />)

    toast.loading('Loading toast', {
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('Loading toast')
    expect(screen.queryByRole('button', { name: 'Close toast' })).not.toBeInTheDocument()
  })

  it('auto closes toast after duration and invokes onAutoClose', async () => {
    vi.useFakeTimers()
    const onAutoClose = vi.fn()

    render(() => <Toaster />)

    toast('Auto close', {
      duration: 20,
      onAutoClose,
    })

    await screen.findByText('Auto close')

    vi.advanceTimersByTime(30)
    expect(onAutoClose).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(250)
    await waitFor(() => {
      expect(screen.queryByText('Auto close')).not.toBeInTheDocument()
    })
  })

  it('pauses timer on toaster hover and resumes after leave', async () => {
    vi.useFakeTimers()

    render(() => <Toaster />)

    toast('Hover pause', {
      duration: 120,
    })

    await screen.findByText('Hover pause')
    const list = document.querySelector('[data-sonner-toaster]') as HTMLElement

    fireEvent.mouseEnter(list)
    vi.advanceTimersByTime(400)
    expect(screen.getByText('Hover pause')).toBeInTheDocument()

    fireEvent.mouseLeave(list)
    vi.advanceTimersByTime(400)

    expect(screen.queryByText('Hover pause')).not.toBeInTheDocument()
  })

  it('updates existing toast by id and handles dismiss event lifecycle', async () => {
    vi.useFakeTimers()

    render(() => <Toaster />)

    toast('Initial', { id: 'same-id', duration: Number.POSITIVE_INFINITY })
    await screen.findByText('Initial')

    toast.success('Updated', { id: 'same-id', duration: Number.POSITIVE_INFINITY })

    await waitFor(() => {
      expect(screen.queryByText('Initial')).not.toBeInTheDocument()
      expect(screen.getByText('Updated')).toBeInTheDocument()
    })

    toast.dismiss('same-id')

    vi.advanceTimersByTime(250)
    await waitFor(() => {
      expect(screen.queryByText('Updated')).not.toBeInTheDocument()
    })
  })

  it('handles swipe-to-dismiss gesture and drag end reset', async () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()

    render(() => <Toaster />)

    toast('Swipe toast', {
      onDismiss,
      duration: Number.POSITIVE_INFINITY,
    })

    const toastItem = (await screen.findByText('Swipe toast')).closest(
      '[data-sonner-toast]',
    ) as HTMLElement
    expect(toastItem).toBeInTheDocument()

    ;(toastItem as any).setPointerCapture = vi.fn()

    fireEvent.pointerDown(toastItem, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    })

    fireEvent.pointerMove(toastItem, {
      pointerId: 1,
      clientX: 10,
      clientY: 90,
    })

    fireEvent.pointerUp(toastItem, { pointerId: 1 })

    expect(onDismiss).toHaveBeenCalledTimes(1)
    fireEvent.dragEnd(toastItem)

    vi.advanceTimersByTime(250)
    await waitFor(() => {
      expect(screen.queryByText('Swipe toast')).not.toBeInTheDocument()
    })
  })

  it('does not start swipe on right click or non-dismissible toast', async () => {
    render(() => <Toaster />)

    toast('No swipe', {
      dismissible: false,
      duration: Number.POSITIVE_INFINITY,
    })

    const toastItem = (await screen.findByText('No swipe')).closest(
      '[data-sonner-toast]',
    ) as HTMLElement
    ;(toastItem as any).setPointerCapture = vi.fn()

    fireEvent.pointerDown(toastItem, {
      button: 2,
      pointerId: 2,
      clientX: 10,
      clientY: 10,
    })

    fireEvent.pointerDown(toastItem, {
      button: 0,
      pointerId: 3,
      clientX: 10,
      clientY: 10,
    })

    fireEvent.pointerMove(toastItem, {
      pointerId: 3,
      clientX: 50,
      clientY: 10,
    })

    fireEvent.pointerUp(toastItem, { pointerId: 3 })

    expect(toastItem).toHaveAttribute('data-swiping', 'false')
    expect(screen.getByText('No swipe')).toBeInTheDocument()
  })

  it('does not change swipe amount when text selection exists', async () => {
    const selectionSpy = vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'selected text',
    } as Selection)

    render(() => <Toaster />)

    toast('Selection toast', {
      duration: Number.POSITIVE_INFINITY,
    })

    const toastItem = (await screen.findByText('Selection toast')).closest(
      '[data-sonner-toast]',
    ) as HTMLElement
    ;(toastItem as any).setPointerCapture = vi.fn()

    fireEvent.pointerDown(toastItem, {
      button: 0,
      pointerId: 4,
      clientX: 10,
      clientY: 10,
    })

    fireEvent.pointerMove(toastItem, {
      pointerId: 4,
      clientX: 10,
      clientY: 120,
    })

    expect(toastItem.style.getPropertyValue('--swipe-amount-y')).toBe('')

    selectionSpy.mockRestore()
  })

  it('computes transformed height when transform matrix is present', async () => {
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          width: 100,
          height: 100,
          top: 0,
          left: 0,
          right: 100,
          bottom: 100,
          x: 0,
          y: 0,
          toJSON: () => {},
        }) as DOMRect,
    )

    const originalGetComputedStyle = window.getComputedStyle.bind(window)
    const styleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
      const computed = originalGetComputedStyle(element)

      return new Proxy(computed, {
        get(target, property) {
          if (property === 'transform') {
            return 'matrix(1, 0, 0, 2, 0, 0)'
          }

          return Reflect.get(target, property)
        },
      }) as CSSStyleDeclaration
    })

    render(() => <Toaster />)
    toast('Scaled')

    const toastItem = (await screen.findByText('Scaled')).closest('[data-sonner-toast]')
    expect(toastItem).toHaveAttribute('style', expect.stringContaining('--initial-height: 50px'))

    rectSpy.mockRestore()
    styleSpy.mockRestore()
  })

  it('renders multiple position lists and reacts to hotkey + escape', async () => {
    render(() => <Toaster />)

    toast('Bottom toast', { duration: Number.POSITIVE_INFINITY })
    toast('Top toast', { position: 'top-left', duration: Number.POSITIVE_INFINITY })

    await screen.findByText('Bottom toast')
    await screen.findByText('Top toast')

    const lists = document.querySelectorAll<HTMLElement>('[data-sonner-toaster]')
    expect(lists).toHaveLength(2)
    expect(Array.from(lists).some((list) => list.dataset.yPosition === 'top')).toBe(true)

    fireEvent.keyDown(document, { altKey: true, code: 'KeyT' })

    await waitFor(() => {
      const firstToast = document.querySelector('[data-sonner-toast]')
      expect(firstToast).toHaveAttribute('data-expanded', 'true')
    })

    fireEvent.keyDown(document, { code: 'Escape' })

    await waitFor(() => {
      const firstToast = document.querySelector('[data-sonner-toast]')
      expect(firstToast).toHaveAttribute('data-expanded', 'false')
    })
  })

  it('handles horizontal swipe direction with left position', async () => {
    vi.useFakeTimers()

    render(() => <Toaster position="top-left" />)

    toast('Horizontal swipe', {
      duration: Number.POSITIVE_INFINITY,
    })

    const toastItem = (await screen.findByText('Horizontal swipe')).closest(
      '[data-sonner-toast]',
    ) as HTMLElement
    ;(toastItem as any).setPointerCapture = vi.fn()

    fireEvent.pointerDown(toastItem, {
      button: 0,
      pointerId: 5,
      clientX: 100,
      clientY: 10,
    })

    fireEvent.pointerMove(toastItem, {
      pointerId: 5,
      clientX: 10,
      clientY: 10,
    })

    fireEvent.pointerUp(toastItem, { pointerId: 5 })

    vi.advanceTimersByTime(250)
    await waitFor(() => {
      expect(screen.queryByText('Horizontal swipe')).not.toBeInTheDocument()
    })
  })

  it('returns focus to previous element when toaster unmounts', async () => {
    const button = document.createElement('button')
    button.textContent = 'focus-source'
    document.body.append(button)
    button.focus()

    const { unmount } = render(() => <Toaster />)

    toast('Focus toast', {
      duration: Number.POSITIVE_INFINITY,
    })

    const toastItem = (await screen.findByText('Focus toast')).closest(
      '[data-sonner-toaster]',
    ) as HTMLElement
    fireEvent.focus(toastItem, { relatedTarget: button })

    unmount()

    expect(document.activeElement).toBe(button)
    button.remove()
  })

  it('keeps toast when cancel button is action but dismissible is false', async () => {
    const onCancel = vi.fn()

    render(() => <Toaster />)

    toast('Cancel pinned', {
      dismissible: false,
      duration: Number.POSITIVE_INFINITY,
      cancel: {
        label: 'Cancel',
        onClick: onCancel,
      },
    })

    const cancelButton = await screen.findByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByText('Cancel pinned')).toBeInTheDocument()
  })
})

describe('useToaster', () => {
  beforeEach(() => {
    resetToastState()
  })

  it('subscribes to state updates', async () => {
    render(() => {
      const { toasts } = useToaster()

      return (
        <div data-testid="hook-output">
          {toasts()
            .map((item) => item.title)
            .join(',')}
        </div>
      )
    })

    toast('From hook')

    await waitFor(() => {
      expect(screen.getByTestId('hook-output')).toHaveTextContent('From hook')
    })
  })

  it('updates existing toast and removes on dismiss event', async () => {
    render(() => {
      const { toasts } = useToaster()

      return (
        <div data-testid="hook-ids">
          {toasts()
            .map((item) => item.title)
            .join('|')}
        </div>
      )
    })

    toast('First value', { id: 'hook-id' })
    await waitFor(() => {
      expect(screen.getByTestId('hook-ids')).toHaveTextContent('First value')
    })

    toast.success('Updated value', { id: 'hook-id' })
    await waitFor(() => {
      expect(screen.getByTestId('hook-ids')).toHaveTextContent('Updated value')
    })

    toast.dismiss('hook-id')

    await waitFor(() => {
      expect(screen.getByTestId('hook-ids')).toHaveTextContent('')
    })
  })
})
