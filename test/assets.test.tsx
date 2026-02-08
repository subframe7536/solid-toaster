import { render } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'

import { getAsset, Loader } from '../src/assets'

describe('assets', () => {
  it('returns icon for known types and null for unknown', () => {
    expect(getAsset('success')).not.toBeNull()
    expect(getAsset('error')).not.toBeNull()
    expect(getAsset('warning')).not.toBeNull()
    expect(getAsset('info')).not.toBeNull()
    expect(getAsset(undefined)).toBeNull()
  })

  it('renders loading bars and visibility state', () => {
    const { container } = render(() => <Loader visible={true} class="extra-loader" />)

    const wrapper = container.querySelector('.sonner-loading-wrapper')
    const bars = container.querySelectorAll('.sonner-loading-bar')

    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('extra-loader')
    expect(wrapper).toHaveAttribute('data-visible', 'true')
    expect(bars).toHaveLength(12)
  })
})
