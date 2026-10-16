# Conquest test build verification

16 October 2026. This report describes source and automated verification, not a successful browser playtest.

## Delivered

The original creator now feeds a saved city conquest. Added permanent XP/DNA, four earned mutations, four district challenge sets, within-sortie growth, saved building damage, active-sortie resume and local bests. Added grabbing/throwing, charging, jumping/body-slamming, contextual climbing, shockwave powers, armoured enemies and rival monsters. Buildings use local removable facade/roof/floor sections with exposed interiors, bounded physical debris and structural collapse. Added two authored animated civilian assets, pooled fire/smoke and light effects, gore tuning, synthesised sound and compact mobile controls. A complete Vite/npm project is included.

## Automated evidence

`npm test`: 33 tests passed. These exercise deterministic generation; swept collision; ground/elevated body overlap; real Three scene save/resume; saved camera, creature, mutation, health and cars; idempotent rewards; malformed/offline saves; actual facade damage and restoration; projectile passage through open holes; climb relaunch/roof exit and removed roof support; packaged GLTF parsing, authored animation, independent skeletons, pooling and cleanup.

`npm run build`: production build passed. Vite inlines the application JS/CSS in dist/index.html; both GLBs and attribution remain present under dist/assets/characters.

`git diff --check`: passed. Independent review identified and prompted fixes for repeat civilian IDs on resume, abandoned-sortie banking, camera throw direction, saved mutation identity, elevated combat, delayed airborne smash, low climb relaunch and collisions with removed walls. Follow-up runtime tests cover those simulation behaviors where modules are directly testable.

## Practical limits

The supplied original Aippy preview failed renderer creation in this environment: `THREE.WebGLRenderer: Error creating WebGL context`. Local browser file access was also unavailable. No successful visual browser playthrough, physical Android run, FPS measurement, audio listening test or portrait touch playtest is claimed. The input and UI layout still need a real-device pass. This is a substantial test milestone, not a claim that the long-term final goal or AAA polish is finished.

Local saves restore gameplay progress and building sections; population, rival/tank encounters and transient effects respawn. Buildings use section support thresholds rather than a full rigid-body structural solver. Destruction is bounded to keep the simulation manageable. The city can eventually be permanently flattened; expansion/rebuilding campaigns are future work. Existing Aippy score submission is retained, but online acceptance/ranks were not tested.
