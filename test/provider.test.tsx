import { render, screen } from '@solidjs/testing-library'
import { beforeEach, describe, expect, it } from 'vitest'

import { BaseToaster, Toaster } from '../src'
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

    const toastItem = document.querySelector('.sonner-toast')
    expect(toastItem?.querySelector('.sonner-icon')).not.toBeNull()
  })

  it('BaseToaster uses core config (no default icon resolver)', async () => {
    render(() => <BaseToaster />)

    toast.success('Compact icon toast', {
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('Compact icon toast')

    const toastItem = document.querySelector('.sonner-toast')
    expect(toastItem?.querySelector('.sonner-icon')).toBeNull()
  })

  it('still lets local config override defaults', async () => {
    render(() => <BaseToaster closeButton />)

    toast('Compact override button', {
      duration: Number.POSITIVE_INFINITY,
    })

    await screen.findByText('Compact override button')

    const list = document.querySelector('.sonner-toaster')
    expect(list?.querySelector('.sonner-close-button')).toBeInTheDocument()
  })
})
