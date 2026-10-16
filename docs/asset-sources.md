# Character assets

Characters and animations by **Quaternius**, from the **Ultimate Animated Character Pack** (CC0 1.0 public-domain dedication).

- Creator: https://quaternius.com/packs/ultimatedanimatedcharacter.html
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Copied with the user's permission from their repository: https://github.com/benryaus-cmd/3d-Maker
- Pinned source commit: `116266fd5dd32c866ad56d5f949431469929bbd5`
- Source directory: `public/assets/characters/`
- Included unchanged: `casual-male.glb` (709,196 bytes), `casual-female.glb` (663,332 bytes).
- Total model payload: **1,372,528 bytes**.

The source repository records the original creator, CC0 dedication, and Gameatude mirror provenance. Its per-file mirror URLs, original Drive IDs and SHA-256 hashes are preserved for these two files in `public/assets/characters/manifest.json`. Its supplied license/provenance notice is preserved in `public/assets/characters/LICENSE.txt`. That original notice describes the source repository's full ten-model catalog; this game includes only the two models listed above.

Both models have embedded binary geometry and authored materials, 23 joints, and 17 animation clips, including Idle, Walk and Run. No external image/buffer downloads or decoder are required. Runtime upgrades are capped at 18 civilian models; soldiers and all people awaiting assets retain the procedural implementation. Skeleton-safe clones use each model's authored animation clips and normalize the standing height to 1.75 game units before the person's existing scale is applied.

The original procedural limbs and gameplay records remain in place. An upgraded model is detached when the person dies; existing blood, debris and severed-limb effects continue through the original gameplay path. Per-person skeleton resources are disposed; cached model geometry and materials remain shared across rounds.
