// Close-mic recorded Foley, cut from CC0 recordings. See THIRD_PARTY.md.
// Tiny overlapping grains follow surface velocity. A stationary hold is silent.
export class SquishAudio {
  constructor(getState,getProfile,onError=()=>{}) {
    this.getState=getState;this.getProfile=getProfile;this.onError=onError;
    this.context=null;this.master=null;this.buffers={};this.voices=new Set();this.lastGrain=-10;this.cursor=0;this.stats={grains:0,failures:0};
    this.files=Promise.all(['foam','rubber','squelch'].map(async name=>{
      const response=await fetch(new URL(`./audio/${name}.wav`,import.meta.url));
      if(!response.ok)throw new Error(`Audio ${name}: ${response.status}`);
      return [name,await response.arrayBuffer()];
    })).catch(error=>{this.stats.failures++;this.onError(error);return [];});
  }
  async start() {
    const state=this.getState();if(!state.sound)return;
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return;
    try{
      if(!this.context){
        this.context=new Context({latencyHint:'interactive'});
        this.master=this.context.createGain();this.master.gain.value=state.volume*.8;
        const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-15;limiter.knee.value=8;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.12;
        this.master.connect(limiter);limiter.connect(this.context.destination);
        this.ready=this.files.then(files=>Promise.all(files.map(async([name,bytes])=>{this.buffers[name]=await this.context.decodeAudioData(bytes.slice(0));})));
      }
      // Resume synchronously from the original pointer/keyboard gesture.
      const resumed=this.context.resume();await Promise.all([resumed,this.ready]);this.setVolume();
    }catch(error){this.stats.failures++;this.onError(error);}
  }
  setVolume() {
    if(!this.master)return;
    const state=this.getState();this.master.gain.setTargetAtTime(state.sound?state.volume*.8:0,this.context.currentTime,.025);
    if(!state.sound)this.stop();
  }
  stop() {
    if(!this.context)return;
    const now=this.context.currentTime;
    for(const voice of this.voices){voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.012);try{voice.source.stop(now+.055);}catch{}}
    this.voices.clear();
  }
  grain(energy=.5,release=false,pan=0) {
    const state=this.getState(),p=this.getProfile(),ctx=this.context,buffer=this.buffers[p.audio];
    if(!ctx||!buffer||ctx.state!=='running'||!state.sound||state.volume===0||this.voices.size>=6)return;
    const at=ctx.currentTime;
    if(at-this.lastGrain<.085)return;
    this.lastGrain=at;
    const duration=Math.min(buffer.duration,.16+Math.min(energy,1)*.15+(release?.07:0));
    const source=ctx.createBufferSource();source.buffer=buffer;
    source.playbackRate.value=.94+Math.random()*.1;
    this.cursor=(this.cursor+.271+Math.random()*.19)%1;
    const offset=this.cursor*Math.max(0,buffer.duration-duration-.03);
    const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=p.highpass;hp.Q.value=.5;
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=p.lowpass*(.85+Math.min(1,energy)*.3);lp.Q.value=.45;
    const gain=ctx.createGain(),level=p.audioGain*Math.min(.95,energy)* (release?.65:1);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level,at+.035);gain.gain.setValueAtTime(level*.75,at+duration*.55);gain.gain.linearRampToValueAtTime(0,at+duration);
    const panner=ctx.createStereoPanner();panner.pan.value=Math.max(-.55,Math.min(.55,pan*.35));
    source.connect(hp);hp.connect(lp);lp.connect(gain);gain.connect(panner);panner.connect(this.master);
    const voice={source,gain};this.voices.add(voice);
    source.onended=()=>{this.voices.delete(voice);source.disconnect();hp.disconnect();lp.disconnect();gain.disconnect();panner.disconnect();};
    source.start(at,offset,duration);source.stop(at+duration+.015);this.stats.grains++;
  }
  update(motion,held,pan=0) {
    if(motion>.018)this.grain(Math.min(1,motion*.65),!held,pan);
  }
}
