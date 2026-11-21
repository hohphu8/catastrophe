import * as Gyos from 'gyosjs/csp';
import { createGame, startRound, swat, hide, tick, roomProgress, ROOMS, DURATION } from './model.js';
import { Scene } from './scene.js';
import './style.css';

const BEST_KEY = 'catastrophe.best.v1';
const PREF_KEY = 'catastrophe.prefs.v1';
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
const niceNumber = value => Number(value).toLocaleString('vi-VN');

Gyos.scope('Cat', () => {
  const signal = Gyos.signal;
  const computed = Gyos.computed;
  let savedBest = [0, 0, 0];
  try {
    const raw = JSON.parse(read(BEST_KEY) || '[]');
    if (Array.isArray(raw)) savedBest = savedBest.map((_, i) => {
      const n = Number(raw[i]); return Number.isSafeInteger(n) && n >= 0 && n < 1e9 ? n : 0;
    });
  } catch { /* Fresh player */ }

  let prefs = {};
  try { prefs = JSON.parse(read(PREF_KEY) || '{}') || {}; } catch { /* no preferences */ }
  let game = createGame(0), scene = null, audio = null, animationFrame = 0;
  let alive = true, lastFrame = 0, hudTime = 0, toastClock = 0;
  const lifetime = new AbortController();

  const room = signal(0);
  const phase = signal('ready');
  const paused = signal(false);
  const help = signal(false);
  const sound = signal(prefs.sound === true);
  const reduced = signal(prefs.reduced === true);
  const score = signal(0);
  const remaining = signal(DURATION);
  const suspicion = signal(0);
  const combo = signal(0);
  const hiding = signal(0);
  const cooldown = signal(0);
  const destroyed = signal(0);
  const targets = signal([]);
  const best = signal(0);
  const announcement = signal('Mọi thứ đều nguyên vẹn. Tạm thời thôi...');
  const toast = signal('');
  const result = signal('');
  const roomInfo = computed(() => ROOMS[room()]);
  const riskLabel = computed(() => suspicion() > 77 ? 'SEN SẮP TỚI!' : suspicion() > 45 ? 'Hơi bị nghi ngờ…' : 'An toàn (chắc vậy)');
  const hidingText = computed(() => hiding() > 0 ? 'Đang núp...' : cooldown() > 0 ? 'Trốn lại sau ' + Math.ceil(cooldown()) + 's' : 'Núp sau sofa');
  const endHeading = computed(() => result() === 'caught' ? 'SEN BẮT QUẢ TANG! 🚨' : result() === 'clean' ? 'KHÔNG CÒN GÌ ĐỂ PHÁ 🎉' : 'HẾT GIỜ RỒI! ⏰');
  const endLine = computed(() => result() === 'caught' ? 'Bị bắt rồi. Nhưng nhìn đống đồ vỡ cũng đáng.' : result() === 'clean' ? 'Một căn phòng gọn gàng… theo định nghĩa của mèo.' : 'Sen vẫn chưa biết thủ phạm. Mày thắng về mặt đạo đức.');
  const progressText = computed(() => destroyed() + ' / 10 món đã bay màu');

  function syncUI(includeTargets = false) {
    Gyos.batch(() => {
      room(game.roomIndex);
      phase(game.phase);
      score(game.score);
      remaining(Math.ceil(game.timeLeft));
      suspicion(Math.round(game.suspicion));
      combo(game.combo);
      hiding(game.hiding);
      cooldown(game.hideCooldown);
      destroyed(roomProgress(game));
      best(savedBest[game.roomIndex] || 0);
      if (includeTargets) targets(game.props.map(item => ({
        id: item.id, name: item.name, emoji: item.emoji, state: item.state, value: item.value
      })));
    });
  }

  function savePrefs() {
    write(PREF_KEY, JSON.stringify({ sound: sound(), reduced: reduced() }));
  }

  function notify(text) {
    announcement(text);
    toast(text);
    toastClock = 3.3;
  }

  function beep(kind = 'hit') {
    if (!sound() || document.hidden) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio ||= new Audio();
      if (audio.state === 'suspended') void audio.resume().catch(() => {});
      const now = audio.currentTime;
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      oscillator.type = kind === 'alarm' ? 'sawtooth' : kind === 'hide' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(kind === 'alarm' ? 270 : kind === 'hide' ? 480 : 520, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === 'alarm' ? 180 : kind === 'hide' ? 280 : 180, now + .17);
      volume.gain.setValueAtTime(.0001, now);
      volume.gain.exponentialRampToValueAtTime(.045, now + .018);
      volume.gain.exponentialRampToValueAtTime(.0001, now + .20);
      oscillator.connect(volume).connect(audio.destination);
      oscillator.start(now); oscillator.stop(now + .21);
    } catch { /* Audio errors must never affect the game. */ }
  }

  function saveBest() {
    if (game.score > savedBest[game.roomIndex]) {
      savedBest[game.roomIndex] = game.score;
      if (!write(BEST_KEY, JSON.stringify(savedBest)))
        notify('Không lưu được kỷ lục trên trình duyệt này.');
    }
  }

  function finish() {
    if (game.phase !== 'ended' || phase() === 'ended') return;
    result(game.outcome || 'time');
    saveBest();
    scene.targetId = null;
    syncUI(true);
    if (game.outcome === 'caught') beep('alarm');
  }

  function hit(id, chain = false) {
    if (paused() || !alive) return;
    const event = swat(game, id, chain);
    if (!event) return;
    scene.burst(event.item.x, event.item.y,
      (chain ? 'CHAIN! ' : '') + '+' + niceNumber(event.gain),
      chain ? '#8ab4a0' : '#ff956d');
    beep('hit');
    const remarks = [
      'Mèo nhìn cái ' + event.item.name.toLowerCase() + ' và chọn bạo lực.',
      'BỐP! ' + event.item.name + ' đã rời khỏi cuộc chơi.',
      'Sen ơi, tự nhiên đồ nó rơi đó nha. 🐾',
      'Meow! Hoàn toàn là tai nạn có chủ đích.'
    ];
    notify(chain ? 'DOMINO! ' + event.item.name + ' đổ theo! ×' + event.combo :
      remarks[game.attacks % remarks.length]);
    syncUI(true);
    finish();
  }

  function makeScene() {
    const canvas = document.getElementById('world');
    if (!canvas) return;
    scene = new Scene(canvas, hit);
    scene.reduced = reduced() || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = event => {
      if (!scene || game.phase !== 'playing' || paused() || game.hiding > 0) return;
      const id = scene.pick(game, event);
      if (id) queue(id);
    };
    const move = event => {
      if (!scene) return;
      scene.hoverId = game.phase === 'playing' ? scene.pick(game, event) : null;
      canvas.style.cursor = scene.hoverId ? 'pointer' : 'default';
    };
    canvas.addEventListener('pointerdown', pointer, { signal: lifetime.signal });
    canvas.addEventListener('pointermove', move, { signal: lifetime.signal });
    canvas.addEventListener('pointerleave', () => {
      if (scene) scene.hoverId = null;
    }, { signal: lifetime.signal });
    scene.draw(game);
  }

  function queue(id) {
    if (game.phase !== 'playing' || paused() || game.hiding > 0) return;
    if (scene?.target(game, id))
      announcement('Mục tiêu: ' + (game.props.find(p => p.id === id)?.name || 'đồ vô tội') + '. Mèo đang tới!');
  }

  function start() {
    if (startRound(game)) {
      notify('Chúc may mắn. Nhất là cái đồ đạc. 😼');
      syncUI(true);
    }
  }

  function restart() {
    game = createGame(game.roomIndex);
    scene?.reset();
    paused(false);
    result('');
    notify('Phòng đã được phục hồi. Mèo thì chưa hối hận.');
    syncUI(true);
    scene?.draw(game);
  }

  function chooseRoom(index) {
    if (game.phase === 'playing' || !Number.isInteger(index) || !ROOMS[index]) return;
    game = createGame(index);
    scene?.reset();
    paused(false); result('');
    notify(ROOMS[index].tagline);
    syncUI(true);
    scene?.draw(game);
  }

  function togglePause() {
    if (game.phase !== 'playing') return;
    paused(!paused());
    if (!paused()) lastFrame = 0;
  }

  function useHide() {
    if (paused() || !hide(game)) return;
    scene.targetId = null;
    notify('Mèo đã chui xuống gầm bàn. Không có ai ở đây hết!');
    beep('hide');
    syncUI();
  }

  function toggleSound() {
    sound(!sound());
    savePrefs();
    if (sound()) beep('hide');
    else if (audio?.state === 'running') void audio.suspend().catch(() => {});
  }

  function toggleMotion() {
    reduced(!reduced());
    if (scene) scene.reduced = reduced() || matchMedia('(prefers-reduced-motion: reduce)').matches;
    savePrefs();
  }

  async function share() {
    const message = '🐈 Catastrophe: tao vừa phá ' + destroyed() + '/10 món, kiếm ' +
      niceNumber(score()) + ' điểm tại ' + ROOMS[room()].name + '! Mày phá được bao nhiêu? ' +
      new URL('./', location.href).href;
    try {
      await navigator.clipboard.writeText(message);
      notify('Đã copy lời thách đấu. Đi khoe chiến tích đi! 😼');
    } catch {
      window.prompt('Copy lời thách đấu này:', message);
    }
  }

  function keyboard(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || help()) return;
    if (event.target?.closest('input, textarea, select')) return;
    const key = event.key.toLowerCase();
    if (key === 'h') useHide();
    if (key === 'p') togglePause();
    const digit = /^([0-9])$/.exec(key);
    if (digit && game.phase === 'playing') {
      const i = Number(digit[1]) === 0 ? 9 : Number(digit[1]) - 1;
      const item = game.props[i];
      if (item) queue(item.id);
    }
  }

  function frame(now) {
    if (!alive || !scene) return;
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
    lastFrame = now;
    if (!document.hidden) {
      if (!paused()) {
        tick(game, dt);
        scene.update(game, dt);
        if (game.phase === 'ended') finish();
      }
      scene.draw(game);
      hudTime += dt;
      if (hudTime >= .12) { syncUI(); hudTime = 0; }
      if (toastClock > 0) {
        toastClock -= dt;
        if (toastClock <= 0) toast('');
      }
    }
    animationFrame = requestAnimationFrame(frame);
  }

  syncUI(true);
  return {
    room, phase, paused, help, sound, reduced, score, remaining, suspicion,
    combo, hiding, cooldown, destroyed, targets, best, announcement, toast,
    result, roomInfo, riskLabel, hidingText, endHeading, endLine, progressText,
    roomList: () => ROOMS,
    format: niceNumber,
    riskStyle: () => '--risk:' + suspicion() + '%',
    scoreLabel: () => niceNumber(score()),
    bestLabel: () => niceNumber(best()),
    comboLabel: () => combo() > 1 ? '×' + combo() : '—',
    targetClass: item => item.state === 'idle' ? 'target' : 'target destroyed',
    roomClass: index => room() === index ? 'room-chip selected' : 'room-chip',
    start, restart, chooseRoom, queue, togglePause, useHide,
    toggleSound, toggleMotion, share,
    showHelp() { help(true); },
    closeHelp() { help(false); },
    onMount() {
      makeScene();
      const signal = lifetime.signal;
      window.addEventListener('keydown', keyboard, { signal });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (game.phase === 'playing') paused(true);
          if (audio?.state === 'running') void audio.suspend().catch(() => {});
        }
        lastFrame = 0;
      }, { signal });
      const media = matchMedia('(prefers-reduced-motion: reduce)');
      media.addEventListener('change', () => {
        if (scene) scene.reduced = reduced() || media.matches;
      }, { signal });
      animationFrame = requestAnimationFrame(frame);
      if (import.meta.env.DEV) window.__catastrophe = {
        getState: () => structuredClone(game),
        score: () => score(),
        swat: id => hit(id, false),
        finish: () => { game.phase = 'ended';game.outcome = 'time';finish(); }
      };
    },
    onUnmount() {
      alive = false;
      lifetime.abort();
      cancelAnimationFrame(animationFrame);
      if (audio) void audio.close().catch(() => {});
      if (import.meta.env.DEV) delete window.__catastrophe;
    }
  };
});

Gyos.mountAll();
