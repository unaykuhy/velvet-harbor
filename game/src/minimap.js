import {avenues} from './world.js';
export function createMinimap(world) {
  const canvas=document.querySelector('#minimap'),ctx=canvas.getContext('2d');
  function draw(position,yaw,cars,active,police=[]) {
    const s=.95;ctx.clearRect(0,0,360,360);ctx.save();ctx.translate(180,180);ctx.rotate(yaw);ctx.scale(s,s);ctx.translate(-position.x,-position.z);
    ctx.fillStyle='#24505a';ctx.fillRect(position.x-400,position.z-400,800,800);
    ctx.fillStyle='#647b67';ctx.fillRect(-278,-278,532,579);ctx.fillStyle='#bfae82';ctx.fillRect(-278,252,532,49);
    ctx.strokeStyle='#c6c4af';ctx.lineWidth=25;
    for(const a of avenues){ctx.beginPath();ctx.moveTo(a,-277);ctx.lineTo(a,277);ctx.moveTo(-277,a);ctx.lineTo(253,a);ctx.stroke();}
    ctx.strokeStyle='#31464c';ctx.lineWidth=18;
    for(const a of avenues){ctx.beginPath();ctx.moveTo(a,-277);ctx.lineTo(a,277);ctx.moveTo(-277,a);ctx.lineTo(253,a);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(240,-80);ctx.lineTo(380,-80);ctx.stroke();
    ctx.fillStyle='#9aab99';for(const b of world.mapBuildings)ctx.fillRect(b.x-b.w/2,b.z-b.d/2,b.w,b.d);
    for(const car of cars)if(car!==active&&car.root.position.distanceTo(position)<170){ctx.fillStyle='#f4c18c';ctx.beginPath();ctx.arc(car.root.position.x,car.root.position.z,3.3/s,0,Math.PI*2);ctx.fill();}
    for(const car of police)if(car.root.position.distanceTo(position)<180){const p=car.root.position;ctx.fillStyle=Math.floor(performance.now()/180)%2?'#ff6859':'#58acff';ctx.strokeStyle='#edf9ff';ctx.lineWidth=1.5;ctx.fillRect(p.x-4,p.z-4,8,8);ctx.strokeRect(p.x-4,p.z-4,8,8);}
    ctx.restore();
    ctx.fillStyle='#fff7dc';ctx.strokeStyle='#16323a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(180,168);ctx.lineTo(172,190);ctx.lineTo(180,185);ctx.lineTo(188,190);ctx.closePath();ctx.stroke();ctx.fill();
    ctx.save();ctx.translate(180,180);ctx.rotate(yaw);ctx.fillStyle='#fff3d4';ctx.font='bold 17px Arial';ctx.textAlign='center';ctx.fillText('N',0,-151);ctx.restore();
  }
  return {draw};
}
