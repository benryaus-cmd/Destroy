import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDestructibleBuilding,getBuildingSections} from '../src/game/destruction.js';
import {updateJumpMotion,supportAt,applySlamRecoveryPose,clearSlamRecoveryPose} from '../src/game/jumpLanding.js';

const building=()=>{const m=createDestructibleBuilding({w:12,d:12,h:12,seed:1});return {m,x:0,z:0,w:12,d:12,h:12,dead:false};};
const tuning={jumpHeight:6,jumpDuration:1.15};
const game=(b,y=12.3)=>({mon:new THREE.Group(),bl:[b],sz:1,jump:{t:0,startY:y,slam:false},roofY:y,roofBuilding:b});
const tick=(g,dt=.016)=>updateJumpMotion(g,dt,tuning);
const run=(g)=>{let landing=null;for(let i=0;i<400&&!landing;i++)landing=tick(g);return landing;};
test('jump from a roof lands back on its live roof rather than at street level',()=>{const b=building(),g=game(b);g.mon.position.set(2,12.3,2);const landing=run(g);assert.equal(landing.building,b);assert.ok(g.mon.position.y>=12.239&&g.mon.position.y<=12.31);assert.equal(g.roofBuilding,b);assert.equal(g.jump,null);assert.equal(tick(g),null);});
test('large descending time steps sweep feet across the roof and land exactly once',()=>{const b=building(),g=game(b,20);g.mon.position.set(1,20,1);g.jump.falling=true;let calls=0;const hit=updateJumpMotion(g,2,tuning,{onLand:()=>calls++});assert.equal(hit.building,b);assert.equal(calls,1);updateJumpMotion(g,.1,tuning,{onLand:()=>calls++});assert.equal(calls,1);});
test('a destroyed roof tile falls through to the next surviving floor',()=>{const b=building();for(const s of getBuildingSections(b.m))if(s.kind==='roof'&&s.position.x>0&&s.position.z>0)s.removed=true;const g=game(b,14);g.mon.position.set(2,14,2);g.jump.falling=true;const landing=run(g);assert.equal(landing.building,b);assert.equal(landing.section.kind,'floor');assert.ok(landing.height<12&&landing.height>4);});
test('falling never launches up and missing every slab reaches street level',()=>{const b=building();for(const s of getBuildingSections(b.m))s.removed=true;const g=game(b,14);g.mon.position.set(2,14,2);g.jump.falling=true;tick(g);assert.ok(g.mon.position.y<14);const landing=run(g);assert.equal(landing.height,0);assert.equal(g.roofY,0);assert.equal(g.roofBuilding,null);});
test('slam falls from current altitude, starts recovery only upon contact and emits one event',()=>{const b=building(),g=game(b,24);g.mon.position.set(2,24,2);g.jump.slam=true;assert.equal(tick(g),null);assert.ok(g.mon.position.y>20);assert.equal(g.slamRecovery,undefined);const landing=run(g);assert.equal(landing.slam,true);assert.equal(g.slamRecovery,0);assert.equal(landing.building,b);assert.equal(tick(g),null);assert.ok(g.slamRecovery>0);});
test('support lookup respects world transforms, removed tiles, dead buildings and ceiling',()=>{const b=building();b.m.position.set(30,2,20);b.m.rotation.y=.7;const p=b.m.localToWorld(new THREE.Vector3(2,0,2));const roof=supportAt([b],p.x,p.z,20);assert.equal(roof.section.kind,'roof');assert.ok(roof.height>14);assert.equal(supportAt([b],p.x,p.z,8).section.kind,'floor');b.dead=true;assert.equal(supportAt([b],p.x,p.z,20),null);});
test('a falling body below an overhead roof does not snap upward onto it',()=>{const b=building(),g=game(b,7);g.mon.position.set(2,7,2);g.jump.falling=true;const landing=run(g);assert.ok(landing.height<7);assert.equal(landing.section.kind,'floor');});
test('bellyflop lies face-down with spread limbs then stands and removes visual offset',()=>{const m=new THREE.Group();m.position.y=12.24;m.scale.setScalar(1.5);m.userData={radius:1,arms:[{p:new THREE.Group(),el:new THREE.Group(),side:1}],legs:[{p:new THREE.Group(),k:new THREE.Group(),f:new THREE.Group()}]};assert.equal(applySlamRecoveryPose(m,0),true);assert.ok(Math.abs(m.rotation.x-Math.PI/2)<1e-6);assert.ok(m.position.y>12.24);assert.ok(m.userData.arms[0].p.rotation.z>0);clearSlamRecoveryPose(m);assert.ok(Math.abs(m.position.y-12.24)<1e-6);assert.equal(m.rotation.x,0);applySlamRecoveryPose(m,.65);assert.ok(m.rotation.x>0&&m.rotation.x<Math.PI/2);assert.equal(applySlamRecoveryPose(m,1),false);assert.ok(Math.abs(m.position.y-12.24)<1e-6);assert.equal(m.rotation.x,0);});

test('bellyflop follows current heading instead of always falling along world z',()=>{const m=new THREE.Group();m.rotation.y=Math.PI/2;const order=m.rotation.order;applySlamRecoveryPose(m,0);const up=new THREE.Vector3(0,1,0).applyEuler(m.rotation);assert.ok(up.x>.99);assert.ok(Math.abs(up.z)<.001);clearSlamRecoveryPose(m);assert.equal(m.rotation.order,order);assert.ok(Math.abs(m.rotation.y-Math.PI/2)<.001);});

test('interior floor quadrants meet at center seams so exposed floors catch a falling monster',()=>{
 const b=building();const support=supportAt([b],0,2,11);assert.ok(support.height>8&&support.height<9);
 const g=game(b,11);g.mon.position.set(0,11,2);g.jump.falling=true;const hit=run(g);assert.ok(hit.height>8&&hit.height<9);
});
