# Features and Capabilities

A comprehensive reference for every feature in the Interactive Novel Framework, organized by system. Each section explains what the feature does, how it works internally, and how a content author or developer would use it.

---

## Table of Contents

- [1. Story System](#1-story-system)
  - [1.1 Story Nodes](#11-story-nodes)
  - [1.2 Player Choices](#12-player-choices)
  - [1.3 Choice Mechanics](#13-choice-mechanics)
  - [1.4 On-Enter Actions](#14-on-enter-actions)
  - [1.5 Visibility Requirements](#15-visibility-requirements)
- [2. Combat System](#2-combat-system)
  - [2.1 Turn-Based Flow](#21-turn-based-flow)
  - [2.2 Attack Resolution](#22-attack-resolution)
  - [2.3 Enemy Spawning](#23-enemy-spawning)
  - [2.4 Combat Resolution and Branching](#24-combat-resolution-and-branching)
  - [2.5 Combat Log](#25-combat-log)
- [3. Item System](#3-item-system)
  - [3.1 Item Types](#31-item-types)
  - [3.2 Weapon Stats](#32-weapon-stats)
  - [3.3 Consumables](#33-consumables)
  - [3.4 Tools](#34-tools)
- [4. Player State](#4-player-state)
  - [4.1 Vitals (HP)](#41-vitals-hp)
  - [4.2 Currency](#42-currency)
  - [4.3 Inventory](#43-inventory)
  - [4.4 Equipment](#44-equipment)
  - [4.5 Flags](#45-flags)
- [5. Dice System](#5-dice-system)
- [6. Save / Load System](#6-save--load-system)
  - [6.1 Save Slots](#61-save-slots)
  - [6.2 Auto-Save](#62-auto-save)
  - [6.3 Save and Quit](#63-save-and-quit)
  - [6.4 Delete Save](#64-delete-save)
- [7. Data Pipeline](#7-data-pipeline)
  - [7.1 CSV Authoring](#71-csv-authoring)
  - [7.2 Build Script](#72-build-script)
  - [7.3 Pipe-Delimited Syntax](#73-pipe-delimited-syntax)
- [8. UI and Presentation](#8-ui-and-presentation)
  - [8.1 Main Menu](#81-main-menu)
  - [8.2 Narrative View](#82-narrative-view)
  - [8.3 Combat View](#83-combat-view)
  - [8.4 Player HUD](#84-player-hud)
  - [8.5 Dark Theme](#85-dark-theme)
- [9. Engine Layer](#9-engine-layer)
  - [9.1 Action Resolver](#91-action-resolver)
  - [9.2 Visibility Resolver](#92-visibility-resolver)
- [10. Cross-Platform Support](#10-cross-platform-support)

---

## 1. Story System

### 1.1 Story Nodes

Every screen of narrative content is a **StoryNode**. Each node has:

| Field     | Type                       | Purpose                                         |
| --------- | -------------------------- | ----------------------------------------------- |
| `id`      | `string`                   | Unique identifier (e.g., `n_market`)             |
| `type`    | `narrative \| encounter \| ending` | Categorizes the node for potential future use |
| `text`    | `string`                   | The narrative paragraph shown to the player      |
| `onEnter` | `ActionPayload[]`          | Actions executed when the player arrives         |
| `choices` | `Choice[]`                 | Up to 3 choices the player can select            |

Nodes are stored in a flat `Record<string, StoryNode>` dictionary, enabling O(1) lookups by ID. The current demo story ("The Cellar Debt") includes 16 nodes forming a branching narrative graph.

### 1.2 Player Choices

Each choice on a story node contains:

- **`id`** — Unique choice identifier within the node.
- **`label`** — Button text displayed to the player (e.g., `[Visit the Black Market]`).
- **`mechanic`** — What happens when the choice is selected (see 1.3).
- **`visibilityRequirements`** — Optional conditions that must all be true for the choice to appear (see 1.5).

### 1.3 Choice Mechanics

Three types of mechanics define what a choice does:

**Navigate** — Moves the player to another story node.
```
{ type: "navigate", nextNodeId: "n_market" }
```

**Combat Init** — Transitions the game from narrative mode to combat mode, loading a specific encounter.
```
{ type: "combat_init", encounterId: "combat_alley_thug" }
```

**Skill Check** — Rolls dice against a difficulty class (DC). On success, navigates to one node; on failure, navigates to another or optionally starts a combat encounter.
```
{ type: "skill_check", dice: "1d20+2", dc: 12,
  onSuccess: { nextNodeId: "n_safehouse_hall" },
  onFailure: { nextNodeId: "combat_alley_thug" } }
```

When a skill check fires, the result is displayed to the player in a summary panel showing the roll breakdown (e.g., `Roll 1d20+2: [14] +2 = 16 vs DC 12`).

### 1.4 On-Enter Actions

Actions that fire automatically when the player arrives at a node. These are processed exactly once per node visit per game session (tracked by a `processedNodes` set). Available action types:

| Action             | Parameters           | Effect                              |
| ------------------ | -------------------- | ----------------------------------- |
| `set_flag`         | `key`, `value`       | Sets a boolean flag on the player   |
| `adjust_hp`        | `amount`             | Adds/subtracts HP (floor of 0)      |
| `add_item`         | `itemId`, `qty`      | Adds item(s) to inventory           |
| `remove_item`      | `itemId`, `qty`      | Removes item(s); deletes key at 0   |
| `adjust_currency`  | `amount`             | Adds/subtracts gold (floor of 0)    |

### 1.5 Visibility Requirements

Choices can be hidden or shown based on the player's current state. All requirements in the array must be satisfied (AND logic):

| Requirement  | Parameters                      | Example                          | Meaning                            |
| ------------ | ------------------------------- | -------------------------------- | ---------------------------------- |
| `has_flag`   | `key`                           | `has_flag:robbed_armory`         | Flag must be truthy                |
| `has_item`   | `itemId`                        | `has_item:smoke_bomb`            | Player must own at least 1         |
| `stat_check` | `stat`, `operator`, `value`     | `stat_check:currency:>=:15`      | Numeric comparison on HP or gold   |

Supported stats for `stat_check`: `hpCurrent`, `currency`.
Supported operators: `>=`, `<=`, `>`, `<`, `==`.

---

## 2. Combat System

### 2.1 Turn-Based Flow

Combat alternates between player and enemy turns:

1. **Player Turn** — The player clicks an enemy to attack.
2. **Enemy Turn** — After a 300ms delay, all living enemies attack the player sequentially.
3. Repeat until all enemies are dead (victory) or the player's HP reaches 0 (defeat).

Rounds are tracked and displayed. The turn state prevents the player from attacking during the enemy phase.

### 2.2 Attack Resolution

Both player and enemy attacks follow the same D&D-inspired formula:

1. **Roll to hit**: `1d20 + attackBonus` vs target's AC.
2. If the roll **meets or exceeds** the AC, the attack hits.
3. **Damage roll**: The attacker's damage dice are rolled (e.g., `1d6`), and the result is subtracted from the target's HP.
4. HP is floored at 0.

The player's attack bonus and damage are derived from their equipped weapon. Enemies use their template stats.

### 2.3 Enemy Spawning

When combat starts, the encounter definition specifies which enemies to spawn:

```
enemies: [{ enemyId: "silk_thug", count: 1 }]
```

Each spawn creates runtime `CombatEnemyState` instances from the `EnemyTemplate`, with unique IDs and display names. Multiple enemies of the same type are numbered (e.g., "Silk Mask Thug 1", "Silk Mask Thug 2").

### 2.4 Combat Resolution and Branching

Each encounter defines two outcomes:

- **`onVictory`** — The story node to navigate to when all enemies are defeated.
- **`onDefeat`** — The story node to navigate to when the player's HP reaches 0.

This allows combat results to branch the narrative (e.g., victory leads to loot, defeat leads to a game-over screen).

### 2.5 Combat Log

Every attack (hit or miss) is logged with descriptive text. The combat log scrolls in real time, providing a play-by-play of the fight:

```
Combat begins.
You hit Silk Mask Thug for 4 damage.
Silk Mask Thug misses you.
You hit Silk Mask Thug for 3 damage.
```

---

## 3. Item System

### 3.1 Item Types

Items are categorized into three types:

| Type         | Purpose                                              |
| ------------ | ---------------------------------------------------- |
| `weapon`     | Can be equipped; provides damage dice and bonuses    |
| `consumable` | Has an `effect` action payload (e.g., healing)       |
| `tool`       | Utility items that unlock choices via visibility      |

### 3.2 Weapon Stats

Weapons define:

- **`damage`** — Dice notation string (e.g., `1d4` for an Iron Dagger, `1d6` for the Blade of Shadows).
- **`attackBonus`** — Added to the d20 hit roll.
- **`acBonus`** — Added to the player's base AC of 10.

Current weapons in the demo:

| Weapon           | Damage | Atk Bonus | AC Bonus |
| ---------------- | ------ | --------- | -------- |
| Iron Dagger      | 1d4    | +0        | +0       |
| Blade of Shadows | 1d6    | +1        | +0       |

### 3.3 Consumables

Consumables have an `effect` field containing an action payload. For example, the Health Potion effect is `heal:2d4+2`, which maps to the `adjust_hp` action with a dice-rolled amount.

### 3.4 Tools

Tools have no combat stats but serve as keys for story progression. Examples:

- **Smoke Bomb** — Unlocks the "[Throw Smoke Bomb]" choice at the safehouse.
- **Silk Mask Cloak** — Unlocks the "[Knock wearing Cloak]" choice at the boss's office door.

---

## 4. Player State

All mutable player data is centralized in the Pinia store:

### 4.1 Vitals (HP)

- **`hpCurrent`** — The player's current hit points. Starts at 20. Floored at 0 on damage. When HP reaches 0 during combat, the encounter resolves as a defeat.

### 4.2 Currency

- **`currency`** — Gold coins. Starts at 10 (plus 25 from the opening node's `onEnter`). Used to purchase items at the market. Floored at 0.

### 4.3 Inventory

- **`items`** — A `Record<string, number>` mapping item IDs to quantities. Items are added via `add_item` actions and removed via `remove_item`. When an item's quantity reaches 0, the key is deleted from the record.

Default starting inventory: 1 lockpick.

### 4.4 Equipment

- **`mainHand`** — The currently equipped weapon's item ID (or `null` for unarmed). Defaults to `dagger_iron`. The equipped weapon determines the player's damage, attack bonus, and AC bonus in combat.

### 4.5 Flags

- **`flags`** — A `Record<string, boolean>` for tracking story state. Flags are set via `set_flag` actions and queried by `has_flag` visibility requirements.

Examples in the demo: `robbed_armory`, `has_surprise`, `met_goblin`.

---

## 5. Dice System

The `rollDice()` utility supports standard tabletop dice notation:

| Input      | Meaning                           |
| ---------- | --------------------------------- |
| `1d20`     | Roll one 20-sided die             |
| `1d20+2`   | Roll one d20 and add 2            |
| `2d6+3`    | Roll two d6 and add 3             |
| `1d4`      | Roll one 4-sided die              |
| `5`        | Flat integer (returns 5 directly) |

The function returns a `DiceResult` object:
- **`rolls`** — Array of individual die results.
- **`modifier`** — The +/- modifier value.
- **`total`** — Sum of all rolls plus the modifier.

Invalid notation gracefully falls back to 0 with a console warning.

---

## 6. Save / Load System

### 6.1 Save Slots

The game provides **3 independent save slots** (`save_slot_1`, `save_slot_2`, `save_slot_3`). Each slot stores a complete snapshot of the player state serialized to localStorage as JSON.

On the main menu, each slot shows:
- Whether it is **Occupied** or **Empty**.
- If occupied: the current node ID and remaining HP.
- Actions: **Continue** (if occupied), **New Game** (if empty), **Delete** (if occupied).

### 6.2 Auto-Save

The game auto-saves whenever the player state changes. This is implemented via a Pinia `$subscribe` watcher in `App.vue` that calls a **debounced** save function (500ms delay). This prevents excessive writes during rapid state changes like combat.

### 6.3 Save and Quit

Clicking "Save and Quit" performs an **immediate** (non-debounced) save and returns the player to the main menu. This ensures no state is lost.

### 6.4 Delete Save

Save deletion requires **two-click confirmation**:
1. Click "Delete" — the button changes to "Confirm Delete" with a "Cancel" button.
2. Click "Confirm Delete" — the slot is cleared from localStorage.

---

## 7. Data Pipeline

### 7.1 CSV Authoring

Content authors work with four spreadsheet files in `data/csv/`. This approach allows:

- Editing in Excel, Google Sheets, or any text editor.
- Version control diffs that are human-readable.
- Non-programmer-friendly content authoring.
- Batch edits across many nodes at once.

### 7.2 Build Script

`scripts/build-data.js` is a Node.js script that:

1. Reads each CSV file using PapaParse with `header: true`.
2. Parses domain-specific syntax (colon-separated tokens, pipe-delimited lists).
3. Validates and transforms data (handles missing fields, type coercion).
4. Generates TypeScript source files with proper `import type` statements and `Record<string, T>` exports.
5. Logs the number of entries written per file.

Warnings are emitted for rows with missing IDs but the build continues (fault-tolerant).

### 7.3 Pipe-Delimited Syntax

Within CSV cells, multiple values are separated by `|` (pipe). Within each token, fields are separated by `:` (colon).

Examples:
- `adjust_currency:-15 | add_item:smoke_bomb:1` — Two on-enter actions.
- `silk_thug:1 | silk_thug:1` — Two enemies in an encounter.
- `has_item:smoke_bomb | has_flag:entered_market` — Two visibility requirements (AND).

---

## 8. UI and Presentation

### 8.1 Main Menu

The entry screen for the game, displaying:
- The game title "The Cellar Debt".
- Three save slot cards showing slot status.
- Action buttons per slot: Continue / New Game / Delete.
- Delete confirmation workflow.

### 8.2 Narrative View

The primary gameplay screen, showing:
- The current story node's narrative text.
- A skill check result panel (when a dice roll was just made).
- Filtered choice buttons (only showing choices that pass visibility checks).

### 8.3 Combat View

A dedicated combat interface featuring:
- Round counter.
- Player HP display.
- Enemy buttons showing name and current HP (disabled when dead or during enemy turn).
- A scrolling combat log.
- Red-themed border to visually distinguish from narrative mode.

### 8.4 Player HUD

A persistent stats panel during gameplay showing:
- Current HP.
- Gold amount.
- Equipped weapon name (or "Unarmed").
- Total attack bonus.
- Lockpick count.
- Total number of active flags.

### 8.5 Dark Theme

The entire UI uses a dark slate color scheme (`slate-900` backgrounds, `slate-100` text) with:
- Inter font family as the primary typeface.
- Tailwind CSS utility classes for consistent spacing and responsive layout.
- Max-width container (`max-w-3xl`) for readable line lengths.
- Minimum viewport width of 320px for mobile compatibility.

---

## 9. Engine Layer

### 9.1 Action Resolver

The `resolveAction()` function is a dispatcher that maps `ActionPayload` objects to Pinia store mutations:

| Payload Action     | Store Method Called   |
| ------------------ | -------------------- |
| `set_flag`         | `store.setFlag()`    |
| `adjust_hp`        | `store.adjustHp()`   |
| `add_item`         | `store.addItem()`    |
| `remove_item`      | `store.removeItem()` |
| `adjust_currency`  | `store.adjustCurrency()` |

Each case validates the payload shape before executing, preventing runtime errors from malformed data.

### 9.2 Visibility Resolver

The `isChoiceVisible()` function evaluates an array of `VisibilityRequirement` objects against the current player state:

- Returns `true` if requirements are undefined or empty (always visible).
- Uses `Array.every()` — all requirements must pass (AND logic).
- Supports three check types: `has_flag`, `has_item`, `stat_check`.
- The `stat_check` type supports comparisons on `hpCurrent` and `currency` using standard operators.

---

## 10. Cross-Platform Support

### Web

The primary platform. The app runs in any modern browser. Vite handles bundling, tree-shaking, and code splitting for optimal load times.

### Android

A full Android project is scaffolded under `android/` via Capacitor. The app ID is `com.cellardebt.game`. The web build is synced into the Android WebView shell. Standard Android resources (icons, splash screens, manifests) are pre-configured.

### iOS

An iOS project exists under `ios/` with Xcode project files, a `Podfile` for CocoaPods dependencies, and standard asset catalogs. The same web build is loaded into a WKWebView.

### Responsive Design

The UI is built with Tailwind's responsive utilities and a flexible layout that works from 320px mobile screens up to desktop widths, with a `max-w-3xl` content column for readability.
