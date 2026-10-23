import * as THREE from './vendor/three.module.js';
import { profiles } from './profiles.js';
import { SquishyPhysics, deformationGLSL as deformGLSL, MAX_CONTACTS } from './physics.js';
import { SquishAudio } from './audio.js';
import { addSurfaceShader } from './surface.js';
import { catalog as definitions, categories, matchingIndices } from './catalog.js';
import { buildShopModel } from './shop-models.js';

const $ = (s) => document.querySelector(s);
const clamp = THREE.MathUtils.clamp;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const collectionState={category:'all',query:''};
const formatNumber=index=>String(index+1).padStart(2,'0');
const state = {index:0,material:'foam',mode:'squeeze',softness:.75,bounce:.55,volume:.6,sound:true,held:false,pointerId:null,pressTime:0,yaw:.15,pitch:0,zoom:1,phase:0,count:0};
const physics = new SquishyPhysics(profiles.foam);
const deformation = {
  uContacts:{value:Array.from({length:MAX_CONTACTS},()=>new THREE.Vector3())},
  uNormals:{value:Array.from({length:MAX_CONTACTS},()=>new THREE.Vector3(0,0,1))},
  uDrags:{value:Array.from({length:MAX_CONTACTS},()=>new THREE.Vector3())},
  uDepths:{value:new Float32Array(MAX_CONTACTS)}, uRadius:{value:profiles.foam.radius},uBulge:{value:profiles.foam.bulge},
};
function syncDeformation(){
  deformation.uRadius.value=physics.profile.radius;deformation.uBulge.value=physics.profile.bulge;
  for(let i=0;i<MAX_CONTACTS;i++){
    const c=physics.contacts[i];deformation.uDepths.value[i]=c?.depth??0;
    if(c){deformation.uContacts.value[i].fromArray(c.point);deformation.uNormals.value[i].fromArray(c.normal);deformation.uDrags.value[i].fromArray(c.drag);}
  }
}

function attachDeform(material, normals=true) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, deformation);
    if(normals)addSurfaceShader(shader,material);
    shader.vertexShader = deformGLSL + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = squishy(position);');
    if (normals) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      vec3 referenceNormal = normalize(normal);
      vec3 tangentA = normalize(cross(abs(referenceNormal.y) > 0.9 ? vec3(1.0,0.0,0.0) : vec3(0.0,1.0,0.0), referenceNormal));
      vec3 tangentB = cross(referenceNormal, tangentA);
      vec3 anchor = squishy(position);
      vec3 objectNormal = normalize(cross(squishy(position + tangentA * 0.003) - anchor, squishy(position + tangentB * 0.003) - anchor));
      #ifdef USE_TANGENT
        vec3 objectTangent = vec3(tangent.xyz);
      #endif
    `);
  };
  material.customProgramCacheKey = () => normals ? 'squishy-normal-v3' : 'squishy-depth-v3';
  return material;
}

let renderer, scene, camera, root, models=[], floor, thumbRenderer;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const stage = $('#stage');
let frame=0, lastTime=0, toastTimer, bubbleTimer, releaseTimer;

const audio = new SquishAudio(()=>state,()=>profiles[state.material],()=>showToast('Chưa tải được âm thanh. Bạn thử tải lại trang nhé.'));

function material(color,roughness=.64,profile=null) {
  const mat=new THREE.MeshPhysicalMaterial({color,roughness,metalness:0,clearcoat:profile?.coat??.05,clearcoatRoughness:.4,sheen:profile?.audio==='foam'?.15:.05,sheenRoughness:.8,sheenColor:'#fff4df'});
  mat.userData.grain=profile?.grain??0;
  return attachDeform(mat);
}

const depthMaterial=attachDeform(new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking}),false);
function addPart(group,geometry,mat,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0],primary=false) {
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale));
  geometry.applyMatrix4(matrix);
  const mesh=new THREE.Mesh(geometry,mat); mesh.castShadow=true; mesh.receiveShadow=true; mesh.customDepthMaterial=depthMaterial; mesh.userData.primary=primary;
  group.add(mesh); return mesh;
}
function sphere(group,mat,pos,scale,rot=[0,0,0],primary=false,segments=40) { return addPart(group,new THREE.SphereGeometry(1,segments,28),mat,pos,scale,rot,primary); }
function curve(group,mat,points,radius=.018) {
  const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return addPart(group,new THREE.TubeGeometry(path,24,radius,8,false),mat);
}
function eye(group,mat,x,y,z,size=.067) { sphere(group,mat,[x,y,z],[size,size*1.25,size*.52],[0,0,0],false,24); }
function blush(group,mat,x,y,z) { sphere(group,mat,[x,y,z],[.14,.065,.029],[0,x>0?.25:-.25,0],false,24); }
function smile(group,mat,y,z,width=.11) { curve(group,mat,[[-width,y+.035,z],[0,y-.025,z+.018],[width,y+.035,z]],.016); }

function makeModel(def) {
  const group=new THREE.Group();
  const body=material(def.color,profiles[def.material].roughness,profiles[def.material]), dark=material('#4c3b32',.72), pink=material('#e99691',.8), cream=material('#fff0d2',.8);
  group.userData.body=body;
  const type=def.type;
  if(type==='cat') {
    sphere(group,body,[0,.02,0],[1.02,.89,.79],[0,0,0],true,64);
    // Soft tapered ears, built from ellipsoids instead of sharp triangles.
    sphere(group,body,[-.67,.78,-.02],[.32,.48,.31],[0,0,.26],true);
    sphere(group,body,[.67,.78,-.02],[.32,.48,.31],[0,0,-.26],true);
    sphere(group,pink,[-.68,.86,.22],[.15,.24,.038],[0,-.15,.24]);
    sphere(group,pink,[.68,.86,.22],[.15,.24,.038],[0,.15,-.24]);
    sphere(group,body,[-.57,-.65,.46],[.35,.25,.39]);
    sphere(group,body,[.57,-.65,.46],[.35,.25,.39]);
    sphere(group,cream,[0,-.28,.729],[.62,.43,.105]);
    eye(group,dark,-.34,.14,.744); eye(group,dark,.34,.14,.744);
    blush(group,pink,-.52,-.02,.679); blush(group,pink,.52,-.02,.679);
    sphere(group,dark,[0,-.015,.831],[.053,.038,.029]);
    curve(group,dark,[[-.12,-.09,.836],[-.065,-.13,.846],[0,-.09,.855],[.065,-.13,.846],[.12,-.09,.836]],.015);
    const stripe=material('#d58c4e',.8);
    sphere(group,stripe,[0,.66,.475],[.053,.14,.019],[.4,0,0]);
    sphere(group,stripe,[-.16,.63,.492],[.043,.115,.019],[.4,0,-.18]);
    sphere(group,stripe,[.16,.63,.492],[.043,.115,.019],[.4,0,.18]);
    curve(group,body,[[.8,-.35,-.18],[1.07,-.34,-.3],[1.23,-.11,-.28],[1.18,.06,-.22]],.14);
    sphere(group,body,[1.18,.06,-.22],[.14,.14,.14]);
  } else if(type==='bunny') {
    sphere(group,body,[0,-.12,0],[.87,.84,.72],[0,0,0],true,64);
    sphere(group,body,[-.37,.96,-.03],[.23,.7,.23],[0,0,.13],true);
    sphere(group,body,[.37,.96,-.03],[.23,.7,.23],[0,0,-.13],true);
    sphere(group,pink,[-.38,1.02,.162],[.105,.43,.035],[0,0,.13]);
    sphere(group,pink,[.38,1.02,.162],[.105,.43,.035],[0,0,-.13]);
    sphere(group,body,[-.5,-.73,.35],[.29,.2,.32]); sphere(group,body,[.5,-.73,.35],[.29,.2,.32]);
    eye(group,dark,-.28,.01,.688,.055);eye(group,dark,.28,.01,.688,.055);
    blush(group,pink,-.45,-.14,.619);blush(group,pink,.45,-.14,.619);
    sphere(group,pink,[0,-.12,.734],[.057,.041,.025]);
    smile(group,dark,-.23,.725,.085);
    sphere(group,cream,[0,-.46,.66],[.33,.24,.06]);
    sphere(group,body,[.68,-.37,-.5],[.28,.28,.28]);
    group.scale.setScalar(.86); group.position.y=-.11;
  } else if(type==='frog') {
    sphere(group,body,[0,-.05,0],[1,.78,.75],[0,0,0],true,64);
    sphere(group,body,[-.52,.58,.05],[.37,.36,.35],[0,0,0],true);
    sphere(group,body,[.52,.58,.05],[.37,.36,.35],[0,0,0],true);
    const eyeCream=material('#fff4d8');
    sphere(group,eyeCream,[-.52,.61,.329],[.2,.21,.06]);sphere(group,eyeCream,[.52,.61,.329],[.2,.21,.06]);
    eye(group,dark,-.51,.62,.389,.075);eye(group,dark,.51,.62,.389,.075);
    sphere(group,cream,[0,-.35,.655],[.66,.35,.08]);
    blush(group,pink,-.65,.03,.581);blush(group,pink,.65,.03,.581);
    smile(group,dark,.06,.759,.24);
    sphere(group,body,[-.69,-.66,.42],[.35,.18,.4]);sphere(group,body,[.69,-.66,.42],[.35,.18,.4]);
    for(const x of [-.8,-.64,.64,.8]) curve(group,cream,[[x,-.65,.73],[x,-.69,.76]],.012);
  } else if(type==='ghost') {
    const geo=new THREE.SphereGeometry(1,64,44);
    const p=geo.attributes.position;
    for(let i=0;i<p.count;i++) {
      let x=p.getX(i), y=p.getY(i), z=p.getZ(i);
      const bottom=THREE.MathUtils.smoothstep(-y,.24,.9);
      const angle=Math.atan2(z,x);
      const spread=1+bottom*.2;
      p.setXYZ(i,x*.9*spread,y*.98+(Math.cos(angle*5)*.07*bottom),z*.7*spread);
    }
    geo.computeVertexNormals();addPart(group,geo,body,[0,.03,0],[1,1,1],[0,0,0],true);
    for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2;sphere(group,body,[Math.cos(a)*.58,-.72,Math.sin(a)*.4],[.29,.22,.28]);}
    sphere(group,body,[-.86,-.1,0],[.22,.37,.23],[0,0,-.55]);sphere(group,body,[.86,-.1,0],[.22,.37,.23],[0,0,.55]);
    eye(group,dark,-.29,.15,.663,.073);eye(group,dark,.29,.15,.663,.073);
    blush(group,pink,-.47,-.02,.604);blush(group,pink,.47,-.02,.604);
    sphere(group,dark,[0,-.13,.714],[.057,.073,.02]);
    sphere(group,cream,[-.31,.18,.702],[.02,.025,.015]);sphere(group,cream,[.27,.18,.702],[.02,.025,.015]);
  } else if(type==='peach') {
    sphere(group,body,[-.29,-.03,0],[.75,.87,.77],[0,0,-.12],true,56);
    sphere(group,body,[.29,-.03,0],[.75,.87,.77],[0,0,.12],true,56);
    const seam=material('#d9998d',.8);
    curve(group,seam,[[0,.73,.36],[0,.59,.59],[0,.43,.7],[0,.31,.72]],.008);
    eye(group,dark,-.31,.03,.761,.058);eye(group,dark,.31,.03,.761,.058);
    blush(group,pink,-.51,-.13,.72);blush(group,pink,.51,-.13,.72);
    smile(group,dark,-.18,.783,.105);
    const green=material('#889b5c'), stem=material('#96815a');
    curve(group,stem,[[0,.72,0],[.04,.98,.0],[.09,1.07,0]],.045);
    sphere(group,green,[.35,.95,.02],[.42,.13,.19],[0,0,.35]);
    curve(group,material('#b3bf86'),[[.07,.88,.17],[.32,.96,.17],[.62,1.05,.08]],.009);
  }
  if(!['cat','bunny','frog','ghost','peach'].includes(type))buildShopModel(type,group,{body,dark,pink,cream},{material,addPart,sphere,curve,eye,blush,smile});
  group.userData.pickMeshes=group.children.filter(mesh=>mesh.userData.primary).map(mesh=>{
    const proxy=new THREE.Mesh(mesh.geometry.clone(),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
    proxy.userData.rest=Float32Array.from(mesh.geometry.attributes.position.array);proxy.userData.original=mesh;proxy.matrixAutoUpdate=false;
    return proxy;
  });
  group.userData.definition=def;
  group.userData.bounds=new THREE.Box3().setFromObject(group);
  group.visible=false;
  return group;
}

function lightScene(target) {
  target.add(new THREE.HemisphereLight('#fffcf2','#b8ad8e',2.5));
  const key=new THREE.DirectionalLight('#fff7e8',3.1);key.position.set(-3,6,5);key.castShadow=true;
  key.shadow.mapSize.set(512,512);key.shadow.camera.left=-3;key.shadow.camera.right=3;key.shadow.camera.top=3;key.shadow.camera.bottom=-3;key.shadow.camera.near=.5;key.shadow.camera.far=18;key.shadow.normalBias=.025;key.shadow.bias=-.0002;key.shadow.radius=4;key.shadow.blurSamples=8;
  target.add(key);
  const fill=new THREE.DirectionalLight('#f9e7cf',.8);fill.position.set(4,1,-3);target.add(fill);
}

function shadowTexture() {
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'), gradient=ctx.createRadialGradient(64,64,4,64,64,64);
  gradient.addColorStop(0,'rgba(75,65,37,.24)');gradient.addColorStop(.45,'rgba(75,65,37,.13)');gradient.addColorStop(1,'rgba(75,65,37,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(canvas);
}

function init() {
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  } catch (error) {
    $('#loading').innerHTML='<span>Trình duyệt chưa bật WebGL.</span><span>Hãy bật tăng tốc phần cứng rồi tải lại nhé.</span>';
    $('#squeeze-button').disabled=true; return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.setClearColor(0x000000,0);
  stage.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden','true');
  scene=new THREE.Scene();lightScene(scene);
  camera=new THREE.OrthographicCamera(-2,2,1.6,-1.6,.1,40);
  camera.position.set(2.3,1.55,7);camera.lookAt(0,.2,0);
  root=new THREE.Group();scene.add(root);
  models=definitions.map(makeModel);models.forEach(m=>root.add(m));
  floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:'#756445',opacity:.1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.91;floor.receiveShadow=true;scene.add(floor);
  const contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.7),new THREE.MeshBasicMaterial({map:shadowTexture(),transparent:true,depthWrite:false,opacity:.75}));
  contactShadow.rotation.x=-Math.PI/2;contactShadow.position.y=-.905;scene.add(contactShadow);
  makeCards();
  selectModel(0,false);
  new ResizeObserver(resize).observe(stage);
  resize();
  $('#loading').remove();
  stage.dataset.mode=state.mode;
  bindEvents();
  requestAnimationFrame(animate);
}

function resize() {
  const {width,height}=stage.getBoundingClientRect();if(!width||!height)return;
  renderer.setSize(width,height,false);
  const aspect=width/height, half=1.52;
  camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
}

function makeCards() {
  const grid=$('#model-grid');
  // Render actual models into thumbnails: no stock imagery or flat substitutes.
  thumbRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  thumbRenderer.setSize(240,190);thumbRenderer.setPixelRatio(1);thumbRenderer.toneMapping=THREE.ACESFilmicToneMapping;thumbRenderer.toneMappingExposure=1.12;
  const thumbnailCamera=new THREE.OrthographicCamera(-1.72,1.72,1.36,-1.36,.1,40);thumbnailCamera.position.set(2.3,1.7,7);thumbnailCamera.lookAt(0,.2,0);
  root.rotation.y=.14;
  models.forEach((model,index)=>{
    model.visible=true;const bounds=model.userData.bounds;thumbnailCamera.lookAt(0,(bounds.min.y+bounds.max.y)/2,0);thumbRenderer.render(scene,thumbnailCamera);
    const url=thumbRenderer.domElement.toDataURL('image/png');model.visible=false;
    const button=document.createElement('button');button.className='model-card';button.dataset.index=String(index);button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`Chọn ${definitions[index].name}, ${definitions[index].tag}`);
    button.innerHTML=`<span class="card-index">${formatNumber(index)}</span><img src="${url}" alt="" width="120" height="95" draggable="false"><span class="model-info"><h3>${definitions[index].name}</h3><p>${definitions[index].tag}</p></span><span class="selected-dot">✓</span>`;
    button.addEventListener('click',()=>selectModel(index));grid.appendChild(button);
  });
  thumbRenderer.dispose();thumbRenderer.forceContextLoss();thumbRenderer=null;
  buildFilters();filterCollection();
  $('#catalog-count').textContent=definitions.length;$('#collection-count').textContent=`${definitions.length} mẫu mềm mại đang đợi`;
}

function buildFilters(){
  const container=$('#collection-filters');
  for(const category of categories){
    const button=document.createElement('button');button.type='button';button.dataset.category=category.id;
    button.textContent=`${category.label} · ${matchingIndices(category.id).length}`;
    button.addEventListener('click',()=>{collectionState.category=category.id;filterCollection();});container.appendChild(button);
  }
}

function filterCollection(){
  const indices=matchingIndices(collectionState.category,collectionState.query),shown=new Set(indices);
  document.querySelectorAll('.model-card').forEach(card=>{card.hidden=!shown.has(Number(card.dataset.index));});
  document.querySelectorAll('[data-category]').forEach(button=>{const selected=button.dataset.category===collectionState.category;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  $('#collection-results').textContent=indices.length===definitions.length?`${definitions.length} mẫu để bạn khám phá`:`${indices.length} / ${definitions.length} mẫu`;
  $('#collection-empty').hidden=indices.length!==0;$('#random-button').disabled=indices.length===0;
}

function selectModel(index,notify=true) {
  clearTimeout(releaseTimer);release();
  state.index=index;const def=definitions[index];
  models.forEach((model,i)=>model.visible=i===index);
  state.softness=def.softness/100;state.bounce=def.bounce/100;state.yaw=.15;state.pitch=0;state.zoom=1;
  setMaterial(def.material);
  models[index].userData.body.color.set(def.color);
  const bounds=models[index].userData.bounds;camera.lookAt(0,(bounds.min.y+bounds.max.y)/2,0);
  if(!matchingIndices(collectionState.category,collectionState.query).includes(index)){collectionState.category='all';collectionState.query='';$('#model-search').value='';filterCollection();}
  $('#object-name').textContent=def.name;$('#object-number').textContent=`NO. ${formatNumber(index)}`;$('#object-personality').textContent=def.note;
  for(const key of ['softness','bounce']) {$('#'+key).value=def[key];updateSlider(key);}
  document.querySelectorAll('.model-card').forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
  $('#swatches').innerHTML='';
  def.palette.forEach((color,i)=>{
    const button=document.createElement('button');button.className='swatch'+(i===0?' active':'');button.style.setProperty('--color',color);button.setAttribute('aria-label',`Màu ${['nguyên bản','hồng đào','dịu nhẹ','mộng mơ','nắng ấm'][i]}`);button.setAttribute('aria-pressed',String(i===0));
    button.addEventListener('click',()=>{
      models[index].userData.body.color.set(color);
      $('#swatches').querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    });$('#swatches').appendChild(button);
  });
  if(notify){state.phase=.8;audio.stop();}
}

function updateSlider(key) {
  const input=$('#'+key), value=Number(input.value);
  state[key]=value/100;$('#'+key+'-output').textContent=value+'%';
  const min=Number(input.min), max=Number(input.max);input.style.setProperty('--fill',((value-min)/(max-min))*100+'%');
  if(key==='volume')audio.setVolume();
}

function setMode(mode) {
  release();state.mode=mode;stage.dataset.mode=mode;
  document.querySelectorAll('[data-mode]').forEach(b=>{if(b.tagName==='BUTTON'){b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));}});
  $('#stage-hint').textContent=mode==='squeeze'?'Nhấn giữ để lún · Kéo để nắn · Thả để hồi hình':'Kéo để xoay mọi góc · Lăn chuột để thu phóng';
}

function setMaterial(key) {
  release();state.material=key;physics.reset(profiles[key]);audio.stop();syncDeformation();
  const body=models[state.index]?.userData.body;
  if(body){const p=profiles[key];body.roughness=p.roughness;body.clearcoat=p.coat;body.userData.grain=p.grain;body.needsUpdate=true;}
  $('#material').value=key;$('#material-description').textContent=profiles[key].description;
  $('#material-badge').textContent=profiles[key].label;
}

function hitTest(event) {
  const rect=stage.getBoundingClientRect();
  mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(mouse,camera);scene.updateMatrixWorld(true);
  const proxies=models[state.index].userData.pickMeshes;
  const out=[0,0,0];
  for(const proxy of proxies){
    proxy.matrix.copy(proxy.userData.original.matrixWorld);proxy.matrixWorld.copy(proxy.matrix);
    const rest=proxy.userData.rest,positions=proxy.geometry.attributes.position.array;
    for(let i=0;i<rest.length;i+=3){physics.deform(rest[i],rest[i+1],rest[i+2],out);positions[i]=out[0];positions[i+1]=out[1];positions[i+2]=out[2];}
    proxy.geometry.attributes.position.needsUpdate=true;proxy.geometry.computeBoundingSphere();proxy.geometry.computeBoundingBox();
  }
  const hit=raycaster.intersectObjects(proxies,false)[0];
  if(hit){
    const local=hit.object.worldToLocal(hit.point.clone()),pos=hit.object.geometry.attributes.position;
    const a=new THREE.Vector3().fromBufferAttribute(pos,hit.face.a),b=new THREE.Vector3().fromBufferAttribute(pos,hit.face.b),c=new THREE.Vector3().fromBufferAttribute(pos,hit.face.c);
    const weights=THREE.Triangle.getBarycoord(local,a,b,c,new THREE.Vector3());
    if(weights){
      const rest=hit.object.userData.original.geometry.attributes.position;
      const ra=new THREE.Vector3().fromBufferAttribute(rest,hit.face.a),rb=new THREE.Vector3().fromBufferAttribute(rest,hit.face.b),rc=new THREE.Vector3().fromBufferAttribute(rest,hit.face.c);
      hit.restPoint=ra.clone().multiplyScalar(weights.x).addScaledVector(rb,weights.y).addScaledVector(rc,weights.z);
      hit.restNormal=rb.clone().sub(ra).cross(rc.clone().sub(ra)).normalize();
    }
  }
  return hit;
}

async function press(hit=null) {
  if(state.held)return;
  state.held=true;state.pressTime=performance.now();state.count++;
  let point=definitions[state.index].pressPoint??[0,.12,.78],normal=[0,0,1];
  if(hit){point=(hit.restPoint??models[state.index].worldToLocal(hit.point.clone())).toArray();normal=(hit.restNormal??hit.face.normal).toArray();}
  physics.press(point,normal);
  clearTimeout(bubbleTimer);$('#squish-bubble').textContent=['squiiish!','mềm xỉu…','chậm thôi ♡','thêm chút nữa ♡'][state.count%4];$('#squish-bubble').classList.add('visible');
  await audio.start();
}

function release() {
  if(!state.held)return;
  state.held=false;physics.release();
  bubbleTimer=setTimeout(()=>$('#squish-bubble').classList.remove('visible'),450);
}

function demoSqueeze() {
  clearTimeout(releaseTimer);press();releaseTimer=setTimeout(release,620);
}

function showToast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2400);}

function bindEvents() {
  // Keep a long press on the toy/cards inside the playground interaction.
  for(const element of [$('.stage-wrap'),$('#model-grid')]){
    for(const type of ['contextmenu','selectstart','dragstart'])element.addEventListener(type,event=>event.preventDefault());
  }
  // iOS also uses touch defaults for its native image/text callout.
  stage.addEventListener('touchstart',event=>event.preventDefault(),{passive:false});
  let startX=0,startY=0,lastX=0,lastY=0,gesture='',anchor=null;
  const plane=new THREE.Plane(),world=new THREE.Vector3();
  stage.addEventListener('pointerdown',(event)=>{
    if(event.button!==0||state.pointerId!==null)return;
    event.preventDefault();
    clearTimeout(releaseTimer);stage.dataset.input='pointer';stage.focus({preventScroll:true});
    state.pointerId=event.pointerId;stage.setPointerCapture(event.pointerId);
    startX=lastX=event.clientX;startY=lastY=event.clientY;
    const hit=hitTest(event);gesture=state.mode==='squeeze'&&hit?'squeeze':'rotate';
    if(gesture==='squeeze'){
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),hit.point);
      anchor=models[state.index].worldToLocal(hit.point.clone());press(hit);
    }
  });
  stage.addEventListener('pointermove',(event)=>{
    if(event.pointerId!==state.pointerId)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;
    if(gesture==='rotate'){state.yaw+=dx*.009;state.pitch=clamp(state.pitch+dy*.006,-.65,.55);}
    else if(state.held&&physics.active){
      const rect=stage.getBoundingClientRect();mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);
      if(raycaster.ray.intersectPlane(plane,world)){
        const local=models[state.index].worldToLocal(world.clone()).sub(anchor);
        local.clampLength(0,profiles[state.material].audio==='foam'?.4:.8);
        physics.active.targetDrag=local.multiplyScalar(.8).toArray();
      }
      const down=(event.clientY-startY)/rect.height;
      physics.pressure=clamp(.5+down*1.8,.18,1);
      if(event.pointerType==='pen')physics.pressure=clamp(event.pressure,.1,1);
      physics.speed=Math.min(4,Math.hypot(dx,dy)*.07);
    }
    lastX=event.clientX;lastY=event.clientY;
  });
  function endPointer(event){if(event.pointerId===state.pointerId){release();state.pointerId=null;gesture='';anchor=null;}}
  stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);stage.addEventListener('lostpointercapture',endPointer);


  stage.addEventListener('wheel',(event)=>{event.preventDefault();state.zoom=clamp(state.zoom-event.deltaY*.001, .72,1.35);},{passive:false});
  document.querySelectorAll('button[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('#squeeze-button').addEventListener('click',demoSqueeze);
  $('#reset').addEventListener('click',()=>{clearTimeout(releaseTimer);release();state.yaw=.15;state.pitch=0;state.zoom=1;physics.reset();audio.stop();syncDeformation();showToast('Bạn nhỏ đã về tư thế ban đầu ♡');});
  $('#random-button').addEventListener('click',()=>{
    const visible=matchingIndices(collectionState.category,collectionState.query);const options=visible.filter(i=>i!==state.index);const pool=options.length?options:visible;
    if(!pool.length)return;const index=pool[Math.floor(Math.random()*pool.length)];selectModel(index);showToast(`Hôm nay có ${definitions[index].name} ở bên bạn ♡`);
  });
  $('#model-search').addEventListener('input',event=>{collectionState.query=event.target.value;filterCollection();});
  $('#clear-filters').addEventListener('click',()=>{collectionState.category='all';collectionState.query='';$('#model-search').value='';filterCollection();$('#model-search').focus();});
  $('#sound-toggle').addEventListener('click',()=>{
    state.sound=!state.sound;
    $('#sound-toggle').setAttribute('aria-pressed',String(state.sound));$('#sound-toggle span').textContent=state.sound?'Âm thanh bật':'Âm thanh tắt';$('#sound-toggle use').setAttribute('href',state.sound?'#i-sound':'#i-mute');
    if(state.sound)audio.start();audio.setVolume();
  });
  for(const key of ['softness','bounce','volume'])$('#'+key).addEventListener('input',()=>updateSlider(key));
  $('#material').addEventListener('change',event=>setMaterial(event.target.value));
  document.addEventListener('keydown',(event)=>{
    stage.dataset.input='keyboard';
    if(event.target.matches('input,textarea,select,button,a'))return;
    if(event.code==='Space'){event.preventDefault();if(!event.repeat)press();}
    else if(event.code==='ArrowLeft'){event.preventDefault();state.yaw-=.16;}
    else if(event.code==='ArrowRight'){event.preventDefault();state.yaw+=.16;}
    else if(event.key.toLowerCase()==='r')setMode('rotate');
    else if(event.key.toLowerCase()==='b')setMode('squeeze');
    else if(/^[1-9]$/.test(event.key))selectModel(Number(event.key)-1);
  });
  document.addEventListener('keyup',event=>{if(event.code==='Space')release();});
  window.addEventListener('blur',()=>{release();state.pointerId=null;audio.stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();audio.stop();lastTime=0;}});
  renderer.domElement.addEventListener('webglcontextlost',(event)=>{event.preventDefault();showToast('Kết nối 3D bị gián đoạn. Bạn tải lại trang giúp nhé.');});
}

function animate(time) {
  requestAnimationFrame(animate);
  if(document.hidden)return;
  const dt=Math.min((time-lastTime)/1000 || .016,.033);lastTime=time;frame++;
  physics.softness=state.softness;physics.rebound=state.bounce;
  const motion=physics.update(dt);syncDeformation();
  audio.update(motion,state.held,physics.active?.point[0]??0);
  const depth=physics.depth;
  $('#recovery-status').textContent=state.held?'Đang bóp':depth>.012?'Đang hồi hình…':'Sẵn sàng để bóp';
  $('#recovery-fill').style.width=Math.min(100,depth/.8*100)+'%';
  stage.dataset.deformation=depth.toFixed(4);


  if(state.phase>0)state.phase=Math.max(0,state.phase-dt*2);
  root.rotation.y=THREE.MathUtils.damp(root.rotation.y,state.yaw,12,dt);
  root.rotation.x=THREE.MathUtils.damp(root.rotation.x,state.pitch,12,dt);
  const entry=1-Math.sin(state.phase*Math.PI)*.055;
  const scale=state.zoom*entry;root.scale.setScalar(THREE.MathUtils.damp(root.scale.x,scale,12,dt));
  renderer.render(scene,camera);
}

export function getDiagnostics(){return {index:state.index,name:definitions[state.index].name,modelCount:definitions.length,pickMeshCount:models[state.index]?.userData.pickMeshes.length??0,material:state.material,held:state.held,depth:physics.depth,contacts:physics.contacts.length,audio:{...audio.stats},render:renderer?{...renderer.info.render}:null};}
init();
