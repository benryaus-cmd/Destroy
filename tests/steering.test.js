import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyScreenSteering} from '../src/game/steering.js';
const actor=yaw=>{const m=new THREE.Group();m.rotation.y=yaw;return m;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('stick directions translate relative to the current camera, regardless of monster facing',()=>{
 const m=actor(1);applyScreenSteering(m,0,1,.5,{cameraYaw:0,moveSpeed:10});near(m.position.z,-5);near(m.position.x,0);
 const other=actor(-2);applyScreenSteering(other,0,1,.5,{cameraYaw:Math.PI/2,moveSpeed:10});near(other.position.x,-5);near(other.position.z,0);
});
test('left walks left on screen rather than rotating in place; diagonals have equal maximum speed',()=>{
 const m=actor(0);applyScreenSteering(m,-1,0,.5,{cameraYaw:0,moveSpeed:10});near(m.position.x,-5);near(m.position.z,0);
 const diagonal=actor(0);applyScreenSteering(diagonal,1,1,.5,{moveSpeed:10});near(diagonal.position.length(),5);
});
test('easing left toward up as the camera swings preserves a fixed world travel direction',()=>{
 const m=actor(0);
 for(let i=0;i<=60;i++){
  const yaw=Math.PI/2+i/60*Math.PI/2;
  applyScreenSteering(m,-Math.sin(yaw),-Math.cos(yaw),1/60,{cameraYaw:yaw,moveSpeed:6});
 }
 near(m.position.x,0);near(m.position.z,6.1);
});
test('turning responds along the shortest arc without changing movement intent',()=>{
 const m=actor(Math.PI-.1);applyScreenSteering(m,-.1,1,.05,{cameraYaw:0,moveSpeed:4,turnSpeed:2});
 assert.ok(m.rotation.y>Math.PI-.02);assert.ok(m.rotation.y<Math.PI+.1);assert.ok(m.position.z<0);
});
test('release, deadzone and blocked controls do not move or rotate the character',()=>{
 for(const [x,y,blocked] of [[0,0,false],[.01,.01,false],[1,1,true]]){
  const m=actor(.4);assert.equal(applyScreenSteering(m,x,y,.2,{blocked}),0);near(m.rotation.y,.4);near(m.position.length(),0);
 }
});


test('a full reversal faces the new direction promptly while travelling in a straight line',()=>{
 const m=actor(0);
 for(let i=0;i<9;i++)applyScreenSteering(m,0,1,1/60,{cameraYaw:0,moveSpeed:10,turnSpeed:2.4});
 assert.ok(Math.abs(Math.PI-Math.abs(m.rotation.y))<.1);near(m.position.x,0);near(m.position.z,-1.5);
});
