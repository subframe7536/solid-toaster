import { beforeEach, describe, expect, it } from 'vitest'

import { createToastState, toast } from '../src/state'

import { resetToastState } from './helpers/toast-state'

describe('toast state', () => {
  beforeEach(() => {
    resetToastState()
  })

  it('creates and updates an existing toast by id', () => {
    toast('First toast', { id: 'stable-id' })
    toast.success('Updated toast', { id: 'stable-id' })

    const history = toast.getHistory()

    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ id: 'stable-id', type: 'success', dismissible: true })
    expect(history[0]?.title).toBe('Updated toast')
  })

  it('dismisses a toast from active toasts', () => {
    toast('Dismiss me', { id: 'dismiss-id' })

    expect(toast.getToasts()).toHaveLength(1)

    toast.dismiss('dismiss-id')

    expect(toast.getToasts()).toHaveLength(0)
  })

  it('resolves promise toasts and exposes unwrap', async () => {
    const result = toast.promise(Promise.resolve('Loaded'), {
      loading: 'Loading...',
      success: (value) => `Success: ${value}`,
    })

    expect(result).toBeDefined()
    await expect(result?.unwrap()).resolves.toBe('Loaded')

    const history = toast.getHistory()

    expect(history).toHaveLength(1)
    expect(history[0]?.type).toBe('success')
    expect(history[0]?.title).toBe('Success: Loaded')
  })

  it('handles promise rejection and rejects only from unwrap', async () => {
    const failingPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Promise rejected')), 0)
    })

    const result = toast.promise(failingPromise, {
      loading: 'Loading...',
      error: (error) => `Error: ${(error as Error).message}`,
    })

    await expect(result?.unwrap()).rejects.toThrow('Promise rejected')

    const history = toast.getHistory()
    expect(history).toHaveLength(1)
    expect(history[0]?.type).toBe('error')
    expect(history[0]?.title).toBe('Error: Promise rejected')
  })

  it('supports helper methods for each variant type', () => {
    toast('Message toast')
    toast.error('Error toast')
    toast.info('Info toast')
    toast.warning('Warning toast')
    toast.loading('Loading toast')

    const history = toast.getHistory()

    expect(history).toHaveLength(5)
    expect(history[1]?.type).toBe('error')
    expect(history[2]?.type).toBe('info')
    expect(history[3]?.type).toBe('warning')
    expect(history[4]?.type).toBe('loading')
  })

  it('respects dismissible false in create path', () => {
    toast.success('Non-dismissible success', {
      id: 'non-dismissible',
      dismissible: false,
    })

    const history = toast.getHistory()
    expect(history[0]?.dismissible).toBe(false)
  })

  it('dismisses one toast and all toasts', () => {
    toast('One', { id: 'one' })
    toast('Two', { id: 'two' })

    toast.dismiss('one')
    expect(toast.getToasts().map((item) => item.id)).toEqual(['two'])

    toast.dismiss()
    expect(toast.getToasts()).toHaveLength(0)
  })

  it('skips numeric ids already used by explicit toasts', () => {
    const state = createToastState()

    expect(state.create({ message: 'Explicit', id: 1 })).toBe(1)
    expect(state.create({ message: 'Automatic' })).toBe(2)
    expect(state.getHistory()).toHaveLength(2)
  })

  it('clears dismissed ids when recreated with message helper', () => {
    toast('First', { id: 'stable-id' })
    toast.dismiss('stable-id')

    expect(toast.getToasts()).toHaveLength(0)

    toast('Second', { id: 'stable-id' })

    expect(toast.getToasts()).toHaveLength(1)
    expect(toast.getToasts()[0]?.title).toBe('Second')
  })

  it('handles promise responses with extended result shape', async () => {
    const result = toast.promise(Promise.resolve({ message: 'Extended message' } as any), {
      loading: 'Loading...',
    })

    await expect(result?.unwrap()).resolves.toMatchObject({ message: 'Extended message' })

    const history = toast.getHistory()

    expect(history).toHaveLength(1)
    expect(history[0]?.type).toBe('default')
    expect(history[0]?.title).toBe('Extended message')
  })

  it('handles non-ok HTTP responses in promise toasts', async () => {
    const response = new Response('Server error', { status: 500 })

    const result = toast.promise(Promise.resolve(response), {
      loading: 'Loading...',
      error: (message) => `HTTP Error: ${message}`,
      description: (message) => `HTTP Description: ${message}`,
    })

    await expect(result?.unwrap()).resolves.toBe(response)

    const history = toast.getHistory()

    expect(history).toHaveLength(1)
    expect(history[0]?.type).toBe('error')
    expect(history[0]?.title).toBe('HTTP Error: HTTP error! status: 500')
    expect(history[0]?.description).toBe('HTTP Description: HTTP error! status: 500')
  })

  it('treats resolved Error as extended-result-like message object', async () => {
    const resolvedError = new Error('Resolved error')

    const result = toast.promise(Promise.resolve(resolvedError), {
      loading: 'Loading...',
      error: (error) => `Handled: ${(error as Error).message}`,
      description: (error) => `Description: ${(error as Error).message}`,
    })

    await expect(result?.unwrap()).resolves.toBe(resolvedError)

    const history = toast.getHistory()

    expect(history).toHaveLength(1)
    expect(history[0]?.type).toBe('default')
  })

  it('returns unwrap when promise toast has no loading phase', async () => {
    const result = toast.promise(Promise.resolve('No loading path'), {
      success: 'Done',
    })

    expect(result).toMatchObject({ unwrap: expect.any(Function) })
    await expect(result?.unwrap()).resolves.toBe('No loading path')

    const history = toast.getHistory()
    expect(history).toHaveLength(1)
    expect(history[0]?.type).toBe('success')
    expect(history[0]?.title).toBe('Done')
  })

  it('returns undefined when promise config is missing', () => {
    const result = toast.promise(Promise.resolve('value'))
    expect(result).toBeUndefined()
  })

  it('handles rejected promise without explicit error configuration', async () => {
    const failingPromise = Promise.reject(new Error('silent'))

    const result = toast.promise(failingPromise, {
      loading: 'Loading...',
    })

    await expect(result?.unwrap()).rejects.toThrow('silent')
    expect(toast.getHistory()).toHaveLength(1)
  })

  it('runs promise finally callback after completion', async () => {
    let finallyCalls = 0

    const result = toast.promise(Promise.resolve('done'), {
      loading: 'Loading...',
      finally: () => {
        finallyCalls += 1
      },
    })

    await result?.unwrap()
    expect(finallyCalls).toBe(1)
  })

  it('creates custom jsx toasts', () => {
    const customId = toast.custom((id) => `Custom toast ${id}` as any, { id: 'custom-id' })

    const history = toast.getHistory()
    expect(customId).toBe('custom-id')
    expect(history).toHaveLength(1)
    expect(history[0]?.id).toBe('custom-id')
    expect(history[0]?.jsx).toBe('Custom toast custom-id')
  })

  it('creates custom toast without explicit id', () => {
    const generatedId = toast.custom((id) => `Generated ${id}` as any)

    expect(typeof generatedId).toBe('number')
    expect(toast.getHistory()).toHaveLength(1)
  })

  it('removes toast from store via remove', () => {
    toast('To remove', { id: 'rem-id' })
    expect(toast.getToasts()).toHaveLength(1)

    toast.remove('rem-id')
    expect(toast.getToasts()).toHaveLength(0)
    expect(toast.getHistory()).toHaveLength(1)
  })

  it('notifies subscribers on create and dismiss, and supports unsubscribe', () => {
    const events: any[] = []
    const unsubscribe = toast.subscribe((event) => {
      events.push(event)
    })

    toast('Subscribed toast', { id: 'sub-id' })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ id: 'sub-id', title: 'Subscribed toast' })

    toast.dismiss('sub-id')
    expect(events).toHaveLength(2)
    expect(events[1]).toEqual({ id: 'sub-id', dismiss: true })

    unsubscribe()
    toast('After unsub')
    expect(events).toHaveLength(2)
  })

  it('notifies subscribers when dismiss is called without id', () => {
    const events: any[] = []
    toast.subscribe((event) => {
      events.push(event)
    })

    toast('Toast 1', { id: 't1' })
    toast('Toast 2', { id: 't2' })
    expect(events).toHaveLength(2)

    toast.dismiss()
    expect(events).toContainEqual({ id: 't1', dismiss: true })
    expect(events).toContainEqual({ id: 't2', dismiss: true })
    expect(events).toContainEqual({ dismiss: true })
  })
})
