import { W, H, FLOOR, PLATFORMS, HIDE_SPOTS, LEVELS, clamp } from './model.js';
const ink='#334846', paper='#fff8e9', orange='#f1a365';
const mix=(a,b,t)=>a+(b-a)*t;

function rr(c,x,y,w,h,r,fill,stroke=null,lw=3){
  c.beginPath();c.roundRect(x,y,w,h,r);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
}
function disc(c,x,y,rx,ry,fill){
  c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();
}
function path(c,points,color,width=3){
  c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function polygon(c,points,fill,stroke=null,width=3){
  c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.closePath();c.fillStyle=fill;c.fill();
  if(stroke){c.lineWidth=width;c.strokeStyle=stroke;c.stroke();}
}
function text(c,string,x,y,size=17,color=ink,align='center'){
  c.font=`900 ${size}px Nunito,system-ui,sans-serif`;
  c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.fillText(string,x,y);
}
function backdrop(c,level){
  const theme=LEVELS[level].theme;
  const colors={
    living:['#fbe6d4','#e6bd9e','#f8dfb4'],
    kitchen:['#e3f1e9','#b8cfb8','#f2ddac'],
    office:['#e3e4f1','#c2bfdc','#d6b7a1']
  }[theme];
  const grad=c.createLinearGradient(0,0,0,FLOOR);
  grad.addColorStop(0,colors[0]);grad.addColorStop(1,'#fff3e1');
  c.fillStyle=grad;c.fillRect(0,0,W,H);
  // Accent alcoves and golden sunshine.
  rr(c,45,42,262,247,20,'#fff8e9','#d9b69c',5);
  rr(c,55,52,242,227,13,'#abd5d4');
  disc(c,232,105,31,31,'#fff3bb');
  polygon(c,[[55,240],[105,192],[165,236],[222,177],[298,234],[298,279],[55,279]],'#87b6a5');
  polygon(c,[[55,250],[123,222],[186,255],[252,209],[298,249],[298,279],[55,279]],'#bad2ac');
  path(c,[[177,53],[177,279]],'#f5e2c8',11);path(c,[[55,159],[298,159]],'#f5e2c8',10);
  polygon(c,[[68,50],[120,50],[88,276],[56,276]],colors[1]);
  polygon(c,[[290,50],[251,50],[271,277],[297,277]],colors[1]);
  path(c,[[48,41],[307,41]],'#8d7166',7);
  polygon(c,[[317,45],[475,45],[745,412],[607,412]],'rgba(255,255,255,.18)');
  // Wall panelling and baseboards.
  for(let x=350;x<950;x+=150){
    rr(c,x,47,125,277,11,'rgba(255,255,255,.08)','rgba(155,121,107,.15)',2);
  }
  rr(c,0,415,W,14,0,'#fff5e4');
  rr(c,0,429,W,H-429,0,'#cfa77f');
  c.fillStyle='#e8bf97';c.fillRect(0,441,W,99);
  for(let y=446;y<H;y+=29)path(c,[[0,y],[W,y]],'#c89b7b',1.5);
  for(let i=0;i<9;i++)path(c,[[i*123+20,448],[i*123-13,540]],'rgba(136,100,82,.19)',2);
  // Large high contrast surfaces that read as walkable platforms.
  for(const [i,p] of PLATFORMS.entries()){
    rr(c,p.x,p.y-7,p.w,18,7,theme==='office'?'#947f82':'#b58366',ink,3);
    rr(c,p.x+8,p.y+10,12,66,4,'#b7a18b',ink,2);
    rr(c,p.x+p.w-20,p.y+10,12,66,4,'#b7a18b',ink,2);
    path(c,[[p.x+18,p.y-4],[p.x+p.w-18,p.y-4]],'#ebc6a1',2);
    if(theme==='office'&&i===0){
      rr(c,p.x+20,p.y-106,145,95,9,'#44545f',ink,4);
      rr(c,p.x+30,p.y-95,125,75,5,'#9ed0c1');
      path(c,[[p.x+43,p.y-80],[p.x+92,p.y-80]],'#def5dd',5);
      path(c,[[p.x+43,p.y-60],[p.x+121,p.y-60]],'#e8f4e7',5);
    }
  }
  // Furniture that forms the hiding zones.
  if(theme==='living'){
    rr(c,71,345,164,107,28,'#8bb1a0',ink,4);
    rr(c,85,327,135,72,23,'#acc9b6',ink,3);
    rr(c,85,393,144,52,19,'#709b89',ink,4);
    rr(c,88,448,16,15,4,'#785d52');rr(c,203,448,16,15,4,'#785d52');
    rr(c,500,379,105,76,16,'#d5a98d',ink,3);
    rr(c,520,368,64,15,5,'#f3dbb3',ink,2);
  }else if(theme==='kitchen'){
    rr(c,71,361,172,94,11,'#92b6a3',ink,4);
    for(let x=85;x<238;x+=69){rr(c,x,374,60,70,6,'#c7d5bb');rr(c,x+23,409,16,4,2,'#648a7d');}
    rr(c,478,377,121,75,8,'#c5ac8b',ink,4);
    rr(c,490,389,97,60,5,'#eee0be');
    for(let x of [532,552])disc(c,x,417,3,3,'#99775d');
  }else{
    rr(c,69,353,171,102,13,'#a8a9c7',ink,4);
    rr(c,78,366,154,71,8,'#d3c5ce',ink,3);
    rr(c,487,384,125,69,9,'#ab978d',ink,4);
    for(let y of [401,429])path(c,[[499,y],[598,y]],'#886f68',5);
  }
  // Hiding zone labels, permanently visible for discoverability.
  for(const spot of HIDE_SPOTS){
    rr(c,spot.x,FLOOR+9,spot.w,24,11,'#345d50');
    text(c,'◉  NÚP (C)',spot.x+spot.w/2,FLOOR+21,11,paper);
  }
  // Pictures, stars and home accessories.
  rr(c,701,62,118,107,14,'#c99e7c',ink,4);
  rr(c,709,70,102,91,7,'#fef2d9');
  disc(c,762,123,30,25,orange);
  polygon(c,[[738,111],[744,80],[757,103]],orange);
  polygon(c,[[775,104],[788,82],[788,116]],orange);
  disc(c,752,122,3.5,4.5,ink);disc(c,771,122,3.5,4.5,ink);
  text(c,'ᴍᴇᴏᴡ',760,150,12,'#9a745f');
  text(c,theme==='office'?'NOT AGAIN':theme==='kitchen'?'FRESH DAILY':'HOME SWEET HOME',520,106,16,'#b99283');
  // Exit: a green pet door that becomes the final escape route.
  rr(c,882,342,68,122,19,'#dbb395',ink,5);
  rr(c,896,370,42,94,17,'#5d7666','#344b41',4);
  disc(c,917,367,19,9,'#fce1b5');
  text(c,'EXIT',917,345,12,'#4f6758');
}
function drawProp(c,kind,x,y,scale=1) {
  c.save();c.translate(x,y-15);c.scale(scale,scale);
  c.lineJoin='round';c.lineCap='round';
  // Custom illustrated collectibles; no emoji glyphs.
  if(kind==='vase'||kind==='plant'){
    if(kind==='plant'){
      for(let i=0;i<5;i++){
        const a=(i-2)*.43;
        path(c,[[0,5],[Math.sin(a)*23, -24-Math.cos(a)*19]],'#577d61',4);
        c.save();c.translate(Math.sin(a)*24,-26-Math.cos(a)*19);c.rotate(a);
        disc(c,0,0,10,19,i%2?'#82ba82':'#5c9e75');c.restore();
      }
    }
    polygon(c,[[-19,5],[19,5],[16,33],[10,38],[-9,38],[-16,33]],kind==='vase'?'#f5b888':'#bb7f65',ink);
    rr(c,-20,0,40,8,3,'#fff0c8',ink,2);
    if(kind==='vase'){path(c,[[-9,15],[0,22],[10,14]],'#e28262',4);}
  }else if(kind==='mug'){
    rr(c,-18,2,37,32,6,'#fcce92',ink,3);
    c.beginPath();c.arc(19,16,12,-Math.PI/2,Math.PI/2);c.lineWidth=5;c.strokeStyle=ink;c.stroke();
    path(c,[[-9,16],[10,16]],'#dca36d',3);
    path(c,[[-9,-4],[-6,-15]],'#fffaf0',3);
  }else if(kind==='lamp'){
    rr(c,-5,6,10,27,4,'#caa37e',ink,3);
    polygon(c,[[-20,2],[-12,-34],[15,-34],[22,2]],'#f8d88d',ink,3);
    rr(c,-18,32,37,7,3,'#b98169',ink,2);
    disc(c,0,-4,15,4,'#f2c277');
  }else if(kind==='books'){
    for(let i=0;i<3;i++){
      rr(c,-23+i*4,24-i*13,45-i*5,11,3,['#91bba7','#d5a7b0','#f2c38c'][i],ink,2);
      path(c,[[10,28-i*13],[17,28-i*13]],paper,2);
    }
  }else if(kind==='clock'){
    disc(c,0,8,28,28,'#fff0cb');
    c.strokeStyle=ink;c.lineWidth=4;c.stroke();
    disc(c,0,8,4,4,ink);
    path(c,[[0,8],[0,-9],[12,8]],ink,3);
    rr(c,-17,34,12,6,3,ink);rr(c,8,34,12,6,3,ink);
  }else if(kind==='ball'){
    disc(c,0,15,23,23,'#f1a7a2');c.strokeStyle=ink;c.lineWidth=3;c.stroke();
    c.beginPath();c.arc(0,15,12,-1.4,1.5);c.lineWidth=3;c.strokeStyle='#f8dfcd';c.stroke();
  }else if(kind==='pot'){
    rr(c,-26,0,52,32,8,'#adc2c7',ink,4);
    rr(c,-30,-2,60,8,4,'#d8e2dd',ink,3);
    rr(c,-34,8,9,7,3,'#7899a3',ink,2);rr(c,25,8,9,7,3,'#7899a3',ink,2);
    for(let i=0;i<3;i++)path(c,[[i*12-12,-10],[i*12-14,-26]],'#a6c0b9',2);
  }else if(kind==='cake'){
    rr(c,-24,6,48,27,6,'#f2b6ba',ink,3);
    rr(c,-25,0,50,11,5,'#fff1da',ink,2);
    rr(c,-3,-20,6,20,2,'#8bbb9d');
    disc(c,0,-24,5,7,'#f7bd65');
  }else if(kind==='keyboard'){
    rr(c,-33,12,66,23,6,'#8e9dac',ink,3);
    for(let i=0;i<5;i++)for(let j=0;j<2;j++)rr(c,-25+i*11,17+j*9,8,6,1,'#e5e7e1');
  }else if(kind==='monitor'){
    rr(c,-35,-14,70,47,7,'#506a6b',ink,3);
    rr(c,-27,-7,54,31,3,'#a6d3bd');
    path(c,[[-18,13],[-3,2],[9,11],[19,-2]],'#eaf4e7',3);
    rr(c,-4,33,8,10,2,ink);rr(c,-19,42,38,5,2,ink);
  }else if(kind==='frame'){
    rr(c,-23,-14,46,53,4,'#d5aa81',ink,4);
    rr(c,-16,-7,32,39,1,'#f4e6d0');
    disc(c,0,3,7,6,'#eba470');
    path(c,[[-12,25],[-1,13],[6,18],[12,10]],'#87b399',4);
  }
  c.restore();
}
function drawFish(c,x,y,now){
  c.save();c.translate(x,y+Math.sin(now*3)*5);
  disc(c,0,0,25,15,'#f8e1a2');c.strokeStyle='#c18557';c.lineWidth=3;c.stroke();
  polygon(c,[[18,0],[38,-17],[38,17]],'#f9b37c','#bf8158',2);
  disc(c,-11,-3,3,3,ink);path(c,[[-5,6],[9,7]],'#d08c55',2);
  for(const a of [0,2.1,4.2]){disc(c,Math.cos(now*2+a)*33,Math.sin(now*2+a)*24,3,3,'#fff1c5');}
  c.restore();
}
function drawOwner(c,owner,time){
  const alert=owner.alert;
  c.save();c.translate(owner.x,owner.y);
  disc(c,0,5,33,8,'rgba(65,55,47,.17)');
  // Vision cone on the floor, easy to understand.
  c.save();c.globalAlpha=alert?.23:.10;
  polygon(c,[[0,-62],[owner.dir*178,-117],[owner.dir*178,-7]],alert?'#f6605e':'#f5b35e');
  c.restore();
  c.scale(owner.dir,1);
  path(c,[[-11,-14],[-16,0],[2,2]],'#4b6565',9);
  path(c,[[15,-14],[19,0],[4,2]],'#4b6565',9);
  rr(c,-26,-91,54,82,16,'#f6c6a3',ink,4);
  rr(c,-24,-75,51,62,13,'#749a8d',ink,3);
  path(c,[[28,-61],[41,-43]],'#f2be96',11);
  disc(c,0,-113,28,31,'#f6c6a3');c.strokeStyle=ink;c.lineWidth=3;c.stroke();
  polygon(c,[[-30,-121],[-15,-144],[23,-140],[31,-118]],'#6b594f');
  disc(c,-9,-117,3,4,ink);disc(c,13,-117,3,4,ink);
  path(c,[[-5,-100],[9,-100]],ink,3);
  if(alert)text(c,'!!',-1,-165,31,'#d86552');
  else { text(c,'?',4,-160,15,'#72867b');}
  c.restore();
}
function drawCat(c,p,now){
  const run=p.grounded&&Math.abs(p.vx)>0;
  const sway=run?Math.sin(now*19)*3:Math.sin(now*3)*1.1;
  c.save();c.translate(p.x,p.y);
  if(p.hidden)c.globalAlpha=.42;
  c.scale(p.face,1);
  disc(c,0,5,28,8,'rgba(62,53,47,.22)');
  // Tail has soft movement and intentional silhouette.
  c.beginPath();c.moveTo(-20,-28);
  c.bezierCurveTo(-62,-51,-53,-89,-31,-71+Math.sin(now*4)*4);
  c.lineCap='round';c.lineWidth=14;c.strokeStyle='#d88350';c.stroke();
  disc(c,-1,-34+sway,34,24,'#df905a');
  disc(c,8,-31+sway,19,18,'#ffdcab');
  const gait=run?Math.sin(now*19)*6:0;
  disc(c,-17+gait,-8,10,9,'#f4ac72');disc(c,18-gait,-8,10,9,'#f4ac72');
  c.fillStyle='#df9159';
  polygon(c,[[-23,-66],[-20,-100],[0,-78]],'#df9159');
  polygon(c,[[8,-79],[26,-100],[28,-67]],'#df9159');
  polygon(c,[[-18,-83],[-17,-94],[-7,-80]],'#f1b3a7');
  polygon(c,[[16,-80],[24,-92],[24,-80]],'#f1b3a7');
  disc(c,3,-63+sway,32,28,'#f4ad73');
  disc(c,3,-50+sway,22,13,'#ffe3b8');
  if(Math.floor(now*1.2)%9===0){
    path(c,[[-15,-66],[-5,-66]],ink,2.4);path(c,[[10,-66],[20,-66]],ink,2.4);
  }else{
    disc(c,-9,-66+sway,4,5,ink);disc(c,16,-66+sway,4,5,ink);
    disc(c,-8,-68+sway,1.5,1.7,paper);disc(c,17,-68+sway,1.5,1.7,paper);
  }
  polygon(c,[[0,-57],[8,-57],[4,-52]],'#be796e');
  path(c,[[4,-52],[0,-48],[-3,-49]],'#8e6052',2);
  path(c,[[4,-52],[8,-48],[12,-49]],'#8e6052',2);
  for(let i=0;i<2;i++){
    path(c,[[-19,-54+i*6],[-40,-57+i*8]],'#bb825f',1.6);
    path(c,[[25,-54+i*6],[46,-57+i*8]],'#bb825f',1.6);
  }
  path(c,[[-15,-42],[2,-37],[21,-43]],'#3b928b',5);
  disc(c,3,-36,5,5,'#f9d978');
  if(p.attackTime>0){
    const t=1-p.attackTime/.23;
    c.save();c.translate(27,-28);c.rotate(-.8+Math.sin(t*Math.PI)*1.9);
    disc(c,16,-3,20,10,'#ffc189');
    for(let i=0;i<3;i++)path(c,[[28,-9+i*6],[34,-8+i*6]],'#fff4d7',2);
    c.restore();
    c.globalAlpha=.35;
    for(let i=0;i<3;i++)disc(c,55+i*9,-33-i*7,5,5,'#fff3b4');
    c.globalAlpha=p.hidden?.42:1;
  }
  if(p.hidden){text(c,'…',0,-118,22,'#3b665b');}
  c.restore();
}
export class Scene{
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');
    this.bg=document.createElement('canvas');this.bg.width=W;this.bg.height=H;
    this.cachedLevel=-1;this.particles=[];this.bubbles=[];
    this.camera=0;this.now=0;this.shake=0;this.viewW=W;this.reduced=false;
    this.scaleCss=1;this.offsetX=0;this.offsetY=0;
  }
  reset(){this.particles=[];this.bubbles=[];this.camera=0;this.shake=0;}
  effect(kind,x,y,value=''){
    const count=this.reduced?6:kind==='smash'?24:12;
    const colors=kind==='fish'?['#f7e1a4','#a6d9bb','#ffffff']:['#f8c18f','#ed8b67','#fff3c5','#9cc6b3'];
    for(let i=0;i<count;i++){
      const a=(i/count)*Math.PI*2+Math.random()*.4;
      const velocity=(kind==='smash'?190:100)*(0.45+Math.random()*.8);
      this.particles.push({x,y,vx:Math.cos(a)*velocity,vy:Math.sin(a)*velocity-65,r:3+Math.random()*6,rot:Math.random()*4,life:.7+Math.random()*.45,color:colors[i%colors.length]});
    }
    this.bubbles.push({x,y:y-51,text:value|| (kind==='fish'?'+90':kind==='smash'?'CRASH!':'POW!'),time:1.3});
    if(kind==='smash'&&!this.reduced)this.shake=Math.min(13,this.shake+5);
  }
  update(dt,game){
    this.now+=dt;this.shake=Math.max(0,this.shake-35*dt);
    const v=this.viewW;
    this.camera=mix(this.camera,clamp(game.player.x-v*.46,0,W-v),Math.min(1,dt*8));
    for(const p of this.particles){
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=600*dt;p.rot+=dt*5;p.life-=dt;
    }
    this.particles=this.particles.filter(p=>p.life>0).slice(-150);
    for(const p of this.bubbles){p.y-=22*dt;p.time-=dt;}
    this.bubbles=this.bubbles.filter(p=>p.time>0).slice(-10);
  }
  render(game){
    const canvas=this.canvas,ctx=this.ctx;
    const box=canvas.getBoundingClientRect();
    const dpr=Math.min(devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(box.width*dpr)),h=Math.max(1,Math.round(box.height*dpr));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    this.viewW=matchMedia('(max-width: 780px)').matches?710:W;
    this.camera=clamp(this.camera,0,W-this.viewW);
    // Contain the illustrated 2D world without stretching on ultrawide,
    // laptop, portrait mobile or browser fullscreen.
    const scale=Math.min(w/this.viewW,h/H);
    const offsetX=(w-this.viewW*scale)/2;
    const offsetY=(h-H*scale)/2;
    this.scaleCss=scale/dpr;
    this.offsetX=offsetX/dpr;
    this.offsetY=offsetY/dpr;
    ctx.resetTransform();ctx.clearRect(0,0,w,h);
    ctx.setTransform(scale,0,0,scale,offsetX-this.camera*scale,offsetY);
    if(this.shake&&!this.reduced)ctx.translate(Math.sin(this.now*95)*this.shake,Math.cos(this.now*81)*this.shake*.4);
    if(this.cachedLevel!==game.levelIndex){
      const b=this.bg.getContext('2d');
      b.clearRect(0,0,W,H);backdrop(b,game.levelIndex);
      this.cachedLevel=game.levelIndex;
    }
    ctx.drawImage(this.bg,0,0);
    // Level guide and door that physically opens.
    if(game.exitOpen){
      rr(ctx,890,379,57,76,15,'#a8d8a2');
      for(let i=0;i<4;i++)disc(ctx,911+Math.sin(this.now*3+i)*12,399+i*16,3,4,'#f7e9a7');
      text(ctx,'ESCAPE! →',889,310,17,'#397d5f');
    }else text(ctx,'🔒',919,400,22);
    for(const snack of game.fish)if(!snack.eaten)drawFish(ctx,snack.x,snack.y,this.now+snack.phase);
    // Props drawn in place using custom vector icons. Broken items become particles.
    for(const item of game.props)if(!item.broken){
      disc(ctx,item.x,item.y+4,26,5,'rgba(63,52,47,.16)');
      const pulse=item.flash>0?1+.12*Math.sin(this.now*44):1;
      drawProp(ctx,item.kind,item.x,item.y,pulse);
      if(item.maxHp>1){
        for(let i=0;i<item.hp;i++)disc(ctx,item.x-9+i*18,item.y-61,5,5,'#f4b581');
      }
      if(item.flash>0){
        ctx.strokeStyle='#ffe9a8';ctx.lineWidth=4;ctx.beginPath();ctx.arc(item.x,item.y-15,37,0,Math.PI*2);ctx.stroke();
      }
    }
    drawOwner(ctx,{...game.owner,alert:game.ownerAlert},this.now);
    drawCat(ctx,game.player,this.now);
    for(const p of this.particles){
      ctx.save();ctx.globalAlpha=clamp(p.life,0,1);
      ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      rr(ctx,-p.r/2,-p.r/2,p.r,p.r,2,p.color);ctx.restore();
    }
    for(const b of this.bubbles){
      ctx.save();ctx.globalAlpha=clamp(b.time,0,1);
      ctx.font='900 20px Nunito,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=6;ctx.strokeStyle='#fff9eb';ctx.strokeText(b.text,b.x,b.y);
      ctx.fillStyle='#c66e53';ctx.fillText(b.text,b.x,b.y);ctx.restore();
    }
    if(game.player.hidden){
      text(ctx,'ĐANG NÚP',game.player.x,game.player.y-126,14,'#39705a');
    }
    // Minimal world hints so control intent is always obvious.
    if(game.phase==='playing'&&!game.exitOpen){
      text(ctx,'PHÁ ĐỒ + NHẶT CÁ = MỞ CỬA →',685,28,13,'#577165');
    }
  }
}
