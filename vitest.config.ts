import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/__tests__/*.ts', 'scripts/__tests__/*.test.js'],
  },
})
