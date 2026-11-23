import {districtAt} from './world.js';
export function createHUD() {
  const el=id=>document.getElementById(id);let toastUntil=0;
  let dispatchLines=[];
  let dispatchUntil=0;
  let tickerMessages=[
    'SALTGILT PD: ALL UNITS RESPOND TO CODE 3 ON PEARLWAKE BOULEVARD',
    'BREAKING: HELICOPTER SKY PATROL DEPLOYED OVER DOWNTOWN SECTOR',
    'TRAFFIC ADVISORY: AVENUE CLOSURES EXPECTED NEAR HARBOR DISTRICT',
    'POLICE COMMISSIONER: "NO SAFE HAVEN FOR CRIMINAL ELEMENTS"',
    'WEATHER: LIGHT RAIN CONTINUING THROUGH BLUE HOUR, VISIBILITY REDUCED'
  ];
  let tickerIndex=0;
  let tickerOffset=0;
  let tickerSpeed=30;
  let dialogueUntil=0;
  let endingScreen=false;

  function toast(text){el('toast').textContent=text;el('toast').classList.remove('hidden');toastUntil=performance.now()+3500;}

  function dispatch(text){
    dispatchLines.unshift({text,time:performance.now()});
    if(dispatchLines.length>3)dispatchLines.pop();
    dispatchUntil=performance.now()+6000;
    tickerMessages.unshift(`SALTGILT DISPATCH: ${text}`);
    if(tickerMessages.length>10)tickerMessages.pop();
  }

  function setObjective(text) {
    const objEl = el('objective-text');
    if (objEl) objEl.textContent = text;
  }

  function showDialogue(text) {
    const dlgEl = el('dialogue');
    if (dlgEl) {
      dlgEl.textContent = text;
      dlgEl.classList.remove('hidden');
      dialogueUntil = performance.now() + 4000;
    }
  }

  function hideDialogue() {
    const dlgEl = el('dialogue');
    if (dlgEl) dlgEl.classList.add('hidden');
  }

  function showEndingScreen() {
    endingScreen = true;
    const endEl = el('ending-screen');
    if (endEl) endEl.classList.remove('hidden');
  }

  function updateAmmo(count) {
    const ammoEl = el('ammo');
    if (ammoEl) ammoEl.textContent = `AMMO ${count} / 36`;
  }

  function fadeToBlack(callback) {
    const overlay = el('fade-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.5s ease';
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        setTimeout(() => {
          if (callback) callback();
          setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.classList.add('hidden'), 500);
          }, 100);
        }, 500);
      });
    }
  }

  function fadeFromBlack() {
    const overlay = el('fade-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.opacity = '1';
      overlay.style.transition = 'opacity 0.5s ease';
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.classList.add('hidden'), 500);
      });
    }
  }

  function update(state,position,car,nearest,wanted=0,searching=false) {
    const stars=document.querySelector('.stars');stars.textContent='★'.repeat(wanted)+'☆'.repeat(5-wanted);stars.setAttribute('aria-label',`Wanted level ${wanted} of 5`);stars.style.color=wanted?(searching?'#edc48d':'#ffb18c'):'#ffffff55';
    el('pursuit').textContent=wanted?(searching?'OUT OF SIGHT · KEEP MOVING':'POLICE PURSUIT · BREAK LINE OF SIGHT'):'TRAFFIC SIGNALS ACTIVE · DRIVE WITH CARE';
    el('district').textContent=districtAt(position.x,position.z);
    const hour=Math.floor(state.minutes/60)%24,min=Math.floor(state.minutes%60);
    el('clock').textContent=`SALTGILT · ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    el('money').textContent=`$ ${state.money.toLocaleString('en-US')}`;
    el('healthbar').style.width=state.health+'%';el('armorbar').style.width=state.armor+'%';
    el('vitals').textContent=`HEALTH ${Math.round(state.health)}   ARMOR ${Math.round(state.armor)}`;
    el('speed').textContent=car?Math.round(Math.abs(car.speed)*3.6):'';
    el('vehicle').textContent=car?`${car.model.name.toUpperCase()} · KM/H`:'MARA VALE · ON FOOT';
    el('damage').textContent=car?`CONDITION ${Math.round(100-car.damage)}%`:'';
    el('hint').innerHTML=car?(Math.abs(car.speed)<3?'<span class="key">E</span> Exit vehicle':''):nearest?`<span class="key">E</span> Take ${nearest.model.name}`:'';

    const dispatchEl=el('dispatch');
    if(dispatchEl){
      if(performance.now()<dispatchUntil&&dispatchLines.length>0){
        dispatchEl.textContent=dispatchLines.map(l=>`SALTGILT DISPATCH: ${l.text}`).join('  |  ');
        dispatchEl.classList.remove('hidden');
      }else{
        dispatchEl.classList.add('hidden');
      }
    }

    const tickerEl=el('ticker');
    if(tickerEl){
      const tickerSpan=tickerEl.querySelector('span');
      tickerOffset+=tickerSpeed*0.016;
      const msg=tickerMessages[tickerIndex%tickerMessages.length];
      const nextMsg=tickerMessages[(tickerIndex+1)%tickerMessages.length];
      const totalWidth=(msg.length+nextMsg.length)*8+200;
      if(tickerOffset>totalWidth){
        tickerOffset=0;
        tickerIndex++;
      }
      if(tickerSpan){
        tickerSpan.textContent=`${msg}   ◆   ${nextMsg}   ◆   `;
        tickerSpan.style.transform=`translateX(${-tickerOffset}px)`;
      }
    }

    if(performance.now()>toastUntil)el('toast').classList.add('hidden');
    if(performance.now()>dialogueUntil)hideDialogue();
  }

  return {update,toast,show(value){el('hud').classList.toggle('hidden',!value);},dispatch,setObjective,showDialogue,hideDialogue,showEndingScreen,updateAmmo,fadeToBlack,fadeFromBlack};
}