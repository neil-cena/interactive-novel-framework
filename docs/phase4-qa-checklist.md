# Phase 4 Manual QA Checklist

Use this checklist to verify Phase 4 (Polish and Presentation) before release.

## Audio

- [ ] Start game from menu; verify menu music starts after first click and stops when entering game.
- [ ] Navigate multiple nodes; verify narrative music plays in game view.
- [ ] Trigger a skill check; confirm dice roll SFX plays.
- [ ] Enter combat; verify combat music and hit/miss SFX on attacks; victory/defeat SFX on resolution.
- [ ] Enable mute, adjust volume sliders, reload app; verify preferences persist.

## Transitions

- [ ] Switch between narrative and combat; verify cross-fade transition.
- [ ] Change story node; verify narrative content transition (node-fade).
- [ ] Verify choice buttons animate in (slide) when choices appear.
- [ ] Resolve combat; verify brief Victory/Defeat message overlay before returning to narrative.
- [ ] Enable "Reduce motion" in OS; verify transitions are minimal or instant.

## Typewriter & Content

- [ ] New node text types out at default speed; click to skip and reveal full text.
- [ ] With "Reduce motion" enabled; verify text appears immediately (no typewriter).
- [ ] Node with `image` in data shows image above text; missing image path hides image without error.

## Accessibility

- [ ] Keyboard: press **1**, **2**, **3** in narrative view to select first/second/third visible choice.
- [ ] Keyboard: press **I** in narrative view to open/close Inventory.
- [ ] Open Inventory; close with button or overlay click; focus returns to Inventory button.
- [ ] Toggle "High contrast" in header; verify stronger borders and readable contrast.
- [ ] Screen reader: critical regions have ARIA labels; combat log and roll summary use live regions.

## Regression

- [ ] Full playthrough: menu → start → narrative choices → skill check → combat → victory/defeat → narrative.
- [ ] Save and quit; resume from menu; state is correct.
- [ ] No console errors during normal flow.
