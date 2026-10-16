import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {beginFeeding,advanceFeeding,chompPose} from '../src/game/feeding.js';
function fixture(){const mon=new THREE.Group(),jaw=new THREE.Group();jaw.position.set(0,.6,1);mon.add(jaw);mon.userData.jaw=jaw;const human=z=>{const m=new THREE.Group();m.position.set(0,0,z);return {m};};const front=human(2),rear=human(-2);return {mon,front,rear,list:[front,rear]};}
test('chomp reaches down with an open jaw and returns to idle',()=>{const pose=chompPose(.5,3);assert.ok(pose.headY<1);assert.ok(pose.forward>1.5);assert.ok(pose.jawOpen>1);assert.equal(chompPose(0,3).headY,3);});
test('victim in front travels into the actual mouth before being consumed',()=>{const {mon,front,list}=fixture(),attack=beginFeeding(mon,list,1,1),killed=[];assert.equal(attack.victims.length,1);assert.equal(attack.victims[0].h,front);assert.equal(advanceFeeding(attack,mon,list,.18,false,h=>killed.push(h)),false);assert.equal(killed.length,0);assert.ok(front.m.position.y>0);assert.ok(front.m.position.z<2);assert.equal(advanceFeeding(attack,mon,list,.18,false,h=>killed.push(h)),true);assert.deepEqual(killed,[front]);});
test('death cancels pending feed without score and restores captured people',()=>{const {mon,front,list}=fixture(),attack=beginFeeding(mon,list,1,1),killed=[];advanceFeeding(attack,mon,list,.18,false,h=>killed.push(h));assert.equal(advanceFeeding(attack,mon,list,.2,true,h=>killed.push(h)),true);assert.equal(killed.length,0);assert.equal(front.beingEaten,false);assert.deepEqual(front.m.scale.toArray(),[1,1,1]);assert.deepEqual(front.m.position.toArray(),[0,0,2]);});

test('chomp cannot capture a held or airborne person',()=>{
 const {mon,front,rear,list}=fixture();front.held=true;rear.m.position.z=1;rear.projectile={};
 assert.equal(beginFeeding(mon,list,1).victims.length,0);
});
