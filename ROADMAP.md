# Roadmap — Incremental Extension Plan

A phased plan for extending the Interactive Novel Framework. Each phase builds on the previous one, keeping every increment shippable. Phases are ordered by impact-to-effort ratio, with foundational improvements first and ambitious features later.

---

## Table of Contents

- [Phase 1: Strengthen the Core](#phase-1-strengthen-the-core)
- [Phase 2: Richer Gameplay Systems](#phase-2-richer-gameplay-systems)
- [Phase 3: Content Authoring Tooling](#phase-3-content-authoring-tooling)
- [Phase 4: Polish and Presentation](#phase-4-polish-and-presentation)
- [Phase 5: Multiplayer and Social](#phase-5-multiplayer-and-social)
- [Phase 6: Platform and Distribution](#phase-6-platform-and-distribution)

---

## Phase 1: Strengthen the Core

Low-risk improvements to reliability, developer experience, and the foundational architecture. Every item here makes all future work easier.

### 1.1 Unit and Integration Tests

**What**: Add Vitest for unit testing the engine layer, composables, and store.

**Why**: The action resolver, visibility resolver, dice roller, and combat composable are pure or near-pure functions — ideal test candidates. Tests catch regressions as features are added.

**Scope**:
- Unit tests for `rollDice()` (mocked randomness), `resolveAction()`, `isChoiceVisible()`.
- Integration tests for `useCombat()` covering init, attack, enemy turn, victory, defeat.
- Store tests for `playerStore` mutations and edge cases (HP floor at 0, currency floor, item deletion at 0 qty).
- CSV build script tests verifying parsing of edge-case tokens.

### 1.2 Data Validation Layer

**What**: Add runtime validation when the build script generates data, catching broken references before they reach the app.

**Why**: Currently, a typo in a node ID (e.g., `navigate:n_markt` instead of `n_market`) silently creates a dead link. Catching this at build time saves debugging time.

**Scope**:
- Validate that all `nextNodeId` references in choices point to existing node IDs.
- Validate that all `encounterId` references point to existing encounter IDs.
- Validate that all `itemId` references in actions and visibility requirements point to existing item IDs.
- Validate that all `enemyId` references in encounters point to existing enemy IDs.
- Emit errors or warnings with row numbers and file names.

### 1.3 Configurable Game Constants

**What**: Extract hardcoded values (starting HP, starting gold, starting items, base AC, max save slots) into a `config.ts` file.

**Why**: Currently, default values are scattered across `playerStore.ts` (HP 20, currency 10, dagger_iron) and `CombatView.vue` (base AC 10). Centralizing them makes the framework more reusable for different stories.

**Scope**:
- Create `src/config.ts` with all tunable constants.
- Import the config in the store and combat systems.
- Optionally allow a CSV-based or JSON config file in the data pipeline.

### 1.4 Error Boundary and Missing Node Handling

**What**: Gracefully handle missing nodes, missing encounters, and invalid data at runtime.

**Why**: The narrative view shows a red "Missing node" message, but there is no recovery path. A fallback that routes the player back to a safe node (or the main menu) would prevent dead-end states.

**Scope**:
- Add a Vue error boundary component wrapping the game view.
- Provide a "Return to Menu" button when a missing node or encounter is detected.
- Log the error context for debugging.

---

## Phase 2: Richer Gameplay Systems

Extensions to combat, inventory, and player progression that add depth without changing the core architecture.

### 2.1 Player Attributes and Skill Modifiers

**What**: Add a player attributes system (e.g., Strength, Dexterity, Intelligence) that modify skill checks and combat.

**Why**: Currently, skill check modifiers are hardcoded per choice in the CSV (e.g., `1d20+2`). Attributes would let the modifier derive from the player's stats, making character builds meaningful.

**Scope**:
- Add `attributes: Record<string, number>` to `PlayerState`.
- Extend the skill check mechanic to reference an attribute (e.g., `skill_check:dexterity:12:n_success:n_fail`).
- Modify the dice roller to apply the attribute modifier.
- Add attribute display to the Player HUD.

### 2.2 Consumable Item Usage in Combat

**What**: Allow players to use consumable items (e.g., Health Potions) during their combat turn.

**Why**: The Health Potion item exists in the data but has no in-game use mechanism. Players should be able to choose between attacking and using a consumable.

**Scope**:
- Add a "Use Item" panel to `CombatView.vue` listing usable consumables.
- Execute the item's `effect` action payload when used (e.g., `adjust_hp` with the potion's dice roll).
- Decrement item quantity after use.
- Using an item consumes the player's turn.

### 2.3 Equipment Management UI

**What**: Add an inventory and equipment screen where players can view items, equip weapons, and use consumables outside of combat.

**Why**: Currently, the player starts with an Iron Dagger and picks up the Blade of Shadows, but there is no UI to swap between them. The `equipItem()` action exists in the store but is never called.

**Scope**:
- Create an `InventoryView.vue` component accessible from the game header.
- List all owned items with names, types, and quantities.
- Allow equipping weapons to the `mainHand` slot.
- Allow using consumables from the inventory.

### 2.4 Multi-Enemy Targeting and AoE

**What**: Support area-of-effect attacks and targeted abilities in combat.

**Why**: The current combat system only supports single-target attacks. Adding AoE opens up design space for items like the Smoke Bomb to have combat effects.

**Scope**:
- Add an `aoe` flag to weapon/item effects.
- Modify `playerAttack()` to apply damage to all enemies when AoE is active.
- Add a "target selection" vs "use AoE" UI toggle.

### 2.5 Experience Points and Leveling

**What**: Award XP for combat victories and story milestones. Level up to increase HP, unlock attributes, or gain new abilities.

**Why**: The enemy CSV already has an `xpReward` column that is parsed but not used. A progression system adds long-term engagement.

**Scope**:
- Add `xp`, `level`, and `xpToNextLevel` to `PlayerState`.
- Award XP from the encounter's enemy templates on victory.
- Define level-up thresholds and rewards (HP increase, attribute points).
- Add level-up notification UI.

### 2.6 Initiative and Turn Order

**What**: Roll initiative at the start of combat to determine who goes first.

**Why**: Currently, the player always acts first. Adding initiative creates variance and strategic depth, especially when the `has_surprise` flag could grant advantage.

**Scope**:
- Roll `1d20 + dexterity` for the player and each enemy at combat start.
- Sort by initiative to determine turn order.
- If the player has the `has_surprise` flag, give +10 to their initiative roll.
- Display the turn order in the combat UI.

---

## Phase 3: Content Authoring Tooling

Tools that make it easier to create, validate, and visualize stories.

### 3.1 Visual Node Graph Editor

**What**: A browser-based tool that renders the story as an interactive graph. Nodes are boxes, choices are edges.

**Why**: As stories grow beyond 20-30 nodes, understanding the flow from CSV becomes difficult. A visual editor shows the full picture and lets authors drag, connect, and edit nodes.

**Scope**:
- Build as a separate Vue route or standalone app.
- Parse `nodes.ts` (or the CSV) and render with a graph library (e.g., Cytoscape.js or vis-network).
- Color-code nodes by type and highlight dead-end or orphan nodes.
- Click to edit node text, choices, and actions inline.
- Export back to CSV.

### 3.2 CSV Linter CLI

**What**: A command-line tool that validates CSV files for common errors.

**Why**: The build script is lenient — it skips bad rows silently. A dedicated linter would surface all issues upfront.

**Scope**:
- Check for duplicate IDs.
- Check for orphan nodes (no incoming edges).
- Check for dead-end nodes (no outgoing choices).
- Validate all cross-references (node IDs, item IDs, enemy IDs, encounter IDs).
- Validate mechanic syntax and action syntax.
- Run as `npm run lint:data`.

### 3.3 Hot-Reload for CSV Data

**What**: Watch CSV files and auto-regenerate TypeScript data during development.

**Why**: Currently, authors must manually run `npm run build:data` after every CSV change. A watcher would provide an instant feedback loop.

**Scope**:
- Add a `chokidar` file watcher to the build script.
- Run as `npm run dev:data` alongside `npm run dev`.
- Alternatively, write a Vite plugin that triggers the build script on CSV changes.

### 3.4 Story Playtest Mode

**What**: A debug mode that shows node IDs, available flags, inventory contents, and allows teleporting to any node.

**Why**: Authors and QA testers need to quickly navigate the story graph to verify content without playing through the entire game.

**Scope**:
- Add a collapsible debug panel toggled by a keyboard shortcut.
- Display all node IDs as clickable links.
- Show the full player state in real time.
- Allow setting/clearing flags and adding/removing items manually.

---

## Phase 4: Polish and Presentation

Visual and UX improvements that make the game feel complete.

### 4.1 Transition Animations

**What**: Add enter/leave transitions between story nodes and between narrative/combat modes.

**Why**: Abrupt view switches feel jarring. Vue's `<Transition>` component makes this straightforward.

**Scope**:
- Fade-in for narrative text.
- Slide-in for choice buttons.
- Cross-fade between narrative and combat modes.
- Victory/defeat screen with a brief animation.

### 4.2 Sound Effects and Music

**What**: Add ambient background music and sound effects for dice rolls, combat hits, and UI interactions.

**Why**: Audio dramatically increases immersion in interactive fiction.

**Scope**:
- Use the Web Audio API or Howler.js.
- Add sound triggers in the combat composable (hit, miss, victory, defeat).
- Add a dice roll sound in the narrative view.
- Add ambient music tracks per node type (exploration, combat, menu).
- Include a mute/volume toggle in the UI.

### 4.3 Typewriter Text Effect

**What**: Reveal narrative text character by character, like a typewriter.

**Why**: This is a classic interactive fiction presentation technique that builds suspense and improves readability for long passages.

**Scope**:
- Create a `TypewriterText.vue` component.
- Configurable speed (characters per second).
- Click-to-skip functionality for impatient players.
- Use in `NarrativeView.vue` for the main text block.

### 4.4 Node Illustrations

**What**: Support optional images per story node, displayed above or beside the narrative text.

**Why**: Visual storytelling through illustrations, maps, or character portraits adds depth.

**Scope**:
- Add an optional `image` field to `StoryNode` and the CSV schema.
- Store images in `public/images/` or as imported assets.
- Display responsively in `NarrativeView.vue`.

### 4.5 Accessibility Improvements

**What**: Ensure the game is fully accessible via keyboard navigation and screen readers.

**Why**: Interactive fiction is inherently text-based and should be among the most accessible game genres.

**Scope**:
- Add ARIA labels to all interactive elements.
- Ensure proper focus management when views switch.
- Add keyboard shortcuts for common actions (1/2/3 for choices).
- Ensure sufficient color contrast (already strong with the dark theme).
- Add a high-contrast mode option.

---

## Phase 5: Multiplayer and Social

Features that extend the game beyond a single-player experience.

### 5.1 Cloud Save Sync

**What**: Replace or supplement localStorage with a cloud backend for save persistence across devices.

**Why**: localStorage is per-browser and per-device. Cloud saves let players continue on their phone after playing on desktop.

**Scope**:
- Add a lightweight backend (e.g., Firebase, Supabase, or a custom API).
- Implement user authentication (email/password or OAuth).
- Sync save slots to the cloud with conflict resolution (latest-write-wins or manual merge).
- Keep localStorage as an offline fallback.

### 5.2 Shared Story Outcomes

**What**: After completing the story, show aggregate statistics: "42% of players chose to sneak past the guard."

**Why**: This "Telltale Games"-style feature adds replayability and social connection.

**Scope**:
- Log choice selections to a backend analytics service.
- Display percentages on a post-game summary screen.
- Aggregate across all players, anonymized.

### 5.3 Community Story Sharing

**What**: Allow players to share custom stories as importable CSV packs.

**Why**: User-generated content dramatically extends the lifespan of the framework.

**Scope**:
- Define a story package format (ZIP with CSV files + assets).
- Build an import/export UI.
- Validate imported packages against the data schema.
- Optional: a community hub for browsing and rating stories.

---

## Phase 6: Platform and Distribution

Making the game available to wider audiences.

### 6.1 PWA Support

**What**: Add a service worker and web app manifest for Progressive Web App capabilities.

**Why**: PWA support enables offline play and an "Add to Home Screen" experience on mobile browsers without requiring a native app store listing.

**Scope**:
- Add `vite-plugin-pwa` with a service worker for offline caching.
- Create a `manifest.json` with app name, icons, and theme color.
- Cache all static assets and the game data for offline play.
- localStorage already works offline, so saves are unaffected.

### 6.2 Electron Desktop Build

**What**: Package the web app as a native desktop application using Electron or Tauri.

**Why**: Some players prefer standalone desktop apps, and it opens distribution on platforms like Steam or itch.io.

**Scope**:
- Add Electron (heavier, broader compatibility) or Tauri (lighter, Rust-based) integration.
- Handle window management, menus, and auto-updates.
- Use the filesystem instead of localStorage for save data.

### 6.3 App Store Releases

**What**: Publish the Capacitor-wrapped app to the Google Play Store and Apple App Store.

**Why**: The Android and iOS projects already exist but are not production-ready.

**Scope**:
- Design proper app icons and splash screens.
- Configure signing certificates for both platforms.
- Set up CI/CD for automated mobile builds (e.g., GitHub Actions with Fastlane).
- Write store listing metadata (description, screenshots, categories).
- Handle app review requirements and content ratings.

### 6.4 Internationalization (i18n)

**What**: Support multiple languages for both the UI chrome and story content.

**Why**: Interactive fiction has a global audience. Translated content expands reach significantly.

**Scope**:
- Add `vue-i18n` for UI string localization.
- Extend the CSV schema to support per-language text columns (e.g., `text_en`, `text_es`) or separate CSV sets per locale.
- Add a language selector to the main menu.
- Handle right-to-left (RTL) languages in the layout.

### 6.5 Analytics and Telemetry

**What**: Add opt-in analytics to understand player behavior, drop-off points, and popular paths.

**Why**: Data-driven insight helps content authors improve their stories and identifies UX pain points.

**Scope**:
- Integrate a privacy-respecting analytics service (e.g., Plausible, Umami).
- Track node visits, choice selections, combat outcomes, and session duration.
- Provide a dashboard for content authors.
- Ensure GDPR compliance with proper consent flows.

---

## Priority Matrix

A summary view for planning sprints or releases:

| Priority | Item                          | Effort   | Impact   | Phase |
| -------- | ----------------------------- | -------- | -------- | ----- |
| P0       | Unit and integration tests    | Medium   | High     | 1     |
| P0       | Data validation layer         | Low      | High     | 1     |
| P0       | Configurable game constants   | Low      | Medium   | 1     |
| P1       | Consumable usage in combat    | Low      | High     | 2     |
| P1       | Equipment management UI       | Medium   | High     | 2     |
| P1       | Hot-reload for CSV data       | Low      | Medium   | 3     |
| P1       | CSV linter CLI                | Medium   | Medium   | 3     |
| P1       | Error boundary handling       | Low      | Medium   | 1     |
| P2       | Player attributes / skills    | Medium   | High     | 2     |
| P2       | XP and leveling               | Medium   | Medium   | 2     |
| P2       | Transition animations         | Low      | Medium   | 4     |
| P2       | Typewriter text effect        | Low      | Medium   | 4     |
| P2       | Story playtest mode           | Medium   | Medium   | 3     |
| P3       | Visual node graph editor      | High     | High     | 3     |
| P3       | Sound effects and music       | Medium   | High     | 4     |
| P3       | Node illustrations            | Low      | Medium   | 4     |
| P3       | PWA support                   | Low      | Medium   | 6     |
| P3       | Accessibility improvements    | Medium   | Medium   | 4     |
| P4       | Initiative and turn order     | Low      | Low      | 2     |
| P4       | Multi-enemy AoE               | Medium   | Low      | 2     |
| P4       | Cloud save sync               | High     | Medium   | 5     |
| P4       | Shared story outcomes         | Medium   | Low      | 5     |
| P4       | Community story sharing       | High     | Medium   | 5     |
| P4       | Electron / Tauri desktop      | Medium   | Low      | 6     |
| P4       | App store releases            | High     | Medium   | 6     |
| P4       | Internationalization          | High     | Medium   | 6     |
| P4       | Analytics and telemetry       | Medium   | Low      | 6     |
