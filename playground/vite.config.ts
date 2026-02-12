import path from 'node:path'

import uno from 'unocss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isGithubActions = process.env.GITHUB_ACTIONS === 'true'
const base = isGithubActions && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  root: __dirname,
  base,
  plugins: [uno({ inspector: false }), solid()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: '../dist/playground',
    emptyOutDir: true,
  },
})
