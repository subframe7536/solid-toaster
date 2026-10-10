import { describe, expect, it } from 'vitest'

import { createToastState } from '../src/state'

describe('toast store', () => {
  it('generates sequential ids for new toasts with hook createToastState', () => {
    const store = createToastState()

    const first = store.create({ message: 'A' })
    const second = store.create({ message: 'B' })

    expect(first).toBeTypeOf('number')
    expect(second).toBeTypeOf('number')
    expect(Number(second)).toBeGreaterThan(Number(first))
  })

  it('tracks created and active toasts', () => {
    const store = createToastState()

    store.create({ message: 'Tracked', id: 'tracked-id' })

    expect(store.getHistory()).toHaveLength(1)
    expect(store.getActiveToasts()).toHaveLength(1)
    expect(store.getActiveToasts()[0]?.title).toBe('Tracked')

    store.dismiss('tracked-id')
    expect(store.getHistory()).toHaveLength(1)
    expect(store.getActiveToasts()).toHaveLength(0)
  })
})
