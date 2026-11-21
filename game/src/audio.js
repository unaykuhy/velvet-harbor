export function createAudio() {
  let context,engine,gain,wind,windGain,master,siren,sirenGain;
  function start() {
    try {
      if(context){context.resume().catch(()=>{});return;}
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      context=new Audio();master=context.createGain();master.gain.value=.18;master.connect(context.destination);
      engine=context.createOscillator();engine.type='sawtooth';gain=context.createGain();gain.gain.value=0;
      const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;engine.connect(filter);filter.connect(gain);gain.connect(master);engine.start();
      const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),samples=buffer.getChannelData(0);
      let last=0;for(let i=0;i<samples.length;i++){last=(last+(Math.random()*2-1)*.04)/1.04;samples[i]=last*3;}
      wind=context.createBufferSource();wind.buffer=buffer;wind.loop=true;windGain=context.createGain();windGain.gain.value=.08;wind.connect(windGain);windGain.connect(master);wind.start();
      siren=context.createOscillator();siren.type='triangle';sirenGain=context.createGain();sirenGain.gain.value=0;siren.connect(sirenGain);sirenGain.connect(master);siren.start();
    } catch {context=null;}
  }
  function update(speed,driving,paused,pursuit=0) {
    if(!context||!gain||!master)return;
    const now=context.currentTime;master.gain.setTargetAtTime(paused?0:.18,now,.15);
    gain.gain.setTargetAtTime(driving?.06+Math.abs(speed)*.003:0,now,.1);
    engine.frequency.setTargetAtTime(37+Math.abs(speed)*3.3,now,.12);
    windGain.gain.setTargetAtTime(.08+Math.abs(speed)*.004,now,.2);
    if(siren&&sirenGain){siren.frequency.setTargetAtTime(Math.floor(now*2)%2?740:550,now,.045);sirenGain.gain.setTargetAtTime(Math.min(1,pursuit)*.22,now,.15);}
  }
  function impact(force) {
    if(!context||!master)return;
    try{const o=context.createOscillator(),g=context.createGain();o.type='triangle';o.frequency.setValueAtTime(90,context.currentTime);o.frequency.exponentialRampToValueAtTime(25,context.currentTime+.2);g.gain.setValueAtTime(Math.min(.8,force/30),context.currentTime);g.gain.exponentialRampToValueAtTime(.001,context.currentTime+.25);o.connect(g);g.connect(master);o.start();o.stop(context.currentTime+.26);}catch{}
  }
  return {start,update,impact,get available(){return !!context;},get sirenState(){return {gain:sirenGain?.gain.value||0,frequency:siren?.frequency.value||0,running:context?.state==='running'};}};
}
