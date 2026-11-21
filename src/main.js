import * as Gyos from 'gyosjs/csp';
import { W, LEVELS, ROUND_SECONDS, createGame, start, tick, jump, attack, setInput, progress, clamp } from './model.js';
import { Scene } from './scene.js';
import { Soundtrack } from './audio.js';
import './style.css';

const STORE='catastrophe.v2.settings',BEST='catastrophe.v2.records';
const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
const format=n=>Math.floor(Number(n)||0).toLocaleString('vi-VN');

Gyos.scope('Cat',()=>{
  const signal=Gyos.signal,computed=Gyos.computed;
  const stored=read(STORE)||{},record=read(BEST)||{};
  const records={
    best:Number.isFinite(record.best)?Math.max(0,record.best):0,
    unlocked:clamp(Number.isInteger(record.unlocked)?record.unlocked:0,0,LEVELS.length-1)
  };
  let game=createGame(0),scene=null,alive=true,raf=0,previous=0,hudClock=0;
  let pausedBeforeMenu=false,wasAlert=false,noticeTimer=0;
  const soundtrack=new Soundtrack();
  const abort=new AbortController();

  const phase=signal('ready'),level=signal(0),score=signal(0),levelScore=signal(0),
    seconds=signal(ROUND_SECONDS),suspicion=signal(0),combo=signal(0),
    broken=signal(0),eaten=signal(0),exitOpen=signal(false),
    zoomies=signal(false),hidden=signal(false),alert=signal(false),
    best=signal(records.best),unlocked=signal(records.unlocked),
    paused=signal(false),menu=signal(''),status=signal('WASD để chạy · SPACE để nhảy · J để tát đồ.'),
    musicVolume=signal(typeof stored.music==='number'?clamp(stored.music,0,1):.68),
    effectsVolume=signal(typeof stored.effects==='number'?clamp(stored.effects,0,1):.9),
    muted=signal(stored.muted===true),reduced=signal(stored.reduced===true);
  soundtrack.setMusicVolume(musicVolume());
  soundtrack.setEffectsVolume(effectsVolume());
  soundtrack.setMuted(muted());
  const levelInfo=computed(()=>LEVELS[level()]);
  const mission=computed(()=>({broken:broken(),goal:LEVELS[level()].breakGoal,eaten:eaten(),fishGoal:LEVELS[level()].fishGoal}));
  const comboLabel=computed(()=>combo()>1?'×'+combo():'—');
  const dangerLabel=computed(()=>suspicion()>78?'SEN ĐANG NỔI ĐIÊN!':suspicion()>44?'Có biến! Trốn lẹ!':'CHƯA BỊ PHÁT HIỆN');
  const statusType=computed(()=>alert()?'danger':exitOpen()?'ready':'normal');
  const controlsHint=computed(()=>hidden()?'SEN KHÔNG THẤY MÀY!':zoomies()?'ZOOMIES MODE ⚡ TĂNG TỐC!':exitOpen()?'Cửa mở rồi! Chạy sang bên phải →':'Đứng gần và đúng hướng để tát trúng đồ.');
  const resultsTitle=computed(()=>
    phase()==='won'?'ĐẠI HỌA TOÀN KHU!':phase()==='cleared'?'THOÁT THÀNH CÔNG!':
    phase()==='caught'?'SEN BẮT QUẢ TANG!':'HẾT GIỜ, ĐỒ VẪN CÒN!');
  const resultsText=computed(()=>
    phase()==='won'?'Một con mèo, ba căn phòng, không còn chút hối lỗi.':
    phase()==='cleared'?'Mèo đã tẩu thoát. Nhưng nhà bên cạnh vẫn còn nguyên đồ.':
    phase()==='caught'?'Mày phá hơi hăng rồi. Lần sau núp dưới sofa nha.':
    'Bình tĩnh thôi. Hãy kiếm combo và mở cửa sớm hơn.');
  const roomOptions=computed(()=>LEVELS.map((l,i)=>({id:i,name:l.name,locked:i>unlocked()})));

  function sync(){
    const p=progress(game);
    Gyos.batch(()=>{
      level(game.levelIndex);phase(game.phase==='cleared'&&game.levelIndex===LEVELS.length-1?'won':game.phase);
      score(game.score);levelScore(game.levelScore);
      seconds(Math.ceil(game.time));suspicion(Math.round(game.suspicion));combo(game.combo);
      broken(p.broken);eaten(p.eaten);exitOpen(game.exitOpen);
      hidden(game.player.hidden);zoomies(game.zoomies>0);alert(game.ownerAlert);
      best(records.best);unlocked(records.unlocked);
    });
  }
  function notice(message,seconds=3){status(message);noticeTimer=seconds;}
  function prefs(){
    save(STORE,{music:musicVolume(),effects:effectsVolume(),muted:muted(),reduced:reduced()});
  }
  function recordResult(){
    if(game.score>records.best)records.best=game.score;
    if(game.phase==='cleared')records.unlocked=Math.max(records.unlocked,Math.min(LEVELS.length-1,game.levelIndex+1));
    if(!save(BEST,records))notice('Không lưu được kỷ lục trong trình duyệt này.');
  }
  function finish(){
    recordResult();scene?.effect(game.phase==='cleared'?'fish':'hit',game.player.x,game.player.y-100);
    if(game.phase==='cleared')soundtrack.sfx('win');else soundtrack.sfx('lose');
    soundtrack.stop();
    clearInput();sync();
    notice(game.phase==='cleared'?'Meow! Đã mở được đường thoát!':'Sen đã biết chuyện gì xảy ra.');
  }
  function onEvents(events){
    for(const event of events){
      if(event.kind==='fish'){
        scene.effect('fish',event.x,event.y,'+90 FISH');
        soundtrack.sfx('fish');notice('Cá ngừ +90! Thực sự rất đáng công nhảy lên.');
      }else if(event.kind==='spotted'){
        scene.effect('hit',game.player.x,game.player.y-120,'SEN THẤY!');
        soundtrack.sfx('spot');notice('SEN THẤY MÀY RỒI! CHẠY! 🏃');
      }else if(event.kind==='caught'||event.kind==='cleared'||event.kind==='timeout'){
        finish();
      }
    }
  }
  function swipe(){
    if(paused()||menu()||game.phase!=='playing')return;
    const result=attack(game);
    if(!result)return;
    if(result.miss){soundtrack.sfx('hit');notice('Tát trượt! Phải đứng gần và quay mặt về phía đồ vật.',1.7);}
    else{
      for(const hit of result.hits){
        scene.effect(hit.broken?'smash':'hit',hit.x,hit.y-12,
          hit.broken?'+'+format(hit.points)+' · ×'+hit.combo:'RẮC!');
        soundtrack.sfx(hit.broken?'break':'hit');
      }
      notice(result.hits.some(h=>h.broken)?
        'BỐP! '+result.hits.map(h=>h.name).join(' + ')+' bay màu.':
        'Đồ còn cứng đó. Tát thêm phát nữa!',2.0);
    }
    sync();
    if(game.phase==='caught')finish();
  }
  function leap(){
    if(paused()||menu())return;
    if(jump(game)){soundtrack.sfx('jump');scene.effect('dust',game.player.x,game.player.y); }
  }
  function setControl(key,down){
    if(game.phase==='playing'&&!paused()&&!menu())setInput(game,key,down);
    else setInput(game,key,false);
  }
  function clearInput(){for(const k of Object.keys(game.input))setInput(game,k,false);}
  function pause(on=!paused()){
    if(game.phase!=='playing')return;
    paused(!!on);clearInput();
    if(on){void soundtrack.suspend();notice('Mèo đang nghỉ ngơi.');}
    else{void soundtrack.resume().catch(()=>{});previous=0;}
  }
  function openMenu(kind){
    if(menu())return;
    pausedBeforeMenu=paused();
    if(game.phase==='playing')pause(true);
    menu(kind);
  }
  function closeMenu(){
    if(!menu())return;
    menu('');
    if(game.phase==='playing'&&!pausedBeforeMenu)pause(false);
  }
  function begin(){
    if(!start(game))return;
    paused(false);
    notice('Chạy, nhảy, tát — gom cá ngừ rồi trốn sang phải! 😼');
    sync();
    // start() is invoked on a real button click; audio context unlocks in this gesture.
    void soundtrack.start().catch(()=>notice('Trình duyệt chặn âm thanh; thử click lại nút nhạc.'));
  }
  function restart(){
    const index=game.levelIndex,carry=Math.max(0,game.score-game.levelScore);
    game=createGame(index,carry);
    scene?.reset();clearInput();paused(false);menu('');previous=0;wasAlert=false;
    soundtrack.stop();notice('Lần này không để sen bắt nhé.');
    sync();
  }
  function startOver(){
    game=createGame(0);scene?.reset();clearInput();paused(false);menu('');previous=0;
    soundtrack.stop();notice('Cuộc đời mới. Cái bình mới. Mèo cũ.');sync();
  }
  function nextRoom(){
    if(game.phase!=='cleared')return;
    if(game.levelIndex===LEVELS.length-1){startOver();return;}
    game=createGame(game.levelIndex+1,game.score);
    scene?.reset();clearInput();paused(false);menu('');previous=0;wasAlert=false;
    notice('Chào mừng đến '+LEVELS[game.levelIndex].name+'!');sync();
  }
  function selectRoom(index){
    if(game.phase==='playing'||index>records.unlocked||index<0||!LEVELS[index])return;
    game=createGame(index,0);scene?.reset();clearInput();paused(false);menu('');previous=0;
    soundtrack.stop();notice(LEVELS[index].subtitle);sync();
  }
  function setMusic(event){
    const amount=clamp(Number(event.target.value)/100);
    musicVolume(amount);soundtrack.setMusicVolume(amount);prefs();
    if(amount>0&&muted()){muted(false);soundtrack.setMuted(false);prefs();}
  }
  function setEffects(event){
    const amount=clamp(Number(event.target.value)/100);
    effectsVolume(amount);soundtrack.setEffectsVolume(amount);prefs();
    if(amount>0){if(muted()){muted(false);soundtrack.setMuted(false);}soundtrack.sfx('fish');}
  }
  function toggleSound(){
    const next=!muted();muted(next);soundtrack.setMuted(next);prefs();
    if(!next)void soundtrack.resume().then(()=>soundtrack.sfx('fish')).catch(()=>{});
  }
  function toggleMotion(){
    reduced(!reduced());if(scene)scene.reduced=reduced()||matchMedia('(prefers-reduced-motion:reduce)').matches;prefs();
  }
  function testAudio(){
    void soundtrack.unlock().then(ok=>{
      if(!ok){notice('Trình duyệt này không có Web Audio.');return;}
      soundtrack.sfx('break');
      const t=soundtrack.ctx.currentTime;
      [523.25,659.25,783.99].forEach((f,i)=>
        soundtrack.tone(f,t+i*.12,.4,.17,'triangle'));
      notice('Âm thanh test: tách! ting! Nhạc sẽ phát khi bắt đầu game.');
    }).catch(()=>notice('Không thể bật loa. Kiểm tra quyền âm thanh và volume hệ thống.'));
  }
  function codeKey(event,down){
    if(event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.target instanceof Element&&event.target.closest('input,textarea,select'))return;
    const k=event.key.toLowerCase();
    if(menu()){if(k==='escape'&&!down)closeMenu();return;}
    if(['arrowleft','arrowright','arrowup',' ','j','k','x','a','d','w','c','s','shift','p','escape'].includes(k))event.preventDefault();
    if(k==='a'||k==='arrowleft')setControl('left',down);
    if(k==='d'||k==='arrowright')setControl('right',down);
    if(k==='c'||k==='s'||k==='arrowdown')setControl('crouch',down);
    if(k==='shift')setControl('sprint',down);
    if(!down)return;
    if(k==='w'||k===' '||k==='arrowup'){if(!event.repeat)leap();}
    if(k==='j'||k==='k'||k==='x'){if(!event.repeat)swipe();}
    if(k==='p'||k==='escape'){if(!event.repeat)pause();}
  }
  function bindButtons(){
    // Hold controls work on touch. Pointer capture prevents stuck movement.
    for(const [id,key] of [['mobile-left','left'],['mobile-right','right'],['mobile-hide','crouch'],['mobile-sprint','sprint']]){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',e=>{
        if(game.phase!=='playing')return;
        e.preventDefault();el.setPointerCapture(e.pointerId);setControl(key,true);
      },{signal:abort.signal});
      const release=()=>setControl(key,false);
      el.addEventListener('pointerup',release,{signal:abort.signal});
      el.addEventListener('pointercancel',release,{signal:abort.signal});
      el.addEventListener('lostpointercapture',release,{signal:abort.signal});
    }
    // Canvas clicks attack only from the cat's actual location.
    const canvas=document.getElementById('world');
    canvas?.addEventListener('pointerdown',event=>{
      if(game.phase!=='playing'||paused()||menu())return;
      const r=canvas.getBoundingClientRect();
      const v=scene.viewW;
      const clickX=scene.camera+(event.clientX-r.left)/r.width*v;
      if(Math.abs(clickX-game.player.x)<170)
        game.player.face=clickX>=game.player.x?1:-1;
      swipe();
    },{signal:abort.signal});
  }
  async function share(){
    const story=`🐈 Catastrophe 2: tao phá ${broken()}/${LEVELS[level()].objects.length} đồ ở ${LEVELS[level()].name} và kiếm ${format(score())} điểm! Thử vượt tao xem: ${new URL('./',location.href).href}`;
    try{await navigator.clipboard.writeText(story);notice('Đã copy chiến tích. Đem đi cà khịa bạn bè!');}
    catch{window.prompt('Copy chiến tích này:',story);}
  }
  function loop(now){
    if(!alive)return;
    const delta=previous?Math.min(.05,(now-previous)/1000):0;
    previous=now;
    if(!document.hidden&&scene){
      if(game.phase==='playing'&&!paused()&&!menu()){
        const events=tick(game,delta);
        if(game.ownerAlert&&!wasAlert&&events.every(e=>e.kind!=='spotted')){
          soundtrack.sfx('spot');notice('Á! Sen vừa quay đầu nhìn về phía mày!');
        }
        wasAlert=game.ownerAlert;
        onEvents(events);
        soundtrack.update();
      }
      scene.update(paused()?0:delta,game);
      scene.render(game);
      hudClock+=delta;
      if(hudClock>=.095){sync();hudClock=0;}
      if(noticeTimer>0){noticeTimer-=delta;if(noticeTimer<=0)status(controlsHint());}
    }
    raf=requestAnimationFrame(loop);
  }

  sync();
  return {
    phase,level,score,levelScore,seconds,suspicion,combo,broken,eaten,exitOpen,
    hidden,zoomies,alert,best,unlocked,paused,menu,status,
    musicVolume,effectsVolume,muted,reduced,
    levelInfo,mission,comboLabel,dangerLabel,statusType,controlsHint,resultsTitle,resultsText,roomOptions,
    format,scoreText:()=>format(score()),bestText:()=>format(best()),
    dangerStyle:()=>'width:'+suspicion()+'%',
    musicPercent:()=>Math.round(musicVolume()*100),effectsPercent:()=>Math.round(effectsVolume()*100),
    isResult:()=>['cleared','caught','timeout','won'].includes(phase()),
    roomStyle:r=>r.locked?'room-card locked':r.id===level()?'room-card current':'room-card',
    leap,swipe,begin,restart,startOver,nextRoom,selectRoom,share,toggleSound,
    pauseClick:()=>pause(),showHelp:()=>openMenu('help'),showSettings:()=>openMenu('settings'),
    closeMenu,setMusic,setEffects,toggleMotion,testAudio,
    onMount(){
      const canvas=document.getElementById('world');
      if(!canvas)return;
      scene=new Scene(canvas);
      scene.reduced=reduced()||matchMedia('(prefers-reduced-motion:reduce)').matches;
      bindButtons();
      const media=matchMedia('(prefers-reduced-motion:reduce)');
      media.addEventListener('change',()=>{if(scene)scene.reduced=reduced()||media.matches;},{signal:abort.signal});
      window.addEventListener('keydown',e=>codeKey(e,true),{signal:abort.signal});
      window.addEventListener('keyup',e=>codeKey(e,false),{signal:abort.signal});
      window.addEventListener('blur',()=>{clearInput();if(game.phase==='playing')pause(true);},{signal:abort.signal});
      document.addEventListener('visibilitychange',()=>{
        if(document.hidden){clearInput();if(game.phase==='playing')pause(true);}
        previous=0;
      },{signal:abort.signal});
      if(import.meta.env.DEV)window.__catastrophe={
        snapshot:()=>structuredClone(game),
        reset:restart,begin,swipe,leap,
        press:(key,on)=>setControl(key,on),
        audio:()=>({state:soundtrack.ctx?.state||'not-started',playing:soundtrack.playing,muted:soundtrack.muted})
      };
      raf=requestAnimationFrame(loop);
    },
    onUnmount(){
      alive=false;abort.abort();cancelAnimationFrame(raf);
      void soundtrack.close();if(import.meta.env.DEV)delete window.__catastrophe;
    }
  };
});
Gyos.mountAll();
