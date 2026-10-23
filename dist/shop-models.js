import * as THREE from './vendor/three.module.js';

export function buildShopModel(type,group,{body,dark,pink,cream},{material,addPart,sphere,curve,eye,blush,smile}){
  const box=(mat,pos,size,radius=.18,primary=false,rotation=[0,0,0])=>{
    const g=new THREE.BoxGeometry(...size,20,20,12),p=g.attributes.position,n=g.attributes.normal;
    const half=new THREE.Vector3(...size).multiplyScalar(.5),r=Math.min(radius,half.x,half.y,half.z);
    const v=new THREE.Vector3(),q=new THREE.Vector3(),dir=new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);q.set(THREE.MathUtils.clamp(v.x,-half.x+r,half.x-r),THREE.MathUtils.clamp(v.y,-half.y+r,half.y-r),THREE.MathUtils.clamp(v.z,-half.z+r,half.z-r));
      dir.copy(v).sub(q).normalize();v.copy(q).addScaledVector(dir,r);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,dir.x,dir.y,dir.z);
    }
    return addPart(group,g,mat,pos,[1,1,1],rotation,primary);
  };
  const face=(y,z,spread=.25)=>{eye(group,dark,-spread,y,z,.052);eye(group,dark,spread,y,z,.052);smile(group,dark,y-.15,z+.025,.085);blush(group,pink,-spread-.14,y-.11,z-.025);blush(group,pink,spread+.14,y-.11,z-.025);};
  const tiny=(mat,pos,scale,rot=[0,0,0])=>addPart(group,new THREE.SphereGeometry(1,12,8),mat,pos,scale,rot);
  const golden=material('#c58d51',.86),green=material('#91a56c',.74),seaweed=material('#4c6044',.82);

  // Beveled shapes, with subdivided faces so local dents have sufficient vertices.
  const shapeMesh=(shape,mat,depth=.6,z=0,primary=true)=>{
    const source=new THREE.ExtrudeGeometry(shape,{depth,steps:2,bevelEnabled:true,bevelSize:.07,bevelThickness:.07,bevelSegments:4,curveSegments:24});
    let positions=source.attributes.position.array,normals=source.attributes.normal.array;
    for(let level=0;level<3;level++){
      const pp=[],nn=[];
      for(let i=0;i<positions.length;i+=9){
        const a=Array.from(positions.slice(i,i+3)),b=Array.from(positions.slice(i+3,i+6)),c=Array.from(positions.slice(i+6,i+9));
        const na=Array.from(normals.slice(i,i+3)),nb=Array.from(normals.slice(i+3,i+6)),nc=Array.from(normals.slice(i+6,i+9));
        const mid=(a,b)=>a.map((v,k)=>(v+b[k])/2),ab=mid(a,b),bc=mid(b,c),ca=mid(c,a),nab=mid(na,nb),nbc=mid(nb,nc),nca=mid(nc,na);
        // Only broad front/back faces need extra subdivisions; bevels already have density.
        const broad=Math.max(Math.hypot(...a.map((v,k)=>v-b[k])),Math.hypot(...b.map((v,k)=>v-c[k])),Math.hypot(...c.map((v,k)=>v-a[k])))>.24;
        const triangles=broad?[[a,ab,ca,na,nab,nca],[ab,b,bc,nab,nb,nbc],[ca,bc,c,nca,nbc,nc],[ab,bc,ca,nab,nbc,nca]]:[[a,b,c,na,nb,nc]];
        for(const t of triangles){pp.push(...t[0],...t[1],...t[2]);nn.push(...t[3],...t[4],...t[5]);}
      }
      positions=new Float32Array(pp);normals=new Float32Array(nn);
    }
    source.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));g.translate(0,0,-depth/2);
    return addPart(group,g,mat,[0,0,z],[1,1,1],[0,0,0],primary);
  };

  if(type==='toast'){
    box(golden,[0,-.15,0],[1.6,1.45,.66],.22,true);
    sphere(group,golden,[-.36,.48,0],[.5,.38,.33],[0,0,0],true,32);sphere(group,golden,[.36,.48,0],[.5,.38,.33],[0,0,0],true,32);
    box(body,[0,-.1,.3],[1.34,1.25,.18],.2);
    sphere(group,body,[-.3,.48,.31],[.4,.26,.1],[0,0,0],false,28);sphere(group,body,[.3,.48,.31],[.4,.26,.1],[0,0,0],false,28);
    face(-.04,.407);
  }else if(type==='croissant'){
    for(let i=-3;i<=3;i++){
      const a=i*.36,edge=Math.abs(i)/3;
      sphere(group,body,[Math.sin(a)*1.02,.09+Math.cos(a)*.25,0],[.32-edge*.13,.46-edge*.19,.43-edge*.16],[0,0,-a*.72],true,32);
      if(Math.abs(i)<3)curve(group,golden,[[Math.sin(a)*1.02-.15,.21+Math.cos(a)*.25,.28],[Math.sin(a)*1.02,.32+Math.cos(a)*.25,.4],[Math.sin(a)*1.02+.13,.18+Math.cos(a)*.25,.28]],.012);
    }
    face(.28,.437,.18);group.position.y=-.73;
  }else if(type==='bao'){
    sphere(group,body,[0,-.16,0],[.93,.74,.83],[0,0,0],true,56);
    sphere(group,body,[0,.53,0],[.18,.15,.18],[0,0,0],true,24);
    const crease=material('#daccb4',.92);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;curve(group,crease,[[Math.sin(a)*.12,.59,Math.cos(a)*.12],[Math.sin(a)*.3,.52,Math.cos(a)*.3],[Math.sin(a)*.52,.4,Math.cos(a)*.52]],.012);}
    face(-.19,.825);
  }else if(type==='donut'){
    addPart(group,new THREE.TorusGeometry(.63,.28,28,80),golden,[0,0,0],[1,1,1],[0,0,0],true);
    addPart(group,new THREE.TorusGeometry(.63,.235,24,80),body,[0,0,.105]);
    const colors=['#f4e6ac','#b2c9b4','#baabd5','#f7e9e1'].map(c=>material(c));
    for(let i=0;i<34;i++){const a=i*2.39996,r=.62+Math.sin(i*7.13)*.14,x=Math.cos(a)*r,y=Math.sin(a)*r;if(y<-.35)continue;tiny(colors[i%4],[x,y,.33],[.05,.017,.02],[0,0,i*1.73]);}
    face(-.57,.343,.17);
  }else if(type==='strawberry'){
    const g=new THREE.SphereGeometry(1,56,36),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const y=p.getY(i),width=.73+.23*y;p.setXYZ(i,p.getX(i)*width,p.getY(i)*.87-.03,p.getZ(i)*width*.85);}
    g.computeVertexNormals();addPart(group,g,body,[0,0,0],[1,1,1],[0,0,0],true);
    for(let row=0;row<6;row++){
      const phi=.48+row*.38,yp=Math.cos(phi),r=Math.sin(phi)*(.73+.23*yp),count=8+Math.round(Math.sin(phi)*5);
      for(let j=0;j<count;j++){const a=j*Math.PI*2/count+row*.24,x=Math.sin(a)*r,y=yp*.87-.03,z=Math.cos(a)*r*.85;if(z>.3&&Math.abs(x)<.43&&y>-.35&&y<.2)continue;const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(x,y*.7,z/ .72).normalize());const e=new THREE.Euler().setFromQuaternion(q);tiny(cream,[x*1.01,y,z*1.02],[.024,.042,.012],e.toArray().slice(0,3));}
    }
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;sphere(group,green,[Math.sin(a)*.2,.8,Math.cos(a)*.17],[.17,.06,.34],[.1,a,.1],false,20);}
    sphere(group,green,[0,.94,0],[.055,.16,.055],[0,0,-.15],false,16);face(-.06,.622,.2);
  }else if(type==='watermelon'){
    const shape=new THREE.Shape();shape.moveTo(-1,.3);shape.lineTo(1,.3);shape.absarc(0,.3,1,0,-Math.PI,true);shape.closePath();
    shapeMesh(shape,green,.58);
    const white=shapeMesh(shape,cream,.59,.025,false);white.geometry.scale(.91,.91,1);
    const flesh=shapeMesh(shape,body,.6,.06,false);flesh.geometry.scale(.82,.82,1);
    for(const [x,y] of [[-.49,.05],[.48,.05],[-.62,-.21],[.62,-.21],[-.31,-.43],[.3,-.43],[0,-.52]])tiny(dark,[x,y,.438],[.03,.057,.013],[0,0,x*.7]);
    face(-.05,.438,.2);group.position.y=-.11;
  }else if(type==='milk'){
    box(body,[0,-.19,0],[1.3,1.42,.96],.12,true);
    const roof=new THREE.Shape();roof.moveTo(-.45,.5);roof.lineTo(.45,.5);roof.lineTo(0,.91);roof.closePath();
    const foldedTop=shapeMesh(roof,cream,1.17);foldedTop.geometry.rotateY(Math.PI/2);
    box(cream,[0,.95,0],[1.21,.14,.13],.045);
    box(cream,[0,-.23,.482],[1.06,.76,.045],.12);
    // Small strawberry seal, without commercial labels or logos.
    sphere(group,pink,[0,.26,.487],[.11,.14,.03],[0,0,0],false,20);sphere(group,green,[0,.39,.49],[.09,.025,.025],[0,0,0],false,16);
    face(-.16,.517,.22);
  }else if(type==='icecream'){
    const cone=new THREE.CylinderGeometry(.49,.1,1.1,48,16);addPart(group,cone,golden,[0,-.35,0],[1,1,1],[0,0,0],true);
    for(let i=0;i<5;i++){const y=-.75+i*.18,r=.14+i*.061;addPart(group,new THREE.TorusGeometry(r,.013,6,40),cream,[0,y,0],[1,1,1],[Math.PI/2,0,0]);}
    sphere(group,body,[0,.5,0],[.73,.66,.65],[0,0,0],true,48);
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;sphere(group,body,[Math.sin(a)*.51,.18,Math.cos(a)*.44],[.24,.17,.23],[0,0,0],false,20);}
    face(.51,.633,.22);
  }else if(type==='pancake'){
    for(let i=0;i<3;i++){
      sphere(group,body,[0,-.69+i*.3,0],[.99,.2,.75],[0,0,0],true,40);
      curve(group,cream,[[-.84,-.61+i*.3,.27],[-.44,-.56+i*.3,.63],[0,-.55+i*.3,.71],[.44,-.56+i*.3,.63],[.84,-.61+i*.3,.27]],.028);
    }
    const syrup=material('#b97b45',.34);sphere(group,syrup,[0,-.045,.025],[.7,.08,.51],[0,0,0],false,36);
    box(material('#f3d98b'),[.05,.075,.05],[.43,.15,.35],.045,false,[0,.25,0]);
    face(-.38,.748,.25);
  }else if(type==='paw'){
    sphere(group,body,[0,-.29,0],[.79,.61,.49],[0,0,0],true,48);
    for(const [x,y,r] of [[-.65,.2,.29],[-.23,.5,.31],[.23,.5,.31],[.65,.2,.29]]){sphere(group,body,[x,y,0],[r,r*1.1,.37],[0,0,-x*.3],true,28);sphere(group,pink,[x,y,.327],[r*.57,r*.62,.075],[0,0,-x*.3],false,24);}
    const pad=material('#dca0ad',.65);sphere(group,pad,[0,-.31,.46],[.46,.32,.09],[0,0,0],false,36);
    sphere(group,pad,[-.19,-.11,.46],[.25,.22,.08],[0,0,0],false,24);sphere(group,pad,[.19,-.11,.46],[.25,.22,.08],[0,0,0],false,24);
  }else if(type==='onigiri'){
    const shape=new THREE.Shape();shape.moveTo(-.7,-.77);shape.quadraticCurveTo(-1,-.77,-.83,-.4);shape.lineTo(-.22,.69);shape.quadraticCurveTo(0,1.03,.22,.69);shape.lineTo(.83,-.4);shape.quadraticCurveTo(1,-.77,.7,-.77);shape.closePath();
    shapeMesh(shape,body,.8);
    box(seaweed,[0,-.55,.44],[.62,.6,.1],.07);
    for(let i=0;i<24;i++){const x=Math.sin(i*13.1)*.55,y=-.45+(i%6)*.18;if(Math.abs(x)>.68-y*.35||Math.abs(x)<.42&&y>-.15&&y<.33)continue;tiny(cream,[x,y,.475],[.046,.018,.013],[0,0,i*.7]);}
    face(.14,.479,.23);group.position.y=-.06;
  }else if(type==='sushi'){
    box(cream,[0,-.43,0],[1.72,.88,1.12],.29,true);
    box(body,[0,.1,.02],[1.91,.4,1.18],.15,true);
    box(seaweed,[0,-.05,.61],[.32,.7,.08],.035);
    box(seaweed,[0,.31,0],[.32,.05,1.13],.02);
    face(-.39,.58,.39);
  }else if(type==='duck'){
    sphere(group,body,[0,-.34,0],[.93,.56,.73],[0,0,0],true,48);
    sphere(group,body,[0,.35,.24],[.64,.63,.59],[0,0,0],true,44);
    const orange=material('#e9a063');sphere(group,orange,[0,.2,.82],[.32,.12,.25],[0,0,0],false,32);
    eye(group,dark,-.27,.43,.764,.053);eye(group,dark,.27,.43,.764,.053);blush(group,pink,-.38,.27,.71);blush(group,pink,.38,.27,.71);
    sphere(group,body,[-.76,-.3,.32],[.21,.31,.34],[0,0,-.3],false,28);sphere(group,body,[.76,-.3,.32],[.21,.31,.34],[0,0,.3],false,28);
    sphere(group,body,[0,-.2,-.65],[.29,.3,.33],[.5,0,0],true,24);
  }else if(type==='cube'){
    box(body,[0,-.02,0],[1.72,1.72,1.42],.29,true);
    const glint=material('#e4f2ec',.25);box(glint,[-.48,.43,.716],[.07,.3,.025],.025,false,[0,0,-.15]);
    face(-.02,.729,.28);
  }else if(type==='burger'){
    sphere(group,body,[0,-.68,0],[.98,.22,.75],[0,0,0],true,40);
    sphere(group,material('#795846'),[0,-.38,0],[1,.16,.74],[0,0,0],true,36);
    box(material('#ecc96d'),[0,-.22,.05],[1.55,.06,1.18],.025,false,[0,.16,0]);
    sphere(group,material('#d68572'),[0,-.15,0],[.94,.1,.74],[0,0,0],false,32);
    for(let i=0;i<10;i++){const a=i*Math.PI/5;sphere(group,green,[Math.sin(a)*.78,-.04,Math.cos(a)*.58],[.28,.09,.23],[0,a,0],false,20);}
    sphere(group,body,[0,.23,0],[1,.52,.77],[0,0,0],true,48);
    for(let i=0;i<24;i++){const a=i*2.39996,r=Math.sqrt((i+.5)/24)*.8,x=Math.cos(a)*r,z=Math.sin(a)*r*.75,y=.23+.52*Math.sqrt(Math.max(0,1-r*r));tiny(cream,[x,y+.006,z],[.052,.013,.022],[0,a,0]);}
    face(.18,.76,.25);
  }else{return false;}
  return true;
}
