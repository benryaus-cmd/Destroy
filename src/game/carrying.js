import {Vector3,Quaternion,Euler} from 'three';

// Use the builder's arm pivots so edited limbs and monster scale remain authoritative.
export function applyCarryPose(mon,human=false){
 for(const a of mon.userData.arms||[]){a.p.rotation.x=human?-1.05:-1.35;a.el.rotation.x=human?-1.15:-.55;if(human)a.p.rotation.z=a.side*.15;}
}

export function updateCarriedActor(g){
 const actor=g.held;if(!actor||actor.beingEaten)return;
 const mon=g.mon,human=actor.throwableHuman||g.hum?.includes(actor);
 if(!human){actor.m.position.set(mon.position.x+Math.sin(mon.rotation.y)*2*g.sz,3.5*g.sz+mon.position.y,mon.position.z+Math.cos(mon.rotation.y)*2*g.sz);actor.m.rotation.set(.15,mon.rotation.y+.6,0);}
 else{
  mon.updateWorldMatrix(true,true);
  const hands=mon.userData.trialAnchors?.hands?.length?mon.userData.trialAnchors.hands.map(hand=>hand.getWorldPosition(new Vector3())):(mon.userData.arms||[]).slice(0,2).map(a=>{
   // Hand group is the elbow's immediate group child at the forearm tip.
   const hand=a.el.children.find(c=>c.isGroup&&c.position.y<0);
   return (hand||a.el).getWorldPosition(new Vector3());
  });
  const center=new Vector3();
  if(hands.length){for(const hand of hands)center.add(hand);center.multiplyScalar(1/hands.length);}
  else center.copy(mon.localToWorld(new Vector3(0,1.25,.85)));
  center.y+=.06*g.sz;
  const rotation=mon.getWorldQuaternion(new Quaternion()).multiply(new Quaternion().setFromEuler(new Euler(0,0,Math.PI/2)));
  actor.m.quaternion.copy(rotation);
  // Human roots sit at their feet. Place their torso, not their root, across the hands.
  const offset=new Vector3(0,.9,0).multiply(actor.m.scale).applyQuaternion(rotation);
  actor.m.position.copy(center).sub(offset);
 }
 actor.x=actor.m.position.x;actor.z=actor.m.position.z;actor.m.updateMatrixWorld(true);
}
