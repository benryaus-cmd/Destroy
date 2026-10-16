import * as THREE from 'three';
import {attachCharacterTrial,updateCharacterTrial,disposeCharacterTrials,getCharacterTrialResources} from './characterTrials.js';
import {archetype} from './archetypes.js';
import {updateCarriedActor} from './carrying.js';
import {warmCityAssets,disposeCityAssets,getCitySharedResources,hitCityDecor,updateCityDecor} from './cityAssets.js';
import {clearSlamRecoveryPose,applySlamRecoveryPose} from './jumpLanding.js';
import {stepWreckMotion} from './throwPhysics.js';
import { reportScore } from '@aippy/runtime/leaderboard';
import {createDestructibleBuilding,damageBuilding,serializeBuilding,getBuildingIntegrity,getBuildingSections} from './destruction.js';
import {applyScreenSteering} from './steering.js';
import {createOcclusionOutlines} from './occlusionOutlines.js';
import {moveWithBuildingCollision,resolveBuildingOverlap} from './buildingCollision.js';
import {withCameraInteriorCutaways} from './cameraInterior.js';
import {cameraStep} from './cameraRig.js';
import {cleanupDistant,releaseHumanInteraction} from './cleanup.js';
import {beginFeeding,advanceFeeding,chompPose} from './feeding.js';
import {createEndlessCity} from './endlessCity.js';
import {seededRandom,canGroundAttack,bulletHitsBody} from './actions.js';
import {warmCrowdAssets,decorateHuman,updateCrowdHuman,releaseCrowdHuman,disposeCrowdAssets} from './crowdAssets.js';
import {campaign,tuning,runProgress,resetRunCity,renderUpgrades,initializeSystems,mutationConfig,pendingResume,prepareGame,applyGrowth,event as conquestEvent,noteBuilding,saveCity,finishRun,refreshCampaignUI,action,clearActionInputs,updateSystems,damageEnemies,collisionSection,sound} from './conquestRuntime.js';

/* eslint-disable */
// Monster Maker Rampage — combined engine (part 1 + part 2)
const $ = i => document.getElementById(i),
    R = (a, b) => a + Math.random() * (b - a),
    H = Math.hypot,
    T3 = THREE,
    PI = Math.PI,
    pick = a => a[(Math.random() * a.length) | 0];
const colC = {},
    Cc = h => colC[h] || (colC[h] = new T3.Color(h).convertSRGBToLinear());
const MS = (h, o) => new T3.MeshStandardMaterial(Object.assign({
    color: Cc(h).clone(),
    roughness: .8
}, o || {}));
const SH = (o, c=1, r=1) => {
    o.traverse(k => {
        if (k.isMesh) {
            k.castShadow = !!c;
            k.receiveShadow = !!r
        }
    });
    return o
};
const DEF = {
    name: 'Munchy',
    body: 0,
    size: 1,
    fat: 1,
    headSize: 1,
    eyes: 2,
    teeth: 6,
    horns: 2,
    hornLen: .5,
    arms: 2,
    armLen: 1,
    legs: 2,
    tail: 1,
    spikes: 5,
    wings: 0,
    clawLen: 1,
    footSize: 1,
    pattern: 1,
    patCol: '#4a2aa8',
    patScale: 1,
    patSeed: 7,
    bodyCol: '#7c4dff',
    bellyCol: '#ffd54f',
    eyeCol: '#ffffff',
    accCol: '#ff5c8a',
    best: 0,
    parts: {}
};
const SL = [['body', 'Shape', 0, 3, 1, 0], ['size', 'Size', .6, 2.2, .05, 0], ['fat', 'Chubby', .6, 1.8, .05, 0], ['headSize', 'Head size', .5, 1.8, .05, 0], ['eyes', 'Eyes', 1, 5, 1, 1], ['teeth', 'Teeth', 0, 12, 1, 1], ['horns', 'Horns', 0, 6, 1, 1], ['hornLen', 'Horn length', .2, 1.2, .05, 1], ['arms', 'Arms', 0, 4, 1, 2], ['armLen', 'Arm length', .5, 1.8, .05, 2], ['legs', 'Legs', 2, 6, 2, 2], ['clawLen', 'Claw length', .4, 2.2, .1, 2], ['footSize', 'Foot size', .6, 1.8, .05, 2], ['tail', 'Tail', 0, 2, .1, 2], ['spikes', 'Spikes', 0, 9, 1, 2], ['wings', 'Wings', 0, 1.5, .1, 2], ['patScale', 'Pattern size', .5, 2.5, .1, 3]];
const CL = [['bodyCol', 'Body'], ['patCol', 'Pattern'], ['bellyCol', 'Belly'], ['eyeCol', 'Eyes'], ['accCol', 'Feet / horns / spikes']],
    TABS = ['Body', 'Face', 'Limbs', 'Skin', 'Pose'];
function stats(c) {
    return {
        sp: Math.max(.7, Math.min(1.5, 1.25 - .28 * (c.size - 1) - .2 * (c.fat - 1) + .04 * (c.legs - 2) + (c.wings > 0 ? .1 : 0))),
        hp: Math.round(90 + c.size * 45 + c.fat * 35),
        bite: +(1 + (c.headSize - 1) * .5 + c.teeth * .03).toFixed(2),
        smash: +(.8 + c.arms * .15 + c.armLen * .2 + (c.size - 1) * .2).toFixed(2)
    }
}
let slots = [null, null, null, null, null];
try {
    const s = JSON.parse(localStorage.getItem('mmr5'));
    if (Array.isArray(s))
        slots = [0, 1, 2, 3, 4].map(i => s[i] && typeof s[i] == 'object' ? s[i] : null)
} catch (e) {}
const persist = () => {
    try {
        localStorage.setItem('mmr5', JSON.stringify(slots))
    } catch (e) {}
};
let GORE_ENABLED = true,
    GORE_INTENSITY = .7;
try {
    const goreSetting = localStorage.getItem('mmr-gore-enabled');
    const goreAmount = localStorage.getItem('mmr-gore-intensity');
    if (goreSetting !== null)
        GORE_ENABLED = goreSetting === 'true';
    if (goreAmount !== null && Number.isFinite(Number(goreAmount)))
        GORE_INTENSITY = Math.max(0, Math.min(1, Number(goreAmount) / 100));
} catch {}
const COARSE = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches),
    LOWMEM = !!((navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
const rd = (() => {
    try {
        return new T3.WebGLRenderer({
            canvas: $('c'),
            antialias: !(COARSE && LOWMEM),
            powerPreference: 'high-performance'
        })
    } catch (e) {
        document.body.insertAdjacentHTML('beforeend', '<div style="position:fixed;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font:16px system-ui;color:#fff;background:#0a0612;z-index:99">This game needs WebGL, which is turned off or not supported on this browser or device.<br>Try updating your browser or enabling hardware acceleration.</div>');
        throw e
    }
})();
$('c').addEventListener('webglcontextlost', e => {
    e.preventDefault();
    try {
        toast('Graphics reset — recovering…')
    } catch (_) {}
});
rd.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
rd.outputColorSpace = T3.SRGBColorSpace;
rd.toneMapping = T3.ACESFilmicToneMapping;
rd.toneMappingExposure = 1.1;
rd.shadowMap.enabled = true;
rd.shadowMap.type = T3.PCFSoftShadowMap;
const cam = new T3.PerspectiveCamera(52, 1, .1, 900);
function rs() {
    rd.setSize(innerWidth, innerHeight);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix()
}
addEventListener('resize', rs);
rs();
function sky(top, bot, r=700) {
    return new T3.Mesh(new T3.SphereGeometry(r, 24, 12), new T3.ShaderMaterial({
        side: T3.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
            t: {
                value: new T3.Color(top)
            },
            b: {
                value: new T3.Color(bot)
            }
        },
        vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: 'uniform vec3 t,b;varying vec3 p;void main(){float h=clamp(normalize(p).y*1.7,0.,1.);gl_FragColor=vec4(mix(b,t,pow(h,.65)),1.);}'
    }))
}
function tex(f, w=64) {
    const c = document.createElement('canvas');
    c.width = c.height = w;
    f(c.getContext('2d'), w);
    const t = new T3.CanvasTexture(c);
    t.encoding = T3.sRGBEncoding;
    t.wrapS = t.wrapT = T3.RepeatWrapping;
    t.anisotropy = 4;
    return t
}
const grassT = tex((x, w) => {
        x.fillStyle = '#5a9a42';
        x.fillRect(0, 0, w, w);
        for (let i = 0; i < 700; i++) {
            x.fillStyle = 'hsl(' + (90 + Math.random() * 30) + ',45%,' + (30 + Math.random() * 18) + '%)';
            x.fillRect(Math.random() * w, Math.random() * w, 2, 3)
        }
    }, 128),
    lawnT = tex((x, w) => {
        x.fillStyle = '#74b85a';
        x.fillRect(0, 0, w, w);
        for (let i = 0; i < 500; i++) {
            x.fillStyle = 'hsl(' + (95 + Math.random() * 25) + ',50%,' + (38 + Math.random() * 16) + '%)';
            x.fillRect(Math.random() * w, Math.random() * w, 2, 3)
        }
    }, 128),
    roadT = tex((x, w) => {
        x.fillStyle = '#353940';
        x.fillRect(0, 0, w, w);
        for (let i = 0; i < 520; i++) {
            const tone = 48 + Math.random() * 32 | 0;
            x.fillStyle = 'rgba(' + tone + ',' + tone + ',' + tone + ',.22)';
            const size = Math.random() * 1.5 + .5;
            x.fillRect(Math.random() * w, Math.random() * w, size, size)
        }
        for (let i = 0; i < 18; i++) {
            x.fillStyle = 'rgba(13,16,22,.08)';
            x.fillRect(0, i * 8, w, 1)
        }
    }),
    winT = [0, 1].map(l => tex((x, w) => {
        x.fillStyle = '#fff';
        x.fillRect(0, 0, w, w);
        x.fillStyle = '#cfcfcf';
        x.fillRect(0, w - 4, w, 4);
        x.fillStyle = '#fff';
        x.fillRect(w * .26, w * .2, w * .48, w * .56);
        x.fillStyle = l ? '#ffd77a' : '#6f8fb5';
        x.fillRect(w * .3, w * .24, w * .4, w * .48);
        x.fillStyle = '#fff';
        x.fillRect(w * .49, w * .24, w * .03, w * .48);
        x.fillRect(w * .3, w * .46, w * .4, w * .03);
        x.fillStyle = '#9a9a9a';
        x.fillRect(w * .24, w * .76, w * .52, w * .05)
    })),
    shopT = tex((x, w) => {
        x.fillStyle = '#fff';
        x.fillRect(0, 0, w, w);
        x.fillStyle = '#d6d6d6';
        x.fillRect(0, w - 5, w, 5);
        x.fillStyle = '#fff';
        x.fillRect(w * .08, w * .2, w * .84, w * .62);
        const g = x.createLinearGradient(0, 0, 0, w);
        g.addColorStop(0, '#9fd0ef');
        g.addColorStop(1, '#4d7ea6');
        x.fillStyle = g;
        x.fillRect(w * .12, w * .25, w * .76, w * .52);
        x.fillStyle = '#fff';
        [.34, .5, .66].forEach(a => x.fillRect(w * a, w * .25, w * .03, w * .52))
    });
function wallM(t, col, rx, ry) {
    const x = t.clone();
    x.needsUpdate = true;
    x.repeat.set(rx, ry);
    return MS(col, {
        map: x,
        roughness: .85
    })
}

/* ---------- monster ---------- */
const ENV = null;
const skinBump = tex((x, w) => {
        x.fillStyle = '#707070';
        x.fillRect(0, 0, w, w);
        for (let r = 0; r < 17; r++)
            for (let c = 0; c < 9; c++) {
                const px = c * 16 + (r % 2) * 8,
                    py = r * 8,
                    g = x.createRadialGradient(px, py, 0, px, py, 9);
                g.addColorStop(0, '#fff');
                g.addColorStop(.7, '#9a9a9a');
                g.addColorStop(1, '#202020');
                x.fillStyle = g;
                x.beginPath();
                x.arc(px, py, 9, 0, 6.3);
                x.fill()
            }
    }, 128),
    ridgeBump = tex((x, w) => {
        x.fillStyle = '#808080';
        x.fillRect(0, 0, w, w);
        for (let y = 0; y < w; y += 16) {
            const g = x.createLinearGradient(0, y, 0, y + 16);
            g.addColorStop(0, '#fff');
            g.addColorStop(.5, '#888');
            g.addColorStop(1, '#222');
            x.fillStyle = g;
            x.fillRect(0, y, w, 16)
        }
    }, 64);
skinBump.repeat.set(4, 3);
ridgeBump.repeat.set(1, 3);
const patCache = {};
function patTex(c) {
    const key = [c.bodyCol, c.patCol, c.pattern, c.patSeed, c.patScale].join('|');
    if (patCache[key])
        return patCache[key];
    if (Object.keys(patCache).length > 40)
        for (const k in patCache) {
            patCache[k].dispose();
            delete patCache[k]
        }
    const t = tex((x, w) => {
        let s = ((c.patSeed | 0) * 2654435761 + c.pattern * 97) >>> 0;
        const rn = () => {
                s = s + 0x6D2B79F5 | 0;
                let q = Math.imul(s ^ s >>> 15, 1 | s);
                q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q;
                return ((q ^ q >>> 14) >>> 0) / 4294967296
            },
            r = (a, b) => a + rn() * (b - a),
            sc = c.patScale;
        x.fillStyle = c.bodyCol;
        x.fillRect(0, 0, w, w);
        x.fillStyle = c.patCol;
        x.strokeStyle = c.patCol;
        x.lineCap = 'round';
        const dr = f => {
            for (const ox of [-w, 0, w])
                for (const oy of [-w, 0, w]) {
                    x.save();
                    x.translate(ox, oy);
                    f();
                    x.restore()
                }
        };
        switch (c.pattern) {
        case 1:
            {
                const n = Math.round(40 / sc / sc);
                for (let i = 0; i < n; i++) {
                    const px = r(0, w),
                        py = r(0, w),
                        q = r(6, 20) * sc,
                        rot = r(0, 3),
                        k = r(.6, 1);
                    dr(() => {
                        x.beginPath();
                        x.ellipse(px, py, q, q * k, rot, 0, 6.3);
                        x.fill()
                    })
                }
                break
            }
        case 2:
            {
                const n = Math.max(3, Math.round(10 / sc));
                for (let i = 0; i < n; i++) {
                    const px = i * w / n + r(-4, 4),
                        ww = r(8, 16) * sc,
                        ph = r(0, 6);
                    dr(() => {
                        x.beginPath();
                        for (let y = 0; y <= w; y += 8) {
                            const xx = px + Math.sin(y * .05 + ph) * 8 + ww / 2;
                            y ? x.lineTo(xx, y) : x.moveTo(xx, y)
                        }
                        for (let y = w; y >= 0; y -= 8)
                            x.lineTo(px + Math.sin(y * .05 + ph) * 8 - ww / 2, y);
                        x.closePath();
                        x.fill()
                    })
                }
                break
            }
        case 3:
            {
                const n = Math.max(3, Math.round(6 / sc));
                for (let i = 0; i < n; i++) {
                    const py = i * w / n + r(-3, 3),
                        hh = r(10, 20) * sc;
                    dr(() => x.fillRect(0, py, w, hh))
                }
                break
            }
        case 4:
            {
                for (let i = 0; i < 46; i++) {
                    const px = r(0, w),
                        py = r(0, w),
                        q = r(14, 34) * sc,
                        dk = i > 28,
                        pts = [];
                    for (let k = 0; k < 9; k++)
                        pts.push(q * r(.6, 1.1));
                    x.fillStyle = dk ? 'rgba(0,0,0,.35)' : c.patCol;
                    dr(() => {
                        x.beginPath();
                        pts.forEach((rd2, k) => {
                            const a = k / 9 * 6.283,
                                X = px + Math.cos(a) * rd2,
                                Y = py + Math.sin(a) * rd2;
                            k ? x.lineTo(X, Y) : x.moveTo(X, Y)
                        });
                        x.closePath();
                        x.fill()
                    })
                }
                break
            }
        case 5:
            {
                const n = Math.round(22 / sc / sc);
                x.lineWidth = 5 * sc;
                for (let i = 0; i < n; i++) {
                    const px = r(0, w),
                        py = r(0, w),
                        q = r(10, 17) * sc,
                        st = r(0, 6);
                    dr(() => {
                        for (let a = 0; a < 3; a++) {
                            x.beginPath();
                            x.arc(px, py, q, st + a * 2.1, st + a * 2.1 + 1.5);
                            x.stroke()
                        }
                        x.beginPath();
                        x.arc(px, py, q * .25, 0, 6.3);
                        x.fill()
                    })
                }
                break
            }
        case 6:
            {
                for (let i = 0; i < 260; i++) {
                    const px = r(0, w),
                        py = r(0, w),
                        q = r(1, 3) * sc;
                    x.beginPath();
                    x.arc(px, py, q, 0, 6.3);
                    x.fill()
                }
                break
            }
        case 7:
            {
                const n = Math.max(2, Math.round(w / (34 * sc))),
                    cell = w / n;
                for (let i = 0; i < n; i++)
                    for (let j = 0; j < n; j++)
                        if ((i + j) % 2 == 0) {
                            x.beginPath();
                            x.moveTo(i * cell, j * cell - cell * .45);
                            x.lineTo(i * cell + cell * .45, j * cell);
                            x.lineTo(i * cell, j * cell + cell * .45);
                            x.lineTo(i * cell - cell * .45, j * cell);
                            x.closePath();
                            x.fill()
                        }
                break
            }
        case 8:
            {
                const n = Math.round(9 / sc / sc);
                x.lineWidth = 4 * sc;
                for (let i = 0; i < n; i++) {
                    const px = r(0, w),
                        py = r(0, w),
                        dir = rn() < .5 ? 1 : -1;
                    dr(() => {
                        x.beginPath();
                        for (let a = 0; a < 11; a += .3) {
                            const q = a * 2.2 * sc;
                            x.lineTo(px + Math.cos(a * dir) * q, py + Math.sin(a * dir) * q)
                        }
                        x.stroke()
                    })
                }
                break
            }
        case 9:
            {
                x.lineWidth = 3 * sc;
                x.globalAlpha = .75;
                const cl = 26 * sc;
                for (let j = -1; j <= w / (cl * 1.5) + 1; j++)
                    for (let i = -1; i <= w / (cl * 1.75) + 1; i++) {
                        const cx = i * cl * 1.75 + (j & 1) * cl * .875,
                            cy = j * cl * 1.5;
                        x.beginPath();
                        for (let k = 0; k < 6; k++) {
                            const a = k * PI / 3 + PI / 6;
                            k ? x.lineTo(cx + Math.cos(a) * cl, cy + Math.sin(a) * cl) : x.moveTo(cx + Math.cos(a) * cl, cy + Math.sin(a) * cl)
                        }
                        x.closePath();
                        x.stroke()
                    }
                x.globalAlpha = 1;
                break
            }
        }
        for (let i = 0; i < 70; i++) {
            x.fillStyle = 'rgba(0,0,0,' + r(.03, .09) + ')';
            x.beginPath();
            x.ellipse(r(0, w), r(0, w), r(4, 16), r(3, 10), r(0, 3), 0, 6.3);
            x.fill()
        }
    }, 256);
    t.repeat.set(2, 1.5);
    patCache[key] = t;
    return t
}
const PM = (h, o) => {
    o = Object.assign({
        color: Cc(h).clone(),
        roughness: .5,
        metalness: 0,
        clearcoat: .4,
        clearcoatRoughness: .4
    }, o || {});
    if (QUAL == 'low') {
        delete o.clearcoat;
        delete o.clearcoatRoughness;
        delete o.bumpMap;
        delete o.bumpScale;
        return new T3.MeshStandardMaterial(o)
    }
    return new T3.MeshPhysicalMaterial(o)
};
function buildMonster(c) {
    const g = new T3.Group(),
        pt = patTex(c),
        mb = PM('#ffffff', {
            map: pt,
            bumpMap: skinBump,
            bumpScale: 1.6
        }),
        mbd = PM('#ffffff', {
            map: pt,
            bumpMap: skinBump,
            bumpScale: 1.2
        }),
        ml = PM(c.bellyCol, {
            bumpMap: ridgeBump,
            bumpScale: 1.8,
            roughness: .65,
            clearcoat: .15
        }),
        ma = PM(c.accCol, {
            roughness: .3,
            clearcoat: .7,
            emissive: Cc(c.accCol).clone().multiplyScalar(.2)
        }),
        mw = PM(c.eyeCol, {
            roughness: .1,
            clearcoat: 1,
            emissive: Cc(c.eyeCol).clone().multiplyScalar(.35)
        }),
        mk = PM('#0a0a0a', {
            roughness: .2,
            clearcoat: 1
        }),
        mm = PM('#5a0f1c', {
            roughness: .45
        }),
        mt = PM('#d94a6a', {
            roughness: .5
        }),
        mc = PM('#f4ecd8', {
            roughness: .3,
            clearcoat: .6
        }),
        mg = new T3.MeshBasicMaterial({
            color: 0xffffff
        });
    mbd.color.multiplyScalar(.55);
    const A = (geo, mat, x, y, z, p) => {
            const o = new T3.Mesh(geo, mat);
            o.position.set(x, y, z);
            (p || g).add(o);
            return o
        },
        SP = (r, a=12, b=9) => new T3.SphereGeometry(r, a, b),
        CY = (a, b, h) => new T3.CylinderGeometry(a, b, h, 8),
        CO = (r, h, s=7) => new T3.ConeGeometry(r, h, s);
    const sh = [[1, 1, 1], [.8, 1.3, .8], [1.35, .8, 1.1], [1, 1, 1]][c.body],
        f = c.fat,
        bw = .8 * sh[0] * f,
        bh = .8 * sh[1],
        bd = .8 * sh[2] * f,
        LL = .8,
        by = LL + bh * .8,
        cl = c.clawLen || 1,
        fs = c.footSize || 1;
    const u = g.userData = {
        legs: [],
        arms: [],
        tail: [],
        wings: [],
        eyes: [],
        parts: {},
        po: {},
        by,
        mats: [{
            m: mb,
            o: mb.color.clone()
        }, {
            m: ml,
            o: ml.color.clone()
        }]
    };
    const po = k => {
        const o = (c.parts && c.parts[k]) || {};
        return {
            x: o.x || 0,
            y: o.y || 0,
            z: o.z || 0,
            s: o.s || 1
        }
    };
    const reg = (key, grp, x, y, z) => {
        const o = po(key);
        grp.userData.pk = key;
        grp.position.set(x + o.x, y + o.y, z + o.z);
        grp.scale.setScalar(o.s);
        u.parts[key] = {
            g: grp,
            bp: new T3.Vector3(x, y, z)
        };
        u.po[key] = o;
        return grp
    };
    /* claws, hands, feet */
    const claw = (p, x, y, z, len, rx) => {
        const k = new T3.Group();
        k.position.set(x, y, z);
        k.rotation.x = rx;
        p.add(k);
        A(CO(.05, len * .62, 6), mc, 0, len * .31, 0, k);
        const b = A(CO(.034, len * .55, 6), mc, 0, len * .62 + len * .2, .02 * len, k);
        b.rotation.x = .5;
        return k
    };
    const hand = (el, Lf) => {
        const h = new T3.Group();
        h.position.y = -Lf - .04;
        el.add(h);
        A(SP(.17, 12, 9), ma, 0, 0, 0, h).scale.set(1, .75, 1.1);
        for (let k = 0; k < 3; k++) {
            const fg = new T3.Group();
            fg.position.set((k - 1) * .09, -.07, .1);
            fg.rotation.x = -.4;
            h.add(fg);
            A(CY(.045, .04, .14), ma, 0, -.07, 0, fg);
            const kn = new T3.Group();
            kn.position.y = -.14;
            kn.rotation.x = -.5;
            fg.add(kn);
            A(CY(.04, .03, .11), ma, 0, -.055, 0, kn);
            claw(kn, 0, -.11, 0, .2 * cl, PI)
        }
        const th = new T3.Group();
        th.position.set(.14, -.03, .05);
        th.rotation.set(-.2, 0, -.8);
        h.add(th);
        A(CY(.045, .038, .12), ma, 0, -.06, 0, th);
        claw(th, 0, -.12, 0, .16 * cl, PI)
    };
    const foot = kn => {
        const f2 = new T3.Group();
        f2.position.set(0, -.36, .08);
        f2.scale.setScalar(fs);
        kn.add(f2);
        A(SP(.17, 12, 9), ma, 0, .04, -.02, f2).scale.set(1.1, .7, 1.2);
        for (let k = 0; k < 3; k++) {
            const tg = new T3.Group();
            tg.position.set((k - 1) * .1, -.02, .1);
            tg.rotation.y = (k - 1) * .42;
            f2.add(tg);
            A(CY(.06, .055, .2), ma, 0, 0, .1, tg).rotation.x = PI / 2;
            A(SP(.062, 8, 6), mbd, 0, 0, .2, tg);
            A(SP(.045, 6, 5), mk, 0, -.055, .1, tg);
            const t2 = new T3.Group();
            t2.position.set(0, 0, .2);
            t2.rotation.x = .25;
            tg.add(t2);
            A(CY(.05, .04, .14), ma, 0, -.02, .07, t2).rotation.x = PI / 2;
            claw(t2, 0, -.01, .15, .2 * cl, PI / 2 + .5)
        }
        claw(f2, 0, 0, -.17, .14 * cl, -PI / 2 - .4);
        return f2
    };
    /* torso */
    const tor = new T3.Group();
    g.add(tor);
    reg('body', tor, 0, by, 0);
    u.tor = tor;
    const body = A(c.body == 3 ? new T3.BoxGeometry(1.5, 1.5, 1.5, 3, 3, 3) : SP(.8, 28, 20), mb, 0, 0, 0, tor);
    body.scale.set(sh[0] * f, sh[1], sh[2] * f);
    A(SP(.7, 20, 14), ml, 0, -.1, bd * .45, tor).scale.set(sh[0] * f * .85, sh[1] * .85, .55);
    for (const s of [-1, 1])
        A(SP(.3, 14, 10), mb, s * bw * .8, bh * .5, -bd * .05, tor).scale.set(1, .9, 1);
    A(SP(.38, 12, 8), mbd, 0, bh * .85, bd * .15, tor);
    A(SP(.5, 14, 10), mb, 0, bh * .5, -bd * .5, tor).scale.set(sh[0] * f * .9, .8, .7);
    /* head */
    const hs = .5 * c.headSize,
        hd = new T3.Group();
    g.add(hd);
    reg('head', hd, 0, by + bh + hs * .3, bd * .2);
    u.head = hd;
    u.hy = by + bh + hs * .3;
    u.hz = bd * .2;
    A(SP(hs, 24, 16), mb, 0, hs * .1, 0, hd).scale.set(1, .9, 1);
    A(SP(hs * .55, 20, 14), mb, 0, -hs * .12, hs * .78, hd).scale.set(1, .7, 1.15);
    A(SP(hs * .5, 12, 8), mbd, 0, hs * .42, hs * .55, hd).scale.set(1.7, .38, 1);
    A(SP(hs * .5, 12, 8), mm, 0, -hs * .3, hs * .82, hd).scale.set(1.1, .32, .5);
    for (const s of [-1, 1]) {
        A(SP(hs * .06, 6, 5), mk, s * hs * .17, -hs * .02, hs * 1.37, hd);
        A(CO(hs * .22, hs * .8, 6), ma, s * hs * .95, hs * .15, -hs * .1, hd).rotation.set(-.4, 0, -s * 1.3)
    }
    const eg = new T3.Group();
    hd.add(eg);
    reg('eyes', eg, 0, 0, 0);
    const n = c.eyes,
        er = hs * (n > 3 ? .14 : .2);
    for (let i = 0; i < n; i++) {
        const x = n == 1 ? 0 : (i / (n - 1) - .5) * hs * 1.5,
            y = hs * .32 + (n > 2 && i % 2 ? hs * .2 : 0),
            z = Math.sqrt(Math.max(.01, hs * hs - x * x - (y - hs * .1) ** 2 / .81)) * .97;
        const e = new T3.Group();
        e.position.set(x, y, z);
        eg.add(e);
        A(SP(er, 14, 10), mw, 0, 0, 0, e);
        A(SP(er * .55, 10, 8), mk, 0, 0, er * .7, e).scale.set(.45, 1, .5);
        A(SP(er * .14, 6, 5), mg, er * .25, er * .3, er * .95, e);
        u.eyes.push(e);
        const br = A(new T3.BoxGeometry(er * 2.4, er * .45, er * 1.1), mbd, x, y + er * 1.2, z - er * .2, eg);
        br.rotation.z = n == 1 ? 0 : (x > 0 ? -.4 : .4);
        br.rotation.x = -.35
    }
    const nU = Math.ceil(c.teeth / 2),
        nL = c.teeth - nU,
        tz = x => hs * (1.24 - .55 * (x / hs) ** 2);
    for (let i = 0; i < nU; i++) {
        const x = (nU == 1 ? 0 : (i / (nU - 1) - .5)) * hs * .95;
        A(CO(hs * .05, hs * .2 * (i == 0 || i == nU - 1 ? 1.7 : 1), 5), mc, x, -hs * .33, tz(x), hd).rotation.x = PI
    }
    const jw = new T3.Group();
    jw.position.set(0, -hs * .32, hs * .2);
    hd.add(jw);
    u.jaw = jw;
    A(SP(hs * .7, 18, 12), mbd, 0, -hs * .16, hs * .62, jw).scale.set(1.05, .3, 1);
    A(SP(hs * .4, 10, 8), mt, 0, -hs * .05, hs * .55, jw).scale.set(1, .2, 1.1);
    for (let i = 0; i < nL; i++) {
        const x = (nL == 1 ? 0 : (i / (nL - 1) - .5)) * hs * .85;
        A(CO(hs * .05, hs * .18, 5), mc, x, hs * .08, tz(x) - hs * .22, jw)
    }
    const hg = new T3.Group();
    hd.add(hg);
    reg('horns', hg, 0, 0, 0);
    for (let i = 0; i < c.horns; i++) {
        const x = c.horns == 1 ? 0 : (i / (c.horns - 1) - .5) * hs * 1.5;
        A(CO(hs * .14, c.hornLen * hs * 2.2, 8), ma, x, hs * .85, 0, hg).rotation.z = -x / hs * .6
    }
    /* arms */
    for (let i = 0; i < c.arms; i++) {
        const side = i % 2 ? 1 : -1,
            row = i >> 1,
            p = new T3.Group(),
            La = .4 * c.armLen,
            Lf = .4 * c.armLen;
        reg('arm' + i, p, side * bw * .95, bh * .45 - row * .5, 0);
        tor.add(p);
        A(SP(.25, 12, 8), mb, 0, 0, 0, p);
        A(CY(.15, .11, La), mb, 0, -La / 2, 0, p);
        A(SP(.17, 10, 8), mb, 0, -La * .45, .06, p);
        const el = new T3.Group();
        el.position.y = -La;
        p.add(el);
        A(SP(.11, 8, 6), mbd, 0, 0, 0, el);
        A(CY(.11, .09, Lf), mb, 0, -Lf / 2, 0, el);
        hand(el, Lf);
        p.rotation.z = side * .4;
        u.arms.push({
            p,
            el,
            side
        })
    }
    /* legs */
    for (let i = 0; i < c.legs; i++) {
        const side = i % 2 ? 1 : -1,
            row = i >> 1,
            z = c.legs == 2 ? 0 : (row - (c.legs / 2 - 1) / 2) * bd * .9,
            p = new T3.Group();
        reg('leg' + i, p, side * bw * .5, .87, z);
        g.add(p);
        A(SP(.25, 12, 8), mb, 0, -.2, 0, p).scale.set(1, 1.5, 1.05);
        const kn = new T3.Group();
        kn.position.y = -.42;
        p.add(kn);
        A(SP(.13, 8, 6), mbd, 0, 0, 0, kn);
        A(CY(.15, .11, .42), mb, 0, -.21, 0, kn);
        u.legs.push({
            p,
            k: kn,
            f: foot(kn)
        })
    }
    /* tail */
    {
        let par = tor;
        const k = Math.round(c.tail * 5);
        for (let i = 0; i < k; i++) {
            const s = new T3.Group(),
                r = .32 * (1 - i / (k + 1) * .85);
            if (i == 0)
                reg('tail', s, 0, -bh * .3, -bd * .8);
            else
                s.position.set(0, 0, -.28);
            par.add(s);
            A(SP(r, 12, 8), mb, 0, 0, -.1, s);
            if (i % 2 == 0)
                A(CO(.09, .28, 5), ma, 0, r * .9, -.1, s);
            if (i == k - 1)
                A(CO(.15, .45, 6), ma, 0, 0, -.45, s).rotation.x = -PI / 2;
            u.tail.push(s);
            par = s
        }
    }
    const spk = new T3.Group();
    tor.add(spk);
    reg('spikes', spk, 0, 0, 0);
    for (let i = 0; i < c.spikes; i++) {
        const a = -.15 - (c.spikes == 1 ? 0 : i / (c.spikes - 1)) * 1.1;
        A(CO(.12, .35, 6), ma, 0, Math.cos(a) * bh * .95, Math.sin(a) * bd * .95, spk).rotation.x = a
    }
    /* wings */
    if (c.wings > 0)
        for (const side of [-1, 1]) {
            const p = new T3.Group();
            reg('wing' + (side < 0 ? 'L' : 'R'), p, side * bw * .6, bh * .45, -bd * .3);
            tor.add(p);
            const wm = new T3.Group();
            wm.rotation.x = -PI / 2;
            wm.scale.x = side;
            p.add(wm);
            const w = c.wings * 1.6,
                sp = new T3.Shape();
            sp.moveTo(0, 0);
            sp.lineTo(w, .35 * w);
            sp.lineTo(w * .95, -.1 * w);
            sp.lineTo(w * .62, -.5 * w);
            sp.lineTo(w * .3, -.35 * w);
            sp.lineTo(0, -.2 * w);
            wm.add(new T3.Mesh(new T3.ShapeGeometry(sp), PM(c.accCol, {
                side: 2,
                roughness: .5,
                transparent: true,
                opacity: .92,
                emissive: Cc(c.accCol).clone().multiplyScalar(.1)
            })));
            const bn = new T3.Mesh(new T3.CylinderGeometry(.035, .05, Math.hypot(w, .35 * w), 6), mc);
            bn.position.set(w / 2, .175 * w, 0);
            bn.rotation.z = -(PI / 2 - Math.atan2(.35, 1));
            wm.add(bn);
            u.wings.push({
                p,
                side
            })
        }
    u.radius = Math.max(bw, bd) + .15;
    u.collisionHeight = Math.max(2.5,u.hy+.65);
    return SH(g)
}
const ease = x => x * x * (3 - 2 * x);
function anim(m, t, sp, ch, sm, dt, hit, dd, feedingHeld=false) {
    dt = dt || 0;
    hit = hit || 0;
    dd = dd || 0;
    const u = m.userData,
        pb = u.po.body,
        ph0 = u.po.head;
    u.ph = (u.ph || 0) + dt * sp * (9 + sp * 2);
    const ph = u.ph,
        p = 1 - ch,
        csn = ch > 0 ? Math.sin(p * PI)*(feedingHeld?.12:1) : 0,
        sp2 = 1 - sm;
    let arm = 0,
        crouch = 0;
    if (sm > 0) {
        if (sp2 < .35) {
            const k = ease(sp2 / .35);
            arm = -2.8 * k;
            crouch = -.03 * k
        } else if (sp2 < .55) {
            const k = (sp2 - .35) / .2;
            arm = -2.8 + 3.5 * k;
            crouch = -.03 + .23 * k
        } else {
            const k = (sp2 - .55) / .45;
            arm = .7 * (1 - k);
            crouch = .2 * (1 - k)
        }
    }
    u.legs.forEach((l, i) => {
        const w = ph + (i % 2) * PI + (i >> 1) * 1.5,
            hip = Math.sin(w) * .75 * sp - crouch * .9,
            kn = Math.max(0, Math.cos(w)) * sp + .1 + crouch * 1.6;
        l.p.rotation.x = hip;
        l.k.rotation.x = kn;
        l.f.rotation.x = -(hip + kn) * .7
    });
    u.arms.forEach((a, i) => {
        const w = ph + (i % 2 ? 0 : PI),
            sw = Math.sin(w) * .65 * sp;
        a.p.rotation.x = sm > 0 ? arm : sw - csn * .7 + hit * .4;
        a.el.rotation.x = -.3 - (.5 + .5 * Math.cos(w)) * .6 * sp - (sm > 0 ? (arm < -1 ? -.3 : .6) : 0) - csn * .3;
        a.p.rotation.z = a.side * (.4 + Math.sin(t * 1.3 + i) * .04 * (1 - sp) + (sm > 0 && arm < -1 ? -.25 : 0))
    });

    u.wings.forEach(w => w.p.rotation.z = w.side * (.2 + Math.sin(t * (3 + sp * 5)) * (.28 + .2 * sp)));
    const bob = Math.abs(Math.sin(ph)) * .09 * sp - crouch * 1.2,
        lean = .12 * sp + .95 * csn + crouch * 1.2 - hit * .25,
        roll = Math.sin(ph) * .05 * sp + Math.sin(t * .8) * .02 * (1 - sp) + hit * .12 * Math.sin(t * 40),
        twist = Math.sin(ph) * .14 * sp;
    u.tor.position.set(pb.x, u.by + pb.y + bob - csn*.55, pb.z);
    u.tor.scale.set(pb.s, pb.s * (1 + Math.sin(t * 2.2) * .025 - (sm > 0 ? crouch * .2 : 0)), pb.s);
    u.tor.rotation.set(lean, twist, roll);
    const hh = u.hy - u.by, feeding=chompPose(ch,u.hy,feedingHeld);
    u.head.position.set(ph0.x, feeding.headY + ph0.y + bob, u.hz + ph0.z + feeding.forward);
    u.head.rotation.set(csn * .8 - .04 * sp - hit * .3, -twist * .6 + Math.sin(t * .6) * .3 * (1 - sp) * (1 - csn), -roll * .8);
    u.jaw.rotation.x = .12 + Math.sin(t * 2.2) * .03 + csn * 1.35 + hit * .35 + dd * .6;
    const bk = (t % 3.3) < .12 || dd > 0 ? .1 : 1;
    u.eyes.forEach(e => e.scale.y = bk)
}

/* ---------- preview scene / menu / editor ---------- */
const pS = new T3.Scene();
pS.add(sky('#150a2e', '#4a2275'));
pS.fog = new T3.Fog(Cc('#2a1450'), 40, 120);
{
    pS.add(new T3.HemisphereLight(Cc('#c7b8ff'), Cc('#3a2060'), .7));
    const k = new T3.DirectionalLight(Cc('#fff0e0'), 1.5);
    k.position.set(4, 7, 5);
    k.castShadow = true;
    k.shadow.mapSize.set(1024, 1024);
    k.shadow.camera.left = k.shadow.camera.bottom = -5;
    k.shadow.camera.right = k.shadow.camera.top = 5;
    pS.add(k);
    const p1 = new T3.PointLight(Cc('#ff3d7f'), 2.2, 18);
    p1.position.set(-4, 3, -3);
    const p2 = new T3.PointLight(Cc('#35e0ff'), 2.2, 18);
    p2.position.set(4, 2, -3);
    pS.add(p1, p2);
    const pd = new T3.Mesh(new T3.CylinderGeometry(2.3, 2.5, .3, 40), MS('#3b2d66', {
        roughness: .4,
        metalness: .3
    }));
    pd.position.y = -.15;
    pd.receiveShadow = true;
    pS.add(pd);
    const rg = new T3.Mesh(new T3.TorusGeometry(2.4, .06, 8, 48), new T3.MeshBasicMaterial({
        color: Cc('#ff3d7f')
    }));
    rg.rotation.x = PI / 2;
    rg.position.y = 0;
    pS.add(rg);
    const sp = [];
    for (let i = 0; i < 300; i++) {
        const a = R(0, 6.28),
            b = R(.1, 1.2),
            r = 380;
        sp.push(Math.cos(a) * Math.cos(b) * r, Math.sin(b) * r, Math.sin(a) * Math.cos(b) * r)
    }
    const sg = new T3.BufferGeometry();
    sg.setAttribute('position', new T3.Float32BufferAttribute(sp, 3));
    pS.add(new T3.Points(sg, new T3.PointsMaterial({
        color: 0xffffff,
        size: 2,
        fog: false
    })))
}
let pm,
    cfg = Object.assign({}, DEF),
    idx = 0,
    mode = 'menu',
    G = null,
    tab = 0,
    foc = 0,
    QPREF = (() => {
        try {
            return localStorage.getItem('mmrq') || 'auto'
        } catch (e) {
            return 'auto'
        }
    })(),
    QUAL = 'high',
    PRS = 1;
const QS = {
    high: {
        pr: 1.75,
        mp: 2.6e6,
        sh: 1536,
        hum: 46,
        par: 260,
        dbr: 240,
        dec: 170,
        pcf: T3.PCFSoftShadowMap
    },
    med: {
        pr: 1.25,
        mp: 1.5e6,
        sh: 1024,
        hum: 38,
        par: 180,
        dbr: 160,
        dec: 120,
        pcf: T3.PCFShadowMap
    },
    low: {
        pr: 1,
        mp: .8e6,
        sh: 0,
        hum: 28,
        par: 110,
        dbr: 100,
        dec: 70,
        pcf: T3.BasicShadowMap
    }
};
const autoQ = () => COARSE ? (LOWMEM ? 'low' : 'med') : (LOWMEM ? 'med' : 'high');
if (['high', 'med', 'low'].indexOf(QPREF) < 0)
    QPREF = 'auto';
QUAL = QPREF == 'auto' ? autoQ() : QPREF;
function disposeObj(o) {
    o.traverse(k => {
        if (k.geometry)
            k.geometry.dispose();
        if (k.material)
            (Array.isArray(k.material) ? k.material : [k.material]).forEach(m => m.dispose())
    })
}
const thumbs = [],
    thumbKey = [],
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    PATS = ['Plain', 'Spots', 'Stripes', 'Bands', 'Camo', 'Rosettes', 'Freckles', 'Diamonds', 'Swirls', 'Scales'],
    TI = ['body', 'face', 'limbs', 'skin', 'pose'],
    PAL = ['#7c4dff', '#ff5c8a', '#35e0ff', '#4cd964', '#ffd54f', '#ff8a30', '#e53935', '#8d6e63', '#eceff1', '#263238', '#00bfa5', '#c0ca33'];
const UI_ICONS = {
    body: '<path d="M12 3 19 7v8l-7 6-7-6V7z"/><path d="M8 11h.01M16 11h.01M9 15q3 2 6 0"/>',
    face: '<circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01M8 15q4 4 8 0"/>',
    limbs: '<path d="M12 4v7m0 0-5 5m5-5 5 5M12 11l-3-3m3 3 3-3M7 16l-2 4m2-4 3 4m7-4-2 4m2-4 2 4"/>',
    skin: '<path d="M4 5h16v14H4z"/><path d="M8 9h.01M13 8l2 2-2 2m-3 2 2 2"/>',
    pose: '<path d="M5 19 19 5M8 5h11v11"/><circle cx="7" cy="17" r="2"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"/>',
    person: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    building: '<path d="M4 21V4h11v17M15 10h5v11M8 8h3m-3 4h3m-3 4h3m7-1h1m-1 3h1M2 21h20"/>',
    car: '<path d="M3 13h18l-2-5H6zM5 13l-2 4v2h18v-2l-2-4"/><circle cx="7" cy="17" r="1"/><circle cx="17" cy="17" r="1"/>',
};
function iconMarkup(name, size=18) {
    return '<svg class="editor-action-icon" aria-hidden="true" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + UI_ICONS[name] + '</svg>'
}
const ed = {
    yaw: .5,
    pitch: .25,
    zoom: 1,
    sel: null,
    mirror: 1,
    drag: null,
    ptrs: new Map(),
    box: null,
    ctr: new T3.Vector3(0, 1.2, 0),
    rad: 3,
    pinch: 0,
    sl: {}
};
const PAIR = k => {
    const m = k.match(/^(arm|leg)(\d)$/);
    if (m)
        return m[1] + (m[2] ^ 1);
    return k == 'wingL' ? 'wingR' : k == 'wingR' ? 'wingL' : null
};
let tT;
function toast(m) {
    const e = $('toast');
    e.textContent = m;
    e.classList.add('on');
    clearTimeout(tT);
    tT = setTimeout(() => e.classList.remove('on'), 1900)
}
function banner(t) {
    const b = $('banner');
    b.textContent = t;
    b.classList.remove('on');
    void b.offsetWidth;
    b.classList.add('on')
}
function applyQual() {
    const q = QS[QUAL],
        w = innerWidth,
        h = innerHeight;
    let pr = Math.min(devicePixelRatio || 1, q.pr);
    pr = Math.min(pr, Math.sqrt(q.mp / (w * h)));
    pr = Math.max(.6, pr * PRS);
    if (Math.abs(rd.getPixelRatio() - pr) > .01) {
        rd.setPixelRatio(pr);
        rs()
    }
    rd.shadowMap.type = q.pcf;
    const lab = 'Graphics: ' + (QPREF == 'auto' ? 'Auto' : QPREF == 'high' ? 'High' : QPREF == 'med' ? 'Medium' : 'Low');
    ['mq', 'pq'].forEach(i => {
        const e = $(i);
        if (e)
            e.textContent = lab
    })
}
let rzT;
addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(applyQual, 200)
});
function fit() {
    if (!pm)
        return;
    pm.rotation.y = 0;
    pm.updateMatrixWorld(true);
    const bb = new T3.Box3().setFromObject(pm),
        s = bb.getSize(new T3.Vector3());
    bb.getCenter(ed.ctr);
    ed.rad = Math.max(.8, .5 * Math.hypot(s.x, s.y, s.z));
    pm.rotation.y = ed.yaw
}
function selBox() {
    if (ed.box) {
        pS.remove(ed.box);
        ed.box.geometry.dispose();
        ed.box.material.dispose();
        ed.box = null
    }
    const p = ed.sel && pm.userData.parts[ed.sel];
    if (p) {
        ed.box = new T3.BoxHelper(p.g, 0x35e0ff);
        pS.add(ed.box)
    } else
        ed.sel = null
}
function rebuild(refit=true) {
    if (pm) {
        pS.remove(pm);
        disposeObj(pm)
    }
    pm = buildMonster(cfg);
    pm.scale.setScalar(cfg.size);
    pm.rotation.y = ed.yaw;
    pS.add(pm);
    if (refit)
        fit();
    selBox()
}
const rt = new T3.WebGLRenderTarget(160, 160);
rt.texture.encoding = T3.sRGBEncoding;
function thumb(c) {
    try {
        const m = buildMonster(c),
            s = new T3.Scene();
        m.scale.setScalar(c.size);
        m.rotation.y = .5;
        m.updateMatrixWorld(true);
        const bb = new T3.Box3().setFromObject(m),
            sz = bb.getSize(new T3.Vector3()),
            ct = bb.getCenter(new T3.Vector3()),
            r = .5 * Math.hypot(sz.x, sz.y, sz.z);
        s.background = Cc('#2b2150');
        s.add(new T3.HemisphereLight(0xffffff, Cc('#665588'), 1), m);
        const d = new T3.DirectionalLight(0xffffff, 1.4);
        d.position.set(3, 5, 6);
        s.add(d);
        const cm = new T3.PerspectiveCamera(40, 1, .1, 80),
            dist = r / Math.sin(20 * PI / 180) * 1.05;
        cm.position.set(ct.x, ct.y + dist * .2, ct.z + dist);
        cm.lookAt(ct);
        rd.setRenderTarget(rt);
        rd.render(s, cm);
        rd.setRenderTarget(null);
        disposeObj(m);
        const px = new Uint8Array(160 * 160 * 4);
        rd.readRenderTargetPixels(rt, 0, 0, 160, 160, px);
        const cv = document.createElement('canvas');
        cv.width = cv.height = 160;
        const x = cv.getContext('2d'),
            im = x.createImageData(160, 160);
        for (let y = 0; y < 160; y++)
            im.data.set(px.subarray((159 - y) * 640, (160 - y) * 640), y * 640);
        x.putImageData(im, 0, 0);
        return cv.toDataURL()
    } catch (e) {
        return ''
    }
}
function show(id) {
    ['menu', 'edit', 'hud'].forEach(k => $(k).classList.toggle('on', k == id));
    $('btns').style.display = id == 'hud' ? 'flex' : 'none';
    ['over', 'pause', 'help'].forEach(k => $(k).classList.remove('on'));
    $('hint').textContent = id == 'hud' ? 'WASD / stick: walk in the screen direction · Space: chomp · E: smash · overhead camera · wheel or ＋/－: zoom · Esc: pause' : ''
}
function focusPrev() {
    cfg = Object.assign({}, DEF, slots[foc] || {});
    cfg.parts = JSON.parse(JSON.stringify(cfg.parts || {}));
    ed.sel = null;
    rebuild()
}
function menu() {
    if(G&&!G.over){if(G.endless)finishRun(G);else saveCity(G,true);}
    refreshCampaignUI();
    if (G) {
        disposeGame(G);
        G = null
    }
    show('menu');
    syncGoreControls();
    applyQual();
    if (!slots[foc]) {
        const k = slots.findIndex(x => x);
        foc = k < 0 ? 0 : k
    }
    const s = $('slots');
    s.innerHTML = '';
    slots.forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'card glass' + (c && i == foc ? ' foc' : '') + (c ? '' : ' empty');
        d.style.animationDelay = i * .05 + 's';
        const im = document.createElement('img');
        im.alt = '';
        if (c) {
            const k = JSON.stringify(c);
            if (thumbKey[i] !== k) {
                thumbs[i] = thumb(Object.assign({}, DEF, c));
                thumbKey[i] = k
            }
            im.src = thumbs[i] || ''
        } else {
            im.style.opacity = '.35';
            im.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="62" height="62"><text x="31" y="42" font-size="34" text-anchor="middle" fill="#fff8">+</text></svg>')
        }
        d.append(im);
        const m = document.createElement('div');
        m.className = 'm';
        const n = document.createElement('div');
        n.className = 'n';
        n.textContent = c ? c.name : 'Slot ' + (i + 1);
        const b = document.createElement('div');
        b.className = 'b';
        if (c) {
            const st = stats(Object.assign({}, DEF, c));
            b.textContent = 'BEST ' + (c.best || 0) + ' · HP ' + st.hp + ' · Spd ' + st.sp.toFixed(1)
        } else
            b.textContent = 'Empty — design a monster';
        m.append(n, b);
        d.append(m);
        const add = (t, f, cl) => {
            const x = document.createElement('button');
            x.textContent = t;
            x.onclick = f;
            if (cl)
                x.className = cl;
            d.append(x)
        };
        if (c) {
            add('PLAY', () => play(i));
            add('Edit', () => openEdit(i, c), 's');
            add('Delete', function() {
                if (this.textContent == 'Delete') {
                    this.textContent = 'Sure?';
                    setTimeout(() => {
                        if (this.isConnected)
                            this.textContent = 'Delete'
                    }, 2200);
                    return
                }
                slots[i] = null;
                persist();
                thumbKey[i] = null;
                toast('Monster deleted');
                menu()
            }, 'x')
        } else
            add('Create', () => openEdit(i, DEF));
        d.onclick = e => {
            if (e.target.tagName == 'BUTTON' || !c || foc == i)
                return;
            foc = i;
            focusPrev();
            document.querySelectorAll('#slots .card').forEach((x, k) => x.classList.toggle('foc', k == i))
        };
        s.append(d)
    });
    focusPrev()
}
function updBars() {
    const s = stats(cfg),
        b = [['Speed', s.sp / 1.5], ['Health', s.hp / 260], ['Bite', s.bite / 2], ['Smash', s.smash / 2.2]];
    $('bars').innerHTML = b.map(x => '<div class="bar"><span>' + x[0] + '</span><i style="--w:' + Math.round(Math.max(.05, Math.min(1, x[1])) * 100) + '%"></i></div>').join('')
}
/* ---- undo / redo ---- */
const hist = {
    a: [],
    i: -1
};
let dirty = 0,
    discard = 0;
function histUI() {
    $('eu').disabled = hist.i <= 0;
    $('er').disabled = hist.i >= hist.a.length - 1
}
function commit() {
    const s = JSON.stringify(cfg);
    if (hist.a[hist.i] === s)
        return;
    hist.a = hist.a.slice(0, hist.i + 1);
    hist.a.push(s);
    if (hist.a.length > 60)
        hist.a.shift();
    hist.i = hist.a.length - 1;
    dirty = 1;
    histUI()
}
function restore(s) {
    const nm = $('nmi').value;
    cfg = JSON.parse(s);
    cfg.name = nm || cfg.name;
    rebuild(false);
    drawCtl();
    updBars()
}
function undo() {
    if (hist.i > 0) {
        hist.i--;
        restore(hist.a[hist.i]);
        histUI()
    }
}
function redo() {
    if (hist.i < hist.a.length - 1) {
        hist.i++;
        restore(hist.a[hist.i]);
        histUI()
    }
}
/* ---- part posing ---- */
function setPart(k, o) {
    cfg.parts = cfg.parts || {};
    const set = (key, v) => {
        const u = pm.userData,
            p = u.parts[key];
        cfg.parts[key] = {
            x: v.x,
            y: v.y,
            z: v.z,
            s: v.s
        };
        if (!p)
            return;
        Object.assign(u.po[key], cfg.parts[key]);
        p.g.position.set(p.bp.x + v.x, p.bp.y + v.y, p.bp.z + v.z);
        p.g.scale.setScalar(v.s)
    };
    set(k, o);
    const pr = PAIR(k);
    if (ed.mirror && pr)
        set(pr, {
            x: -o.x,
            y: o.y,
            z: o.z,
            s: o.s
        });
    updSl()
}
function updSl() {
    const o = cfg.parts[ed.sel] || {
        x: 0,
        y: 0,
        z: 0,
        s: 1
    };
    for (const k in ed.sl)
        if (ed.sl[k])
            ed.sl[k].value = o[k]
}
function selPart(k) {
    ed.sel = k;
    selBox();
    if (mode == 'edit' && tab == 4)
        drawCtl()
}
function drawPose(p) {
    const u = pm.userData,
        nm = {
            body: 'Body',
            head: 'Head',
            eyes: 'Eyes',
            horns: 'Horns',
            spikes: 'Spikes',
            tail: 'Tail',
            wingL: 'Wing L',
            wingR: 'Wing R'
        };
    for (let i = 0; i < 4; i++)
        nm['arm' + i] = 'Arm ' + (i + 1);
    for (let i = 0; i < 6; i++)
        nm['leg' + i] = 'Leg ' + (i + 1);
    const h = document.createElement('div');
    h.className = 'tip';
    h.textContent = 'Tap a part on your monster (or choose below), then drag it. Drag empty space to spin · pinch or scroll to zoom.';
    p.append(h);
    const cw = document.createElement('div');
    cw.id = 'pats';
    Object.keys(u.parts).forEach(k => {
        const b = document.createElement('button');
        b.textContent = nm[k];
        b.className = 'chip' + (ed.sel == k ? ' on' : '');
        b.onclick = () => selPart(k);
        cw.append(b)
    });
    p.append(cw);
    if (!ed.sel || !u.parts[ed.sel])
        return;
    const o = cfg.parts[ed.sel] || {
        x: 0,
        y: 0,
        z: 0,
        s: 1
    };
    ed.sl = {};
    [['x', 'Left / right', -2, 2], ['y', 'Up / down', -2, 2], ['z', 'Forward / back', -2, 2], ['s', 'Size', .3, 2.4]].forEach(([k, l, a, b]) => {
        const r = document.createElement('div');
        r.className = 'row';
        r.innerHTML = '<label>' + l + '</label><input type="range" min="' + a + '" max="' + b + '" step=".02">';
        const i = r.children[1];
        i.value = o[k];
        i.oninput = () => {
            const c2 = Object.assign({
                x: 0,
                y: 0,
                z: 0,
                s: 1
            }, cfg.parts[ed.sel]);
            c2[k] = +i.value;
            setPart(ed.sel, c2)
        };
        i.onchange = commit;
        ed.sl[k] = i;
        p.append(r)
    });
    const bw = document.createElement('div');
    bw.className = 'brow';
    const bt = (t, f) => {
        const b = document.createElement('button');
        b.className = 's';
        b.textContent = t;
        b.onclick = f;
        bw.append(b)
    };
    bt('Mirror: ' + (ed.mirror ? 'on' : 'off'), function() {
        ed.mirror = !ed.mirror;
        this.textContent = 'Mirror: ' + (ed.mirror ? 'on' : 'off')
    });
    bt('Reset part', () => {
        setPart(ed.sel, {
            x: 0,
            y: 0,
            z: 0,
            s: 1
        });
        delete cfg.parts[ed.sel];
        const pr = PAIR(ed.sel);
        if (ed.mirror && pr)
            delete cfg.parts[pr];
        updSl();
        commit()
    });
    bt('Reset all', () => {
        cfg.parts = {};
        rebuild(false);
        drawCtl();
        commit()
    });
    p.append(bw)
}
function colorRow(p, k, l) {
    const r = document.createElement('div');
    r.className = 'row crow';
    const lb = document.createElement('label');
    lb.textContent = l;
    r.append(lb);
    const sw = document.createElement('div');
    sw.className = 'sw';
    PAL.forEach(h => {
        const b = document.createElement('button');
        b.className = 'dot' + (cfg[k].toLowerCase() == h ? ' on' : '');
        b.style.background = h;
        b.setAttribute('aria-label', h);
        b.onclick = () => {
            cfg[k] = h;
            rebuild(false);
            commit();
            drawCtl()
        };
        sw.append(b)
    });
    const ci = document.createElement('input');
    ci.type = 'color';
    ci.value = cfg[k];
    ci.className = 'dot cin';
    ci.oninput = () => {
        cfg[k] = ci.value;
        rebuild(false)
    };
    ci.onchange = () => {
        commit();
        drawCtl()
    };
    sw.append(ci);
    r.append(sw);
    p.append(r)
}
function drawCtl() {
    const T = $('tabs');
    T.innerHTML = '';
    ['Body', 'Face', 'Limbs', 'Skin', 'Pose'].forEach((n, k) => {
        const b = document.createElement('button');
        b.innerHTML = iconMarkup(TI[k]) + '<span>' + n + '</span>';
        b.className = 'tb' + (k == tab ? ' on' : '');
        b.onclick = () => {
            tab = k;
            drawCtl()
        };
        T.append(b)
    });
    const p = $('ctl');
    p.innerHTML = '';
    if (tab == 4) {
        drawPose(p);
        return
    }
    if (tab == 3) {
        const t1 = document.createElement('div');
        t1.className = 'sec';
        t1.textContent = 'Pattern';
        p.append(t1);
        const gd = document.createElement('div');
        gd.id = 'pats';
        PATS.forEach((n, i) => {
            const b = document.createElement('button');
            b.textContent = n;
            b.className = 'chip' + (cfg.pattern == i ? ' on' : '');
            b.onclick = () => {
                cfg.pattern = i;
                rebuild(false);
                commit();
                drawCtl()
            };
            gd.append(b)
        });
        p.append(gd);
        const t2 = document.createElement('div');
        t2.className = 'sec';
        t2.textContent = 'Colors';
        p.append(t2);
        CL.forEach(([k, l]) => colorRow(p, k, l))
    }
    SL.filter(s => s[5] == tab).forEach(([k, l, a, b, s]) => {
        const r = document.createElement('div');
        r.className = 'row';
        r.innerHTML = '<label>' + l + '</label><input type="range" min="' + a + '" max="' + b + '" step="' + s + '"><span></span>';
        const i = r.children[1],
            v = r.children[2];
        const up = () => {
            i.value = cfg[k];
            v.textContent = k == 'body' ? ['Blob', 'Tall', 'Wide', 'Block'][cfg[k]] : +(+cfg[k]).toFixed(2)
        };
        i.oninput = () => {
            cfg[k] = +i.value;
            up();
            rebuild(k != 'patScale' && k != 'clawLen' && k != 'footSize');
            updBars()
        };
        i.onchange = commit;
        up();
        p.append(r)
    });
    if (tab == 3) {
        const b = document.createElement('button');
        b.className = 's wide';
        b.innerHTML = iconMarkup('dice') + '<span>New pattern variation</span>';
        b.onclick = () => {
            cfg.patSeed = (Math.random() * 9999) | 0;
            rebuild(false);
            commit()
        };
        p.append(b)
    }
}
function openEdit(i, c) {
    idx = i;
    cfg = Object.assign({}, DEF, c);
    cfg.parts = JSON.parse(JSON.stringify(c.parts || {}));
    mode = 'edit';
    show('edit');
    ed.sel = null;
    ed.zoom = 1;
    ed.pitch = .25;
    rebuild();
    tab = 0;
    $('nmi').value = cfg.name;
    hist.a = [];
    hist.i = -1;
    commit();
    dirty = 0;
    discard = 0;
    drawCtl();
    updBars();
    const eb = $('eb');
    eb.innerHTML = '';
    const bt = (t, f, c) => {
        const b = document.createElement('button');
        b.innerHTML = (t == 'Random' ? iconMarkup('dice') : '') + '<span>' + t + '</span>';
        b.onclick = f;
        if (c)
            b.className = c;
        eb.append(b)
    };
    bt('Random', () => {
        SL.forEach(([k, l, a, b, s]) => {
            cfg[k] = +(a + Math.round(Math.random() * (b - a) / s) * s).toFixed(2)
        });
        CL.forEach(([k]) => cfg[k] = '#' + new T3.Color().setHSL(Math.random(), .7, .55).getHexString());
        cfg.pattern = (Math.random() * PATS.length) | 0;
        cfg.patSeed = (Math.random() * 9999) | 0;
        cfg.parts = {};
        ed.sel = null;
        rebuild();
        drawCtl();
        updBars();
        commit()
    }, 's');
    bt('Save', () => {
        saveCfg();
        toast('Saved')
    }, 's');
    bt('Save & Play', () => {
        saveCfg();
        play(idx)
    })
}
function saveCfg() {
    cfg.name = $('nmi').value.trim() || 'Monster';
    slots[idx] = JSON.parse(JSON.stringify(cfg));
    persist();
    dirty = 0;
    thumbKey[idx] = null
}
$('nmi').oninput = () => {
    cfg.name = $('nmi').value;
    dirty = 1
};
$('eb1').onclick = () => {
    if (dirty && !discard) {
        discard = 1;
        toast('Unsaved changes — tap ‹ again to discard');
        setTimeout(() => discard = 0, 2600);
        return
    }
    menu()
};
$('eu').onclick = undo;
$('er').onclick = redo;
$('mq').onclick = $('pq').onclick = () => {
    const o = ['auto', 'high', 'med', 'low'];
    QPREF = o[(o.indexOf(QPREF) + 1) % 4];
    QUAL = QPREF == 'auto' ? autoQ() : QPREF;
    PRS = 1;
    try {
        localStorage.setItem('mmrq', QPREF)
    } catch (e) {}
    applyQual();
    applyGameQual();
    toast('Graphics: ' + QPREF)
};
$('mh').onclick = () => $('help').classList.add('on');
$('hc2').onclick = () => $('help').classList.remove('on');
/* ---- editor / menu camera + interaction ---- */
const rc = new T3.Raycaster(),
    pv = new T3.Vector2();
const ndcv = e => pv.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
function editorFrame(dt, t) {
    const pose = mode == 'edit' && tab == 4;
    if (!ed.drag && !ed.ptrs.size && !pose)
        ed.yaw += dt * .6;
    pm.rotation.y = ed.yaw;
    anim(pm, t, 0, 0, 0, dt, 0, 0);
    cam.fov = 45;
    const vf = 45 * PI / 180,
        W = innerWidth,
        Hh = innerHeight,
        side = matchMedia('(orientation:landscape) and (max-height:560px)').matches;
    let px = 0,
        py = 0;
    if (mode == 'edit') {
        if (side)
            px = $('panel').offsetWidth;
        else
            py = $('panel').offsetHeight
    } else if (mode == 'menu') {
        if (side)
            px = W * .58;
        else
            py = Hh * .46
    }
    const fy = Math.max(.35, (Hh - py) / Hh),
        fx = Math.max(.3, (W - px) / W),
        hf = 2 * Math.atan(Math.tan(vf / 2) * cam.aspect),
        d = Math.max(ed.rad / Math.sin(vf / 2) / fy, ed.rad / Math.sin(hf / 2) / fx) * (mode == 'menu' ? 1.25 : 1.08) * ed.zoom;
    cam.position.set(ed.ctr.x, ed.ctr.y + Math.sin(ed.pitch) * d, ed.ctr.z + Math.cos(ed.pitch) * d);
    cam.lookAt(ed.ctr);
    if (px || py)
        cam.setViewOffset(W, Hh, px / 2, py / 2, W, Hh);
    else
        cam.clearViewOffset();
    cam.updateProjectionMatrix();
    if (ed.box && ed.sel) {
        const p = pm.userData.parts[ed.sel];
        if (p)
            ed.box.setFromObject(p.g)
    }
    rd.render(pS, cam)
}
function edDown(e) {
    if (e.target.id != 'c')
        return;
    ed.ptrs.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY
    });
    if (ed.ptrs.size == 2) {
        ed.drag = null;
        const a = [...ed.ptrs.values()];
        ed.pinch = H(a[0].x - a[1].x, a[0].y - a[1].y);
        return
    }
    if (mode == 'edit' && tab == 4) {
        rc.setFromCamera(ndcv(e), cam);
        for (const h of rc.intersectObject(pm, true)) {
            let o = h.object;
            while (o && o !== pm && !o.userData.pk)
                o = o.parent;
            if (o && o.userData.pk) {
                selPart(o.userData.pk);
                const p = pm.userData.parts[ed.sel];
                pm.updateMatrixWorld(true);
                const wp = new T3.Vector3(),
                    nr = new T3.Vector3();
                p.g.getWorldPosition(wp);
                cam.getWorldDirection(nr);
                const pl = new T3.Plane().setFromNormalAndCoplanarPoint(nr, wp),
                    p0 = new T3.Vector3();
                rc.setFromCamera(ndcv(e), cam);
                if (rc.ray.intersectPlane(pl, p0))
                    ed.drag = {
                        part: 1,
                        pl,
                        wp,
                        p0
                    };
                return
            }
        }
    }
    ed.drag = {
        orbit: 1
    }
}
function edMove(e) {
    const q = ed.ptrs.get(e.pointerId);
    if (!q)
        return;
    if (ed.ptrs.size == 2) {
        q.x = e.clientX;
        q.y = e.clientY;
        const a = [...ed.ptrs.values()],
            d = H(a[0].x - a[1].x, a[0].y - a[1].y);
        if (ed.pinch > 0 && d > 0)
            ed.zoom = clamp(ed.zoom * ed.pinch / d, .35, 2.6);
        ed.pinch = d;
        return
    }
    const dx = e.clientX - q.x,
        dy = e.clientY - q.y;
    q.x = e.clientX;
    q.y = e.clientY;
    const D = ed.drag;
    if (!D)
        return;
    if (D.orbit) {
        ed.yaw += dx * .012;
        ed.pitch = clamp(ed.pitch + dy * .006, -.3, 1.25)
    }
    else if (D.part && ed.sel) {
        rc.setFromCamera(ndcv(e), cam);
        const hit = new T3.Vector3();
        if (!rc.ray.intersectPlane(D.pl, hit))
            return;
        const p = pm.userData.parts[ed.sel];
        pm.updateMatrixWorld(true);
        const loc = p.g.parent.worldToLocal(D.wp.clone().add(hit.sub(D.p0)));
        setPart(ed.sel, {
            x: clamp(loc.x - p.bp.x, -2, 2),
            y: clamp(loc.y - p.bp.y, -2, 2),
            z: clamp(loc.z - p.bp.z, -2, 2),
            s: (cfg.parts[ed.sel] || {
                s: 1
            }).s
        })
    }
}
function edUp(e) {
    const had = ed.drag && ed.drag.part;
    ed.ptrs.delete(e.pointerId);
    if (ed.ptrs.size < 2)
        ed.pinch = 0;
    if (ed.ptrs.size <= 1)
        ed.drag = null;
    if (had && mode == 'edit')
        commit()
}
addEventListener('wheel', e => {
    if ((mode == 'edit' || mode == 'menu') && e.target.id == 'c')
        ed.zoom = clamp(ed.zoom * Math.exp(e.deltaY * .001), .35, 2.6)
}, {
    passive: true
});
$('ez1').onclick = () => ed.zoom = clamp(ed.zoom / 1.15, .35, 2.6);
$('ez2').onclick = () => ed.zoom = clamp(ed.zoom * 1.15, .35, 2.6);
$('ez3').onclick = () => {
    ed.zoom = 1;
    ed.pitch = .25
};

/* ---------- game ---------- */
const BUL_G = new T3.ConeGeometry(.11, .26, 7),
    BUL_BODY_G = new T3.CylinderGeometry(.055, .07, .34, 8),
    BUL_TRAIL_G = new T3.CylinderGeometry(.012, .075, .42, 7, 1, true),
    BUL_CORE_G = new T3.SphereGeometry(.045, 7, 5),
    BUL_M = new T3.MeshBasicMaterial({ color: Cc('#ffc64a') }),
    BUL_CORE_M = new T3.MeshBasicMaterial({ color: Cc('#fff5c7') }),
    BUL_TRAIL_M = new T3.MeshBasicMaterial({
        color: Cc('#ff7a27'), transparent: true, opacity: .68, depthWrite: false
    }),
    BUL_AXIS = new T3.Vector3(0, 1, 0),
    CT = new T3.Vector3(), TV = new T3.Vector3();
const treeFallMatrix = new T3.Matrix4(),
    treeFallPosition = new T3.Vector3(),
    treeFallScale = new T3.Vector3(),
    treeFallOffset = new T3.Vector3(),
    treeFallEuler = new T3.Euler(),
    treeFallQuaternion = new T3.Quaternion();
function sharedGameResources() {
    return {
        geometries: new Set([
            BUL_G, BUL_BODY_G, BUL_TRAIL_G, BUL_CORE_G,
            ...Object.values(CG).flatMap(car => Object.values(car)),
            ...Object.values(hG), ...Object.values(PG), boneG, ...getCharacterTrialResources().geometries,
            ...[...getCitySharedResources()].filter(r=>r.isBufferGeometry)
        ]),
        materials: new Set([
            BUL_M, BUL_CORE_M, BUL_TRAIL_M, hM, bloodM, boneM, wreckM, ...Object.values(GM), ...getCharacterTrialResources().materials, ...[...getCitySharedResources()].filter(r=>r.isMaterial)
        ]),
        textures: new Set([
            grassT, lawnT, roadT, ...winT, shopT, skinBump, ridgeBump, ...splT,
            ...Object.values(patCache), ...getCharacterTrialResources().textures, ...[...getCitySharedResources()].filter(r=>r.isTexture)
        ])
    }
}
function disposeGame(g) {
    disposeCharacterTrials(g.S);
    clearSlamRecoveryPose(g.mon);
    disposeCityAssets(g.S);
    g.occlusionFX?.dispose();
    disposeCrowdAssets(g);
    g.city?.dispose();
    const shared = sharedGameResources();
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    try {
        g.S.traverse(object => {
            if (object.geometry && !shared.geometries.has(object.geometry))
                geometries.add(object.geometry);
            const list = Array.isArray(object.material) ? object.material : [object.material];
            list.forEach(material => {
                if (!material)
                    return;
                if (!shared.materials.has(material))
                    materials.add(material);
                Object.keys(material).forEach(key => {
                    const texture = material[key];
                    if (texture && texture.isTexture && !shared.textures.has(texture))
                        textures.add(texture)
                })
            })
        });
        textures.forEach(texture => texture.dispose());
        materials.forEach(material => material.dispose());
        geometries.forEach(geometry => geometry.dispose());
        g.S.clear();
        rd.renderLists.dispose()
    } catch (error) {
        console.error('[Aippy] Game cleanup failed', error)
    }
    g.hum = [];
    g.bl = [];
    g.cars = [];
    g.parts = [];
    g.gibs = [];
    g.dec = [];
    g.dbr = [];
    g.prts = [];
    g.bul = [];
    g.rings = [];
    g.trees = [];
    g.fallingTrees = [];
    g.fires = [];
    g.buildingCells = null;
    g.treeCells = null;
    g.mmb = null;
    document.querySelectorAll('.pop').forEach(element => element.remove())
}

function applyGameQual(){if(G&&G.dl)G.dl.castShadow=QS[QUAL].sh>0}
function readPad(){const gs=navigator.getGamepads?navigator.getGamepads():[];for(let i=0;i<gs.length;i++){const p=gs[i];if(p&&p.connected){const dz=v=>Math.abs(v)<.18?0:v,b=n=>!!(p.buttons[n]&&p.buttons[n].pressed);return{x:dz(p.axes[0]||0),y:dz(p.axes[1]||0),cx:dz(p.axes[2]||0),a:b(0)||b(7),b:b(1)||b(2)||b(6),st:b(9)}}}return null}
let padSt=false;function padPause(){const p=readPad(),s=p?p.st:false;if(s&&!padSt&&G&&!G.over)pauseT();padSt=s}
const perf={t:0,n:0,cool:3,dbg:location.hash=='#debug',acc:0,f:0};
function perfAdapt(dt){if(QPREF!='auto'||G.paused||G.over)return;perf.t+=dt;perf.n++;perf.cool-=dt;if(perf.t<2.5)return;const avg=perf.t/perf.n;perf.t=0;perf.n=0;if(perf.cool>0)return;
if(avg>1/38){if(PRS>.78){PRS=Math.max(.7,PRS-.12);applyQual()}else if(QUAL!='low'){QUAL=QUAL=='high'?'med':'low';PRS=1;applyQual();applyGameQual();toast('Lowering graphics for smoother play')}perf.cool=4}}
function dbgTick(dt){perf.acc+=dt;perf.f++;if(perf.acc<.5)return;let e=$('dbg');if(!e){e=document.createElement('div');e.id='dbg';e.style.cssText='position:fixed;left:6px;bottom:6px;font:11px monospace;color:#0f0;background:#000a;padding:4px 6px;z-index:99;pointer-events:none;white-space:pre';document.body.append(e)}
const i=rd.info;e.textContent=Math.round(perf.f/perf.acc)+' fps · '+QUAL+' x'+rd.getPixelRatio().toFixed(2)+'\ncalls '+i.render.calls+' tris '+i.render.triangles+'\ngeometries '+i.memory.geometries+' textures '+i.memory.textures;perf.acc=0;perf.f=0}
function autoPause(){if(mode=='game'&&G&&!G.over&&!G.paused)pauseT()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause()});addEventListener('blur',autoPause);addEventListener('contextmenu',e=>{if(!e.target.closest?.('textarea,input'))e.preventDefault();});

const WC=['#f2e3c6','#e9c8a7','#cfe1ef','#d6e6c8','#f0c9c9','#e8e2b9','#c9d3e8'],RC=['#9c3b2e','#5b4636','#3a5a78','#6a6a72','#7a3a3a'],RED=['#8a0b0b','#b31212','#6e0808','#c01818'];
const gy=(x,z)=>{if(G?.endless)return .25;const g=G,T=g.T,P=g.P;return Math.abs(x)<T/2&&Math.abs(z)<T/2&&Math.abs(((x+T/2)%P+P)%P-P/2)<g.B/2&&Math.abs(((z+T/2)%P+P)%P-P/2)<g.B/2?.27:.04};
const BUILDING_CELL = 15;
const emptyBuildings = [];
const cellKey = (x, z) => Math.floor(x / BUILDING_CELL) + ':' + Math.floor(z / BUILDING_CELL);
function indexBuildings(g) {
    g.buildingCells = new Map();
    g.bl.forEach(building => {
        const x0 = Math.floor((building.x - building.w / 2 - 8) / BUILDING_CELL);
        const x1 = Math.floor((building.x + building.w / 2 + 8) / BUILDING_CELL);
        const z0 = Math.floor((building.z - building.d / 2 - 8) / BUILDING_CELL);
        const z1 = Math.floor((building.z + building.d / 2 + 8) / BUILDING_CELL);
        for (let x = x0; x <= x1; x++) {
            for (let z = z0; z <= z1; z++) {
                const key = x + ':' + z;
                const cell = g.buildingCells.get(key) || [];
                cell.push(building);
                g.buildingCells.set(key, cell)
            }
        }
    })
}
function nearbyBuildings(g, x, z) {
    return g.buildingCells ? g.buildingCells.get(cellKey(x, z)) || emptyBuildings : g.bl
}
function indexTrees(g) {
    g.treeCells = new Map();
    g.trees.forEach(tree => {
        const x0 = Math.floor((tree.x - 8) / BUILDING_CELL);
        const x1 = Math.floor((tree.x + 8) / BUILDING_CELL);
        const z0 = Math.floor((tree.z - 8) / BUILDING_CELL);
        const z1 = Math.floor((tree.z + 8) / BUILDING_CELL);
        for (let x = x0; x <= x1; x++) {
            for (let z = z0; z <= z1; z++) {
                const key = x + ':' + z;
                const cell = g.treeCells.get(key) || [];
                cell.push(tree);
                g.treeCells.set(key, cell)
            }
        }
    })
}
function nearbyTrees(g, x, z) {
    return g.treeCells ? g.treeCells.get(cellKey(x, z)) || emptyBuildings : g.trees
}
function inB(x,z,p){for(const b of nearbyBuildings(G,x,z))if(!b.dead&&Math.abs(x-b.x)<b.w/2+p&&Math.abs(z-b.z)<b.d/2+p)return 1}
function resolve(o,rad){return resolveBuildingOverlap(o,rad,nearbyBuildings(G,o.x,o.z));}
function mkHouse(w,d,h){return createDestructibleBuilding({w,d,h,type:h>9?'tower':'house',seed:Math.round(w*1000+d*100+h*10)});}
function mkShop(w,d,h){return createDestructibleBuilding({w,d,h,type:'shop',seed:Math.round(h*1000)});}
function mkChurch(){return createDestructibleBuilding({w:7,d:11,h:12,type:'tower',seed:7278412});}
const rr=(x0,y0,x1,y1,r)=>{const s=new T3.Shape();s.moveTo(x0+r,y0);s.lineTo(x1-r,y0);s.quadraticCurveTo(x1,y0,x1,y0+r);s.lineTo(x1,y1-r);s.quadraticCurveTo(x1,y1,x1-r,y1);s.lineTo(x0+r,y1);s.quadraticCurveTo(x0,y1,x0,y1-r);s.lineTo(x0,y0+r);s.quadraticCurveTo(x0,y0,x0+r,y0);return s};
const ext=(s,w,bv)=>{const d=w-2*bv,g=new T3.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:bv,bevelSize:bv,bevelSegments:3,curveSegments:6});g.translate(0,0,-d/2);return g};
const flat=(s,d)=>{const g=new T3.ExtrudeGeometry(s,{depth:d,bevelEnabled:false});g.translate(0,0,-d/2);return g};
const CARS={sedan:{L:4.4,W:1.82,b0:.3,b1:.95,wr:.36,cab:{x0:-1.2,x1:1.0,t0:-.75,t1:.3,y1:1.52}},
hatch:{L:3.7,W:1.72,b0:.3,b1:.95,wr:.34,cab:{x0:-1.5,x1:.85,t0:-1.4,t1:.3,y1:1.6}},
suv:{L:4.5,W:1.95,b0:.4,b1:1.08,wr:.43,rack:1,cab:{x0:-1.9,x1:1.2,t0:-1.85,t1:.65,y1:1.9}},
pickup:{L:5,W:1.95,b0:.4,b1:1.05,wr:.44,bed:1,cab:{x0:-.55,x1:1.15,t0:-.35,t1:.5,y1:1.8}},
van:{L:4.7,W:1.95,b0:.35,b1:1.05,wr:.4,van:1,cab:{x0:-2.25,x1:1.35,t0:-2.25,t1:.9,y1:2.1}}};
const CG={},GM={};
function carMats(){if(GM.glass)return GM;GM.glass=MS('#16222e',{metalness:.35,roughness:.08});GM.trim=MS('#17181b',{roughness:.65});GM.chrome=MS('#d8dde3',{metalness:.45,roughness:.3});GM.hl=MS('#fff6d8',{emissive:Cc('#fff0c0'),emissiveIntensity:1.4,roughness:.2});GM.tl=MS('#aa1010',{emissive:Cc('#ff1010'),emissiveIntensity:1.1,roughness:.3});return GM}
function carGeo(t){if(CG[t])return CG[t];const s=CARS[t],L=s.L,W=s.W,c=s.cab,I=new T3.Matrix4(),P_=[],GL=[],TR=[],CH=[],HL=[],TL=[],add=(a,g,m)=>a.push({g,m:m||I,c:new T3.Color(1,1,1)}),bx=new T3.BoxGeometry(1,1,1),lerp=(a,b,u)=>a+(b-a)*u;
if(s.bed){add(P_,ext(rr(-.4,s.b0,L/2,s.b1,.2),W,.07));add(P_,ext(rr(-L/2,s.b0,-.3,s.b1-.2,.1),W,.07));add(TR,bx,M4(-1.45,s.b1-.18,0,2.1,.05,W-.15));add(P_,bx,M4(-1.45,s.b1-.02,W/2-.05,2.1,.34,.08));add(P_,bx,M4(-1.45,s.b1-.02,-(W/2-.05),2.1,.34,.08));add(P_,bx,M4(-L/2+.04,s.b1-.02,0,.08,.34,W));add(P_,bx,M4(-.42,s.b1-.02,0,.08,.34,W))}
else add(P_,ext(rr(-L/2,s.b0,L/2,s.b1,.22),W,.07));
const w2=W-.28,yb=s.b1-.05,cs=new T3.Shape();cs.moveTo(c.x0,yb);cs.lineTo(c.x1,yb);cs.lineTo(c.t1,c.y1);cs.lineTo(c.t0,c.y1);cs.closePath();add(P_,ext(cs,w2,.05));
const sq=(xa,ya,xb,yb2,wd,front)=>{const len=Math.hypot(xb-xa,yb2-ya),g=new T3.PlaneGeometry(len*.86,wd);g.rotateX(-PI/2);const a=front?Math.atan2(ya-yb2,xa-xb):Math.atan2(yb2-ya,xb-xa);return{g,m:new T3.Matrix4().compose(new T3.Vector3((xa+xb)/2-Math.sin(a)*.04,(ya+yb2)/2+Math.cos(a)*.04,0),new T3.Quaternion().setFromEuler(new T3.Euler(0,0,a)),new T3.Vector3(1,1,1)),c:new T3.Color(1,1,1)}};
GL.push(sq(c.x1,yb,c.t1,c.y1,w2-.2,true));if(!s.van)GL.push(sq(c.x0,yb,c.t0,c.y1,w2-.2,false));
const bxs=u=>lerp(c.x0+.2,c.x1-.18,u),txs=u=>lerp(c.t0+.1,c.t1-.08,u),ys=s.b1+.02,yt=c.y1-.1,wins=s.van?[[0,.3],[.36,.62]]:[[0,.46],[.54,1]];
for(const[u0,u1]of wins){const sh=new T3.Shape();sh.moveTo(bxs(u0),ys);sh.lineTo(bxs(u1),ys);sh.lineTo(txs(u1),yt);sh.lineTo(txs(u0),yt);sh.closePath();GL.push({g:flat(sh,w2+.03),m:I,c:new T3.Color(1,1,1)})}
const wy=s.wr,wz=W/2-.12,tg=new T3.CylinderGeometry(s.wr,s.wr,.3,18),rg=new T3.CylinderGeometry(s.wr*.62,s.wr*.62,.32,12),dg=new T3.CylinderGeometry(s.wr*.45,s.wr*.45,.335,12),hg=new T3.CylinderGeometry(s.wr*.18,s.wr*.18,.345,8),ag=new T3.CylinderGeometry(s.wr*1.15,s.wr*1.15,.02,16);[tg,rg,dg,hg,ag].forEach(g=>g.rotateX(PI/2));
for(const wx of[L*.3,-L*.3])for(const sd of[-1,1]){add(TR,tg,M4(wx,wy,sd*wz));add(CH,rg,M4(wx,wy,sd*wz));add(TR,dg,M4(wx,wy,sd*wz));add(CH,hg,M4(wx,wy,sd*wz));add(TR,ag,M4(wx,wy,sd*(W/2+.012)))}
add(TR,bx,M4(L/2+.03,.4,0,.2,.22,W*.96));add(TR,bx,M4(-L/2-.03,.4,0,.2,.22,W*.96));add(TR,bx,M4(L/2+.06,s.b1-.28,0,.04,.2,W*.5));
for(const sd of[-1,1]){add(HL,bx,M4(L/2+.03,s.b1-.18,sd*.62,.05,.15,.36));add(TL,bx,M4(-L/2-.03,s.b1-.15,sd*.64,.05,.16,.4));add(TR,bx,M4(c.x1-.05,s.b1+.2,sd*(W/2+.06),.1,.1,.1));
for(const u of[.5,.95]){add(TR,bx,M4(lerp(c.x0,c.x1,u)-.2,(s.b0+s.b1)/2+.08,sd*(W/2+.005),.012,.55,.012))}add(CH,bx,M4(lerp(c.x0,c.x1,.42),s.b1-.05,sd*(W/2+.02),.14,.03,.02))}
add(CH,bx,M4(-L/2-.05,s.b0+.3,0,.02,.14,.4));
if(s.rack){const mx=(c.t0+c.t1)/2;for(const sd of[-1,1])add(CH,bx,M4(mx,c.y1+.06,sd*.6,(c.t1-c.t0)*.9,.03,.04));add(CH,bx,M4(mx,c.y1+.06,0,.04,.03,1.2))}
const mg=l=>mergeG(l);return CG[t]={paint:mg(P_),glass:mg(GL),trim:mg(TR),chrome:mg(CH),hl:mg(HL),tl:mg(TL)}}
function mkCar(){const t=pick(Object.keys(CARS)),G_=carGeo(t),M=carMats(),g=new T3.Group(),paint=MS(pick(['#c9202e','#2e6fc9','#e8c040','#eeeeee','#2a2a30','#2eaa5a','#d97a1f','#9aa3ad','#7a2a8a']),{metalness:.25,roughness:.3});
const mk=(geo,mat,gl)=>{const m=new T3.Mesh(geo,mat);if(gl)m.userData.gl=1;if(mat===paint)m.userData.ownedMaterial=1;g.add(m)};mk(G_.paint,paint);mk(G_.glass,M.glass,1);mk(G_.trim,M.trim);mk(G_.chrome,M.chrome);mk(G_.hl,M.hl,1);mk(G_.tl,M.tl,1);return SH(g)}
function addStreetDetails(scene, roads, extent) {
    const horizontalDashes = [];
    const verticalDashes = [];
    const horizontalBars = [];
    const verticalBars = [];
    for (const road of roads) {
        for (let along = -extent + 2; along < extent; along += 5.2) {
            if (roads.some(crossing => Math.abs(along - crossing) < 6))
                continue;
            horizontalDashes.push({ x: along, z: road });
            verticalDashes.push({ x: road, z: along })
        }
    }
    for (const x of roads) {
        for (const z of roads) {
            for (const side of [-1, 1]) {
                for (let stripe = 0; stripe < 5; stripe++) {
                    const offset = side * (4.6 + stripe * .62);
                    horizontalBars.push({ x: x + offset, z });
                    verticalBars.push({ x, z: z + offset })
                }
            }
        }
    }
    const addInstances = (geometry, material, points, y) => {
        const mesh = new T3.InstancedMesh(geometry, material, points.length);
        mesh.instanceMatrix.setUsage(T3.StaticDrawUsage);
        const marker = new T3.Object3D();
        points.forEach((point, index) => {
            marker.position.set(point.x, y, point.z);
            marker.updateMatrix();
            mesh.setMatrixAt(index, marker.matrix)
        });
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh)
    };
    const dashMaterial = new T3.MeshBasicMaterial({ color: Cc('#ffd23f') });
    const crosswalkMaterial = new T3.MeshBasicMaterial({ color: Cc('#e7e2d6') });
    const dashX = new T3.PlaneGeometry(2.5, .13);
    const dashZ = new T3.PlaneGeometry(.13, 2.5);
    const barZ = new T3.PlaneGeometry(.34, 5.4);
    const barX = new T3.PlaneGeometry(5.4, .34);
    [dashX, dashZ, barZ, barX].forEach(geometry => geometry.rotateX(-PI / 2));
    addInstances(dashX, dashMaterial, horizontalDashes, .052);
    addInstances(dashZ, dashMaterial, verticalDashes, .052);
    addInstances(barZ, crosswalkMaterial, horizontalBars, .054);
    addInstances(barX, crosswalkMaterial, verticalBars, .054)
}
function newGame(c){
const citySeed=(crypto.getRandomValues(new Uint32Array(1))[0]);
const random=seededRandom(citySeed),R=(a,b)=>a+random()*(b-a);
const st=stats(c),S=new T3.Scene(),N=5,B=22,P=30,T=N*P,g={S,c,st,endless:true,citySeed,humanSequence:0,bl:[],hum:[],trees:[],fallingTrees:[],cars:[],bul:[],rings:[],corp:[],fires:[],parts:[],gibs:[],dec:[],di:0,T,N,B,P,score:0,eaten:0,destroyed:0,crushed:0,kills:0,combo:0,ct:0,hp:st.hp,max:st.hp,yaw:0,pitch:.62,zd:1,lk:[0,0],cc:0,sc:0,ch:0,sm:0,shake:0,sp:0,ss:5,over:0,paused:0,base:c.size,sz:c.size,thr:1,fr:0,};G=g;
g.sky=sky('#4f8fe0','#ffd9ae');S.add(g.sky);
g.ambient=new T3.HemisphereLight(Cc('#bcd6ff'),Cc('#6f8f4f'),tuning.ambientLight);S.add(g.ambient);
const dl=new T3.DirectionalLight(Cc('#fff0d6'),1.6);dl.castShadow=QS[QUAL].sh>0;dl.shadow.mapSize.set(QS[QUAL].sh||512,QS[QUAL].sh||512);const sc=dl.shadow.camera;sc.left=sc.bottom=-55;sc.right=sc.top=55;sc.near=10;sc.far=260;dl.shadow.bias=-.0006;dl.shadow.normalBias=.06;S.add(dl,dl.target);g.dl=dl;
g.city=createEndlessCity({seed:citySeed,scene:S,makeCar:mkCar});g.city.update(0,15);g.bl=g.city.buildings;g.cars=g.city.cars;indexBuildings(g);indexTrees(g);
const mon=buildMonster(c);mon.scale.setScalar(c.size);mon.position.set(0,0,P/2);S.add(mon);g.mon=mon;
const pg2=new T3.SphereGeometry(.14,5,4);for(let i=0;i<QS[QUAL].par;i++){const m=new T3.Mesh(pg2,new T3.MeshBasicMaterial({color:0xffffff}));m.visible=false;S.add(m);g.parts.push({m,l:0,l0:1,v:new T3.Vector3(),g:14,bl:0,s:1})}
initGore(S,g);

const gg=new T3.IcosahedronGeometry(.16,0);for(let i=0;i<70;i++){const m=new T3.Mesh(gg,MS('#aa1111'));m.castShadow=true;m.visible=false;S.add(m);g.gibs.push({m,l:0,v:new T3.Vector3(),w:new T3.Vector3()})}
const dgm=new T3.BoxGeometry(1,1,1);g.dbr=[];g.di2=0;for(let i=0;i<QS[QUAL].dbr;i++){const m=new T3.Mesh(dgm,MS('#999999',{roughness:.9}));m.castShadow=QS[QUAL].sh>0;m.receiveShadow=true;m.visible=false;S.add(m);g.dbr.push({m,l:0,v:new T3.Vector3(),w:new T3.Vector3(),rest:0})}g.rg=new T3.RingGeometry(.8,1,28);
for(let i=0;i<QS[QUAL].hum;i++){let p;if(i<14){const a=R(0,6.28),d=R(3,8);p=[g.mon.position.x+Math.cos(a)*d,g.mon.position.z+Math.sin(a)*d]}else p=randPos();spawnH(p[0],p[1],0)}
for(let i=0;i<4;i++){const p=randPos(40);spawnH(p[0],p[1],1)}
return g}
function randPos(far=0){const m=G.mon?.position||{x:0,z:15};for(let i=0;i<30;i++){const angle=R(0,PI*2),distance=R(Math.max(6,far),Math.max(65,far+20)),x=m.x+Math.cos(angle)*distance,z=m.z+Math.sin(angle)*distance;if(!inB(x,z,.8))return[x,z];}return[m.x,m.z+20];}
function knockTree(tree,g) {
    if (tree.f)
        return;
    tree.f = 1;
    tree.angle = 0;
    tree.fallDir = R(0, PI * 2);
    g.fallingTrees.push(tree)
}
function setTreeInstance(tree, mesh, index, offset) {
    treeFallEuler.set(Math.sin(tree.fallDir) * tree.angle, tree.yaw, -Math.cos(tree.fallDir) * tree.angle, 'YXZ');
    treeFallQuaternion.setFromEuler(treeFallEuler);
    treeFallPosition.set(tree.x, tree.y, tree.z);
    if (offset)
        treeFallPosition.add(treeFallOffset.set(0, offset * tree.s, 0).applyQuaternion(treeFallQuaternion));
    treeFallScale.setScalar(tree.s);
    treeFallMatrix.compose(treeFallPosition, treeFallQuaternion, treeFallScale);
    mesh.setMatrixAt(index, treeFallMatrix);
    mesh.instanceMatrix.needsUpdate = true
}
function updateFallenTrees(dt, g) {
    for (let i = g.fallingTrees.length - 1; i >= 0; i--) {
        const tree = g.fallingTrees[i];
        tree.angle = Math.min(1.45, tree.angle + dt * 3);
        if (tree.m) {
            tree.m.rotation.x = Math.sin(tree.fallDir) * tree.angle;
            tree.m.rotation.z = -Math.cos(tree.fallDir) * tree.angle
        } else {
            setTreeInstance(tree, tree.trunk, tree.trunkIndex, 0);
            setTreeInstance(tree, tree.crown, tree.crownIndex, tree.crownOffset)
        }
        if (tree.angle >= 1.45)
            g.fallingTrees.splice(i, 1)
    }
}
const M4=(x,y,z,sx,sy,sz,rx,ry,rz)=>new T3.Matrix4().compose(new T3.Vector3(x,y,z),new T3.Quaternion().setFromEuler(new T3.Euler(rx||0,ry||0,rz||0)),new T3.Vector3(sx,sy,sz));
function mergeG(list){let n=0;const ps=list.map(o=>{const g=o.g.index?o.g.toNonIndexed():o.g.clone();g.applyMatrix4(o.m);n+=g.attributes.position.count;return{g,c:o.c}});const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let k=0;
for(const p of ps){const m=p.g.attributes.position.count;pos.set(p.g.attributes.position.array,k*3);nor.set(p.g.attributes.normal.array,k*3);for(let i=0;i<m;i++){col[(k+i)*3]=p.c.r;col[(k+i)*3+1]=p.c.g;col[(k+i)*3+2]=p.c.b}k+=m;p.g.dispose()}
const g=new T3.BufferGeometry();g.setAttribute('position',new T3.BufferAttribute(pos,3));g.setAttribute('normal',new T3.BufferAttribute(nor,3));g.setAttribute('color',new T3.BufferAttribute(col,3));return g}
const hG={sp:new T3.SphereGeometry(1,10,8),hd:new T3.SphereGeometry(1,16,12),cy:new T3.CylinderGeometry(1,.82,1,10),cyl:new T3.CylinderGeometry(1,1,1,10),bx:new T3.BoxGeometry(1,1,1),cn:new T3.ConeGeometry(1,1,12),dome:new T3.SphereGeometry(1,14,7,0,PI*2,0,PI/2)};
const hM=new T3.MeshStandardMaterial({vertexColors:true,roughness:.7,metalness:0});
const SK=['#ffd9b8','#f1c27d','#e0ac69','#c68642','#8d5524','#5a3a22'],HR=['#1c1209','#3b2414','#6b4a2a','#b88a3e','#d9c27a','#8a8a8a','#c0392b','#222222'],PNT=['#2a3350','#3a3f4a','#6b5a3a','#222222','#4a5a3a','#5a3a3a'],SHO=['#2a1c12','#eeeeee','#222222','#7a4a22'],IR=['#4a2f1a','#2d5a8a','#3a7a4a','#6a4a2a','#222222'];
const K=(g,m,c)=>({g,m,c:typeof c=='string'?Cc(c):c}),dkc=(h,f)=>Cc(h).clone().multiplyScalar(f);
function rollSpec(sol){const th=G.thr||1,f0=Math.random();let kind=sol?(th<3||Math.random()<.35?'p':'s'):pick(['m','m','m','f','f','f','k','o','b','b','c','j']);const f=kind=='f',
s={kind,sk:pick(SK),hr:kind=='o'?'#c9c9c9':pick(HR),iris:pick(IR),shoe:pick(SHO),top:pick(['tee','tee','long','hood','jacket']),shirt:'#'+new T3.Color().setHSL(Math.random(),.55+Math.random()*.2,.42+Math.random()*.15).getHexString(),under:'#555555',bot:'jeans',pn:pick(PNT),hs:(Math.random()*10)|0,hat:0,gl:0,beard:0,acc:null,build:pick([.92,1,1,1.12]),hk:1,sc:R(.92,1.08),bagc:pick(['#c0392b','#2c3e50','#e67e22','#8e44ad']),pc:pick(['#c0392b','#2c3e50','#e67e22','#2a6a3a']),watch:Math.random()<.3};
if(f){s.top=pick(['tee','tank','dress','hood','long']);if(s.top=='dress')s.bot='dress';else if(Math.random()<.35)s.bot='skirt';s.hs=pick([3,3,4,5,6,9,1]);s.build=pick([.88,.92,1])}
else{s.hs=pick([0,1,1,2,2,7,8]);if(Math.random()<.25)s.beard=1;if(s.top=='tee'&&Math.random()<.3)s.bot='shorts'}
if(kind=='k'){s.sc=.72;s.hk=1.28;s.hs=pick([1,2,5,6]);s.top=pick(['tee','hood']);s.bot=Math.random()<.4?'shorts':'jeans';s.build=.85;s.beard=0}
if(kind=='o'){s.hs=pick([0,1]);s.sk=pick(SK.slice(0,4));s.gl=Math.random()<.5?1:0;s.top=pick(['long','jacket']);s.beard=Math.random()<.4?1:0;s.build=.95}
if(kind=='b'){s.top='jacket';s.shirt=pick(['#1f2a44','#3a3a3f','#4a3b2a','#2a3a3a']);s.pn=s.shirt;s.hs=pick([1,2]);s.tie=pick(['#c0392b','#2c5aa0','#222222']);s.acc='case';s.shoe='#1c1410';s.gl=Math.random()<.3?1:0}
if(kind=='c'){s.top='vest';s.under=pick(['#555555','#c0c0c0']);s.hat=3;s.pn=pick(['#3a3f4a','#5a4a2a']);s.shoe='#3a2a1a';s.hs=pick([0,1]);s.beard=Math.random()<.4?1:0}
if(kind=='j'){s.top='tank';s.shirt=pick(['#ff5a36','#35e0ff','#b6ff3b']);s.bot='shorts';s.pn=pick(['#111111','#1b2a52']);s.shoe='#eeeeee';s.hat=Math.random()<.4?1:0;s.hs=pick([1,5,6,3]);s.build=.92}
if(kind=='p'){s.top='uni';s.shirt='#2a4a8a';s.pn='#16233f';s.hat=4;s.shoe='#111111';s.hs=pick([1,2]);s.gun='pistol';s.beard=0}
if(kind=='s'){s.top='uni';s.shirt='#4a5d3a';s.pn='#3b4d2f';s.hat=5;s.shoe='#1a1a1a';s.hs=1;s.gun='rifle';s.build=1.1;s.beard=0}
if(!sol&&!s.acc&&kind!='c'&&kind!='j'&&Math.random()<.35)s.acc=pick(['pack','bag','pack']);
if(!sol&&!s.gl&&Math.random()<.2)s.gl=pick([1,2]);
if(!sol&&!s.hat&&Math.random()<.18)s.hat=pick([1,2]);
return s}
function buildHuman(s){const b=s.build,hk=s.hk,hy=1.5+(hk-1)*.08,wx=.2*b,wz=.145*(.6+.4*b),sk=s.sk,skd=dkc(sk,.82),hr=s.hr,L=[],A=(g,m,c)=>L.push(K(g,m,c)),sp=hG.sp,bx=hG.bx,cy=hG.cy,cyl=hG.cyl,top=s.top,uni=top=='uni',tank=top=='tank',dtop=dkc(s.shirt,.76),tcol=top=='vest'?s.under:s.shirt;
A(cy,M4(0,1.03,0,wx,.31,wz),tcol);
if(top=='dress')A(hG.cn,M4(0,.56,0,wx*1.45,.42,wz*1.6),s.shirt);else{A(cyl,M4(0,.75,0,wx*1.03,.03,wz*1.06),s.kind=='s'?'#2a2a22':'#1c1410');A(bx,M4(0,.75,wz*1.06,.035,.028,.01),'#d4af37')}
for(const d of[-1,1])A(sp,M4(d*(wx+.015),1.3,0,.085*b,.08,.08),tank?sk:tcol);
A(cyl,M4(0,1.4,0,.055,.07,.055),sk);
if(top=='hood'){A(sp,M4(0,1.37,-wz*.75,.13,.1,.1),dtop);A(bx,M4(0,.9,wz+.005,.16,.09,.02),dtop)}
if(top=='jacket'){A(bx,M4(-.05,1.37,wz*.55,.05,.04,.045,0,0,.5),dtop);A(bx,M4(.05,1.37,wz*.55,.05,.04,.045,0,0,-.5),dtop);A(bx,M4(0,1.03,wz+.003,.01,.55,.008),'#bbbbbb')}
if(top=='vest'){A(cy,M4(0,1.06,0,wx*1.07,.27,wz*1.1),'#ff7a1a');A(cyl,M4(0,.95,0,wx*1.1,.018,wz*1.13),'#dfe6e9');A(cyl,M4(0,1.16,0,wx*1.1,.018,wz*1.13),'#dfe6e9')}
if(s.kind=='p'){A(bx,M4(-.07,1.16,wz+.005,.03,.035,.01),'#d4af37');A(bx,M4(.14,.74,.04,.05,.11,.05),'#111111');A(bx,M4(0,1.38,wz*.6,.09,.025,.03),'#e8e8e8')}
if(s.kind=='s'){A(cy,M4(0,1.1,0,wx*1.12,.2,wz*1.2),'#2a2d28');A(bx,M4(-.1,.9,wz*1.15,.07,.08,.04),'#2a2d28');A(bx,M4(.1,.9,wz*1.15,.07,.08,.04),'#2a2d28');A(bx,M4(0,1.0,-wz-.07,.2,.26,.12),'#3a4a2a');A(bx,M4(.1,1.0,wz+.08,.05,.07,.65,0,.2,0),'#1b1b1b');A(bx,M4(.12,.94,wz,.04,.14,.05),'#1b1b1b')}
if(s.tie){A(bx,M4(0,1.1,wz+.004,.03,.2,.008),s.tie);A(bx,M4(0,1.2,wz+.004,.04,.03,.01),s.tie)}
if(s.acc=='pack'){A(bx,M4(0,1.1,-wz-.07,.2*b,.3,.12),s.pc);for(const d of[-1,1])A(bx,M4(d*.1*b,1.12,wz+.003,.03,.3,.01),'#222222')}
/* head */
A(hG.hd,M4(0,hy,0,.15*hk,.17*hk,.15*hk),sk);A(hG.hd,M4(0,hy-.07*hk,.02*hk,.12*hk,.1*hk,.12*hk),sk);
for(const d of[-1,1]){A(sp,M4(d*.15*hk,hy,0,.025,.04,.02),sk);A(sp,M4(d*.052*hk,hy+.015*hk,.128*hk,.024,.02,.012),'#f4f4f4');A(sp,M4(d*.052*hk,hy+.015*hk,.138*hk,.012,.012,.008),s.iris);A(bx,M4(d*.052*hk,hy+.06*hk,.138*hk,.05,.011,.012,0,0,-d*.12),hr)}
A(sp,M4(0,hy-.01*hk,.152*hk,.022,.026,.028),skd);A(bx,M4(0,hy-.07*hk,.14*hk,.05,.01,.012),'#7a2a2a');
const dome=(sx,sy,sz,y,c)=>A(hG.dome,M4(0,y,0,sx*hk,sy*hk,sz*hk),c||hr),hs=s.hs;
if(s.hat<3){if(hs==1)dome(.17,.13,.17,hy+.04*hk);else if(hs==2){dome(.17,.13,.17,hy+.04*hk);A(bx,M4(.03,hy+.12*hk,.12*hk,.12*hk,.03,.06),hr)}
else if(hs==3){dome(.17,.13,.17,hy+.04*hk);A(sp,M4(0,hy-.12*hk,-.08*hk,.17*hk,.3,.11*hk),hr);for(const d of[-1,1])A(sp,M4(d*.14*hk,hy-.1*hk,0,.04,.18,.07),hr)}
else if(hs==4){dome(.17,.13,.17,hy+.04*hk);A(sp,M4(0,hy-.03*hk,0,.19*hk,.12*hk,.19*hk),hr)}
else if(hs==5){dome(.17,.13,.17,hy+.04*hk);A(sp,M4(0,hy,-.18*hk,.05,.05,.05),hr);A(sp,M4(0,hy-.1*hk,-.21*hk,.04,.11,.04),hr)}
else if(hs==6){dome(.17,.13,.17,hy+.04*hk);A(sp,M4(0,hy+.2*hk,-.06*hk,.065,.065,.065),hr)}
else if(hs==7){for(let i=0;i<5;i++)A(bx,M4(0,hy+.17*hk-Math.abs(i-2)*.012,(-.09+i*.045)*hk,.03,.07,.04),hr)}
else if(hs==8)A(sp,M4(0,hy+.03*hk,-.01,.23*hk,.22*hk,.23*hk),hr);
else if(hs==9){dome(.17,.13,.17,hy+.04*hk);for(const d of[-1,1])A(cyl,M4(d*.12*hk,hy-.14*hk,-.04*hk,.02,.14,.02),hr)}}
const hc=pick(['#c0392b','#2c3e50','#222222','#e8c040','#3a7a4a']);
if(s.hat==1){A(hG.dome,M4(0,hy+.05*hk,0,.175*hk,.12*hk,.175*hk),hc);A(bx,M4(0,hy+.07*hk,.17*hk,.14*hk,.015,.1),hc)}
else if(s.hat==2){A(hG.dome,M4(0,hy+.04*hk,0,.18*hk,.15*hk,.18*hk),hc);A(cyl,M4(0,hy+.05*hk,0,.18*hk,.03,.18*hk),dkc(hc,.7));A(sp,M4(0,hy+.2*hk,0,.035,.035,.035),'#eeeeee')}
else if(s.hat==3){A(hG.dome,M4(0,hy+.06*hk,0,.19*hk,.14*hk,.19*hk),'#f2c230');A(cyl,M4(0,hy+.07*hk,0,.21*hk,.014,.21*hk),'#f2c230');A(bx,M4(0,hy+.2*hk,0,.03,.02,.2),'#f2c230')}
else if(s.hat==4){A(cyl,M4(0,hy+.12*hk,0,.17*hk,.05,.17*hk),'#16233f');A(cyl,M4(0,hy+.09*hk,0,.19*hk,.02,.19*hk),'#16233f');A(bx,M4(0,hy+.085*hk,.19*hk,.14,.012,.08),'#111111');A(bx,M4(0,hy+.12*hk,.175*hk,.03,.03,.01),'#d4af37')}
else if(s.hat==5){A(hG.dome,M4(0,hy+.05*hk,0,.19*hk,.15*hk,.19*hk),'#3a4a2a');A(cyl,M4(0,hy+.06*hk,0,.215*hk,.012,.215*hk),'#3a4a2a');A(bx,M4(0,hy+.09*hk,.19*hk,.12,.02,.03),'#2a3a1a')}
if(s.gl==1){for(const d of[-1,1]){A(bx,M4(d*.052*hk,hy+.04*hk,.15*hk,.05,.006,.008),'#222222');A(bx,M4(d*.052*hk,hy-.01*hk,.15*hk,.05,.006,.008),'#222222')}A(bx,M4(0,hy+.015*hk,.15*hk,.02,.006,.008),'#222222')}
else if(s.gl==2)for(const d of[-1,1])A(bx,M4(d*.052*hk,hy+.015*hk,.15*hk,.05,.032,.01),'#0a0a0a');
if(s.beard){A(sp,M4(0,hy-.09*hk,.07*hk,.1*hk,.07,.07),hr);A(bx,M4(0,hy-.045*hk,.15*hk,.05,.012,.012),hr)}
/* legs */
const lw=.095*(.9+.1*b),bot=s.bot,bootish=uni||s.kind=='c',th=[],sn=[];
if(bot=='jeans'){th.push(K(cy,M4(0,-.18,0,lw,.36,lw),s.pn));sn.push(K(cy,M4(0,-.18,0,lw*.9,.36,lw*.9),s.pn))}
else if(bot=='shorts'){th.push(K(cy,M4(0,-.12,0,lw,.24,lw),s.pn),K(cy,M4(0,-.3,0,lw*.95,.12,lw*.95),sk));sn.push(K(cy,M4(0,-.18,0,lw*.9,.36,lw*.9),sk),K(cy,M4(0,-.3,0,lw*.93,.12,lw*.93),'#eeeeee'))}
else{th.push(K(cy,M4(0,-.18,0,lw*.95,.36,lw*.95),sk));sn.push(K(cy,M4(0,-.18,0,lw*.88,.36,lw*.88),sk));if(Math.random()<.4)sn.push(K(cy,M4(0,-.28,0,lw*.9,.16,lw*.9),pick(['#222222','#eeeeee','#5a3a3a'])))}
sn.push(K(bx,M4(0,-.39,.05,lw*1.15,.08,.25),s.shoe),K(bx,M4(0,-.425,.055,lw*1.2,.03,.265),bootish?'#0a0a0a':'#e8e8e8'));if(bootish)sn.push(K(cy,M4(0,-.28,0,lw*.97,.2,lw*.97),s.shoe));
/* arms */
const ar=.062*(.9+.1*b),shortSl=top=='tee'||top=='dress'||top=='vest'||tank,slCol=tank?sk:s.shirt,glove=s.kind=='s'?'#222222':sk,ua=[];
if(tank)ua.push(K(cy,M4(0,-.14,0,ar,.28,ar),sk));else if(shortSl)ua.push(K(cy,M4(0,-.08,0,ar*1.05,.16,ar*1.05),slCol),K(cy,M4(0,-.21,0,ar*.95,.12,ar*.95),sk));else ua.push(K(cy,M4(0,-.14,0,ar*1.05,.28,ar*1.05),slCol));
const fcol=shortSl?sk:slCol,mkF=side=>{const f=[K(cy,M4(0,-.13,0,ar*.88,.26,ar*.88),fcol),K(sp,M4(0,-.29,0,.048,.052,.048),glove),K(sp,M4(side*.03,-.285,.03,.018,.018,.018),glove)];
if(side>0&&s.gun=='pistol')f.push(K(bx,M4(0,-.3,.12,.03,.06,.15),'#1b1b1b'));
if(side>0&&s.acc=='case')f.push(K(bx,M4(0,-.42,0,.035,.22,.3),'#3a2a1a'),K(bx,M4(0,-.3,0,.012,.03,.1),'#222222'));
if(side<0&&s.acc=='bag')f.push(K(bx,M4(0,-.4,.02,.06,.17,.22),s.bagc),K(bx,M4(0,-.3,0,.012,.03,.1),'#222222'));
if(side<0&&s.watch)f.push(K(cy,M4(0,-.25,0,ar*.95,.025,ar*.95),'#222222'));return f};
return{body:mergeG(L),thigh:mergeG(th),shin:mergeG(sn),uarm:mergeG(ua),farmL:mergeG(mkF(-1)),farmR:mergeG(mkF(1)),wx:wx+.035,hipx:.1*b*.9}}
function spawnH(x,z,sol){const g=G,s=rollSpec(sol),geo=buildHuman(s),m=new T3.Group();m.rotation.order='YXZ';const pel=new T3.Group();pel.position.y=.72;m.add(pel);const tg=new T3.Group();pel.add(tg);
const mk=(gm,par,y)=>{const o=new T3.Mesh(gm,hM);o.castShadow=true;o.userData.own=1;if(y)o.position.y=y;par.add(o);return o};mk(geo.body,tg,-.72);const legs=[],arms=[];
for(const sd of[-1,1]){const hp=new T3.Group();hp.position.set(sd*geo.hipx,0,0);pel.add(hp);mk(geo.thigh,hp);const kn=new T3.Group();kn.position.y=-.36;hp.add(kn);mk(geo.shin,kn);legs.push({p:hp,k:kn});
const sh=new T3.Group();sh.position.set(sd*geo.wx,.58,0);tg.add(sh);mk(geo.uarm,sh);const el=new T3.Group();el.position.y=-.28;sh.add(el);mk(sd>0?geo.farmR:geo.farmL,el);arms.push({p:sh,e:el})}
m.scale.setScalar(s.sc);m.position.set(x,gy(x,z),z);g.S.add(m);
g.hum.push({m,pel,tg,legs,arms,col:s.shirt,pn:s.pn,sk:s.sk,sol,kind:s.kind,gun:s.gun,t:0,dir:R(0,6.28),hd:R(0,6.28),cd:R(0,1.5),ph:R(0,6),ph0:R(0,6),sd:R(.85,1.15),idle:0,trip:0,rec:0,avoid:0,av:1,id:++g.humanSequence});decorateHuman(g.hum[g.hum.length-1]);}
function animH(h,t,dt,s,mode){const run=s>3.4,k=Math.min(1,s/(run?5.5:1.3)),ph=h.ph+=dt*s*(run?2.6:5.2)*h.sd,amp=run?.95:.55,iK=1-k,pel=h.pel,tg=h.tg,L=h.legs,AR=h.arms;
for(let i=0;i<2;i++){const w=ph+i*PI,l=L[i];l.p.rotation.x=Math.sin(w)*amp*k;l.k.rotation.x=Math.max(0,Math.cos(w))*(run?1.5:.75)*k+.04}
pel.position.y=.72+Math.abs(Math.cos(ph))*(run?.07:.03)*k-(mode=='aim'?.03:0);pel.rotation.y=Math.sin(ph)*.12*k;
for(let i=0;i<2;i++){const a=AR[i],w=ph+(i+1)*PI;let x=Math.sin(w)*amp*1.1*k+Math.sin(t*1.4+h.ph0+i)*.05*iK,e=-.15-(run?.9:.15)*k,z=(i?1:-1)*.06;
if(mode=='panic'){x=-2.5+Math.sin(t*17+i*2)*.5;e=-.35;z=(i?-1:1)*(.35+Math.sin(t*13+i)*.2)}
else if(mode=='aim'){const r=i==1;x=r?-1.45+h.rec*.35:-1.25;e=r?-.12:-.55;z=r?0:-.35}
else if(mode=='trip'){x=-2.2;e=-.2;z=(i?-1:1)*.5}
a.p.rotation.set(x,0,z);a.e.rotation.x=e}
let lean=(run?.32:.07)*k,twist=0;if(mode=='panic')lean=-.12+Math.sin(t*9)*.05;if(mode=='aim'){twist=.4;lean=-.05-h.rec*.12}
tg.rotation.set(lean,-Math.sin(ph)*.2*k+twist+Math.sin(t*.5+h.ph0)*(mode=='idle'?.25:.05)*iK,Math.sin(ph)*.04*k+Math.sin(t*.7+h.ph0)*.03*iK);tg.scale.y=1+Math.sin(t*1.7+h.ph0)*.012}
function updHumans(dt,t,m,sz,lim){const g=G,HL=g.hum,mx0=m.position.x,mz0=m.position.z;
for(let hi=0;hi<HL.length;hi++){const h=HL[hi];if(h.held||h.projectile)continue;const p=h.m.position,dx=p.x-mx0,dz=p.z-mz0,d=Math.sqrt(dx*dx+dz*dz);
if(d>95){const q=randPos(28);p.set(q[0],gy(q[0],q[1]),q[1]);h.m.visible=true;continue;}if(h.beingEaten)continue;if(!h.m.visible)h.m.visible=true;
h.rec=Math.max(0,h.rec-dt*5);p.y+=(gy(p.x,p.z)-p.y)*Math.min(1,dt*14);
if(h.trip>0){h.trip-=dt;const u=1.1-h.trip,pitch=u<.25?1.45*ease(u/.25):h.trip<.4?1.45*(h.trip/.4):1.45;h.m.rotation.x=pitch;animH(h,t,dt,0,'trip');updateCrowdHuman(h,dt,0,'trip');continue}h.m.rotation.x=0;
let tx=0,tz=0,s=0,mode='walk',face=null;
if(h.sol&&d<34&&!g.over){const ax=-dx/d,az=-dz/d;face=Math.atan2(ax,az);mode='aim';if(d>(h.gun=='pistol'?9:13)){s=h.gun=='pistol'?2.9:2.4;tx=ax;tz=az}h.cd-=dt;
if(h.cd<=0){
    h.cd=Math.max(.5,(h.gun=='pistol'?1.8:1.4)-g.thr*.15);
    h.rec=1;
    const bullet=new T3.Group();
    const trail=new T3.Mesh(BUL_TRAIL_G,BUL_TRAIL_M);
    trail.position.y=-.29;
    const body=new T3.Mesh(BUL_BODY_G,BUL_M);
    body.position.y=-.02;
    const nose=new T3.Mesh(BUL_G,BUL_M);
    nose.position.y=.22;
    const core=new T3.Mesh(BUL_CORE_G,BUL_CORE_M);
    core.position.y=.12;
    bullet.add(trail,body,nose,core);
    const bx=p.x+Math.sin(h.hd)*.5,bz=p.z+Math.cos(h.hd)*.5;
    bullet.position.set(bx,1.2,bz);
    const v=new T3.Vector3(m.position.x-p.x,m.position.y+1.2*sz-1.2,m.position.z-p.z).normalize().multiplyScalar(24);
    bullet.quaternion.setFromUnitVectors(BUL_AXIS,v.clone().normalize());
    g.S.add(bullet);
    g.bul.push({m:bullet,v,l:2,core,trail,age:0});
    P(bx,1.2,bz,'#fff0a6',5,2.6,{l:.18,s:1,g:0})
}}
else if(!h.sol&&d<18){mode='panic';s=5.4*h.sd*(h.kind=='k'?1.1:h.kind=='o'?.7:1);tx=dx/d;tz=dz/d;if(h.avoid>0){h.avoid-=dt;const a=h.av*1.2,c=Math.cos(a),sn=Math.sin(a),nx=tx*c-tz*sn;tz=tx*sn+tz*c;tx=nx}face=Math.atan2(tx,tz);h.idle=0;if(Math.random()<dt*.07)h.trip=1.1}
else{h.t-=dt;if(h.t<=0){h.t=R(1.5,4);if(Math.random()<.35)h.idle=R(1,3);else h.dir=R(0,6.28)}if(h.idle>0){h.idle-=dt;mode='idle'}else{s=1.15*h.sd;tx=Math.sin(h.dir);tz=Math.cos(h.dir);face=h.dir}}
if(face!==null){let a=face-h.hd;a=Math.atan2(Math.sin(a),Math.cos(a));h.hd+=a*Math.min(1,dt*(mode=='panic'?12:mode=='aim'?9:5));h.m.rotation.y=h.hd}
const ox=p.x,oz=p.z;p.x+=tx*s*dt;p.z+=tz*s*dt;resolve(p,.35);
const mv=Math.hypot(p.x-ox,p.z-oz),blocked=s>0&&mv<s*dt*.4;if(blocked){if(mode=='panic'){h.avoid=.7;h.av=-h.av}else h.t=Math.min(h.t,.2)}
animH(h,t,dt,blocked?0:s,mode);updateCrowdHuman(h,dt,blocked?0:s,mode)}}
function P(x,y,z,col,n,spd,o){o=o||{};if(o.bl&&(!GORE_ENABLED||GORE_INTENSITY<=0))return;if(o.bl)n=Math.max(1,Math.ceil(n*GORE_INTENSITY*tuning.goreMultiplier));const a=G.parts,L=a.length,s0=G.pp0||0;for(let k=0;k<L&&n>0;k++){const i=(s0+k)%L,q=a[i];if(q.l>0)continue;n--;G.pp0=(i+1)%L;q.l=q.l0=o.l||R(.5,1);q.m.visible=true;q.m.material.color.copy(Cc(col));q.m.position.set(x,y,z);q.v.set(R(-1,1)*spd+(o.fx||0),(o.up!==undefined?o.up:R(.4,1.4))*spd,R(-1,1)*spd+(o.fz||0));q.g=o.g!==undefined?o.g:14;q.bl=o.bl||0;q.s=(o.s||1)*(o.bl?GORE_INTENSITY:1);q.m.scale.setScalar(q.s)}}
const splT=[0,1,2].map(n=>tex((x,w)=>{x.fillStyle='#fff';const c=w/2;x.beginPath();const k=14;for(let i=0;i<=k;i++){const a=i/k*6.283,r=w*(.17+Math.random()*.1),X=c+Math.cos(a)*r,Y=c+Math.sin(a)*r;i?x.lineTo(X,Y):x.moveTo(X,Y)}x.closePath();x.fill();
for(let i=0;i<9+n*3;i++){const a=Math.random()*6.283,d=w*(.25+Math.random()*.2),r=w*(.012+Math.random()*.035);x.beginPath();x.arc(c+Math.cos(a)*d,c+Math.sin(a)*d,r,0,6.3);x.fill()}
for(let i=0;i<2+n;i++){x.save();x.translate(c,c);x.rotate(Math.random()*6.283);x.beginPath();x.ellipse(w*.3,0,w*.14,w*.025,0,0,6.3);x.fill();x.restore()}},128));
const bloodM=MS('#a50e1c',{roughness:.22,metalness:.1}),boneM=MS('#efe8d8',{roughness:.5});
const PG={head:new T3.SphereGeometry(.17,12,9),torso:new T3.CylinderGeometry(.21,.24,.62,10),arm:new T3.CylinderGeometry(.06,.055,.55,8),leg:new T3.CylinderGeometry(.085,.07,.7,8)},boneG=new T3.CylinderGeometry(.018,.018,.1,5),PH={head:.17,torso:.22,arm:.07,leg:.09};
const capG=r=>{const g=new T3.CircleGeometry(r,10);g.rotateX(-PI/2);return g};
function mkPart(type){const g=new T3.Group(),m=new T3.Mesh(PG[type],MS('#cccccc',{roughness:.7}));g.add(m);
if(type=='arm'||type=='leg'){const L=type=='arm'?.55:.7,r=type=='arm'?.06:.085,c=new T3.Mesh(capG(r*.98),bloodM);c.position.y=L/2+.002;const b=new T3.Mesh(boneG,boneM);b.position.y=L/2+.04;g.add(c,b)}
else if(type=='torso'){const c=new T3.Mesh(capG(.2),bloodM);c.position.y=.312;const c2=new T3.Mesh(capG(.22),bloodM);c2.rotation.x=PI;c2.position.y=-.312;g.add(c,c2)}
else{const c=new T3.Mesh(capG(.07),bloodM);c.rotation.x=PI;c.position.y=-.15;g.add(c)}
SH(g,1,0);g.visible=false;return{g,m,type,h:PH[type],l:0,v:new T3.Vector3(),w:new T3.Vector3(),rest:0,sp:0,landed:0}}
function initGore(S,g){const geo=new T3.PlaneGeometry(2,2);g.dmt=[];splT.forEach(t=>RED.forEach(h=>g.dmt.push(new T3.MeshBasicMaterial({map:t,color:Cc(h),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4}))));
for(let i=0;i<QS[QUAL].dec;i++){const m=new T3.Mesh(geo,pick(g.dmt));m.rotation.x=-PI/2;m.visible=false;S.add(m);g.dec.push(m)}
g.pp={head:[],torso:[],arm:[],leg:[]};g.pi={head:0,torso:0,arm:0,leg:0};g.prts=[];[['head',10],['torso',10],['arm',24],['leg',24]].forEach(([t,n])=>{for(let i=0;i<n;i++){const q=mkPart(t);S.add(q.g);g.pp[t].push(q);g.prts.push(q)}});g.drip=0}
function decal(x,z,r){if(!GORE_ENABLED||GORE_INTENSITY<=0||!G.dec.length)return;const d=G.dec[G.di++%G.dec.length],scale=Math.sqrt(GORE_INTENSITY);d.position.set(x,gy(x,z)+.02,z);d.userData.tg=r*scale;d.scale.set(r*.25*scale,r*.25*scale,1);d.rotation.z=R(0,6.28);d.visible=true;d.material=pick(G.dmt)}
function gibs(x,y,z,h,n,s){if(!GORE_ENABLED||GORE_INTENSITY<=0)return;n=Math.max(1,Math.ceil(n*GORE_INTENSITY));const cols=['#aa1111','#8a0b0b','#d94a5a','#7a0a0a'],scale=Math.sqrt(GORE_INTENSITY);for(const q of G.gibs){if(n<=0)break;if(q.l>0)continue;n--;q.l=9;q.m.visible=true;q.m.position.set(x,y,z);q.m.scale.set(R(.6,1.8)*scale,R(.6,1.6)*scale,R(.6,2)*scale);q.m.material.color.copy(Cc(pick(cols)));q.v.set(R(-1,1)*s,R(1,2)*s*.9+3,R(-1,1)*s);q.w.set(R(-8,8),0,R(-8,8))}}
function spawnPart(type,x,y,z,col,v,sp){if(!GORE_ENABLED||GORE_INTENSITY<=0)return;const g=G,a=g.pp[type],q=a[g.pi[type]++%a.length];q.g.visible=true;q.g.position.set(x,y,z);q.m.material.color.copy(Cc(col));q.v.copy(v);q.w.set(R(-9,9),R(-9,9),R(-9,9));q.g.rotation.set(R(0,3),R(0,3),R(0,3));q.l=90;q.rest=0;q.sp=sp?1.3:0;q.landed=0;q.goreScale=Math.sqrt(GORE_INTENSITY)}
function dismember(h,mode,mp){if(!GORE_ENABLED||GORE_INTENSITY<=0)return;const g=G,p=h.m.position,sp=mode=='blast'?11:mode=='squish'?5:3,vel=k=>new T3.Vector3(R(-1,1),R(.3,1),R(-1,1)).multiplyScalar(sp*(k||1));
if(mode=='eat'){const dir=new T3.Vector3(Math.sin(g.mon.rotation.y),0,Math.cos(g.mon.rotation.y));for(let i=0;i<2;i++)spawnPart('leg',mp.x,mp.y-.6,mp.z,h.pn,vel(.7).addScaledVector(dir,2.5),1);if(Math.random()<.6)spawnPart('arm',mp.x,mp.y-.3,mp.z,h.col,vel(.9).addScaledVector(dir,2),1);if(Math.random()<.3)spawnPart('head',mp.x,mp.y,mp.z,h.sk,vel(.8).addScaledVector(dir,3),1)}
else{const x=p.x,z=p.z,at=(t,y,c)=>spawnPart(t,x+R(-.2,.2),y,z+R(-.2,.2),c,vel(),1);at('head',1.5,h.sk);at('torso',1.1,h.col);at('arm',1.2,h.col);at('arm',1.2,h.col);at('leg',.5,h.pn);at('leg',.5,h.pn)}}

function wallSplat(h,b,contact){const g=G;if(!g.hum.includes(h))return;if(GORE_ENABLED&&GORE_INTENSITY>0){g.wallSplats??=[];const index=(g.wallSplatIndex||0)%24;g.wallSplatIndex=index+1;let mark=g.wallSplats[index];if(!mark){mark=new T3.Mesh(new T3.PlaneGeometry(1,1),new T3.MeshBasicMaterial({map:splT[index%splT.length],color:Cc('#971022'),transparent:true,depthWrite:false,side:T3.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));g.S.add(mark);g.wallSplats[index]=mark;}b.m.updateWorldMatrix(true,false);const local=b.m.worldToLocal(contact.clone()),normal=new T3.Vector3();if(Math.abs(Math.abs(local.x)-b.w/2)<Math.abs(Math.abs(local.z)-b.d/2))normal.set(Math.sign(local.x)||1,0,0);else normal.set(0,0,Math.sign(local.z)||1);const point=local.clone();if(normal.x)point.x=normal.x*(b.w/2+.035);else point.z=normal.z*(b.d/2+.035);point.y=Math.max(.5,Math.min(b.h-.3,point.y));b.m.localToWorld(point);normal.transformDirection(b.m.matrixWorld);mark.position.copy(point);mark.quaternion.setFromUnitVectors(new T3.Vector3(0,0,1),normal);mark.scale.set(R(1.4,2.3),R(1.4,2.3),1);mark.visible=true;mark.userData.building=b;mark.userData.section=getBuildingSections(b.m).filter(s=>!s.removed&&s.kind==='wall').sort((a,c)=>new T3.Vector3(a.position.x,a.position.y,a.position.z).distanceToSquared(local)-new T3.Vector3(c.position.x,c.position.y,c.position.z).distanceToSquared(local))[0];P(contact.x,contact.y,contact.z,'#a91129',20,4,{bl:1,l:.8,s:1.2,fx:normal.x*3,fz:normal.z*3});}kill(h,100,'WALL SPLAT!','blast');}
function pop(txt,p){const host=$('event-feed');if(!host)return;const d=document.createElement('div');d.className='pop';d.textContent=txt;host.append(d);while(host.children.length>3)host.firstChild.remove();setTimeout(()=>d.remove(),1100);}
function ring(x,z,rad){const m=new T3.Mesh(G.rg,new T3.MeshBasicMaterial({color:Cc('#ffcc44'),transparent:true,opacity:.8,side:2}));m.rotation.x=-PI/2;m.position.set(x,.5,z);G.S.add(m);G.rings.push({m,l:.5,rad})}
function kill(h,pts,txt,mode){const g=G;if(!g.hum.includes(h))return;releaseHumanInteraction(g,h);releaseCrowdHuman(h);const p=h.m.position,x=p.x,z=p.z;g.hum.splice(g.hum.indexOf(h),1);g.combo++;g.ct=3.5;const mu=Math.min(5,1+(g.combo>>2));g.score+=pts*mu;g.kills++;
if(mode=='eat'){const mp=new T3.Vector3();(g.mon.userData.trialAnchors?.mouth||g.mon.userData.head).getWorldPosition(mp);const fx=Math.sin(g.mon.rotation.y)*4,fz=Math.cos(g.mon.rotation.y)*4;P(mp.x,mp.y,mp.z,pick(RED),30,5,{fx,fz,bl:1,l:1.2});gibs(mp.x,mp.y,mp.z,h,5,5);dismember(h,'eat',mp);g.drip=GORE_ENABLED&&GORE_INTENSITY>0?1.4:0;
g.eaten++;g.hp=Math.min(g.max,g.hp+(h.sol?8:5)*(g.modifiers.heal||1));conquestEvent(g,'eat',undefined,x,z);applyGrowth(g);sound('eat')}
else{P(x,.7,z,pick(RED),40,6,{bl:1,l:1.2});P(x,1.2,z,pick(RED),20,9,{bl:1,l:1.2,up:1.6});gibs(x,1,z,h,8,6);decal(x,z,R(1.6,2.4));decal(x+R(-1,1),z+R(-1,1),R(.8,1.4));dismember(h,mode)}
g.S.remove(h.m);h.m.traverse(o=>{if(o.userData.own&&o.geometry)o.geometry.dispose()});
if(GORE_ENABLED&&GORE_INTENSITY>0){const k=Math.min(.6,g.eaten*.012+g.kills*.004);g.mon.userData.mats.forEach(o=>o.m.color.copy(o.o).lerp(Cc('#7a0a0a'),k))}
pop(txt+(mu>1?' x'+mu:''),new T3.Vector3(x,2,z));}
const wreckM=MS('#1a1816',{roughness:1});
function chunks(b,n,big,roof){const g=G,k=b.m.children,wc=k[0].material.color,rc=(k[1]||k[0]).material.color;
for(let i=0;i<n;i++){const q=g.dbr[g.di2++%g.dbr.length],m=q.m;m.visible=true;m.material.color.copy(roof&&Math.random()<.85?rc:(Math.random()<.15?Cc('#3a2a1c'):wc));
const s=big?R(.6,1.8):R(.2,.6);m.scale.set(s*R(.6,1.4),s*R(.4,1.2),s*R(.3,1));const a=R(0,6.28),r=R(0,.5);
m.position.set(b.x+Math.cos(a)*b.w*r,.5+R(.1,1)*(roof?b.h+1.5:b.h*.8),b.z+Math.sin(a)*b.d*r);const sp=big?R(3,9):R(2,6);
q.v.set(Math.cos(a)*sp,R(3,10)*(big?1:.7),Math.sin(a)*sp);q.w.set(R(-6,6),R(-6,6),R(-6,6));m.rotation.set(R(0,3),R(0,3),R(0,3));q.l=80;q.rest=0}}
function sectionDebris(b,removed,force=1,direction){const g=G;b.m.updateWorldMatrix(true,false);for(const piece of [...removed].sort((a,c)=>(/^roof|^floor/.test(c.id)?1:0)-(/^roof|^floor/.test(a.id)?1:0)).slice(0,10)){const q=g.dbr[g.di2++%g.dbr.length],m=q.m,position=b.m.localToWorld(new T3.Vector3(piece.position.x,piece.position.y,piece.position.z));m.visible=true;m.position.copy(position);m.material.color.set(piece.color);const slab=/^roof|^floor/.test(piece.id);m.scale.set(Math.min(slab?8:3,piece.size.x*.7),Math.min(2,piece.size.y*.7),Math.max(.15,Math.min(slab?8:2,piece.size.z*.7)));m.rotation.copy(b.m.rotation);const dx=position.x-g.mon.position.x,dz=position.z-g.mon.position.z,len=Math.hypot(dx,dz)||1;const fall=direction?new T3.Vector3(direction.x,0,direction.z).transformDirection(b.m.matrixWorld):new T3.Vector3(dx/len,0,dz/len);q.v.set(fall.x*R(1,slab?3:6)*force,slab?-R(0,2):R(1,5)*force,fall.z*R(1,slab?3:6)*force);q.w.set(R(-4,4),R(-4,4),R(-4,4));q.l=16;q.rest=0;}for(let i=0;i<Math.min(5,removed.length);i++){const piece=removed[i],q=g.dbr[g.di2++%g.dbr.length],position=b.m.localToWorld(new T3.Vector3(piece.position.x,piece.position.y,piece.position.z)),size=R(.25,.65);q.m.visible=true;q.m.position.copy(position);q.m.scale.setScalar(size);q.m.material.color.set(piece.color);q.v.set(R(-4,4),R(3,7),R(-4,4));q.w.set(R(-5,5),R(-5,5),R(-5,5));q.l=12;q.rest=0;}}
function dmgB(b,amt,impact,options={}){const g=G;if(b.dead||g.over||!(amt>0))return;
 const energy=amt*tuning.damage*tuning.smashDamage*(g.growth?.stage===0&&!options.vehicle ? .12 : 1);
 const p=impact?new T3.Vector3(impact.x,Number.isFinite(impact.y)?impact.y:2,impact.z):g.mon.position.clone();p.x=Math.max(b.x-b.w/2,Math.min(b.x+b.w/2,p.x));p.z=Math.max(b.z-b.d/2,Math.min(b.z+b.d/2,p.z));p.y=Math.max(1,Math.min(b.h-.2,p.y||2*g.sz));b.m.updateWorldMatrix(true,false);const local=b.m.worldToLocal(p.clone());const result=damageBuilding(b.m,{x:local.x,y:local.y,z:local.z,radius:Math.min(6,.8+Math.sqrt(energy)*.13*g.sz),damage:energy});
 if(!result.removed.length){if(result.damaged?.length){b.shk=.06;noteBuilding(g,b);if(amt>8){P(p.x,p.y,p.z,'#b5aba0',4,2,{s:.7,l:.3});sound('impact');}}return;}sectionDebris(b,result.removed,1,result.collapseDirection);b.hp=b.max*result.integrity;b.shk=.18;noteBuilding(g,b);g.shake=Math.max(g.shake,.25);P(p.x,p.y,p.z,'#b5aba0',12,4,{s:1.8,l:1});sound('impact');if(result.collapsed)boom(b);}
function boom(b){const g=G;if(b.dead)return;b.dead=1;g.mmd=1;g.score+=b.type=='church'?400:b.type=='shop'?250:180;g.destroyed++;g.shake=Math.max(g.shake,.9);b.m.visible=false;noteBuilding(g,b);conquestEvent(g,'building',b.id,b.x,b.z);
 P(b.x,b.h*.4,b.z,'#bdb6a8',45,8,{s:2,l:1.4});P(b.x,b.h*.3,b.z,'#8a8478',20,6,{s:3,l:2,g:-1});g.fires.push({x:b.x,z:b.z,l:20,w:b.w});pop('DEMOLISHED!',new T3.Vector3(b.x,Math.min(b.h,8),b.z));for(let i=0;i<3&&g.hum.length<QS[QUAL].hum;i++)spawnH(b.x+R(-2,2),b.z+R(-2,2),0);sound('impact');}
function carBoom(c){const g=G;if(c.d||c.held||c.projectile)return;conquestEvent(g,'car',c.id,c.m.position.x,c.m.position.z);sound('impact');c.d=1;c.m.userData.cityAssetDestroyed=true;g.crushed++;g.score+=75;g.shake=Math.max(g.shake,.7);const p=c.m.position;
P(p.x,1,p.z,'#ffe27a',24,10,{l:.4,s:2.2,g:2});P(p.x,1,p.z,'#ff6a1f',30,8,{l:.8,s:2.6,g:-1,up:1.4});P(p.x,1,p.z,'#2a2826',22,5,{l:2.2,s:3.2,g:-1.5,up:2});ring(p.x,p.z,9);
c.m.traverse(k=>{if(k.isMesh){if(k.userData.ownedMaterial){k.material.dispose();k.userData.ownedMaterial=0}k.material=wreckM;if(k.userData.gl)k.visible=false}});c.fly={v:new T3.Vector3(R(-3,3),R(10,14),R(-3,3)),w:new T3.Vector3(R(-5,5),R(-3,3),R(-5,5))};g.fires.push({x:p.x,z:p.z,l:10,w:1.6});pop('BOOM!',new T3.Vector3(p.x,2,p.z));
for(const h of g.hum.slice())if(H(h.m.position.x-p.x,h.m.position.z-p.z)<8)kill(h,60,'BLOWN UP!','blast');
for(const b of g.bl)if(!b.dead&&H(b.x-p.x,b.z-p.z)-Math.max(b.w,b.d)/2<8)dmgB(b,35,p);
for(const o of g.cars)if(!o.d&&H(o.x-p.x,o.z-p.z)<8&&!(o.t>0))o.t=R(.2,.5);
if(H(p.x-g.mon.position.x,p.z-g.mon.position.z)<7)hurt(5)}
function chomp(){const g=G;if(Number.isFinite(g.slamRecovery))return;g.mon.userData.trialAction={name:'eat',remaining:.7};const heldHuman=g.held&&g.hum.includes(g.held)?g.held:null;if((g.mon.position.y>g.sz&&!heldHuman)||g.biteAttack)return;g.cc=.72;g.ch=1;g.biteAttack=beginFeeding(g.mon,g.hum,g.sz,g.st.bite,heldHuman);if(heldHuman&&g.biteAttack.victims.some(v=>v.h===heldHuman))g.held=null;}
function updateFeeding(g,dt){if(advanceFeeding(g.biteAttack,g.mon,g.hum,dt,g.over,h=>kill(h,h.sol?150:50,'CHOMP!','eat')))g.biteAttack=null;}
function smash(){const g=G;if(Number.isFinite(g.slamRecovery))return;if(g.mon.position.y>1){action(g,'jump');return;}g.sc=1.1;g.sm=1;g.sl=.2}
function smashHit(){const g=G;hitDecor(g,g.mon.position,7*g.sz,2);if(!canGroundAttack(g.mon,g.jump,g.climbing)){if(g.jump)g.jump.slam=true;return;}const m=g.mon,rad=7*g.sz*(.75+.25*g.st.smash),fx=Math.sin(m.rotation.y),fz=Math.cos(m.rotation.y),x=m.position.x+fx*2.2*g.sz,z=m.position.z+fz*2.2*g.sz;g.shake=Math.max(g.shake,.8);ring(x,z,rad);
for(let i=0;i<28;i++){const a=i/28*6.283;P(x+Math.cos(a)*rad*.35,.4,z+Math.sin(a)*rad*.35,'#cfc6b0',1,6,{fx:Math.cos(a)*5,fz:Math.sin(a)*5,up:.5,l:.7,s:1.6,g:6})}
for(const h of g.hum.slice())if(H(h.m.position.x-x,h.m.position.z-z)<rad)kill(h,h.sol?100:25,pick(['SPLAT!','SQUISH!','CRUSHED!']),'squish');
for(const b of g.bl)if(!b.dead&&H(b.x-x,b.z-z)-Math.max(b.w,b.d)/2<rad){P(b.x,2,b.z,'#bbbbbb',8,4);dmgB(b,70*g.st.smash,new T3.Vector3(x,2*g.sz,z))}
damageEnemies(g,x,z,rad,80*g.st.smash);sound('impact');for(const c of g.cars)if(!c.d&&!c.held&&!c.projectile&&H(c.x-x,c.z-z)<rad)carBoom(c);for(const t of g.trees)if(!t.f&&H(t.x-x,t.z-z)<rad)knockTree(t,g)}

function hurt(d){if(G.over||tuning.invincible)return;G.hp-=d*tuning.enemyDamage;G.fl=1}
const keys={};let jp=null,jo=[0,0],jv=[0,0],cp=null,lx=0,ly=0;
addEventListener('keydown',e=>{keys[e.code]=1;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&mode==='game')e.preventDefault();if((e.code=='Escape'||e.code=='KeyP')&&mode=='game'&&G&&!G.over)pauseT()});addEventListener('keyup',e=>keys[e.code]=0);
function resetInputs(){for(const key of Object.keys(keys))keys[key]=0;jp=cp=null;jv=[0,0];$('joy').style.display='none';clearActionInputs();}
addEventListener('blur',resetInputs);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetInputs();});
addEventListener('pointerdown',e=>{if(mode=='edit')return edDown(e);if(mode!='game'||!G||G.paused||e.target.closest('button,input,textarea,label,.pnl,#panel,#etop'))return;if(e.pointerType=='touch'&&e.clientX<innerWidth*.5){jp=e.pointerId;jo=[e.clientX,e.clientY];const j=$('joy');j.style.display='block';j.style.left=e.clientX-50+'px';j.style.top=e.clientY-50+'px'}else{cp=e.pointerId;lx=e.clientX;ly=e.clientY}});
addEventListener('pointermove',e=>{if(mode=='edit')return edMove(e);if(e.pointerId===jp){const dx=e.clientX-jo[0],dy=e.clientY-jo[1],l=H(dx,dy),m=Math.min(l,50);jv=l?[dx/l*m/50,dy/l*m/50]:[0,0];$('joy').firstChild.style.transform='translate('+jv[0]*30+'px,'+jv[1]*30+'px)'}else if(e.pointerId===cp&&G){lx=e.clientX;ly=e.clientY}});
const up=e=>{if(mode=='edit')edUp(e);if(e.pointerId===jp){jp=null;jv=[0,0];$('joy').style.display='none'}if(e.pointerId===cp)cp=null};addEventListener('pointerup',up);addEventListener('pointercancel',up);
addEventListener('wheel',e=>{if(G&&mode=='game')G.zd=Math.max(.55,Math.min(1.9,G.zd*Math.exp(e.deltaY*.001)))},{passive:true});$('bc').onpointerdown=()=>G&&(G.wc=1);$('bs').onpointerdown=()=>G&&(G.ws=1);
function persistGore() {
    try {
        localStorage.setItem('mmr-gore-enabled', String(GORE_ENABLED));
        localStorage.setItem('mmr-gore-intensity', String(Math.round(GORE_INTENSITY * 100)))
    } catch {}
}
function syncGoreControls() {
    ['gore-menu-toggle', 'gore-pause-toggle'].forEach(id => {
        const button = $(id);
        if (button) {
            button.textContent = GORE_ENABLED ? 'Gore: On' : 'Gore: Off';
            button.setAttribute('aria-pressed', String(GORE_ENABLED))
        }
    });
    ['gore-menu-level', 'gore-pause-level'].forEach(id => {
        const slider = $(id);
        if (slider) {
            slider.value = String(Math.round(GORE_INTENSITY * 100));
            slider.disabled = !GORE_ENABLED
        }
    })
}
function clearGoreVisuals() {
    if (!G)
        return;
    G.parts.forEach(particle => {
        if (particle.bl) {
            particle.l = 0;
            particle.m.visible = false
        }
    });
    G.dec.forEach(mark => mark.visible = false);
    G.wallSplats?.forEach(mark => mark.visible = false);
    G.prts.forEach(part => {
        part.l = 0;
        part.g.visible = false
    });
    G.gibs.forEach(gib => {
        gib.l = 0;
        gib.m.visible = false
    });
    G.drip = 0;
    G.mon.userData.mats.forEach(item => item.m.color.copy(item.o));
    document.querySelectorAll('.splat').forEach(mark => mark.remove())
}
function setGoreEnabled(enabled) {
    GORE_ENABLED = enabled;
    persistGore();
    if (!enabled)
        clearGoreVisuals();
    syncGoreControls()
}
function setGoreIntensity(value) {
    GORE_INTENSITY = Math.max(0, Math.min(1, Number(value) / 100));
    if (GORE_INTENSITY === 0)
        clearGoreVisuals();
    syncGoreControls()
}
function saveRun(){if(G&&!G.over){saveCity(G);const c=slots[idx];if(c)c.best=Math.max(c.best||0,G.score);persist();}}
function pauseT() {
    if (!G)
        return;
    G.paused = !G.paused;
    resetInputs();
    if(G.paused)saveCity(G,true);
    $('pause').classList.toggle('on', !!G.paused);
    if (G.paused)
        syncGoreControls()
}
$('gore-menu-toggle').onclick = () => setGoreEnabled(!GORE_ENABLED);
$('gore-pause-toggle').onclick = () => setGoreEnabled(!GORE_ENABLED);
$('gore-menu-level').oninput = event => setGoreIntensity(event.currentTarget.value);
$('gore-pause-level').oninput = event => setGoreIntensity(event.currentTarget.value);
$('gore-menu-level').onchange = persistGore;
$('gore-pause-level').onchange = persistGore;
$('save-run').onclick = saveRun;
$('zi').onclick=()=>G&&(G.zd=Math.max(.55,G.zd/1.15));$('zo').onclick=()=>G&&(G.zd=Math.min(1.9,G.zd*1.15));$('mb').onclick=()=>G&&!G.over&&pauseT();$('rs').onclick=pauseT;$('qt').onclick=menu;$('bm').onclick=menu;$('rt').onclick=()=>play(idx);
let preloading = false;
const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => resolve()));
function setPreloader(progress, message) {
    $('preloader').classList.add('on');
    $('load-progress').parentElement.setAttribute('aria-valuenow', String(progress));
    $('load-title').textContent = progress >= 100 ? 'READY TO RAMPAGE' : progress >= 70 ? 'WARMING ASSETS' : 'PREPARING THE CITY';
    $('load-progress').style.width = progress + '%';
    $('load-percent').textContent = progress + '%';
    $('load-step').textContent = message
}
function warmScene() {
    const textures = new Set();
    G.S.traverse(object => {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
            if (!material)
                return;
            ['map', 'aoMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap'].forEach(key => {
                const texture = material[key];
                if (texture && texture.isTexture)
                    textures.add(texture)
            })
        })
    });
    textures.forEach(texture => texture.needsUpdate = true);
    cam.clearViewOffset();
    updateCamera(G,0);
    rd.compile(G.S, cam);
    rd.render(G.S, cam)
}
async function play(i) {
    const resuming=null;
    if (preloading)
        return;
    if(G&&!G.over)finishRun(G);
    resetRunCity();
    preloading = true;
    setPreloader(6, 'Building the city');
    await nextFrame();
    await nextFrame();
    try {
        idx = i;
        document.querySelectorAll('.pop').forEach(e => e.remove());
        if (G) {
            disposeGame(G);
            G = null
        }
        newGame(resuming?{...DEF,...resuming.config}:mutationConfig(Object.assign({},DEF,slots[i])));
        prepareGame(G,resuming);
        if(G.c.archetype&&G.c.archetype!=='creator'){setPreloader(45,'Loading '+archetype(G.c.archetype).name);const attached=await attachCharacterTrial(G.mon,G.c.archetype);if(!attached)toast('Model unavailable · using your custom monster');else{G.mon.userData.collisionHeight=3.3;G.c.name=archetype(G.c.archetype).name;}}
        warmCrowdAssets();
        warmCityAssets();
        setPreloader(54, 'Preparing city textures');
        await nextFrame();
        setPreloader(79, 'Warming the scene');
        warmScene();
        await nextFrame();
        mode = 'game';
        cam.clearViewOffset();
        show('hud');
        $('nm').textContent = G.c.name;
        $('pt').src = thumbs[i] || '';
        $('pt').style.display=G.mon.userData.characterTrialKind?'none':'';
        $('lb-status').textContent = 'GLOBAL LEADERBOARD';
        banner('RAMPAGE!');
        const activeGame = G;
        setTimeout(() => {
            if (G === activeGame && mode == 'game')
                $('hint').textContent = ''
        }, 8000);
        setPreloader(100, 'Ready to rampage');
        await nextFrame();
        $('preloader').classList.remove('on')
    } catch (error) {
        console.error('[Aippy] Rampage preloader failed', error);
        if (G) {
            disposeGame(G);
            G = null
        }
        mode = 'menu';
        $('preloader').classList.remove('on');
        menu();
        toast('Could not prepare the city. Please try again.')
    } finally {
        preloading = false
    }
}
function end(){
    const g = G;
    g.over = 1;
    resetInputs();
    finishRun(g);
    try {
        void Promise.resolve(reportScore(g.score)).catch(error => console.error('[Aippy] Score report failed', error))
    } catch (error) {
        console.error('[Aippy] Score report failed', error)
    }
    const c = slots[idx],
        nb = c && g.score > (c.best || 0);
    if (nb) {
        c.best = g.score;
        persist()
    }
    $('ot').textContent = pick(['YOU FELL', 'TAKEN DOWN', 'THE MILITARY WINS']);
    $('ob').textContent = nb ? 'NEW BEST · ' + g.score : 'Score ' + g.score;
    $('lb-status').textContent = `${runProgress.lastRun?.pointsEarned||0} DESTRUCTION POINTS EARNED · BEST ${runProgress.bests.score}`;
    $('og').innerHTML = [
        [iconMarkup('person'), g.eaten, 'Eaten'],
        [iconMarkup('person'), g.kills - g.eaten, 'Squished'],
        [iconMarkup('building'), g.destroyed, 'Demolished'],
        [iconMarkup('car'), g.crushed, 'Cars blown up']
    ].map(a => '<div class="end-stat"><span>' + a[0] + '</span><b>' + a[1] + '</b><small>' + a[2] + '</small></div>').join('');
    $('over').classList.add('on');
}
const cache={};function setT(id,v){if(cache[id]!==v){cache[id]=v;$(id).textContent=v}}
let shownThreat = -1;
function updateThreat(level) {
    if (shownThreat === level)
        return;
    shownThreat = level;
    const container = $('stars');
    container.replaceChildren();
    const label = document.createElement('span');
    label.className = 'threat-label';
    label.textContent = 'THREAT';
    container.append(label);
    for (let index = 0; index < 5; index++) {
        const star = document.createElement('span');
        star.className = 'threat-star' + (index < level ? ' on' : '');
        star.setAttribute('aria-hidden', 'true');
        star.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2.1 14.9 8.2 21.7 9.1 16.8 13.8 18 20.7 12 17.4 6 20.7 7.2 13.8 2.3 9.1 9.1 8.2Z"/></svg>';
        container.append(star)
    }
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', 'Threat level ' + level + ' of 5')
}
function mmBase(){}
function mmap(){const c=$('mm').getContext('2d'),g=G,span=100,scale=208/span,m=g.mon.position,px=x=>104+(x-m.x)*scale,pz=z=>104+(z-m.z)*scale;c.fillStyle='#293731';c.fillRect(0,0,208,208);c.fillStyle='#494e53';for(let i=Math.floor((m.x-50)/60);i<=(m.x+50)/60;i++)c.fillRect(px(i*60)-8,0,16,208);for(let i=Math.floor((m.z-50)/60);i<=(m.z+50)/60;i++)c.fillRect(0,pz(i*60)-8,208,16);for(const b of g.bl){c.fillStyle=b.dead?'#573832':'#b9b5aa';c.fillRect(px(b.x-b.w/2),pz(b.z-b.d/2),b.w*scale,b.d*scale);}for(const e of g.enemies){c.fillStyle='#ff6648';c.fillRect(px(e.m.position.x)-3,pz(e.m.position.z)-3,6,6);}c.save();c.translate(104,104);c.rotate(-g.mon.rotation.y);c.fillStyle='#d7ff51';c.beginPath();c.moveTo(0,7);c.lineTo(-5,-4);c.lineTo(5,-4);c.closePath();c.fill();c.restore();}
function upd(dt,t){const g=G;if(g.paused)return;clearSlamRecoveryPose(g.mon);const m=g.mon,sz=g.sz,rad=m.userData.radius*sz;
const pad=readPad(),ix=(pad?pad.x:0)+(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+jv[0],iy=(pad?-pad.y:0)+(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-jv[1],sp=(8+3*Math.sqrt(sz))*g.st.sp*tuning.moveSpeed,lim=g.T/2+14;
const previousPosition=m.position.clone();
const l=applyScreenSteering(m,ix,iy,dt,{cameraYaw:g.cameraRig?.yaw??g.yaw,moveSpeed:sp,turnSpeed:tuning.turnSpeed,blocked:g.over||!!g.climbing||Number.isFinite(g.slamRecovery)});
const movement=m.position.clone().sub(previousPosition);m.position.copy(previousPosition);const hb=g.climbing?null:moveWithBuildingCollision(m.position,movement,rad,g.bl,{bodyHeight:m.userData.collisionHeight*sz});if(hb&&l>.1&&!g.climbing){dmgB(hb,dt*40*sz);if(Math.random()<.2)P(hb.x,2,hb.z,'#bbbbbb',2,3)}
if(pad){if(pad.a)g.wc=1;if(pad.b)g.ws=1}
g.cc-=dt;
g.sc-=dt;
g.ch=Math.max(0,g.ch-dt*1.7);
g.sm=Math.max(0,g.sm-dt*1.7);
g.fl=Math.max(0,(g.fl||0)-dt*4);
if(g.sl>0){g.sl-=dt;if(g.sl<=0)smashHit()}
if(g.over)g.dd=Math.min(1,(g.dd||0)+dt*.8);anim(m,t,l,g.ch,g.sm,dt,g.fl,g.dd||0,!!g.biteAttack?.held);if(g.climbing){const phase=(g.climbing.elapsed||0)*7;m.rotation.y=Math.atan2(g.climbing.building.x-m.position.x,g.climbing.building.z-m.position.z);m.userData.arms.forEach((a,i)=>{a.p.rotation.x=-2.2+Math.sin(phase+i*Math.PI)*.45;a.el.rotation.x=-.7-Math.sin(phase+i*Math.PI)*.25;});m.userData.legs.forEach((leg,i)=>{leg.p.rotation.x=-.35+Math.sin(phase+i*Math.PI)*.55;leg.k.rotation.x=.8+Math.cos(phase+i*Math.PI)*.3;});}m.rotation.z=(g.dd||0)*1.45;
{const stp=Math.floor((m.userData.ph||0)/PI);if(stp!==g.stp){g.stp=stp;if(l>.35&&!g.over){P(m.position.x-Math.sin(m.rotation.y)*.6*sz,.2,m.position.z-Math.cos(m.rotation.y)*.6*sz,'#b9b2a0',4,2.5,{s:1.2*sz,l:.6,g:3});g.shake=Math.max(g.shake,.05*sz)}}}
if(!g.over){
    if((keys.Space||g.wc)&&g.cc<=0)chomp();
    if((keys.KeyE||keys.ShiftLeft||g.ws)&&g.sc<=0)smash()
}
g.wc=g.ws=0;
g.ct-=dt;if(g.ct<=0)g.combo=0;{const nt=Math.min(5,1+Math.floor(g.score/1500));if(nt>g.thr){g.thr=nt;banner(nt>=3?'MILITARY ALERT!':'POLICE ALERT!')}}
updHumans(dt,t,m,sz,lim);
updateFeeding(g,dt);
const protectedObjects=[g.held?.m,(g.roofY?g.roofBuilding?.m:null),g.climbing?.building?.m,...g.projectiles.map(c=>c.m)].filter(Boolean);const streamed=g.city.update(m.position.x,m.position.z,{protectedObjects});if(streamed.changed){indexBuildings(g);g.mmd=1;}g.sky.position.copy(m.position);g.fires=g.fires.filter(f=>Math.hypot(f.x-m.position.x,f.z-m.position.z)<110);cleanupDistant(g,m.position,tuning.cleanupDistance);updateSystems(g,dt,t,keys);for(const chunk of g.city.chunks.values()){updateCityDecor(chunk.decor,dt);if(l>.1||g.charge>0)g.score+=hitCityDecor(chunk.decor,m.position,rad+.5,g.sz)*5;}
for(const c of g.cars){if(c.t>0){c.t-=dt;if(c.t<=0)carBoom(c)}if(!c.d&&!c.held&&!c.projectile&&g.growth.stage>=1&&m.position.y<2&&H(c.x-m.position.x,c.z-m.position.z)<rad+1.2)carBoom(c);if(c.fly){const before=c.m.position.clone(),active=stepWreckMotion(c,dt),delta=c.m.position.clone().sub(before);c.m.position.x=before.x;c.m.position.z=before.z;const wall=moveWithBuildingCollision(c.m.position,delta,1.1,g.bl,{bodyHeight:1.5});if(wall){c.fly.v.x*=-.3;c.fly.v.z*=-.3;}if(!active)c.fly=null;}}
for(let i=g.bul.length-1;i>=0;i--){
    const b=g.bul[i];
    b.l-=dt;
    b.age+=dt;
    b.m.position.addScaledVector(b.v,dt);
    b.trail.scale.y=.82+Math.sin(b.age*38)*.18;
    b.core.scale.setScalar(.86+Math.sin(b.age*27)*.12);
    const mp=m.position;
    if(bulletHitsBody(b.m.position,mp,sz,rad)){
        hurt(4);
        P(b.m.position.x,b.m.position.y,b.m.position.z,'#fff0a6',7,3,{l:.28,s:1.2,g:0,up:.35});
        b.l=0
    }
    if(b.l<=0){g.S.remove(b.m);g.bul.splice(i,1)}
}
for(const b of g.bl)if(b.shk>0){b.shk-=dt;b.m.position.x=b.x+(b.shk>0?R(-1,1)*.18:0)}
for(const q of g.dbr)if(q.l>0){q.l-=dt;if(!q.rest){q.v.y-=24*dt;const p=q.m.position;p.addScaledVector(q.v,dt);const y0=gy(p.x,p.z)+q.m.scale.y*.5;q.m.rotation.x+=q.w.x*dt;q.m.rotation.y+=q.w.y*dt;q.m.rotation.z+=q.w.z*dt;if(p.y<y0){p.y=y0;if(q.v.y<-3){q.v.y*=-.35;q.v.x*=.65;q.v.z*=.65;q.w.multiplyScalar(.5);if(Math.random()<.4)P(p.x,p.y,p.z,'#bdb6a8',3,2,{s:1.2,l:.6})}else{q.rest=1}}}if(q.l<=0)q.m.visible=false}
for(let i=g.fires.length-1;i>=0;i--){const f=g.fires[i];f.l-=dt;if(f.l<=0){g.fires.splice(i,1);continue}if(Math.random()<.7*tuning.fireIntensity)P(f.x+R(-f.w/2,f.w/2),.8,f.z+R(-f.w/2,f.w/2),pick(['#ff8a1f','#ffd34a','#ff4a1f']),1,1.2,{up:2.5,g:-2,l:.8,s:1.8});if(Math.random()<.35*tuning.fireIntensity)P(f.x+R(-2,2),1.5,f.z+R(-2,2),'#3a3836',1,.8,{up:2,g:-2.5,l:2.2,s:3})}
for(const tr of nearbyTrees(g,m.position.x,m.position.z))if(!tr.f&&H(tr.x-m.position.x,tr.z-m.position.z)<rad+.8)knockTree(tr,g);
updateFallenTrees(dt,g);
for(const q of g.parts)if(q.l>0){q.l-=dt;q.v.y-=q.g*dt;const p=q.m.position;p.addScaledVector(q.v,dt);q.m.scale.setScalar(q.s*Math.max(.15,q.l/q.l0));const y0=gy(p.x,p.z);if(p.y<y0+.05&&q.g>0){if(q.bl){if(Math.random()<.35)decal(p.x,p.z,R(.3,.9));q.l=0}else{p.y=y0+.05;q.v.y*=-.3}}if(q.l<=0)q.m.visible=false}
for(const d of g.dec)if(d.visible&&d.userData.tg&&d.scale.x<d.userData.tg){const s=Math.min(d.userData.tg,d.scale.x+dt*d.userData.tg*2.2);d.scale.set(s,s,1)}
if(g.drip>0){g.drip-=dt;if(Math.random()<.5){const mp=TV;m.userData.head.getWorldPosition(mp);P(mp.x,mp.y-.2,mp.z,pick(RED),1,.6,{up:0,g:12,bl:1,l:.9,s:.9})}}
for(const q of g.prts)if(q.l>0){q.l-=dt;if(!q.rest){q.v.y-=22*dt;const p=q.g.position;p.addScaledVector(q.v,dt);q.g.scale.setScalar((q.goreScale||1)*Math.max(.15,q.l/90));q.g.rotation.x+=q.w.x*dt;q.g.rotation.y+=q.w.y*dt;q.g.rotation.z+=q.w.z*dt;if(q.sp>0){q.sp-=dt;if(Math.random()<.85)P(p.x,p.y,p.z,pick(RED),1,1.2,{bl:1,l:.7,up:.2,fx:q.v.x*.3,fz:q.v.z*.3,s:.8})}const y0=gy(p.x,p.z)+q.h;if(p.y<y0){p.y=y0;if(!q.landed){q.landed=1;decal(p.x,p.z,R(.7,1.3))}if(q.v.y<-3){q.v.y*=-.3;q.v.x*=.55;q.v.z*=.55;q.w.multiplyScalar(.5)}else{q.rest=1;if(q.type!='head')q.g.rotation.set(PI/2,R(0,6.28),0);decal(p.x,p.z,R(.8,1.5))}}}if(q.l<=0)q.g.visible=false}
for(const q of g.gibs)if(q.l>0){q.l-=dt;q.v.y-=20*dt;const p=q.m.position;p.addScaledVector(q.v,dt);const y0=gy(p.x,p.z)+.1;if(p.y<y0){p.y=y0;if(q.v.y<-2.5&&Math.random()<.7)decal(p.x,p.z,R(.4,.9));q.v.y*=-.3;q.v.x*=.6;q.v.z*=.6;q.w.multiplyScalar(.6)}q.m.rotation.x+=q.w.x*dt;q.m.rotation.z+=q.w.z*dt;if(q.l<1.5)q.m.scale.multiplyScalar(.96);if(q.l<=0)q.m.visible=false}
for(let i=g.rings.length-1;i>=0;i--){const o=g.rings[i];o.l-=dt;o.m.scale.setScalar(Math.max(.1,(1-o.l/.5)*o.rad));o.m.material.opacity=Math.max(0,o.l*1.6);if(o.l<=0){g.S.remove(o.m);o.m.material.dispose();g.rings.splice(i,1)}}
g.sp-=dt;if(g.sp<=0&&g.hum.length<QS[QUAL].hum){g.sp=.5;const p=randPos(35);spawnH(p[0],p[1],0)}
g.ss-=dt;if(g.ss<=0){g.ss=Math.max(3,9-g.thr);if(g.hum.filter(h=>h.sol).length<3+g.thr*2)for(let i=0;i<2;i++){const p=randPos(40);spawnH(p[0],p[1],1)}}
if(g.hp<=0&&!g.over)end();
{const w=Math.round(Math.max(0,g.hp/g.max*100)*2)/2+'%';if(cache.hpw!==w){cache.hpw=w;$('hp').style.width=w}}setT('hpt',Math.max(0,Math.ceil(g.hp))+' / '+g.max);setT('sc',String(g.score));
const mu=Math.min(5,1+(g.combo>>2));setT('cb',g.combo>1?g.combo+' KILL COMBO  x'+mu:'');{const w=g.combo>1?Math.round(Math.max(0,g.ct/3.5*100))+'%':'0';if(cache.cbw!==w){cache.cbw=w;$('cbb').firstChild.style.width=w}}
updateThreat(g.thr);setT('k1v',String(g.eaten));setT('k2v',String(g.destroyed));setT('k3v',String(g.crushed));
const pc=Math.round(Math.max(0,g.cc)/.72*100),ps=Math.round(Math.max(0,g.sc)/1.1*100);
if(cache.pc!==pc){cache.pc=pc;$('bc').lastChild.style.background='conic-gradient(#000a '+pc+'%,transparent 0)'}
if(cache.ps!==ps){cache.ps=ps;$('bs').lastChild.style.background='conic-gradient(#000a '+ps+'%,transparent 0)'}
g.mt=(g.mt||0)-dt;if(g.mt<=0){g.mt=.066;mmap()}
g.shake=Math.max(0,g.shake-dt*1.5);updateCamera(g,dt);applySlamRecoveryPose(m,g.slamRecovery);updateCharacterTrial(m,dt,{speed:l,chomp:g.ch,smash:g.sm,held:!!g.held,climbing:!!g.climbing,slamming:Number.isFinite(g.slamRecovery),jumping:!!g.jump});updateCarriedActor(g);
g.dl.position.set(m.position.x+45,80,m.position.z+25);g.dl.target.position.set(m.position.x,0,m.position.z)}
function updateCamera(g,dt){const m=g.mon;g.cameraRig=cameraStep(g.cameraRig,{x:m.position.x,y:m.position.y-(m.userData.slamVisualLift||0),z:m.position.z,facing:m.rotation.y,size:g.sz}, {...tuning,cameraZoom:g.zd},dt);g.yaw=g.cameraRig.yaw;const p=g.cameraRig.position;cam.position.set(p.x,p.y,p.z);cam.position.x+=R(-1,1)*g.shake*tuning.shake;cam.position.y+=R(-1,1)*g.shake*tuning.shake;cam.fov=g.cameraRig.fov;cam.updateProjectionMatrix();const look=g.cameraRig.lookAt;cam.lookAt(look.x,look.y,look.z);}
function hitDecor(g,point,radius,force){if(!g?.city)return 0;let count=0;for(const chunk of g.city.chunks.values())count+=hitCityDecor(chunk.decor,point,radius,force);g.score+=count*5;return count;}
function renderOcclusion(g){if(!tuning.occlusionOutlines)return;g.occlusionFX??=createOcclusionOutlines(rd);const actors=[{object:g.mon,color:0xd7ff51},...g.hum.map(h=>({object:h.m,color:h.sol?0xff8360:0x75e7ff})),...g.cars.map(c=>({object:c.m,color:0xffd57b})),...g.enemies.map(e=>({object:e.m,color:e.rival?0xff77ab:0xff8360})),...g.trees.filter(t=>!t.f).map(t=>({object:t.m,color:0x9adf93}))];g.occlusionFX.render(g.S,cam,{actors,buildings:g.bl});}
const clock=new T3.Clock();
let lastTs=0;
function loop(ts){requestAnimationFrame(loop);const gap=mode=='game'?(G&&G.paused?32:10):mode=='edit'?14:32;if(ts&&ts-lastTs<gap)return;lastTs=ts||0;
const dt=Math.min(clock.getDelta(),.05),t=clock.elapsedTime;
rd.toneMappingExposure=tuning.exposure;if(G?.ambient)G.ambient.intensity=tuning.ambientLight;if(G?.dl){G.dl.intensity=tuning.sunLight;G.dl.shadow.intensity=tuning.shadowDarkness;}
if(mode=='game'&&G){padPause();upd(dt,t);if(G.paused)updateCamera(G,dt);perfAdapt(dt);withCameraInteriorCutaways(G.bl,cam.position,()=>{rd.render(G.S,cam);renderOcclusion(G)})}
else if(pm){editorFrame(dt,t)}
if(perf.dbg)dbgTick(dt)}
initializeSystems({props:(p,r,f)=>hitDecor(G,p,r,f),game:()=>G,getSlot:()=>idx,toast,banner,pause:pauseT,particles:P,ring,kill,splat:wallSplat,damage:dmgB,carBoom,hurt,resolve,start:()=>{let slot=foc;if(!slots[slot]){slots[slot]={...DEF};persist();}void play(slot);}});
$('end-upgrades').onclick=()=>{renderUpgrades();$('evolution').classList.add('on');};
menu();loop();