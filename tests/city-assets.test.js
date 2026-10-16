import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Box3,Group,Mesh,BoxGeometry,MeshBasicMaterial,Scene,Texture,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const assets=new URL('../public/assets/city/',import.meta.url);
async function parse(name){const bytes=await readFile(new URL(`${name}.glb`,assets));const loader=new GLTFLoader();loader.register(()=>({name:'test-texture',loadTexture:()=>Promise.resolve(new Texture())}));return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
test('all bundled Blacktop cars and street assets contain finite usable local geometry',async()=>{
 const manifest=JSON.parse(await readFile(new URL('manifest.json',assets),'utf8'));
 assert.equal(manifest.assets.length,10);let total=0;
 for(const asset of manifest.assets){const bytes=await readFile(new URL(`${asset.id}.glb`,assets));assert.equal(bytes.length,asset.bytes);total+=bytes.length;
 const gltf=await parse(asset.id),size=new Box3().setFromObject(gltf.scene).getSize(new Vector3());assert.ok(size.toArray().every(Number.isFinite));assert.ok(size.y>0&&Math.max(size.x,size.z)>0);}
 assert.ok(total<1_500_000);
});
test('async cars normalize to 4.4m, preserve fallback, cancel retired loads and never dispose cached resources',async t=>{
 let finish;const gate=new Promise(r=>finish=r);
 t.mock.method(GLTFLoader.prototype,'loadAsync',async url=>{await gate;return parse(url.split('/').pop().replace('.glb',''));});
 const city=await import('../src/game/cityAssets.js?lifecycle');const scene=new Scene();
 const car=new Group(),fallback=new Mesh(new BoxGeometry(),new MeshBasicMaterial());car.add(fallback);scene.add(car);city.decorateCityCar(car,0);
 const retired=new Group();retired.add(new Group());scene.add(retired);city.decorateCityCar(retired,1);city.retireCityModel(retired);
 assert.equal(fallback.visible,true);finish();await city.warmCityAssets();
 const model=car.children.find(c=>c.userData.cityAsset);assert.ok(model);assert.equal(fallback.visible,false);assert.equal(retired.children.length,1);
 const box=new Box3().setFromObject(model),size=box.getSize(new Vector3());assert.ok(Math.abs(Math.max(size.x,size.z)-4.4)<.0001);assert.ok(Math.abs(box.min.y)<.0001);assert.ok(size.x>size.z,'traffic long axis remains local X');
 let disposed=0;for(const resource of city.getCitySharedResources())resource.addEventListener('dispose',()=>disposed++);
 city.retireCityModel(car);city.retireCityModel(car);assert.equal(fallback.visible,true);assert.equal(disposed,0);assert.equal(car.children.length,1);
 const decor=city.createChunkDecor(2,-1,90);scene.add(decor);assert.equal(decor.userData.props.length,7);assert.equal(decor.position.x,120);assert.equal(decor.position.z,-60);
 const prop=decor.userData.props[0],point=prop.object.getWorldPosition(new Vector3());assert.equal(city.hitCityDecor(decor,point,.5,3),1);assert.equal(city.hitCityDecor(decor,point,.5,3),0);city.updateCityDecor(decor,.3);assert.ok(Math.abs(prop.object.rotation.z)>.5);
 city.retireCityModel(decor);decor.traverse(m=>assert.ok(!m.userData.cityAsset));assert.equal(disposed,0);
 city.disposeCityAssets(scene);
});
test('offline city assets leave original car and destructible fallback props usable',async t=>{
 t.mock.method(GLTFLoader.prototype,'loadAsync',async()=>{throw Error('offline');});const city=await import('../src/game/cityAssets.js?offline');
 const car=new Group(),child=new Group();car.add(child);city.decorateCityCar(car,0);const decor=city.createChunkDecor(0,0,4);await city.warmCityAssets();assert.equal(child.visible,true);assert.ok(decor.userData.props.every(p=>p.object.children.length>0));city.retireCityModel(car);city.retireCityModel(decor);
});

test('late loaded car visuals cannot restore an already burnt wreck',async t=>{
 let release;const gate=new Promise(r=>release=r);t.mock.method(GLTFLoader.prototype,'loadAsync',async url=>{await gate;return parse(url.split('/').pop().replace('.glb',''));});
 const city=await import('../src/game/cityAssets.js?late-wreck'),car=new Group(),burnt=new Group();car.add(burnt);city.decorateCityCar(car,0);car.userData.cityAssetDestroyed=true;release();await city.warmCityAssets();
 assert.equal(car.children.length,1);assert.equal(burnt.visible,true);city.retireCityModel(car);
});
