import type { Accessor, Component, JSX } from 'solid-js'
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  untrack,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'

import { CloseIcon, ErrorIcon, InfoIcon, LoadingIcon, SuccessIcon, WarningIcon } from './assets'
import { useIsDocumentHidden } from './hooks'
import type { ToastState } from './state'
import { TOAST_STATE } from './state'
import type {
  HeightT,
  Position,
  SwipeDirection,
  ToastItemProps,
  ToastIcons,
  ToastT,
  ToasterProps,
} from './types'
import { isAction } from './types'

const VISIBLE_TOASTS_AMOUNT = 3
const VIEWPORT_OFFSET = '24px'
const MOBILE_VIEWPORT_OFFSET = '16px'
const TOAST_LIFETIME = 4000
const TOAST_WIDTH = 356
const GAP = 14
const SWIPE_THRESHOLD = 45
const TIME_BEFORE_UNMOUNT = 200

function cn(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ')
}

function matchesToasterId(toast: ToastT, toasterId?: string) {
  if (toasterId) {
    return toast.toasterId === toasterId
  }

  return !toast.toasterId
}

function getDefaultSwipeDirections(position: string): Array<SwipeDirection> {
  const [y, x] = position.split('-')
  const directions: Array<SwipeDirection> = []

  if (y) {
    directions.push(y as SwipeDirection)
  }

  if (x) {
    directions.push(x as SwipeDirection)
  }

  return directions
}

function getDocumentDirection(): ToasterProps['dir'] {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 'ltr'
  }

  const dirAttribute = document.documentElement.getAttribute('dir')

  if (dirAttribute === 'auto' || !dirAttribute) {
    return window.getComputedStyle(document.documentElement).direction as ToasterProps['dir']
  }

  return dirAttribute as ToasterProps['dir']
}

function assignOffset(
  defaultOffset: ToasterProps['offset'],
  mobileOffset: ToasterProps['mobileOffset'],
) {
  const styles: JSX.CSSProperties = {}

  ;[defaultOffset, mobileOffset].forEach((offset, index) => {
    const isMobile = index === 1
    const prefix = isMobile ? '--mobile-offset' : '--offset'
    const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET

    function assignAll(targetOffset: string | number) {
      ;['top', 'right', 'bottom', 'left'].forEach((key) => {
        styles[`${prefix}-${key}`] =
          typeof targetOffset === 'number' ? `${targetOffset}px` : targetOffset
      })
    }

    if (typeof offset === 'number' || typeof offset === 'string') {
      assignAll(offset)
    } else if (offset && typeof offset === 'object') {
      ;['top', 'right', 'bottom', 'left'].forEach((key) => {
        const value = offset[key as keyof typeof offset]

        if (value === undefined) {
          styles[`${prefix}-${key}`] = defaultValue
        } else {
          styles[`${prefix}-${key}`] = typeof value === 'number' ? `${value}px` : value
        }
      })
    } else {
      assignAll(defaultValue)
    }
  })

  return styles
}

function getScaleYFromTransform(transformValue: string): number {
  if (!transformValue || transformValue === 'none') {
    return 1
  }

  const matrix3dMatch = transformValue.match(/matrix3d\((.+)\)/)

  if (matrix3dMatch) {
    const values = matrix3dMatch[1]?.split(',').map((value) => Number.parseFloat(value.trim()))
    const scaleY = values?.[5]

    if (scaleY && Number.isFinite(scaleY) && scaleY > 0) {
      return scaleY
    }

    return 1
  }

  const matrixMatch = transformValue.match(/matrix\((.+)\)/)

  if (!matrixMatch) {
    return 1
  }

  const values = matrixMatch[1]?.split(',').map((value) => Number.parseFloat(value.trim()))
  const scaleY = values?.[3]

  if (scaleY && Number.isFinite(scaleY) && scaleY > 0) {
    return scaleY
  }

  return 1
}

function measureElementHeight(element: HTMLElement): number {
  const rawHeight = element.getBoundingClientRect().height
  const scaleY = getScaleYFromTransform(window.getComputedStyle(element).transform)

  return rawHeight / scaleY
}

function canRenderNode(node: unknown): boolean {
  return node !== null && node !== undefined
}

/**
 * Access the current toasts from the toast store.
 * @example
 * const { toasts } = useToaster()
 * createEffect(() => console.log(toasts()))
 */
export function useToaster(store: ToastState = TOAST_STATE): Pick<
  typeof TOAST_STATE,
  'create' | 'subscribe' | 'reset' | 'remove' | 'dismiss'
> & {
  toasts: Accessor<ToastT[]>
} {
  return {
    toasts: store.getActiveToasts,
    subscribe: store.subscribe,
    create: store.create,
    reset: store.reset,
    remove: store.remove,
    dismiss: store.dismiss,
  }
}

function ToastItem(props: ToastItemProps) {
  let toastRef: HTMLLIElement | null = null

  const [swipeDirection, setSwipeDirection] = createSignal<'x' | 'y' | null>(null)
  const [swipeOutDirection, setSwipeOutDirection] = createSignal<
    'left' | 'right' | 'up' | 'down' | null
  >(null)
  const [mounted, setMounted] = createSignal(untrack(() => props.toast.mounted))
  const [removed, setRemoved] = createSignal(false)
  const [swiping, setSwiping] = createSignal(false)
  const [swipeOut, setSwipeOut] = createSignal(false)
  const [isSwiped, setIsSwiped] = createSignal(false)
  const [offsetBeforeRemove, setOffsetBeforeRemove] = createSignal(0)
  const [initialHeight, setInitialHeight] = createSignal(0)
  const [isBumping, setIsBumping] = createSignal(false)

  let remainingTime = TOAST_LIFETIME
  let dragStartTime: Date | null = null
  let closeTimerStartTime = 0
  let lastCloseTimerStartTime = 0
  let pointerStart: { x: number; y: number } | null = null
  let timeoutId: number | undefined
  let bumpTimeoutId: number | undefined

  const toastType = () => props.toast.type
  const dismissible = () => props.toast.dismissible !== false
  const duration = () => props.toast.duration || props.duration || TOAST_LIFETIME
  const bumpKey = () =>
    props.toast.bumpKey ??
    (props.highlightedToastId === props.toast.id ? (props.highlightKey ?? 0) : 0)

  const toastsHeightBefore = createMemo(() => {
    let totalHeight = 0

    for (let toastIndex = 0; toastIndex < props.index; toastIndex += 1) {
      const toastBefore = props.toasts[toastIndex]

      if (!toastBefore) {
        continue
      }

      const height = props.heights.find((heightItem) => heightItem.toastId === toastBefore.id)
      totalHeight += height?.height || 0
    }

    return totalHeight
  })

  const isDocumentHidden = useIsDocumentHidden()

  const disabled = () => toastType() === 'loading'

  const offset = createMemo(() => props.index * (props.gap ?? GAP) + toastsHeightBefore())

  createEffect(
    on(duration, (currentDuration) => {
      remainingTime = currentDuration
    }),
  )

  onMount(() => {
    setMounted(true)

    const initialToastId = props.toast.id
    const initialToastPosition = props.toast.position

    const toastNode = toastRef
    if (toastNode) {
      const height = measureElementHeight(toastNode)
      setInitialHeight(height)

      props.setHeights((currentHeights) => [
        { toastId: initialToastId, height, position: initialToastPosition },
        ...currentHeights,
      ])
    }

    onCleanup(() => {
      props.setHeights((currentHeights) =>
        currentHeights.filter((height) => height.toastId !== initialToastId),
      )
    })
  })

  createEffect(
    on(
      () => [
        mounted(),
        props.toast.title,
        props.toast.description,
        props.toast.jsx,
        props.toast.action,
        props.toast.cancel,
      ],
      ([isMounted]) => {
        if (!isMounted || !toastRef) {
          return
        }

        const toastId = props.toast.id
        const toastPosition = props.toast.position

        const originalHeight = toastRef.style.height
        toastRef.style.height = 'auto'
        const newHeight = measureElementHeight(toastRef)
        toastRef.style.height = originalHeight

        setInitialHeight(newHeight)

        props.setHeights((currentHeights) => {
          const alreadyExists = currentHeights.find((height) => height.toastId === toastId)

          if (!alreadyExists) {
            return [{ toastId, height: newHeight, position: toastPosition }, ...currentHeights]
          }

          return currentHeights.map((height) => {
            if (height.toastId !== toastId) {
              return height
            }

            return {
              ...height,
              height: newHeight,
              position: toastPosition,
            }
          })
        })
      },
    ),
  )

  createEffect(
    on(bumpKey, (bumpToken) => {
      if (!bumpToken || !toastRef) {
        return
      }

      setIsBumping(false)

      if (bumpTimeoutId) {
        clearTimeout(bumpTimeoutId)
      }

      requestAnimationFrame(() => {
        setIsBumping(true)
        bumpTimeoutId = window.setTimeout(() => setIsBumping(false), 240)
      })

      onCleanup(() => {
        if (bumpTimeoutId) {
          clearTimeout(bumpTimeoutId)
        }
      })
    }),
  )

  let dismissed = false
  const deleteToast = () => {
    if (dismissed) {
      return
    }
    dismissed = true
    const toastToRemove = props.toast
    const toastId = toastToRemove.id
    const removeToastHandler = props.removeToast

    setRemoved(true)
    setOffsetBeforeRemove(offset())

    props.setHeights((currentHeights) =>
      currentHeights.filter((height) => height.toastId !== toastId),
    )

    window.setTimeout(() => {
      removeToastHandler(toastToRemove)
    }, TIME_BEFORE_UNMOUNT)
  }

  createEffect(
    on(
      () => [
        props.expanded,
        props.interacting,
        isDocumentHidden(),
        bumpKey(),
        duration(),
        props.toast.promise,
        toastType(),
        props.toast.duration,
      ],
      () => {
        const toastValue = props.toast
        const onAutoClose = toastValue.onAutoClose
        const bumpToken = bumpKey()

        const isPromiseLoading = toastValue.promise && toastType() === 'loading'
        const isInfinite = toastValue.duration === Number.POSITIVE_INFINITY
        const isLoading = toastValue.type === 'loading'

        if (isPromiseLoading || isInfinite || isLoading) {
          return
        }

        if (bumpToken) {
          remainingTime = duration()
          lastCloseTimerStartTime = 0
        }

        const pauseTimer = () => {
          if (lastCloseTimerStartTime < closeTimerStartTime) {
            const elapsedTime = Date.now() - closeTimerStartTime
            remainingTime -= elapsedTime
          }

          lastCloseTimerStartTime = Date.now()
        }

        const startTimer = () => {
          if (remainingTime === Number.POSITIVE_INFINITY) {
            return
          }

          closeTimerStartTime = Date.now()
          const closeToast = deleteToast

          timeoutId = window.setTimeout(() => {
            onAutoClose?.(toastValue)
            closeToast()
          }, remainingTime)
        }

        if (props.expanded || props.interacting || isDocumentHidden()) {
          pauseTimer()
        } else {
          startTimer()
        }

        onCleanup(() => {
          clearTimeout(timeoutId)
        })
      },
    ),
  )

  createEffect(
    on(
      () => props.toast.delete,
      (isDeleted) => {
        if (isDeleted && !dismissed) {
          deleteToast()
          props.toast.onDismiss?.(props.toast)
        }
      },
    ),
  )

  const configuredTypeIcon = () => props.icons?.[toastType() as keyof ToastIcons]

  function resolveNode(value?: ToastT['title'] | ToastT['description']) {
    if (typeof value === 'function') {
      return value()
    }

    return value
  }

  function handlePointerDown(
    event: PointerEvent & { currentTarget: HTMLLIElement; target: Element },
  ) {
    if (event.button === 2 || disabled() || !dismissible()) {
      return
    }

    dragStartTime = new Date()
    setOffsetBeforeRemove(offset())
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)

    if ((event.target as HTMLElement).tagName === 'BUTTON') {
      return
    }

    setSwiping(true)
    pointerStart = {
      x: event.clientX,
      y: event.clientY,
    }
  }

  function handlePointerUp() {
    if (swipeOut() || !dismissible() || !toastRef) {
      return
    }

    pointerStart = null

    const swipeAmountX = Number(
      toastRef.style.getPropertyValue('--swipe-amount-x').replace('px', '') || 0,
    )
    const swipeAmountY = Number(
      toastRef.style.getPropertyValue('--swipe-amount-y').replace('px', '') || 0,
    )
    const timeTaken = Date.now() - (dragStartTime?.getTime() || Date.now())

    const swipeAmount = swipeDirection() === 'x' ? swipeAmountX : swipeAmountY
    const velocity = Math.abs(swipeAmount) / Math.max(timeTaken, 1)

    if (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > 0.11) {
      setOffsetBeforeRemove(offset())
      props.toast.onDismiss?.(props.toast)

      if (swipeDirection() === 'x') {
        setSwipeOutDirection(swipeAmountX > 0 ? 'right' : 'left')
      } else {
        setSwipeOutDirection(swipeAmountY > 0 ? 'down' : 'up')
      }

      deleteToast()
      TOAST_STATE.dismiss(props.toast.id)
      setSwipeOut(true)
      return
    }

    toastRef.style.setProperty('--swipe-amount-x', '0px')
    toastRef.style.setProperty('--swipe-amount-y', '0px')

    setIsSwiped(false)
    setSwiping(false)
    setSwipeDirection(null)
  }

  function handlePointerMove(event: PointerEvent) {
    if (!pointerStart || !dismissible() || !toastRef) {
      return
    }

    const isHighlighted = window.getSelection()?.toString().length

    if (isHighlighted) {
      return
    }

    const yDelta = event.clientY - pointerStart.y
    const xDelta = event.clientX - pointerStart.x

    const swipeDirections = props.swipeDirections ?? getDefaultSwipeDirections(props.position)

    if (!swipeDirection() && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1)) {
      setSwipeDirection(Math.abs(xDelta) > Math.abs(yDelta) ? 'x' : 'y')
    }

    const swipeAmount = { x: 0, y: 0 }

    const getDampening = (delta: number) => {
      const factor = Math.abs(delta) / 20

      return 1 / (1.5 + factor)
    }

    if (swipeDirection() === 'y') {
      if (swipeDirections.includes('top') || swipeDirections.includes('bottom')) {
        if (
          (swipeDirections.includes('top') && yDelta < 0) ||
          (swipeDirections.includes('bottom') && yDelta > 0)
        ) {
          swipeAmount.y = yDelta
        } else {
          const dampenedDelta = yDelta * getDampening(yDelta)
          swipeAmount.y = Math.abs(dampenedDelta) < Math.abs(yDelta) ? dampenedDelta : yDelta
        }
      }
    } else if (swipeDirection() === 'x') {
      if (swipeDirections.includes('left') || swipeDirections.includes('right')) {
        if (
          (swipeDirections.includes('left') && xDelta < 0) ||
          (swipeDirections.includes('right') && xDelta > 0)
        ) {
          swipeAmount.x = xDelta
        } else {
          const dampenedDelta = xDelta * getDampening(xDelta)
          swipeAmount.x = Math.abs(dampenedDelta) < Math.abs(xDelta) ? dampenedDelta : xDelta
        }
      }
    }

    if (Math.abs(swipeAmount.x) > 0 || Math.abs(swipeAmount.y) > 0) {
      setIsSwiped(true)
    }

    toastRef.style.setProperty('--swipe-amount-x', `${swipeAmount.x}px`)
    toastRef.style.setProperty('--swipe-amount-y', `${swipeAmount.y}px`)
  }

  return (
    <li
      ref={(element) => {
        toastRef = element
      }}
      tabIndex={0}
      class={cn(
        'sonner-toast',
        props.class,
        props.toast.class || '',
        props.classes?.toast,
        props.toast.classes?.toast,
        props.classes?.default,
        toastType() && toastType() !== 'normal' && toastType() !== 'action'
          ? props.classes?.[
              toastType() as 'success' | 'info' | 'warning' | 'error' | 'loading' | 'default'
            ]
          : undefined,
        toastType() && toastType() !== 'normal' && toastType() !== 'action'
          ? props.toast.classes?.[
              toastType() as 'success' | 'info' | 'warning' | 'error' | 'loading' | 'default'
            ]
          : undefined,
      )}
      data-rich-colors={(props.toast.richColors ?? props.defaultRichColors) ? '' : undefined}
      data-styled={!props.toast.jsx && !props.toast.unstyled && !props.unstyled ? '' : undefined}
      data-mounted={mounted() ? '' : undefined}
      data-promise={props.toast.promise ? '' : undefined}
      data-swiped={isSwiped() ? '' : undefined}
      data-removed={removed() ? '' : undefined}
      data-visible={props.index + 1 <= props.visibleToasts ? '' : undefined}
      data-y-position={props.position.split('-')[0] || 'bottom'}
      data-x-position={props.position.split('-')[1] || 'right'}
      data-index={props.index}
      data-front={props.index === 0 ? '' : undefined}
      data-swiping={swiping() ? '' : undefined}
      data-bump={isBumping() ? '' : undefined}
      data-dismissible={dismissible() ? '' : undefined}
      data-type={toastType()}
      data-invert={props.toast.invert || props.invert ? '' : undefined}
      data-swipe-out={swipeOut() ? '' : undefined}
      data-swipe-direction={swipeOutDirection()}
      data-expanded={props.expanded || (props.expandByDefault && mounted()) ? '' : undefined}
      data-testid={props.toast.testId}
      style={{
        '--index': props.index,
        '--toasts-before': props.index,
        '--z-index': props.toasts.length - props.index,
        '--offset': `${removed() ? offsetBeforeRemove() : offset()}px`,
        '--initial-height': props.expandByDefault ? 'auto' : `${initialHeight()}px`,
        ...props.style,
        ...props.toast.style,
      }}
      onDragEnd={() => {
        setSwiping(false)
        setSwipeDirection(null)
        pointerStart = null
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <Show
        when={
          (props.toast.closeButton ?? props.closeButton) &&
          !props.toast.jsx &&
          toastType() !== 'loading'
        }
      >
        <button
          type="button"
          aria-label={props.closeButtonAriaLabel}
          data-disabled={disabled() ? '' : undefined}
          class={cn(
            'sonner-close-button',
            props.classes?.closeButton,
            props.toast.classes?.closeButton,
          )}
          onClick={() => {
            if (disabled() || !dismissible()) {
              return
            }

            deleteToast()
            TOAST_STATE.dismiss(props.toast.id)
            props.toast.onDismiss?.(props.toast)
          }}
        >
          <Show when={props.icons?.close}>{(Icon) => <Dynamic component={Icon()} />}</Show>
        </button>
      </Show>

      <Show
        when={
          Boolean(toastType() || props.toast.icon || props.toast.promise) &&
          props.toast.icon !== null &&
          (Boolean(props.toast.icon) || canRenderNode(configuredTypeIcon()))
        }
      >
        <div
          class={cn('sonner-icon', 'sonner-loader', props.classes?.icon, props.toast.classes?.icon)}
        >
          <Show
            when={
              (props.toast.promise || (props.toast.type === 'loading' && !props.toast.icon)) &&
              props.icons?.loading
            }
          >
            {(Icon) => <Dynamic component={Icon()} />}
          </Show>
          <Show when={props.toast.type !== 'loading'}>
            <Show
              when={props.toast.icon}
              fallback={
                <Show when={configuredTypeIcon()}>{(Icon) => <Dynamic component={Icon()} />}</Show>
              }
            >
              {props.toast.icon}
            </Show>
          </Show>
        </div>
      </Show>

      <div class={cn('sonner-content', props.classes?.content, props.toast.classes?.content)}>
        <div class={cn('sonner-title', props.classes?.title, props.toast.classes?.title)}>
          {props.toast.jsx || resolveNode(props.toast.title)}
        </div>

        <Show when={props.toast.description}>
          <div
            class={cn(
              'sonner-description',
              props.classes?.description,
              props.toast.classes?.description,
            )}
          >
            {resolveNode(props.toast.description)}
          </div>
        </Show>
      </div>

      <Show when={props.toast.cancel && !isAction(props.toast.cancel)}>
        {props.toast.cancel as unknown as Component}
      </Show>

      <Show when={props.toast.cancel && isAction(props.toast.cancel)}>
        <button
          type="button"
          class={cn(
            'sonner-button',
            'sonner-cancel',
            props.classes?.cancelButton,
            props.toast.classes?.cancelButton,
          )}
          style={props.toast.cancelButtonStyle || props.cancelButtonStyle}
          onClick={(event) => {
            if (!isAction(props.toast.cancel) || !dismissible()) {
              return
            }

            props.toast.cancel.onClick?.(event)
            deleteToast()
            TOAST_STATE.dismiss(props.toast.id)
          }}
        >
          {isAction(props.toast.cancel) ? props.toast.cancel.label : null}
        </button>
      </Show>

      <Show when={props.toast.action && !isAction(props.toast.action)}>
        {props.toast.action as unknown as Component}
      </Show>

      <Show when={props.toast.action && isAction(props.toast.action)}>
        <button
          type="button"
          class={cn(
            'sonner-button',
            'sonner-action',
            props.classes?.actionButton,
            props.toast.classes?.actionButton,
          )}
          style={props.toast.actionButtonStyle || props.actionButtonStyle}
          onClick={(event) => {
            if (!isAction(props.toast.action)) {
              return
            }

            props.toast.action.onClick?.(event)

            if (event.defaultPrevented) {
              return
            }

            deleteToast()
            TOAST_STATE.dismiss(props.toast.id)
          }}
        >
          {isAction(props.toast.action) ? props.toast.action.label : null}
        </button>
      </Show>
    </li>
  )
}

/**
 * Core toaster renderer (without icons).
 * @example
 * <CompactToaster position="bottom-left" />
 */
export function BaseToaster(props: ToasterProps): JSX.Element {
  let listRef: HTMLOListElement | null = null
  let lastFocusedElement: HTMLElement | null = null
  let isFocusWithin = false

  const [heights, setHeights] = createSignal<HeightT[]>([])
  const [expanded, setExpanded] = createSignal(false)
  const [interacting, setInteracting] = createSignal(false)

  const [actualTheme, setActualTheme] = createSignal<'light' | 'dark'>('light')
  const hotkey = () => props.hotkey || ['altKey', 'KeyT']
  const dir = () => props.dir || getDocumentDirection()
  const gap = () => props.gap || GAP

  const hotkeyLabel = createMemo(() => hotkey().join('+').replace(/Key/g, '').replace(/Digit/g, ''))

  const filteredToasts = createMemo(() => {
    const list = TOAST_STATE.toasts
    const result: ToastT[] = []

    for (let i = list.length - 1; i >= 0; i--) {
      const toastItem = list[i]!
      if (matchesToasterId(toastItem, props.id)) {
        result.push(toastItem)
      }
    }

    return result
  })

  const possiblePositions = createMemo(() => {
    const activePositions = filteredToasts()
      .filter((toastItem) => toastItem.position)
      .map((toastItem) => toastItem.position as Position)

    return Array.from(new Set([props.position || 'bottom-right', ...activePositions]))
  })

  function removeToast(toastToRemove: ToastT) {
    TOAST_STATE.remove(toastToRemove.id)
  }

  createEffect(() => {
    TOAST_STATE.preventDuplicate = props.preventDuplicate ?? false
  })

  onCleanup(() => {
    TOAST_STATE.preventDuplicate = false
  })

  createEffect(
    on(
      () => props.theme,
      (theme) => {
        if (theme !== 'system') {
          setActualTheme((theme || 'light') as 'light' | 'dark')
          return
        }

        const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const listener = (event: MediaQueryListEvent) => {
          setActualTheme(event.matches ? 'dark' : 'light')
        }

        setActualTheme(darkMediaQuery.matches ? 'dark' : 'light')

        try {
          darkMediaQuery.addEventListener('change', listener)
          onCleanup(() => darkMediaQuery.removeEventListener('change', listener))
        } catch {
          darkMediaQuery.addListener(listener)
          onCleanup(() => darkMediaQuery.removeListener(listener))
        }
      },
    ),
  )

  createEffect(
    on(
      () => filteredToasts().length,
      (len) => {
        if (len <= 1) {
          setExpanded(false)
        }
      },
    ),
  )

  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isHotkeyPressed =
        hotkey().length > 0 && hotkey().every((key) => (event as any)[key] || event.code === key)

      if (isHotkeyPressed) {
        setExpanded(true)
        listRef?.focus()
      }

      const activeElement = document.activeElement

      if (
        event.code === 'Escape' &&
        (activeElement === listRef || listRef?.contains(activeElement))
      ) {
        setExpanded(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown)

      if (lastFocusedElement) {
        lastFocusedElement.focus({ preventScroll: true })
        lastFocusedElement = null
        isFocusWithin = false
      }
    })
  })

  return (
    <section
      aria-label={
        props.customAriaLabel ?? `${props.containerAriaLabel ?? 'Notifications'} ${hotkeyLabel()}`
      }
      tabIndex={-1}
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
      data-react-aria-top-layer
    >
      <For each={possiblePositions()}>
        {(positionValue, indexAccessor) => {
          const [y, x] = positionValue.split('-')

          const positionedToasts = createMemo(() => {
            return filteredToasts().filter((toastItem) => {
              if (!toastItem.position && indexAccessor() === 0) {
                return true
              }

              return toastItem.position === positionValue
            })
          })

          return (
            <ol
              ref={(element) => {
                listRef = element
              }}
              dir={dir() === 'auto' ? getDocumentDirection() : dir()}
              tabIndex={-1}
              class={cn('sonner-toaster', props.class)}
              data-sonner-theme={actualTheme()}
              data-y-position={y}
              data-x-position={x}
              style={{
                '--front-toast-height': `${heights()[0]?.height || 0}px`,
                '--width': `${TOAST_WIDTH}px`,
                '--gap': `${gap()}px`,
                ...props.style,
                ...assignOffset(props.offset, props.mobileOffset),
              }}
              onBlur={(event) => {
                if (isFocusWithin && !event.currentTarget.contains(event.relatedTarget as Node)) {
                  isFocusWithin = false

                  if (lastFocusedElement) {
                    lastFocusedElement.focus({ preventScroll: true })
                    lastFocusedElement = null
                  }
                }
              }}
              onFocus={(event) => {
                const toastTarget =
                  event.target instanceof Element ? event.target.closest('.sonner-toast') : null
                const isNotDismissible =
                  toastTarget instanceof HTMLElement &&
                  !toastTarget.hasAttribute('data-dismissible')

                if (isNotDismissible) {
                  return
                }

                if (!isFocusWithin) {
                  isFocusWithin = true
                  lastFocusedElement = event.relatedTarget as HTMLElement
                }
              }}
              onMouseEnter={() => setExpanded(true)}
              onMouseMove={() => setExpanded(true)}
              onMouseLeave={() => {
                if (!interacting()) {
                  setExpanded(false)
                }
              }}
              onDragEnd={() => setExpanded(false)}
              onPointerDown={(event) => {
                const toastTarget =
                  event.target instanceof Element ? event.target.closest('.sonner-toast') : null
                const isNotDismissible =
                  toastTarget instanceof HTMLElement &&
                  !toastTarget.hasAttribute('data-dismissible')

                if (!isNotDismissible) {
                  setInteracting(true)
                }
              }}
              onPointerUp={() => setInteracting(false)}
            >
              <For each={positionedToasts()}>
                {(toastItem, toastIndex) => (
                  <ToastItem
                    toast={toastItem}
                    index={toastIndex()}
                    icons={props.icons}
                    defaultRichColors={props.richColors ?? false}
                    duration={props.duration ?? TOAST_LIFETIME}
                    class={props.toastClass}
                    invert={props.invert ?? false}
                    visibleToasts={props.visibleToasts || VISIBLE_TOASTS_AMOUNT}
                    closeButton={props.closeButton ?? false}
                    interacting={interacting()}
                    position={positionValue as Position}
                    style={props.toastStyle}
                    unstyled={props.unstyled ?? false}
                    classes={props.classes}
                    cancelButtonStyle={props.cancelButtonStyle}
                    actionButtonStyle={props.actionButtonStyle}
                    closeButtonAriaLabel={props.closeButtonAriaLabel ?? 'Close toast'}
                    removeToast={removeToast}
                    toasts={filteredToasts().filter(
                      (toastValue) => toastValue.position === toastItem.position,
                    )}
                    heights={heights().filter((height) => height.position === toastItem.position)}
                    setHeights={setHeights}
                    expandByDefault={props.expand ?? false}
                    gap={gap()}
                    expanded={expanded()}
                    swipeDirections={
                      props.swipeDirections || getDefaultSwipeDirections(positionValue)
                    }
                  />
                )}
              </For>
            </ol>
          )
        }}
      </For>
    </section>
  )
}

/**
 * Full toaster component with default icons.
 * @example
 * <Toaster position="top-right" richColors />
 */
export function Toaster(props: ToasterProps): JSX.Element {
  return (
    <BaseToaster
      {...props}
      icons={{
        success: props.icons?.success === undefined ? SuccessIcon : props.icons.success,
        error: props.icons?.error === undefined ? ErrorIcon : props.icons.error,
        warning: props.icons?.warning === undefined ? WarningIcon : props.icons.warning,
        info: props.icons?.info === undefined ? InfoIcon : props.icons.info,
        loading: props.icons?.loading === undefined ? LoadingIcon : props.icons.loading,
        close: props.icons?.close === undefined ? CloseIcon : props.icons.close,
      }}
    />
  )
}
