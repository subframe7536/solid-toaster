import { presetWind3, transformerVariantGroup, defineConfig, presetIcons } from 'unocss'

export default defineConfig({
  presets: [presetWind3(), presetIcons({ scale: 1.2 })],
  transformers: [transformerVariantGroup()],
})
