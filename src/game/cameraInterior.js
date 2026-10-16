import {Vector3} from 'three';
const local=new Vector3();
/** Render cutaway only: physical sections and camera position remain unchanged. */
export function withCameraInteriorCutaways(buildings,cameraPosition,render){
 const hidden=[];
 try{
  for(const b of buildings){
   if(b.dead||!b.m.visible)continue;
   b.m.updateWorldMatrix(true,false);local.copy(cameraPosition);b.m.worldToLocal(local);
   if(Math.abs(local.x)<=b.w/2+.15&&Math.abs(local.z)<=b.d/2+.15&&local.y>=-.15&&local.y<=b.h+.35){hidden.push(b.m);b.m.visible=false;}
  }
  return render();
 }finally{for(const m of hidden)m.visible=true;}
}
