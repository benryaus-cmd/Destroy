import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const CITY_CARS = ['sedan','suv','taxi','police','race','sedan-sports'];
const PROPS = {'light-curved':5.4,'traffic-light':4.8,dumpster:1.25,'road-sign-stop':2.5};
const templates=new Map(),states=new Map(),resources=new Set();
let warming;
function register(object){object.traverse(m=>{if(m.geometry)resources.add(m.geometry);for(const mat of Array.isArray(m.material)?m.material:[m.material])if(mat){resources.add(mat);for(const value of Object.values(mat))if(value?.isTexture)resources.add(value);}});}
export function getCitySharedResources(){return resources;}
export function warmCityAssets(){
 if(warming)return warming;
 const loader=new GLTFLoader(),base=import.meta.env?.BASE_URL||'/';
 warming=Promise.allSettled([...CITY_CARS,...Object.keys(PROPS)].map(async name=>{
  const gltf=await loader.loadAsync(`${base}assets/city/${name}.glb`),scene=gltf.scene;
  scene.updateMatrixWorld(true);const box=new Box3().setFromObject(scene),size=box.getSize(new Vector3());
  if(!size.toArray().every(Number.isFinite)||size.y<=0)throw Error(`Invalid city asset ${name}`);
  const scale=CITY_CARS.includes(name)?4.4/Math.max(size.x,size.z):PROPS[name]/size.y;
  register(scene);templates.set(name,{scene,scale,floor:box.min.y,x:(box.min.x+box.max.x)/2,z:(box.min.z+box.max.z)/2});
 })).then(()=>{for(const [group,state]of states)attach(group,state);});
 return warming;
}
function attach(group,state){
 if(state.wrapper||state.retired||group.userData.cityAssetDestroyed)return;
 const template=templates.get(state.name);if(!template)return;
 const model=template.scene.clone(true),wrapper=new Group();wrapper.name=`city-asset:${state.name}`;wrapper.userData.cityAsset=true;wrapper.scale.setScalar(template.scale);
 // Existing traffic, collision and held-car layout use local X as the long axis.
 if(CITY_CARS.includes(state.name))wrapper.rotation.y=Math.PI/2;
 model.position.set(-template.x,-template.floor,-template.z);
 model.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;m.userData.cityShared=true;}});
 // Existing vehicle geometry and limb references stay intact for gameplay.
 state.fallback=group.children.map(child=>[child,child.visible]);
 for(const [child]of state.fallback)child.visible=false;
 wrapper.add(model);group.add(wrapper);state.wrapper=wrapper;
}
function decorate(group,name){const state={name};states.set(group,state);attach(group,state);void warmCityAssets();return group;}
export function decorateCityCar(group,seed=0){if(!group?.isObject3D||states.has(group))return group;return decorate(group,CITY_CARS[(seed>>>0)%CITY_CARS.length]);}
export function retireCityModel(group){
 // Also handles a whole decoration chunk, before generic scene disposal.
 const objects=[];group?.traverse(object=>{if(states.has(object))objects.push(object);});
 for(const object of objects){const state=states.get(object);state.retired=true;state.wrapper?.removeFromParent();for(const [child,visible]of state.fallback||[])child.visible=visible;states.delete(object);}
}
export function disposeCityAssets(scene){for(const group of [...states.keys()]){let root=group;while(root&&root!==scene)root=root.parent;if(!scene||root===scene)retireCityModel(group);}}

// Shared simple geometry/materials keep streamed street dressing inexpensive.
const box=new BoxGeometry(1,1,1);resources.add(box);
const colors={lamp:0x56616a,metal:0x3e5157,leaf:0x56854d,soil:0x526c43,planter:0xb9ae95,wood:0x976d46};
const materials={};for(const [key,color]of Object.entries(colors)){materials[key]=new MeshStandardMaterial({color,roughness:.85});resources.add(materials[key]);}
function cube(group,material,x,y,z,w,h,d){const mesh=new Mesh(box,materials[material]);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.cityShared=true;group.add(mesh);return mesh;}
function randomSeed(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
/** World-positioned group. Keep as a scene/chunk child, not a second translated terrain. */
export function createChunkDecor(cx,cz,seed=0){
 const group=new Group();group.name=`city-decor:${cx},${cz}`;group.position.set(cx*60,0,cz*60);const props=[],random=randomSeed(seed^Math.imul(cx,73856093)^Math.imul(cz,19349663));
 function prop(name,x,z,yaw=0){const object=new Group();object.name=name;object.position.set(x,0,z);object.rotation.y=yaw;group.add(object);
  if(name==='light-curved'||name==='traffic-light'){cube(object,'lamp',0,2.5,0,.13,5,.13);cube(object,'metal',.4,5,0,1,.2,.35);}
  else if(name==='dumpster')cube(object,'metal',0,.6,0,1.6,1.2,1);
  else {cube(object,'lamp',0,1.2,0,.08,2.4,.08);cube(object,'metal',0,2.2,0,.6,.6,.1);}
  props.push({object,name,broken:false,fall:0,axis:1});decorate(object,name);return object;
 }
 for(const p of [13,43]){prop('light-curved',6.9,p,-Math.PI/2);prop('light-curved',53.1,p,Math.PI/2);}
 prop('traffic-light',7,7);prop('road-sign-stop',53,53);prop('dumpster',30,7.3,random()*Math.PI);
 // A narrow central garden strip fits between the existing building footprints.
 for(const z of [17,39]){
  cube(group,'soil',30,.12,z,3.7,.24,9);
  for(const dz of [-3,0,3]){cube(group,'planter',30,.3,z+dz,2,.6,1.4);const shrub=cube(group,'leaf',30,.85,z+dz,1.7,.7,1.15);shrub.rotation.y=random()*.5;}
  cube(group,'wood',30,.65,z+7.5,2.2,.18,1.1);cube(group,'metal',29.3,.3,z+7.5,.12,.6,.12);cube(group,'metal',30.7,.3,z+7.5,.12,.6,.12);cube(group,'wood',30,1.05,z+7.95,2.2,.65,.12);
 }
 group.userData.props=props;return group;
}
export function hitCityDecor(group,point,radius=2,force=1){
 let count=0;const world=new Vector3();for(const prop of group?.userData.props||[]){if(prop.broken)continue;prop.object.getWorldPosition(world);const dx=world.x-point.x,dz=world.z-point.z;if(dx*dx+dz*dz>radius*radius)continue;prop.broken=true;prop.axis=dx>=0?1:-1;prop.fall=Math.min(6,2+force);count++;}return count;
}
export function updateCityDecor(group,dt){for(const prop of group?.userData.props||[]){if(!prop.broken)continue;const goal=prop.axis*Math.PI*.48;prop.object.rotation.z+=Math.sign(goal-prop.object.rotation.z)*Math.min(Math.abs(goal-prop.object.rotation.z),Math.max(0,dt)*prop.fall);}}
