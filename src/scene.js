import { WIDTH, HEIGHT, ROOMS } from './model.js';

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;

function rounded(ctx, x, y, w, h, r, color, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (color) { ctx.fillStyle = color; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function line(ctx, points, color, width = 3) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.stroke();
}

function roomShell(ctx, room, clock) {
  const palette = ['#fae4d4', '#edf0d9', '#e6e3f1'][room];
  const wallpaper = ctx.createLinearGradient(0, 0, 0, 420);
  wallpaper.addColorStop(0, '#fffcf5');
  wallpaper.addColorStop(1, palette);
  ctx.fillStyle = wallpaper; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  // Light rays and fine dotted wallpaper.
  ctx.fillStyle = 'rgba(255,255,255,.27)';
  ctx.beginPath(); ctx.moveTo(64, 104); ctx.lineTo(365, 400);
  ctx.lineTo(505, 400); ctx.lineTo(225, 105); ctx.fill();
  ctx.fillStyle = 'rgba(102,74,60,.055)';
  for (let y = 35; y < 407; y += 28) for (let x = 22; x < WIDTH; x += 29)
    ellipse(ctx, x + (y % 3) * 6, y, 1.3, 1.3, 'rgba(94,70,51,.07)');

  // Tall sunlit window.
  rounded(ctx, 54, 71, 243, 220, 21, '#fff8ee', '#b88870');
  rounded(ctx, 66, 83, 219, 196, 11, '#bfe4e7');
  ctx.save(); ctx.beginPath(); ctx.rect(66, 83, 219, 196); ctx.clip();
  ellipse(ctx, 228, 113, 36, 36, '#fff4be');
  ctx.fillStyle = '#e9f1d9';
  ctx.beginPath(); ctx.moveTo(66, 243); ctx.quadraticCurveTo(126, 202, 181, 246);
  ctx.quadraticCurveTo(245, 198, 285, 230); ctx.lineTo(285, 279);
  ctx.lineTo(66, 279); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(175, 83); ctx.lineTo(175, 279);
  ctx.moveTo(66, 184); ctx.lineTo(285, 184); ctx.stroke(); ctx.restore();
  // Curtain and rod.
  line(ctx, [[48,70],[302,70]], '#805f55', 7);
  ctx.fillStyle = room === 1 ? '#adc6a0' : room === 2 ? '#c3bad9' : '#efbba9';
  ctx.beginPath(); ctx.moveTo(51,77); ctx.lineTo(99,77);
  ctx.quadraticCurveTo(120,170,85,265); ctx.lineTo(46,265);
  ctx.quadraticCurveTo(72,161,51,77); ctx.fill();
  ctx.beginPath(); ctx.moveTo(301,77); ctx.lineTo(255,77);
  ctx.quadraticCurveTo(238,166,270,267); ctx.lineTo(308,267);
  ctx.quadraticCurveTo(278,165,301,77); ctx.fill();

  // Wood floor and warm wooden planks.
  ctx.fillStyle = '#e6bc90'; ctx.fillRect(0, 416, WIDTH, 144);
  ctx.fillStyle = '#fff4df'; ctx.fillRect(0, 408, WIDTH, 10);
  ctx.strokeStyle = 'rgba(121,83,55,.14)'; ctx.lineWidth = 2;
  for (let y = 444; y < 560; y += 38) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }
  for (let x = 58; x < 980; x += 150) {
    ctx.beginPath(); ctx.moveTo(x, 448); ctx.lineTo(x - 27, 560); ctx.stroke();
  }
  // Cloud shadows drift by a little.
  ellipse(ctx, 150 + Math.sin(clock * .15) * 6, 461, 200, 12, 'rgba(100,73,48,.055)');
}

function drawPlant(ctx, x, y) {
  rounded(ctx, x - 17, y - 32, 34, 44, [3,3,10,10], '#bc8568');
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 9;
    line(ctx, [[x,y-30],[x+dx,y-75-(i%2)*9]], '#567b5a', 4);
    ellipse(ctx, x+dx*1.5, y-70-(i%2)*11, 12, 20, i%2?'#91b17a':'#6d9875');
  }
}

function furniture(ctx, room) {
  // Rugs keep the room cosy, even during a complete disaster.
  ellipse(ctx, 525, 480, 330, 44, room === 2 ? '#d2bfd1' : room === 1 ? '#c4d5a6' : '#edc0a3');
  ellipse(ctx, 525, 482, 282, 29, room === 2 ? '#e5d5df' : room === 1 ? '#e2e9c8' : '#f7ddc5');
  if (room === 0) {
    // Sofa.
    rounded(ctx, 89, 331, 294, 109, 32, '#7a9e94');
    rounded(ctx, 100, 351, 272, 73, 18, '#9cbbb1');
    rounded(ctx, 102, 319, 106, 77, 27, '#8eafa4');
    rounded(ctx, 215, 319, 154, 77, 27, '#8eafa4');
    rounded(ctx, 100, 388, 272, 53, 17, '#6d9388');
    rounded(ctx, 92, 421, 28, 36, 7, '#765b48');
    rounded(ctx, 353, 421, 28, 36, 7, '#765b48');
    rounded(ctx, 375, 367, 220, 20, 8, '#a77958');
    rounded(ctx, 387, 382, 17, 57, 5, '#9b6c4d');
    rounded(ctx, 566, 382, 17, 57, 5, '#9b6c4d');
    // Floating shelves.
    rounded(ctx, 390, 298, 485, 14, 5, '#a97a5d');
    rounded(ctx, 706, 293, 174, 6, 3, '#7d5443');
    rounded(ctx, 628, 368, 275, 18, 5, '#a97a5d');
    rounded(ctx, 649, 382, 17, 54, 5, '#9d7054');
    rounded(ctx, 877, 382, 17, 54, 5, '#9d7054');
    // Fake television backing.
    rounded(ctx, 662, 92, 155, 119, 13, '#6c7772', '#53635d');
    rounded(ctx, 670, 100, 139, 103, 8, '#9ed2c0');
    line(ctx, [[689,169],[726,137],[750,155],[784,116]], '#5d9b92', 8);
    rounded(ctx, 733, 212, 15, 24, 3, '#6c7772');
  } else if (room === 1) {
    rounded(ctx, 86, 352, 832, 89, 10, '#a4b7a0');
    for (let x = 105; x < 904; x+=164) {
      rounded(ctx, x, 365, 146, 62, 7, '#cbd8be');
      rounded(ctx, x+61, 380, 29, 5, 2, '#7e9e82');
    }
    rounded(ctx, 75, 343, 854, 17, 6, '#d7aa82');
    rounded(ctx, 664, 266, 239, 16, 5, '#b78965');
    rounded(ctx, 95, 270, 208, 16, 5, '#b78965');
    // Extractor hood.
    rounded(ctx, 461, 83, 143, 51, 7, '#a2bab1');
    ctx.beginPath(); ctx.moveTo(461,131); ctx.lineTo(604,131);
    ctx.lineTo(636,206); ctx.lineTo(430,206); ctx.fillStyle='#b4c9be'; ctx.fill();
    rounded(ctx, 430, 201, 206, 15, 5, '#8fa9a0');
    for (const x of [475,525,575]) ellipse(ctx, x, 208, 4, 4, '#e4e9d9');
  } else {
    // Desk and storage unit.
    rounded(ctx, 110, 367, 800, 20, 8, '#ab8c7e');
    rounded(ctx, 143, 388, 38, 71, 5, '#9a7b6f');
    rounded(ctx, 840, 388, 38, 71, 5, '#9a7b6f');
    rounded(ctx, 718, 385, 160, 59, 7, '#bfa69a');
    rounded(ctx, 744, 402, 114, 5, 2, '#98796f');
    rounded(ctx, 744, 424, 114, 5, 2, '#98796f');
    rounded(ctx, 654, 261, 211, 15, 5, '#9c8379');
    rounded(ctx, 99, 264, 165, 15, 5, '#9c8379');
    rounded(ctx, 332, 253, 191, 120, 13, '#4d565f');
    rounded(ctx, 340, 261, 175, 104, 9, '#a7c3c0');
    rounded(ctx, 351, 271, 153, 82, 5, '#eaf3e9');
    for(let i=0;i<4;i++) rounded(ctx,360,283+i*15,69+(i%2)*38,5,2, i===1?'#ebae96':'#abc9bc');
    rounded(ctx, 419, 374, 18, 23, 2, '#5d6063');
    rounded(ctx, 387, 391, 80, 8, 3, '#5d6063');
  }
  // Framed motivational cat art.
  rounded(ctx, 893, 86, 79, 102, 12, '#b9896f');
  rounded(ctx, 901, 94, 63, 86, 8, '#fff1d8');
  ellipse(ctx, 932, 143, 20, 18, '#f4ad78');
  line(ctx, [[915,131],[923,119],[932,131],[944,119],[950,133]], '#f4ad78', 6);
  ellipse(ctx, 925, 143, 2, 2, '#6f5144');
  ellipse(ctx, 940, 143, 2, 2, '#6f5144');
  drawPlant(ctx, 946, 435);
}

function drawCat(ctx, cat, clock, reduced, hiding) {
  const blink = Math.floor(clock * 1.7) % 11 === 0;
  const bob = reduced ? 0 : Math.sin(clock * 5.8) * 2;
  const y = cat.y + bob - (cat.jump > 0 ? Math.sin(cat.jump * Math.PI) * 45 : 0);
  ctx.save(); ctx.translate(cat.x, y);
  ellipse(ctx, 0, 6, 42, 9, 'rgba(88,69,55,.15)');
  if (hiding) ctx.globalAlpha = .35;
  ctx.scale(cat.face, 1);
  // Bouncy tail behind the cat.
  ctx.beginPath(); ctx.moveTo(-31,-24);
  ctx.bezierCurveTo(-78,-34,-83,-76,-55,-75);
  ctx.bezierCurveTo(-40,-75,-46,-52,-53,-58);
  ctx.lineWidth=15; ctx.lineCap='round'; ctx.strokeStyle='#dc8954';ctx.stroke();
  ellipse(ctx, 0, -28, 46, 30, '#f3a066');
  ellipse(ctx, 6, -22, 25, 22, '#ffce9a');
  ellipse(ctx, -23, -8, 11, 12, '#f8b47e');
  ellipse(ctx, 24, -8, 11, 12, '#f8b47e');
  // Ears.
  ctx.fillStyle = '#e98c52';
  ctx.beginPath(); ctx.moveTo(-29,-65);ctx.lineTo(-24,-104);ctx.lineTo(-2,-79);
  ctx.moveTo(9,-79);ctx.lineTo(29,-105);ctx.lineTo(34,-62);ctx.fill();
  ctx.fillStyle='#edacaa';ctx.beginPath();
  ctx.moveTo(-23,-80);ctx.lineTo(-21,-94);ctx.lineTo(-11,-79);
  ctx.moveTo(17,-81);ctx.lineTo(27,-94);ctx.lineTo(28,-80);ctx.fill();
  ellipse(ctx, 3, -64, 42, 35, '#ffad6d');
  ellipse(ctx, 2, -48, 24, 16, '#ffdfb6');
  // Expressive face.
  if (blink) {
    line(ctx,[[-19,-69],[-8,-69]],'#433f37',3);
    line(ctx,[[12,-69],[23,-69]],'#433f37',3);
  } else {
    ellipse(ctx,-13,-69,4.5,6,'#403a36');
    ellipse(ctx,17,-69,4.5,6,'#403a36');
    ellipse(ctx,-12,-71,1.5,2,'#fff8ec');
    ellipse(ctx,18,-71,1.5,2,'#fff8ec');
  }
  ctx.beginPath();ctx.moveTo(0,-57);ctx.lineTo(8,-57);ctx.lineTo(4,-51);
  ctx.closePath();ctx.fillStyle='#bc696a';ctx.fill();
  line(ctx,[[4,-51],[0,-47],[-3,-49]],'#785c50',2);
  line(ctx,[[4,-51],[9,-47],[12,-49]],'#785c50',2);
  for(const dir of [-1,1])for(let i=0;i<2;i++)
    line(ctx,[[dir*24,-54+i*6],[dir*47,-60+i*10]],'#a66f57',1.4);
  // Collar + gold bell.
  line(ctx,[[-29,-41],[-14,-35],[25,-38]],'#74a59c',5);
  ellipse(ctx, 7, -33, 5.5, 5.5, '#ecca61');
  if(cat.swipe>0){
    ctx.save();ctx.translate(38,-31);ctx.rotate(-cat.swipe*.7);
    ellipse(ctx,9,0,17,9,'#f7b77e');
    line(ctx,[[13,-5],[23,-5]],'#fce0ba',2);
    ctx.restore();
  }
  ctx.restore();
}

export class Scene {
  constructor(canvas, onSwat) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.onSwat=onSwat;
    this.cat={ x: 485, y: 461, face:1, jump:0, swipe:0 };
    this.clock=0;this.targetId=null;this.hoverId=null;
    this.particles=[];this.labels=[];
    this.reduced=false;this.lastWidth=0;this.lastHeight=0;
  }
  reset(){ this.cat.x=485;this.cat.y=461;this.cat.jump=0;this.cat.swipe=0;this.targetId=null;this.hoverId=null;this.particles=[];this.labels=[]; }
  point(event){
    const r=this.canvas.getBoundingClientRect();
    return { x:(event.clientX-r.left)*WIDTH/r.width, y:(event.clientY-r.top)*HEIGHT/r.height };
  }
  pick(game, event){
    const p=this.point(event);
    return game.props.filter(item=>item.state==='idle')
      .sort((a,b)=>(b.y-a.y))
      .find(item=>Math.hypot(p.x-item.x,p.y-item.y)<45)?.id || null;
  }
  target(game,id){
    if(game.phase!=='playing')return false;
    if(!game.props.some(p=>p.id===id&&p.state==='idle'))return false;
    this.targetId=id; return true;
  }
  burst(x,y,label,color='#ff905d'){
    for(let i=0;i<13;i++){
      const t=Math.PI*2*i/13+(Math.random()*.2);
      const speed=80+Math.random()*170;
      this.particles.push({x,y,vx:Math.cos(t)*speed,vy:Math.sin(t)*speed-70,life:.75+Math.random()*.45,color});
    }
    this.labels.push({x,y,text:label,life:1.1,age:0});
  }
  syncSize(){
    const r=this.canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,Math.floor(r.width*dpr)),h=Math.max(1,Math.floor(r.height*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    this.ctx.setTransform(w/WIDTH,0,0,h/HEIGHT,0,0);
  }
  update(game,delta){
    const dt=clamp(delta,0,.05);
    this.clock+=dt;
    if(game.phase==='playing' && !game.hiding && this.targetId){
      const item=game.props.find(p=>p.id===this.targetId && p.state==='idle');
      if(!item) this.targetId=null;
      else{
        const dx=item.x-this.cat.x;
        if(Math.abs(dx)>47){
          this.cat.face=dx>0?1:-1;
          this.cat.x+=Math.sign(dx)*Math.min(Math.abs(dx)-45,dt*510);
        }else{
          this.targetId=null;
          this.cat.jump=1; this.cat.swipe=.9;
          this.onSwat(item.id,false);
        }
      }
    }
    this.cat.jump=Math.max(0,this.cat.jump-dt*2.8);
    this.cat.swipe=Math.max(0,this.cat.swipe-dt*2.9);
    for(const item of game.props){
      if(item.state!=='flying')continue;
      item.vy+=920*dt;
      item.x+=item.vx*dt;item.y+=item.vy*dt;
      item.angle+=item.spin*dt;
      if(item.y>=459){
        item.y=459;
        if(Math.abs(item.vy)>40){ item.vy*=-.31;item.vx*=.7; }
        else { item.vy=0;item.vx*=.9; }
        if(!item.hitGround){
          item.hitGround=true;this.burst(item.x,item.y,'CRASH!','#f4b184');
        }
        if(Math.abs(item.vx)<4&&Math.abs(item.vy)<4) item.state='settled';
      }
      item.x=clamp(item.x,34,WIDTH-34);
      if(!item.hitGround && item.vy>0){
        const nearby=game.props.find(other=>other.state==='idle' &&
          Math.abs(other.x-item.x)<48 && Math.abs(other.y-item.y)<65);
        if(nearby){ this.onSwat(nearby.id,true);item.vx*=.7; }
      }
    }
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.life-=dt;}
    this.particles=this.particles.filter(p=>p.life>0).slice(-160);
    for(const label of this.labels){label.age+=dt;label.y-=dt*27;}
    this.labels=this.labels.filter(p=>p.age<p.life).slice(-12);
  }
  draw(game){
    this.syncSize();
    const ctx=this.ctx;ctx.clearRect(0,0,WIDTH,HEIGHT);
    roomShell(ctx,game.roomIndex,this.clock);
    furniture(ctx,game.roomIndex);
    // Light stripes over props, labels only show on hover.
    for(const p of game.props){
      if(p.state==='settled')continue;
      const idle=p.state==='idle';
      const wobble=idle&&!this.reduced?Math.sin(this.clock*2+p.x)*1.3:0;
      const y=p.y+wobble;
      ctx.save();ctx.translate(p.x,y);
      if(!idle) ctx.rotate(p.angle);
      if(idle){
        ellipse(ctx,0,24,26,6,'rgba(73,58,49,.12)');
        if(this.hoverId===p.id||this.targetId===p.id){
          ellipse(ctx,0,0,34,34,'rgba(255,255,255,.73)');
          ctx.beginPath();ctx.arc(0,0,37,0,Math.PI*2);
          ctx.strokeStyle='#f08b55';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.stroke();ctx.setLineDash([]);
        }
      }
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='44px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
      ctx.fillText(p.emoji,0,0);
      ctx.restore();
    }
    drawCat(ctx,this.cat,this.clock,this.reduced,game.hiding>0);
    if(this.targetId){
      const item=game.props.find(p=>p.id===this.targetId);
      if(item){
        ctx.strokeStyle='#f08b55';ctx.lineWidth=3;
        ctx.setLineDash([6,8]);ctx.beginPath();ctx.arc(item.x,item.y,43+Math.sin(this.clock*8)*2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      }
    }
    for(const p of this.particles){
      ctx.globalAlpha=clamp(p.life,0,1);
      ellipse(ctx,p.x,p.y,3.5,3.5,p.color);
    }
    ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(const label of this.labels){
      ctx.globalAlpha=clamp(label.life-label.age,0,1);
      ctx.font='900 21px system-ui,sans-serif';
      ctx.lineWidth=5;ctx.strokeStyle='#fff9ed';ctx.strokeText(label.text,label.x,label.y-47);
      ctx.fillStyle='#9c5636';ctx.fillText(label.text,label.x,label.y-47);
    }
    ctx.globalAlpha=1;
    if(this.hoverId && game.phase==='playing'){
      const p=game.props.find(item=>item.id===this.hoverId&&item.state==='idle');
      if(p){
        const text=p.name+' · +'+p.value;
        ctx.font='700 16px system-ui,sans-serif';
        const width=ctx.measureText(text).width+30;
        const x=clamp(p.x-width/2,10,WIDTH-width-10),y=clamp(p.y-83,16,HEIGHT-50);
        rounded(ctx,x,y,width,36,13,'#34483e');
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff8ec';ctx.fillText(text,x+width/2,y+18);
      }
    }
    if(game.phase==='ended'&&game.outcome==='caught'){
      ctx.fillStyle='rgba(83,55,44,.13)';ctx.fillRect(0,0,WIDTH,HEIGHT);
    }
  }
}
