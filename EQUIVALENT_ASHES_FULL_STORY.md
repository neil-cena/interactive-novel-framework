# Equivalent Ashes — Full Story Compilation

This document compiles the playable narrative of **Equivalent Ashes** as implemented in `data/csv/nodes.csv`, aligned with the design framing in `EQUIVALENT_ASHES_BRIEF.md` and the four-layer model in `NARRATIVE_ARCHITECTURE.md`.

**How the “main spine” was chosen:** The brief names five **mandatory pearls** every run must pass through for the story’s argument (correct process vs. correct outcome). The **exact node path** between them is hub-and-spoke: players may take different spokes, but the pearls themselves are the through line. Where the data allows multiple first steps (e.g. morning optional nodes), this spine describes the **default investigative arc** toward the seawall crisis without committing to every optional detour.

**Spoilers:** Full story spoilers throughout.

---

## Part I — Main string of pearls

### Pearl 1 — The assignment

**Vael** wakes in the Measured Scholars’ dormitory in **Orvish**. They are a junior field evaluator, structural/systems alchemy, trained to find where cost went—not to save people. **Senior Scholar Mireth** assigns a routine assessment: **Karet Bay**, lower docks—a harbor crane running **23% above rated structural load** with no authorized reinforcement in the logs and normal fuel consumption on paper. She warns: observe and calculate; don’t get creative; “good work” and “right work” are not the same. Vael takes field plates, fuel, CEA authorization, and descends from the Scholar’s Quarter into a district shaped by old harm (the **Drowning** and the legal principle that environmental harm is harm to people).

### Between pearls — approach and baseline

Vael may pause for texture (window view of the city, market terrace, loadout meditation), then enters Karet Bay, takes baseline readings, and reaches the docks—meeting **Dima** (notebook, wrench) and workers on break before focusing on **Crane Seven**.

### Pearl 2 — The crane anomaly

Instrument readings confirm the anomaly. **Kaelen**, foreman, is defensive then transparent: the crew has been reinforcing the crane with improvised materials and unsanctioned circle work because official maintenance never came. Vael faces an early fork: **file a hazard report**, **stabilize the joint** (burning sanctioned fuel and personal reserves), or **walk away**—each with different costs and flags. The crane may **collapse** or be mitigated; either way, the district’s pattern of starvation and improvisation is no longer abstract.

### Pearl 3 — The discovery

After the crane beats, investigation opens across **hubs** such as `post_crane_pattern`, infrastructure passes, **Freehands** contact, first **seawall** survey, and tracing **disturbance** inland. Vael meets **Elara** at her **purifier**—clean water that is also part of the chemical story downstream—and may destroy, modify, or leave the purifier, each leaving a different “receipt” in the run.

The thread climbs toward the **CEA**: substation readings, **Overseer Toris**’s office, and the revealed policy—**maintenance materials redirected** from Karet Bay (and other districts) to the **Highpoint Transit Rail**, justified as net benefit and “temporary” pain. **Senna** at the warehouse can expose manifests; supply-chain depth can widen the picture to a regional pattern. Toris frames loss as **acceptable distribution**; Vael can confront him with analysis, philosophy, authorization chasing, or (ill-advised) violence.

Night work in a dock tavern turns worker rumor into **timeline**: multiple small “acceptable” deviations converging on **cascade failure**, echoing the **Hollow Tower** lesson—this time with faces attached. A **Red Balance** contact names the architecture: cost assigned downward without consent. Optional threads (night market, **Ash** the pamphleteer, Scholar **Nev**’s camp outside the CEA) deepen chaos, evidence, and political context.

### Pearl 4 — The seawall crisis

The ledger closes: **12–24 hours** to critical failure, tide surge coming. Vael runs to the seawall; readings confirm catastrophe for **six thousand** people. Optional beats include **formal escalation** with Toris’s paper trail, **evacuation coordination** (with Freehands token), **final preparation** (alert Kaelen, consult Elara, solo prep), and consulting Elara for the difference between optimal and right.

### Pearl 5 — The final choice

At the wall, Vael names the options (exact menu depends on **world stats**, **items**, and **reputation**):

- **Controlled failure (CEA-style):** sacrifice a **weak tenement block** to plug the breach—saves the district, mirrors Toris’s calculus; epilogue **The Perfect Calculation**.
- **Redirect / overload transit:** force material or power back—**The River Runs Uphill** (major upper-city casualties; Karet Bay intact; fugitive arc) or related radical routes gated by **state chaos** / **transit anomaly** item.
- **Living fuel / Red Harrow option:** Vael becomes conduit; **The Costly Good Deed**—wall holds, district evacuates, **permanent hand distortion**, life in the bay with Elara and the crew.
- **Collective route:** evacuation plus distributed labor and Vael’s math; **The Distributed Cost**—wall fails partially but **no deaths**, mutual aid framed as Red Harrow’s ethic updated.

These are the main-string **resolutions**; they are reached after the five pearls, though **which** ending appears is branch-gated.

---

## Part II — Branches, hubs, and alternative strings

### Layer 2 — Short spokes (texture and resources)

Optional early beats that change tone, stats, or items without replacing the spine: **morning_view**, **scholar_loadout**, **market_terrace**, extra crane readings, **meet_kaelen_tonic**, district survey nuances, and similar. They illustrate hub-and-spoke “spend time in the space between pearls.”

### Layer 2 — Long spokes (substantive side arcs that rejoin)

- **Dima’s notebook → theater:** `dima_notebook` → **Petra**’s **Karet Bay Amateur Theatrical Society**; satirical operetta **“The Acceptable Loss Revue”**; optional **seawall_analysis** item; ties theater “art” to clandestine structural relief on the wall.
- **Warehouse / Senna / staging / supply chain:** proof of redirection scale; items like manifests and ledgers; feeds Toris confrontation and chaos.
- **Freehands safehouse (Brin):** mutual aid geography, repair briefings, pipe and wall assists, reputation and **freehands_token** for collective ending paths.
- **Night district:** night market, **Ash** trail, Red Balance proposition, worker tavern loops.
- **Supervisor texture (no dedicated field beat):** Choosing the plaque-related option on `post_crane_pattern` ends the day at `transition_end_day_one` and sets **`mireth_warned`**—a compact acknowledgment that Mireth’s “good work ≠ right work” warning still applies, without a separate Mireth scene.

### Loss branches (game over / “bad ends”)

Early or mid-run failures, often with dark humor:

| Node (concept) | Premise |
|----------------|---------|
| **death_oversleep** | Skip assignment; crane collapses; dismissed. |
| **death_window** | Lean out of degraded dorm window. |
| **death_bluff_crew** | Threaten dock crew with bogus authority. |
| **death_touch_mod** | Touch live reinforcement against warning. |
| **death_drink_water** | Purifier water vs Scholar tolerance. |
| **death_flip_desk** | Catharsis in Toris’s office. |
| **death_punch_wall** | Impulse at the seawall. |
| **death_petra_arrested** | Try to “arrest” the theater mid-show. |
| **death_join_troupe** | Offer to write Act III while the wall fails. |
| **death_authorization_revoked** | **Authority overplay:** premature CEA escalation without evidence chain. |
| **death_cat_census / death_cat_coronation** | Cat parliament missteps. |
| **death_distortion_craft** | “One more” unauthorized repair after depletion—somatic transmutation. |
| **death_crackdown** | Kaelen line: overextend repair op; CEA raids. |

### Alternative strings and parallel resolutions

These are **full divergences** or **replacement life paths** (Layer 4 in design terms). In the build, several are **fully playable**; others are documented targets in the brief.

#### A — **The Chronicler** (Dima / theater commitment)

**Entry (single deliberate thread):** After `theater_revelation`, the build sets **`theater_seawall_briefing`**. From **`seek_answers`**, a gated cross-file choice leads to **`alt_chronicler_entry`** → **`alt_chronicler_bailout_1`** → **`alt_chronicler_bailout_2`**, each offering a return to **`seek_answers`** before the final step sets **`alt_chronicler_committed`** and enters **`chronicler_commitment`**. The in-theater shortcut into the chronicle path has been removed so the Chronicler string has one dull procedural entry and explicit bailouts.

**Arc:** `chronicler_commitment` ( **`c_chron_1`** visible only with **`alt_chronicler_committed`**) → `doc_planning` → testimony pillars (workers, elders, CEA records) → **chronicle_assembly** → **chronicle_distribution** (Academy/Council, press, or Ash’s network). There is no longer a last-chance jump from **`chronicler_commitment`** back to the seawall race—committing through the bailout chain is the point of no return for that string.

**Outcome (`ending_chronicler_v2`):** Chronicle ships; **seawall crisis resolves without Vael present**—partial failure, injuries, displacement, but no deaths; institutional fallout (Toris suspended, Academy review, **Karet Bay Record Office**). Theme: record vs rescue; cost of choosing documentation.

**Meta:** `egg_canon_codex` — primer margin explicitly maps the four narrative layers.

#### B — **The Craft** (Elara)

**Entry:** Memorial meeting → **elara_offer** → workshop and **unauthorized** residential / fishmarket structural work.

**Outcomes:**

- **ending_craft** (soft): credentials revoked; Vael stays as **“the Scholar who stayed,”** hybrid practice with Elara; district slowly improves.
- **death_distortion_craft** (hard): push past safe margins; distortion death—wall holds, body pays.

#### C — **Kaelen’s line** (dock crew seawall plan)

**Entry:** Late Freehands safehouse beat when flags and **workerRep** / **freehandsRep** align — **kaelen_proposition** → crew meeting → material sourcing (raid staging, black market, or Scholar-led legal-ish salvage) → night repairs → optional **fraudulent inspection delay** → **line_climax** or **line_overextend**.

**Outcomes:**

- **ending_line** — seawall holds on critical section; credentials struck; Toris investigated; Vael joins dock crew (**The Line**).
- **ending_line_partial** — partial success; uneven cost; same credential loss and crew path, grimmer maintenance debt.
- **death_crackdown** — operation broken; Kaelen arrested; Vael detained.

#### D — **Red Balance / Ash** (institutional sabotage)

**Entry:** Night market **ash_proposition** → intel on three transfer points → optional **red_partial_retreat** or full **red_final_operation** (permanent seals).

**Outcome (`ending_red`):** Public trial; **both** Vael and **Toris** convicted; rail suspended; emergency allocations; short sentence; Ash’s movement persists (**The Red Exchange**). Gated in part by **stateChaos**.

### Cross-cutting branch clusters

- **Authority overplay** (`authority_overplay_1` → `authority_overplay_2`): premature escalation; exit via Mireth or **death_authorization_revoked**.
- **Evacuation path** (`evacuation_coordination` → `evac_coordination_detail`): positions collective ending.
- **Toris meeting variants:** confrontation with **seawall_analysis**, **crane_report** + analysis, **worker_testimony**, philosophy track—different chaos/stability ticks, same downstream `toris_aftermath` arc unless terminated by desk-flip.

### Design notes (from brief, not all gated identically in data)

`EQUIVALENT_ASHES_BRIEF.md` describes **Alternative String B — “The Craft”** unlock/commitment nuance and notes that **Chronicler** thresholds may still be tuned. Treat this compilation as **story + topology as shipped in CSV**, with the brief as **intent** where they differ.

---

## Appendix — Canonical ending titles (in-game)

| Title | Rough trigger family |
|-------|----------------------|
| **The Perfect Calculation** | CEA-style controlled collapse |
| **The River Runs Uphill** | Transit / conduit reversal radical route |
| **The Costly Good Deed** | Living fuel / sacrifice |
| **The Distributed Cost** | Collective / evacuation / many-hands |
| **The Chronicler** | Theater briefing flag → `seek_answers` → alt-chronicler bailouts → Dima chronicle arc |
| **The Craft** | Elara unauthorized craft path (soft) |
| **The Line** | Kaelen crew seawall operation (full / partial) |
| **The Red Exchange** | Ash / Red Balance sabotage arc |
| Satirical / tragic **GAME OVER** nodes | Listed under loss branches |

---

*Generated for navigation and writers’ room use. For engine behavior and exact choice gates, refer to `data/csv/nodes.csv` and `src/engine`. Cistern cat-colony and **feral parliament** content has been removed from the data build; this file reflects that cull.*
