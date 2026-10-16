const axis=value=>Math.max(-1,Math.min(1,Number.isFinite(value)?value:0));
/** Walk toward the stick on screen using this frame's actual camera heading. */
export function applyScreenSteering(mon,horizontal,forward,dt,{cameraYaw=0,moveSpeed=1,turnSpeed=2.4,blocked=false}={}){
 if(blocked)return 0;
 let x=axis(horizontal),y=axis(forward);const magnitude=Math.hypot(x,y);
 if(magnitude<.05)return 0;
 if(magnitude>1){x/=magnitude;y/=magnitude;}
 const seconds=Math.max(0,dt),sin=Math.sin(cameraYaw),cos=Math.cos(cameraYaw);
 const dx=cos*x-sin*y,dz=-sin*x-cos*y;
 mon.position.x+=dx*moveSpeed*seconds;mon.position.z+=dz*moveSpeed*seconds;
 const desired=Math.atan2(dx,dz),difference=Math.atan2(Math.sin(desired-mon.rotation.y),Math.cos(desired-mon.rotation.y));
 // Fast pivot response keeps reversals crisp while the camera remains independently damped.
 mon.rotation.y+=difference*(-Math.expm1(-Math.max(0,turnSpeed)*10*seconds));
 return Math.min(1,magnitude);
}
