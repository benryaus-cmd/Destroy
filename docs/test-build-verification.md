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
