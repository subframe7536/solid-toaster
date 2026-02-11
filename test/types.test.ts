import { describe, expect, it } from 'vitest'

import type { Action } from '../src/types'
import { isAction } from '../src/types'

describe('types helpers', () => {
  it('returns true for action object', () => {
    const action: Action = {
      label: 'Undo',
      onClick: () => {},
    }

    expect(isAction(action)).toBe(true)
  })

  it('returns false for non-action values', () => {
    expect(isAction('plain text' as any)).toBe(false)
    expect(isAction(null as any)).toBe(false)
    expect(isAction({ label: 'Missing handler' } as any)).toBe(false)
  })
})
