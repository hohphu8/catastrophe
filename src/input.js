// Continuous game input is sourced from physical keys and individual pointers.
// Never store a single Boolean per physical key: two keys can map to the same
// action, while opposite directions must honor the most recently pressed one.
export const ACTIONS = Object.freeze(['left','right','crouch','sprint']);
export const KEY_BINDINGS = Object.freeze({
  KeyA:'left',ArrowLeft:'left',
  KeyD:'right',ArrowRight:'right',
  KeyS:'crouch',KeyC:'crouch',ArrowDown:'crouch',
  ShiftLeft:'sprint',ShiftRight:'sprint',
  KeyW:'jump',Space:'jump',ArrowUp:'jump',
  KeyJ:'attack',KeyK:'attack',KeyX:'attack',
  KeyP:'pause',Escape:'pause'
});
const FALLBACK_KEYS = Object.freeze({
  a:'left',arrowleft:'left',d:'right',arrowright:'right',
  s:'crouch',c:'crouch',arrowdown:'crouch',
  shift:'sprint',w:'jump',' ':'jump',arrowup:'jump',
  j:'attack',k:'attack',x:'attack',p:'pause',escape:'pause'
});
export function keyAction(event) {
  return KEY_BINDINGS[event.code] || FALLBACK_KEYS[String(event.key||'').toLowerCase()] || null;
}
export function keySource(event) {
  return 'key:'+ (event.code || String(event.key||'').toLowerCase());
}
export class InputManager {
  constructor(onChange=()=>{}) {
    this.onChange=onChange;
    this.sources=new Map();
    this.order=0;
    this.state={left:false,right:false,crouch:false,sprint:false};
  }
  hold(source,action) {
    if(!ACTIONS.includes(action)||!source)return false;
    const old=this.sources.get(source);
    if(old?.action===action)return false; // auto-repeat doesn't steal direction priority
    this.sources.set(source,{action,order:++this.order});
    this.refresh();
    return true;
  }
  release(source) {
    if(!this.sources.delete(source))return false;
    this.refresh();
    return true;
  }
  releasePointer(pointerId) {
    return this.release('pointer:'+pointerId);
  }
  clear() {
    this.sources.clear();
    this.refresh();
  }
  isHeld(action) {
    for(const entry of this.sources.values())if(entry.action===action)return true;
    return false;
  }
  snapshot() {return {...this.state};}
  refresh() {
    const next={left:false,right:false,crouch:false,sprint:false};
    let leftOrder=-1,rightOrder=-1;
    for(const {action,order} of this.sources.values()){
      if(action==='left')leftOrder=Math.max(leftOrder,order);
      else if(action==='right')rightOrder=Math.max(rightOrder,order);
      else next[action]=true;
    }
    // Opposite directions can be held simultaneously, but never cancel to zero.
    if(leftOrder>=0||rightOrder>=0){
      next.left=leftOrder>rightOrder;
      next.right=rightOrder>leftOrder;
    }
    if(ACTIONS.some(action=>next[action]!==this.state[action])){
      this.state=next;
      this.onChange(this.snapshot());
    }
  }
}
