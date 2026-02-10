import { render } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'

import { getAsset, Loader } from '../src/assets'

describe('assets', () => {
  it('returns icon for known types and null for unknown', () => {
    const mounted = document.createElement('div')
    render(() => <>{getAsset('success')}</>, { container: mounted })
    render(() => <>{getAsset('error')}</>, { container: mounted })
    render(() => <>{getAsset('warning')}</>, { container: mounted })
    render(() => <>{getAsset('info')}</>, { container: mounted })

    expect(getAsset(undefined)).toBeNull()
    expect(mounted.querySelectorAll('svg').length).toBeGreaterThanOrEqual(4)
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
