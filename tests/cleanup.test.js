import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {cleanupDistant} from '../src/game/cleanup.js';
test('far pooled debris, gore and decals stop simulating while nearby pieces remain',()=>{const mesh=x=>{const m=new THREE.Group();m.visible=true;m.position.x=x;return m;};const near={m:mesh(5),l:10},far={m:mesh(100),l:10},limb={g:mesh(-110),l:10},decal=mesh(120);const g={dbr:[near,far],prts:[limb],dec:[decal],fires:[{x:10,z:0},{x:120,z:0}]};cleanupDistant(g,{x:0,z:0},80);assert.equal(near.l,10);assert.equal(far.l,0);assert.equal(far.m.visible,false);assert.equal(limb.l,0);assert.equal(decal.visible,false);assert.equal(g.fires.length,1);});
test('distant enemies release resources while held actors are retained',()=>{const scene=new THREE.Scene();const enemy=x=>{const m=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());m.position.x=x;scene.add(m);return {m};};const far=enemy(150),held=enemy(160),near=enemy(5);held.held=true;let disposed=0;far.m.geometry.addEventListener('dispose',()=>disposed++);const g={S:scene,enemies:[far,held,near]};cleanupDistant(g,{x:0,z:0},80);assert.equal(g.enemies.length,2);assert.equal(disposed,1);assert.equal(far.m.parent,null);assert.equal(held.m.parent,scene);});

test('death clears carried and airborne ownership without invalidating projectile iteration',async()=>{
 const {releaseHumanInteraction}=await import('../src/game/cleanup.js');
 const h={held:true,projectile:{age:1}},g={held:h,projectiles:[h]};
 releaseHumanInteraction(g,h);assert.equal(g.held,null);assert.equal(h.held,false);assert.equal(h.projectile,null);
 assert.deepEqual(g.projectiles,[h]);
});
