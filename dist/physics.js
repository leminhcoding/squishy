const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const MAX_CONTACTS=4;

export class SquishyPhysics {
  constructor(profile) { this.contacts=[];this.active=null;this.profile=profile;this.softness=.75;this.rebound=.5;this.pressure=.5;this.speed=0; }
  reset(profile=this.profile) {this.contacts=[];this.active=null;this.profile=profile;this.speed=0;}
  press(point,normal) {
    this.release();
    const length=Math.hypot(...normal)||1;
    const previous=this.contacts.find(c=>Math.hypot(...c.point.map((v,i)=>v-point[i]))<.34&&c.normal.reduce((s,v,i)=>s+v*normal[i]/length,0)>.5);
    if(previous){previous.held=true;previous.age=0;this.active=previous;this.pressure=.5;this.speed=0;return previous;}
    if(this.contacts.length===MAX_CONTACTS)this.contacts.shift();
    this.active={point:[...point],normal:normal.map(v=>v/length),drag:[0,0,0],targetDrag:[0,0,0],fast:0,velocity:0,memory:0,depth:0,age:0,held:true};
    this.contacts.push(this.active);this.pressure=.5;this.speed=0;
    return this.active;
  }
  release() {
    if(this.active){
      // A tap can start and finish between render frames. Preserve its impulse.
      if(this.active.age<.1){this.active.fast=Math.max(.26,this.active.fast);this.active.memory=Math.max(.14,this.active.memory);}
      this.active.held=false;
    }
    this.active=null;
  }
  update(dt) {
    dt=clamp(dt,0,.05);const p=this.profile;
    let motion=0;
    for(const c of this.contacts){
      c.age+=dt;const before=c.depth;
      // Rate-dependent resistance is strong for the dense gel preset.
      const resistance=1/(1+p.rateResistance*(this.speed*1.8+Math.exp(-c.age*7)*1.9));
      const target=c.held?clamp((.14+this.softness*.69)*this.pressure*1.65*resistance,.06,.88):0;
      const stiffness=p.stiffness*(.7+this.rebound*.55);
      const damping=p.damping;
      const h=dt/4;
      for(let i=0;i<4;i++){c.velocity+=((target-c.fast)*stiffness-c.velocity*damping)*h;c.fast=clamp(c.fast+c.velocity*h,-.035,.94);}
      const tau=c.held?p.creep:p.recovery*(1.55-this.rebound);
      c.memory+=(target-c.memory)*(1-Math.exp(-dt/tau));
      c.depth=c.fast*(1-p.memory)+c.memory*p.memory;
      for(let i=0;i<3;i++){
        const delta=(c.held?c.targetDrag[i]-c.drag[i]:-c.drag[i])*(1-Math.exp(-dt/(c.held?.08:tau)));
        c.drag[i]+=delta;motion+=Math.abs(delta)*.2/Math.max(dt,.001);
      }
      motion+=Math.abs(c.depth-before)/Math.max(dt,.001);
    }
    this.speed*=Math.exp(-dt*10);
    this.contacts=this.contacts.filter(c=>c.held||Math.abs(c.depth)>.00015||Math.hypot(...c.drag)>.00015);
    const total=this.contacts.reduce((sum,c)=>sum+Math.max(0,c.depth),0);
    if(total>1.1)for(const c of this.contacts)c.depth*=1.1/total;
    return motion;
  }
  deform(x,y,z,out=[0,0,0]) {
    let qx=x,qy=y,qz=z;
    const p=this.profile;
    for(const c of this.contacts){
      const dx=x-c.point[0],dy=y-c.point[1],dz=z-c.point[2],n=c.normal;
      const h=dx*n[0]+dy*n[1]+dz*n[2];
      const tx=dx-n[0]*h,ty=dy-n[1]*h,tz=dz-n[2]*h;
      const r2=tx*tx+ty*ty+tz*tz;
      const width=p.radius*(1+Math.max(0,c.depth)*.2+Math.hypot(...c.drag)*.8);
      const w=Math.exp(-r2/(width*width)*1.75)*Math.exp(-h*h*.45);
      const ring=Math.exp(-r2/(width*width)*.7)*(1-Math.exp(-r2/(width*width)*4));
      const side=ring*Math.exp(-h*h*.4)*c.depth*p.bulge*.72;
      const length=Math.sqrt(r2)+.0001;
      qx+=-n[0]*c.depth*w+tx/length*side+c.drag[0]*w;
      qy+=-n[1]*c.depth*w+ty/length*side+c.drag[1]*w;
      qz+=-n[2]*c.depth*w+tz/length*side+c.drag[2]*w;
    }
    out[0]=qx;out[1]=qy;out[2]=qz;return out;
  }
  get depth() {return Math.max(0,...this.contacts.map(c=>c.depth));}
}

export const deformationGLSL=`
uniform vec3 uContacts[4];
uniform vec3 uNormals[4];
uniform vec3 uDrags[4];
uniform float uDepths[4];
uniform float uRadius;
uniform float uBulge;
vec3 squishy(vec3 p) {
  vec3 q=p;
  for(int i=0;i<4;i++) {
    float depth=uDepths[i];
    if(abs(depth)<0.00001)continue;
    vec3 delta=p-uContacts[i];
    float h=dot(delta,uNormals[i]);
    vec3 tangent=delta-uNormals[i]*h;
    float r2=dot(tangent,tangent);
    float width=uRadius*(1.0+max(0.0,depth)*0.2+length(uDrags[i])*0.8);
    float w=exp(-r2/(width*width)*1.75)*exp(-h*h*0.45);
    float ring=exp(-r2/(width*width)*0.7)*(1.0-exp(-r2/(width*width)*4.0));
    float side=ring*exp(-h*h*0.4)*depth*uBulge*0.72;
    q+=-uNormals[i]*depth*w+tangent/(sqrt(r2)+0.0001)*side+uDrags[i]*w;
  }
  return q;
}
`;
