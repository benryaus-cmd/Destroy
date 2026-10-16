import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDestructibleBuilding,restoreBuilding} from '../src/game/destruction.js';
import {moveWithBuildingCollision,resolveBuildingOverlap} from '../src/game/buildingCollision.js';
const create=()=>{const g=createDestructibleBuilding({w:12,d:12,h:12,seed:1});return {m:g,x:0,z:0,w:12,d:12,h:12,dead:false};};
test('fast movement cannot tunnel through an intact facade',()=>{const b=create(),p=new THREE.Vector3(0,0,10);assert.equal(moveWithBuildingCollision(p,{x:0,z:-40},.5,[b]),b);assert.ok(p.z>=6.63 && p.z<6.65);});
test('diagonal movement slides along a wall instead of stopping or entering',()=>{const b=create(),p=new THREE.Vector3(-2,0,8);moveWithBuildingCollision(p,{x:3,z:-4},.5,[b]);assert.ok(Math.abs(p.x-1)<.001);assert.ok(p.z>=6.63);});
test('destroyed facade bays allow entry without an outer bounding box eject',()=>{const b=create();restoreBuilding(b.m,{v:1,removed:['wall:0:1:1'],collapsed:false});const p=new THREE.Vector3(0,0,9);assert.equal(moveWithBuildingCollision(p,{x:0,z:-6},.5,[b]),null);assert.ok(Math.abs(p.z-3)<.001);assert.equal(resolveBuildingOverlap(p,.5,[b]),null);});
test('airborne body still collides with walls; a body above the roof moves freely',()=>{const b=create(),p=new THREE.Vector3(0,5,8);moveWithBuildingCollision(p,{x:0,z:-4},.5,[b],{bodyHeight:1});assert.ok(p.z>=6.63);p.set(0,12.1,8);assert.equal(moveWithBuildingCollision(p,{x:0,z:-4},.5,[b]),null);assert.equal(p.z,4);});
test('body height prevents entering a hole beneath surviving wall sections',()=>{const b=create();const first=b.m.userData.destruction.sections.find(s=>s.id==='wall:0:1:1');first.removed=true;const p=new THREE.Vector3(0,3.5,8);moveWithBuildingCollision(p,{x:0,z:-4},.5,[b],{bodyHeight:2});assert.ok(p.z>=6.63);});
test('translated and rotated buildings use their world transform',()=>{const b=create();b.m.position.set(30,0,20);b.m.rotation.y=Math.PI/4;b.m.updateMatrixWorld(true);const p=b.m.localToWorld(new THREE.Vector3(0,0,9)),end=b.m.localToWorld(new THREE.Vector3(0,0,-20)),delta=end.clone().sub(p);moveWithBuildingCollision(p,delta,.5,[b]);const local=b.m.worldToLocal(p);assert.ok(local.z>=6.63 && local.z<6.65);});
test('overlap correction targets an individual wall and ignores dead buildings',()=>{const b=create(),p=new THREE.Vector3(0,0,6.1);assert.equal(resolveBuildingOverlap(p,.5,[b]),b);assert.ok(p.z>6.63);b.dead=true;p.set(0,0,6);assert.equal(resolveBuildingOverlap(p,.5,[b]),null);});

test('a charge through one broken bay stops at the intact opposite facade',()=>{const b=create();restoreBuilding(b.m,{v:1,removed:['wall:0:1:1'],collapsed:false});const p=new THREE.Vector3(0,0,9);assert.ok(moveWithBuildingCollision(p,{x:0,z:-35},.5,[b])===b);assert.ok(p.z>-5.37 && p.z<-5.34);});
