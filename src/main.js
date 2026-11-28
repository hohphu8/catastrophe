import * as Gyos from 'gyosjs/csp';
import { W, LEVELS, ROUND_SECONDS, createGame, start, tick, jump, attack, setInput, progress, clamp } from './model.js';
import { Scene } from './scene.js';
import { Soundtrack } from './audio.js';
import { ACTIONS, InputManager, keyAction, keySource } from './input.js';
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
    muted=signal(stored.muted===true),reduced=signal(stored.reduced===true),
    isFullscreen=signal(!!document.fullscreenElement);
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
  // A source is a physical key or a pointer ID, never just a shared bool.
  // This preserves keys held together and resolves left/right by most recent press.
  const pressedKeys=new Set();
  const inputManager=new InputManager(state=>{
    const enabled=game.phase==='playing'&&!paused()&&!menu();
    for(const action of ACTIONS)setInput(game,action,enabled&&state[action]);
    updatePadState();
  });
  function updatePadState(){
    for(const [id,action] of [['mobile-left','left'],['mobile-right','right'],['mobile-hide','crouch'],['mobile-sprint','sprint']]){
      const element=document.getElementById(id);
      if(element)element.classList.toggle('is-held',inputManager.isHeld(action));
    }
  }

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
    const source='debug:'+key;
    if(down&&game.phase==='playing'&&!paused()&&!menu())inputManager.hold(source,key);
    else inputManager.release(source);
  }
  function clearInput(){
    inputManager.clear();
    pressedKeys.clear();
    for(const key of Object.keys(game.input))setInput(game,key,false);
    updatePadState();
  }
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
    // On phones the title/intro should not sit between the player and controls.
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
    if((game.phase==='playing'&&menu()!=='chapters')||index>records.unlocked||index<0||!LEVELS[index])return;
    game=createGame(index,0);scene?.reset();clearInput();paused(false);menu('');previous=0;
    soundtrack.stop();notice(LEVELS[index].subtitle);sync();
  }
  function setMusic(event){
    const amount=clamp(Number(event.target.value)/100,0,1);
    musicVolume(amount);soundtrack.setMusicVolume(amount);prefs();
    if(amount>0&&muted()){muted(false);soundtrack.setMuted(false);prefs();}
  }
  function setEffects(event){
    const amount=clamp(Number(event.target.value)/100,0,1);
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
  async function toggleFullscreen(){
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
      else notice('Trình duyệt không hỗ trợ fullscreen. Game vẫn vừa màn hình trình duyệt.');
    }catch{notice('Trình duyệt đã chặn fullscreen. Game vẫn vừa màn hình trình duyệt.');}
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
    const action=keyAction(event);
    if(!action)return;
    const source=keySource(event);
    // Process releases regardless of modifiers, focus or menu state. If a keyup
    // never arrives, InputManager also expires its orphaned keyboard hold.
    if(!down){
      inputManager.release(source);
      pressedKeys.delete(source);
      return;
    }
    if(event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;
    if(event.target instanceof Element&&event.target.closest('input,textarea,select'))return;
    event.preventDefault();
    if(menu()){
      if(action==='pause'&&event.code==='Escape'&&!event.repeat)closeMenu();
      return;
    }
    if(event.repeat){
      // A repeat refreshes liveness; it MUST NOT change left/right priority.
      if(pressedKeys.has(source))inputManager.heartbeat(source);
      return;
    }
    // A fresh non-repeated down is authoritative, even if an earlier keyup was
    // lost and the old entry is still in the Set. Restore correct priority.
    if(pressedKeys.has(source)){
      pressedKeys.delete(source);
      inputManager.release(source);
    }
    pressedKeys.add(source);
    if(ACTIONS.includes(action)){
      if(game.phase==='playing'&&!paused())inputManager.hold(source,action);
    }else if(action==='jump')leap();
    else if(action==='attack')swipe();
    else if(action==='pause')pause();
  }
  function bindButtons(){
    // Track each pointer individually. Global release + capture loss are the safety net
    // when a finger slides away, a gesture is cancelled or two fingers overlap.
    for(const [id,action] of [['mobile-left','left'],['mobile-right','right'],['mobile-hide','crouch'],['mobile-sprint','sprint']]){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',event=>{
        if(game.phase!=='playing'||paused()||menu())return;
        if(event.pointerType==='mouse'&&event.button!==0)return;
        event.preventDefault();
        try{el.setPointerCapture(event.pointerId);}catch{/* Global release is still registered. */}
        inputManager.hold('pointer:'+event.pointerId,action);
      },{signal:abort.signal});
      el.addEventListener('pointerup',event=>inputManager.releasePointer(event.pointerId),{signal:abort.signal});
      el.addEventListener('pointercancel',event=>inputManager.releasePointer(event.pointerId),{signal:abort.signal});
      el.addEventListener('lostpointercapture',event=>inputManager.releasePointer(event.pointerId),{signal:abort.signal});
      el.addEventListener('contextmenu',event=>event.preventDefault(),{signal:abort.signal});
    }
    // Actions fire once on pointerdown, avoiding synthesized touch click/double hit.
    // Screen-reader and keyboard activation is retained through detail === 0 click.
    for(const [id,perform] of [['mobile-jump',leap],['mobile-attack',swipe]]){
      const el=document.getElementById(id);if(!el)continue;
      el.addEventListener('pointerdown',event=>{
        if(event.pointerType==='mouse'&&event.button!==0)return;
        event.preventDefault();perform();
      },{signal:abort.signal});
      el.addEventListener('click',event=>{if(event.detail===0)perform();},{signal:abort.signal});
      el.addEventListener('contextmenu',event=>event.preventDefault(),{signal:abort.signal});
    }
    // Canvas clicks attack only from the cat's actual location.
    const canvas=document.getElementById('world');
    canvas?.addEventListener('pointerdown',event=>{
      if(game.phase!=='playing'||paused()||menu())return;
      const r=canvas.getBoundingClientRect();
      const v=scene.viewW;
      const clickX=scene.camera+(event.clientX-r.left-scene.offsetX)/scene.scaleCss;
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
        // This detects missing keyup events during rapid A/D + Space + mouse
        // combinations, avoiding movement that continues indefinitely.
        const expired=inputManager.expireKeyboard(now);
        for(const source of expired)pressedKeys.delete(source);
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
    musicVolume,effectsVolume,muted,reduced,isFullscreen,
    levelInfo,mission,comboLabel,dangerLabel,statusType,controlsHint,resultsTitle,resultsText,roomOptions,
    format,appClass:()=>phase()==='ready'?'':'is-playing',
    scoreText:()=>format(score()),bestText:()=>format(best()),
    dangerStyle:()=>'width:'+suspicion()+'%',
    musicPercent:()=>Math.round(musicVolume()*100),effectsPercent:()=>Math.round(effectsVolume()*100),
    isResult:()=>['cleared','caught','timeout','won'].includes(phase()),
    roomStyle:r=>r.locked?'room-card locked':r.id===level()?'room-card current':'room-card',
    leap,swipe,begin,restart,startOver,nextRoom,selectRoom,share,toggleSound,toggleFullscreen,
    pauseClick:()=>pause(),showHelp:()=>openMenu('help'),showSettings:()=>openMenu('settings'),
    showChapters:()=>openMenu('chapters'),
    closeMenu,setMusic,setEffects,toggleMotion,testAudio,
    onMount(){
      const canvas=document.getElementById('world');
      if(!canvas)return;
      scene=new Scene(canvas);
      scene.reduced=reduced()||matchMedia('(prefers-reduced-motion:reduce)').matches;
      bindButtons();
      const media=matchMedia('(prefers-reduced-motion:reduce)');
      media.addEventListener('change',()=>{if(scene)scene.reduced=reduced()||media.matches;},{signal:abort.signal});
      document.addEventListener('fullscreenchange',()=>isFullscreen(!!document.fullscreenElement),{signal:abort.signal});
      // Capture input before UI buttons/links receive it. A click or changing
      // focus within the app must not steal the eventual keyup from gameplay.
      window.addEventListener('keydown',e=>codeKey(e,true),{capture:true,signal:abort.signal});
      window.addEventListener('keyup',e=>codeKey(e,false),{capture:true,signal:abort.signal});
      window.addEventListener('pointerup',e=>inputManager.releasePointer(e.pointerId),{signal:abort.signal});
      window.addEventListener('pointercancel',e=>inputManager.releasePointer(e.pointerId),{signal:abort.signal});
      window.addEventListener('pagehide',clearInput,{signal:abort.signal});
      window.addEventListener('orientationchange',clearInput,{signal:abort.signal});
      window.addEventListener('blur',()=>{clearInput();if(game.phase==='playing')pause(true);},{signal:abort.signal});
      document.addEventListener('visibilitychange',()=>{
        if(document.hidden){clearInput();if(game.phase==='playing')pause(true);}
        previous=0;
      },{signal:abort.signal});
      if(import.meta.env.DEV)window.__catastrophe={
        snapshot:()=>structuredClone(game),
        reset:restart,begin,swipe,leap,
        press:(key,on)=>setControl(key,on),
        inputs:()=>({sources:[...inputManager.sources.entries()],state:inputManager.snapshot(),keys:[...pressedKeys]}),
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
