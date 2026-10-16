import {AnimationMixer,Box3,Group,Vector3,LoopOnce,LoopRepeat} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

export const CHARACTER_TRIALS=Object.freeze({
 creator:{name:'Your monster',description:'Build your own creature'},
 godzilla:{name:'Godzilla trial',description:'Armoured reptile · stronger smash'},
 kong:{name:'Kong trial',description:'Agile ape · stronger throws'}
});
const templates=new Map(),pending=new Map(),states=new Map();
const rootPath=()=>`${import.meta.env?.BASE_URL||'/'}assets/monsters/`;
function load(kind){
 if(templates.has(kind))return Promise.resolve(templates.get(kind));
 if(pending.has(kind))return pending.get(kind);
 const promise=new GLTFLoader().loadAsync(`${rootPath()}${kind}.glb`).then(gltf=>{
  const sample=cloneSkeleton(gltf.scene),sampleMixer=new AnimationMixer(sample);
  const idle=gltf.animations.find(c=>c.name.endsWith('|idle'));
  if(idle){sampleMixer.clipAction(idle).play();sampleMixer.update(0);}
  sample.updateMatrixWorld(true);
  const bounds=new Box3().setFromObject(sample,true),height=bounds.max.y-bounds.min.y;
  const pelvis=findBone(sample,/^bip_pelvis_/i);
  const origin=pelvis?.getWorldPosition(new Vector3());
  const feet=[];sample.traverse(o=>{if(o.isBone&&/^bip_foot_[lr]_/.test(o.name))feet.push(o.getWorldPosition(new Vector3()).y);});
  if(!(height>0)||!Number.isFinite(height))throw Error('Invalid character model');
  const template={scene:gltf.scene,clips:gltf.animations,scale:3.3/height,floor:bounds.min.y,centerX:(bounds.min.x+bounds.max.x)/2,centerZ:(bounds.min.z+bounds.max.z)/2,pelvisOrigin:origin,footFloor:feet.length?Math.min(...feet):null};
  templates.set(kind,template);return template;
 }).catch(()=>null);
 pending.set(kind,promise);return promise;
}
// A trial is loaded only when selected; the creator remains immediately playable.
export function warmCharacterTrials(kind){
 return kind&&kind!=='creator'?load(kind):Promise.resolve(null);
}
const shortName=clip=>clip.name.split('|').pop().toLowerCase();
function findBone(model,expression){let result;model.traverse(o=>{if(o.isBone&&!result&&expression.test(o.name))result=o;});return result;}
function attach(mon,state,template){
 if(states.get(mon)!==state||!template)return false;
 const model=cloneSkeleton(template.scene),wrapper=new Group();wrapper.name=`${state.kind} character trial`;wrapper.userData.characterTrial=true;wrapper.scale.setScalar(template.scale);
 model.position.set(-template.centerX,-template.floor,-template.centerZ);
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 wrapper.add(model);
 const fallback=mon.children.map(o=>[o,o.visible]);fallback.forEach(([o])=>{o.visible=false;});mon.add(wrapper);
 const mixer=new AnimationMixer(model),actions={};template.clips.forEach(c=>{actions[shortName(c)]=mixer.clipAction(c);});
 const left=findBone(model,state.kind==='kong'?/^bip_hand_l_/i:/^l_handJA_JNT/i),right=findBone(model,state.kind==='kong'?/^bip_hand_r_/i:/^r_handJA_JNT/i);
 const mouth=findBone(model,state.kind==='kong'?/^bip_jaw_/i:/^jawJA_JNT/i)||findBone(model,/head/i);
 const arms=[findBone(model,state.kind==='kong'?/^bip_upperarm_l_/i:/^l_armJA_JNT/i),findBone(model,state.kind==='kong'?/^bip_upperarm_r_/i:/^r_armJA_JNT/i)];
 const legs=[findBone(model,state.kind==='kong'?/^bip_hip_l_/i:/^l_legJA_JNT/i),findBone(model,state.kind==='kong'?/^bip_hip_r_/i:/^r_legJA_JNT/i)];
 const jaw=mouth;
 const pose=new Map();model.traverse(o=>{if(o.isBone)pose.set(o,o.quaternion.clone());});
 const pelvis=findBone(model,/^bip_pelvis_/i),feet=[];model.traverse(o=>{if(o.isBone&&/^bip_foot_[lr]_/.test(o.name))feet.push(o);});
 Object.assign(state,{model,wrapper,mixer,actions,fallback,template,pelvis,feet,anchors:{hands:[left,right].filter(Boolean),mouth},arms,legs,jaw,pose,time:0,current:null});
 mon.userData.characterTrialKind=state.kind;
 mon.userData.trialAnchors=state.anchors;
 updateCharacterTrial(mon,0,{});return true;
}
export function attachCharacterTrial(mon,kind='creator'){
 disposeCharacterTrial(mon);
 if(!CHARACTER_TRIALS[kind]||kind==='creator')return Promise.resolve(false);
 const state={kind};states.set(mon,state);
 return load(kind).then(template=>attach(mon,state,template));
}
export function getCharacterTrialAnchors(mon){return states.get(mon)?.anchors||null;}
export function getCharacterTrialState(mon){const s=states.get(mon);return s?{kind:s.kind,loaded:!!s.model,animation:s.currentName,clipTime:s.current?.time,clipDuration:s.current?.getClip().duration}:null;}
function play(state,name,once=false){
 const action=state.actions[name];if(!action)return false;
 if(state.current!==action){
  const old=state.current;action.reset().setEffectiveWeight(1).setEffectiveTimeScale(name==='eat'?action.getClip().duration/.36:name==='throw'?action.getClip().duration/.65:1).setLoop(once?LoopOnce:LoopRepeat,once?1:Infinity).play();action.clampWhenFinished=once;
  if(old)action.crossFadeFrom(old,.12,false);
  state.current=action;state.currentName=name;
 }
 return true;
}
export function updateCharacterTrial(mon,dt,{speed=0,chomp=0,smash=0,held=false,climbing=false,slamming=false,throwing=false,jumping=false}={}){
 const s=states.get(mon);if(!s?.model)return;
 dt=Math.max(0,Math.min(.1,dt||0));s.time+=dt;
 if(s.kind==='kong'){
  const event=mon.userData.trialAction;
  if(event&&event.remaining>0)event.remaining=Math.max(0,event.remaining-dt);
  const eventName=event?.remaining>0?event.name:null;
  const name=(eventName&&s.actions[eventName])?eventName:chomp?'eat':throwing?'throw':slamming?'smash_char':smash?'attack1':climbing?'climb':jumping?'jump_loop':held?'grab':speed>.1?(speed>.6?'run':'walk'):'idle';
  play(s,name,['eat','throw','smash_char','attack1','grab'].includes(name));s.mixer.update(dt);
 }else{
  // The source reptile contains a single roar, not a walk/eat library. Use its
  // authored roar only for a power attack; actual bones handle locomotion/actions.
  const event=mon.userData.trialAction;if(event?.remaining>0)event.remaining=Math.max(0,event.remaining-dt);
  const isThrow=throwing||(event?.name==='throw'&&event.remaining>0);
  if(smash&&!held&&!chomp&&!isThrow&&!slamming&&!jumping){play(s,Object.keys(s.actions)[0],true);s.mixer.update(dt);}
  else{
   if(s.current){s.mixer.stopAllAction();s.current=null;s.currentName='procedural bone pose';}
   for(const [bone,rotation]of s.pose)bone.quaternion.copy(rotation);
   const phase=s.time*(climbing?8:7),swing=Math.min(1,speed)*.42;
   s.legs.forEach((bone,i)=>{if(bone)bone.rotation.x+=Math.sin(phase+i*Math.PI)*swing;});
   s.arms.forEach((bone,i)=>{if(!bone)return;bone.rotation.x+=(held?-1:climbing?-1.2:Math.sin(phase+i*Math.PI)*swing*.45);if(chomp)bone.rotation.x-=Math.sin(Math.PI*(1-chomp))*.65;if(isThrow)bone.rotation.x-=1.4*Math.sin(Math.PI*(1-(event?.remaining||0)/.7));if(jumping)bone.rotation.x-=.75;if(slamming)bone.rotation.x-=1.25;});
   if(chomp&&s.jaw)s.jaw.rotation.x+=Math.sin(Math.PI*(1-chomp))*.7;
  }
 }
 // Authored pelvis travel is visual only: gameplay owns world motion. Keep the
 // feet planted in the monster's local frame while retaining the animated gait.
 if(s.kind==='kong'&&s.pelvis){
  s.model.position.set(-s.template.centerX,-s.template.floor,-s.template.centerZ);
  s.model.updateMatrixWorld(true);
  const p=s.wrapper.worldToLocal(s.pelvis.getWorldPosition(new Vector3()));
  const expected=s.template.pelvisOrigin;
  s.model.position.x-=p.x-(expected.x-s.template.centerX);
  s.model.position.z-=p.z-(expected.z-s.template.centerZ);
  const foot=Math.min(...s.feet.map(o=>s.wrapper.worldToLocal(o.getWorldPosition(new Vector3())).y));
  if(Number.isFinite(foot))s.model.position.y-=foot-(s.template.footFloor-s.template.floor);
 }
 mon.updateMatrixWorld(true);
}
export function disposeCharacterTrial(mon){
 const s=states.get(mon);if(!s)return;states.delete(mon);
 if(s.model){s.mixer.stopAllAction();s.mixer.uncacheRoot(s.model);const skeletons=new Set();s.model.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);});skeletons.forEach(x=>x.dispose());s.wrapper.removeFromParent();s.fallback.forEach(([o,v])=>{o.visible=v;});}
 delete mon.userData.characterTrialKind;delete mon.userData.trialAnchors;
}
// Remove trial wrappers before generic scene disposal. Geometry/materials/textures
// belong to the template cache and are reused, while clone skeletons are released.
export function disposeCharacterTrials(scene){for(const [mon]of states){let p=mon;while(p&&p!==scene)p=p.parent;if(!scene||p===scene)disposeCharacterTrial(mon);}}
export function characterTrialResources(){const geometries=new Set(),materials=new Set(),textures=new Set();for(const t of templates.values())t.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});return{geometries,materials,textures};}

export const getCharacterTrialResources=characterTrialResources;
