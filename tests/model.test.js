import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS, FLOOR, PLATFORMS, ROUND_SECONDS, createGame, start, tick,
  setInput, jump, attack, progress, canHide
} from '../src/model.js';

function advance(game,seconds,dt=1/60){
  const events=[];
  for(let i=0;i<Math.ceil(seconds/dt);i++)events.push(...tick(game,dt));
  return events;
}

test('levels define playable geography, unique objects and fish',()=>{
  assert.equal(LEVELS.length,3);
  assert.equal(PLATFORMS.length,2);
  for(let i=0;i<LEVELS.length;i++){
    const g=createGame(i);
    assert.equal(g.phase,'ready');
    assert.equal(g.props.length,8);
    assert.equal(g.player.x,90);
    assert.equal(g.player.y,FLOOR);
    assert.ok(g.fish.length>=2);
    assert.equal(new Set(g.props.map(p=>p.id)).size,g.props.length);
    assert.ok(g.props.every(p=>p.x>=0&&p.x<=960&&p.y>=320&&p.y<=FLOOR));
  }
  assert.throws(()=>createGame(-1),RangeError);
  assert.throws(()=>createGame(999),RangeError);
});

test('cat actually needs movement; clicking is not a free break',()=>{
  const g=createGame();
  assert.equal(attack(g),null);
  assert.equal(start(g),true);
  assert.equal(start(g),false);
  assert.equal(g.broken,0);
  assert.equal(attack(g).miss,true);
  assert.equal(g.broken,0);
  setInput(g,'right',true);
  advance(g,.22);
  setInput(g,'right',false);
  assert.ok(g.player.x>125);
  assert.equal(g.broken,0);
});

test('player jumps high enough to land on elevated shelves',()=>{
  const g=createGame();start(g);
  g.player.x=670;g.player.y=FLOOR;
  assert.equal(jump(g),true);
  const heights=[];
  for(let i=0;i<80;i++){tick(g,1/60);heights.push(g.player.y);}
  assert.ok(Math.min(...heights)<PLATFORMS[1].y-5);
  assert.equal(g.player.y,PLATFORMS[1].y);
  assert.equal(g.player.grounded,true);
});

test('attack requires proximity and facing; sturdy props take two hits',()=>{
  const g=createGame();start(g);
  g.player.x=131;g.player.face=-1;
  assert.equal(attack(g).miss,true);
  advance(g,.3);
  g.player.face=1;
  const first=attack(g);
  assert.equal(first.hits.length,1);
  assert.equal(first.hits[0].name,'Chậu monstera');
  assert.equal(first.hits[0].broken,false);
  assert.equal(g.props[2].hp,1);
  assert.equal(attack(g),null); // cooldown, no hit spam
  advance(g,.29);
  const second=attack(g);
  assert.equal(second.hits[0].broken,true);
  assert.equal(g.broken,1);
  assert.equal(g.combo,1);
  assert.ok(g.score>0);
});

test('combo requires execution; streak boosts speed with zoomies',()=>{
  const g=createGame();start(g);
  // Position cat near several objects, preserving legitimate hit constraints.
  for(const i of [0,1,3,4]){
    g.player.x=g.props[i].x-30;g.player.y=g.props[i].y;
    g.player.face=1;g.player.grounded=true;
    if(g.player.y<460)g.player.vy=0;
    const result=attack(g);
    assert.ok(result&&result.hits.length);
    advance(g,.28);
  }
  assert.ok(g.combo>=3);
  assert.ok(g.maxCombo>=3);
  assert.ok(g.zoomies>0);
  advance(g,4.2);
  assert.equal(g.combo,0);
});

test('snacks must be reached and break goal opens pet door',()=>{
  const g=createGame();start(g);
  for(let i=0;i<5;i++)g.props[i].broken=true;
  g.broken=5;
  assert.equal(g.exitOpen,false);
  g.player.x=g.fish[0].x;g.player.y=g.fish[0].y+19;
  const events=tick(g,.02);
  assert.ok(events.some(x=>x.kind==='fish'));
  assert.equal(g.eaten,1);
  assert.equal(g.exitOpen,true);
  g.player.x=930;g.player.y=FLOOR;g.player.vy=0;
  const done=tick(g,.02);
  assert.equal(g.phase,'cleared');
  assert.ok(done.some(x=>x.kind==='cleared'));
});

test('owner patrol creates danger but hiding spots give protection',()=>{
  const g=createGame();start(g);
  g.owner.x=600;g.owner.dir=-1;g.player.x=620;g.player.y=FLOOR;
  const hit=tick(g,.02);
  assert.ok(hit.some(x=>x.kind==='spotted'));
  assert.ok(g.suspicion>=27);
  g.player.x=130;g.player.y=FLOOR;g.player.grounded=true;
  g.owner.x=133;g.owner.dir=-1;
  assert.equal(canHide(g),true);
  setInput(g,'crouch',true);
  const prior=g.suspicion;
  tick(g,.02);
  assert.equal(g.player.hidden,true);
  assert.ok(g.suspicion<prior);
});

test('timer causes loss and no actions score after game over',()=>{
  const g=createGame();start(g);
  let events=[];
  for(let i=0;i<ROUND_SECONDS*20+10;i++)events.push(...tick(g,.05));
  assert.equal(g.phase,'timeout');
  assert.equal(g.time,0);
  assert.ok(events.some(x=>x.kind==='timeout'));
  const score=g.score;
  assert.equal(attack(g),null);
  assert.equal(score,g.score);
});

test('player can be caught by ignoring suspicion',()=>{
  const g=createGame();start(g);
  for(let i=0;i<8;i++){
    g.player.x=g.props[i].x-15;g.player.y=g.props[i].y;
    g.player.face=1;
    if(g.phase!=='playing')break;
    attack(g);advance(g,.3);
  }
  assert.equal(g.phase,'caught');
  assert.ok(g.suspicion>=100);
});
