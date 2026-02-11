import type { JSX } from 'solid-js'

import type {
  ExternalToast,
  PromiseT,
  ToastEvent,
  ToastId,
  ToastCore,
  ToastT,
  ToastTitle,
  ToastTypes,
  PromiseReturn,
  PromiseIExtendedResult,
  PromiseData,
} from './types'

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

export function createToastCore(): ToastCore {
  let toastsCounter = 1

  const subscribers: Array<(toast: ToastEvent) => void> = []
  let toasts: ToastT[] = []
  const dismissedToasts = new Set<ToastId>()

  const createId = (): ToastId => {
    const id = toastsCounter
    toastsCounter += 1
    return id
  }

  const publish = (data: ToastT): void => {
    subscribers.forEach((subscriber) => subscriber(data))
  }

  const addToast = (data: ToastT): void => {
    publish(data)
    toasts = [...toasts, data]
  }

  const create: ToastCore['create'] = (
    data: ExternalToast & {
      message?: ToastTitle
      type?: ToastTypes
      promise?: PromiseT
      jsx?: JSX.Element
    },
  ): ToastId => {
    const { message, ...rest } = data
    const id = hasValidToastId(data.id) ? data.id : createId()
    const alreadyExists = toasts.find((toast) => toast.id === id)
    const dismissible = data.dismissible === undefined ? true : data.dismissible

    if (dismissedToasts.has(id)) {
      dismissedToasts.delete(id)
    }

    if (alreadyExists) {
      toasts = toasts.map((toast) => {
        if (toast.id === id) {
          const nextToast = {
            ...toast,
            ...data,
            id,
            dismissible,
            title: message,
          }

          publish(nextToast)
          return nextToast
        }

        return toast
      })
    } else {
      addToast({ title: message, ...rest, dismissible, id })
    }

    return id
  }

  const dismiss: ToastCore['dismiss'] = (id?: ToastId): ToastId | undefined => {
    if (id !== undefined) {
      dismissedToasts.add(id)
      scheduleAnimationFrame(() => {
        subscribers.forEach((subscriber) => subscriber({ id, dismiss: true }))
      })
    } else {
      toasts.forEach((toast) => {
        subscribers.forEach((subscriber) => subscriber({ id: toast.id, dismiss: true }))
      })
    }

    return id
  }

  return {
    get subscribers() {
      return subscribers
    },
    set subscribers(next) {
      subscribers.splice(0, subscribers.length, ...next)
    },
    get toasts() {
      return toasts
    },
    set toasts(next) {
      toasts = next
    },
    dismissedToasts,
    createId,
    subscribe(subscriber) {
      subscribers.push(subscriber)

      return () => {
        const index = subscribers.indexOf(subscriber)
        if (index !== -1) {
          subscribers.splice(index, 1)
        }
      }
    },
    publish,
    addToast,
    create,
    dismiss,
    getActiveToasts() {
      return toasts.filter((toast) => !dismissedToasts.has(toast.id))
    },
    getHistory() {
      return toasts
    },
  }
}

export const DEFAULT_TOAST_CORE: ToastCore = createToastCore()

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

const message = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return DEFAULT_TOAST_CORE.create({ ...data, message })
}

const error = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return DEFAULT_TOAST_CORE.create({ ...data, message, type: 'error' })
}

const success = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return DEFAULT_TOAST_CORE.create({ ...data, message, type: 'success' })
}

const info = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return DEFAULT_TOAST_CORE.create({ ...data, message, type: 'info' })
}

const warning = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return DEFAULT_TOAST_CORE.create({ ...data, message, type: 'warning' })
}

const loading = (message: ToastTitle, data?: ExternalToast): ToastId => {
  return DEFAULT_TOAST_CORE.create({ ...data, message, type: 'loading' })
}

const custom = (jsx: (id: ToastId) => JSX.Element, data?: ExternalToast): ToastId => {
  const id = data?.id || DEFAULT_TOAST_CORE.createId()
  DEFAULT_TOAST_CORE.create({ jsx: jsx(id), ...data, id })
  return id
}

const dismiss: (id?: ToastId | undefined) => ToastId | undefined = DEFAULT_TOAST_CORE.dismiss
const getHistory: (id?: ToastId | undefined) => ToastT[] = DEFAULT_TOAST_CORE.getHistory
const getToasts: (id?: ToastId | undefined) => ToastT[] = DEFAULT_TOAST_CORE.getActiveToasts

const promise = <ToastData>(
  promiseValue: PromiseT<ToastData>,
  data?: PromiseData<ToastData>,
): PromiseReturn<ToastData> | undefined => {
  if (!data) {
    return
  }

  let id: ToastId | undefined

  if (data.loading !== undefined) {
    id = DEFAULT_TOAST_CORE.create({
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
        DEFAULT_TOAST_CORE.create({ id, type: 'default', ...response })
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

        DEFAULT_TOAST_CORE.create({ id, type: 'error', description, ...toastSettings })
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

        DEFAULT_TOAST_CORE.create({ id, type: 'error', description, ...toastSettings })
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

        DEFAULT_TOAST_CORE.create({ id, type: 'success', description, ...toastSettings })
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

        DEFAULT_TOAST_CORE.create({ id, type: 'error', description, ...toastSettings })
      }
    })
    .finally(() => {
      if (shouldDismiss) {
        DEFAULT_TOAST_CORE.dismiss(id)
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
