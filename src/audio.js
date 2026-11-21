// Original procedural soundtrack + SFX. Web Audio only, no remote music or assets.
const NOTE = {C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};
function hz(name){
  const [,note,octave] = /^([A-G]#?)([0-8])$/.exec(name)||[];
  return 440*Math.pow(2,(((Number(octave)+1)*12+NOTE[note])-69)/12);
}
const CHORDS=[
  {bass:'A2',notes:['A3','C4','E4','G4']},
  {bass:'F2',notes:['A3','C4','E4','F4']},
  {bass:'C3',notes:['G3','C4','D4','E4']},
  {bass:'G2',notes:['G3','B3','D4','E4']}
];
const LEAD=['E5','C5','B4','G4','A4','C5','E5','D5','G4','E4','D5','G4','B4','A4','G4','E5'];
const clamp=x=>Math.max(0,Math.min(1,Number(x)||0));

export class Soundtrack{
  constructor(){
    this.ctx=null;this.musicBus=null;this.fxBus=null;this.master=null;
    this.musicVolume=.68;this.fxVolume=.9;this.muted=false;
    this.playing=false;this.step=0;this.nextStep=0;this.noiseBuffer=null;
  }
  async unlock(){
    if(!this.ctx){
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return false;
      this.ctx=new Audio();
      const c=this.ctx;
      this.musicBus=c.createGain();this.fxBus=c.createGain();
      this.master=c.createGain();this.master.gain.value=.87;
      const limiter=c.createDynamicsCompressor();
      limiter.threshold.value=-20;limiter.knee.value=18;limiter.ratio.value=3.5;
      limiter.attack.value=.003;limiter.release.value=.17;
      this.musicBus.connect(limiter);this.fxBus.connect(limiter);
      limiter.connect(this.master);this.master.connect(c.destination);
      this.setMusicVolume(this.musicVolume);this.setEffectsVolume(this.fxVolume);this.setMuted(this.muted);
      const sampleCount=Math.floor(c.sampleRate*.24);
      this.noiseBuffer=c.createBuffer(1,sampleCount,c.sampleRate);
      const channel=this.noiseBuffer.getChannelData(0);
      // Stable pseudorandom noise avoids creating a new buffer for every impact.
      let seed=3438;
      for(let i=0;i<sampleCount;i++){seed=(seed*1664525+1013904223)>>>0;channel[i]=(seed/2147483648-1)*.7;}
    }
    if(this.ctx.state!=='running')await this.ctx.resume();
    return true;
  }
  setMusicVolume(volume){
    this.musicVolume=clamp(volume);
    if(this.ctx)this.musicBus.gain.setTargetAtTime(this.musicVolume*.54,this.ctx.currentTime,.02);
  }
  setEffectsVolume(volume){
    this.fxVolume=clamp(volume);
    if(this.ctx)this.fxBus.gain.setTargetAtTime(this.fxVolume*.83,this.ctx.currentTime,.02);
  }
  setMuted(muted){
    this.muted=!!muted;
    if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:.87,this.ctx.currentTime,.025);
  }
  async start(){
    const okay=await this.unlock();if(!okay)return false;
    this.playing=true;this.step=0;this.nextStep=this.ctx.currentTime+.05;this.update();
    return true;
  }
  stop(){this.playing=false;}
  async resume(){
    if(!this.ctx)return this.unlock();
    if(this.ctx.state==='suspended')await this.ctx.resume();
    // Reset scheduler after browser tab suspension: no burst of outdated notes.
    if(this.playing)this.nextStep=this.ctx.currentTime+.08;
    return true;
  }
  suspend(){if(this.ctx?.state==='running')return this.ctx.suspend().catch(()=>{});}
  tone(freq,when,duration,volume,type='triangle',destination=this.musicBus){
    const c=this.ctx;if(!c||!destination)return;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),when);
    g.gain.setValueAtTime(.0001,when);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),when+.012);
    g.gain.exponentialRampToValueAtTime(.0001,when+duration);
    o.connect(g).connect(destination);
    o.start(when);o.stop(when+duration+.03);
  }
  drum(when,kind){
    const c=this.ctx;if(!c)return;
    if(kind==='kick'){
      const o=c.createOscillator(),g=c.createGain();
      o.type='sine';o.frequency.setValueAtTime(120,when);
      o.frequency.exponentialRampToValueAtTime(45,when+.15);
      g.gain.setValueAtTime(.34,when);g.gain.exponentialRampToValueAtTime(.0001,when+.19);
      o.connect(g).connect(this.musicBus);o.start(when);o.stop(when+.21);
    }else this.noise(when,kind==='snare'?.13:.035,kind==='snare'?.13:.055,kind==='snare'?1400:5500,this.musicBus);
  }
  noise(when,duration,volume,frequency,destination=this.fxBus){
    if(!this.ctx||!this.noiseBuffer)return;
    const c=this.ctx,src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    src.buffer=this.noiseBuffer;filter.type='highpass';filter.frequency.value=frequency;
    gain.gain.setValueAtTime(Math.max(.0001,volume),when);
    gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
    src.connect(filter).connect(gain).connect(destination);
    src.start(when);src.stop(when+duration+.001);
  }
  update(){
    if(!this.ctx||!this.playing||this.muted||this.ctx.state!=='running')return;
    const seconds=.2727; // 110 BPM, eighth notes.
    let safety=0;
    while(this.nextStep<this.ctx.currentTime+.20 && safety++<12){
      const step=this.step++,slot=step%8,bar=Math.floor(step/8)%4;
      const time=this.nextStep;
      const chord=CHORDS[bar];
      if(slot===0){
        this.tone(hz(chord.bass),time,.6,.24,'sine');
        chord.notes.forEach((n,i)=>this.tone(hz(n),time+i*.009,1.35,.050,'triangle'));
        this.drum(time,'kick');
      }
      if(slot===4){this.drum(time,'kick');this.tone(hz(chord.bass)*1.5,time,.32,.14,'sine');}
      if(slot===2||slot===6)this.drum(time,'snare');
      if(slot%2===1)this.drum(time,'hat');
      if(slot===1||slot===3||slot===5||slot===7){
        const note=LEAD[(Math.floor(step/2))%LEAD.length];
        this.tone(hz(note),time,.18,.065,'sine');
      }
      this.nextStep+=seconds;
    }
    if(this.nextStep<this.ctx.currentTime-.8)this.nextStep=this.ctx.currentTime+.05;
  }
  sfx(kind){
    const c=this.ctx;if(!c||c.state!=='running'||this.muted)return;
    const t=c.currentTime+.005;
    switch(kind){
      case 'hit':
        this.tone(230,t,.095,.36,'sawtooth',this.fxBus);
        this.tone(130,t+.02,.13,.27,'triangle',this.fxBus);
        this.noise(t,.095,.35,750,this.fxBus);break;
      case 'break':
        this.tone(145,t,.19,.36,'triangle',this.fxBus);
        this.noise(t,.20,.47,850,this.fxBus);
        for(let i=0;i<4;i++)this.tone(400+i*163,t+i*.025,.12,.12,'sine',this.fxBus);
        break;
      case 'fish':
        ['C5','E5','G5','C6'].forEach((n,i)=>this.tone(hz(n),t+i*.07,.29,.26,'sine',this.fxBus));break;
      case 'jump':
        this.tone(390,t,.1,.18,'triangle',this.fxBus);
        this.tone(540,t+.06,.15,.19,'sine',this.fxBus);break;
      case 'spot':
        this.tone(270,t,.17,.33,'sawtooth',this.fxBus);
        this.tone(370,t+.12,.2,.24,'triangle',this.fxBus);break;
      case 'win':
        ['G4','C5','E5','G5','C6'].forEach((n,i)=>this.tone(hz(n),t+i*.12,.6,.23,'triangle',this.fxBus));break;
      case 'lose':
        ['E4','D4','C4','A3'].forEach((n,i)=>this.tone(hz(n),t+i*.13,.31,.28,'triangle',this.fxBus));break;
      default:this.tone(350,t,.1,.2,'sine',this.fxBus);
    }
  }
  async close(){
    this.playing=false;
    if(this.ctx){const c=this.ctx;this.ctx=null;await c.close().catch(()=>{});}
  }
}
