const storageKey='velvet-harbor-phase-one-v1';
export function readSave() {
  try {
    const data=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(!data||data.version!==1||!Array.isArray(data.position)||data.position.length!==3||data.position.some(v=>!Number.isFinite(v)))return null;
    if(Math.abs(data.position[0])>380||Math.abs(data.position[2])>301||!Number.isFinite(data.money)||!Number.isFinite(data.minutes))return null;
    return data;
  } catch {return null;}
}
export function writeSave(state,mara,vehicles,activeCar) {
  const persistentCars=vehicles.cars.filter(car=>!car.id.startsWith('traffic-')||car.owned);
  const data={version:1,position:(activeCar?activeCar.root.position:mara.root.position).toArray(),money:state.money,health:state.health,armor:state.armor,minutes:state.minutes,missionProgress:{chapter:0,completed:[]},ownedCars:persistentCars.filter(c=>c.owned).map(c=>c.id),activeCar:activeCar?.id||null,cars:persistentCars.map(c=>({id:c.id,position:c.root.position.toArray(),heading:c.heading,damage:c.damage}))};
  try{localStorage.setItem(storageKey,JSON.stringify(data));return true;}catch{return false;}
}
export function applySave(data,state,mara,vehicles) {
  mara.root.position.fromArray(data.position);mara.reset();
  state.money=Math.max(0,data.money);state.health=Math.min(100,Math.max(1,data.health||100));state.armor=Math.min(100,Math.max(0,data.armor||0));state.minutes=((data.minutes%1440)+1440)%1440;
  for(const saved of data.cars||[]) {
    const car=vehicles.cars.find(c=>c.id===saved.id);
    if(!car||!Array.isArray(saved.position)||saved.position.some(v=>!Number.isFinite(v))||!Number.isFinite(saved.heading))continue;
    car.root.position.fromArray(saved.position);car.heading=saved.heading;car.root.rotation.y=car.heading;car.damage=Math.max(0,Math.min(100,saved.damage||0));car.speed=0;car.owned=(data.ownedCars||[]).includes(car.id);
  }
  const active=vehicles.cars.find(c=>c.id===data.activeCar)||null;
  for(const car of vehicles.cars)if(car.owned)car.ai=false;
  return active;
}
