import { presetWind3, transformerVariantGroup, defineConfig } from 'unocss'

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerVariantGroup()],
})
