import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { applyTankSteering } from '../src/game/steering.js';
const actor = yaw => {const m=new THREE.Group();m.rotation.y=yaw;return m;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('up moves along current facing and down reverses without turning around',()=>{
 const m=actor(Math.PI/2);applyTankSteering(m,0,1,.5,{moveSpeed:10});near(m.position.x,5);near(m.position.z,0);
 applyTankSteering(m,0,-1,.5,{moveSpeed:10});near(m.position.length(),0);near(m.rotation.y,Math.PI/2);
});
test('left and right rotate in place, including while reversing',()=>{
 const m=actor(0);applyTankSteering(m,1,0,.5,{turnSpeed:2});near(m.rotation.y,-1);near(m.position.length(),0);
 applyTankSteering(m,-1,0,.5,{turnSpeed:2});near(m.rotation.y,0);
 applyTankSteering(m,1,-1,.5,{turnSpeed:2,moveSpeed:10});near(m.rotation.y,-1);assert.ok(m.position.z<0);
});
test('held forward and turn remain stable across frames without any camera input',()=>{
 const a=actor(0),b=actor(0);for(let i=0;i<30;i++)applyTankSteering(a,.7,1,1/30,{moveSpeed:10,turnSpeed:2});
 for(let i=0;i<120;i++)applyTankSteering(b,.7,1,1/120,{moveSpeed:10,turnSpeed:2});
 near(a.rotation.y,b.rotation.y);near(a.position.x,b.position.x);near(a.position.z,b.position.z);
});
test('blocked controls neither turn nor translate and sideways input has no walk animation',()=>{
 const m=actor(.4);assert.equal(applyTankSteering(m,1,1,.2,{blocked:true}),0);near(m.rotation.y,.4);near(m.position.length(),0);
 assert.equal(applyTankSteering(m,1,0,.2),0);
});
