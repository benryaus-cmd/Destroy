import {Quaternion,Vector3} from 'three';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const q=new Quaternion();
// No per-frame scene traversal or physics bodies. Capture the visible skeleton
// once at launch; animate both fallback joint groups and authored GLTF bones.
function captureJoints(actor){
 const joints=[];
 for(const [i,a] of (actor.arms||[]).entries()){
  if(a.p)joints.push({node:a.p,base:a.p.rotation.clone(),kind:'arm',side:i%2?1:-1});
  if(a.e)joints.push({node:a.e,base:a.e.rotation.clone(),kind:'elbow',side:i%2?1:-1});
 }
 for(const [i,l] of (actor.legs||[]).entries()){
  if(l.p)joints.push({node:l.p,base:l.p.rotation.clone(),kind:'leg',side:i%2?1:-1});
  if(l.k)joints.push({node:l.k,base:l.k.rotation.clone(),kind:'knee',side:i%2?1:-1});
 }
 actor.m.traverse(node=>{
  if(!node.isBone)return;
  const name=node.name.toLowerCase().replace(/[^a-z]/g,'');
  const kind=/upperarm/.test(name)?'arm':/lowerarm|forearm/.test(name)?'elbow':/upperleg|thigh/.test(name)?'leg':/lowerleg|shin/.test(name)?'knee':null;
  if(kind)joints.push({node,base:node.rotation.clone(),kind,side:/[._]r$/i.test(node.name)||/right/i.test(node.name)?1:-1});
 });
 return joints;
}

export function createThrowState(actor,facing=0,size=1){
 const human=!!actor.throwableHuman,phase=(Number(actor.id)||1)*2.399963229728653;
 const axis=new Vector3(Math.cos(facing),human?.34:.65,-Math.sin(facing)).normalize();
 const speed=(human?7.5:4.8)/Math.sqrt(clamp(size,.65,6));
 return {axis,speed,damping:human?.12:.2,age:0,phase,joints:human?captureJoints(actor):[],w:axis.clone().multiplyScalar(speed)};
}

export function advanceThrowRotation(actor,dt,state=actor.projectile?.rotation){
 if(!state||!actor.m||!Number.isFinite(dt)||dt<=0)return;
 // Exponential angular drag integrated exactly: 30/60/120 Hz match.
 const decay=Math.exp(-state.damping*dt),angle=state.speed*(1-decay)/state.damping;
 q.setFromAxisAngle(state.axis,angle);actor.m.quaternion.premultiply(q).normalize();
 state.speed*=decay;state.w.copy(state.axis).multiplyScalar(state.speed);state.age+=dt;
 for(const {node,base,kind,side} of state.joints){
  const phase=state.age*9+state.phase+side*1.7;
  const wave=Math.sin(phase),secondary=Math.sin(phase*.67+1);
  let x=0,z=0;
  if(kind==='arm'){x=-.95+wave*.95;z=side*(.5+secondary*.35);}
  else if(kind==='elbow')x=-.7-wave*.55;
  else if(kind==='leg'){x=wave*.75;z=side*(.18+secondary*.14);}
  else x=.65+secondary*.55;
  node.rotation.set(base.x+x,base.y,base.z+z,base.order);
 }
}

// Call after carBoom so its scoring, damage, fire and wreck materials survive,
// replacing only its random explosion trajectory with actual impact momentum.
export function createWreckMotion(actor,flight,normal=null){
 const v=flight?.v?.clone?.()||new Vector3();
 if(normal&&v.dot(normal)<0)v.addScaledVector(normal,-1.3*v.dot(normal));
 v.multiplyScalar(.5);v.y=Math.max(2.5,Math.abs(v.y)*.22);
 const w=flight?.rotation?.w?.clone?.()||new Vector3(3,1,2);
 return {v,w,age:0,rest:0};
}

export function stepWreckMotion(actor,dt,state=actor.fly,floor=.35){
 if(!state||!Number.isFinite(dt)||dt<=0)return !!state;
 // Limit work after a suspended tab. Small fixed substeps keep fast impacts
 // above the floor and avoid long-frame explosive bounces.
 const steps=Math.max(1,Math.ceil(Math.min(dt,.1)/(1/120))),step=Math.min(dt,.1)/steps;
 const p=actor.m.position;state.age??=0;state.rest??=0;
 for(let i=0;i<steps;i++){
  state.age+=step;p.addScaledVector(state.v,step);p.y-=12*step*step;state.v.y-=24*step;
  const grounded=p.y<=floor;
  if(grounded){
   p.y=floor;state.v.y=state.v.y<-2.2?-state.v.y*.27:0;
   const friction=Math.exp(-6*step);state.v.x*=friction;state.v.z*=friction;state.w.multiplyScalar(Math.exp(-4.5*step));
  }else state.w.multiplyScalar(Math.exp(-.15*step));
  const speed=state.w.length();if(speed>.0001){q.setFromAxisAngle(state.w.clone().divideScalar(speed),speed*step);actor.m.quaternion.premultiply(q).normalize();}
  const slow=grounded&&state.v.lengthSq()<.12&&state.w.lengthSq()<.05;
  state.rest=slow?state.rest+step:0;
 }
 actor.x=p.x;actor.z=p.z;
 return state.rest<.25&&state.age<8;
}
