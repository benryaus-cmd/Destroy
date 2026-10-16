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

Throw follows the monster’s facing. Jump next to an intact structure at any size to climb; press again to launch, then again to slam. Armoured forces arrive at threat 3; rival monsters join higher threats. Mutation parts unlock through XP and are bought with earned DNA in EVOLVE; changes apply to the next sortie.

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


### v0.4 playtest polish

Open TUNE during play or pause. The overhead camera now follows the monster’s heading smoothly by default, with 70° pitch and 65° FOV. Switch Follow to Fixed to compare; adjust position/turn smoothing, yaw offset, distance, pitch and FOV live. Steering follows the current screen direction: point the stick or use WASD/arrows where you want to walk. As the camera follows, ease the stick back toward up to preserve your world travel direction. The monster turns toward travel at the configured turn speed. TUNE includes turn speed and shadow darkness (0=no cast shadows, 1=full). Ambient light, sunlight and exposure are also adjustable and saved locally.

GRAB picks up nearby people as well as vehicles. Face a wall and THROW to leave a blood splat (when gore is enabled). Hatchlings can climb immediately, with alternating climbing limbs. Removing a lower wall bay brings down its upper wall bays; a small capped cube burst accompanies the section debris.

Debris, splats, fire and enemies are cleaned up far from the monster. Nine city chunks stay loaded; damage history is capped at 64 chunks, so very old distant blocks can regenerate on revisiting. Each new run still resets the city.


### v0.4.2 controls and visibility

Screen-relative movement uses the camera’s current yaw every frame. There is no latched heading or turn-only stick axis. Defaults match the supplied tuning screenshot: position response 14, camera turn response 0.5, ambient 1.75, sunlight 2.4, shadow darkness 0.55 and climb speed 6; pitch remains 70° and FOV 65°. Existing saved tuning stays intact.

Hidden monster, people, vehicles and threats receive a silhouette outline through buildings: lime for the player, cyan for civilians, gold for vehicles and warm colors for threats. Original animated meshes and building sections drive the effect, so smashed holes remain visible. TUNE has an Occlusion Outlines toggle. Two half-resolution masks and their resources are released on ending/replacing the game scene.

Copy JSON supports both the clipboard API and a native copy fallback for HTTP Wi-Fi play. Long-press selection is enabled in the text field; Save JSON also downloads the settings as a file.


### v0.4.3 movement, camera and carrying

The starting monster is 50% larger: 0.975 instead of 0.65, with the same fresh-run progression. Facing pivots quickly toward stick travel, including full reversals, while camera turn smoothing remains independent and keeps your saved values.

The camera keeps its orbit height inside a building. That containing building is cut away for the render, allowing a view out, and returns when the camera exits. Collision/destruction data are unchanged. Walking and charging sweep against surviving wall/post sections; airborne bodies also collide with walls, while smashed holes and travel above roofs remain usable. Explicit climbing still works at every size.

Held people rest across actual hand anchors rather than floating above the monster. CHOMP eats a carried person directly, pulling them into the raised mouth, including while elevated. Vehicles retain their overhead hold and facing-directed throws. Jumping/climbing cancels an active charge; charge, power and slam preserve people already held or being eaten.

### v0.5.0 city and creature trials

Choose **Your monster**, **Godzilla** or **Kong** before starting. All begin at the same run scale and keep the same upgrades. Godzilla has +25% health/smash, +20% power and 10% slower movement. Kong has +35% throw damage, +40% climbing, +15% speed and 10% less health. The model is loaded only for the selected trial. Kong uses authored clips for grab/eat/throw/climb/attacks; Godzilla combines an authored roar with bone-driven action poses. The creator remains available and is the fallback when an asset cannot load.

Six real car models and four street models are reused from 3D Maker: sedan, SUV, taxi, police, race, sports sedan, curved lamps, traffic lights, stop signs and dumpsters. Streamed chunks include garden strips, benches, planters and shrubs; nearby props topple when hit. Warehouses with roller shutters/skylights and apartments with balconies are entirely sectioned and destructible.

Wall hits accumulate cracks before breaking. Losing corner or side support drops upper walls, floor quadrants and roof portions, with falling slab debris biased toward the damaged side. This is a bounded structural approximation with pooled debris, not a general rigid-body building simulation. Cracks and missing sections survive nearby chunk unloading.

Roof jumps land on surviving roof tiles or exposed floors. Slams descend from the current height, belly-flop and stand over 0.8 seconds. Rooftop impacts avoid street-level victims beyond the blast distance. Thrown people flail their procedural joints or authored skeleton bones; cars preserve angular momentum, ricochet, bounce and settle. Burnt cars stay burnt if models load late.

Routine notifications and kill messages now use a small lower-left feed instead of appearing over impact targets. See [city asset sources](docs/city-assets.md) and [character trial sources](docs/monster-assets.md) for provenance and character animation limitations.
