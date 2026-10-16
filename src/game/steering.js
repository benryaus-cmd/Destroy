const axis = value => Math.max(-1,Math.min(1,Number.isFinite(value)?value:0));
/** Facing-relative forward/reverse with independent left/right rotation. */
export function applyTankSteering(mon,turn,throttle,dt,{moveSpeed=1,turnSpeed=2.4,blocked=false}={}){
 if(blocked)return 0;
 turn=axis(turn);throttle=axis(throttle);
 if(Math.abs(turn)<.05)turn=0;if(Math.abs(throttle)<.05)throttle=0;
 const seconds=Math.max(0,dt),angle=-turn*turnSpeed*seconds,heading=mon.rotation.y;
 // Integrate the turn arc so the same input has the same path at any frame rate.
 const half=angle/2,arc=Math.abs(half)<1e-8?1:Math.sin(half)/half,distance=throttle*moveSpeed*seconds*arc;
 mon.position.x+=Math.sin(heading+half)*distance;
 mon.position.z+=Math.cos(heading+half)*distance;
 mon.rotation.y=heading+angle;
 return Math.abs(throttle);
}
