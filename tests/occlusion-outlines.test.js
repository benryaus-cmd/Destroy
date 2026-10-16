import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOcclusionOutlines,depthIsOccluded} from '../src/game/occlusionOutlines.js';

function rendererDouble(onRender=()=>{}) {
 const r={target:null,autoClear:true,shadowMap:{enabled:true},xr:{enabled:true},alpha:.4,color:new THREE.Color(0x123456),viewport:new THREE.Vector4(2,3,400,600),scissor:new THREE.Vector4(4,5,300,500),scissorTest:true,renders:[],
 getDrawingBufferSize(v){return v.set(800,1200);},getRenderTarget(){return this.target;},getClearAlpha(){return this.alpha;},getClearColor(c){return c.copy(this.color);},getViewport(v){return v.copy(this.viewport);},getScissor(v){return v.copy(this.scissor);},getScissorTest(){return this.scissorTest;},
 setRenderTarget(t){this.target=t;},setClearColor(c,a){this.color.set(c);this.alpha=a;},setViewport(v){this.viewport.copy(v);},setScissor(v){this.scissor.copy(v);},setScissorTest(v){this.scissorTest=v;},clear(){},
 render(s,c){this.renders.push({scene:s,camera:c,target:this.target});onRender(s,c,this);}};return r;
}
function fixture(){const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(65,1,.1,500),actor=new THREE.Group(),skin=new THREE.SkinnedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),building=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),2),ground=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshBasicMaterial());actor.add(skin);scene.add(actor,building,ground);building.setMatrixAt(1,new THREE.Matrix4().makeScale(0,0,0));return {scene,camera,actor,skin,building,ground};}

test('occlusion depth comparison distinguishes a hidden actor, visible actor, sky and surface tolerance',()=>{
 const near=.1,far=500,depth=d=>(far-near*far/d)/(far-near);
 assert.equal(depthIsOccluded(depth(20),depth(10),near,far),true);
 assert.equal(depthIsOccluded(depth(10),depth(20),near,far),false);
 assert.equal(depthIsOccluded(depth(20),1,near,far),false);
 assert.equal(depthIsOccluded(depth(10.02),depth(10),near,far),false);
});

test('mask renders use original animated meshes and building instances, excluding terrain, then restore scene state',()=>{
 const f=fixture(),original=f.skin.material,matrix=f.building.instanceMatrix.array.slice();let stages=0;
 const renderer=rendererDouble((s,c,r)=>{stages++;if(stages===1){assert.equal(f.building.layers.test(c.layers),true);assert.equal(f.skin.layers.test(c.layers),false);assert.equal(f.ground.layers.test(c.layers),false);assert.equal(r.target.width,400);}if(stages===2){assert.equal(f.skin.layers.test(c.layers),true);assert.equal(f.skin.isSkinnedMesh,true);assert.equal(f.skin.material.color.getHex(),0xff3366);assert.equal(f.building.layers.test(c.layers),false);assert.equal(s.overrideMaterial,null);}});
 const effect=createOcclusionOutlines(renderer);effect.render(f.scene,f.camera,{actors:[{object:f.actor,color:0xff3366}],buildings:[{m:f.building}]});
 assert.equal(stages,3);assert.equal(f.skin.material,original);assert.equal(f.skin.layers.mask,1);assert.equal(f.camera.layers.mask,1);assert.deepEqual(f.building.instanceMatrix.array,matrix);assert.equal(renderer.target,null);assert.equal(renderer.autoClear,true);assert.equal(renderer.shadowMap.enabled,true);assert.equal(renderer.xr.enabled,true);assert.equal(renderer.color.getHex(),0x123456);assert.equal(renderer.alpha,.4);assert.equal(renderer.scissorTest,true);assert.deepEqual(renderer.viewport.toArray(),[2,3,400,600]);effect.dispose();
});

test('render failure restores layers, original materials, fog, background and render state',()=>{
 const f=fixture(),material=f.skin.material;f.scene.background=new THREE.Color(0x456789);const background=f.scene.background;f.scene.fog=new THREE.Fog(0xffffff,1,20);const fog=f.scene.fog;const r=rendererDouble(()=>{if(r.renders.length===2)throw Error('render failure');});const effect=createOcclusionOutlines(r);
 assert.throws(()=>effect.render(f.scene,f.camera,{actors:[{object:f.actor}],buildings:[f.building]}),/render failure/);
 assert.equal(f.skin.material,material);assert.equal(f.skin.layers.mask,1);assert.equal(f.building.layers.mask,1);assert.equal(f.scene.background,background);assert.equal(f.scene.fog,fog);assert.equal(f.scene.overrideMaterial,null);assert.equal(r.autoClear,true);assert.equal(r.target,null);effect.dispose();
});

test('dispose releases render targets and makes subsequent rendering a no-op',()=>{
 const f=fixture(),r=rendererDouble(),effect=createOcclusionOutlines(r);effect.render(f.scene,f.camera,{actors:[{object:f.actor}],buildings:[f.building]});let disposed=0;for(const stage of r.renders.slice(0,2)){stage.target.addEventListener('dispose',()=>disposed++);}effect.dispose();effect.dispose();assert.equal(disposed,2);effect.render(f.scene,f.camera,{actors:[{object:f.actor}],buildings:[f.building]});assert.equal(r.renders.length,3);
});
