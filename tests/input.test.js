import test from 'node:test';
import assert from 'node:assert/strict';
import { InputManager, keyAction, keySource } from '../src/input.js';

test('multiple keys for one direction survive individual key releases',()=>{
  const input=new InputManager();
  input.hold('key:KeyA','left');
  input.hold('key:ArrowLeft','left');
  input.release('key:KeyA');
  assert.deepEqual(input.snapshot(),{left:true,right:false,crouch:false,sprint:false});
  input.release('key:ArrowLeft');
  assert.equal(input.snapshot().left,false);
});

test('last direction pressed wins; releasing it restores the earlier hold',()=>{
  const input=new InputManager();
  input.hold('key:KeyA','left');
  input.hold('key:KeyD','right');
  assert.equal(input.snapshot().right,true);
  assert.equal(input.snapshot().left,false);
  input.release('key:KeyD');
  assert.equal(input.snapshot().left,true);
  assert.equal(input.snapshot().right,false);
  input.release('key:KeyA');
  assert.equal(input.snapshot().left,false);
});

test('repeated keydown never steals priority or retriggers notifications',()=>{
  const states=[];
  const input=new InputManager(state=>states.push(state));
  input.hold('key:KeyA','left');
  input.hold('key:KeyD','right');
  assert.equal(input.hold('key:KeyA','left'),false);
  assert.equal(input.snapshot().right,true);
  assert.equal(states.length,2);
});

test('multitouch tracks pointers independently, including same action',()=>{
  const input=new InputManager();
  input.hold('pointer:14','left');
  input.hold('pointer:15','left');
  input.releasePointer(14);
  assert.equal(input.snapshot().left,true);
  input.hold('pointer:16','right');
  assert.equal(input.snapshot().right,true);
  input.releasePointer(16);
  assert.equal(input.snapshot().left,true);
  input.releasePointer(15);
  assert.deepEqual(input.snapshot(),{left:false,right:false,crouch:false,sprint:false});
});

test('crouch and sprint can coexist with movement, then clear atomically',()=>{
  const inputs=[];
  const input=new InputManager(state=>inputs.push(state));
  input.hold('pointer:1','left');
  input.hold('pointer:2','crouch');
  input.hold('key:ShiftLeft','sprint');
  assert.deepEqual(input.snapshot(),{left:true,right:false,crouch:true,sprint:true});
  input.clear();
  assert.deepEqual(input.snapshot(),{left:false,right:false,crouch:false,sprint:false});
  assert.deepEqual(inputs.at(-1),input.snapshot());
  input.clear();
  assert.equal(inputs.length,4);
});

test('keyboard bindings use physical event.code and support all movement alternatives',()=>{
  assert.equal(keyAction({code:'KeyA',key:'q'}),'left');
  assert.equal(keyAction({code:'ArrowDown',key:'ArrowDown'}),'crouch');
  assert.equal(keyAction({code:'ShiftRight',key:'Shift'}),'sprint');
  assert.equal(keyAction({code:'KeyW',key:'w'}),'jump');
  assert.equal(keyAction({code:'KeyJ',key:'j'}),'attack');
  assert.equal(keyAction({code:'Unidentified',key:'d'}),'right');
  assert.equal(keySource({code:'KeyA',key:'a'}),'key:KeyA');
});
