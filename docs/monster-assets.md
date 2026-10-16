# Character asset trials

The character picker keeps the existing creator and adds **Godzilla trial** and **Kong trial**. These are downloaded, skinned GLB models, not replacements made from primitive shapes. The trial is loaded on selection and the creator remains usable if loading fails.

## Provenance

Public source: [krish4uu/threeJs-monsters-world](https://github.com/krish4uu/threeJs-monsters-world), downloaded 16 October 2026.

- Reptile original: `public/godzilla.glb` (10,122,572 bytes). The source README credits Sketchfab without a creator/profile link. Original internal material name is `Golzilla_pbs`.
- Ape original: `public/king_kong.glb` (25,324,372 bytes). Internal skeleton is `King_Kong_Legendary_2021_skeleton`; author and original asset licence are not identified by the source repository.

These are character trials requested for this test build. The repository is not evidence that the underlying film character assets have a redistribution licence. Creator attribution and a suitable release licence remain unresolved for these two trials.

## Bundled mobile derivatives

Both assets retain their actual skin, joints and animations. Offline processing used glTF Transform `dedup`, `prune`, `weld`, meshoptimizer simplification, animation `resample`, and Sharp 512px JPEG colour textures. Normal, roughness, clearcoat and emissive maps were removed for a lighter mobile trial. No Draco/Meshopt decoder is needed. No new game dependencies were introduced.

| Asset | Bytes | Triangles | Authored clips | SHA256 |
|---|---:|---:|---:|---|
| `public/assets/monsters/godzilla.glb` | 1,699,088 | 21,102 | 1 | `fc552a44dcc4d87a9a834878a8b8aad07c0cc2fabb3fd78766b017b12ecde179` |
| `public/assets/monsters/kong.glb` | 4,503,924 | 28,700 | 18 | `babd2b882a7ce86a506f4d19e6640f06a6156a5b42c6435572b53941abb776b8` |

Kong's real clips include idle, walk, run, grab, eat, throw, climb, jump, roar, attacks and a smash. The reptile has one authored roar sequence; walking, carrying, jaw motion and climbing use overlays on its actual bones. A full authored reptile interaction library has not been invented or claimed.

Both rigs expose real hand bones and a jaw/mouth anchor to carrying and feeding. Each instance owns its own skeleton and animation mixer; immutable geometry/materials/textures belong to the model cache. Trial wrappers must be removed with `disposeCharacterTrials(scene)` before generic scene disposal, or template resources must be protected using `getCharacterTrialResources()`.

Tests check downloaded GLB structure, payload size, required authored clip names, actual animated hand movement, independent skeleton instances, disposal restoration and cancellation during asynchronous loading. Visual arm alignment, animation transitions and phone frame rate require playtesting.
