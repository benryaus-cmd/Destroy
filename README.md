# Monster Maker Rampage: Conquest test build

A portrait-first Three.js monster destruction game. The original creature creator remains; the conquest test adds persistent city damage, earned evolution and physical attack tools.

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
| Camera / throw aim | Drag / wheel | Drag right side / zoom buttons |
| Chomp | Space | CHOMP |
| Smash | E | SMASH |
| Grab / throw | Q | GRAB / THROW |
| Jump, climb, airborne slam | R | JUMP / CLIMB, then SLAM |
| Charge | F | CHARGE |
| Mutation shockwave | X | POWER |
| Pause / save | Escape / P | Pause icon |

Throw follows the camera direction. Feed first: buildings become breakable after the first growth stage. Jump next to an intact structure after growing to climb; press again to launch, then again to slam. Armoured forces arrive at threat 3; rival monsters join higher threats. Mutation parts unlock through XP and are bought with earned DNA in EVOLVE; changes apply to the next sortie.

## Persistence

The city seed, damaged building sections and permanent XP/DNA/challenges persist on this device. CONTINUE CITY restores the active creature, mutation, position, health, camera, score and cars. Autosave runs every five active seconds and on pause/menu. Save & menu preserves the sortie; starting a different sortie banks the previous one once. Death banks earned progress and clears the active sortie; the city remains damaged. A different creature uses the same conquered city.

Original five creature slots remain in `mmr5`; conquest uses `monster-conquest-v1`. Export live test settings from TUNE or Test settings. Each value and the complete set can reset independently. City population and combat enemies respawn; this is not a byte-for-byte saved simulation of every civilian, bullet and particle.

## Included systems

- Seeded section-built facades with windows, floors/interiors, support damage and collapse debris.
- Car lifting/throwing with swept section collision; charge, jump/slam, contextual climbing and shockwave.
- Permanent XP/DNA, four district challenge sets, four earned visible mutations and local bests.
- Growth during sorties and permanent growth contribution between sorties.
- Authored Quaternius animated civilian models copied from 3d-Maker with procedural fallback.
- Pooled fire/smoke/light effects, existing dismemberment and blood decals, synthesised sound.
- Compact portrait HUD and live settings with JSON export.

Existing Aippy score submission remains available when hosted there; this build does not add a separate conquest leaderboard server or claim a confirmed online rank.

## Verify

```sh
npm test
npm run build
```

`dist/index.html` contains the compiled game. The packaged models remain in `dist/assets/characters/` and must accompany it. See `docs/asset-sources.md` for attribution. `final-goal.md` describes both this milestone and the larger target.

Browser/Android visual playtesting is required before treating this as a polished release. The development browser returned a WebGL-context creation error on the original Aippy preview, so its rendering failure is not evidence of mobile performance or gameplay quality.
