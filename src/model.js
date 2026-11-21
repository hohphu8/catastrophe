// Catastrophe 2 — deterministic game rules, independent of rendering and GyosJS.
export const W = 960, H = 540, FLOOR = 464, ROUND_SECONDS = 95;
export const PLATFORMS = Object.freeze([
  { x: 235, y: 348, w: 235 }, { x: 575, y: 328, w: 235 }
]);
export const HIDE_SPOTS = Object.freeze([{ x: 82, w: 127 }, { x: 464, w: 107 }]);
export const LEVELS = [
  { name: 'Phòng khách', subtitle: 'Một chiếc ly không bao giờ biết sợ', theme: 'living',
    objective: 'Đập 5 món · Ăn 1 cá · Trốn ra cửa',
    ownerSpeed: 83, ownerVision: 128, breakGoal: 5, fishGoal: 1,
    objects: [
      ['vase','Bình hoa',300,348,110,1], ['mug','Cốc cà phê',414,348,80,1],
      ['plant','Chậu monstera',157,464,125,2], ['lamp','Đèn ngủ',633,328,150,1],
      ['books','Chồng sách',744,328,100,1], ['clock','Đồng hồ',843,464,110,2],
      ['frame','Khung ảnh',510,464,130,1], ['ball','Bóng len',360,464,70,1]
    ],
    fish: [[342,297],[688,277]]
  },
  { name: 'Nhà bếp', subtitle: 'Có mùi cá nhưng mà cũng có sen', theme: 'kitchen',
    objective: 'Đập 6 món · Ăn 1 cá · Trốn ra cửa',
    ownerSpeed: 105, ownerVision: 155, breakGoal: 6, fishGoal: 1,
    objects: [
      ['mug','Cốc sữa',145,464,80,1], ['pot','Nồi canh',308,348,165,2],
      ['cake','Bánh kem',423,348,110,1], ['plant','Cây gia vị',513,464,100,1],
      ['vase','Hũ gốm',621,328,140,2], ['books','Đĩa sứ',734,328,145,1],
      ['clock','Đồng hồ bếp',837,464,125,1], ['ball','Quả cam',377,464,75,1]
    ],
    fish: [[385,297],[750,277]]
  },
  { name: 'Góc làm việc', subtitle: 'Deadline của sen, dopamine của mèo', theme: 'office',
    objective: 'Đập 6 món · Ăn 2 cá · Trốn ra cửa',
    ownerSpeed: 120, ownerVision: 170, breakGoal: 6, fishGoal: 2,
    objects: [
      ['mug','Cốc cà phê',150,464,85,1], ['keyboard','Bàn phím cơ',300,348,160,2],
      ['monitor','Màn hình',418,348,250,2], ['plant','Chậu cây',525,464,110,1],
      ['lamp','Đèn học',627,328,150,1], ['books','Tập tài liệu',755,328,130,1],
      ['clock','Đồng hồ báo thức',833,464,145,2], ['ball','Cuộn dây sạc',377,464,80,1]
    ],
    fish: [[354,297],[695,277],[520,417]]
  }
];
export const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));

export function createGame(levelIndex=0, carriedScore=0) {
  if(!Number.isInteger(levelIndex)||!LEVELS[levelIndex]) throw new RangeError('Invalid level');
  const config=LEVELS[levelIndex];
  return {
    levelIndex, phase:'ready', time:ROUND_SECONDS, score:carriedScore, levelScore:0,
    broken:0, eaten:0, combo:0, comboTimer:0, maxCombo:0,
    suspicion:0, zoomies:0, exitOpen:false, ownerAlert:false,
    player:{x:62,y:FLOOR,vx:0,vy:0,face:1,grounded:true,hidden:false,attackTime:0,attackCooldown:0,invincible:0},
    owner:{x:795,y:FLOOR,dir:-1,visible:true},
    input:{left:false,right:false,crouch:false,sprint:false},
    props:config.objects.map(([kind,name,x,y,points,hp],i)=>({
      id:'prop-'+i,kind,name,x,y,points,hp,maxHp:hp,broken:false,flash:0
    })),
    fish:config.fish.map(([x,y],i)=>({id:'fish-'+i,x,y,eaten:false,phase:i*1.7}))
  };
}
export function start(game){if(game.phase!=='ready')return false;game.phase='playing';return true;}
export function setInput(game,key,pressed) {
  if(!(key in game.input))return;
  game.input[key]=!!pressed;
}
export function canHide(game){
  return game.player.grounded && HIDE_SPOTS.some(z=>game.player.x>=z.x&&game.player.x<=z.x+z.w);
}
export function jump(game) {
  if(game.phase!=='playing'||!game.player.grounded||game.player.hidden)return false;
  game.player.vy=-690;
  game.player.grounded=false;
  return true;
}
export function breakableInRange(game) {
  const player=game.player;
  return game.props.filter(p=>!p.broken&&Math.abs(p.x-player.x)<=85&&
    Math.abs(p.y-player.y)<=75 && (p.x-player.x)*player.face>=-23)
    .sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x));
}
export function attack(game) {
  if(game.phase!=='playing'||game.player.attackCooldown>0||game.player.hidden)return null;
  const p=game.player;
  p.attackCooldown=.27;p.attackTime=.23;
  const targets=breakableInRange(game).slice(0,2);
  let total=0;
  const hits=[];
  for(const item of targets){
    item.hp--;item.flash=.24;
    if(item.hp===0){
      item.broken=true;game.broken++;
      game.combo=game.comboTimer>0?Math.min(9,game.combo+1):1;
      game.comboTimer=4.1; game.maxCombo=Math.max(game.maxCombo,game.combo);
      const points=item.points*game.combo;total+=points;
      game.levelScore+=points;game.score+=points;
      if(game.combo>=3)game.zoomies=5.0;
      hits.push({id:item.id,kind:item.kind,x:item.x,y:item.y,points,broken:true,combo:game.combo,name:item.name});
    }else{
      hits.push({id:item.id,kind:item.kind,x:item.x,y:item.y,points:0,broken:false,combo:game.combo,name:item.name});
    }
  }
  game.suspicion=clamp(game.suspicion+(targets.length?10+targets.length*4:2),0,100);
  if(game.suspicion>=100)game.phase='caught';
  updateExit(game);
  return {hits,miss:hits.length===0,total};
}
export function updateExit(game){
  const cfg=LEVELS[game.levelIndex];
  game.exitOpen=game.broken>=cfg.breakGoal&&game.eaten>=cfg.fishGoal;
}
export function tick(game,delta){
  const events=[];
  if(game.phase!=='playing')return events;
  // Fixed substeps for consistent collisions even on slow devices.
  let left=clamp(Number(delta)||0,0,.08);
  while(left>0){
    const dt=Math.min(.016,left);left-=dt;
    simulate(game,dt,events);
    if(game.phase!=='playing')break;
  }
  return events;
}
function simulate(game,dt,events){
  const p=game.player, level=LEVELS[game.levelIndex];
  game.time=Math.max(0,game.time-dt);
  if(game.time<.00001)game.time=0;
  if(game.time===0){game.phase='timeout';events.push({kind:'timeout'});return;}
  p.attackTime=Math.max(0,p.attackTime-dt);
  p.attackCooldown=Math.max(0,p.attackCooldown-dt);
  p.invincible=Math.max(0,p.invincible-dt);
  game.comboTimer=Math.max(0,game.comboTimer-dt);
  if(game.comboTimer===0)game.combo=0;
  game.zoomies=Math.max(0,game.zoomies-dt);
  for(const item of game.props)item.flash=Math.max(0,item.flash-dt);

  p.hidden=game.input.crouch&&canHide(game);
  const move=Number(game.input.right)-Number(game.input.left);
  const speed=game.zoomies>0?350:game.input.sprint?290:225;
  p.vx=move*speed;
  if(move!==0)p.face=move;
  if(p.hidden)p.vx=0;
  p.x=clamp(p.x+p.vx*dt,36,W-33);
  const prevY=p.y;
  p.vy=Math.min(850,p.vy+1570*dt);
  p.y+=p.vy*dt;
  p.grounded=false;
  // One-way platforms: can jump through them, land from above.
  if(p.vy>=0){
    for(const platform of PLATFORMS){
      if(p.x>platform.x-17&&p.x<platform.x+platform.w+17&&
         prevY<=platform.y+3&&p.y>=platform.y){
        p.y=platform.y;p.vy=0;p.grounded=true;break;
      }
    }
    if(p.y>=FLOOR){p.y=FLOOR;p.vy=0;p.grounded=true;}
  }
  // Snacks are acquired by physically reaching them.
  for(const snack of game.fish)if(!snack.eaten&&
    Math.hypot(p.x-snack.x,p.y-(snack.y+21))<48){
    snack.eaten=true;game.eaten++;game.score+=90;game.levelScore+=90;
    game.suspicion=clamp(game.suspicion-8,0,100);
    events.push({kind:'fish',x:snack.x,y:snack.y});
  }
  updateExit(game);
  // Patrol AI: looks for the cat but doesn't read keyboard/click state.
  const owner=game.owner;
  owner.x+=owner.dir*level.ownerSpeed*dt*(game.suspicion>63?1.3:1);
  if(owner.x<565){owner.x=565;owner.dir=1;}
  if(owner.x>919){owner.x=919;owner.dir=-1;}
  const dy=Math.abs(p.y-owner.y), dx=Math.abs(p.x-owner.x);
  const inSight=dx<level.ownerVision&&dy<135&&
    (owner.dir*(p.x-owner.x)>-45 || dx<58);
  if(inSight&&!p.hidden){
    game.ownerAlert=true;
    game.suspicion=clamp(game.suspicion+(dx<50&&dy<55?105:35)*dt,0,100);
    if(dx<43&&dy<43&&p.invincible===0){
      game.suspicion=clamp(game.suspicion+27,0,100);
      p.invincible=1.2;
      events.push({kind:'spotted'});
    }
  }else{
    game.ownerAlert=false;
    game.suspicion=clamp(game.suspicion-7*dt,0,100);
  }
  if(game.suspicion>=100){game.phase='caught';events.push({kind:'caught'});return;}
  if(game.exitOpen&&p.x>=915&&p.y>=FLOOR-15){
    game.phase='cleared';events.push({kind:'cleared'});
  }
}
export function progress(game){
  const level=LEVELS[game.levelIndex];
  return {broken:game.broken,goal:level.breakGoal,eaten:game.eaten,fishGoal:level.fishGoal};
}
