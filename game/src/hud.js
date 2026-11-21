import {districtAt} from './world.js';
export function createHUD() {
  const el=id=>document.getElementById(id);let toastUntil=0;
  function toast(text){el('toast').textContent=text;el('toast').classList.remove('hidden');toastUntil=performance.now()+3500;}
  function update(state,position,car,nearest) {
    el('district').textContent=districtAt(position.x,position.z);
    const hour=Math.floor(state.minutes/60)%24,min=Math.floor(state.minutes%60);
    el('clock').textContent=`SOLMAR BAY · ${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    el('money').textContent=`$ ${state.money.toLocaleString('en-US')}`;
    el('healthbar').style.width=state.health+'%';el('armorbar').style.width=state.armor+'%';
    el('vitals').textContent=`HEALTH ${Math.round(state.health)}   ARMOR ${Math.round(state.armor)}`;
    el('speed').textContent=car?Math.round(Math.abs(car.speed)*3.6):'';
    el('vehicle').textContent=car?`${car.model.name.toUpperCase()} · KM/H`:'MARA VALE · ON FOOT';
    el('damage').textContent=car?`CONDITION ${Math.round(100-car.damage)}%`:'';
    el('hint').innerHTML=car?(Math.abs(car.speed)<3?'<span class="key">E</span> Exit vehicle':''):nearest?`<span class="key">E</span> Take ${nearest.model.name}`:'';
    if(performance.now()>toastUntil)el('toast').classList.add('hidden');
  }
  return {update,toast,show(value){el('hud').classList.toggle('hidden',!value);}};
}
