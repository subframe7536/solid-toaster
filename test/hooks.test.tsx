import { render } from '@solidjs/testing-library'
import { createEffect } from 'solid-js'
import { beforeEach, describe, expect, it } from 'vitest'

import { useIsDocumentHidden } from '../src/hooks'

describe('useIsDocumentHidden', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    })
  })

  it('tracks document visibility changes', async () => {
    let currentHidden = false

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => currentHidden,
    })

    let lastValue = false

    render(() => {
      const hidden = useIsDocumentHidden()

      createEffect(() => {
        lastValue = hidden()
      })

      return null
    })

    expect(lastValue).toBe(false)

    currentHidden = true
    document.dispatchEvent(new Event('visibilitychange'))

    await Promise.resolve()
    expect(lastValue).toBe(true)
  })
})
