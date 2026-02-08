import { presetWind3, transformerVariantGroup, defineConfig } from 'unocss'
import { presetAnimations } from 'unocss-preset-animations'

export default defineConfig({
  presets: [presetWind3(), presetAnimations()],
  transformers: [transformerVariantGroup()],
})
