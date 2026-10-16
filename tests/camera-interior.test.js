import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {withCameraInteriorCutaways} from '../src/game/cameraInterior.js';
const building=()=>{const m=new THREE.Group();m.position.set(10,0,20);return {m,w:8,d:8,h:12,dead:false};};
test('camera inside building sees out without moving camera or changing the building state',()=>{
 const b=building(),p=new THREE.Vector3(10,4,20);let calls=0;
 withCameraInteriorCutaways([b],p,()=>{calls++;assert.equal(b.m.visible,false);assert.equal(b.dead,false);assert.equal(b.h,12);assert.deepEqual(p.toArray(),[10,4,20]);});
 assert.equal(calls,1);assert.equal(b.m.visible,true);
});
test('outside/above camera keeps buildings visible and hidden buildings stay hidden',()=>{
 const b=building(),hidden=building();hidden.m.visible=false;
 for(const p of [new THREE.Vector3(0,3,0),new THREE.Vector3(10,14,20)])withCameraInteriorCutaways([b,hidden],p,()=>{assert.equal(b.m.visible,true);assert.equal(hidden.m.visible,false);});
});
test('cutaways restore visibility even if rendering fails and handle transformed buildings',()=>{
 const b=building();b.m.rotation.y=Math.PI/4;const p=new THREE.Vector3(2,3,0);b.m.updateMatrixWorld();b.m.localToWorld(p);
 assert.throws(()=>withCameraInteriorCutaways([b],p,()=>{assert.equal(b.m.visible,false);throw Error('render');}),/render/);assert.equal(b.m.visible,true);
});
