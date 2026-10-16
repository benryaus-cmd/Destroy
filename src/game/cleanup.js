/** Retire simulation work, never allocate new debris during cleanup. */
export function cleanupDistant(g,position,distance=80){const far=p=>Math.hypot(p.x-position.x,p.z-position.z)>distance;
 for(const key of ['dbr','gibs','parts'])for(const q of g[key]||[])if(q.l>0&&far(q.m.position)){q.l=0;q.m.visible=false;q.rest=1;}
 for(const q of g.prts||[])if(q.l>0&&far(q.g.position)){q.l=0;q.g.visible=false;q.rest=1;}
 for(const d of g.dec||[])if(d.visible&&far(d.position))d.visible=false;
 for(const mark of g.wallSplats||[])if(mark.visible&&(far(mark.position)||!mark.userData.building?.m?.parent||mark.userData.building.dead||mark.userData.section?.removed))mark.visible=false;
 if(g.fires)g.fires=g.fires.filter(f=>!far(f));
 if(g.rings)for(let i=g.rings.length-1;i>=0;i--){const q=g.rings[i];if(far(q.m.position)){q.m.removeFromParent();q.m.material.dispose();g.rings.splice(i,1);}}
 if(g.enemies)for(let i=g.enemies.length-1;i>=0;i--){const e=g.enemies[i];if(!e.held&&!e.projectile&&Math.hypot(e.m.position.x-position.x,e.m.position.z-position.z)>Math.max(110,distance)){const geometries=new Set(),materials=new Set();e.m.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});e.m.removeFromParent();for(const r of geometries)r.dispose();for(const r of materials)r.dispose();g.enemies.splice(i,1);}}
}

/** Clear ownership before an actor is killed; projectile iteration prunes nulls. */
export function releaseHumanInteraction(g,h){
 if(g.held===h)g.held=null;
 h.held=false;h.projectile=null;
}
