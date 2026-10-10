import type { JSX } from 'solid-js'
import { createStore, produce, reconcile } from 'solid-js/store'

import type {
  ExternalToast,
  PromiseData,
  PromiseIExtendedResult,
  PromiseReturn,
  PromiseT,
  ToastEvent,
  ToastId,
  ToastT,
  ToastTitle,
  ToastTypes,
} from './types'

type CreateToastData = ExternalToast & {
  message?: ToastTitle
  type?: ToastTypes
  promise?: PromiseT
  jsx?: JSX.Element
  preventDuplicate?: boolean
}

function hasValidToastId(id: ToastId | undefined): id is ToastId {
  return typeof id === 'number' || (typeof id === 'string' && id.length > 0)
}

function canRenderNode(node: unknown): boolean {
  return node !== null && node !== undefined
}

function isSameToastValue(first: unknown, second: unknown) {
  if (typeof first === 'string' || typeof first === 'number') {
    if (typeof second === 'string' || typeof second === 'number') {
      return String(first) === String(second)
    }

    return false
  }

  return Object.is(first, second)
}

function isSameToastContent(first: ToastT, second: ToastT) {
  if (isSameToastValue(first.id, second.id)) {
    return true
  }

  const hasFirstJsx = canRenderNode(first.jsx)
  const hasSecondJsx = canRenderNode(second.jsx)

  if (hasFirstJsx || hasSecondJsx) {
    return hasFirstJsx && hasSecondJsx && isSameToastValue(first.jsx, second.jsx)
  }

  return (
    isSameToastValue(first.title, second.title) &&
    isSameToastValue(first.description, second.description) &&
    isSameToastValue(first.action, second.action) &&
    isSameToastValue(first.cancel, second.cancel) &&
    isSameToastValue(first.type, second.type)
  )
}

export function createToastState() {
  const [store, setStore] = createStore<ToastT[]>([])
  const subscribers: Array<(toast: ToastEvent) => void> = []
  let history: ToastT[] = []
  let toastsCounter = 1
  let preventDuplicate = false

  const publish = (data: ToastEvent): void => {
    subscribers.forEach((subscriber) => subscriber(data))
  }

  const subscribe = (subscriber: (toast: ToastEvent) => void) => {
    subscribers.push(subscriber)

    return () => {
      const index = subscribers.indexOf(subscriber)
      if (index !== -1) {
        subscribers.splice(index, 1)
      }
    }
  }

  const createId = (): ToastId => {
    let id = toastsCounter

    while (store.some((toast) => toast.id === id)) {
      id += 1
    }

    toastsCounter = id + 1
    return id
  }

  const create = (data: CreateToastData): ToastId => {
    const { message, ...rest } = data
    const id = hasValidToastId(data.id) ? data.id : createId()
    const dismissible = data.dismissible === undefined ? true : data.dismissible

    if ((preventDuplicate || data.preventDuplicate) && data.id === undefined) {
      const candidate: ToastT = { title: message, ...rest, dismissible, id }
      let latestToast: ToastT | undefined

      for (let i = store.length - 1; i >= 0; i--) {
        const t = store[i]!
        if (
          !t.delete &&
          t.toasterId === data.toasterId &&
          (t.position ?? 'bottom-right') === (data.position ?? 'bottom-right')
        ) {
          latestToast = t
          break
        }
      }

      if (latestToast && isSameToastContent(latestToast, candidate)) {
        setStore(
          produce((state) => {
            const target = state.find((t) => t.id === latestToast!.id)
            if (target) {
              target.bumpKey = (target.bumpKey ?? 0) + 1
            }
          }),
        )
        return latestToast.id
      }
    }

    let publishedToast: ToastT | undefined

    setStore(
      produce((state) => {
        const existingToast = state.find((toast) => toast.id === id)
        if (existingToast) {
          delete existingToast.delete
          delete existingToast.promise
          Object.assign(existingToast, data, {
            id,
            dismissible,
            title: message,
          })
          publishedToast = { ...existingToast }
        } else {
          const newToast: ToastT = { title: message, ...rest, dismissible, id }
          state.push(newToast)
          publishedToast = { ...newToast }
        }
      }),
    )

    if (publishedToast) {
      publish(publishedToast)
    }

    const existingHistory = history.find((toast) => toast.id === id)
    if (existingHistory) {
      delete existingHistory.delete
      delete existingHistory.promise
      Object.assign(existingHistory, data, {
        id,
        dismissible,
        title: message,
      })
    } else {
      history.push({ title: message, ...rest, dismissible, id })
    }

    return id
  }

  const dismiss = (id?: ToastId): ToastId | undefined => {
    setStore(
      produce((state) => {
        if (id !== undefined) {
          const toast = state.find((t) => t.id === id)
          if (toast) {
            toast.delete = true
          }
        } else {
          state.forEach((toast) => {
            toast.delete = true
          })
        }
      }),
    )

    if (id !== undefined) {
      const hist = history.find((t) => t.id === id)
      if (hist) {
        hist.delete = true
      }
      publish({ id, dismiss: true })
    } else {
      history.forEach((toast) => {
        toast.delete = true
      })
      store.forEach((toast) => {
        publish({ id: toast.id, dismiss: true })
      })
      publish({ dismiss: true })
    }

    return id
  }

  const remove = (id?: ToastId): ToastId | undefined => {
    if (id !== undefined) {
      setStore((prev) => prev.filter((t) => t.id !== id))
    } else {
      setStore([])
    }

    return id
  }

  const getActiveToasts = (): ToastT[] => {
    return store.filter((toast) => !toast.delete)
  }

  const getHistory = (): ToastT[] => history

  const reset = (): void => {
    setStore([])
    toastsCounter = 1
    history = []
    subscribers.length = 0
  }

  return {
    get toasts(): ToastT[] {
      return store
    },
    set toasts(value: ToastT[]) {
      setStore(reconcile(value))
    },
    get subscribers(): Array<(toast: ToastEvent) => void> {
      return subscribers
    },
    set subscribers(value: Array<(toast: ToastEvent) => void>) {
      subscribers.length = 0
      subscribers.push(...value)
    },
    get preventDuplicate(): boolean {
      return preventDuplicate
    },
    set preventDuplicate(value: boolean) {
      preventDuplicate = value
    },
    createId,
    subscribe,
    publish,
    create,
    dismiss,
    remove,
    getActiveToasts,
    getHistory,
    reset,
  }
}

export type ToastState = ReturnType<typeof createToastState>

export const TOAST_STATE: ToastState = createToastState()

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

const createVariant =
  (type?: ToastTypes) =>
  (msg: ToastTitle, data?: ExternalToast): ToastId =>
    TOAST_STATE.create(type ? { ...data, message: msg, type } : { ...data, message: msg })

/**
 * Create a default toast.
 * @example
 * message('Saved!')
 * message('Saved!', { description: 'Changes synced.' })
 */
const message = createVariant()

/**
 * Create an error toast.
 * @example
 * toast.error('Something went wrong')
 */
const error = createVariant('error')

/**
 * Create a success toast.
 * @example
 * toast.success('Profile updated')
 */
const success = createVariant('success')

/**
 * Create an info toast.
 * @example
 * toast.info('New version available')
 */
const info = createVariant('info')

/**
 * Create a warning toast.
 * @example
 * toast.warning('Storage almost full')
 */
const warning = createVariant('warning')

/**
 * Create a loading toast.
 * @example
 * toast.loading('Uploading files...')
 */
const loading = createVariant('loading')

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
const remove = (id?: ToastId): ToastId | undefined => TOAST_STATE.remove(id)
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
    typeof promiseValue === 'function' ? promiseValue() : promiseValue,
  )

  let shouldDismiss = id !== undefined
  let result: ['resolve', ToastData] | ['reject', unknown]

  const resolvePayload = async (type: ToastTypes, handler: unknown, param: unknown) => {
    shouldDismiss = false
    const promiseData = typeof handler === 'function' ? await handler(param) : handler
    const description =
      typeof data.description === 'function' ? await data.description(param) : data.description
    const toastSettings: PromiseIExtendedResult = isPromiseExtendedResult(promiseData)
      ? promiseData
      : { message: promiseData }

    TOAST_STATE.create({
      id,
      promise: undefined,
      type,
      description,
      ...toastSettings,
    })
  }

  const originalPromise = promiseResult
    .then(async (response) => {
      result = ['resolve', response]

      if (isPromiseExtendedResult(response)) {
        shouldDismiss = false
        TOAST_STATE.create({ id, promise: undefined, type: 'default', ...response })
        return
      }

      if (isHttpResponse(response) && !response.ok) {
        await resolvePayload('error', data.error, `HTTP error! status: ${response.status}`)
        return
      }

      if (response instanceof Error) {
        await resolvePayload('error', data.error, response)
        return
      }

      if (data.success !== undefined) {
        await resolvePayload('success', data.success, response)
      }
    })
    .catch(async (errorValue) => {
      result = ['reject', errorValue]

      if (data.error !== undefined) {
        await resolvePayload('error', data.error, errorValue)
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
  remove: typeof remove
  loading: typeof loading
  getHistory: typeof getHistory
  getToasts: typeof getToasts
  subscribe: (typeof TOAST_STATE)['subscribe']
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
  remove,
  loading,
  getHistory,
  getToasts,
  subscribe: TOAST_STATE.subscribe,
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
  remove,
  getHistory,
  getToasts,
  promise,
}
