import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEndlessCity, CHUNK_SIZE } from '../src/game/endlessCity.js';
import { damageBuilding, serializeBuilding } from '../src/game/destruction.js';
const make = seed => createEndlessCity({seed,scene:new THREE.Scene(),makeCar:()=>new THREE.Group()});

test('nine seamless chunks contain bounded real section buildings and deterministic layouts',()=>{
 const a=make(91), b=make(91); a.update(-.1,-.1); b.update(-.1,-.1);
 assert.equal(CHUNK_SIZE,60); assert.equal(a.chunks.size,9); assert.ok(a.chunks.has('-1,-1')); assert.ok(a.chunks.has('-2,-2'));
 assert.deepEqual(a.buildings.map(({id,x,z,w,d,h})=>({id,x,z,w,d,h})),b.buildings.map(({id,x,z,w,d,h})=>({id,x,z,w,d,h})));
 assert.ok(a.buildings.length>=18 && a.buildings.length<=54); assert.ok(a.cars.length>=18 && a.cars.length<=27);
 assert.ok(a.buildings.every(v=>v.m.userData.destruction));
 let meshes=0; for(const chunk of a.chunks.values()) chunk.terrain.traverse(v=>{if(v.isMesh)meshes++;}); assert.ok(meshes<=130);
 a.dispose(); b.dispose();
});

test('far and diagonal travel retire geometry and preserve stable live arrays',()=>{
 const city=make(5), buildings=city.buildings,cars=city.cars; city.update(0,0);
 for(let i=1;i<60;i++){const r=city.update(i*CHUNK_SIZE,i*-CHUNK_SIZE); assert.equal(r.addedChunks.length,5); assert.equal(r.removedChunks.length,5); assert.equal(city.chunks.size,9); assert.ok(city.buildings.length<=54); assert.ok(city.cars.length<=27);}
 assert.equal(city.buildings,buildings); assert.equal(city.cars,cars); assert.equal(city.update(3541,-3539).changed,false);
 city.dispose(); assert.equal(city.chunks.size,0); assert.equal(city.buildings.length,0); assert.equal(city.cars.length,0);
});

test('damaged sections and destroyed cars cannot reset by unloading and revisiting',()=>{
 const city=make(9); city.update(0,0); const b=city.buildings[0], id=b.id,car=city.cars[0],carId=car.id;
 damageBuilding(b.m,{x:0,y:2,z:b.d/2,radius:2,damage:30}); b.hp=37; const state=serializeBuilding(b.m); car.d=1;
 city.update(1800,1800); city.update(0,0); const restored=city.buildings.find(v=>v.id===id);
 assert.deepEqual(serializeBuilding(restored.m),state); assert.equal(restored.hp,37); assert.ok(!city.cars.some(v=>v.id===carId)); city.dispose();
});

test('held vehicles and climbed buildings survive chunk retirement until released',()=>{
 const city=make(3);city.update(0,0);const car=city.cars[0], b=city.buildings[0];
 city.update(600,600,{protectedObjects:[car.m,b.m]}); assert.equal(city.chunks.size,9); assert.ok(city.cars.includes(car));assert.ok(city.buildings.includes(b)); assert.ok(car.m.parent);assert.ok(b.m.parent);
 city.update(600,600);assert.ok(!city.cars.includes(car));assert.ok(!city.buildings.includes(b));assert.equal(car.m.parent,null);assert.equal(b.m.parent,null);city.dispose();
});

test('retiring chunks releases building GPU resources and keeps shared terrain resources until disposal',()=>{
 const city=make(33);city.update(0,0);const building=city.buildings[0].m,terrain=city.chunks.values().next().value.terrain;
 let geometryDisposed=0,instancesDisposed=0,terrainDisposed=0;
 building.children[0].geometry.addEventListener('dispose',()=>geometryDisposed++);
 building.children[0].addEventListener('dispose',()=>instancesDisposed++);
 terrain.children[0].geometry.addEventListener('dispose',()=>terrainDisposed++);
 city.update(900,-900);assert.ok(geometryDisposed>0);assert.equal(instancesDisposed,1);assert.equal(terrainDisposed,0);
 city.dispose();assert.equal(terrainDisposed,1);city.dispose();assert.equal(terrainDisposed,1);
});

test('factory cars release only owned paint while retaining shared geometry and materials',()=>{
 const geometry=new THREE.BoxGeometry(), shared=new THREE.MeshStandardMaterial(),paints=[];
 let sharedGeometryDisposals=0,sharedMaterialDisposals=0;
 geometry.addEventListener('dispose',()=>sharedGeometryDisposals++);shared.addEventListener('dispose',()=>sharedMaterialDisposals++);
 const city=createEndlessCity({seed:15,scene:new THREE.Scene(),makeCar:()=>{
  const group=new THREE.Group(),paint=new THREE.MeshStandardMaterial(),record={paint,disposals:0};paints.push(record);
  paint.addEventListener('dispose',()=>record.disposals++);
  group.add(new THREE.Mesh(geometry,shared));
  for(let i=0;i<2;i++){const mesh=new THREE.Mesh(geometry,paint);mesh.userData.ownedMaterial=1;group.add(mesh);}
  return group;
 }});
 city.update(0,0);const firstPaints=[...paints];city.update(600,600);
 assert.ok(firstPaints.every(p=>p.disposals===1));assert.equal(sharedGeometryDisposals,0);assert.equal(sharedMaterialDisposals,0);
 city.dispose();assert.ok(paints.every(p=>p.disposals===1));assert.equal(sharedGeometryDisposals,0);assert.equal(sharedMaterialDisposals,0);
 geometry.dispose();shared.dispose();
});
