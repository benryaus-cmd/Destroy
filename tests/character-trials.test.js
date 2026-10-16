import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group,Scene,Box3,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
globalThis.ProgressEvent??=class ProgressEvent{constructor(type,init={}){this.type=type;Object.assign(this,init);}};
const asset=kind=>new URL(`../public/assets/monsters/${kind}.glb`,import.meta.url);
function decode(bytes){const n=bytes.readUInt32LE(12);return JSON.parse(bytes.subarray(20,20+n).toString());}
async function parse(kind){
 const bytes=await readFile(asset(kind)),json=decode(bytes),n=bytes.readUInt32LE(12),bin=bytes.subarray(28+n);
 // Node has no bitmap decoder; preserve binary rig/geometry/clips, omit maps only.
 json.materials.forEach(m=>{for(const k of Object.keys(m))if(k.endsWith('Texture'))delete m[k];if(m.pbrMetallicRoughness)delete m.pbrMetallicRoughness.baseColorTexture;});delete json.images;delete json.textures;
 json.buffers[0].uri=`data:application/octet-stream;base64,${bin.toString('base64')}`;
 return new GLTFLoader().parseAsync(JSON.stringify(json),'');
}
test('real trial GLBs are mobile-sized plain skinned assets with actual authored clips',async()=>{
 for(const kind of ['godzilla','kong']){
  const bytes=await readFile(asset(kind)),j=decode(bytes);
  assert.ok(bytes.length<5_000_000);assert.equal(j.skins.length,1);assert.ok(j.skins[0].joints.length>100);
  assert.ok(!j.extensionsRequired?.some(x=>/compression|meshopt/.test(x)));
  const gltf=await parse(kind),bounds=new Box3().setFromObject(gltf.scene,true).getSize(new Vector3());assert.ok(bounds.y>0);
  if(kind==='kong')for(const name of ['idle','walk','run','eat','grab','throw','climb'])assert.ok(gltf.animations.some(c=>c.name.endsWith('|'+name)));
  else assert.equal(gltf.animations.length,1);
 }
});
test('trial instances have independent skeletons, real carry anchors and safe fallback lifecycle',async t=>{
 t.mock.method(GLTFLoader.prototype,'loadAsync',async url=>parse(url.includes('godzilla')?'godzilla':'kong'));
 const module=await import('../src/game/characterTrials.js?lifecycle');
 const scene=new Scene(),a=new Group(),b=new Group(),fallback=new Group();a.add(fallback);scene.add(a,b);
 await Promise.all([module.attachCharacterTrial(a,'kong'),module.attachCharacterTrial(b,'kong')]);
 assert.equal(fallback.visible,false);assert.equal(module.getCharacterTrialAnchors(a).hands.length,2);assert.ok(module.getCharacterTrialAnchors(a).mouth.isBone);
 const hand=module.getCharacterTrialAnchors(a).hands[0],other=module.getCharacterTrialAnchors(b).hands[0];assert.notEqual(hand,other);
 const before=hand.quaternion.clone();for(let i=0;i<10;i++)module.updateCharacterTrial(a,.1,{chomp:.5});assert.equal(module.getCharacterTrialState(a).animation,'eat');assert.ok(hand.quaternion.angleTo(before)>.01);
 module.updateCharacterTrial(a,.1,{throwing:true});assert.equal(module.getCharacterTrialState(a).animation,'throw');
 const resources=module.getCharacterTrialResources();assert.ok(resources.geometries.size>0);
 module.disposeCharacterTrial(a);assert.equal(fallback.visible,true);assert.equal(a.children.length,1);assert.ok(module.getCharacterTrialAnchors(b));
 module.disposeCharacterTrials(scene);assert.equal(b.children.length,0);
});
test('late async loading cannot revive a disposed trial',async t=>{
 let finish;const gate=new Promise(r=>finish=r);t.mock.method(GLTFLoader.prototype,'loadAsync',async()=>{await gate;return parse('godzilla');});
 const module=await import('../src/game/characterTrials.js?late-load'),mon=new Group(),fallback=new Group();mon.add(fallback);
 const promise=module.attachCharacterTrial(mon,'godzilla');module.disposeCharacterTrial(mon);finish();assert.equal(await promise,false);assert.equal(mon.children.length,1);assert.equal(fallback.visible,true);
});
test('Kong fits idle collision height, stays planted and plays full action clips within gameplay windows',async t=>{
 t.mock.method(GLTFLoader.prototype,'loadAsync',async()=>parse('kong'));
 const module=await import('../src/game/characterTrials.js?timing'),mon=new Group();await module.attachCharacterTrial(mon,'kong');mon.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(mon,true);assert.ok(Math.abs(bounds.getSize(new Vector3()).y-3.3)<.01,`height ${bounds.getSize(new Vector3()).y}`);
 const feet=[];mon.traverse(o=>{if(o.isBone&&/^bip_foot_[lr]_/.test(o.name))feet.push(o);});const footY=()=>Math.min(...feet.map(o=>o.getWorldPosition(new Vector3()).y));const floor=footY();
 for(let i=0;i<20;i++){module.updateCharacterTrial(mon,.05,{speed:1});assert.ok(Math.abs(footY()-floor)<.01);}
 for(let i=0;i<7;i++)module.updateCharacterTrial(mon,.05,{chomp:.5});let state=module.getCharacterTrialState(mon);assert.ok(state.clipTime/state.clipDuration>.95);
 for(let i=0;i<13;i++)module.updateCharacterTrial(mon,.05,{throwing:true});state=module.getCharacterTrialState(mon);assert.ok(state.clipTime/state.clipDuration>.99);
 module.disposeCharacterTrial(mon);
});
test('reptile trial bones respond to throws, jumps and slams',async t=>{
 t.mock.method(GLTFLoader.prototype,'loadAsync',async()=>parse('godzilla'));
 const module=await import('../src/game/characterTrials.js?procedural'),mon=new Group();await module.attachCharacterTrial(mon,'godzilla');
 const hand=module.getCharacterTrialAnchors(mon).hands[0],at=()=>hand.getWorldPosition(new Vector3());const idle=at();
 module.updateCharacterTrial(mon,.1,{jumping:true});assert.ok(at().distanceTo(idle)>.01);
 module.updateCharacterTrial(mon,.1,{slamming:true});assert.ok(at().distanceTo(idle)>.01);
 mon.userData.trialAction={name:'throw',remaining:.7};module.updateCharacterTrial(mon,.1,{throwing:true});assert.ok(at().distanceTo(idle)>.01);
 module.disposeCharacterTrial(mon);
});
