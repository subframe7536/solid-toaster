import { unocss } from 'rolldown-plugin-unocss'
import { defineConfig } from 'tsdown'
import solid from 'vite-plugin-solid'

const entry = ['./src/index.ts']

export default defineConfig([
  {
    entry,
    platform: 'browser',
    plugins: [solid(), unocss({ generateCSS: false })],
    dts: { oxc: true },
  },
  {
    entry,
    platform: 'neutral',
    plugins: [unocss({ generateCSS: false })],
    outExtensions: () => ({ js: '.jsx' }),
    dts: false,
  },
])
