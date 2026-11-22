import test from 'node:test';
import assert from 'node:assert/strict';
import {readSave,writeSave,applySave} from '../game/src/save.js';

const store=new Map();
globalThis.localStorage={
  getItem:key=>store.has(key)?store.get(key):null,
  setItem:(key,value)=>store.set(key,String(value)),
  removeItem:key=>store.delete(key),
};

function makeMara(){
  const position={x:0,y:0,z:0,fromArray(values){this.x=values[0];this.y=values[1];this.z=values[2];},toArray(){return [this.x,this.y,this.z];}};
  return {root:{position},reset(){}};
}
const vehicles={cars:[]};

test('save v2 round-trips the camera view choice',()=>{
  const state={money:100,health:90,armor:20,minutes:1110,cameraView:'first'};
  assert.equal(writeSave(state,makeMara(),vehicles,null),true);
  const saved=readSave();
  assert.ok(saved,'the save must be readable');
  assert.equal(saved.version,2);
  assert.equal(saved.cameraView,'first');
});

test('a v1 save without cameraView migrates to the default chase view',()=>{
  store.set('velvet-harbor-phase-one-v1',JSON.stringify({version:1,position:[8,0,150],money:2450,health:100,armor:50,minutes:1110,activeCar:null,cars:[]}));
  const saved=readSave();
  assert.ok(saved,'v1 saves must still load');
  assert.equal(saved.version,1);
  const state={};
  applySave(saved,state,makeMara(),vehicles);
  assert.equal(state.cameraView,'chase');
});

test('a v2 save restores the saved first-person view',()=>{
  store.set('velvet-harbor-phase-one-v1',JSON.stringify({version:2,cameraView:'first',position:[8,0,150],money:2450,health:100,armor:50,minutes:1110,activeCar:null,cars:[]}));
  const state={};
  applySave(readSave(),state,makeMara(),vehicles);
  assert.equal(state.cameraView,'first');
});

test('a v2 save with a missing cameraView falls back to chase',()=>{
  store.set('velvet-harbor-phase-one-v1',JSON.stringify({version:2,position:[8,0,150],money:2450,health:100,armor:50,minutes:1110,activeCar:null,cars:[]}));
  const state={};
  applySave(readSave(),state,makeMara(),vehicles);
  assert.equal(state.cameraView,'chase');
});
