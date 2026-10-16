import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { AnimationMixer, Box3, Group, Scene, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

const assets = new URL('../public/assets/characters/', import.meta.url);

async function parseModel(name) {
    const bytes = await readFile(new URL(`${name}.glb`, assets));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return new GLTFLoader().parseAsync(buffer, '');
}

function human(scene, sol = false) {
    const m = new Group(), pel = new Group(), hiddenLimb = new Group();
    hiddenLimb.visible = false;
    pel.add(hiddenLimb);
    m.add(pel);
    scene.add(m);
    return { m, pel, hiddenLimb, sol, ph0: .4 };
}

const replacement = h => h.m.children.find(object => object.userData.crowdAsset);
function skinnedMesh(object) {
    let mesh;
    object.traverse(child => { if (!mesh && child.isSkinnedMesh) mesh = child; });
    return mesh;
}

test('packaged character binaries match provenance and contain usable authored animations', async () => {
    const manifest = JSON.parse(await readFile(new URL('manifest.json', assets), 'utf8'));
    assert.equal(manifest.assets.length, 2);
    let totalBytes = 0;
    for (const asset of manifest.assets) {
        const bytes = await readFile(new URL(`${asset.id}.glb`, assets));
        assert.equal(bytes.length, asset.bytes);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
        totalBytes += bytes.length;
        const gltf = await parseModel(asset.id);
        assert.equal(gltf.animations.length, 17);
        const model = cloneSkeleton(gltf.scene);
        const mixer = new AnimationMixer(model);
        for (const name of ['Idle', 'Walk', 'Run']) {
            const clip = gltf.animations.find(candidate => candidate.name === name);
            assert.ok(clip, `${asset.id}: missing ${name}`);
            mixer.stopAllAction();
            mixer.clipAction(clip).reset().play();
            mixer.update(clip.duration / 2);
            const size = new Box3().setFromObject(model, true).getSize(new Vector3());
            assert.ok(size.toArray().every(Number.isFinite), `${asset.id} ${name}: nonfinite bounds`);
            assert.ok(size.y > .5, `${asset.id} ${name}: invalid standing height`);
        }
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
    }
    assert.ok(totalBytes < 2_000_000, 'character payload exceeds the agreed budget');
});

test('real crowd assets animate independent skeletons and release reusable capacity safely', async t => {
    let finishLoading;
    const gate = new Promise(resolve => { finishLoading = resolve; });
    const loaded = new Map();
    t.mock.method(GLTFLoader.prototype, 'loadAsync', async url => {
        await gate;
        const name = url.split('/').pop().replace('.glb', '');
        const gltf = await parseModel(name);
        loaded.set(name, gltf);
        return gltf;
    });
    // Fresh module state isolates the loader cache and live-person registry.
    const crowd = await import('../src/game/crowdAssets.js?lifecycle-test');
    const scene = new Scene();
    const people = Array.from({ length: 22 }, () => human(scene));
    const soldier = human(scene, true);
    people.forEach(crowd.decorateHuman);
    crowd.decorateHuman(soldier);
    const cancelled = human(scene);
    crowd.decorateHuman(cancelled);
    crowd.releaseCrowdHuman(cancelled);
    assert.ok(people.every(h => h.pel.visible), 'loading must preserve the procedural fallback');
    finishLoading();
    await crowd.warmCrowdAssets();

    try {
        assert.equal(loaded.size, 2);
        assert.equal(people.filter(replacement).length, 18);
        assert.equal(replacement(soldier), undefined, 'soldiers must stay procedural');
        assert.equal(replacement(cancelled), undefined, 'late loading must not revive a released person');
        assert.equal(people[18].pel.visible, true);
        assert.equal(people[0].pel.visible, false);
        const mesh = skinnedMesh(replacement(people[0]));
        const other = skinnedMesh(replacement(people[2])); // Same source variant.
        assert.ok(mesh && other);
        assert.equal(mesh.geometry, other.geometry, 'immutable geometry should be shared');
        assert.notEqual(mesh.skeleton, other.skeleton);
        assert.notEqual(mesh.skeleton.bones[0], other.skeleton.bones[0]);

        const bone = mesh.skeleton.bones.find(candidate => candidate.name.includes('UpperLeg'));
        const before = bone.quaternion.clone();
        crowd.updateCrowdHuman(people[0], .1, 5.4, 'panic');
        crowd.updateCrowdHuman(people[0], .1, 5.4, 'panic');
        assert.ok(bone.quaternion.angleTo(before) > .01, 'run must move the actual skeleton');
        const source = loaded.get('casual-male');
        const expected = cloneSkeleton(source.scene);
        const expectedMixer = new AnimationMixer(expected);
        expectedMixer.clipAction(source.animations.find(clip => clip.name === 'Run')).play();
        expectedMixer.update(.2);
        const expectedBone = skinnedMesh(expected).skeleton.bones.find(candidate => candidate.name === bone.name);
        assert.ok(bone.quaternion.angleTo(expectedBone.quaternion) < .00001,
            'running must evaluate the authored Run clip at the expected speed');
        expectedMixer.stopAllAction();
        expectedMixer.uncacheRoot(expected);

        let sharedDisposals = 0;
        for (const gltf of loaded.values()) gltf.scene.traverse(object => {
            object.geometry?.addEventListener('dispose', () => sharedDisposals++);
            for (const material of Array.isArray(object.material) ? object.material : [object.material])
                material?.addEventListener('dispose', () => sharedDisposals++);
        });
        const skeletons = new Set();
        replacement(people[0]).traverse(object => {
            if (object.skeleton) skeletons.add(object.skeleton);
        });
        let boneTextureDisposals = 0;
        for (const skeleton of skeletons) {
            skeleton.computeBoneTexture();
            skeleton.boneTexture.addEventListener('dispose', () => boneTextureDisposals++);
        }
        crowd.releaseCrowdHuman(people[0]);
        crowd.releaseCrowdHuman(people[0]); // Idempotent death/cleanup calls.
        assert.equal(boneTextureDisposals, skeletons.size);
        assert.equal(people[0].pel.visible, true);
        assert.equal(people[0].hiddenLimb.visible, false, 'existing severed/hidden limbs must stay hidden');
        crowd.updateCrowdHuman(people[18], .016, 1.15, 'walk');
        assert.equal(people.filter(replacement).length, 18, 'death must free a slot for another person');
        assert.equal(people[18].pel.visible, false);
        crowd.disposeCrowdAssets({ S: scene, hum: people });
        assert.equal(people.filter(replacement).length, 0);
        assert.ok(people.every(h => h.pel.visible));
        assert.equal(sharedDisposals, 0, 'per-person cleanup must preserve cached geometry/materials');
        const nextRound = human(scene);
        crowd.decorateHuman(nextRound);
        assert.ok(replacement(nextRound), 'round cleanup must release model capacity');
        crowd.releaseCrowdHuman(nextRound);
    } finally {
        crowd.disposeCrowdAssets(scene);
    }
});

test('offline crowd loading resolves and retains playable procedural civilians', async t => {
    t.mock.method(GLTFLoader.prototype, 'loadAsync', async () => { throw new Error('offline test'); });
    const crowd = await import('../src/game/crowdAssets.js?offline-test');
    const scene = new Scene(), h = human(scene);
    crowd.decorateHuman(h);
    await crowd.warmCrowdAssets();
    crowd.updateCrowdHuman(h, .016, 5.4, 'panic');
    assert.equal(h.pel.visible, true);
    assert.equal(replacement(h), undefined);
    crowd.disposeCrowdAssets({ S: scene, hum: [h] });
});
