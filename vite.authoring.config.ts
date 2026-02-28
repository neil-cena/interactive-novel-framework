import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { authoringServerPlugin } from './scripts/authoring-server-plugin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: 'authoring',
  plugins: [vue(), authoringServerPlugin()],
  resolve: {
    alias: { '@data-core': path.join(__dirname, 'scripts', 'data-core') },
  },
  server: {
    port: 5174,
  },
})
