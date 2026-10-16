# Monster Maker Rampage: Conquest test build

A portrait-first Three.js monster destruction game. The original creature creator remains; the endless-runs test adds procedural city streaming, short facing-directed throws and post-run upgrades.

## Run locally

```powershell
git clone https://github.com/benryaus-cmd/Destroy.git
cd Destroy
npm install
npm run dev
```

Open http://127.0.0.1:8080. For an existing clone, stop Vite, run `git pull`, `npm install`, then `npm run dev`.

## Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move | WASD / arrows | Left-side floating stick |
| Camera | Wheel / zoom buttons | Zoom buttons |
| Chomp | Space | CHOMP |
| Smash | E | SMASH |
| Grab / throw | Q | GRAB / THROW |
| Jump, climb, airborne slam | R | JUMP / CLIMB, then SLAM |
| Charge | F | CHARGE |
| Mutation shockwave | X | POWER |
| Pause / save | Escape / P | Pause icon |

Throw follows the camera direction. Feed first: buildings become breakable after the first growth stage. Jump next to an intact structure after growing to climb; press again to launch, then again to slam. Armoured forces arrive at threat 3; rival monsters join higher threats. Mutation parts unlock through XP and are bought with earned DNA in EVOLVE; changes apply to the next sortie.

## Endless runs and upgrades

Every Play, New City or new-rampage action creates a fresh procedural city and a small monster. The city streams a bounded 3×3 chunk neighborhood as you move, with no outer map boundary. Damage remains while revisiting within the same run; it resets for the next run.

Feed to grow during a run. On death or End run & menu, earn one destruction point per 100 score. Spend points through the end screen's upgrade button or UPGRADES in the menu. Health, feeding reach, smash damage, thrown-object damage and healing upgrades persist. Growth and city damage do not. Points, upgrades and best scores use `monster-rampage-progression-v1`; legacy creator/conquest saves remain separate and are not deleted.

Throws follow the monster's facing and use a shorter arc. Cars and tanks can be lifted; vehicle collisions damage actual building sections even when the monster is small. Chomp visibly bends down and pulls captured people into the mouth. The camera follows from overhead; drag no longer orbits the world. Use zoom buttons or wheel to change framing.

TUNE exposes live settings, per-value resets and JSON export. The old Aippy score submission is retained; no new leaderboard service is introduced. Assets and attribution are in `docs/asset-sources.md`.

## Verify

```sh
npm test
npm run build
```

`dist/index.html` contains the compiled game. The packaged models remain in `dist/assets/characters/` and must accompany it. See `docs/asset-sources.md` for attribution. `final-goal.md` describes both this milestone and the larger target.

Browser/Android visual playtesting is required before treating this as a polished release. The development browser returned a WebGL-context creation error on the original Aippy preview, so its rendering failure is not evidence of mobile performance or gameplay quality.
