import * as THREE from 'three';

/** A fixed sprite/light pool keeps a busy burning block bounded. */
export function createFireFX(scene){
 const texture=(smoke)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,smoke?32:43,2,32,32,31);g.addColorStop(0,smoke?'rgba(135,123,117,.45)':'rgba(255,252,194,1)');g.addColorStop(.25,smoke?'rgba(97,91,88,.42)':'rgba(255,187,44,.95)');g.addColorStop(.6,smoke?'rgba(49,47,49,.2)':'rgba(255,65,11,.55)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);return new THREE.CanvasTexture(canvas);};
 const flameMap=texture(false),smokeMap=texture(true),group=new THREE.Group();group.name='Pooled fire and smoke';scene.add(group);const flames=[],smoke=[];
 for(let i=0;i<36;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:flameMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:'#ffffff'}));m.visible=false;group.add(m);flames.push(m);}
 for(let i=0;i<24;i++){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeMap,transparent:true,depthWrite:false,color:'#b2a4a0'}));m.visible=false;group.add(m);smoke.push(m);}
 const lights=Array.from({length:2},()=>{const light=new THREE.PointLight('#ff7438',0,17,2);group.add(light);return light;});
 return {group,update(fires,dt,t,position,intensity=1){const active=fires.filter(f=>f.l>0&&Math.hypot(f.x-position.x,f.z-position.z)<95).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z)).slice(0,12);for(let i=0;i<flames.length;i++){const sprite=flames[i],f=active[Math.floor(i/3)];sprite.visible=!!f&&intensity>0;if(!sprite.visible)continue;const phase=t*(1.3+i*.013)+i*.7,u=phase%1,spread=Math.max(1,Math.min(5,f.w*.6));sprite.position.set(f.x+Math.sin(i*8.3)*spread*.6,1+u*3,f.z+Math.cos(i*5.1)*spread*.6);sprite.scale.set((1.6+spread*.45)*(1-u*.4),(3+spread*.7)*(1+Math.sin(phase*9)*.13),1);sprite.material.opacity=Math.min(1,f.l/2)*(.85-u*.6)*intensity;}
 for(let i=0;i<smoke.length;i++){const sprite=smoke[i],f=active[Math.floor(i/2)];sprite.visible=!!f&&intensity>0;if(!sprite.visible)continue;const u=(t*.22+i*.43)%1,spread=Math.max(1,f.w*.35);sprite.position.set(f.x+Math.sin(i*4)*spread+u*2,3+u*10,f.z+Math.cos(i*7)*spread);sprite.scale.setScalar(3+u*6);sprite.material.opacity=Math.min(.65,f.l/4)*Math.sin(u*Math.PI)*intensity;}
 lights.forEach((light,i)=>{const f=active[i];light.intensity=f?(4+Math.sin(t*19+i)*1.2)*intensity:0;if(f)light.position.set(f.x,2,f.z);});}}
}
