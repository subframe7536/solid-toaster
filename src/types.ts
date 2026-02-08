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

export interface ToastClassnames {
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
  success?: JSX.Element
  info?: JSX.Element
  warning?: JSX.Element
  error?: JSX.Element
  loading?: JSX.Element
  close?: JSX.Element
}

export interface Action {
  label: JSX.Element
  onClick: (event: MouseEvent) => void
  actionButtonStyle?: JSX.CSSProperties
}

export interface ToastT {
  id: ToastId
  toasterId?: string
  title?: (() => JSX.Element) | JSX.Element
  type?: ToastTypes
  icon?: JSX.Element
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
  className?: string
  classNames?: ToastClassnames
  descriptionClassName?: string
  position?: Position
  testId?: string
}

export interface ToastToDismiss {
  id: ToastId
  dismiss: boolean
}

export type ExternalToast = Omit<ToastT, 'id' | 'type' | 'title' | 'jsx' | 'delete' | 'promise'> & {
  id?: ToastId
  toasterId?: string
}

export interface HeightT {
  height: number
  toastId: ToastId
  position?: Position
}

export interface ToastOptions {
  className?: string
  closeButton?: boolean
  descriptionClassName?: string
  style?: JSX.CSSProperties
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  duration?: number
  unstyled?: boolean
  classNames?: ToastClassnames
  closeButtonAriaLabel?: string
  toasterId?: string
}

type Offset =
  | {
      top?: string | number
      right?: string | number
      bottom?: string | number
      left?: string | number
    }
  | string
  | number

export interface ToasterProps {
  id?: string
  invert?: boolean
  theme?: 'light' | 'dark' | 'system'
  position?: Position
  hotkey?: string[]
  richColors?: boolean
  expand?: boolean
  duration?: number
  gap?: number
  visibleToasts?: number
  closeButton?: boolean
  toastOptions?: ToastOptions
  className?: string
  style?: JSX.CSSProperties
  offset?: Offset
  mobileOffset?: Offset
  dir?: 'rtl' | 'ltr' | 'auto'
  swipeDirections?: SwipeDirection[]
  icons?: ToastIcons
  customAriaLabel?: string
  containerAriaLabel?: string
}

export interface ToastProps {
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
  style?: JSX.CSSProperties
  cancelButtonStyle?: JSX.CSSProperties
  actionButtonStyle?: JSX.CSSProperties
  duration?: number
  className?: string
  unstyled?: boolean
  descriptionClassName?: string
  loadingIcon?: JSX.Element
  classNames?: ToastClassnames
  icons?: ToastIcons
  closeButtonAriaLabel?: string
  defaultRichColors?: boolean
}

export enum SwipeStateTypes {
  SwipedOut = 'SwipedOut',
  SwipedBack = 'SwipedBack',
  NotSwiped = 'NotSwiped',
}

export type Theme = 'light' | 'dark'

export interface PromiseReturn<ToastData = unknown> {
  unwrap: () => Promise<ToastData>
}

export function isAction(action: Action | JSX.Element): action is Action {
  return typeof action === 'object' && action !== null && 'label' in action && 'onClick' in action
}
