# Endless rampage v0.3 verification

16 October 2026. Reviewed the supplied 11.52-second phone recording as frames. It shows the previous large monster in a largely empty, already flattened city. That is user-supplied evidence of v0.2, not a playtest of the revised build.

## Revision

Every Play/Continue path now resets the city and starts at size0.65. Permanent progression uses destruction points awarded after a run, with five upgrade types and idempotent settlement. City generation streams a bounded3×3 chunk neighborhood and supports negative coordinates/distant travel. The overhead camera and movement are fixed to world direction. Chomp has a deeper bend and actual captured-victim travel into the jaw. Throws use a shorter low arc in the monster's facing direction; tanks can be held/thrown and cannot shoot or collide with themselves while carried. Vehicle impact damages sections at contact, including while the monster is small.

## Verification

49 Node tests passed. They include actual Three scene simulation for holding/throwing tanks; facing-directed low throws; section impacts and open holes; new-run reset and small start despite old XP; banking exactly once; upgrade prices/caps; deterministic streaming on negative coordinates and59 diagonal transitions; bounded chunks and live arrays; preserved run-local damage; protected objects; owned car-paint and building GPU cleanup; deep bite pose, capture-to-mouth timing and cancellation on death. Legacy creator/save compatibility tests remain.

Production Vite build passed. git diff --check passed. Independent review found pending bites finishing after death; that path was extracted into a tested feeding module and fixed. Population remains bounded when buildings release survivors. Stale orbit help text was corrected.

No successful renderer-based playthrough of v0.3, physical Android performance measurement or listening test is claimed. This environment's browser could not create WebGL on the original preview. The next useful check is the updated local build on the user's phone.
