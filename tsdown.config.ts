import { defineConfig } from 'tsdown'
import solid from 'vite-plugin-solid'

const entry = ['./src/index.ts', './src/compact.ts']

export default defineConfig([
  {
    entry,
    platform: 'browser',
    plugins: [solid()],
    copy: ['./src/styles/styles.css', './src/styles/base.css', './src/styles/theme.css'],
    dts: { oxc: true },
  },
  {
    entry,
    platform: 'neutral',
    outExtensions: () => ({ js: '.jsx' }),
    exports: {
      customExports(exports) {
        for (const [key, value] of Object.entries(exports)) {
          if (typeof value !== 'string' || !value.endsWith('.jsx')) {
            continue
          }

          exports[key] = {
            solid: value,
            default: value.replace(/\.jsx$/, '.js'),
            type: value.replace(/\.jsx$/, '.d.ts'),
          }
        }

        exports['./style.css'] = './dist/styles.css'
        exports['./styles.css'] = './dist/styles.css'
        exports['./base.css'] = './dist/base.css'
        exports['./theme.css'] = './dist/theme.css'
        return exports
      },
    },
    dts: false,
  },
])
