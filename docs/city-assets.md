# Blacktop city assets in Monster Maker Rampage

Ten byte-identical GLBs reused with the owner's permission from `benryaus-cmd/3d-Maker`, commit `116266fd5dd32c866ad56d5f949431469929bbd5`.

Six vehicles: sedan, sports sedan, SUV, taxi, police and race car. Four street models: curved lamp, traffic light, dumpster and stop sign. Cars are normalized to 4.4 m length and ground level, with their long axis aligned to the existing local-X traffic convention. Their embedded original textures and materials are retained. Payload is about 1.33 MB. Exact source paths, bytes and Git blob hashes are in `public/assets/city/manifest.json`.

Original artist: Kenney, https://kenney.nl/assets/car-kit and https://kenney.nl/assets/city-kit-roads . Converted GLBs: https://github.com/Hidencod/tge-assets . The upstream `docs/blacktop-assets.md` records CC0 1.0 provenance for both original models and converted GLBs. `public/assets/city/LICENSE.txt` is copied from the source repository's bundled Kenney license.

## Runtime ownership and integration

`decorateCityCar(group, seed)` decorates an existing procedural car. Warm loading is cached once, with procedural fallback retained while loading or offline. `retireCityModel(group)` cancels pending attachment, removes imported models and restores original children. Call it before disposing cars or retiring a chunk. A retired model cannot attach after asynchronous loading completes.

`createChunkDecor(cx, cz, seed)` returns a world-positioned group with 7 imported/fallback street props plus two planted central garden strips with planters, shrubs and benches. Add it to the scene or to an identity-position chunk container. Do not add under an already translated terrain. `hitCityDecor(group, worldPoint, radius, force)` starts deterministic physical toppling of nearby intact props; `updateCityDecor(group, dt)` advances their fall. Fallen props stay fallen until the whole distant chunk retires.

Imported clones and procedural decoration meshes share geometry/materials. `getCitySharedResources()` returns every resource the scene's generic disposal must protect. Meshes also carry `userData.cityShared`. Dispose owned per-car paint normally; protect cached template resources through both chunk retirement and whole-scene cleanup. `disposeCityAssets(scene)` detaches all city imports in the given scene before generic scene disposal. No unbounded registry survives proper chunk retirement.

Three automated tests parse all real GLBs, check finite bounds, 4.4 m normalization and local-X orientation, verify async cancellation and shared-resource lifetime, test prop toppling, and verify offline fallback. Appearance and performance still need actual Android playtesting.
