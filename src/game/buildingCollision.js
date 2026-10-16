import * as THREE from 'three';
import {getBuildingSections} from './destruction.js';

const EPS=1e-5;
// Local section boxes keep destruction and movement in agreement. Buildings may
// translate, rotate about Y and scale; actors remain upright in world space.
function obstacles(position,delta,radius,buildings,bodyHeight) {
  const result=[];
  for(const building of buildings) {
    const group=building.m || building.g || building;
    if(building.dead || group.userData?.destruction?.collapsed)continue;
    group.updateWorldMatrix(true,false);
    const inverse=group.matrixWorld.clone().invert(),scale=new THREE.Vector3();
    group.getWorldScale(scale);
    const p=new THREE.Vector3(position.x,position.y||0,position.z).applyMatrix4(inverse);
    const end=new THREE.Vector3(position.x+(delta.x||0),position.y||0,position.z+(delta.z||0)).applyMatrix4(inverse);
    const rx=radius/Math.abs(scale.x),rz=radius/Math.abs(scale.z),height=bodyHeight/Math.abs(scale.y);
    const state=group.userData?.destruction;
    if(!state)continue;
    if(Math.min(p.x,end.x)>state.w/2+rx || Math.max(p.x,end.x)<-state.w/2-rx || Math.min(p.z,end.z)>state.d/2+rz || Math.max(p.z,end.z)<-state.d/2-rz)continue;
    for(const section of getBuildingSections(group)) {
      if(section.removed || state.removed.has(section.id) || !['wall','post'].includes(section.kind))continue;
      const c=section.position,s=section.size;
      if(p.y+height<=c.y-s.y/2+EPS || p.y>=c.y+s.y/2-EPS)continue;
      result.push({building,inverse,world:group.matrixWorld,minX:c.x-s.x/2-rx,maxX:c.x+s.x/2+rx,minZ:c.z-s.z/2-rz,maxZ:c.z+s.z/2+rz});
    }
  }
  return result;
}
function localPoint(position,box) {return new THREE.Vector3(position.x,position.y||0,position.z).applyMatrix4(box.inverse);}
function worldNormal(x,z,box) {return new THREE.Vector3(x,0,z).transformDirection(box.world);}
function sweep(position,delta,box) {
  const p=localPoint(position,box),end=localPoint({x:position.x+delta.x,y:position.y,z:position.z+delta.z},box);
  const d={x:end.x-p.x,z:end.z-p.z};
  let near=-Infinity,far=Infinity,nx=0,nz=0;
  for(const [axis,min,max] of [['x',box.minX,box.maxX],['z',box.minZ,box.maxZ]]) {
    if(Math.abs(d[axis])<EPS) {if(p[axis]<=min+EPS || p[axis]>=max-EPS)return null;continue;}
    const a=(min-p[axis])/d[axis],b=(max-p[axis])/d[axis],entry=Math.min(a,b),exit=Math.max(a,b);
    if(entry>near){near=entry;nx=axis==='x'?-Math.sign(d[axis]):0;nz=axis==='z'?-Math.sign(d[axis]):0;}
    far=Math.min(far,exit);
    if(near>far)return null;
  }
  if(near< -EPS || near>1 || far<0)return null;
  return {t:Math.max(0,near),normal:worldNormal(nx,nz,box),building:box.building};
}
function correctOverlaps(position,boxes) {
  let hit=null;
  for(let pass=0;pass<4;pass++) {
    let corrected=false;
    for(const box of boxes) {
      const p=localPoint(position,box);
      if(p.x<=box.minX+EPS || p.x>=box.maxX-EPS || p.z<=box.minZ+EPS || p.z>=box.maxZ-EPS)continue;
      const options=[{d:p.x-box.minX,x:box.minX-EPS,z:p.z},{d:box.maxX-p.x,x:box.maxX+EPS,z:p.z},{d:p.z-box.minZ,x:p.x,z:box.minZ-EPS},{d:box.maxZ-p.z,x:p.x,z:box.maxZ+EPS}];
      options.sort((a,b)=>a.d-b.d);
      const closest=options[0],world=new THREE.Vector3(closest.x,p.y,closest.z).applyMatrix4(box.world);
      position.x=world.x;position.z=world.z;hit=box.building;corrected=true;
    }
    if(!corrected)break;
  }
  return hit;
}

/** Mutates position by a world-space horizontal delta, sliding along surviving
 * walls/posts. Returns the last building hit, or null. bodyHeight measures upward
 * from position.y (feet), defaults to 1. Use for walking, jumping and charges;
 * climbing may bypass it while explicitly attached to its surface. */
export function moveWithBuildingCollision(position,delta,radius,buildings,{bodyHeight=1}={}) {
  const remaining={x:delta.x||0,z:delta.z||0};
  const boxes=obstacles(position,remaining,radius,buildings,bodyHeight);
  let hit=correctOverlaps(position,boxes);
  for(let i=0;i<5 && Math.hypot(remaining.x,remaining.z)>EPS;i++) {
    let nearest=null;
    for(const box of boxes) {const contact=sweep(position,remaining,box);if(contact && (!nearest || contact.t<nearest.t))nearest=contact;}
    if(!nearest){position.x+=remaining.x;position.z+=remaining.z;break;}
    const length=Math.hypot(remaining.x,remaining.z),travel=Math.max(0,nearest.t-EPS/length);
    position.x+=remaining.x*travel;position.z+=remaining.z*travel;
    remaining.x*=1-nearest.t;remaining.z*=1-nearest.t;
    const dot=remaining.x*nearest.normal.x+remaining.z*nearest.normal.z;
    if(dot<0){remaining.x-=nearest.normal.x*dot;remaining.z-=nearest.normal.z*dot;}
    hit=nearest.building;
  }
  return hit;
}

/** Repairs an existing horizontal overlap against individual surviving sections.
 * Unlike outer-bounds ejection, entering an actual broken wall bay stays valid. */
export function resolveBuildingOverlap(position,radius,buildings,options={}) {
  return correctOverlaps(position,obstacles(position,{x:0,z:0},radius,buildings,options.bodyHeight??1));
}
