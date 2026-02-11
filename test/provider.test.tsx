import { render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it } from 'vitest'

import { CompactToaster, Toaster } from '../src'
import { toast } from '../src/state'

import { resetToastState } from './helpers/toast-state'

describe('Toaster default config variants', () => {
  beforeEach(() => {
    resetToastState()
  })

  it('Toaster uses default extra config (icon resolver enabled)', async () => {
    render(() => <Toaster />)

    toast.success('Default icon toast', {
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('Default icon toast')

    const toastItem = document.querySelector('[data-sonner-toast]')
    expect(toastItem?.querySelector('[data-icon]')).not.toBeNull()
  })

  it('CompactToaster uses core config (no default icon resolver)', async () => {
    render(() => <CompactToaster />)

    toast.success('Compact icon toast', {
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('Compact icon toast')

    const toastItem = document.querySelector('[data-sonner-toast]')
    expect(toastItem?.querySelector('[data-icon]')).toBeNull()
  })

  it('still lets local config override defaults', async () => {
    render(() => <CompactToaster config={{ closeButton: true }} />)

    toast('Compact override button', {
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('Compact override button')

    const list = document.querySelector('[data-sonner-toaster]')
    expect(list?.querySelector('[data-close-button]')).toBeInTheDocument()
  })
})
