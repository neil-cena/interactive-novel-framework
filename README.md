# The Cellar Debt — Interactive Novel Framework

A data-driven interactive fiction engine with D&D-style combat, built with Vue 3, TypeScript, Pinia, and Tailwind CSS. Story content is authored in CSV spreadsheets and compiled to typed TypeScript at build time. Ships as a web app and can be packaged for Android and iOS via Capacitor.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Development Server](#running-the-development-server)
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
│  CSV Files   │ ──────────────────────►  │  TypeScript Data  │
│  data/csv/   │                          │  src/data/        │
└──────────────┘                          └────────┬─────────┘
                                                   │
                          ┌────────────────────────┼────────────────────────┐
                          │                        │                        │
                   ┌──────▼──────┐   ┌─────────────▼──────┐   ┌───────────▼────────┐
                   │  Story      │   │  Combat             │   │  Items / Enemies   │
                   │  Engine     │   │  Composable         │   │  Dictionaries      │
                   │  (resolve   │   │  (useCombat.ts)     │   │  (items.ts,        │
                   │   actions,  │   │                     │   │   enemies.ts)      │
                   │   visibility│   │                     │   │                    │
                   │   checks)   │   │                     │   │                    │
                   └──────┬──────┘   └──────────┬──────────┘   └───────────┬────────┘
                          │                     │                          │
                   ┌──────▼─────────────────────▼──────────────────────────▼──────┐
                   │                      Pinia Store (playerStore)               │
                   │  HP, currency, inventory, equipment, flags, save slot        │
                   └──────────────────────────────┬──────────────────────────────-┘
                                                  │
                   ┌──────────────────────────────▼───────────────────────────────┐
                   │                       Vue Components                         │
                   │  App.vue → MainMenu / PlayerHud / NarrativeView / CombatView │
                   └──────────────────────────────┬──────────────────────────────-┘
                                                  │
                                      ┌───────────▼───────────┐
                                      │   localStorage        │
                                      │   (3 save slots)      │
                                      └───────────────────────┘
```

## Prerequisites

| Tool        | Version  | Notes                                       |
| ----------- | -------- | ------------------------------------------- |
| **Node.js** | >= 18    | LTS recommended                             |
| **npm**     | >= 9     | Comes with Node.js                          |
| **Java**    | JDK 17+  | Only needed for Android builds via Capacitor |
| **Xcode**   | 15+      | Only needed for iOS builds (macOS only)      |

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

This installs all runtime and development dependencies including Vue 3, Pinia, Tailwind CSS, Vite, and PapaParse (used by the data build script).

## Running the Development Server

```bash
npm run dev
```

Vite will start a local server (typically at `http://localhost:5173`). The page hot-reloads on source file changes.

> **Note**: If you have modified any CSV files in `data/csv/`, run `npm run build:data` to regenerate TypeScript data, or use `npm run dev:full` to run the dev server and a CSV watcher together so data rebuilds automatically on save.

### Data tooling

| Command | Description |
| ------- | ----------- |
| `npm run build:data` | Compile CSV → TypeScript (same as below). |
| `npm run validate:data` | Validate CSVs only (no write). |
| `npm run lint:data` | Lint all CSVs with diagnostic codes; exit 1 if errors. |
| `npm run lint:data:json` | Same as `lint:data` with `--format=json` for CI. |
| `npm run dev:data` | Watch `data/csv/` and rebuild `src/data/*.ts` on change. |
| `npm run dev:full` | Run `vite` and `dev:data` in parallel. |

Lint options: `--format=json`, `--max-warnings=N`, `--strict` (warnings as errors).

### Story authoring app (Phase 3)

A standalone visual editor for the node graph and CSV content:

```bash
npm run authoring:dev    # Dev server at http://localhost:5174
npm run authoring:build  # Production build of the authoring app
npm run authoring:preview # Preview the authoring build
```

Open the app, click **Load** to read project CSVs, edit nodes/choices in the graph and side inspector, then **Save** to write back to `data/csv/`. Save is validated server-side; invalid data is rejected. Use `dev:data` or `dev:full` so the game picks up changes after save.

### Firebase (Phase 5 cloud features)

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

   | Variable | Description |
   | -------- | ----------- |
   | `VITE_FIREBASE_API_KEY` | Web API key |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Project auth domain |
   | `VITE_FIREBASE_PROJECT_ID` | Project ID |
   | `VITE_FIREBASE_APP_ID` | Web app ID |

4. Deploy Firestore rules (from project root):

   ```bash
   firebase deploy --only firestore:rules
   ```

   Rules are in `firestore.rules`: per-user saves under `users/{uid}/saves`, analytics write-only, story packages read-only.

5. In `src/config.ts`, set `features.cloudSave: true` to use Firebase when env is present. Optional: set `VITE_PROVIDER_MODE=local` or `VITE_PROVIDER_MODE=firebase` to force a provider for testing.

**Troubleshooting**

- **Invalid email or password**: Sign in with the email and password you used when creating the account, or use “Need an account? Sign up” to create one.
- **Firestore `net::ERR_BLOCKED_BY_CLIENT`**: Often caused by an ad blocker or browser extension blocking `firestore.googleapis.com`. Disable the blocker for this app’s origin or allow Firebase in the extension so cloud save and analytics work.
- **Music “failed to load”**: Optional; add `public/audio/music/menu.mp3` (and other tracks) if you want menu music, or ignore the console message.

### Playtest mode (QA)

In **development** only (`npm run dev`), a **QA** button appears (bottom-right). Press **Ctrl+Shift+P** or click it to open the playtest panel. You can:

- **Teleport** to any story node by ID.
- View and mutate **state** (flags, items, HP, currency, XP, attributes).
- **Reset to defaults** for a clean slate.

Playtest is gated by `import.meta.env.DEV` and is not included in production builds.

## Building for Production

### 1. Compile story data from CSV (if changed)

```bash
npm run build:data
```

This reads the four CSV files in `data/csv/` and writes typed TypeScript dictionaries into `src/data/`.

### 2. Build the web application

```bash
npm run build
```

This runs `vue-tsc` for type-checking followed by `vite build`. The optimized output lands in the `dist/` directory.

### 3. Preview the production build locally

```bash
npm run preview
```

Serves the `dist/` folder on a local port so you can verify the production build before deploying.

## The Data Pipeline (CSV to TypeScript)

All game content lives in four CSV files under `data/csv/`:

| CSV File          | Generates            | Contains                                      |
| ----------------- | -------------------- | --------------------------------------------- |
| `nodes.csv`       | `src/data/nodes.ts`  | Story nodes, narrative text, choices, actions  |
| `items.csv`       | `src/data/items.ts`  | Weapons, consumables, tools with stats         |
| `enemies.csv`     | `src/data/enemies.ts`| Enemy templates with HP, AC, attack, damage    |
| `encounters.csv`  | `src/data/encounters.ts` | Combat encounter definitions and outcomes  |

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

## Mobile Builds with Capacitor

The project includes Capacitor configuration for Android and iOS.

### Android

```bash
npm run build                    # build the web app first
npx cap sync android             # copy dist/ into the Android project
npx cap open android             # open in Android Studio
```

Then build/run from Android Studio. The Capacitor config is in `capacitor.config.ts` with app ID `com.cellardebt.game`.

### iOS (macOS only)

```bash
npm run build
npx cap sync ios
npx cap open ios                 # open in Xcode
```

Build and run from Xcode targeting a simulator or device.

## Project Structure

```
interactive-novel-framework/
├── data/csv/                  # Source-of-truth content (CSV spreadsheets)
│   ├── nodes.csv              #   Story nodes and choices
│   ├── items.csv              #   Item definitions
│   ├── enemies.csv            #   Enemy stat blocks
│   └── encounters.csv         #   Combat encounter setups
│
├── scripts/
│   ├── build-data.js          # CSV → TypeScript compiler
│   ├── lint-data.js           # CSV linter (diagnostics, exit codes)
│   ├── dev-data.js            # CSV watcher (auto-rebuild)
│   ├── authoring-server-plugin.js  # Authoring API (load/validate/save)
│   └── data-core/             # Shared parsing/validate/graph/export (no Node in browser-safe modules)
│
├── authoring/                 # Standalone story authoring app (Vue Flow)
│   ├── index.html
│   ├── main.ts
│   ├── App.vue
│   ├── components/            # GraphCanvas, NodeInspector, DiagnosticsPanel
│   ├── composables/           # useAuthoringData, useGraphLayout
│   ├── adapters/              # graphAdapter, csvAdapter
│   └── api/                   # authoringClient (load/validate/save)
│
├── src/
│   ├── main.ts                # Vue app entry point
│   ├── App.vue                # Root component (view routing, auto-save)
│   ├── style.css              # Global styles (Tailwind import, dark theme)
│   │
│   ├── components/
│   │   ├── MainMenu.vue       # Save-slot selection screen
│   │   ├── NarrativeView.vue  # Story text + choice handling
│   │   ├── CombatView.vue     # Turn-based combat UI
│   │   ├── ChoiceList.vue     # Filtered choice buttons
│   │   ├── PlayerHud.vue      # HP, gold, weapon, stats display
│   │   └── PlaytestPanel.vue  # DEV-only QA panel (teleport, state mutation)
│   │
│   ├── composables/
│   │   └── useCombat.ts       # Combat logic (attack rolls, turns, resolution)
│   │
│   ├── data/                  # Auto-generated — do not edit manually
│   │   ├── nodes.ts
│   │   ├── items.ts
│   │   ├── enemies.ts
│   │   └── encounters.ts
│   │
│   ├── engine/
│   │   ├── actionResolver.ts  # Executes story actions on the player store
│   │   └── visibilityResolver.ts  # Determines which choices are visible
│   │
│   ├── stores/
│   │   └── playerStore.ts     # Pinia store (player state, game actions)
│   │
│   ├── types/
│   │   ├── story.ts           # StoryNode, Choice, Action, Visibility types
│   │   ├── combat.ts          # Enemy, Encounter, CombatState types
│   │   ├── items.ts           # ItemTemplate type
│   │   └── player.ts          # PlayerState, Vitals, Inventory types
│   │
│   └── utils/
│       ├── dice.ts            # Dice notation parser and roller (e.g. "1d20+2")
│       └── storage.ts         # localStorage save/load with debouncing
│
├── android/                   # Capacitor Android project
├── ios/                       # Capacitor iOS project
├── screenshots/               # App screenshots
│
├── package.json
├── vite.config.ts
├── capacitor.config.ts
├── tailwind.config.js
├── tsconfig.json
└── tsconfig.app.json
```

## How to Author Content

### Adding a new story node

1. Open `data/csv/nodes.csv` in a spreadsheet editor or text editor.
2. Add a new row with a unique `id` (e.g., `n_tavern`), a `type` (`encounter`, `narrative`, or `ending`), and `text` for the narrative.
3. Define up to 3 choices per node using the `choice1_*`, `choice2_*`, `choice3_*` column groups.
4. Run `npm run build:data` to regenerate `src/data/nodes.ts`.
5. The game will now include the new node. Link to it from other nodes via `navigate:n_tavern`.

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

## Technology Stack

| Layer          | Technology                      | Purpose                                  |
| -------------- | ------------------------------- | ---------------------------------------- |
| Framework      | Vue 3 (Composition API)         | Reactive UI components                   |
| Language       | TypeScript (strict mode)        | Type safety across the entire codebase   |
| State          | Pinia                           | Centralized player state management      |
| Styling        | Tailwind CSS v4                 | Utility-first dark-themed UI             |
| Bundler        | Vite 7                          | Fast HMR in dev, optimized production    |
| Data Pipeline  | PapaParse + Node.js script      | CSV-to-TypeScript code generation        |
| Mobile         | Capacitor (Android + iOS)       | Native mobile wrappers for the web app   |
| Persistence    | localStorage (+ Firebase when Phase 5 enabled) | Client-side save/load; cloud sync via Firestore when configured |
