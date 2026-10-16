import test from 'node:test';
import assert from 'node:assert/strict';

import * as api from '../src/game/destruction.js';
const fn = name => {
  assert.equal(typeof api[name], 'function', `${name} must be implemented`);
  return api[name];
};
const section = (id,x,y,z,support=false) => ({id,position:{x,y,z},size:{x:2,y:3,z:.4},support});

test('impact cuts only sections intersecting its actual sphere, including wide panels', () => {
  const sections = [section('near',0,2,5),section('far',6,2,5),section('floor-above',0,9,5)];
  const selected = fn('selectImpactSections')(sections,{x:1.5,y:2,z:5,radius:.6,damage:20});
  assert.deepEqual(selected.map(s=>s.id), ['near']);
});

test('damage selection is deterministic, bounded, and ignores zero or invalid impact', () => {
  const sections = Array.from({length:40},(_,i)=>section(String(i),0,0,0));
  const select = fn('selectImpactSections');
  assert.equal(select(sections,{x:0,y:0,z:0,radius:20,damage:20}).length,12);
  assert.deepEqual(select(sections,{x:0,y:0,z:0,radius:20,damage:20}).map(s=>s.id),select(sections,{x:0,y:0,z:0,radius:20,damage:20}).map(s=>s.id));
  assert.equal(select(sections,{x:0,y:0,z:0,radius:2,damage:0}).length,0);
  assert.equal(select(sections,{x:NaN,y:0,z:0,radius:2,damage:20}).length,0);
});

test('collapse follows lost ground support or extensive damage, not one nearby panel', () => {
  const sections = Array.from({length:20},(_,i)=>section(String(i),0,i,0,i<4));
  const evaluate = fn('structuralIntegrity');
  assert.equal(evaluate(sections,new Set(['0'])).collapsed,false);
  assert.equal(evaluate(sections,new Set(['0','1','2'])).collapsed,true);
  assert.equal(evaluate(sections,new Set(sections.slice(4,17).map(s=>s.id))).collapsed,true);
  assert.equal(evaluate(sections,new Set()).integrity,1);
});

test('seeded section buildings stay within mesh budget and have no solid central volume', () => {
  for (const type of ['house','shop','tower','church']) {
    const b = fn('createDestructibleBuilding')({w:10,d:8,h:24,type,seed:42});
    const sections = fn('getBuildingSections')(b);
    assert.ok(b.children[0].material.color);
    assert.ok(b.children.length<=8,`${type} exceeded drawcall budget`);
    assert.ok(sections.length<=100 && sections.length>=20);
    assert.ok(!sections.some(s=>s.size.x>8 && s.size.z>6 && s.size.y>2),'solid central volume blocks holes');
    assert.equal(new Set(sections.map(s=>s.id)).size,sections.length);
    assert.deepEqual(sections.map(s=>s.id),fn('getBuildingSections')(fn('createDestructibleBuilding')({w:10,d:8,h:24,type,seed:42})).map(s=>s.id));
  }
});

test('a facade impact opens a local hole, retains interior floors, and restores exactly', () => {
  const create = fn('createDestructibleBuilding');
  const b = create({w:12,d:10,h:15,type:'tower',seed:123});
  const damage = fn('damageBuilding')(b,{x:0,y:2.5,z:5,radius:1.2,damage:25});
  assert.ok(damage.removed.length>0);
  assert.ok(!damage.collapsed);
  assert.ok(damage.integrity<1 && damage.integrity>.5);
  assert.ok(fn('getBuildingSections')(b).filter(s=>s.kind==='floor').every(s=>!s.removed));
  assert.equal(fn('damageBuilding')(b,{x:0,y:2.5,z:5,radius:1.2,damage:25}).removed.length,0);
  const save=JSON.parse(JSON.stringify(fn('serializeBuilding')(b)));
  const copy=create({w:12,d:10,h:15,type:'tower',seed:123});
  fn('restoreBuilding')(copy,save);
  assert.deepEqual(fn('serializeBuilding')(copy),save);
  assert.equal(fn('getBuildingIntegrity')(copy),fn('getBuildingIntegrity')(b));
  assert.ok(JSON.stringify(save).length<1600);
  assert.equal(copy.children.flatMap(m=>Array.from({length:m.count},(_,i)=>m.instanceMatrix.array[i*16])).filter(v=>v===0).length,b.children.flatMap(m=>Array.from({length:m.count},(_,i)=>m.instanceMatrix.array[i*16])).filter(v=>v===0).length);
});

test('malformed restoration is ignored and collapsed restoration hides all sections', () => {
  const b=fn('createDestructibleBuilding')({w:9,d:8,h:10,seed:4});
  fn('restoreBuilding')(b,{v:1,removed:['unknown',null,42],collapsed:false});
  assert.equal(fn('getBuildingIntegrity')(b),1);
  fn('restoreBuilding')(b,{v:1,removed:[],collapsed:true});
  assert.equal(fn('getBuildingIntegrity')(b),0);
  assert.ok(fn('getBuildingSections')(b).every(s=>s.removed));
  assert.equal(fn('damageBuilding')(b,{x:0,y:2,z:4,radius:3,damage:99}).removed.length,0);
});
