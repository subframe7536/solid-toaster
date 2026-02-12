import type { JSX } from 'solid-js'

import type {
  ExternalToast,
  PromiseT,
  ToastEvent,
  ToastId,
  ToastT,
  ToastTitle,
  ToastTypes,
  PromiseReturn,
  PromiseIExtendedResult,
  PromiseData,
} from './types'

type CreateToastData = ExternalToast & {
  message?: ToastTitle
  type?: ToastTypes
  promise?: PromiseT
  jsx?: JSX.Element
}

function hasValidToastId(id: ToastId | undefined): id is ToastId {
  return typeof id === 'number' || (typeof id === 'string' && id.length > 0)
}

function scheduleAnimationFrame(callback: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback)
    return
  }

  setTimeout(callback, 0)
}

export class ToastState {
  subscribers: Array<(toast: ToastEvent) => void> = []
  toasts: ToastT[] = []
  dismissedToasts: Set<ToastId> = new Set<ToastId>()
  private toastsCounter: number = 1

  private publish(data: ToastT): void {
    this.subscribers.forEach((subscriber) => subscriber(data))
  }

  public createId(): ToastId {
    const id = this.toastsCounter
    this.toastsCounter += 1
    return id
  }

  public subscribe(subscriber: (toast: ToastEvent) => void): VoidFunction {
    this.subscribers.push(subscriber)

    return () => {
      const index = this.subscribers.indexOf(subscriber)
      if (index !== -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  public create(data: CreateToastData): ToastId {
    const { message, ...rest } = data
    const id = hasValidToastId(data.id) ? data.id : this.createId()
    const alreadyExists = this.toasts.find((toast) => toast.id === id)
    const dismissible = data.dismissible === undefined ? true : data.dismissible

    if (this.dismissedToasts.has(id)) {
      this.dismissedToasts.delete(id)
    }

    if (alreadyExists) {
      this.toasts = this.toasts.map((toast) => {
        if (toast.id === id) {
          const nextToast = {
            ...toast,
            ...data,
            id,
            dismissible,
            title: message,
          }

          this.publish(nextToast)
          return nextToast
        }

        return toast
      })
    } else {
      const data = { title: message, ...rest, dismissible, id }
      this.publish(data)
      this.toasts = [...this.toasts, data]
    }

    return id
  }

  public dismiss(id?: ToastId): ToastId | undefined {
    if (id !== undefined) {
      this.dismissedToasts.add(id)
      scheduleAnimationFrame(() => {
        this.subscribers.forEach((subscriber) => subscriber({ id, dismiss: true }))
      })
    } else {
      this.toasts.forEach((toast) => {
        this.subscribers.forEach((subscriber) => subscriber({ id: toast.id, dismiss: true }))
      })
    }

    return id
  }

  public getActiveToasts(): ToastT[] {
    return this.toasts.filter((toast) => !this.dismissedToasts.has(toast.id))
  }

  public getHistory(): ToastT[] {
    return this.toasts
  }
}

export const TOAST_STATE: ToastState = new ToastState()

function isHttpResponse(data: unknown): data is Response {
  return (
    data !== null &&
    typeof data === 'object' &&
    'ok' in data &&
    typeof data.ok === 'boolean' &&
    'status' in data &&
    typeof data.status === 'number'
  )
}

function isPromiseExtendedResult(value: unknown): value is PromiseIExtendedResult {
  return typeof value === 'object' && value !== null && 'message' in value
}

/**
 * Create a default toast.
 * @example
 * message('Saved!')
 * message('Saved!', { description: 'Changes synced.' })
 */
const message = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return TOAST_STATE.create({ ...data, message })
}

/**
 * Create an error toast.
 * @example
 * toast.error('Something went wrong')
 */
const error = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return TOAST_STATE.create({ ...data, message, type: 'error' })
}

/**
 * Create a success toast.
 * @example
 * toast.success('Profile updated')
 */
const success = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return TOAST_STATE.create({ ...data, message, type: 'success' })
}

/**
 * Create an info toast.
 * @example
 * toast.info('New version available')
 */
const info = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return TOAST_STATE.create({ ...data, message, type: 'info' })
}

/**
 * Create a warning toast.
 * @example
 * toast.warning('Storage almost full')
 */
const warning = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return TOAST_STATE.create({ ...data, message, type: 'warning' })
}

/**
 * Create a loading toast.
 * @example
 * toast.loading('Uploading files...')
 */
const loading = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return TOAST_STATE.create({ ...data, message, type: 'loading' })
}

/**
 * Render a custom toast with arbitrary JSX.
 * @example
 * toast.custom((id) => (
 *   <div>
 *     Custom toast {id}
 *     <button onClick={() => toast.dismiss(id)}>Close</button>
 *   </div>
 * ))
 */
const custom = (jsx: (id: ToastId) => JSX.Element, data?: ExternalToast): ToastId => {
  const id = data?.id || TOAST_STATE.createId()
  TOAST_STATE.create({ jsx: jsx(id), ...data, id })
  return id
}

const dismiss = (id?: ToastId): ToastId | undefined => TOAST_STATE.dismiss(id)
const getHistory = (): ToastT[] => TOAST_STATE.getHistory()
const getToasts = (): ToastT[] => TOAST_STATE.getActiveToasts()

/**
 * Bind a toast lifecycle to a promise.
 * @example
 * toast.promise(fetch('/api/user').then((res) => res.json()), {
 *   loading: 'Fetching user...',
 *   success: (data) => `Loaded ${data.name}`,
 *   error: (error) => `Failed: ${error.message}`,
 * })
 */
const promise = <ToastData>(
  promiseValue: PromiseT<ToastData>,
  data?: PromiseData<ToastData>,
): PromiseReturn<ToastData> | undefined => {
  if (!data) {
    return
  }

  let id: ToastId | undefined

  if (data.loading !== undefined) {
    id = TOAST_STATE.create({
      ...data,
      promise: promiseValue,
      type: 'loading',
      message: data.loading,
      description: typeof data.description !== 'function' ? data.description : undefined,
    })
  }

  const promiseResult = Promise.resolve(
    promiseValue instanceof Function ? promiseValue() : promiseValue,
  )

  let shouldDismiss = id !== undefined
  let result: ['resolve', ToastData] | ['reject', unknown]

  const originalPromise = promiseResult
    .then(async (response) => {
      result = ['resolve', response]

      if (isPromiseExtendedResult(response)) {
        shouldDismiss = false
        TOAST_STATE.create({ id, type: 'default', ...response })
        return
      }

      if (isHttpResponse(response) && !response.ok) {
        shouldDismiss = false

        const errorMessage = `HTTP error! status: ${response.status}`

        const promiseData =
          typeof data.error === 'function' ? await data.error(errorMessage) : data.error

        const description =
          typeof data.description === 'function'
            ? await data.description(errorMessage)
            : data.description

        const toastSettings: PromiseIExtendedResult = isPromiseExtendedResult(promiseData)
          ? promiseData
          : { message: promiseData }

        TOAST_STATE.create({ id, type: 'error', description, ...toastSettings })
        return
      }

      if (response instanceof Error) {
        shouldDismiss = false

        const promiseData =
          typeof data.error === 'function' ? await data.error(response) : data.error

        const description =
          typeof data.description === 'function'
            ? await data.description(response)
            : data.description

        const toastSettings: PromiseIExtendedResult = isPromiseExtendedResult(promiseData)
          ? promiseData
          : { message: promiseData }

        TOAST_STATE.create({ id, type: 'error', description, ...toastSettings })
        return
      }

      if (data.success !== undefined) {
        shouldDismiss = false

        const promiseData =
          typeof data.success === 'function' ? await data.success(response) : data.success

        const description =
          typeof data.description === 'function'
            ? await data.description(response)
            : data.description

        const toastSettings: PromiseIExtendedResult = isPromiseExtendedResult(promiseData)
          ? promiseData
          : { message: promiseData }

        TOAST_STATE.create({ id, type: 'success', description, ...toastSettings })
      }
    })
    .catch(async (errorValue) => {
      result = ['reject', errorValue]

      if (data.error !== undefined) {
        shouldDismiss = false

        const promiseData =
          typeof data.error === 'function' ? await data.error(errorValue) : data.error

        const description =
          typeof data.description === 'function'
            ? await data.description(errorValue)
            : data.description

        const toastSettings: PromiseIExtendedResult = isPromiseExtendedResult(promiseData)
          ? promiseData
          : { message: promiseData }

        TOAST_STATE.create({ id, type: 'error', description, ...toastSettings })
      }
    })
    .finally(() => {
      if (shouldDismiss) {
        TOAST_STATE.dismiss(id)
        id = undefined
      }

      const onFinally = data['finally']
      if (onFinally) {
        void onFinally()
      }
    })

  const unwrap = () =>
    new Promise<ToastData>((resolve, reject) => {
      originalPromise
        .then(() => {
          if (result[0] === 'reject') {
            reject(result[1])
          } else {
            resolve(result[1])
          }
        })
        .catch(reject)
    })

  if (typeof id !== 'string' && typeof id !== 'number') {
    return { unwrap } as PromiseReturn<ToastData>
  }

  return Object.assign(id, { unwrap }) as ToastId & PromiseReturn<ToastData>
}

type Toast = typeof message & {
  success: typeof success
  info: typeof info
  warning: typeof warning
  error: typeof error
  custom: typeof custom
  promise: typeof promise
  dismiss: typeof dismiss
  loading: typeof loading
  getHistory: typeof getHistory
  getToasts: typeof getToasts
}

/**
 * Toast API with variants and helpers.
 * @example
 * toast('Hello Solid!')
 * toast.success('Done')
 * toast.dismiss()
 */
const toast = Object.assign(message, {
  success,
  info,
  warning,
  error,
  custom,
  promise,
  dismiss,
  loading,
  getHistory,
  getToasts,
}) as Toast

export {
  toast,
  message,
  error,
  success,
  info,
  warning,
  loading,
  custom,
  dismiss,
  getHistory,
  getToasts,
  promise,
}
