import * as THREE from 'three';
import {getBuildingSections} from './destruction.js';

export const SLAM_RECOVERY_DURATION = .8;
const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;

// Feet collide with the actual surviving horizontal sections, not the outer
// building box. A missing roof quadrant exposes the next live floor below it.
export function supportAt(buildings,x,z,ceilingY=Infinity) {
  let highest=null;
  const point=new THREE.Vector3(),top=new THREE.Vector3();
  for(const building of buildings||[]) {
    if(building.dead||!building.m)continue;
    building.m.updateWorldMatrix(true,false);
    point.set(x,building.m.position.y,z);building.m.worldToLocal(point);
    for(const section of getBuildingSections(building.m)) {
      if(section.removed||!['roof','floor'].includes(section.kind))continue;
      const {position:p,size:s}=section;
      if(Math.abs(point.x-p.x)>s.x/2+.001||Math.abs(point.z-p.z)>s.z/2+.001)continue;
      top.set(point.x,p.y+s.y/2,point.z);building.m.localToWorld(top);
      if(top.y<=ceilingY+.001&&(!highest||top.y>highest.height))highest={building,section,height:top.y};
    }
  }
  return highest;
}

function sweptSupport(buildings,from,to) {
  let first=null;
  for(const building of buildings||[]) {
    if(building.dead||!building.m)continue;
    building.m.updateWorldMatrix(true,false);
    for(const section of getBuildingSections(building.m)) {
      if(section.removed||!['roof','floor'].includes(section.kind))continue;
      const top=building.m.localToWorld(new THREE.Vector3(section.position.x,section.position.y+section.size.y/2,section.position.z));
      if(top.y>from.y+.001||top.y<to.y-.001)continue;
      const t=Math.max(0,Math.min(1,(from.y-top.y)/(from.y-to.y||1)));
      const contact=from.clone().lerp(to,t);contact.y=top.y;
      const local=building.m.worldToLocal(contact.clone());
      if(Math.abs(local.x-section.position.x)>section.size.x/2+.001||Math.abs(local.z-section.position.z)>section.size.z/2+.001)continue;
      if(!first||t<first.t)first={building,section,height:top.y,t};
    }
  }
  if(to.y<=0&&from.y>=0) {
    const t=from.y/(from.y-to.y||1);
    if(!first||t<first.t)first={building:null,section:null,height:0,t};
  }
  return first;
}

// Returns one landing event. Callers own damage/effects so the same hit cannot
// fire both when the arc ends and when the feet cross a roof.
export function updateJumpMotion(g,dt,tuning,{onLand}={}) {
  dt=Math.max(0,finite(dt,0));
  if(Number.isFinite(g.slamRecovery)) {
    g.slamRecovery+=dt;
    if(g.slamRecovery>=SLAM_RECOVERY_DURATION)g.slamRecovery=null;
  }
  const j=g.jump;
  if(!j||!dt)return null;
  const duration=Math.max(.1,finite(tuning.jumpDuration,1.15));
  const height=Math.max(.1,finite(tuning.jumpHeight,6)*finite(g.sz,1));
  const gravity=8*height/(duration*duration);
  if(!Number.isFinite(j.velocity))j.velocity=j.falling?0:4*height/duration;
  if(j.slam)j.velocity=Math.min(j.velocity,-Math.max(12,height/duration*2));
  const current=g.mon.position;
  const from=j.lastPosition?j.lastPosition.clone():current.clone();
  // Horizontal motion was already collision-resolved this frame. Preserve the
  // last frame's x/z for a swept contact at the roof edge.
  from.y=current.y;
  const next=current.clone();
  next.y=current.y+j.velocity*dt-.5*gravity*dt*dt;
  j.velocity-=gravity*dt;j.t=finite(j.t,0)+dt;
  const support=next.y<=from.y?sweptSupport(g.bl,from,next):null;
  if(!support) {current.y=next.y;j.lastPosition=current.clone();return null;}
  current.y=support.height;
  // Keep collision-resolved horizontal position. The time of impact is used
  // only to choose the first support, never to move through a facade.
  g.jump=null;g.roofY=support.height;g.roofBuilding=support.building;
  if(j.slam)g.slamRecovery=0;
  const result={slam:!!j.slam,radius:(j.slam?10:5)*finite(g.sz,1),position:current.clone(),building:support.building,section:support.section,height:support.height};
  onLand?.(result);
  return result;
}

// Clear before physics each frame; the bellyflop lift is visual and must never
// become the next frame's physical feet height.
export function clearSlamRecoveryPose(mon) {
  const lift=mon.userData.slamVisualLift||0;
  mon.position.y-=lift;mon.userData.slamVisualLift=0;mon.rotation.x=0;
  if(mon.userData.slamRootOrder){mon.rotation.reorder(mon.userData.slamRootOrder);delete mon.userData.slamRootOrder;mon.rotation.x=0;}
  for(const {joint,rotation} of mon.userData.slamPoseJoints||[])joint.rotation.copy(rotation);
  mon.userData.slamPoseJoints=[];
}

export function applySlamRecoveryPose(mon,elapsed) {
  clearSlamRecoveryPose(mon);
  if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=SLAM_RECOVERY_DURATION)return false;
  const stand=Math.max(0,Math.min(1,(elapsed-.25)/(SLAM_RECOVERY_DURATION-.25)));
  const weight=1-stand*stand*(3-2*stand);
  mon.userData.slamRootOrder=mon.rotation.order;
  mon.rotation.reorder('YXZ'); // Tilt around the monster's local side axis at every heading.
  mon.rotation.x=Math.PI/2*weight;
  const lift=Math.sin(mon.rotation.x)*finite(mon.userData.radius,.8)*Math.abs(mon.scale.y);
  mon.position.y+=lift;mon.userData.slamVisualLift=lift;
  const remember=joint=>{if(joint)mon.userData.slamPoseJoints.push({joint,rotation:joint.rotation.clone()});};
  for(const arm of mon.userData.arms||[]) {
    remember(arm.p);remember(arm.el);
    arm.p.rotation.x=-.4*weight;
    arm.p.rotation.z=(arm.side||1)*1.25*weight;
    if(arm.el)arm.el.rotation.x=-.2*weight;
  }
  for(const [i,leg] of (mon.userData.legs||[]).entries()) {
    remember(leg.p);remember(leg.k);remember(leg.f);
    leg.p.rotation.x=-.15*weight;leg.p.rotation.z=(i%2?1:-1)*.35*weight;
    if(leg.k)leg.k.rotation.x=.2*weight;
    if(leg.f)leg.f.rotation.x=0;
  }
  return true;
}
