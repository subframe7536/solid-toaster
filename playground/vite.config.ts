import path from 'node:path'
import uno from 'unocss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [uno({ inspector: false }), solid()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
})
