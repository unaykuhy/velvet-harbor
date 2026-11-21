export function createInput(canvas,onPause) {
  const held=new Set(),pressed=new Set();let yaw=0,pitch=.16,enabled=false;
  addEventListener('keydown',event=>{
    if(['Space','Tab','F5','ArrowUp','ArrowDown'].includes(event.code))event.preventDefault();
    if(event.code==='Escape'){event.preventDefault();if(!event.repeat)onPause();return;}
    if(!held.has(event.code))pressed.add(event.code);held.add(event.code);
  });
  addEventListener('keyup',event=>held.delete(event.code));
  addEventListener('blur',()=>{held.clear();pressed.clear();if(enabled)onPause(true);});
  addEventListener('mousemove',event=>{
    if(!enabled)return;
    if(document.pointerLockElement===canvas||event.buttons===1){yaw-=event.movementX*.0028;pitch=Math.max(-.28,Math.min(.85,pitch+event.movementY*.002));}
  });
  canvas.addEventListener('click',()=>{
    if(enabled&&document.pointerLockElement!==canvas){try{const result=canvas.requestPointerLock();if(result?.catch)result.catch(()=>{});}catch{}}
  });
  return {
    down:code=>enabled&&held.has(code),
    consume(code){const result=enabled&&pressed.has(code);pressed.delete(code);return result;},
    clear(){held.clear();pressed.clear();},
    set enabled(value){enabled=value;held.clear();pressed.clear();if(!value&&document.pointerLockElement)document.exitPointerLock();},
    get yaw(){return yaw;},set yaw(value){yaw=value;},get pitch(){return pitch;},set pitch(value){pitch=value;},
  };
}
