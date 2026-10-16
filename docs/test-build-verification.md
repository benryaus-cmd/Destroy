# Endless rampage v0.3 verification

16 October 2026. Reviewed the supplied 11.52-second phone recording as frames. It shows the previous large monster in a largely empty, already flattened city. That is user-supplied evidence of v0.2, not a playtest of the revised build.

## Revision

Every Play/Continue path now resets the city and starts at size0.65. Permanent progression uses destruction points awarded after a run, with five upgrade types and idempotent settlement. City generation streams a bounded3×3 chunk neighborhood and supports negative coordinates/distant travel. The overhead camera and movement are fixed to world direction. Chomp has a deeper bend and actual captured-victim travel into the jaw. Throws use a shorter low arc in the monster's facing direction; tanks can be held/thrown and cannot shoot or collide with themselves while carried. Vehicle impact damages sections at contact, including while the monster is small.

## Verification

49 Node tests passed. They include actual Three scene simulation for holding/throwing tanks; facing-directed low throws; section impacts and open holes; new-run reset and small start despite old XP; banking exactly once; upgrade prices/caps; deterministic streaming on negative coordinates and59 diagonal transitions; bounded chunks and live arrays; preserved run-local damage; protected objects; owned car-paint and building GPU cleanup; deep bite pose, capture-to-mouth timing and cancellation on death. Legacy creator/save compatibility tests remain.

Production Vite build passed. git diff --check passed. Independent review found pending bites finishing after death; that path was extracted into a tested feeding module and fixed. Population remains bounded when buildings release survivors. Stale orbit help text was corrected.

No successful renderer-based playthrough of v0.3, physical Android performance measurement or listening test is claimed. This environment's browser could not create WebGL on the original preview. The next useful check is the updated local build on the user's phone.


# Playtest polish v0.4 verification

16 October 2026. Added a pure heading-follow camera rig with exponential smoothing, shortest-angle turning, live fixed/follow comparison, default 70° pitch and 65° FOV. Camera and light changes update while paused. Position and turn response, yaw offset, pitch, distance, FOV, hemisphere ambient, sunlight, exposure and cleanup distance are adjustable in TUNE and persist locally. Input uses camera-relative direction latched until release to prevent camera/movement feedback spirals; this feel needs phone playtesting.

People can be grabbed and thrown in the monster's facing direction. Swept section collision produces a capped pool of wall splats, tied to the impacted structure and cleared when gore is disabled or the structure leaves. Kill paths clear carried/projectile ownership; chomp cannot compete for those actors. Reach filtering allows a reachable car to be grabbed even if a closer person is outside their shorter reach.

Missing lower wall bays propagate upward through the same column, including restoration from old damage; adjacent structure remains. Existing pooled debris now adds up to five small cubes per impact. Hatchlings climb immediately with an alternating limb pose. Distant pooled debris, limbs, decals, wall splats, fires, rings and enemies are retired. Active city geometry stays at nine chunks; damage history is capped at 64 chunks and old blocks can regenerate. Resource ownership and protected carried/climbed objects remain intact.

66 Node tests pass, including actual Three scene simulation of person pickup/throw/wall contact, hatchling climbing, support propagation beyond the visible-debris cap, long destructive travel, resource cleanup, camera smoothing across frame rates and held actor death ownership. Production Vite build and git diff --check pass. Independent review found and verified fixes for carried-person death and pickup reach selection. No renderer-based playthrough or physical-phone frame-rate measurement is claimed for this revision; WebGL creation was unavailable in the provided browser environment.

# Steering correction v0.4.1

Phone feedback identified confusing camera-relative steering in v0.4. Replaced the latched camera basis and automatic movement-facing turn with tank controls shared by touch stick, keyboard and gamepad: forward follows current facing, reverse retains facing, and left/right rotate independently, including while stationary or reversing. The camera continues to follow through its existing TUNE settings. Turn speed is adjustable. Shadow darkness controls the directional shadow intensity live, from 0 to 1, without changing ambient light or exposure.

70 Node tests and production build passed. Four new tests verify forward/reverse facing, in-place turns, reverse turns, blocked input and equivalent turning paths at 30/120 simulation steps per second. Inspected a frame of the supplied phone recording; a fresh phone playtest remains necessary for feel. No renderer-based playthrough is claimed.


# Screen controls and visibility v0.4.2

Replaced tank steering with continuous screen-relative movement using the displayed camera yaw. Added a regression that eases stick-left toward stick-up while rotating the camera 90° and verifies straight world travel. The monster faces travel along the shortest turn arc; diagonal input is normalized, idle/deadzone/blocked input is stationary. Camera follow still uses saved settings. Camera is initialized before the first playable frame.

Applied the six changed defaults from the supplied screenshot: camera position smoothing 14, camera turn smoothing 0.5, ambient 1.75, sunlight 2.4, shadow darkness 0.55, climb speed 6. Existing local tuning overrides remain.

Added a building-depth/actor-silhouette outline pass for hidden actors. Uses original meshes including animated skinned civilians, real instanced building sections, two half-resolution targets, a bounded material cache and explicit disposal. Tests exercise actual Three objects for depth comparisons, correct mask selection, holes retained in instance matrices, normal/error-path scene and renderer restoration, and target disposal. They verify orchestration, not rendered pixels or GPU shader execution.

Copy uses clipboard API then native selection/copy fallback, with honest success feedback. Context menus are permitted for text fields. Save JSON supplies an alternative download. Tests cover secure clipboard success, HTTP API absence, rejected/denied copy and exact JSON settings.

79 Node tests and production build passed. Browser rendering verification was attempted at the local test URL, but the browser blocked it with ERR_BLOCKED_BY_CLIENT. Physical-phone steering feel, outline appearance and frame rate remain for the next playtest.


# Movement, camera and carrying v0.4.3

Starting size increased exactly 50%, 0.65 to 0.975. Fast exponential facing response replaces a slow fixed angular rate; saved turnSpeed still controls response while camera smoothing remains independent. A full-reversal test verifies facing catches up within 0.15 seconds and translation stays straight.

Removed camera roof-height ejection. Containing buildings are hidden only during main and outline rendering and restored in finally, leaving collision and destruction active. Tests cover inside/outside/above/transformed buildings, unchanged camera coordinates and failure-path visibility restoration.

Swept movement tests use actual destructible section records (.m) and cover fast wall crossing, sliding, broken bays, airborne body overlap, roof clearance, transformed buildings, overlap correction and crossing a broken entry before stopping at an intact rear wall. Integrated collision into ordinary movement, charge and post-jump overlap correction. Explicit climbing bypasses only attached horizontal collision. Runtime tests cover charge against a surviving facade, jump-height overlaps and charge/climb interaction.

Carrying follows the authored arm/hand hierarchy and world transforms. Tests verify carried torso location under rotation/scale, vehicle behavior, and feeding ownership. Held bites prioritize the captured person, clear carried ownership, pull to the actual mouth, keep the head raised and release upright on death cancellation. Charge/power/slam skip held and feeding people. Independent review identified these action conflicts; regression tests failed before fixes and now pass.

102 Node tests, production Vite build and git diff --check passed. No successful browser renderer playthrough or physical Android measurement is claimed; prior local-page browser access was blocked. Camera cutaway appearance, arm pose and turn feel remain for the phone playtest.

# City and character trial v0.5.0

16 October 2026. Inspected the supplied phone screenshot showing VEHICLE AIRBORNE across the throw/impact sightline. Moved routine toast, alert and kill feedback to the lower-left edge, capped at three short notes.

Reused six actual 3D Maker cars and four street GLBs (1.33 MB combined), with deterministic gardens, benches and planters. Cars are normalized to 4.4 m along the existing traffic axis. Shared asset resources survive streamed cleanup; retired async requests cannot revive removed or burnt cars. Props topple, retire with their chunks and remain bounded by nine active chunks.

Added real rigged Godzilla and Kong GLBs, optimized without requiring decoder extensions: 1,699,088 / 4,503,924 bytes, roughly 21k / 29k triangles. Character selection persists separately from upgrades; distinct perks compose with run stats. Models load lazily for the selected character and safely fall back to the creator. Kong idle normalization is measured on its animated pose at 3.3 m, with root drift compensation and planted feet. Full eat/throw clips fit the 0.36/0.65-second gameplay windows. Godzilla has one authored roar plus bone-driven action overlays. Real hand/mouth anchors feed carrying, eating and gore effects. Tests inspect the actual GLB skeletons, animations and geometry and verify independent instances, clip timing and cleanup.

Structural damage now accumulates per section and drives visible instance shader cracks. Lost corner loads or a complete lower facade release corresponding upper walls, slab quadrants and roof tiles. Collapse debris prioritizes slabs and falls toward the damaged side. Warehouse shutters/skylights and apartment balconies share their sections. Existing saves migrate whole-floor IDs and retain partial damage; chunk snapshots no longer heal crack-only damage. This remains a deterministic support heuristic plus pooled ballistic debris, not a full rigid-body solver.

Jumping uses a swept feet contact against real surviving horizontal sections, preserving roof launch height and landing on roofs or exposed floors. Interior floor quadrants meet at their seams. Slams descend from current position, fire one hit on contact and apply an 0.8-second belly-flop/stand recovery whose visual offset is cleared before physics. Height-aware impact victims avoid killing people far below rooftop slams.

Throwing drives independent human limb/bone flailing and inertial vehicle tumbling. Wall normals reflect wreck momentum; wreck movement is swept against walls instead of passing through the impact facade. Source clips are posed/timed to match the existing instant input actions; the trials still need visual hand-release refinement on phone.

139 Node tests passed, production Vite build passed, git diff --check passed. Read-only integration review identified the late-loading wreck, missing reflection normal and floor-seam regressions, all covered by new tests. Character review corrected bounds/root motion and authored clip timing. No browser renderer playthrough, physical Android frame-rate measurement or visual shader execution is claimed; local browser access was previously blocked. Next check: each selectable character, roof slam through a damaged roof, throwing at a wall with edge HUD messages, weak-hit cracks, collapsing one side and long travel cleanup.
