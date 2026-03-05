# NARRATIVE ARCHITECTURE — Equivalent Ashes Universe

This document is the canonical specification for how all interactive stories in this universe are structured. It governs every story brief, every node authored, and every branching decision made. Any story element that does not conform to these rules is a design error.

All stories reference this document. Story-specific briefs (`EQUIVALENT_ASHES_BRIEF.md`, `MAIN_STORY_BRIEF.md`) describe *what* is in a particular story; this document describes *how* all stories are built.

---

# PART I — THE FOUR-LAYER MODEL

Every story in this universe is built from four structural layers that operate simultaneously at different scales. They are not alternatives to each other. They are all active at once.

```
Layer 1: String of Pearls  →  controls WHICH beats are mandatory
Layer 2: Hub and Spoke     →  controls HOW the space between beats is structured
Layer 3: Stateful Graph    →  controls WHAT is available at each node based on history
Layer 4: Alternative Strings → controls WHICH narrative the player is living
```

A single node can participate in all four layers at once: it may be a mandatory pearl, function as a hub with multiple spokes, gate its options on accumulated state, and serve as the commitment point for an alternative string.

---

## Layer 1: String of Pearls — The Narrative Spine

### Definition

A **string of pearls** is an ordered sequence of mandatory narrative beats that every player passes through, regardless of choices made. These beats are called **pearls**. The string is the story's spine — the sequence of moments that carry its core argument. Without the string, the story has no shape.

### What Makes a Beat a Pearl

A beat is a pearl if and only if:
- The story's central argument requires it to be witnessed by every player, OR
- A later pearl depends on the player having passed through it

If a beat can be skipped without breaking the story's coherence or thematic logic, it is not a pearl. It belongs in a hub or a spoke.

### Multiple Strings

Every story has exactly one **main string** — the primary narrative spine. A story may also have several **alternative strings** — complete, self-contained narrative spines with their own pearls, their own arc, and their own closure. See Layer 4 for full specification.

When a player commits to an alternative string, the main string's pearls continue to pass in the world. The player simply is no longer there to witness them.

### String Rules

1. **Pearls cannot be reordered.** The sequence of a string is fixed and intentional. Its order is part of its argument.
2. **Pearls cannot be skipped by any branch.** Every path through the story, including all long branches and all state-gated routes, must converge on the next pearl before the story can continue.
3. **Pearls are not invisible.** Every pearl should feel to the player like a meaningful moment, even if they cannot identify it as structurally mandatory.
4. **The main string must be completable without any long branch content.** A player who explores nothing must still have a thematically complete experience.

---

## Layer 2: Hub and Spoke — Spatial Exploration

### Definition

Between pearls, the story space is structured as **hubs** and **spokes**. A hub is an open node from which multiple directions are available. Spokes are the routes that extend out from a hub and eventually return to it — or advance to the next pearl.

### Node Types Within This Layer

**Pearl node** — mandatory. Every player passes through it. May also function as a hub.

**Hub node** — an open node offering multiple directions. The player chooses how to spend their time in this space. Not all hubs are pearls, and not all pearls are hubs.

**Short spoke** — a branch that closes back to the originating hub or the next pearl within 1–3 nodes. Changes only tone, flavour, or minor resource state. Does not introduce new characters or substantially alter later content. Removable without breaking the story.

**Long spoke** — a branch that takes the player somewhere genuinely different for a sustained stretch before returning. Introduces characters, locations, or information not available on the main path. Must change something about how the player experiences the next pearl. Cannot be removed without making the world feel thin.

**Loss spoke** — a branch that leads to a loss condition: death, permanent incapacitation, or an outcome that ends the player's ability to affect the main story. A valid designed ending, not a punishment. See the non-negotiable rules for loss spoke requirements.

### Hub and Spoke Rules

1. **Every long spoke must have at least one guaranteed organic re-entry point** back to the main string before the next pearl. "Organic" means the re-entry is motivated by the fiction — an NPC, an event, a piece of information — not by a mechanical forced redirect.
2. **Long spokes must change something downstream.** A player returning from a long spoke must encounter a difference — in NPC disposition, available options, world state, or accessible information — compared to a player who stayed on the main path. If nothing changes, the spoke was empty and must be redesigned or cut.
3. **Long spokes must feel complete on their own terms.** A player who explores a long spoke and returns should feel like they experienced something real, not like they took a wrong turn.
4. **Loss spokes must have at least two exit opportunities** before the terminal node. These must be genuine choices — not "press here to not lose" prompts. The player should be able to see the warning and still choose to continue.
5. **Short spokes require no re-entry logic.** They simply end at the next pearl or hub.

### Design Tests

- **Short spoke test:** If this spoke were removed entirely, would the player miss anything that matters to the story or the world? If yes, it is a long spoke, not a short one. Reclassify it.
- **Long spoke test:** Does this spoke show the player something about the world they could not learn on the main path? Does their return visibly change what follows? Both must be true.
- **Loss spoke test:** Can the player reconstruct the chain of decisions that led to this loss? Is there a moment they can point to and say "that's where I went wrong"? If the loss feels arbitrary or unforeseeable, it is a design error.

---

## Layer 3: Stateful Graph — Conditional Choice

### Definition

Every node in the story is **state-aware**. What is available at a given node — which choices appear, what NPCs say, what options cost — depends on what the player has accumulated during their run. The same physical node can feel fundamentally different on two playthroughs because accumulated state shapes what is present.

This is not a replacement for the string and hub structures. It is the layer that makes them feel real.

### The Three State Layers

State is tracked across three domains, each serving a distinct narrative purpose:

**Flags (boolean)**
- Track whether specific events occurred or decisions were made
- Examples: `elara_met`, `pattern_discovered`, `kaelen_alerted`
- Used to gate choices that depend on relationship history or prior knowledge
- A flag should only be set when the player did something meaningful to earn it
- A flag should only gate a choice when that choice genuinely requires what the flag represents

**World Stats (numeric, 0–100)**
- Track the condition of the world and the protagonist across a run
- Represent accumulated consequence, not moment-to-moment events
- Stats must have narrative meaning — they are not abstract meters
- Each stat should clearly answer: "What does a high/low value of this stat mean for the story?"
- Stats gate options that are only possible given a particular world condition

**Inventory (item presence)**
- Track whether the player possesses specific objects
- Used to gate options that require a physical resource
- Items given to the player must eventually matter — if an item is never checked, it should not be given
- Items consumed in use are preferred over items that are merely held

### State Rules

1. **State must be earned before it gates content.** Do not check a flag the player had no meaningful opportunity to set. Do not gate a choice behind a stat the player had no way to influence. If the player could not have reasonably reached a required state, the gate is invisible punishment.
2. **Decorative state is prohibited.** A stat that changes but is never checked, a flag that is set but never read, an item that is given but never required — these are waste. Either gate content behind them or remove them.
3. **State changes must be legible.** When an action changes a world stat or sets a flag, the player should be able to understand what happened and why, in fictional terms. The world runs on equivalent exchange. So does the storytelling.
4. **State accumulates across the run, not just the current scene.** Choices made early in the story should be checkable at the end. A player's history must be present in the story's final moments.
5. **No stat check may appear at the final node without having been meaningfully influenceable throughout the story.** If stability determines the ending, stability must have been a visible concern since the beginning.

### Relationship Between State and Strings

State does not change which string a player is on. It changes what is available within that string. The string determines structure; state determines texture. The exception is Layer 4 (alternative strings), where accumulated state determines which strings become accessible at all.

---

## Layer 4: Alternative Strings — Parallel Lives

### Definition

An **alternative string** is a complete narrative spine — with its own pearls, its own arc, and its own closure — that exists in parallel to the main string. Alternative strings are not side quests. They are different lives the player could be living. Once a player commits to an alternative string, the main string continues in the world without them.

### Core Principle: Strings Are Grown, Not Offered

Alternative strings must **never** be presented as an explicit fork choice. The player is never offered a menu that says "choose your storyline." Instead, alternative strings emerge from accumulated behavior. A player who consistently engages with certain characters, pursues certain information, and makes choices reflecting certain values will find, at some point, that a node appears which only they can access. That node is the entry point to an alternative string. The player may not recognize it as such.

This mirrors how real-world divergence works: not at a crossroads, but through a hundred small decisions that add up.

### Components of an Alternative String

Every alternative string has four required components:

**1. Unlock Threshold**
A combination of flags, world stats, and/or inventory state that must be true before the string becomes accessible. This threshold is invisible to the player. It is earned, not found. The threshold should represent a pattern of behavior — consistent engagement with specific characters, repeated choices that reflect a particular set of values — not a single decision.

**2. Entry Node**
A single node that appears only when the unlock threshold is met. It is embedded naturally in a hub that the player is already visiting. It does not announce itself as a divergence. It looks like another choice. It is the first node of the alternative string.

The entry node must:
- Feel like a natural extension of what the player has been doing
- Not signal its structural significance
- Be completable without the player understanding they have entered a different string

**3. Commitment Point**
A node deeper in the alternative string, after which returning to the main string becomes impossible. Before the commitment point, the player can still drift back — the world of the main string remains accessible. After it, the main string's window closes. The commitment point is not marked. It is a natural consequence of choices made within the alternative string.

What closes the main string at the commitment point:
- A world stat crosses a threshold that makes the main string's resolution unreachable (time has passed, the situation has developed without Vael)
- A relationship flag that makes a key main string character unavailable
- A physical location or circumstance that makes return impractical within the fiction

**4. Closure**
Every alternative string must reach a definitive end. There are two types:

- **Hard closure (loss condition):** The alternative string ends badly. The player's run ends. This follows the same rules as any loss spoke: at least two exit opportunities before the terminal node, earned and reconstructable by the player.
- **Soft closure (alternative ending):** The alternative string reaches a satisfying resolution. This is not a loss — it is a different life. The player has committed to something and it concluded. The main story became unreachable, but what replaced it was real and complete. Soft closures must feel like endings, not consolation prizes.

### Alternative String Rules

1. **Alternative strings must be seeded before they diverge.** Characters who anchor alternative strings must appear in the main string, naturally, before their string becomes accessible. The player builds a relationship before knowing that relationship is a narrative thread. Minimum seeding: three appearances in main string or long spoke content before the unlock threshold can be reached.

2. **Only one alternative string can be active per run.** Once a player commits to an alternative string, all other alternative strings close. The player cannot hedge between multiple alternative lives.

3. **Alternative string content is non-load-bearing for the main string.** A player who completes the main string without triggering any alternative string must still have a complete, thematically satisfying experience. Alternative strings add depth and replayability — they do not carry essential story content.

4. **The main string continues in-world while the player is on an alternative string.** This must be reflected in the fiction. If the player eventually returns to main string territory (before the commitment point), the world has moved. NPCs reference events the player missed. World stats may have shifted without the player's input. The cost of exploration is legible.

5. **Soft closure endings must be complete and honorable.** A player who reaches a soft closure should feel like they played a different but equally valid game. The alternative string must resolve its own dramatic question. It does not need to resolve the main string's dramatic question — but it must resolve its own.

6. **The commitment point must be recognizable in retrospect, not in the moment.** A player at the commitment point should not see a warning. A player reflecting after the run should be able to identify exactly where they crossed the line. This is the equivalent exchange principle applied to narrative structure: the cost was paid, it was real, it was yours.

---

# PART II — HOW THE LAYERS INTERACT

The four layers are not independent. They operate on each other continuously.

**Layer 1 sets boundaries for Layer 2.** Every long spoke must converge on the next pearl before the story can continue. The string determines the destination; the hub-and-spoke structure determines the routes.

**Layer 3 determines what Layer 2 offers.** What choices are available at any hub — which spokes are open, which are gated, what NPCs say — is determined by accumulated state. The same hub visited by two players with different histories is a different experience.

**Layer 4 uses Layer 3 as its foundation.** Alternative strings become accessible through accumulated state (the unlock threshold). They close the main string through accumulated state (world stat thresholds, relationship flags at the commitment point). Layer 4 is built entirely on top of Layer 3.

**Layers 1–3 together produce the texture of a single run. Layer 4 produces replayability.** A player who completes the main string has experienced one combination of Layers 1–3. A player who replays and discovers an alternative string has experienced a different combination — and understood something different about the world.

---

# PART III — NON-NEGOTIABLE RULES

These rules apply to every node, every choice, every branch, in every story in this universe. They cannot be overridden by story-specific briefs. Any story element that violates them is a design error, regardless of how well it works narratively.

---

**Rule 1: No fake options.**
Every choice must produce a meaningfully different outcome. A choice that leads to the same result regardless of which option is selected is a lie to the player. Remove it or differentiate it. This includes choices that appear to offer different paths but converge immediately.

**Rule 2: No unearned gates.**
A choice may only be gated behind state that the player had a genuine opportunity to acquire. Do not check a flag the player had no reasonable path to set. Do not require a world stat the player could not have influenced. If a player cannot see a choice because of state they could not have reached, the gate is invisible punishment.

**Rule 3: Cost must be visible.**
Every action that carries real consequence — resource spent, time lost, relationship damaged, information foreclosed — must make that cost legible within the fiction. The world is built on equivalent exchange. The storytelling must operate by the same law. A player who pays a cost must be able to see what they paid and why.

**Rule 4: Decorative state is prohibited.**
Every flag set must eventually be read. Every world stat changed must eventually gate or modify something. Every item given must eventually be required or consumed. State that accumulates without affecting anything is noise. It degrades the player's trust that their choices matter.

**Rule 5: The main string is self-sufficient.**
The main string must be completable, coherent, and thematically satisfying without triggering any long spoke, alternative string, or hidden content. Long spokes, alternative strings, and state-gated extras add depth and replayability. They do not carry load-bearing story content.

**Rule 6: Loss conditions are run-level, not save-level.**
A loss ends the current run. It does not permanently damage a save file, lock content in future runs, or penalize the player across sessions. Every loss condition offers a restart.

**Rule 7: Alternative strings are grown, not offered.**
No alternative string may be triggered by an explicit fork choice. All alternative strings must emerge from accumulated behavior. The player must not be aware they are choosing a string — they are choosing to keep being the kind of person they have been.

**Rule 8: Commitment is permanent within a run.**
Once a player passes the commitment point of an alternative string, they cannot return to the main string in that run. This is not a punishment. It is the structural expression of equivalent exchange at the narrative level: you committed, the cost was real, the choice was yours.

**Rule 9: Every ending must be complete.**
Whether a run ends on the main string, an alternative string, or a loss condition, the player must arrive at a node that resolves the dramatic question of the string they were on. No ending may leave a player's current string unresolved. Incomplete endings are design errors.

**Rule 10: No string may require knowledge of another string to be understood.**
Every string — main, alternative, or loss — must be comprehensible and meaningful on its own terms. A player who discovers an alternative string on their first run must be able to understand and complete it without having first completed the main string. Replayability reveals depth; it does not unlock comprehension.

---

# PART IV — DESIGN CHECKLIST

Use this checklist when reviewing any node, branch, or string added to a story.

**For every choice:**
- [ ] Does this choice produce a meaningfully different outcome from all other options in this node?
- [ ] If it is gated by state, did the player have a genuine opportunity to acquire that state?
- [ ] Is the cost of this choice visible in the fiction?

**For every short spoke:**
- [ ] Can this spoke be removed without the player missing anything that matters?
- [ ] Does it return to the originating hub or the next pearl within 1–3 nodes?

**For every long spoke:**
- [ ] Does it show the player something unavailable on the main path?
- [ ] Does it have at least one guaranteed organic re-entry point?
- [ ] Does it change something about how the next pearl is experienced?
- [ ] Does it feel complete on its own terms?

**For every loss spoke:**
- [ ] Does it have at least two exit opportunities before the terminal node?
- [ ] Is the loss reconstructable by the player in retrospect?
- [ ] Does it offer a restart?

**For every alternative string:**
- [ ] Has the anchoring character appeared at least three times in main string or long spoke content before the unlock threshold is reachable?
- [ ] Is the unlock threshold invisible to the player?
- [ ] Is the entry node embedded naturally in an existing hub?
- [ ] Is the commitment point recognizable in retrospect but not in the moment?
- [ ] Does the closure (hard or soft) feel complete and earned?
- [ ] Is the alternative string's content non-load-bearing for the main string?

**For every world stat:**
- [ ] Does this stat have a clear narrative meaning?
- [ ] Is it influenced by choices throughout the story, not just at the end?
- [ ] Does it gate or modify at least one choice or outcome?

**For every flag:**
- [ ] Is it set by a meaningful action (not a passive arrival)?
- [ ] Is it read at least once to gate or modify a choice or outcome?

**For every item:**
- [ ] Is it checked as a requirement or consumed somewhere in the story?
