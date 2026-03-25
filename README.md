# Interactive Novel Framework

A data-driven interactive fiction engine built with Vue 3, TypeScript, Pinia, and Tailwind CSS. Story content is authored in CSV spreadsheets and compiled to typed TypeScript at build time. Game systems (combat, inventory, progression, character creation) are **optional plugins** — each game activates only what it needs. Ships as a web app and can be packaged for Android and iOS via Capacitor.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Development Server](#running-the-development-server)
- [Plugin System](#plugin-system)
  - [How Plugins Work](#how-plugins-work)
  - [Activating Plugins for a Game](#activating-plugins-for-a-game)
  - [Built-in Plugins](#built-in-plugins)
  - [Writing a New Plugin](#writing-a-new-plugin)
  - [Plugin API Reference](#plugin-api-reference)
- [Firebase (Phase 5)](#firebase-phase-5-cloud-features)
- [Building for Production](#building-for-production)
- [The Data Pipeline (CSV to TypeScript)](#the-data-pipeline-csv-to-typescript)
- [Mobile Builds with Capacitor](#mobile-builds-with-capacitor)
- [Project Structure](#project-structure)
- [How to Author Content](#how-to-author-content)
- [Technology Stack](#technology-stack)

---

## Architecture Overview

```
┌──────────────┐      build-data.js      ┌──────────────────┐
│  CSV Files   │ ──────────────────────► │  TypeScript Data  │
│  data/csv/   │                         │  src/data/        │
└──────────────┘                         └────────┬─────────┘
                                                  │
                         ┌────────────────────────┼──────────────────────────┐
                         │                        │                          │
                  ┌──────▼──────┐    ┌────────────▼────────┐  ┌─────────────▼────────┐
                  │  Core       │    │  Plugin Registry     │  │  Plugins             │
                  │  Engine     │    │  (registry.ts)       │  │  src/plugins/        │
                  │  set_flag   │    │  actions             │  │  combat/             │
                  │  has_flag   │    │  conditions          │  │  inventory/          │
                  │  navigate   │    │  mechanics           │  │  progression/        │
                  │  stat_check │    │  gameModes           │  │  character-creation/ │
                  └──────┬──────┘    └────────────┬────────┘  └─────────────┬────────┘
                         │                        │                         │
                  ┌──────▼────────────────────────▼─────────────────────────▼──────┐
                  │                      Pinia Store (playerStore)                 │
                  │  HP, currency, inventory, equipment, flags, save slot          │
                  └──────────────────────────────┬────────────────────────────────┘
                                                 │
                  ┌──────────────────────────────▼───────────────────────────────┐
                  │                       Vue Components                         │
                  │  App.vue → MainMenu / PlayerHud / NarrativeView / [mode]     │
                  └──────────────────────────────┬──────────────────────────────┘
                                                 │
                                     ┌───────────▼───────────┐
                                     │   localStorage        │
                                     │   (3 save slots)      │
                                     └───────────────────────┘
```

The **core framework** handles story traversal, flags, navigation, save/load, audio, and analytics. Everything else — combat, items, leveling, character creation — lives in plugins. The game declares which plugins it wants in `src/game.config.ts`, and only those systems are loaded.

## Prerequisites

| Tool        | Version | Notes                                        |
| ----------- | ------- | -------------------------------------------- |
| **Node.js** | >= 18   | LTS recommended                              |
| **npm**     | >= 9    | Comes with Node.js                           |
| **Java**    | JDK 17+ | Only needed for Android builds via Capacitor |
| **Xcode**   | 15+     | Only needed for iOS builds (macOS only)      |

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd interactive-novel-framework
```

2. **Install dependencies**

```bash
npm install
```

## Running the Development Server

```bash
npm run dev
```

Vite will start a local server (typically at `http://localhost:5173`). The page hot-reloads on source file changes.

> **Note**: If you have modified any CSV files in `data/csv/`, run `npm run build:data` to regenerate TypeScript data, or use `npm run dev:full` to run the dev server and a CSV watcher together so data rebuilds automatically on save.

### Data tooling

| Command                  | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `npm run build:data`     | Compile CSV → TypeScript.                                |
| `npm run validate:data`  | Validate CSVs only (no write).                           |
| `npm run lint:data`      | Lint all CSVs with diagnostic codes; exit 1 if errors.   |
| `npm run lint:data:json` | Same as `lint:data` with `--format=json` for CI.         |
| `npm run dev:data`       | Watch `data/csv/` and rebuild `src/data/*.ts` on change. |
| `npm run dev:full`       | Run `vite` and `dev:data` in parallel.                   |

Lint options: `--format=json`, `--max-warnings=N`, `--strict` (warnings as errors).

### Story authoring app (Phase 3)

A standalone visual editor for the node graph and CSV content:

```bash
npm run authoring:dev     # Dev server at http://localhost:5174
npm run authoring:build   # Production build of the authoring app
npm run authoring:preview # Preview the authoring build
```

Open the app, click **Load** to read project CSVs, edit nodes/choices in the graph and side inspector, then **Save** to write back to `data/csv/`. Save is validated server-side; invalid data is rejected.

### Playtest mode (QA)

In **development** only (`npm run dev`), a **QA** button appears (bottom-right). Press **Ctrl+Shift+P** or click it to open the playtest panel. You can:

- **Teleport** to any story node by ID.
- View and mutate **state** (flags, items, HP, currency, XP, attributes).
- **Reset to defaults** for a clean slate.

Playtest is gated by `import.meta.env.DEV` and is not included in production builds.

---

## Plugin System

### How Plugins Work

Game systems register their contributions with a central **plugin registry** at startup. The registry keeps four dispatch tables:

| Table | What it stores |
|---|---|
| `actions` | Handlers for story actions (e.g. `adjust_hp`, `add_item`) |
| `conditions` | Evaluators for visibility conditions (e.g. `has_item`) |
| `mechanics` | Handlers for choice mechanics (e.g. `combat_init`, `skill_check`) |
| `gameModes` | Vue components for full-screen game modes (e.g. `CombatMode`) |

When the story engine runs an action or checks a visibility condition, it first handles core built-ins (`set_flag`, `has_flag`, `not_has_flag`, `navigate`, `stat_check`), then falls through to the plugin registry. If no plugin handles it, a warning is logged and the event is a no-op.

The framework UI (`App.vue`, `NarrativeView`, `MainMenu`, `PlayerHud`) reads the registry via `usePluginRegistry()` to conditionally render panels and buttons based on which plugins are active. If no combat plugin is registered, the Inventory button, Level & Attributes button, PlayerHud stats, and the whole `CombatMode` component simply don't exist.

### Activating Plugins for a Game

Open `src/game.config.ts` — this is the single file that declares which systems a game uses:

```typescript
// src/game.config.ts
import { combatPlugin }             from './plugins/combat'
import { inventoryPlugin }          from './plugins/inventory'
import { progressionPlugin }        from './plugins/progression'
import { characterCreationPlugin }  from './plugins/character-creation'

export const GAME_PLUGINS = [
  combatPlugin,
  inventoryPlugin,
  progressionPlugin,
  characterCreationPlugin,
]
```

To build a game **without combat** (e.g. a pure narrative or puzzle game), simply remove `combatPlugin`:

```typescript
export const GAME_PLUGINS = [
  inventoryPlugin,
  progressionPlugin,
  characterCreationPlugin,
]
```

To build a minimal **story-only game** with no systems at all:

```typescript
export const GAME_PLUGINS = []
```

Vite tree-shakes unused plugins — they will not appear in the production bundle.

### Built-in Plugins

These plugins live under `src/plugins/` and cover the systems developed for Cellar Debt.

#### `combatPlugin` — `src/plugins/combat/`

Turn-based D&D-style combat.

- **Actions registered**: `adjust_hp`, `heal`
- **Mechanics registered**: `combat_init` — starts combat by entering the `combat` game mode
- **Game mode registered**: `combat` — renders `CombatView` wrapped in resolution logic
- **Requires**: enemy and encounter data in `src/data/enemies.ts` and `src/data/encounters.ts`

#### `inventoryPlugin` — `src/plugins/inventory/`

Item and currency management.

- **Actions registered**: `add_item`, `remove_item`, `adjust_currency`
- **Conditions registered**: `has_item` — choice visibility based on inventory
- Enables the **Inventory** button and panel in the game UI

#### `progressionPlugin` — `src/plugins/progression/`

Skill checks, XP, leveling, and attributes.

- **Mechanics registered**: `skill_check` — dice rolls against a DC with attribute and proficiency bonuses
- Enables the **Level & Attributes** button and panel in the game UI

#### `characterCreationPlugin` — `src/plugins/character-creation/`

Character sheet picker on new game start.

- **New game component**: `CharacterSheetPicker` — shows preset character cards and a custom point-buy builder
- When this plugin is not registered, clicking **New Game** starts immediately with config defaults
- Preset sheets and point-buy rules are defined in `src/data/characterSheets.ts`

---

### Writing a New Plugin

A plugin is a TypeScript object that satisfies `FrameworkPlugin` (defined in `src/plugins/types.ts`). Create a folder under `src/plugins/<your-plugin>/`.

#### 1. Create the plugin index

```typescript
// src/plugins/alchemy/index.ts
import type { FrameworkPlugin, ActionHandler, MechanicHandler } from '../types'
import AlchemyMode from './AlchemyMode.vue'

const brewPotion: ActionHandler = (payload, { store }) => {
  const potionId = payload.potionId as string
  store.addItem(potionId, 1)
  return { type: 'brew_potion' }
}

const alchemyCheck: MechanicHandler = (mechanic, ctx) => {
  // mechanic contains the raw fields from your CSV column
  const ingredientId = mechanic.ingredientId as string
  const onSuccess = mechanic.onSuccess as { nextNodeId: string }
  const onFailure = mechanic.onFailure as { nextNodeId: string }

  // access player state, navigate, play sounds, show notifications...
  ctx.playSfx('bubble')
  ctx.notify('alchemy', 'You attempt to brew...')
  ctx.navigateTo(onSuccess.nextNodeId)
}

export const alchemyPlugin: FrameworkPlugin = {
  id: 'alchemy',

  actions: {
    brew_potion: brewPotion,
  },

  mechanics: {
    alchemy_check: alchemyCheck,
  },

  gameModes: {
    alchemy: AlchemyMode,      // optional: a full-screen mode
  },
}
```

#### 2. Create a game mode component (optional)

If your plugin needs a full-screen view (like a crafting table or sailing minigame), create a Vue component that receives `modeData` props and emits `exitMode` or `returnToMenu`:

```vue
<!-- src/plugins/alchemy/AlchemyMode.vue -->
<script setup lang="ts">
const props = defineProps<{
  modeData: Record<string, unknown>  // data passed when the mode was started
}>()

const emit = defineEmits<{
  exitMode: []        // return to narrative
  returnToMenu: []    // quit to main menu
}>()
</script>

<template>
  <section>
    <!-- your alchemy UI -->
    <button @click="emit('exitMode')">Done brewing</button>
  </section>
</template>
```

To **enter** the mode from a mechanic handler, call `ctx.startGameMode('alchemy', { someData: 'value' })`. The framework will render your component and pass `{ someData: 'value' }` as `modeData`.

#### 3. Create a new-game component (optional)

If your plugin needs to configure state before the first node loads (e.g. picking a ship, choosing a faction), provide a `newGameComponent`. It receives `slotId` and must emit `confirm` with the slot ID and an optional `CharacterSheetPayload`, or `cancel`:

```vue
<!-- src/plugins/ship-selection/ShipPicker.vue -->
<script setup lang="ts">
const props = defineProps<{ slotId: string }>()
const emit = defineEmits<{
  confirm: [slotId: string, payload?: CharacterSheetPayload]
  cancel: []
}>()
</script>
```

Only one plugin may register a `newGameComponent`. If multiple plugins attempt to register one, the last one wins.

#### 4. Register the plugin

Add it to `src/game.config.ts`:

```typescript
import { alchemyPlugin } from './plugins/alchemy'

export const GAME_PLUGINS = [
  inventoryPlugin,
  alchemyPlugin,     // ← add here
]
```

#### 5. Use it in CSV content

Your new action and mechanic types are now available in CSV columns:

```
# nodes.csv — onEnter action
brew_potion:health_potion_small

# nodes.csv — choice mechanic
alchemy_check:n_success_brew:n_fail_brew
```

---

### Plugin API Reference

#### `FrameworkPlugin` interface

```typescript
interface FrameworkPlugin {
  id: string

  // Optional: initial values this plugin adds to the player state.
  // Merged together from all registered plugins at startup.
  playerStateDefaults?: () => Record<string, unknown>

  // Handlers for CSV actions (onEnter / choice side-effects).
  // Receives the raw payload object and an ActionContext with the player store.
  actions?: Record<string, ActionHandler>

  // Evaluators for choice visibility requirements.
  // Returns true if the choice should be shown.
  conditions?: Record<string, ConditionEvaluator>

  // Handlers for choice mechanics (what happens when a choice is selected).
  // Receives the raw mechanic object and a MechanicContext.
  mechanics?: Record<string, MechanicHandler>

  // Full-screen game mode components.
  // Keyed by mode name (e.g. 'combat', 'alchemy', 'sailing').
  gameModes?: Record<string, Component>

  // Component to show during new-game setup.
  // Must emit { confirm, cancel }.
  newGameComponent?: Component

  // Arbitrary config object, readable via registry.getPluginConfig('your-id').
  config?: Record<string, unknown>
}
```

#### `ActionHandler`

```typescript
type ActionHandler = (
  payload: Record<string, unknown>,  // raw CSV payload fields
  ctx: {
    store: {
      setFlag(key: string, value: boolean): void
      adjustHp(amount: number): void
      addItem(itemId: string, qty?: number): void
      removeItem(itemId: string, qty?: number): void
      adjustCurrency(amount: number): void
      [key: string]: unknown
    }
  },
) => { type: string; value?: number }
```

#### `ConditionEvaluator`

```typescript
type ConditionEvaluator = (
  requirement: Record<string, unknown>,  // raw CSV requirement fields
  state: Record<string, unknown>,        // { flags, inventory, vitals, ... }
) => boolean
```

#### `MechanicContext` (available inside mechanic handlers)

```typescript
interface MechanicContext {
  playerStore: { /* full player store */ }
  currentNodeId: string
  choiceId: string
  navigateTo(nodeId: string): void
  startGameMode(mode: string, data?: Record<string, unknown>): void
  notify(type: string, message: string, detail?: string): void
  playSfx(id: string): void
  trackOutcome(type: string, metadata?: Record<string, unknown>): void
}
```

#### Core built-ins (always active, no plugin required)

These are handled by the framework core and cannot be overridden by plugins:

| Type | Category | Behavior |
|---|---|---|
| `set_flag` | action | Sets a boolean flag on the player |
| `navigate` | mechanic | Navigates to a node ID |
| `has_flag` | condition | True when the named flag is `true` |
| `not_has_flag` | condition | True when the named flag is absent or `false` |
| `stat_check` | condition | Compares `hpCurrent` or `currency` with a numeric operator |

---

## Firebase (Phase 5 cloud features)

Cloud save, shared outcomes, and story package listing can use **Firebase** (Auth + Firestore) when enabled.

**Local vs Firebase provider**

- By default the app uses **local providers**: auth and saves are in-memory/localStorage only. No backend required.
- When `GAME_CONFIG.features.cloudSave` is `true` and Firebase env vars are set, the app uses **Firebase providers** for auth, save sync, analytics, and story package listing.

**Firebase setup**

1. Create a [Firebase project](https://console.firebase.google.com/) and enable **Authentication** (Email/Password) and **Firestore** (native mode).
2. Register a web app and copy the config. Create `.env.local` from the template:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in `.env.local` with your project values:

   | Variable                    | Description         |
   | --------------------------- | ------------------- |
   | `VITE_FIREBASE_API_KEY`     | Web API key         |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Project auth domain |
   | `VITE_FIREBASE_PROJECT_ID`  | Project ID          |
   | `VITE_FIREBASE_APP_ID`      | Web app ID          |

4. Deploy Firestore rules (from project root):
   ```bash
   firebase deploy --only firestore:rules
   ```
   Rules are in `firestore.rules`: per-user saves under `users/{uid}/saves`, analytics write-only, story packages read-only.
5. In `src/config.ts`, set `features.cloudSave: true` to use Firebase when env is present. Optional: set `VITE_PROVIDER_MODE=local` or `VITE_PROVIDER_MODE=firebase` to force a provider for testing.

**Google Sign-In (web and mobile)**

- In Firebase Console, enable **Google** as a sign-in provider under Authentication → Sign-in method.
- On **web**, the main menu shows "Sign in with Google" when Firebase is configured.
- On **native (iOS/Android)** (Capacitor), the app uses **@capawesome/capacitor-google-sign-in**. Set the env var **`VITE_GOOGLE_WEB_CLIENT_ID`** to your Web client ID from Google Cloud Console.

**Google Play Games (Android only)**

- "Sign in with Play Games" is shown on **Android** only. It uses **capacitor-play-games-services**. Configure your game in [Google Play Console](https://play.google.com/console) → Play Games Services, then add the game/app ID to the plugin's `res/values/strings.xml`.

**Feature flag progression**: Enable flags in `src/config.ts` for dev first; after QA, promote to staging, then enable in production gradually. See `docs/phase5-rollout-checklist.md`.

**Phase 5 observability (QA)**: In development, run `window.__phase5_diagnostics()` in the console to read sync failure count, conflict count, and analytics ingest error count.

**Troubleshooting**

- **Invalid email or password**: Sign in with the email and password you used when creating the account, or use "Need an account? Sign up" to create one.
- **Firestore `net::ERR_BLOCKED_BY_CLIENT`**: Often caused by an ad blocker or browser extension blocking `firestore.googleapis.com`. Disable the blocker for this app's origin or allow Firebase in the extension.
- **Music "failed to load"**: Optional; add `public/audio/music/menu.mp3` (and other tracks) if you want menu music, or ignore the console message.

---

## Building for Production

### 1. Compile story data from CSV (if changed)

```bash
npm run build:data
```

### 2. Build the web application

```bash
npm run build
```

Runs `vue-tsc` for type-checking followed by `vite build`. Output lands in `dist/`.

### 3. Preview the production build locally

```bash
npm run preview
```

---

## The Data Pipeline (CSV to TypeScript)

All game content lives in CSV files under `data/csv/`:

| CSV File         | Generates                | Contains                                      |
| ---------------- | ------------------------ | --------------------------------------------- |
| `nodes.csv`      | `src/data/nodes.ts`      | Story nodes, narrative text, choices, actions |
| `items.csv`      | `src/data/items.ts`      | Weapons, consumables, tools with stats        |
| `enemies.csv`    | `src/data/enemies.ts`    | Enemy templates with HP, AC, attack, damage   |
| `encounters.csv` | `src/data/encounters.ts` | Combat encounter definitions and outcomes     |

Running `npm run build:data` invokes `scripts/build-data.js`, which:

1. Reads each CSV with PapaParse
2. Parses pipe-delimited fields (`|`), colon-separated tokens (`:`)
3. Converts rows into strongly-typed JavaScript objects
4. Writes auto-generated `.ts` files with proper imports and type annotations

### CSV Syntax Reference

**Actions** (used in `onEnter` column of nodes.csv):

```
adjust_currency:25           → gives 25 gold
adjust_currency:-15          → removes 15 gold
add_item:smoke_bomb:1        → adds 1 smoke bomb
remove_item:smoke_bomb:1     → removes 1 smoke bomb
adjust_hp:-3                 → removes 3 HP
set_flag:robbed_armory:true  → sets the flag
```

Multiple actions are pipe-separated: `adjust_currency:-15 | add_item:smoke_bomb:1`

**Mechanics** (used in choice mechanic columns):

```
navigate:n_market                                        → go to node
combat_init:combat_alley_thug                            → start combat encounter
skill_check:1d20+2:12:n_safehouse_hall:combat_alley_thug → roll, DC 12, success/fail destinations
```

**Visibility requirements** (used in choice visibility columns):

```
has_item:smoke_bomb          → choice visible only if player has the item
has_flag:robbed_armory       → choice visible only if flag is set
stat_check:currency:>=:15    → choice visible only if gold >= 15
```

---

## Mobile Builds with Capacitor

### Android

```bash
npm run build
npx cap sync android
npx cap open android
```

Then build/run from Android Studio. The Capacitor config is in `capacitor.config.ts`.

### iOS (macOS only)

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Build and run from Xcode targeting a simulator or device.

---

## Project Structure

```
interactive-novel-framework/
├── data/csv/                  # Source-of-truth content (CSV spreadsheets)
│   ├── nodes.csv
│   ├── items.csv
│   ├── enemies.csv
│   └── encounters.csv
│
├── scripts/
│   ├── build-data.js          # CSV → TypeScript compiler
│   ├── lint-data.js           # CSV linter (diagnostics, exit codes)
│   ├── dev-data.js            # CSV watcher (auto-rebuild)
│   ├── authoring-server-plugin.js
│   └── data-core/             # Shared parsing/validate/graph/export modules
│
├── authoring/                 # Standalone story authoring app (Vue Flow)
│   ├── components/            # GraphCanvas, NodeInspector, DiagnosticsPanel
│   ├── composables/           # useAuthoringData, useGraphLayout
│   ├── adapters/              # graphAdapter, csvAdapter
│   └── api/                   # authoringClient (load/validate/save)
│
├── src/
│   ├── main.ts                # App entry point — creates registry, registers plugins
│   ├── App.vue                # Root component (dynamic game modes, auto-save)
│   ├── game.config.ts         # ← Declare which plugins this game uses
│   │
│   ├── plugins/               # ← All optional game systems live here
│   │   ├── types.ts           # FrameworkPlugin interface, handler types
│   │   ├── registry.ts        # PluginRegistry class (singleton + Vue provide/inject)
│   │   ├── combat/            # Turn-based combat system
│   │   │   ├── index.ts       #   Plugin definition (actions, mechanics, game mode)
│   │   │   └── CombatMode.vue #   Full-screen combat wrapper
│   │   ├── inventory/         # Item and currency management
│   │   │   └── index.ts       #   Plugin definition (actions, conditions)
│   │   ├── progression/       # Skills, XP, leveling, attribute checks
│   │   │   └── index.ts       #   Plugin definition (mechanics)
│   │   └── character-creation/
│   │       ├── index.ts       #   Plugin definition (new-game component)
│   │       └── CharacterSheetPicker.vue
│   │
│   ├── components/
│   │   ├── MainMenu.vue       # Save-slot selection (renders plugin's new-game UI)
│   │   ├── NarrativeView.vue  # Story text + choice dispatch (delegates to registry)
│   │   ├── CombatView.vue     # Combat logic component (used by combat plugin)
│   │   ├── ChoiceList.vue     # Filtered choice buttons
│   │   ├── InventoryPanel.vue # Item management overlay (used when inventory plugin active)
│   │   ├── ProgressionPanel.vue # Level/attributes overlay (used when progression plugin active)
│   │   ├── PlayerHud.vue      # Status bar (conditionally renders per active plugins)
│   │   └── PlaytestPanel.vue  # DEV-only QA panel
│   │
│   ├── composables/
│   │   └── useCombat.ts       # Combat logic (attack rolls, turns, resolution)
│   │
│   ├── data/                  # Auto-generated — do not edit manually
│   │   ├── nodes.ts
│   │   ├── items.ts
│   │   ├── enemies.ts
│   │   ├── encounters.ts
│   │   └── characterSheets.ts # Preset character sheets and point-buy config
│   │
│   ├── engine/
│   │   ├── actionResolver.ts      # Dispatches actions: core built-ins + plugin registry
│   │   ├── visibilityResolver.ts  # Evaluates conditions: core built-ins + plugin registry
│   │   └── characterSheetBuilder.ts
│   │
│   ├── stores/
│   │   └── playerStore.ts     # Pinia store (player state, game actions)
│   │
│   ├── types/
│   │   ├── story.ts           # StoryNode, Choice, Action, Visibility types
│   │   ├── combat.ts          # Enemy, Encounter, CombatState types
│   │   ├── items.ts           # ItemTemplate type
│   │   ├── player.ts          # PlayerState, Vitals, Inventory types
│   │   └── characterSheet.ts  # CharacterSheetPreset, PointBuyConfig types
│   │
│   ├── config.ts              # GAME_CONFIG — tunable values (HP, leveling, combat, UI)
│   │
│   └── utils/
│       ├── dice.ts            # Dice notation parser and roller (e.g. "1d20+2")
│       └── storage.ts         # localStorage save/load with debouncing
│
├── android/                   # Capacitor Android project
├── ios/                       # Capacitor iOS project
│
├── package.json
├── vite.config.ts
├── capacitor.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## How to Author Content

### Adding a new story node

1. Open `data/csv/nodes.csv` in a spreadsheet editor or text editor.
2. Add a new row with a unique `id` (e.g. `n_tavern`), a `type` (`encounter`, `narrative`, or `ending`), and `text` for the narrative.
3. Define up to 3 choices per node using the `choice1_*`, `choice2_*`, `choice3_*` column groups.
4. Run `npm run build:data` to regenerate `src/data/nodes.ts`.
5. Link to it from other nodes via `navigate:n_tavern`.

### Adding a new item

1. Add a row to `data/csv/items.csv` with the item `id`, `name`, `type` (`weapon`, `consumable`, or `tool`), and optional `damage`, `attackBonus`, `acBonus`, and `effect` columns.
2. Run `npm run build:data`.
3. Reference the item in story nodes via `add_item:<id>:<qty>` actions.

### Adding a new enemy

1. Add a row to `data/csv/enemies.csv` with `id`, `name`, `hp`, `ac`, `attackBonus`, and `damage` (dice notation).
2. Run `npm run build:data`.
3. Use the enemy ID in encounter definitions.

### Adding a new combat encounter

1. Add a row to `data/csv/encounters.csv` with `id`, `enemies` (pipe-separated as `enemyId:count`), `onVictory` (node ID), and `onDefeat` (node ID).
2. Run `npm run build:data`.
3. Trigger the encounter from a story node via `combat_init:<encounterId>`.

---

## Technology Stack

| Layer         | Technology                                     | Purpose                                                         |
| ------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Framework     | Vue 3 (Composition API)                        | Reactive UI components                                          |
| Language      | TypeScript (strict mode)                       | Type safety across the entire codebase                          |
| State         | Pinia                                          | Centralized player state management                             |
| Styling       | Tailwind CSS v4                                | Utility-first dark-themed UI                                    |
| Bundler       | Vite 7                                         | Fast HMR in dev, optimized production builds                    |
| Data Pipeline | PapaParse + Node.js script                     | CSV-to-TypeScript code generation                               |
| Plugin System | Custom registry (provide/inject)               | Opt-in game systems with zero coupling to the framework core    |
| Mobile        | Capacitor (Android + iOS)                      | Native mobile wrappers for the web app                          |
| Persistence   | localStorage (+ Firebase when Phase 5 enabled) | Client-side save/load; cloud sync via Firestore when configured |
