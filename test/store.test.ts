import { describe, expect, it } from 'vitest'

import { createToastCore } from '../src/state'

describe('toast store', () => {
  it('generates sequential ids for new toasts', () => {
    const store = createToastCore()

    const first = store.create({ message: 'A' })
    const second = store.create({ message: 'B' })

    expect(first).toBeTypeOf('number')
    expect(second).toBeTypeOf('number')
    expect(Number(second)).toBeGreaterThan(Number(first))
  })

  it('keeps publish and active toasts in sync', () => {
    const store = createToastCore()
    const events: string[] = []

    const unsubscribe = store.subscribe((event) => {
      if ('title' in event) {
        events.push(String(event.title))
      }
    })

    store.create({ message: 'Tracked', id: 'tracked-id' })

    expect(events).toContain('Tracked')
    expect(store.getHistory()).toHaveLength(1)
    expect(store.getActiveToasts()).toHaveLength(1)

    unsubscribe()
  })
})
