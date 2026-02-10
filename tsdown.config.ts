import { defineConfig } from 'tsdown'
import solid from 'vite-plugin-solid'

const entry = ['./src/index.ts']

export default defineConfig([
  {
    entry,
    platform: 'browser',
    plugins: [solid()],
    external: ['defu'],
    copy: ['./src/styles/styles.css', './src/styles/base.css', './src/styles/theme.css'],
    dts: { oxc: true },
  },
  {
    entry,
    platform: 'neutral',
    external: ['defu'],
    outExtensions: () => ({ js: '.jsx' }),
    dts: false,
  },
])
