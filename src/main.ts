import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { installQaDevAssertions } from './dev/qaRuntimeAssertions'
import { createPluginRegistry, PLUGIN_REGISTRY_KEY } from './plugins/registry'
import { GAME_PLUGINS } from './game.config'

const registry = createPluginRegistry()
for (const plugin of GAME_PLUGINS) {
  registry.register(plugin)
}

if (import.meta.env.DEV) {
  installQaDevAssertions()
}

const app = createApp(App)
app.use(createPinia())
app.provide(PLUGIN_REGISTRY_KEY, registry)
app.mount('#app')
