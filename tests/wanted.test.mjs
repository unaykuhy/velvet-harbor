import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPolice} from '../game/src/police.js';

globalThis.document={
  createElement(){
    return {width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})};
  }
};

function makePolice(blocked){
  const scene=new T.Scene(),vehicles={cars:[],external:[]},messages=[];
  const police=createPolice(scene,{blocked},vehicles,message=>messages.push(message));
  return {police,messages};
}

function assertFinite(value,path='police'){
  if(typeof value==='number'){
    assert.ok(Number.isFinite(value),`${path} is not finite: ${value}`);
    return;
  }
  if(value&&typeof value==='object')for(const [key,child] of Object.entries(value))assertFinite(child,`${path}.${key}`);
}

test('five occluded stars decay at 20, 40, 60, 80 and 100 seconds',()=>{
  let wall=true;
  const {police,messages}=makePolice((x,z)=>wall&&Math.abs(x-3)<8&&z>140&&z<146);
  const focus=new T.Vector3(3,0,150),changes=[];
  police.onWantedChange(change=>changes.push(change));

  assert.equal(police.witnessed(focus),false,'the building must occlude a nearby officer');
  wall=false;
  assert.equal(police.witnessed(focus),true,'the same officer is visible without the building');
  wall=true;

  police.forceWanted(5);
  police.update(0,focus,null,0);
  assert.equal(police.seen,false);
  police.update(0,focus,null,19.999);
  assert.equal(police.wanted,5,'no star may fall before 20 seconds');
  police.update(0,focus,null,.001);
  assert.equal(police.wanted,4);
  for(const expected of [3,2,1,0]){
    police.update(0,focus,null,20);
    assert.equal(police.wanted,expected);
  }

  const decay=changes.filter(change=>change.reason==='line-of-sight-lost');
  assert.deepEqual(decay.map(change=>[change.previous,change.wanted,Math.round(change.time)]),[
    [5,4,20],[4,3,40],[3,2,60],[2,1,80],[1,0,100]
  ]);
  assert.equal(decay[0].helicopterRequired,false,'the 5 -> 4 event tells a helicopter to leave');
  assert.equal(messages.length,5);
  police.update(0,focus,null,100);
  assert.equal(police.wanted,0);
  assertFinite(police.inspect());
});

test('visible police prevent decay and regain of sight resets the 20 second timer',()=>{
  let occluded=false;
  const {police}=makePolice(()=>occluded),focus=new T.Vector3(3,0,150);
  police.forceWanted(5);
  police.update(0,focus,null,0);
  assert.equal(police.seen,true);
  police.update(0,focus,null,20);
  assert.equal(police.wanted,5,'time alone must never reduce wanted level');
  assert.equal(police.inspect().hidden,0);

  occluded=true;
  police.update(0,focus,null,10);
  assert.equal(police.inspect().hidden,10);
  occluded=false;
  police.update(0,focus,null,.1);
  assert.equal(police.seen,true);
  assert.equal(police.inspect().hidden,0);
  occluded=true;
  police.update(0,focus,null,19.999);
  assert.equal(police.wanted,5);
  police.update(0,focus,null,.001);
  assert.equal(police.wanted,4);
});

test('wanted and police stepping stays finite for 10,000 simulation steps',()=>{
  const {police}=makePolice(()=>true),focus=new T.Vector3(3,0,150);
  police.forceWanted(5);
  for(let step=0;step<10000;step++){
    police.update(1/60,focus,null,1/60);
    assertFinite(police.inspect(),`police at step ${step}`);
  }
  assert.equal(police.wanted,0);
});
