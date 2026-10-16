import { AnimationMixer, Box3, Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';

// Model geometry/materials belong to these cached templates. Per-person skeletons,
// bone textures and mixers belong to the person and are released independently.
const MODEL_NAMES = ['casual-male', 'casual-female'];
const MAX_MODELS = 18;
const states = new Map();
let templates = [];
let warming;
let nextVariant = 0;
let liveModels = 0;

export function warmCrowdAssets() {
    if (warming) return warming;
    const loader = new GLTFLoader();
    const base = import.meta.env?.BASE_URL || '/';
    warming = Promise.allSettled(MODEL_NAMES.map(async name => {
        const gltf = await loader.loadAsync(`${base}assets/characters/${name}.glb`);
        gltf.scene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(gltf.scene, true);
        const height = bounds.max.y - bounds.min.y;
        if (!Number.isFinite(height) || height <= 0) throw new Error('Invalid character bounds');
        return { scene: gltf.scene, clips: gltf.animations, scale: 1.75 / height,
            floor: bounds.min.y, centerX: (bounds.min.x + bounds.max.x) / 2,
            centerZ: (bounds.min.z + bounds.max.z) / 2 };
    })).then(results => {
        templates = results.filter(result => result.status === 'fulfilled').map(result => result.value);
        // Failed or blocked asset requests leave every original person playable.
        for (const [human, state] of states) attach(human, state);
    });
    return warming;
}

function attach(h, state) {
    if (state.model || !templates.length || liveModels >= MAX_MODELS || !h.m.parent) return;
    const template = templates[state.variant % templates.length];
    const model = cloneSkeleton(template.scene);
    const wrapper = new Group();
    wrapper.name = 'Animated civilian';
    wrapper.userData.crowdAsset = true;
    wrapper.scale.setScalar(template.scale);
    model.position.x -= template.centerX;
    model.position.y -= template.floor;
    model.position.z -= template.centerZ;
    model.traverse(object => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        // The original kill path only disposes geometry marked "own".
        object.userData.own = 0;
        // Animation can move skinned vertices beyond the initial bounds.
        object.frustumCulled = false;
    });
    wrapper.add(model);
    const mixer = new AnimationMixer(model);
    const actions = {};
    for (const clip of template.clips) {
        const name = clip.name.split('|').pop().toLowerCase();
        if (['idle', 'walk', 'run'].includes(name)) actions[name] = mixer.clipAction(clip);
    }
    Object.assign(state, { model, wrapper, mixer, actions, action: null });
    // Retain all procedural limb references for the existing gore and severing.
    state.fallback = h.m.children.map(object => [object, object.visible]);
    for (const [object] of state.fallback) object.visible = false;
    h.m.add(wrapper);
    liveModels++;
    animate(state, h, 0, 0, 'idle');
}

export function decorateHuman(h) {
    if (!h?.m || h.sol || states.has(h)) return;
    const state = { variant: nextVariant++, phase: Number(h.ph0) || 0 };
    states.set(h, state);
    attach(h, state);
    void warmCrowdAssets();
}

function animate(state, h, dt, speed, mode) {
    const moving = mode !== 'trip' && speed > .15;
    const name = moving ? (speed > 3.4 ? 'run' : 'walk') : 'idle';
    const action = state.actions[name] || state.actions.walk || state.actions.idle;
    if (action && action !== state.action) {
        const previous = state.action;
        action.reset().setEffectiveWeight(1).play();
        if (previous) action.crossFadeFrom(previous, .18, false);
        else action.time = (state.phase % action.getClip().duration);
        state.action = action;
    }
    if (action) {
        action.timeScale = name === 'run' ? Math.min(1.65, Math.max(.65, speed / 5.4))
            : name === 'walk' ? Math.min(1.6, Math.max(.6, speed / 1.15)) : 1;
        state.mixer.update(dt);
        state.wrapper.position.y = 0;
    } else {
        // No synthetic skeleton or invented clip: this also supports a future
        // unanimated replacement without freezing it completely during movement.
        state.phase += dt * speed * 5;
        state.wrapper.position.y = moving ? Math.abs(Math.sin(state.phase)) * .035 : 0;
    }
    state.wrapper.rotation.x = mode === 'panic' ? .08 : 0;
}

export function updateCrowdHuman(h, dt, speed, mode) {
    const state = states.get(h);
    if (!state) return;
    if (!state.model) attach(h, state);
    if (state.model) animate(state, h, Math.max(0, Math.min(.1, dt || 0)), Math.max(0, speed || 0), mode);
}

export function releaseCrowdHuman(h) {
    const state = states.get(h);
    if (!state) return;
    states.delete(h);
    if (!state.model) return;
    state.mixer.stopAllAction();
    state.mixer.uncacheRoot(state.model);
    const skeletons = new Set();
    state.model.traverse(object => {
        if (object.skeleton) skeletons.add(object.skeleton);
    });
    skeletons.forEach(skeleton => skeleton.dispose());
    state.wrapper.removeFromParent();
    for (const [object, visible] of state.fallback) object.visible = visible;
    liveModels--;
}

// Call BEFORE the game's generic scene-resource disposal: template resources are
// deliberately shared across rounds and must not be disposed with one scene.
export function disposeCrowdAssets(g) {
    const scene = g?.S || g;
    for (const [human] of states) {
        let parent = human.m;
        while (parent && parent !== scene) parent = parent.parent;
        if (!scene || parent === scene || g?.hum?.includes(human)) releaseCrowdHuman(human);
    }
}
