import { defineConfig } from 'tsdown'
import solid from 'vite-plugin-solid'

const entry = ['./src/index.ts', './src/compact.ts']

export default defineConfig([
  {
    entry,
    platform: 'browser',
    plugins: [solid()],
    copy: ['./src/styles/styles.css', './src/styles/base.css', './src/styles/theme.css'],
    exports: {
      customExports(exports) {
        exports['./style.css'] = './dist/styles.css'
        exports['./base.css'] = './dist/base.css'
        exports['./theme.css'] = './dist/theme.css'
        return exports
      },
    },
    dts: { oxc: true },
  },
  {
    entry,
    platform: 'neutral',
    outExtensions: () => ({ js: '.jsx' }),
    dts: false,
  },
])
