import * as THREE from './vendor/three.module.js';

const $ = (s) => document.querySelector(s);
const clamp = THREE.MathUtils.clamp;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const definitions = [
  { name:'Mèo quýt', tag:'Mềm như mochi', note:'Một cục nắng nhỏ, mềm như mochi.', color:'#efad65', palette:['#efad65','#e7b3ad','#c0c99b','#b8afd5','#f0d995'], softness:75, bounce:60, type:'cat', pitch:180 },
  { name:'Thỏ mây', tag:'Xốp như kẹo bông', note:'Tai dài, má hồng, ôm hết muộn phiền.', color:'#f2dfd8', palette:['#f2dfd8','#e9b9c4','#cbbfe0','#e9d49a','#b9d7ce'], softness:90, bounce:40, type:'bunny', pitch:290 },
  { name:'Ếch matcha', tag:'Nảy tưng, vui tưng', note:'Một ngụm matcha, một ngày thật xanh.', color:'#aebd83', palette:['#aebd83','#c6d89a','#e9d794','#9bc8b6','#b7b4d7'], softness:65, bounce:85, type:'frog', pitch:125 },
  { name:'Ma khoai môn', tag:'Dẻo ơi là dẻo', note:'Không hù ai đâu. Chỉ muốn được bóp thôi.', color:'#beb0d7', palette:['#beb0d7','#e2b8c8','#bdd7cc','#e8d498','#b3c5de'], softness:85, bounce:45, type:'ghost', pitch:220 },
  { name:'Đào mochi', tag:'Mọng mềm, ngọt ngào', note:'Một chiếc đào nhỏ, ngọt ngào vừa đủ.', color:'#eeb2a6', palette:['#eeb2a6','#efc092','#e4b9d0','#e2ce94','#becd9d'], softness:80, bounce:55, type:'peach', pitch:245 },
];

const state = { index:0, mode:'squeeze', softness:.75, bounce:.6, volume:.6, sound:true, held:false, pointerId:null, amount:0, velocity:0, pressTime:0, yaw:.15, pitch:0, zoom:1, phase:0, count:0 };
const deformation = {
  uSquish:{value:0}, uContact:{value:new THREE.Vector3(0,.1,.8)},
  uDirection:{value:new THREE.Vector3(0,0,1)}, uTime:{value:0}, uWobble:{value:0},
};

// Every component shares a deformation field in model coordinates. This keeps
// cheeks, eyes and appendages attached while the surface compresses and bulges.
const deformGLSL = `
uniform float uSquish;
uniform vec3 uContact;
uniform vec3 uDirection;
uniform float uTime;
uniform float uWobble;
vec3 squishy(vec3 p) {
  float s = uSquish;
  vec3 q = p;
  float width = 1.0 + s * 0.23;
  q.x *= width;
  q.z *= 1.0 + s * 0.14;
  q.y = -0.86 + (p.y + 0.86) * (1.0 - s * 0.32);
  vec3 delta = p - uContact;
  float falloff = exp(-dot(delta, delta) * 3.8);
  q -= uDirection * s * 0.57 * falloff;
  float ring = exp(-pow(length(delta) - 0.68, 2.0) * 15.0);
  q += normalize(delta + vec3(0.0001)) * ring * s * 0.055;
  q.x += sin(p.y * 3.4 + uTime * 15.0) * uWobble * (p.y + 0.9) * 0.035;
  return q;
}
`;
function attachDeform(material, normals=true) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, deformation);
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
  material.customProgramCacheKey = () => normals ? 'squishy-normal-v2' : 'squishy-depth-v2';
  return material;
}

let renderer, scene, camera, root, models=[], floor, thumbRenderer;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const stage = $('#stage');
let frame=0, lastTime=0, lastAudioTime=0, toastTimer, bubbleTimer, releaseTimer;

class SquishAudio {
  constructor() { this.context=null; this.noise=null; this.master=null; this.grainTimer=0; }
  async start() {
    if (!state.sound) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!this.context) {
      this.context = new AudioContext();
      const ctx=this.context;
      this.master=ctx.createGain(); this.master.gain.value=state.volume*.58;
      const compressor=ctx.createDynamicsCompressor();
      compressor.threshold.value=-18; compressor.ratio.value=5;
      this.master.connect(compressor); compressor.connect(ctx.destination);
      this.noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
      const channel=this.noise.getChannelData(0);
      let brown=0;
      for(let i=0;i<channel.length;i++) { brown=(brown+Math.random()*.12-.06)/1.025; channel[i]=brown*3.5; }
    }
    if (this.context.state==='suspended') await this.context.resume();
  }
  setVolume() { if(this.master) this.master.gain.setTargetAtTime(state.sound ? state.volume*.58 : 0,this.context.currentTime,.04); }
  noiseBurst(duration,frequency,level,delay=0) {
    const ctx=this.context, at=ctx.currentTime+delay;
    const source=ctx.createBufferSource(); source.buffer=this.noise;
    const filter=ctx.createBiquadFilter(); filter.type='bandpass'; filter.frequency.setValueAtTime(frequency,at); filter.frequency.exponentialRampToValueAtTime(Math.max(90,frequency*.35),at+duration); filter.Q.value=.8;
    const envelope=ctx.createGain(); envelope.gain.setValueAtTime(.0001,at); envelope.gain.exponentialRampToValueAtTime(Math.max(.001,level),at+.025); envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(this.master);
    source.start(at,Math.random()*.7); source.stop(at+duration+.03);
  }
  tone(from,to,duration,level,delay=0) {
    const ctx=this.context, at=ctx.currentTime+delay;
    const osc=ctx.createOscillator(), envelope=ctx.createGain();
    osc.type='sine'; osc.frequency.setValueAtTime(from,at); osc.frequency.exponentialRampToValueAtTime(to,at+duration);
    envelope.gain.setValueAtTime(.0001,at); envelope.gain.exponentialRampToValueAtTime(Math.max(.001,level),at+.013); envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(envelope); envelope.connect(this.master); osc.start(at); osc.stop(at+duration+.01);
  }
  press(power=.7) {
    if(!this.context || !state.sound) return;
    const p=definitions[state.index].pitch*(.93+Math.random()*.14);
    this.noiseBurst(.28+state.softness*.22,p*3.6,.45*power);
    this.tone(p*1.5,p*.42,.22,.14*power);
    if(state.index===2) this.tone(p*2,p*.7,.12,.07,.045);
    if(state.index===1) this.noiseBurst(.35,1800,.18,.04);
    if(state.index===3) this.tone(p*.6,p*.28,.4,.12);
  }
  release(power) {
    if(!this.context || !state.sound || power<.04) return;
    const p=definitions[state.index].pitch;
    this.tone(p*.6,p*(1.6+state.bounce*.8),.17,.15*power);
    this.noiseBurst(.17,p*5,.33*power);
    this.tone(p*2.1,p*1.1,.15,.07*power,.085);
  }
  rub(speed) {
    if(!this.context || !state.sound) return;
    const now=this.context.currentTime;
    if(now-lastAudioTime<.09) return;
    lastAudioTime=now;
    this.noiseBurst(.13,definitions[state.index].pitch*5,Math.min(.25,speed*.02));
  }
}
const audio = new SquishAudio();

function material(color,roughness=.64) {
  return attachDeform(new THREE.MeshPhysicalMaterial({color,roughness,metalness:0,clearcoat:.12,clearcoatRoughness:.58,sheen:.45,sheenRoughness:.8,sheenColor:'#fff4df'}));
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
  const body=material(def.color), dark=material('#4c3b32',.72), pink=material('#e99691',.8), cream=material('#fff0d2',.8);
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
  group.userData.definition=def;
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
    model.visible=true; thumbRenderer.render(scene,thumbnailCamera);
    const url=thumbRenderer.domElement.toDataURL('image/png');model.visible=false;
    const button=document.createElement('button');button.className='model-card';button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',`Chọn ${definitions[index].name}, ${definitions[index].tag}`);
    button.innerHTML=`<span class="card-index">0${index+1}</span><img src="${url}" alt="" width="120" height="95"><span class="model-info"><h3>${definitions[index].name}</h3><p>${definitions[index].tag}</p></span><span class="selected-dot">✓</span>`;
    button.addEventListener('click',()=>selectModel(index));grid.appendChild(button);
  });
  thumbRenderer.dispose();thumbRenderer.forceContextLoss();thumbRenderer=null;
}

function selectModel(index,notify=true) {
  clearTimeout(releaseTimer);release();
  state.index=index;const def=definitions[index];
  models.forEach((model,i)=>model.visible=i===index);
  state.softness=def.softness/100;state.bounce=def.bounce/100;state.yaw=.15;state.pitch=0;state.zoom=1;state.amount=0;state.velocity=0;
  deformation.uSquish.value=0;deformation.uContact.value.set(0,.1,.8);deformation.uDirection.value.set(0,0,1);
  models[index].userData.body.color.set(def.color);
  $('#object-name').textContent=def.name;$('#object-number').textContent=`NO. 0${index+1}`;$('#object-personality').textContent=def.note;
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
  if(notify){state.phase=.8;audio.start().then(()=>audio.tone && audio.context && state.sound && audio.tone(def.pitch,def.pitch*1.5,.12,.06));}
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
  $('#stage-hint').textContent=mode==='squeeze'?'Nhấn giữ để bóp · Thả tay để nảy lại':'Kéo để xoay mọi góc · Lăn chuột để thu phóng';
}

function hitTest(event) {
  const rect=stage.getBoundingClientRect();
  mouse.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(mouse,camera);
  return raycaster.intersectObjects(models[state.index].children,false)[0];
}

function setContact(hit) {
  if(!hit) return;
  const point=root.worldToLocal(hit.point.clone());
  // Child geometry is baked; model-only scale/translation is applied here.
  const model=models[state.index];
  point.sub(model.position).divide(model.scale);
  deformation.uContact.value.copy(point);
  const normal=hit.face.normal.clone();
  deformation.uDirection.value.copy(normal).normalize();
}

async function press(hit=null) {
  if(state.held)return;
  state.held=true;state.pressTime=performance.now();state.count++;
  if(hit)setContact(hit);else{deformation.uContact.value.set(0,.15,.78);deformation.uDirection.value.set(0,0,1);}
  clearTimeout(bubbleTimer);$('#squish-bubble').textContent=['squiiish!','mềm xỉu…','boop!','thêm chút nữa ♡'][state.count%4];$('#squish-bubble').classList.add('visible');
  await audio.start();if(state.held)audio.press(.7+state.softness*.3);
}

function release() {
  if(!state.held)return;
  state.held=false;audio.release(Math.max(.2,state.amount));
  bubbleTimer=setTimeout(()=>$('#squish-bubble').classList.remove('visible'),450);
}

function demoSqueeze() {
  clearTimeout(releaseTimer);press();releaseTimer=setTimeout(release,620);
}

function showToast(message) {clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2400);}

function bindEvents() {
  let startX=0,startY=0,lastX=0,lastY=0,gesture='';
  stage.addEventListener('pointerdown',(event)=>{
    if(event.button!==0)return;
    clearTimeout(releaseTimer);
    stage.focus({preventScroll:true});
    state.pointerId=event.pointerId;stage.setPointerCapture(event.pointerId);
    startX=lastX=event.clientX;startY=lastY=event.clientY;
    const hit=hitTest(event);
    gesture=state.mode==='squeeze'&&hit?'squeeze':'rotate';
    if(gesture==='squeeze')press(hit);
  });
  stage.addEventListener('pointermove',(event)=>{
    if(event.pointerId!==state.pointerId)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;
    if(gesture==='rotate'){state.yaw+=dx*.009;state.pitch=clamp(state.pitch+dy*.006,-.65,.55);}
    else if(state.held){const hit=hitTest(event);if(hit)setContact(hit);audio.rub(Math.hypot(dx,dy));}
    lastX=event.clientX;lastY=event.clientY;
  });
  function endPointer(event){if(event.pointerId===state.pointerId){release();state.pointerId=null;gesture='';}}
  stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);stage.addEventListener('lostpointercapture',endPointer);
  stage.addEventListener('wheel',(event)=>{event.preventDefault();state.zoom=clamp(state.zoom-event.deltaY*.001, .72,1.35);},{passive:false});
  document.querySelectorAll('button[data-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  $('#squeeze-button').addEventListener('click',demoSqueeze);
  $('#reset').addEventListener('click',()=>{clearTimeout(releaseTimer);release();state.yaw=.15;state.pitch=0;state.zoom=1;state.amount=0;state.velocity=0;showToast('Bạn nhỏ đã về tư thế ban đầu ♡');});
  $('#random-button').addEventListener('click',()=>{let index=(state.index+1+Math.floor(Math.random()*4))%5;selectModel(index);showToast(`Hôm nay có ${definitions[index].name} ở bên bạn ♡`);});
  $('#sound-toggle').addEventListener('click',()=>{
    state.sound=!state.sound;
    $('#sound-toggle').setAttribute('aria-pressed',String(state.sound));$('#sound-toggle span').textContent=state.sound?'Âm thanh bật':'Âm thanh tắt';$('#sound-toggle use').setAttribute('href',state.sound?'#i-sound':'#i-mute');
    if(state.sound)audio.start();audio.setVolume();
  });
  for(const key of ['softness','bounce','volume'])$('#'+key).addEventListener('input',()=>updateSlider(key));
  document.addEventListener('keydown',(event)=>{
    if(event.target.matches('input,textarea,select,button,a'))return;
    if(event.code==='Space'){event.preventDefault();if(!event.repeat)press();}
    else if(event.code==='ArrowLeft'){event.preventDefault();state.yaw-=.16;}
    else if(event.code==='ArrowRight'){event.preventDefault();state.yaw+=.16;}
    else if(event.key.toLowerCase()==='r')setMode('rotate');
    else if(event.key.toLowerCase()==='b')setMode('squeeze');
    else if(/^[1-5]$/.test(event.key))selectModel(Number(event.key)-1);
  });
  document.addEventListener('keyup',event=>{if(event.code==='Space')release();});
  window.addEventListener('blur',()=>{release();state.pointerId=null;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){release();lastTime=0;}});
  renderer.domElement.addEventListener('webglcontextlost',(event)=>{event.preventDefault();showToast('Kết nối 3D bị gián đoạn. Bạn tải lại trang giúp nhé.');});
}

function animate(time) {
  requestAnimationFrame(animate);
  if(document.hidden)return;
  const dt=Math.min((time-lastTime)/1000 || .016,.033);lastTime=time;frame++;
  const heldDuration=state.held?(time-state.pressTime)/1000:0;
  const target=state.held?(.25+state.softness*.57)*Math.min(1,heldDuration*5+.35):0;
  // Damped spring integrated with fixed small substeps for stable recovery.
  const stiffness=state.held?135:35+state.bounce*155;
  const damping=state.held?20:15-state.bounce*8;
  const step=dt/3;
  for(let i=0;i<3;i++){
    state.velocity+=((target-state.amount)*stiffness-state.velocity*damping)*step;
    state.amount+=state.velocity*step;
  }
  state.amount=clamp(state.amount,-.2,1);
  deformation.uSquish.value=state.amount;
  deformation.uTime.value=time/1000;
  deformation.uWobble.value=reducedMotion?0:Math.min(.6,Math.abs(state.velocity)*.15);
  if(state.phase>0)state.phase=Math.max(0,state.phase-dt*2);
  root.rotation.y=THREE.MathUtils.damp(root.rotation.y,state.yaw,12,dt);
  root.rotation.x=THREE.MathUtils.damp(root.rotation.x,state.pitch,12,dt);
  const entry=1-Math.sin(state.phase*Math.PI)*.055;
  const scale=state.zoom*entry;root.scale.setScalar(THREE.MathUtils.damp(root.scale.x,scale,12,dt));
  renderer.render(scene,camera);
}

init();
