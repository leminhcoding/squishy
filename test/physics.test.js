import test from 'node:test';
import assert from 'node:assert/strict';
import { SquishyPhysics,MAX_CONTACTS } from '../dist/physics.js';
import { profiles } from '../dist/profiles.js';
const advance=(s,seconds,hz=120)=>{for(let i=0;i<seconds*hz;i++)s.update(1/hz);};
const pressed=(profile,seconds=2)=>{const s=new SquishyPhysics(profile);s.press([0,0,.8],[0,0,1]);advance(s,seconds);return s;};

test('foam retains an indentation after release, then recovers monotonically',()=>{
 const s=pressed(profiles.foam),start=s.depth;s.release();advance(s,.4);assert(s.depth>start*.4);
 let last=s.depth;for(let i=0;i<600;i++){s.update(1/120);assert(s.depth<=last+1e-5);last=s.depth;}assert(s.depth<start*.04);
});
test('a tap shorter than one render frame still produces a small visible impulse',()=>{
 const s=new SquishyPhysics(profiles.foam);s.press([0,0,.8],[0,0,1]);s.release();assert(s.update(1/60)>.1);assert(s.depth>.1);advance(s,12);assert(s.depth<.001);
});
test('mochi returns faster than slow-rise foam',()=>{
 const foam=pressed(profiles.foam),mochi=pressed(profiles.mochi);foam.release();mochi.release();advance(foam,.6);advance(mochi,.6);assert(foam.depth>mochi.depth*8);
});
test('a local press follows its surface normal and leaves distant material almost unchanged',()=>{
 const s=pressed(profiles.foam);const center=s.deform(0,0,.8);assert(center[2]<.4);assert(Math.abs(center[1])<1e-6);
 const far=s.deform(1.6,1.6,0);assert(Math.hypot(far[0]-1.6,far[1]-1.6,far[2])<.002);
 const side=new SquishyPhysics(profiles.foam);side.press([.8,0,0],[1,0,0]);advance(side,2);assert(side.deform(.8,0,0)[0]<.4);
});
test('dense gel resists fast input more strongly than a slow squeeze',()=>{
 const slow=pressed(profiles.gel);const fast=new SquishyPhysics(profiles.gel);fast.press([0,0,.8],[0,0,1]);for(let i=0;i<240;i++){fast.speed=3;fast.update(1/120);}assert(fast.depth<slow.depth*.4);
});
test('gel bulges tangentially more than compressible foam',()=>{
 const foam=pressed(profiles.foam),gel=pressed(profiles.gel);assert(gel.deform(.6,0,.8)[0]- .6 > (foam.deform(.6,0,.8)[0]-.6)*3);
});
test('repeat presses reuse a recovering contact and bound total deformation',()=>{
 const s=new SquishyPhysics(profiles.foam);for(let i=0;i<30;i++){s.press([0,0,.8],[0,0,1]);advance(s,.05);s.release();advance(s,.02);}assert.equal(s.contacts.length,1);
 for(let i=0;i<12;i++){s.press([i*.4,0,.8],[0,0,1]);advance(s,.3);}assert(s.contacts.length<=MAX_CONTACTS);assert(s.contacts.reduce((sum,c)=>sum+c.depth,0)<=1.100001);
});
test('holding without movement becomes quiet; recovery and drag still generate motion',()=>{
 const s=pressed(profiles.foam,8);assert(s.update(1/60)<.018);s.active.targetDrag=[.3,.2,0];assert(s.update(1/60)>.1);s.release();assert(s.update(1/60)>.018);
});
test('60 Hz and 120 Hz integration agree and all presets settle without NaNs',()=>{
 for(const p of Object.values(profiles)){
  const a=pressed(p,2),b=new SquishyPhysics(p);b.press([0,0,.8],[0,0,1]);advance(b,2,60);assert(Math.abs(a.depth-b.depth)<.01);a.release();advance(a,25,60);assert(Number.isFinite(a.depth));assert(a.depth<.001);
 }
});
