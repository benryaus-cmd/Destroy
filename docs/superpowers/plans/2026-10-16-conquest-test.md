# Monster Conquest Test Build Implementation Plan

> For agentic workers: use subagent-driven-development for scoped work and independent review. User requested immediate execution with workers as needed.

**Goal:** Deliver the approved playable destruction/conquest milestone in Destroy.
**Architecture:** Retain monsterGame.js as coordinator; isolate pure progression/storage logic, segmented building geometry and optional crowd asset rendering. React owns page structure; engine owns simulation.
**Tech Stack:** React 19, Three.js, Vite, Node tests.
**Spec:** final-goal.md

## Global Constraints
Preserve creator mmr5 saves; direct root game; touch and keyboard; bounded effects; honestly distinguish local scores from online reporting. Work on conquest-test branch in isolated clone; push final verified state to the user-authorized Destroy repository.

## Review Focus
Malformed save recovery; duplicate reward banking; thrown objects tunnelling; climbing invalid roofs; touch input sticking after pause/blur; destruction restoration differing after reload.

### Task 1: Persistent evolution
Files: src/game/conquest.js, tests/conquest.test.js. Pure state versioning, deterministic city seed, districts, destruction/challenge records, mutation unlock/equip and stat modifiers. Write and run failing Node behavior tests before implementation, then verify save/load equivalence, duplicate rewards, malformed saves and stage thresholds.

### Task 2: Local building damage
Files: src/game/destruction.js, tests/destruction.test.js. Create attractive sectioned facades/interiors with bounded mesh counts. Pure impact selection and structural support functions, tests first. Damage removes nearby sections, returns debris; structural threshold collapses remaining building. Serialized removed section IDs restore deterministic geometry.

### Task 3: Crowd assets
Files: src/game/crowdAssets.js, public/assets/characters/*, docs/asset-sources.md. Inspect 3d-Maker character files, copy a small suitable subset and provenance. Export optional async model warm-up, attach and tick helpers with procedural original fallback and bounded model count. Do not alter coordinator or UI.

### Task 4: Runnable project and integration
Files: package.json, index.html, vite.config.js, src/index.css, src/game/game.css, src/App.tsx, src/game/GameDialogs.tsx, src/game/monsterGame.js. Restore missing project configuration/styles. Integrate progression/destruction/crowd interfaces; add hold/throw, charge, jump/slam, contextual climb, powers, save/resume/expedition progression, challenge HUD, mutation panel, live tuning panel, improved effects and gesture-safe controls. Add meaningful pure action/trajectory tests before new math logic.

### Task 5: Review, verification, delivery
Run all Node tests, production build, inspect bundles and resource paths. Attempt browser playtest through supported browser; if its WebGL is unavailable report that distinctly, never claim physical Android testing. Independent reviewer inspects lifecycle, saving, integration and input. Fix findings, verify again, commit and push. Include exact-file import manifest and local run instructions.
