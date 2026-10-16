import * as THREE from 'three';

// Two inexpensive, half-resolution masks use the real actor/building geometry.
// This keeps skinned poses and holes in the building instances in sync automatically.
export function depthIsOccluded(actorDepth, buildingDepth, near, far, tolerance=.08) {
 const distance=d=>near*far/(far-d*(far-near));
 return actorDepth<1 && buildingDepth<1 && distance(buildingDepth)+tolerance<distance(actorDepth);
}

export function createOcclusionOutlines(renderer) {
 const size=new THREE.Vector2(),oldClear=new THREE.Color(),viewport=new THREE.Vector4(),scissor=new THREE.Vector4();
 const makeTarget=()=>{const t=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});t.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);return t;};
 const buildingTarget=makeTarget(),actorTarget=makeTarget();
 const buildingMaterial=new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide,toneMapped:false});
 const actorMaterials=new Map();
 const materialFor=color=>{const key=new THREE.Color(color??0x99efff).getHex();let m=actorMaterials.get(key);if(!m&&actorMaterials.size>=32)return actorMaterials.values().next().value;if(!m){m=new THREE.MeshBasicMaterial({color:key,side:THREE.DoubleSide,toneMapped:false});actorMaterials.set(key,m);}return m;};
 const uniforms={mask:{value:actorTarget.texture},actorDepth:{value:actorTarget.depthTexture},buildingDepth:{value:buildingTarget.depthTexture},pixel:{value:new THREE.Vector2()},near:{value:1},far:{value:1000}};
 const compositeMaterial=new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
 vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
 fragmentShader:`uniform sampler2D mask,actorDepth,buildingDepth;uniform vec2 pixel;uniform float near,far;varying vec2 uv0;
 float distanceAt(float d){return near*far/(far-d*(far-near));}
 vec4 edge(vec2 uv){vec4 m=texture2D(mask,uv);float a=texture2D(actorDepth,uv).r,b=texture2D(buildingDepth,uv).r;
 return m.a>.5&&a<1.&&b<1.&&distanceAt(b)+.08<distanceAt(a)?vec4(m.rgb,1.):vec4(0.);}
 void main(){if(texture2D(mask,uv0).a>.5)discard;vec4 c=vec4(0.);
 c=max(c,edge(uv0+pixel*vec2(1.,0.)));c=max(c,edge(uv0+pixel*vec2(-1.,0.)));
 c=max(c,edge(uv0+pixel*vec2(0.,1.)));c=max(c,edge(uv0+pixel*vec2(0.,-1.)));
 c=max(c,edge(uv0+pixel*vec2(1.,1.)));c=max(c,edge(uv0+pixel*vec2(-1.,1.)));
 c=max(c,edge(uv0+pixel*vec2(1.,-1.)));c=max(c,edge(uv0+pixel*vec2(-1.,-1.)));
 if(c.a<.5)discard;gl_FragColor=c;#include <colorspace_fragment>
 }`.replace(';#include',';\n#include')});
 const overlayScene=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),compositeMaterial),overlayCamera=new THREE.Camera();quad.frustumCulled=false;overlayScene.add(quad);
 let disposed=false;
 return {
  render(scene,camera,{actors=[],buildings=[]}={}) {
   if(disposed||!actors.length||!buildings.length)return;
   const activeColors=new Set(actors.map(a=>new THREE.Color(a.color??0x99efff).getHex()));
   for(const [color,material]of actorMaterials)if(!activeColors.has(color)){material.dispose();actorMaterials.delete(color);}
   renderer.getDrawingBufferSize(size);const w=Math.max(1,Math.ceil(size.x/2)),h=Math.max(1,Math.ceil(size.y/2));
   if(actorTarget.width!==w||actorTarget.height!==h){actorTarget.setSize(w,h);buildingTarget.setSize(w,h);}
   uniforms.pixel.value.set(1.25/w,1.25/h);uniforms.near.value=camera.near;uniforms.far.value=camera.far;
   const saved={target:renderer.getRenderTarget(),autoClear:renderer.autoClear,clearAlpha:renderer.getClearAlpha(),background:scene.background,fog:scene.fog,override:scene.overrideMaterial,cameraMask:camera.layers.mask,shadow:renderer.shadowMap.enabled,xr:renderer.xr?.enabled};
   renderer.getClearColor(oldClear);renderer.getViewport(viewport);renderer.getScissor(scissor);const scissorTest=renderer.getScissorTest();
   const meshes=[];scene.traverse(o=>{if(o.isMesh||o.isLine||o.isPoints||o.isSprite){meshes.push([o,o.layers.mask,o.material]);o.layers.mask=0;}});
   const select=(root,material)=>{root?.traverse(o=>{if(o.isMesh){o.layers.set(31);if(material)o.material=material;}});};
   const clearSelection=()=>{for(const [o]of meshes)o.layers.mask=0;};
   try {
    renderer.autoClear=false;renderer.shadowMap.enabled=false;if(renderer.xr)renderer.xr.enabled=false;
    scene.background=null;scene.fog=null;camera.layers.set(31);renderer.setScissorTest(false);renderer.setClearColor(0x000000,0);
    for(const b of buildings)if(!b.dead)select(b.m??b.object??b);
    scene.overrideMaterial=buildingMaterial;renderer.setRenderTarget(buildingTarget);renderer.clear(true,true,true);renderer.render(scene,camera);
    clearSelection();scene.overrideMaterial=null;
    for(const actor of actors)select(actor.object,materialFor(actor.color));
    renderer.setRenderTarget(actorTarget);renderer.clear(true,true,true);renderer.render(scene,camera);
    renderer.setRenderTarget(saved.target);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);
    renderer.render(overlayScene,overlayCamera);
   } finally {
    for(const [o,mask,material]of meshes){o.layers.mask=mask;o.material=material;}
    camera.layers.mask=saved.cameraMask;scene.background=saved.background;scene.fog=saved.fog;scene.overrideMaterial=saved.override;
    renderer.autoClear=saved.autoClear;renderer.shadowMap.enabled=saved.shadow;if(renderer.xr)renderer.xr.enabled=saved.xr;
    renderer.setRenderTarget(saved.target);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);renderer.setClearColor(oldClear,saved.clearAlpha);
   }
  },
  dispose(){if(disposed)return;disposed=true;buildingTarget.depthTexture.dispose();actorTarget.depthTexture.dispose();buildingTarget.dispose();actorTarget.dispose();buildingMaterial.dispose();for(const m of actorMaterials.values())m.dispose();actorMaterials.clear();quad.geometry.dispose();compositeMaterial.dispose();}
 };
}
