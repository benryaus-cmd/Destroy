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
  const facadePalette=type==='warehouse' ? ['#8a9ca1','#be9870','#b4afa1'] : type==='apartment' ? ['#d8c3a8','#bca7a3','#b9cabd'] : type==='shop' ? ['#d7b67b','#b8cec2','#ddada0'] : type==='church' ? ['#bbb3a2','#ccc1a7','#a5b5ba'] : type==='tower' ? ['#b8c1c6','#aeb6a4','#b2bac8'] : ['#d8b09b','#d9c2a1','#c6bfaa','#b6c5b3'];
  const facade=facadePalette[Math.floor(random()*facadePalette.length)];
  const accent=['#398c8f','#aa493f','#d7a244','#445875'][Math.floor(random()*4)];
  const colors=[facade,'#e9d9b6','#6dabb9','#8c7259','#303b41',type==='house'?'#885343':type==='warehouse'?'#70848a':'#52616a',accent];
  const materials=colors.map((color,i)=>new THREE.MeshStandardMaterial({color,roughness:i===2?.3:.86,metalness:i===2?.25:0}));
  const floors=Math.min(4,Math.max(type==='shop'?1:2,Math.round(h/4.5)));
  const floorH=h/floors, wall=.28;
  const addSection=(id,kind,position,size,support=false) => {
    const s={id,kind,position,size,support,removed:false,damage:0,strength:kind==='wall'?24:kind==='post'?42:36,instances:[],color:colors[kind==='roof'?5:kind==='floor'?3:0]};
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
    const rollerDoor=type==='warehouse';
    const sill=storefront?.12:floorH*.27, head=floorH*.15, jamb=Math.min(.22,width*.08);
    b(0,0,sill/2,0,width-.035,sill,wall);
    b(0,0,floorH-head/2,0,width-.035,head,wall);
    b(0,-width/2+jamb/2,floorH/2,0,jamb,floorH,wall);
    b(0,width/2-jamb/2,floorH/2,0,jamb,floorH,wall);
    const windowH=floorH-sill-head, sign=face===0||face===2?-1:1;
    b(rollerDoor?5:2,0,sill+windowH/2,0,width-2*jamb,windowH,.07);
    b(4,0,sill+windowH/2,sign*.055,.075,windowH,.1);
    b(1,0,sill,sign*.19,width+.07,.09,.3);
    b(1,0,floorH-.06,sign*.13,width+.035,.12,.22);
    if(rollerDoor) {
      // Corrugated shutter and lintel are owned by this bay, so a hit opens the entire door.
      for(let rib=1;rib<=5;rib++) b(4,0,sill+windowH*rib/6,sign*.08,width-2*jamb,.055,.065);
      b(6,0,floorH-.24,sign*.18,width-.16,.22,.14);
    }
    if(type==='apartment' && floor>0) {
      // Projecting balconies use the same removable bay as the window behind them.
      const depth=1.05;
      b(3,0,.15,sign*depth*.5,width-.12,.18,depth);
      b(4,0,.92,sign*depth,width-.14,.075,.075);
      for(let rail=0;rail<5;rail++) b(4,(rail-2)*(width-.28)/4,.56,sign*depth,.045,.72,.045);
      b(1,-width*.43,.56,sign*depth*.5,.08,.72,depth);
      b(1,width*.43,.56,sign*depth*.5,.08,.72,depth);
    }
    if(storefront && face===1) {
      b(6,0,floorH-.35,sign*.3,width-.15,.38,.15);
      // Small lit sign marks are geometry, so no font or canvas is needed.
      for(let i=0;i<3;i++) b(1,(i-1)*width*.17,floorH-.35,sign*.39,width*.1,.085,.035);
      b(6,0,floorH*.7,sign*.5,width-.12,.12,.85);
    }
  };
  for(let floor=0;floor<floors;floor++) {
    for(let face=0;face<4;face++) for(let bay=0;bay<3;bay++) wallBay(floor,face,bay);
    const slabs=[];
    for(let tile=0;tile<(floor===0?1:4);tile++) {
      const x=floor===0?0:(tile%2?1:-1)*(w-.25)/4,z=floor===0?0:(tile<2?1:-1)*(d-.25)/4;
      const slab=addSection(floor===0?`floor:0`:`floor:${floor}:${tile}`,'floor',{x,y:floor*floorH+.1,z},{x:floor===0?w-.25:w/2-.125,y:.2,z:floor===0?d-.25:d/2-.125});
      box(slab,3,x,floor*floorH+.1,z,slab.size.x,.2,slab.size.z);slabs.push(slab);
    }
    const slab=slabs[floor===0?0:3];
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
    if(type==='warehouse') {
      box(roof,2,x,h+.28,z,w*.23,.22,d*.14);
      box(roof,1,x,h+.42,z,w*.25,.08,d*.16);
    }
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
    const meshGeometry=geometry.clone();
    meshGeometry.setAttribute('sectionDamage',new THREE.InstancedBufferAttribute(new Float32Array(matching.length),1));
    installCracks(materials[mat]);
    const mesh=new THREE.InstancedMesh(meshGeometry,materials[mat],matching.length);
    mesh.name=`building-${mat}`; mesh.castShadow=true;mesh.receiveShadow=true;
    matching.forEach((p,i)=>{
      transform.position.set(p.x,p.y,p.z);transform.scale.set(p.sx,p.sy,p.sz);transform.rotation.set(0,0,p.rz);transform.updateMatrix();
      matrix.copy(transform.matrix);mesh.setMatrixAt(i,matrix);p.section.instances.push({mesh,index:i,matrix:matrix.clone()});
    });
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.computeBoundingSphere();group.add(mesh);
  }
  geometry.dispose();
  group.userData.destruction={v:1,floors,sections,removed:new Set(),collapsed:false,integrity:1,w,d,h,type,seed};
  return group;
}

export function getBuildingSections(group) {
  return group?.userData?.destruction?.sections || [];
}

const hiddenMatrix=new THREE.Matrix4().makeScale(0,0,0);
function propagateUnsupportedWalls(state) {
  // Each facade bay is a vertical stack. A missing bay cannot carry any bays
  // above it; neighboring bays, interior posts, and slabs carry their own loads.
  const lowestMissing=new Map();
  for(const id of state.removed) {
    const match=/^wall:(\d+):(\d+):(\d+)$/.exec(id);
    if(!match) continue;
    const floor=Number(match[1]), stack=`${match[2]}:${match[3]}`;
    lowestMissing.set(stack,Math.min(lowestMissing.get(stack)??Infinity,floor));
  }
  for(const section of state.sections) {
    const match=/^wall:(\d+):(\d+):(\d+)$/.exec(section.id);
    if(match && Number(match[1])>lowestMissing.get(`${match[2]}:${match[3]}`)) state.removed.add(section.id);
  }
}

// Three corner loads (post and two adjacent facade bays) carry each slab quadrant.
// Two lost loads release that quadrant and every load directly above it.
function propagateLoads(state) {
  propagateUnsupportedWalls(state);
  for(let floor=0;floor<state.floors;floor++) for(let tile=0;tile<4;tile++) {
    const xBay=tile%2?2:0,zBay=tile<2?2:0;
    const ids=[`post:${floor}:${tile}`,`wall:${floor}:${tile<2?1:0}:${xBay}`,`wall:${floor}:${tile%2?3:2}:${zBay}`];
    const wallFaces=[tile<2?1:0,tile%2?3:2];
    const entireSideLost=wallFaces.some(face=>[0,1,2].every(bay=>state.removed.has(`wall:${floor}:${face}:${bay}`)));
    if(ids.filter(id=>state.removed.has(id)).length<2 && !entireSideLost) continue;
    for(let above=floor;above<state.floors;above++) {
      state.removed.add(`post:${above}:${tile}`);
      if(above>floor) state.removed.add(`floor:${above}:${tile}`);
      state.removed.add(`wall:${above}:${tile<2?1:0}:${xBay}`);
      state.removed.add(`wall:${above}:${tile%2?3:2}:${zBay}`);
    }
    state.removed.add(`roof:${tile}`);
  }
  propagateUnsupportedWalls(state);
}

function installCracks(material) {
  material.customProgramCacheKey=()=> 'section-cracks-v1';
  material.onBeforeCompile=shader=> {
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
attribute float sectionDamage;
varying float vSectionDamage;
varying vec3 vCrackPosition;`).replace('#include <begin_vertex>',`#include <begin_vertex>
vSectionDamage=sectionDamage;
vCrackPosition=(instanceMatrix*vec4(position,1.0)).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying float vSectionDamage;
varying vec3 vCrackPosition;`).replace('#include <color_fragment>',`#include <color_fragment>
// Deterministic jagged fissures follow all faces, independent of panel UVs.
float jag=sin(vCrackPosition.y*13.0+sin(vCrackPosition.x*7.0+vCrackPosition.z*9.0))*0.055;
float seam=abs(fract((vCrackPosition.x+vCrackPosition.z)*0.85+vCrackPosition.y*0.47+jag)-0.5);
float crack=(1.0-smoothstep(0.014,0.032,seam))*step(0.001,vSectionDamage);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*0.12,crack*min(1.0,vSectionDamage*2.0));`);
  };
}

function applyRemoval(state) {
  for(const section of state.sections) {
    section.removed=state.collapsed || state.removed.has(section.id);
    for(const instance of section.instances) {
      instance.mesh.setMatrixAt(instance.index,section.removed?hiddenMatrix:instance.matrix);
      instance.mesh.instanceMatrix.needsUpdate=true;
      const damage=instance.mesh.geometry.getAttribute('sectionDamage');
      damage.setX(instance.index,section.removed?0:section.damage/section.strength);damage.needsUpdate=true;
    }
  }
  state.integrity=state.collapsed?0:structuralIntegrity(state.sections,state.removed).integrity;
}

export function damageBuilding(group,impact) {
  const state=group?.userData?.destruction;
  if(!state || state.collapsed) return {removed:[],collapsed:!!state?.collapsed,integrity:state?.integrity??1};
  const hit=selectImpactSections(state.sections,impact);
  for(const s of hit) {
    s.damage=Math.min(s.strength,s.damage+impact.damage);
    if(s.damage>=s.strength) state.removed.add(s.id);
  }
  propagateLoads(state);
  const result=structuralIntegrity(state.sections,state.removed);
  state.collapsed=result.collapsed;
  const broken=hit.filter(s=>state.removed.has(s.id));
  const hitIds=new Set(broken.map(s=>s.id));
  const removed=[...broken,...state.sections.filter(s=>!s.removed && !hitIds.has(s.id) && (state.collapsed || state.removed.has(s.id)))];
  if(state.collapsed) for(const s of state.sections) state.removed.add(s.id);
  let x=0,z=0;
  for(const s of removed) { x+=s.position.x;z+=s.position.z; }
  const length=Math.hypot(x,z)||1;
  const collapseDirection={x:x/length,y:-1,z:z/length};
  applyRemoval(state);
  return {collapseDirection,damaged:hit.filter(s=>!s.removed).map(s=>s.id),removed:[...removed.filter(s=>s.kind==='roof'||s.kind==='floor'),...removed.filter(s=>s.kind!=='roof'&&s.kind!=='floor')].slice(0,MAX_DEBRIS).map(s=>({id:s.id,position:{...s.position},size:{...s.size},color:s.color})),collapsed:state.collapsed,integrity:state.integrity};
}

export function serializeBuilding(group) {
  const state=group?.userData?.destruction;
  return {v:1,removed:state?[...state.removed].sort():[],collapsed:!!state?.collapsed,damage:state?Object.fromEntries(state.sections.filter(s=>!s.removed && s.damage>0).map(s=>[s.id,s.damage])):{}};
}

export function restoreBuilding(group,data) {
  const state=group?.userData?.destruction;
  if(!state || !data || data.v!==1 || !Array.isArray(data.removed)) return;
  const ids=new Set(state.sections.map(s=>s.id));
  state.removed=new Set(data.removed.filter(id=>typeof id==='string' && ids.has(id)));
  // Old saves used one floor section; expand it to the current slab quadrants.
  for(const id of data.removed) if(typeof id==='string' && /^floor:[1-3]$/.test(id)) for(let tile=0;tile<4;tile++) state.removed.add(`${id}:${tile}`);
  for(const section of state.sections) {
    const value=data.damage && Object.prototype.hasOwnProperty.call(data.damage,section.id)?data.damage[section.id]:0;
    section.damage=bounded(value,0,0,section.strength);
    if(section.damage>=section.strength) state.removed.add(section.id);
  }
  propagateLoads(state);
  state.collapsed=data.collapsed===true || structuralIntegrity(state.sections,state.removed).collapsed;
  if(state.collapsed) for(const s of state.sections) state.removed.add(s.id);
  applyRemoval(state);
}

export function getBuildingIntegrity(group) {
  return group?.userData?.destruction?.integrity??1;
}
