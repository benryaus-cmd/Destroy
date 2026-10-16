import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createConquest, bankRun, equipMutation, readConquest } from '../src/game/conquest.js';
import { createDestructibleBuilding, damageBuilding, serializeBuilding, getBuildingSections } from '../src/game/destruction.js';
import {
  campaign, tuning, DEFAULT_TUNING, initializeSystems, prepareGame, saveCity,
  pendingResume, action, updateSystems, mutationConfig, roofAt, resetRunCity, finishRun, runProgress,
} from '../src/game/conquestRuntime.js';

// These tests run actual Three scene objects and simulation code in Node. The
// document double provides only UI nodes and the 2D calls used by CanvasTexture;
// no WebGL renderer, layout, touch events or browser behavior is simulated.
const element = () => ({
  textContent: '', disabled: false, style: {}, classList: { add() {}, remove() {} },
  addEventListener() {}, append() {}, replaceChildren() {}, setAttribute() {}, select() {},
});
const ids = [
  'campaign-info', 'campaign-status', 'continue-run', 'evolution-balance',
  'quick-start', 'open-mutations', 'close-evolution', 'evolution', 'mutation-list',
  'bg', 'bj', 'bd', 'bp', 'menu-tune', 'game-tune', 'tuning', 'close-tuning',
  'tuning-reset', 'tuning-export', 'tuning-json', 'tuning-fields', 'district-label',
  'growth-label', 'growth-fill', 'challenge-label', 'save-status', 'grab-label',
  'jump-label', 'action-hint',
];
const nodes = new Map(ids.map(id => [id, element()]));
globalThis.document = {
  getElementById: id => nodes.get(id) ?? null,
  addEventListener() {},
  createElement(tag) {
    if (tag !== 'canvas') return element();
    return { width: 0, height: 0, getContext: () => ({
      createRadialGradient: () => ({ addColorStop() {} }), fillRect() {},
    }) };
  },
};
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};

function building(x = 0, z = 0, h = 8) {
  const m = createDestructibleBuilding({ w: 8, d: 8, h, seed: 41 });
  m.position.set(x, 0, z);
  m.updateMatrixWorld(true);
  return { m, x, z, w: 8, d: 8, h, dead: 0 };
}

function game({ buildings = [], eaten = 0 } = {}) {
  const S = new THREE.Scene();
  const mon = new THREE.Group();
  S.add(mon);
  const carMesh = new THREE.Group();
  carMesh.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), new THREE.MeshStandardMaterial({ color: '#6584a6' })));
  carMesh.position.set(1, .05, 1);
  S.add(carMesh);
  for (const b of buildings) S.add(b.m);
  return {
    S, mon, T: 100, bl: buildings,
    cars: [{ m: carMesh, x: 1, z: 1, d: 0 }], hum: [], fires: [],
    c: { size: 1, horns: 2, parts: {} },
    st: { sp: 1, hp: 100, smash: 1, bite: 1 }, base: 1, sz: 1,
    score: 0, eaten, destroyed: 0, crushed: 0, kills: 0, thr: 0,
    yaw: 0, pitch: .62, zd: 1, paused: false, over: false, shake: 0,
  };
}

function harness() {
  values.clear();
  for (const key of Object.keys(campaign)) delete campaign[key];
  Object.assign(campaign, createConquest(12345));
  Object.assign(tuning, DEFAULT_TUNING, { soundVolume: 0 });
  let current;
  const calls = { damage: [], carBoom: [], rings: [], toasts: [], banners: [], kills: [], splats: [] };
  initializeSystems({
    game: () => current, getSlot: () => 2, start() {}, pause() {},
    toast: message => calls.toasts.push(message), banner: message => calls.banners.push(message),
    particles() {}, ring: (...args) => calls.rings.push(args),
    splat: (...args) => calls.splats.push(args),
    kill: (...args) => calls.kills.push(args), hurt() {}, resolve() {},
    damage(b, amount, position) {
      calls.damage.push({ b, amount, position: position.clone() });
      b.m.updateMatrixWorld(true);
      const local = b.m.worldToLocal(position.clone());
      const result = damageBuilding(b.m, { ...local, radius: 1.2, damage: amount });
      if (result.collapsed) b.dead = 1;
    },
    carBoom(c) { calls.carBoom.push(c); c.d = 1; },
  });
  return { calls, use(g, snapshot) { current = g; prepareGame(g, snapshot); return g; } };
}

test('prepareGame/saveCity resume the same creature, camera, cars and damaged sections', () => {
  const h = harness();
  const b = building(20, 20);
  const g = h.use(game({ buildings: [b], eaten: 8 }));
  const damage = damageBuilding(b.m, { x: 0, y: 2, z: -4, radius: 1, damage: 30 });
  assert.ok(damage.removed.length > 0);
  Object.assign(g, { score: 1200, destroyed: 3, crushed: 2, kills: 5, hp: 71, yaw: -.8, pitch: .83, zd: 1.7, seq: 17 });
  g.c = { size: 1.2, horns: 4, bodyCol: '#446688', parts: { head: { x: .2 } } };
  g.mon.position.set(15, 0, -7);
  g.mon.rotation.y = 1.4;
  Object.assign(g.cars[0], { x: 4, z: -8, d: 1 });
  g.cars[0].m.position.set(4, .05, -8);
  g.cars[0].m.rotation.y = -.2;
  assert.equal(saveCity(g, true), true);
  const snapshot = pendingResume();
  assert.ok(snapshot);
  assert.deepEqual(snapshot.config, g.c);
  assert.equal(snapshot.slot, 2);
  assert.equal(readConquest(localStorage).seed, 12345);
  assert.deepEqual(readConquest(localStorage).activeRun, snapshot);
  const fresh = game({ buildings: [building(20, 20)] });
  fresh.c = structuredClone(snapshot.config);
  const resumed = h.use(fresh, snapshot);
  for (const key of ['score', 'eaten', 'destroyed', 'crushed', 'kills', 'yaw', 'pitch', 'zd', 'seq']) assert.equal(resumed[key], g[key], key);
  assert.equal(resumed.runId, g.runId);
  assert.equal(resumed.hp, 71);
  assert.deepEqual(resumed.mon.position.toArray(), [15, 0, -7]);
  assert.equal(resumed.mon.rotation.y, 1.4);
  assert.deepEqual(serializeBuilding(resumed.bl[0].m), serializeBuilding(b.m));
  assert.deepEqual(resumed.cars[0].m.position.toArray(), [4, .05, -8]);
  assert.equal(resumed.cars[0].m.rotation.y, -.2);
  assert.equal(resumed.cars[0].d, 1);
});

test('saved mutation IDs keep sortie stats when the next-sortie loadout changes', () => {
  const h = harness();
  bankRun(campaign, { id: 'unlock-budget', score: 40000 });
  assert.equal(equipMutation(campaign, 'crusher-horns').ok, true);
  const original = game();
  original.c = mutationConfig(original.c);
  h.use(original);
  saveCity(original, true);
  const snapshot = pendingResume();
  assert.deepEqual(snapshot.equipped, ['crusher-horns']);
  assert.equal(equipMutation(campaign, 'iron-hide').ok, true);
  const copy = game();
  copy.c = structuredClone(snapshot.config);
  h.use(copy, snapshot);
  assert.deepEqual(copy.equipped, ['crusher-horns']);
  assert.deepEqual(copy.modifiers, original.modifiers);
  assert.equal(copy.max, original.max);
  assert.equal(copy.st.smash, original.st.smash);
  assert.deepEqual(campaign.activeRun.equipped, ['crusher-horns']);
  assert.deepEqual(campaign.equipped, ['iron-hide']);
});

test('paused updates do not advance motion, cooldowns, input actions or progression', () => {
  const h = harness();
  const g = h.use(game());
  g.paused = true;
  g.actionCooldowns.charge = 2;
  g.jump = { t: .2, startY: 0, slam: false };
  const before = { age: g.age, position: g.mon.position.toArray(), cooldown: g.actionCooldowns.charge, jump: structuredClone(g.jump), xp: campaign.xp };
  updateSystems(g, 2, 2, { KeyQ: true, KeyR: true, KeyF: true, KeyX: true });
  assert.equal(g.age, before.age);
  assert.deepEqual(g.mon.position.toArray(), before.position);
  assert.equal(g.actionCooldowns.charge, before.cooldown);
  assert.deepEqual(g.jump, before.jump);
  assert.equal(g.held, null);
  assert.equal(g.projectiles.length, 0);
  assert.equal(campaign.xp, before.xp);
  assert.equal(h.calls.damage.length, 0);
});

test('grab holds a real vehicle, respects cooldown and throws along monster facing', () => {
  const h = harness();
  const g = h.use(game());
  const c = g.cars[0];
  action(g, 'grab');
  assert.equal(g.held, c);
  assert.equal(c.held, true);
  assert.equal(g.projectiles.length, 0);
  action(g, 'grab');
  assert.equal(g.held, c);
  g.mon.position.set(3, 0, 2);
  updateSystems(g, .31, .31, {});
  assert.equal(c.m.position.x, 3);
  assert.ok(c.m.position.y > 3);
  g.yaw = 0; // camera is on +Z; aim goes into the scene toward -Z
  g.mon.rotation.y = Math.PI / 2; // facing and camera aim deliberately differ
  action(g, 'grab');
  assert.equal(g.held, null);
  assert.equal(c.held, false);
  assert.equal(g.projectiles.length, 1);
  assert.equal(g.projectiles[0], c);
  assert.ok(c.projectile.v.x >= 18);
  assert.ok(Math.abs(c.projectile.v.z) < 1e-8);
  assert.ok(c.projectile.v.y > 0);
  assert.equal(campaign.districts.uptown.throws, 1);
});

test('charge starts once, moves the monster and cannot restart until cooldown expires', () => {
  const h = harness();
  const g = h.use(game());
  action(g, 'charge');
  assert.equal(g.actionCooldowns.charge, tuning.chargeCooldown);
  assert.equal(h.calls.banners.length, 1);
  updateSystems(g, .1, .1, {});
  assert.ok(g.mon.position.z > 0);
  const remaining = g.actionCooldowns.charge;
  action(g, 'charge');
  assert.equal(g.actionCooldowns.charge, remaining);
  assert.equal(h.calls.banners.length, 1);
  for (let i = 1; i < 10; i++) updateSystems(g, .1, i / 10, {});
  assert.ok(g.charge <= 0);
  action(g, 'charge');
  assert.equal(h.calls.banners.length, 1);
  for (let i = 10; i < 42; i++) updateSystems(g, .1, i / 10, {});
  assert.equal(g.actionCooldowns.charge, 0);
  action(g, 'charge');
  assert.equal(h.calls.banners.length, 2);
});

test('a vehicle crossing an entire building in one step opens the entry facade once', () => {
  const h = harness();
  const b = building();
  const g = h.use(game({ buildings: [b] }));
  const c = g.cars[0];
  c.m.position.set(0, 2.5, -15);
  c.projectile = { v: new THREE.Vector3(0, 0, 150), age: 0, hit: new Set(), previous: c.m.position.clone() };
  g.projectiles.push(c);
  updateSystems(g, .2, .2, {});
  assert.equal(h.calls.damage.length, 1);
  assert.equal(h.calls.damage[0].b, b);
  assert.ok(h.calls.damage[0].amount > 0);
  const impactZ = h.calls.damage[0].position.z;
  assert.ok(impactZ < -3.8 && impactZ > -5, `damage must occur beside the entry face, got ${impactZ}`);
  const sections = getBuildingSections(b.m);
  assert.ok(sections.some(s => s.kind === 'wall' && s.position.z < -3.9 && s.removed));
  assert.ok(sections.filter(s => s.kind === 'wall' && s.position.z > 3.9).every(s => !s.removed));
  assert.equal(g.projectiles.length, 0);
  assert.equal(c.projectile, null);
  assert.equal(h.calls.carBoom.length, 1);
  updateSystems(g, .1, .3, {});
  assert.equal(h.calls.damage.length, 1);
  assert.equal(h.calls.carBoom.length, 1);
});

test('a projectile can travel through a previously opened facade into its interior', () => {
  const h = harness();
  const b = building();
  const g = h.use(game({ buildings: [b] }));
  const hole = damageBuilding(b.m, { x: 0, y: 2, z: -4, radius: .5, damage: 30 });
  assert.ok(hole.removed.length > 0);
  assert.equal(hole.collapsed, false);
  const c = g.cars[0];
  c.m.position.set(0, 2.5, -15);
  c.projectile = { v: new THREE.Vector3(0, 0, 150), age: 0, hit: new Set(), previous: c.m.position.clone() };
  g.projectiles.push(c);
  updateSystems(g, .1, .1, {});
  assert.equal(h.calls.damage.length, 0, 'the removed facade must no longer collide');
  assert.equal(h.calls.carBoom.length, 0);
  assert.equal(g.projectiles.length, 1);
  assert.ok(c.projectile);
  assert.equal(c.m.position.z, 0);
});

test('jump while climbing launches immediately and walking off a roof returns to ground', () => {
  const h = harness();
  const b = building(0, 0, 4);
  const g = h.use(game({ buildings: [b], eaten: 6 }));
  action(g, 'jump');
  assert.equal(g.climbing?.building, b);
  updateSystems(g, .3, .3, {});
  const climbedY = g.mon.position.y;
  assert.ok(climbedY > 0);
  action(g, 'jump');
  assert.equal(g.climbing, null);
  assert.ok(g.jump);
  assert.equal(g.jump.startY, climbedY);
  updateSystems(g, .1, .4, {});
  assert.ok(g.mon.position.y > climbedY);

  // A separate intact rooftop isolates roof support from landing damage above.
  const roof = building(20, 20, 4);
  const rooftop = h.use(game({ buildings: [roof], eaten: 6 }));
  rooftop.mon.position.set(20, 0, 20);
  action(rooftop, 'jump');
  updateSystems(rooftop, 1.1, 1.1, {});
  assert.equal(rooftop.climbing, null);
  assert.equal(rooftop.roofBuilding, roof);
  assert.ok(Math.abs(rooftop.mon.position.y-4.24)<.001);
  rooftop.mon.position.x = 25;
  updateSystems(rooftop, .1, 1.2, {});
  assert.equal(rooftop.roofY, 0);
  assert.ok(rooftop.jump);
  assert.ok(rooftop.mon.position.y > 0);
  for (let i = 0; i < 14; i++) updateSystems(rooftop, .1, 1.3 + i / 10, {});
  assert.equal(rooftop.jump, null);
  assert.equal(rooftop.mon.position.y, 0);
});

test('a removed rooftop tile stops supporting the monster while adjacent roof remains solid',()=>{const h=harness(),b=building(0,0,4),g=h.use(game({buildings:[b],eaten:6}));assert.equal(roofAt(b,2,2),true);const result=damageBuilding(b.m,{x:2,y:4.12,z:2,radius:.2,damage:40});assert.equal(result.collapsed,false);assert.equal(roofAt(b,2,2),false);assert.equal(roofAt(b,-2,-2),true);g.roofBuilding=b;g.roofY=4.3;g.mon.position.set(2,4.3,2);updateSystems(g,.1,.1,{});assert.ok(g.jump);assert.equal(g.roofY,0);});

test('each endless run starts small regardless of previous XP and resets city damage without losing banked upgrades',()=>{const h=harness();campaign.xp=99999;campaign.buildings={old:{collapsed:true}};campaign.activeRun={id:'old',health:90,config:{size:4}};resetRunCity();assert.deepEqual(campaign.buildings,{});assert.equal(campaign.activeRun,null);const config=mutationConfig({size:2.2,parts:{}});assert.equal(config.size,.975);const g=game();g.endless=true;g.c=config;g.base=config.size;h.use(g);assert.equal(g.sz,.975);assert.equal(g.growth.stage,0);assert.deepEqual(g.equipped,[]);Object.assign(g,{score:1950,eaten:12,destroyed:4});finishRun(g);assert.equal(runProgress.points,19);finishRun(g);assert.equal(runProgress.points,19);resetRunCity();assert.equal(runProgress.points,19);assert.equal(runProgress.bests.score,1950);});
test('an armed tank can be lifted and thrown without firing or hitting itself',()=>{const h=harness(),g=h.use(game());g.cars=[];const tank={id:'tank-1',rival:false,hp:200,m:new THREE.Group(),cd:0};g.S.add(tank.m);tank.m.position.set(1,0,0);g.enemies.push(tank);action(g,'grab');assert.equal(g.held,tank);assert.equal(tank.held,true);g.mon.rotation.y=Math.PI/2;updateSystems(g,.31,.31,{});assert.equal(tank.hp,200);action(g,'grab');assert.equal(g.held,null);assert.ok(tank.projectile.v.x>0);assert.ok(Math.abs(tank.projectile.v.z)<1e-8);updateSystems(g,.1,.41,{});assert.equal(tank.hp,200);assert.ok(tank.projectile);});


test('a hatchling grabs a person, throws along facing and splats once on the entry wall',()=>{
 const h=harness(),b=building(0,12,12),g=h.use(game({buildings:[b]}));g.cars=[];
 const person={m:new THREE.Group(),x:0,z:1};person.m.position.set(0,0,1);g.S.add(person.m);g.hum.push(person);
 action(g,'grab');assert.equal(g.held,person);assert.equal(person.held,true);
 updateSystems(g,.31,.31,{});g.mon.rotation.y=0;action(g,'grab');assert.equal(g.held,null);assert.ok(person.projectile.v.z>0);
 for(let i=0;i<20&&g.projectiles.length;i++)updateSystems(g,.05,.36+i*.05,{});
 assert.equal(h.calls.splats.length,1);assert.equal(h.calls.splats[0][0],person);assert.equal(h.calls.splats[0][1],b);
 assert.equal(g.projectiles.length,0);assert.equal(person.projectile,null);assert.equal(h.calls.carBoom.length,0);assert.equal(h.calls.kills.length,0);
 updateSystems(g,.1,2,{});assert.equal(h.calls.splats.length,1);
});

test('hatchlings can climb immediately and advance an animation phase',()=>{
 const h=harness(),b=building(0,5,10),g=h.use(game({buildings:[b]}));
 assert.equal(g.growth.stage,0);action(g,'jump');assert.equal(g.climbing?.building,b);
 updateSystems(g,.1,.1,{});assert.ok(g.mon.position.y>0);assert.ok(g.climbing.elapsed>0);
});

test('an unreachable person does not block grabbing a reachable vehicle',()=>{
 const h=harness(),g=h.use(game());g.sz=.65;const person={m:new THREE.Group()};person.m.position.set(0,0,4);g.hum=[person];
 g.cars[0].m.position.set(0,0,5);action(g,'grab');assert.equal(g.held,g.cars[0]);
});

test('runtime charge stops against a surviving facade even when its full step crosses it',()=>{
 const h=harness(),b=building(0,0,10),g=h.use(game({buildings:[b]}));
 g.mon.position.set(0,0,-12);g.mon.rotation.y=0;g.modifiers.charge=0;
 action(g,'charge');updateSystems(g,.5,.5,{});
 assert.ok(g.mon.position.z<-4.9,`charge crossed the wall: ${g.mon.position.z}`);
 assert.ok(h.calls.damage.length>0);assert.equal(serializeBuilding(b.m).removed.length,0);
 updateSystems(g,.1,.6,{});assert.ok(g.mon.position.z<-4.9);
});

test('runtime corrects wall overlap after jump height changes instead of leaving the actor inside a wall',()=>{
 const h=harness(),b=building(0,0,10),g=h.use(game({buildings:[b]}));
 g.mon.position.set(0,5,-4);g.jump={t:.2,startY:5,slam:false};
 updateSystems(g,.05,.05,{});
 assert.ok(Math.abs(g.mon.position.z+4)>1,'airborne body should be separated from facade');
});

test('starting a climb cancels an active charge and keeps the attachment in place',()=>{
 const h=harness(),b=building(0,5,10),g=h.use(game({buildings:[b]}));
 action(g,'charge');action(g,'jump');assert.ok(g.climbing);assert.equal(g.charge,0);
 const x=g.mon.position.x,z=g.mon.position.z;updateSystems(g,.1,.1,{});assert.equal(g.mon.position.x,x);assert.equal(g.mon.position.z,z);
});

test('charge, power and body slam do not steal held people or an active chomp victim',()=>{
 const h=harness(),g=h.use(game({eaten:8})),held={m:new THREE.Group(),held:true},feeding={m:new THREE.Group(),beingEaten:true};g.hum=[held,feeding];g.held=held;
 action(g,'charge');updateSystems(g,.01,.01,{});action(g,'power');
 g.jump={t:tuning.jumpDuration,startY:0,slam:true};g.charge=0;updateSystems(g,.01,.02,{});
 assert.equal(h.calls.kills.length,0);
});

test('jumping on an intact roof returns to that roof instead of passing into its interior',()=>{
 const h=harness(),b=building(0,0,8),g=h.use(game({buildings:[b]}));
 g.mon.position.set(1,8.24,1);g.roofY=8.24;g.roofBuilding=b;action(g,'jump');
 let lifted=false;for(let i=0;i<80&&g.jump;i++){updateSystems(g,.025,i*.025,{});lifted ||=g.mon.position.y>8.5;assert.ok(g.mon.position.y>=8.24-.001);}
 assert.ok(lifted);assert.equal(g.jump,null);assert.equal(g.roofBuilding,b);assert.ok(Math.abs(g.roofY-8.24)<.001);
});

test('rooftop belly slam lands once, starts recovery and avoids street-level victims below it',()=>{
 const h=harness(),b=building(0,0,15),g=h.use(game({buildings:[b]})),person={m:new THREE.Group()};g.hum=[person];
 g.mon.position.set(0,18,0);g.jump={t:0,startY:18,slam:true};
 for(let i=0;i<80&&g.jump;i++)updateSystems(g,.025,i*.025,{});
 assert.equal(g.jump,null);assert.equal(g.slamRecovery,0);assert.ok(g.mon.position.y>14);assert.equal(h.calls.kills.length,0);
 const hits=h.calls.damage.length;updateSystems(g,.025,3,{});assert.equal(h.calls.damage.length,hits);
});

test('a thrown car hitting a surviving facade ricochets back toward the street',()=>{
 const h=harness(),b=building(),g=h.use(game({buildings:[b]})),car=g.cars[0];car.m.position.set(0,2.5,-15);
 car.projectile={v:new THREE.Vector3(0,0,150),age:0,hit:new Set()};g.projectiles.push(car);
 updateSystems(g,.2,.2,{});assert.ok(car.fly);assert.ok(car.fly.v.z<0,'wreck must reflect away from the wall');
});

test('trial character perks affect the actual run stats while creator remains balanced',()=>{
 const h=harness(),g=game();g.c.archetype='kong';h.use(g);assert.equal(g.modifiers.throw,1.35);assert.equal(g.modifiers.climb,1.4);assert.equal(g.st.sp,1.15);assert.equal(g.max,90);
});
