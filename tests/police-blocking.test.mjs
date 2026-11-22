import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createPolice,policeSpawnClear} from '../game/src/police.js';
import {createVehicles} from '../game/src/vehicles.js';

globalThis.document={
  createElement(){
    return {width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})};
  }
};

function makeRig(withPlayer=true){
  const scene=new T.Scene();
  const vehicles=withPlayer?createVehicles(scene):{cars:[],external:[]};
  const world={blocked:()=>false};
  const police=createPolice(scene,world,vehicles,()=>{});
  const active=withPlayer?vehicles.cars[0]:null;
  if(withPlayer)for(const car of vehicles.cars.slice(1))car.root.position.set(500+vehicles.cars.indexOf(car)*10,.02,500);
  return {police,vehicles,world,active};
}

function placePlayer(active,x,z,heading){
  active.root.position.set(x,.02,z);active.heading=heading;active.root.rotation.y=heading;
  active.speed=0;active.steer=0;active.damage=0;
}

function forwardDisplacement(active,start,heading){
  const delta=active.root.position.clone().sub(start);
  return -delta.x*Math.sin(heading)-delta.z*Math.cos(heading);
}

test('50 deterministic runs: a cruiser 4 m ahead soft-pushes sideways and the player advances within 2 seconds',()=>{
  const {police,vehicles,world,active}=makeRig();
  let seed=0x42b17;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const input={down:key=>key==='KeyW'};
  const distances=[];

  for(let run=0;run<50;run++){
    const x=180+random()*4,z=180+random()*4,heading=(random()-.5)*.7;
    placePlayer(active,x,z,heading);
    police.reset();
    const cruiser=police.spawnTestUnit(active.root.position,heading,4);
    const cruiserStart=cruiser.root.position.clone(),start=active.root.position.clone();
    police.forceWanted(5);

    vehicles.drive(active,1/60,input,world,()=>{});
    const firstPush=cruiser.root.position.clone().sub(cruiserStart);
    const lateralPush=firstPush.x*Math.cos(heading)-firstPush.z*Math.sin(heading);
    const forwardPush=-firstPush.x*Math.sin(heading)-firstPush.z*Math.cos(heading);
    assert.ok(Math.abs(lateralPush)>=.08-1e-10,`run ${run+1}: cruiser was not pushed sideways`);
    assert.ok(Math.abs(forwardPush)<1e-10,`run ${run+1}: soft push must not shove the cruiser forward`);
    police.update(1/60,active.root.position,active,1/60,active.heading);

    for(let step=1;step<120;step++){
      vehicles.drive(active,1/60,input,world,()=>{});
      police.update(1/60,active.root.position,active,1/60,active.heading);
    }
    const distance=forwardDisplacement(active,start,heading);
    assert.ok(distance>1,`run ${run+1}: player advanced only ${distance.toFixed(3)} m in 2 seconds`);
    distances.push(distance);
  }
  assert.equal(distances.length,50);
});

test('blocking timer requires speed below 0.5 m/s and despawns the unit just after 3 seconds',()=>{
  const {police,vehicles,active}=makeRig();
  placePlayer(active,200,200,.2);
  police.reset();
  const cruiser=police.spawnTestUnit(active.root.position,active.heading,4);

  active.speed=.5;
  police.update(0,active.root.position,active,3.5,active.heading);
  assert.equal(cruiser.blockFor,0);
  assert.ok(police.cars.includes(cruiser));

  active.speed=0;
  police.update(0,active.root.position,active,2.99,active.heading);
  assert.ok(Math.abs(cruiser.blockFor-2.99)<1e-10);
  assert.ok(police.cars.includes(cruiser));
  police.update(0,active.root.position,active,.02,active.heading);
  assert.equal(police.cars.includes(cruiser),false);
  assert.equal(vehicles.external.includes(cruiser),false);
  assert.equal(police.cars.length,0);
});

test('forward spawn exclusion starts at 15 m and roadblocks retain a gap of at least 4 m',()=>{
  const focus=new T.Vector3(0,0,0);
  assert.equal(policeSpawnClear(0,-14.999,focus,0),false);
  assert.equal(policeSpawnClear(0,-15,focus,0),true);
  assert.equal(policeSpawnClear(0,1,focus,0),true);

  const {police}=makeRig(false);
  const player=new T.Vector3(3,0,150);
  police.forceWanted(3);
  police.update(0,player,null,36,0);
  const roadblocks=police.cars.filter(car=>car.roadblock);
  assert.equal(roadblocks.length,2);
  const centerGap=roadblocks[0].root.position.distanceTo(roadblocks[1].root.position);
  const clearGap=centerGap-roadblocks[0].model.length;
  assert.ok(clearGap>=4,`roadblock clear gap was only ${clearGap.toFixed(3)} m`);
  for(const car of roadblocks)assert.equal(policeSpawnClear(car.root.position.x,car.root.position.z,player,0),true);
});
