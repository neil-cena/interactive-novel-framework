import { type Component, type InjectionKey, inject, shallowReactive } from 'vue'
import type {
  ActionHandler,
  ConditionEvaluator,
  FrameworkPlugin,
  MechanicHandler,
} from './types'

export const PLUGIN_REGISTRY_KEY: InjectionKey<PluginRegistry> = Symbol('pluginRegistry')

let _instance: PluginRegistry | null = null

export class PluginRegistry {
  private _plugins: Map<string, FrameworkPlugin> = new Map()

  readonly actions: Record<string, ActionHandler> = shallowReactive({})
  readonly conditions: Record<string, ConditionEvaluator> = shallowReactive({})
  readonly mechanics: Record<string, MechanicHandler> = shallowReactive({})
  readonly gameModes: Record<string, Component> = shallowReactive({})

  newGameComponent: Component | null = null

  register(plugin: FrameworkPlugin): void {
    if (this._plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin "${plugin.id}" already registered`)
      return
    }
    this._plugins.set(plugin.id, plugin)

    if (plugin.actions) {
      for (const [type, handler] of Object.entries(plugin.actions)) {
        this.actions[type] = handler
      }
    }
    if (plugin.conditions) {
      for (const [type, evaluator] of Object.entries(plugin.conditions)) {
        this.conditions[type] = evaluator
      }
    }
    if (plugin.mechanics) {
      for (const [type, handler] of Object.entries(plugin.mechanics)) {
        this.mechanics[type] = handler
      }
    }
    if (plugin.gameModes) {
      for (const [mode, component] of Object.entries(plugin.gameModes)) {
        this.gameModes[mode] = component
      }
    }
    if (plugin.newGameComponent) {
      this.newGameComponent = plugin.newGameComponent
    }
  }

  hasPlugin(id: string): boolean {
    return this._plugins.has(id)
  }

  getPlugin(id: string): FrameworkPlugin | undefined {
    return this._plugins.get(id)
  }

  getPlayerStateDefaults(): Record<string, unknown> {
    const merged: Record<string, unknown> = {}
    for (const plugin of this._plugins.values()) {
      if (plugin.playerStateDefaults) {
        Object.assign(merged, plugin.playerStateDefaults())
      }
    }
    return merged
  }

  getPluginConfig<T = Record<string, unknown>>(pluginId: string): T | undefined {
    return this._plugins.get(pluginId)?.config as T | undefined
  }
}

export function createPluginRegistry(): PluginRegistry {
  _instance = new PluginRegistry()
  return _instance
}

export function getPluginRegistry(): PluginRegistry {
  if (!_instance) _instance = new PluginRegistry()
  return _instance
}

export function usePluginRegistry(): PluginRegistry {
  return inject(PLUGIN_REGISTRY_KEY) ?? getPluginRegistry()
}
