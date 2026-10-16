import * as THREE from 'three';
import {decorateCityCar,createChunkDecor,retireCityModel,getCitySharedResources} from './cityAssets.js';
import { createDestructibleBuilding, serializeBuilding, restoreBuilding } from './destruction.js';

export const CHUNK_SIZE = 60;
export const CHUNK_RADIUS = 1;
export const MAX_SAVED_CHUNKS = 64;
const hash = (seed,x,z) => {
 let n=(seed^Math.imul(x,374761393)^Math.imul(z,668265263))>>>0;
 n=Math.imul(n^(n>>>13),1274126177); return (n^(n>>>16))>>>0;
};
const rng = seed => () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const erase=(array,item)=>{const i=array.indexOf(item);if(i>=0)array.splice(i,1);};
function disposeOwn(object) {
 const geometries=new Set(), materials=new Set();
 object.traverse(m=>{if(m.isInstancedMesh)m.dispose();if(m.geometry)geometries.add(m.geometry);if(m.material)for(const mat of Array.isArray(m.material)?m.material:[m.material])materials.add(mat);});
 const shared=getCitySharedResources();for(const g of geometries)if(!shared.has(g))g.dispose();for(const m of materials)if(!shared.has(m))m.dispose();
}

function disposeFactoryCar(object) {
 retireCityModel(object);
 if(object.userData.endlessOwnResources){disposeOwn(object);return;}
 const materials=new Set();
 object.traverse(mesh=>{
  if(!mesh.userData.ownedMaterial)return;
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])if(material)materials.add(material);
  mesh.userData.ownedMaterial=0;
 });
 for(const material of materials)material.dispose();
}

/** A run-local, deterministic city. Arrays retain identity for runtime references. */
export function createEndlessCity({seed=1,scene,makeCar=()=>new THREE.Group()}={}) {
 if(!scene?.add)throw new TypeError('createEndlessCity requires a Three scene');
 const numericSeed=typeof seed==='number'?seed:[...String(seed)].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0),0);
 const buildings=[],cars=[],chunks=new Map(),saved=new Map(),detached=new Map();
 const box=new THREE.BoxGeometry(1,1,1);
 const materials={ground:'#526258',road:'#303b43',walk:'#9faaa4',stripe:'#e2dbc4',park:'#6c805c',curb:'#c5c8b9'};
 for(const key in materials)materials[key]=new THREE.MeshStandardMaterial({color:materials[key],roughness:1});
 let disposed=false;
 function tile(group,material,x,z,w,d,y=.01,h=.08){const m=new THREE.Mesh(box,materials[material]);m.position.set(x,y,z);m.scale.set(w,h,d);m.receiveShadow=true;group.add(m);return m;}
 function terrain(cx,cz){
  const group=new THREE.Group();group.name=`city-ground:${cx},${cz}`;group.position.set(cx*60,0,cz*60);
  tile(group,'ground',30,30,60,60,-.17,.2);
  // Half roads meet exactly at every chunk boundary, including negative coordinates.
  for(const e of [2.5,57.5]){tile(group,'road',e,30,5,60,-.04);tile(group,'road',30,e,50,5,-.04);}
  for(const e of [6.1,53.9]){tile(group,'walk',e,30,2.2,50,.02,.16);tile(group,'walk',30,e,45.6,2.2,.02,.16);}
  const markings=new THREE.InstancedMesh(box,materials.stripe,20), mat=new THREE.Matrix4();let index=0;
  for(let p=12;p<55;p+=9)for(const edge of [0,60]){
   mat.makeScale(.15,.025,3);mat.setPosition(edge,.018,p);markings.setMatrixAt(index++,mat);
   mat.makeScale(3,.025,.15);mat.setPosition(p,.018,edge);markings.setMatrixAt(index++,mat);
  }
  group.add(markings);scene.add(group);return group;
 }
 function snapshot(record,kind,key){
  const destruction=kind==='building'?serializeBuilding(record.m):null;
  // Only mutations consume run memory; pristine city is rebuilt from coordinates.
  if(kind==='building' && record.hp===record.max && !record.dead && !destruction.collapsed && !destruction.removed.length&&!Object.keys(destruction.damage||{}).length)return;
  if(kind==='car' && !record.d)return;
  let state=saved.get(key);if(!state){state={buildings:{},cars:{}};saved.set(key,state);}
  if(kind==='building')state.buildings[record.id]={hp:record.hp,dead:record.dead,destruction};
  else state.cars[record.id]={d:record.d||0};
 }
 function retire(record,kind,key){snapshot(record,kind,key);record.m.removeFromParent();erase(kind==='building'?buildings:cars,record);if(kind==='building')disposeOwn(record.m);else disposeFactoryCar(record.m);}
 function spawn(cx,cz){
  const key=`${cx},${cz}`,random=rng(hash(numericSeed,cx,cz));
  const chunk={key,x:cx,z:cz,terrain:terrain(cx,cz),decor:createChunkDecor(cx,cz,hash(numericSeed,cx,cz)),buildings:[],cars:[]};
  scene.add(chunk.decor);
  const state=saved.get(key),count=3+Math.floor(random()*2);
  for(let i=0;i<count;i++){
   const id=`${key}:b${i}`,w=12+random()*7,d=12+random()*7,type=['house','shop','tower','warehouse','apartment'][Math.floor(random()*5)],h=type==='tower'?18+random()*16:type==='apartment'?12+random()*8:type==='shop'||type==='warehouse'?5+random()*3:7+random()*6;
   const x=cx*60+(i%2?42:18),z=cz*60+(i<2?18:42),buildingSeed=hash(numericSeed,cx*7+i,cz*11+i);
   let record=detached.get(id)?.record;
   if(record)detached.delete(id);
   else {
    const m=createDestructibleBuilding({w,d,h,type,seed:buildingSeed}),max=Math.round(80+w*d*h*.025);m.position.set(x,0,z);
    record={id,m,x,z,w,d,h,hp:max,max,dead:false,type};
    const previous=state?.buildings[id];if(previous){record.hp=previous.hp;record.dead=previous.dead;restoreBuilding(m,previous.destruction);if(record.dead)m.visible=false;}
    scene.add(m);buildings.push(record);
   }
   chunk.buildings.push(record);
  }
  const carCount=2+Math.floor(random()*2);
  for(let i=0;i<carCount;i++){
   const id=`${key}:c${i}`,horizontal=i%2===0,x=cx*60+(horizontal?15+random()*31:2.6),z=cz*60+(horizontal?2.6:15+random()*31),previous=state?.cars[id];
   if(previous?.d)continue;
   let record=detached.get(id)?.record;
   if(record)detached.delete(id);
   else {const carSeed=hash(numericSeed,cx*9+i,cz*13+i),m=makeCar({seed:carSeed,x,z});decorateCityCar(m,carSeed);m.position.set(x,.05,z);m.rotation.y=horizontal?0:Math.PI/2;record={id,m,x,z,d:0};scene.add(m);cars.push(record);}
   chunk.cars.push(record);
  }
  chunks.set(key,chunk);return chunk;
 }
 function update(x,z,{protectedObjects=[]}={}){
  if(disposed)return {changed:false,addedChunks:[],removedChunks:[]};
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('City coordinates must be finite');
  const protectedSet=new Set(protectedObjects.filter(Boolean)),isProtected=m=>{for(let p=m;p;p=p.parent)if(protectedSet.has(p))return true;for(const item of protectedSet){for(let p=item;p;p=p.parent)if(p===m)return true;}return false;};
  const cx=Math.floor(x/60),cz=Math.floor(z/60),wanted=new Set(),addedChunks=[],removedChunks=[];let changed=false;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)wanted.add(`${cx+dx},${cz+dz}`);
  for(const [id,item]of detached)if(!isProtected(item.record.m)&&!wanted.has(item.key)){retire(item.record,item.kind,item.key);detached.delete(id);changed=true;}
  for(const [key,chunk]of chunks)if(!wanted.has(key)){
   for(const [kind,records]of [['building',chunk.buildings],['car',chunk.cars]])for(const record of records){if(isProtected(record.m))detached.set(record.id,{record,kind,key});else retire(record,kind,key);}
   retireCityModel(chunk.decor);chunk.decor.removeFromParent();disposeOwn(chunk.decor);
   chunk.terrain.removeFromParent();const markings=chunk.terrain.children.find(v=>v.isInstancedMesh);markings?.dispose();chunks.delete(key);removedChunks.push(key);
  }
  for(const key of wanted)if(!chunks.has(key)){const [a,b]=key.split(',').map(Number);spawn(a,b);addedChunks.push(key);}
  // Forget oldest distant damage after long journeys; active geometry stays bounded.
  for(const key of saved.keys()){if(saved.size<=MAX_SAVED_CHUNKS)break;if(!wanted.has(key))saved.delete(key);}
  return {changed:changed||!!(addedChunks.length||removedChunks.length),addedChunks,removedChunks};
 }
 function dispose(){
  if(disposed)return;
  for(const b of buildings){b.m.removeFromParent();disposeOwn(b.m);}for(const c of cars){c.m.removeFromParent();disposeFactoryCar(c.m);}
  for(const chunk of chunks.values()){retireCityModel(chunk.decor);chunk.decor.removeFromParent();disposeOwn(chunk.decor);chunk.terrain.removeFromParent();chunk.terrain.children.find(v=>v.isInstancedMesh)?.dispose();}
  box.dispose();for(const m of Object.values(materials))m.dispose();buildings.length=0;cars.length=0;chunks.clear();detached.clear();saved.clear();disposed=true;
 }
 return {buildings,cars,chunks,update,dispose,get savedChunkCount(){return saved.size;}};
}
