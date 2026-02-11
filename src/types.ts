import type { JSX } from 'solid-js'

export type ToastTypes =
  | 'normal'
  | 'action'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'loading'
  | 'default'

export type ToastId = number | string

export type ToastTitle = (() => JSX.Element) | JSX.Element

export type PromiseT<Data = any> = Promise<Data> | (() => Promise<Data>)

export interface PromiseIExtendedResult extends ExternalToast {
  message: JSX.Element
}

export type PromiseTExtendedResult<Data = any> =
  | PromiseIExtendedResult
  | ((data: Data) => PromiseIExtendedResult | Promise<PromiseIExtendedResult>)

export type PromiseTResult<Data = any> =
  | string
  | JSX.Element
  | ((data: Data) => JSX.Element | string | Promise<JSX.Element | string>)

export type PromiseExternalToast = Omit<ExternalToast, 'description'>

export type PromiseData<ToastData = any> = PromiseExternalToast & {
  loading?: string | JSX.Element
  success?: PromiseTResult<ToastData> | PromiseTExtendedResult<ToastData>
  error?: PromiseTResult | PromiseTExtendedResult
  description?: PromiseTResult
  finally?: () => void | Promise<void>
}

export type Position =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center'

export type SwipeDirection = 'top' | 'right' | 'bottom' | 'left'

export interface ToastClasses {
  toast?: string
  title?: string
  description?: string
  loader?: string
  closeButton?: string
  cancelButton?: string
  actionButton?: string
  success?: string
  error?: string
  info?: string
  warning?: string
  loading?: string
  default?: string
  content?: string
  icon?: string
}

export interface ToastIcons {
  success?: JSX.Element | null
  info?: JSX.Element | null
  warning?: JSX.Element | null
  error?: JSX.Element | null
  loading?: JSX.Element | null
  close?: JSX.Element | null
}

export interface ToasterProps {
  /** Match toasts against a specific toaster instance. */
  id?: string
  /**
   * Invert toast colors to improve contrast.
   * @default false
   */
  invert?: boolean
  /**
   * Visual theme for the toaster.
   * @default 'light'
   */
  theme?: 'light' | 'dark' | 'system'
  /**
   * Default position for toasts without a per-toast position override.
   * @default 'bottom-right'
   */
  position?: Position
  /**
   * Keyboard shortcut that expands the toaster list.
   * @default ['altKey', 'KeyT']
   */
  hotkey?: string[]
  /**
   * Expand the toaster list by default.
   * @default false
   */
  expand?: boolean
  /**
   * Default toast lifetime in milliseconds.
   * @default 4000
   */
  duration?: number
  /**
   * Spacing between stacked toasts, in pixels.
   * @default 14
   */
  gap?: number
  /**
   * Max number of visible toasts per position.
   * @default 3
   */
  visibleToasts?: number
  /**
   * Prevent duplicate toasts with matching content and position.
   * @default false
   */
  preventDuplicate?: boolean
  /** Class name for the toaster root element. */
  class?: string
  /** Inline styles for the toaster root element. */
  style?: JSX.CSSProperties
  /** Class name applied to each toast. */
  toastClass?: string
  /** Inline styles applied to each toast. */
  toastStyle?: JSX.CSSProperties
  /** Inline styles applied to cancel action buttons. */
  cancelButtonStyle?: JSX.CSSProperties
  /** Inline styles applied to primary action buttons. */
  actionButtonStyle?: JSX.CSSProperties
  /**
   * Render toasts without default styles.
   * @default false
   */
  unstyled?: boolean
  /** Class overrides for individual toast slots. */
  classes?: ToastClasses
  /**
   * Desktop viewport offsets for the toaster container.
   * @default '24px'
   */
  offset?: Offset
  /**
   * Mobile viewport offsets for the toaster container.
   * @default '16px'
   */
  mobileOffset?: Offset
  /**
   * Direction for layout and swipe behavior.
   * @default 'ltr'
   */
  dir?: 'rtl' | 'ltr' | 'auto'
  /**
   * Override default swipe directions.
   * @default position-derived directions
   */
  swipeDirections?: SwipeDirection[]
  /**
   * Custom aria-label for the toaster list.
   * @default `Notifications {hotkey}`
   */
  customAriaLabel?: string
  /**
   * Base label used to build the list aria-label.
   * @default 'Notifications'
   */
  containerAriaLabel?: string
  /**
   * Replace the default icons for toast types.
   * @default built-in icon set
   */
  icons?: ToastIcons
  /**
   * Use high-contrast colors for status toasts.
   * @default false
   */
  richColors?: boolean
  /**
   * Show a close button on toasts.
   * @default false
   */
  closeButton?: boolean
  /**
   * Accessible label for the close button.
   * @default 'Close toast'
   */
  closeButtonAriaLabel?: string
}

export interface Action {
  label: JSX.Element
  onClick: (event: MouseEvent) => void
  actionButtonStyle?: JSX.CSSProperties
}

export interface ToastT {
  id: ToastId
  toasterId?: string
  title?: ToastTitle
  type?: ToastTypes
  icon?: JSX.Element | null
  jsx?: JSX.Element
  richColors?: boolean
  invert?: boolean
  closeButton?: boolean
  dismissible?: boolean
  description?: (() => JSX.Element) | JSX.Element
  duration?: number
  delete?: boolean
  action?: Action | JSX.Element
  cancel?: Action | JSX.Element
  onDismiss?: (toast: ToastT) => void
  onAutoClose?: (toast: ToastT) => void
  promise?: PromiseT
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  style?: JSX.CSSProperties
  unstyled?: boolean
  class?: string
  classes?: ToastClasses
  position?: Position
  testId?: string
}

export interface ToastToDismiss {
  id: ToastId
  dismiss: boolean
}

export type ToastEvent = ToastT | ToastToDismiss

export type ExternalToast = Omit<ToastT, 'id' | 'type' | 'title' | 'jsx' | 'delete' | 'promise'> & {
  /**
   * Optional id to update an existing toast.
   * @default auto-generated
   */
  id?: ToastId
  /**
   * Route the toast to a specific toaster instance.
   * @default undefined
   */
  toasterId?: string
  /**
   * Override the default position for this toast.
   * @default ToasterProps.position
   */
  position?: Position
  /**
   * Override the default duration for this toast.
   * @default ToasterProps.duration (4000)
   */
  duration?: number
  /**
   * Enable or disable the close button for this toast.
   * @default ToasterProps.closeButton (false)
   */
  closeButton?: boolean
  /**
   * Mark the toast as dismissible by user interaction.
   * @default true
   */
  dismissible?: boolean
  /**
   * Render with richer status colors.
   * @default ToasterProps.richColors (false)
   */
  richColors?: boolean
  /**
   * Render the toast without default styles.
   * @default ToasterProps.unstyled (false)
   */
  unstyled?: boolean
  /**
   * Invert toast colors for contrast.
   * @default ToasterProps.invert (false)
   */
  invert?: boolean
}

export interface HeightT {
  height: number
  toastId: ToastId
  position?: Position
}

export type Offset =
  | {
      top?: string | number
      right?: string | number
      bottom?: string | number
      left?: string | number
    }
  | string
  | number

export interface ToastItemProps {
  toast: ToastT
  toasts: ToastT[]
  index: number
  swipeDirections?: SwipeDirection[]
  expanded: boolean
  invert: boolean
  heights: HeightT[]
  setHeights: (updater: (heights: HeightT[]) => HeightT[]) => void
  removeToast: (toast: ToastT) => void
  gap?: number
  position: Position
  visibleToasts: number
  expandByDefault: boolean
  closeButton: boolean
  interacting: boolean
  highlightKey?: number
  highlightedToastId?: ToastId
  style?: JSX.CSSProperties
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  duration?: number
  class?: string
  unstyled?: boolean
  classes?: ToastClasses
  icons?: ToastIcons
  closeButtonAriaLabel?: string
  defaultRichColors?: boolean
}

export interface PromiseReturn<ToastData = unknown> {
  unwrap: () => Promise<ToastData>
}

export function isAction(action: Action | JSX.Element): action is Action {
  return (
    action !== null &&
    typeof action === 'object' &&
    'label' in action &&
    (action as Action).label !== undefined &&
    'onClick' in action &&
    typeof (action as Action).onClick === 'function'
  )
}
