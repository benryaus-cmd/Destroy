import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3,Bone} from 'three';
import {createThrowState,advanceThrowRotation,createWreckMotion,stepWreckMotion} from '../src/game/throwPhysics.js';
const actor=human=>({id:7,m:new Group(),throwableHuman:human,arms:[{p:new Group(),e:new Group()},{p:new Group(),e:new Group()}],legs:[{p:new Group(),k:new Group()},{p:new Group(),k:new Group()}]});
test('tumbling preserves launch pose and is independent of update rate',()=>{
 const a=actor(false),b=actor(false);a.m.rotation.set(.2,.8,.4);b.m.quaternion.copy(a.m.quaternion);
 const sa=createThrowState(a,1.2,1),sb=createThrowState(b,1.2,1);
 for(let i=0;i<30;i++)advanceThrowRotation(a,1/30,sa);
 for(let i=0;i<120;i++)advanceThrowRotation(b,1/120,sb);
 assert.ok(a.m.quaternion.angleTo(b.m.quaternion)<1e-7);assert.ok(Math.abs(a.m.rotation.y-.8)>.01);
});
test('people articulate shoulders elbows hips and knees during flight',()=>{
 const h=actor(true),s=createThrowState(h,0,1);advanceThrowRotation(h,.2,s);
 for(const limb of [...h.arms,...h.legs]){assert.ok(limb.p.rotation.toArray().slice(0,3).some(x=>Math.abs(x)>.1));assert.ok(Math.abs((limb.e||limb.k).rotation.x)>.1);}
 const before=h.arms[0].p.quaternion.clone();advanceThrowRotation(h,.15,s);assert.ok(before.angleTo(h.arms[0].p.quaternion)>.1);
});
test('authored skeleton joints flail while retaining their original rest orientations',()=>{
 const h=actor(true),upper=new Bone(),lower=new Bone();upper.name='UpperArm.L';lower.name='LowerArm.L';upper.rotation.y=.3;upper.add(lower);h.m.add(upper);
 const s=createThrowState(h,0,1);advanceThrowRotation(h,.2,s);assert.ok(Math.abs(upper.rotation.x)>.1);assert.ok(Math.abs(lower.rotation.x)>.1);assert.ok(Math.abs(upper.rotation.y-.3)<.001);
});
test('wreck preserves incoming momentum and ricochets away from a wall',()=>{
 const c=actor(false),f={v:new Vector3(10,-5,3),rotation:createThrowState(c,0,1)};
 const wreck=createWreckMotion(c,f,new Vector3(-1,0,0));assert.ok(wreck.v.x<0);assert.ok(wreck.v.z>0);assert.ok(wreck.w.length()>0);
});
test('wreck bounces and settles with bounded updates and no upright snap',()=>{
 const c=actor(false);c.m.position.set(0,2,0);c.m.rotation.z=.8;
 const f=createWreckMotion(c,{v:new Vector3(8,-12,2),rotation:createThrowState(c,0,1)});
 let active=true,steps=0;while(active&&steps++<1500)active=stepWreckMotion(c,1/60,f);
 assert.equal(active,false);assert.ok(c.m.position.y>=.35);assert.ok(c.m.position.x>0);assert.ok(c.m.quaternion.angleTo(new Group().quaternion)>.1);assert.ok(steps<1500);
});
