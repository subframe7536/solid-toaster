import type { JSX } from 'solid-js'

import type {
  ExternalToast,
  PromiseData,
  PromiseIExtendedResult,
  PromiseReturn,
  PromiseT,
  ToastId,
  ToastT,
  ToastToDismiss,
  ToastTypes,
} from './types'

let toastsCounter = 1

type ToastTitle = (() => JSX.Element) | JSX.Element

type ToastEvent = ToastT | ToastToDismiss

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

class Observer {
  subscribers: Array<(toast: ToastEvent) => void>
  toasts: ToastT[]
  dismissedToasts: Set<ToastId>

  constructor() {
    this.subscribers = []
    this.toasts = []
    this.dismissedToasts = new Set()
  }

  subscribe = (subscriber: (toast: ToastEvent) => void): VoidFunction => {
    this.subscribers.push(subscriber)

    return () => {
      const index = this.subscribers.indexOf(subscriber)
      this.subscribers.splice(index, 1)
    }
  }

  publish = (data: ToastT): void => {
    this.subscribers.forEach((subscriber) => subscriber(data))
  }

  addToast = (data: ToastT): void => {
    this.publish(data)
    this.toasts = [...this.toasts, data]
  }

  create = (
    data: ExternalToast & {
      message?: ToastTitle
      type?: ToastTypes
      promise?: PromiseT
      jsx?: JSX.Element
    },
  ): ToastId => {
    const { message, ...rest } = data
    const id = typeof data.id === 'number' || data.id?.length ? data.id : toastsCounter++
    const alreadyExists = this.toasts.find((toast) => toast.id === id)
    const dismissible = data.dismissible === undefined ? true : data.dismissible

    if (this.dismissedToasts.has(id)) {
      this.dismissedToasts.delete(id)
    }

    if (alreadyExists) {
      this.toasts = this.toasts.map((toast) => {
        if (toast.id === id) {
          this.publish({ ...toast, ...data, id, title: message })

          return {
            ...toast,
            ...data,
            id,
            dismissible,
            title: message,
          }
        }

        return toast
      })
    } else {
      this.addToast({ title: message, ...rest, dismissible, id })
    }

    return id
  }

  dismiss = (id?: ToastId): ToastId | undefined => {
    if (id !== undefined) {
      this.dismissedToasts.add(id)
      requestAnimationFrame(() => {
        this.subscribers.forEach((subscriber) => subscriber({ id, dismiss: true }))
      })
    } else {
      this.toasts.forEach((toast) => {
        this.subscribers.forEach((subscriber) => subscriber({ id: toast.id, dismiss: true }))
      })
    }

    return id
  }

  message = (message: ToastTitle, data?: ExternalToast): ToastId => {
    return this.create({ ...data, message })
  }

  error = (message: ToastTitle, data?: ExternalToast): ToastId => {
    return this.create({ ...data, message, type: 'error' })
  }

  success = (message: ToastTitle, data?: ExternalToast): ToastId => {
    return this.create({ ...data, type: 'success', message })
  }

  info = (message: ToastTitle, data?: ExternalToast): ToastId => {
    return this.create({ ...data, type: 'info', message })
  }

  warning = (message: ToastTitle, data?: ExternalToast): ToastId => {
    return this.create({ ...data, type: 'warning', message })
  }

  loading = (message: ToastTitle, data?: ExternalToast): ToastId => {
    return this.create({ ...data, type: 'loading', message })
  }

  promise = <ToastData>(
    promise: PromiseT<ToastData>,
    data?: PromiseData<ToastData>,
  ): PromiseReturn<ToastData> | undefined => {
    if (!data) {
      return
    }

    let id: ToastId | undefined

    if (data.loading !== undefined) {
      id = this.create({
        ...data,
        promise,
        type: 'loading',
        message: data.loading,
        description: typeof data.description !== 'function' ? data.description : undefined,
      })
    }

    const p = Promise.resolve(promise instanceof Function ? promise() : promise)
    let shouldDismiss = id !== undefined
    let result: ['resolve', ToastData] | ['reject', unknown]

    const originalPromise = p
      .then(async (response) => {
        result = ['resolve', response]

        if (isPromiseExtendedResult(response)) {
          shouldDismiss = false
          this.create({ id, type: 'default', ...response })
          return
        }

        if (isHttpResponse(response) && !response.ok) {
          shouldDismiss = false

          const promiseData =
            typeof data.error === 'function'
              ? await data.error(`HTTP error! status: ${response.status}`)
              : data.error

          const description =
            typeof data.description === 'function'
              ? await data.description(`HTTP error! status: ${response.status}`)
              : data.description

          const toastSettings: PromiseIExtendedResult = isPromiseExtendedResult(promiseData)
            ? promiseData
            : { message: promiseData }

          this.create({ id, type: 'error', description, ...toastSettings })
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

          this.create({ id, type: 'error', description, ...toastSettings })
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

          this.create({ id, type: 'success', description, ...toastSettings })
        }
      })
      .catch(async (error) => {
        result = ['reject', error]

        if (data.error !== undefined) {
          shouldDismiss = false

          const promiseData =
            typeof data.error === 'function' ? await data.error(error) : data.error

          const description =
            typeof data.description === 'function'
              ? await data.description(error)
              : data.description

          const toastSettings: PromiseIExtendedResult = isPromiseExtendedResult(promiseData)
            ? promiseData
            : { message: promiseData }

          this.create({ id, type: 'error', description, ...toastSettings })
        }
      })
      .finally(() => {
        if (shouldDismiss) {
          this.dismiss(id)
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

  custom = (jsx: (id: ToastId) => JSX.Element, data?: ExternalToast): ToastId => {
    const id = data?.id || toastsCounter++
    this.create({ jsx: jsx(id), ...data, id })
    return id
  }

  getActiveToasts = (): ToastT[] => {
    return this.toasts.filter((toast) => !this.dismissedToasts.has(toast.id))
  }
}

export const ToastState: Observer = new Observer()

function toastFunction(message: ToastTitle, data?: ExternalToast): ToastId {
  const id = data?.id || toastsCounter++

  ToastState.addToast({
    title: message,
    ...data,
    id,
  })

  return id
}

function getHistory(): ToastT[] {
  return ToastState.toasts
}

function getToasts(): ToastT[] {
  return ToastState.getActiveToasts()
}

type ToastFunction = typeof toastFunction & {
  success: typeof ToastState.success
  info: typeof ToastState.info
  warning: typeof ToastState.warning
  error: typeof ToastState.error
  custom: typeof ToastState.custom
  message: typeof ToastState.message
  promise: typeof ToastState.promise
  dismiss: typeof ToastState.dismiss
  loading: typeof ToastState.loading
  getHistory: typeof getHistory
  getToasts: typeof getToasts
}

export const toast = Object.assign(
  toastFunction,
  {
    success: ToastState.success,
    info: ToastState.info,
    warning: ToastState.warning,
    error: ToastState.error,
    custom: ToastState.custom,
    message: ToastState.message,
    promise: ToastState.promise,
    dismiss: ToastState.dismiss,
    loading: ToastState.loading,
  },
  {
    getHistory,
    getToasts,
  },
) as ToastFunction
