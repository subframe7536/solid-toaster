import { cleanup } from '@solidjs/testing-library'
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
})

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return window.setTimeout(() => callback(performance.now()), 0)
  }
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id: number) => {
    clearTimeout(id)
  }
}
