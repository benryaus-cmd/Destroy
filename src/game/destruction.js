import * as THREE from 'three';

// Impacts and saves use stable logical sections; geometry is batched by material.
const MAX_IMPACT_SECTIONS = 12;
const MAX_DEBRIS = 24;
const bounded = (v, fallback, min, max) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
const distanceSquared = (s, p) => ['x','y','z'].reduce((n,axis) => {
  const delta = Math.max(0, Math.abs(p[axis]-s.position[axis])-s.size[axis]/2);
  return n+delta*delta;
},0);

export function selectImpactSections(sections, impact = {}) {
  if (!['x','y','z','radius','damage'].every(k=>Number.isFinite(impact[k])) || impact.radius<=0 || impact.damage<=0) return [];
  const radius = Math.min(20,impact.radius);
  return sections.filter(s=>!s.removed && distanceSquared(s,impact)<=radius*radius)
    .sort((a,b)=>distanceSquared(a,impact)-distanceSquared(b,impact) || String(a.id).localeCompare(String(b.id)))
    .slice(0,MAX_IMPACT_SECTIONS);
}

export function structuralIntegrity(sections, removed = new Set()) {
  const missing = removed instanceof Set ? removed : new Set(removed);
  const live = sections.filter(s=>!missing.has(s.id));
  const supports = sections.filter(s=>s.support);
  const support = supports.length ? supports.filter(s=>!missing.has(s.id)).length/supports.length : 1;
  const integrity = sections.length ? live.length/sections.length : 0;
  return {integrity,support,collapsed: integrity<.42 || support<=.25};
}

function seededRandom(seed) {
  let n = Number(seed)>>>0;
  return () => { n=(Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; };
}

export function createDestructibleBuilding({w=10,d=8,h=10,type='house',seed=1}={}) {
  w=bounded(w,10,4,60); d=bounded(d,8,4,60); h=bounded(h,10,3,80);
  const random=seededRandom(seed), group=new THREE.Group(), sections=[], parts=[];
  group.name=`sectioned-${type}`;
  const facadePalette=type==='shop' ? ['#d7b67b','#b8cec2','#ddada0'] : type==='church' ? ['#bbb3a2','#ccc1a7','#a5b5ba'] : type==='tower' ? ['#b8c1c6','#aeb6a4','#b2bac8'] : ['#d8b09b','#d9c2a1','#c6bfaa','#b6c5b3'];
  const facade=facadePalette[Math.floor(random()*facadePalette.length)];
  const accent=['#398c8f','#aa493f','#d7a244','#445875'][Math.floor(random()*4)];
  const colors=[facade,'#e9d9b6','#6dabb9','#8c7259','#303b41',type==='house'?'#885343':'#52616a',accent];
  const materials=colors.map((color,i)=>new THREE.MeshStandardMaterial({color,roughness:i===2?.3:.86,metalness:i===2?.25:0}));
  const floors=Math.min(4,Math.max(type==='shop'?1:2,Math.round(h/4.5)));
  const floorH=h/floors, wall=.28;
  const addSection=(id,kind,position,size,support=false) => {
    const s={id,kind,position,size,support,removed:false,instances:[],color:colors[kind==='roof'?5:kind==='floor'?3:0]};
    sections.push(s); return s;
  };
  const box=(section,mat,x,y,z,sx,sy,sz,rz=0) => {
    parts.push({section,mat,x,y,z,sx,sy,sz,rz});
  };
  const wallBay=(floor,face,bay) => {
    const horizontal=face<2, width=(horizontal?w:d)/3, along=-(horizontal?w:d)/2+width*(bay+.5);
    const x=horizontal?along:(face===2?-w/2:w/2), z=horizontal?(face===0?-d/2:d/2):along;
    const base=floor*floorH, s=addSection(`wall:${floor}:${face}:${bay}`,'wall',{x,y:base+floorH/2,z},{x:horizontal?width:wall,y:floorH,z:horizontal?wall:width},floor===0);
    const b=(mat,a,y,depth,aw,ah,ad) => box(s,mat,horizontal?x+a:x+depth,base+y,horizontal?z+depth:z+a,horizontal?aw:ad,ah,horizontal?ad:aw);
    const storefront=type==='shop' && floor===0;
    const sill=storefront?.12:floorH*.27, head=floorH*.15, jamb=Math.min(.22,width*.08);
    b(0,0,sill/2,0,width-.035,sill,wall);
    b(0,0,floorH-head/2,0,width-.035,head,wall);
    b(0,-width/2+jamb/2,floorH/2,0,jamb,floorH,wall);
    b(0,width/2-jamb/2,floorH/2,0,jamb,floorH,wall);
    const windowH=floorH-sill-head, sign=face===0||face===2?-1:1;
    b(2,0,sill+windowH/2,0,width-2*jamb,windowH,.07);
    b(4,0,sill+windowH/2,sign*.055,.075,windowH,.1);
    b(1,0,sill,sign*.19,width+.07,.09,.3);
    b(1,0,floorH-.06,sign*.13,width+.035,.12,.22);
    if(storefront && face===1) {
      b(6,0,floorH-.35,sign*.3,width-.15,.38,.15);
      // Small lit sign marks are geometry, so no font or canvas is needed.
      for(let i=0;i<3;i++) b(1,(i-1)*width*.17,floorH-.35,sign*.39,width*.1,.085,.035);
      b(6,0,floorH*.7,sign*.5,width-.12,.12,.85);
    }
  };
  for(let floor=0;floor<floors;floor++) {
    for(let face=0;face<4;face++) for(let bay=0;bay<3;bay++) wallBay(floor,face,bay);
    const slab=addSection(`floor:${floor}`,'floor',{x:0,y:floor*floorH+.1,z:0},{x:w-.25,y:.2,z:d-.25});
    box(slab,3,0,floor*floorH+.1,0,w-.25,.2,d-.25);
    // Recessed structural posts and cross beams remain visible through broken facades.
    for(let c=0;c<4;c++) {
      const x=(c%2?1:-1)*(w/2-.48),z=(c<2?1:-1)*(d/2-.48);
      const post=addSection(`post:${floor}:${c}`,'post',{x,y:(floor+.5)*floorH,z},{x:.34,y:floorH,z:.34},floor===0);
      box(post,4,x,(floor+.5)*floorH,z,.34,floorH,.34);
      box(post,3,x*.5,(floor+1)*floorH-.15,z,w/2-.4,.18,.2);
    }
    // Interior desks/counters give broken rooms a human scale, attached to their floor.
    box(slab,3,w*.18,floor*floorH+.7,-d*.13,w*.25,.18,d*.16);
    box(slab,4,w*.18,floor*floorH+.4,-d*.13,.16,.5,d*.14);
  }
  for(let tile=0;tile<4;tile++) {
    const x=(tile%2?1:-1)*w/4,z=(tile<2?1:-1)*d/4;
    const roof=addSection(`roof:${tile}`,'roof',{x,y:h+.12,z},{x:w/2+.12,y:.24,z:d/2+.12});
    box(roof,5,x,h+.12,z,w/2+.12,.24,d/2+.12);
    box(roof,1,(tile%2?1:-1)*(w/2+.015),h+.28,z,.15,.3,d/2+.2);
    box(roof,1,x,h+.28,(tile<2?1:-1)*(d/2+.015),w/2+.2,.3,.15);
    if(tile===0 && type==='house') {
      box(roof,0,x,h+.7,z,.65,1.2,.7); box(roof,4,x,h+1.32,z,.83,.13,.86);
    }
    if(tile===3 && type!=='house') {
      box(roof,4,x,h+.5,z,w*.16,.6,d*.18); box(roof,1,x,h+.83,z,w*.19,.08,d*.2);
    }
  }
  const geometry=new THREE.BoxGeometry(1,1,1), matrix=new THREE.Matrix4(), transform=new THREE.Object3D();
  for(let mat=0;mat<materials.length;mat++) {
    const matching=parts.filter(p=>p.mat===mat);
    if(!matching.length) {materials[mat].dispose();continue;}
    const mesh=new THREE.InstancedMesh(geometry,materials[mat],matching.length);
    mesh.name=`building-${mat}`; mesh.castShadow=true;mesh.receiveShadow=true;
    matching.forEach((p,i)=>{
      transform.position.set(p.x,p.y,p.z);transform.scale.set(p.sx,p.sy,p.sz);transform.rotation.set(0,0,p.rz);transform.updateMatrix();
      matrix.copy(transform.matrix);mesh.setMatrixAt(i,matrix);p.section.instances.push({mesh,index:i,matrix:matrix.clone()});
    });
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.computeBoundingSphere();group.add(mesh);
  }
  group.userData.destruction={v:1,sections,removed:new Set(),collapsed:false,integrity:1,w,d,h,type,seed};
  return group;
}

export function getBuildingSections(group) {
  return group?.userData?.destruction?.sections || [];
}

const hiddenMatrix=new THREE.Matrix4().makeScale(0,0,0);
function applyRemoval(state) {
  for(const section of state.sections) {
    section.removed=state.collapsed || state.removed.has(section.id);
    for(const instance of section.instances) {
      instance.mesh.setMatrixAt(instance.index,section.removed?hiddenMatrix:instance.matrix);
      instance.mesh.instanceMatrix.needsUpdate=true;
    }
  }
  state.integrity=state.collapsed?0:structuralIntegrity(state.sections,state.removed).integrity;
}

export function damageBuilding(group,impact) {
  const state=group?.userData?.destruction;
  if(!state || state.collapsed) return {removed:[],collapsed:!!state?.collapsed,integrity:state?.integrity??1};
  const hit=selectImpactSections(state.sections,impact);
  for(const s of hit) state.removed.add(s.id);
  const result=structuralIntegrity(state.sections,state.removed);
  state.collapsed=result.collapsed;
  const removed=state.collapsed ? [...hit,...state.sections.filter(s=>!s.removed && !state.removed.has(s.id))] : hit;
  if(state.collapsed) for(const s of state.sections) state.removed.add(s.id);
  applyRemoval(state);
  return {removed:removed.slice(0,MAX_DEBRIS).map(s=>({id:s.id,position:{...s.position},size:{...s.size},color:s.color})),collapsed:state.collapsed,integrity:state.integrity};
}

export function serializeBuilding(group) {
  const state=group?.userData?.destruction;
  return {v:1,removed:state?[...state.removed].sort():[],collapsed:!!state?.collapsed};
}

export function restoreBuilding(group,data) {
  const state=group?.userData?.destruction;
  if(!state || !data || data.v!==1 || !Array.isArray(data.removed)) return;
  const ids=new Set(state.sections.map(s=>s.id));
  state.removed=new Set(data.removed.filter(id=>typeof id==='string' && ids.has(id)));
  state.collapsed=data.collapsed===true || structuralIntegrity(state.sections,state.removed).collapsed;
  if(state.collapsed) for(const s of state.sections) state.removed.add(s.id);
  applyRemoval(state);
}

export function getBuildingIntegrity(group) {
  return group?.userData?.destruction?.integrity??1;
}
