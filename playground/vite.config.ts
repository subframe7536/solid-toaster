import path from 'node:path'

import uno from '@subf/unocss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isGithubActions = process.env.GITHUB_ACTIONS === 'true'
const base = isGithubActions && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  base,
  plugins: [uno({ inspector: false }), solid()],
  resolve: {
    alias: {
      '~': path.resolve('../src'),
    },
  },
  build: {
    outDir: '../dist/playground',
    emptyOutDir: true,
  },
})
