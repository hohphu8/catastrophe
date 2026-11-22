import {test,expect} from '@playwright/test';

const boot=async(page)=>{
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto('/');
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('.start-card')).toBeVisible();
  return errors;
};

test('a real player moves and swats a nearby sturdy object, not click-to-win',async({page})=>{
  const errors=await boot(page);
  await page.getByRole('button',{name:/BẮT ĐẦU QUẬY/}).click();
  await expect(page.locator('.start-card')).toBeHidden();
  const before=await page.evaluate(()=>window.__catastrophe.snapshot());
  await page.locator('#world').click({position:{x:850,y:240}});
  const afterClick=await page.evaluate(()=>window.__catastrophe.snapshot());
  expect(afterClick.broken).toBe(0);
  expect(afterClick.player.x).toBeCloseTo(before.player.x,0);
  // A failed swat also has a short attack recovery period.
  await page.waitForTimeout(340);

  await page.keyboard.down('d');
  await page.waitForTimeout(240);
  await page.keyboard.up('d');
  const afterMove=await page.evaluate(()=>window.__catastrophe.snapshot());
  expect(afterMove.player.x).toBeGreaterThan(before.player.x+18);

  await page.keyboard.press('j');
  await page.waitForTimeout(330);
  await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__catastrophe?.snapshot().broken>0,{timeout:5000});
  const game=await page.evaluate(()=>window.__catastrophe.snapshot());
  expect(game.score).toBeGreaterThan(0);
  expect(game.props[2].broken).toBe(true);
  await expect(page.locator('.score-number')).not.toHaveText('0');
  expect(errors).toEqual([]);
});

test('pausing freezes timer, sound settings persist and restart resets stage',async({page})=>{
  const errors=await boot(page);
  await page.getByRole('button',{name:/BẮT ĐẦU QUẬY/}).click();
  await page.getByRole('button',{name:/Pause/}).click();
  await expect(page.locator('.pause-card')).toBeVisible();
  const t1=await page.evaluate(()=>window.__catastrophe.snapshot().time);
  await page.waitForTimeout(220);
  const t2=await page.evaluate(()=>window.__catastrophe.snapshot().time);
  expect(Math.abs(t2-t1)).toBeLessThan(.03);
  await page.getByRole('button',{name:/CHƠI TIẾP/}).click();
  await expect(page.locator('.pause-card')).toBeHidden();
  await page.locator('.top-actions button').nth(1).click();
  await expect(page.locator('#music-volume')).toBeVisible();
  await page.locator('#music-volume').evaluate(el=>{
    el.value='85';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.locator('#effects-volume').evaluate(el=>{
    el.value='95';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.getByRole('button',{name:/LƯU & TIẾP TỤC/}).click();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('catastrophe.v2.settings')));
  expect(stored.music).toBe(.85);
  expect(stored.effects).toBe(.95);
  await page.getByRole('button',{name:/Restart/}).click();
  await expect(page.locator('.start-card')).toBeVisible();
  expect((await page.evaluate(()=>window.__catastrophe.snapshot())).phase).toBe('ready');
  expect(errors).toEqual([]);
});

test('mobile touch gamepad moves the cat, supports jump and manual attacks',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=await boot(page);
  await page.getByRole('button',{name:/BẮT ĐẦU QUẬY/}).click();
  await expect(page.locator('#mobile-right')).toBeVisible();
  const before=await page.evaluate(()=>window.__catastrophe.snapshot().player.x);
  const button=page.locator('#mobile-right');
  await button.scrollIntoViewIfNeeded();
  await button.hover();
  await page.mouse.down();
  await page.waitForTimeout(260);
  await page.mouse.up();
  const after=await page.evaluate(()=>window.__catastrophe.snapshot().player.x);
  expect(after).toBeGreaterThan(before+20);
  await page.locator('#mobile-jump').click();
  await page.waitForTimeout(120);
  const game=await page.evaluate(()=>window.__catastrophe.snapshot());
  expect(game.player.grounded).toBe(false);
  await expect(page.locator('#mobile-attack')).toBeVisible();
  expect(errors).toEqual([]);
});

test('active gameplay never automatically awards a score or finishes',async({page})=>{
  const errors=await boot(page);
  await page.getByRole('button',{name:/BẮT ĐẦU QUẬY/}).click();
  await page.waitForTimeout(550);
  const g=await page.evaluate(()=>window.__catastrophe.snapshot());
  expect(g.broken).toBe(0);
  expect(g.score).toBe(0);
  expect(g.phase).toBe('playing');
  expect(errors).toEqual([]);
});

test('rapid keyboard switches never stick or reverse direction after release',async({page})=>{
  const errors=await boot(page);
  await page.getByRole('button',{name:/BẮT ĐẦU QUẬY/}).click();

  await page.keyboard.down('a');
  await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input.left)).toBe(true);
  await page.keyboard.down('d');
  await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input)).toMatchObject({left:false,right:true});
  await page.keyboard.up('d');
  await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input)).toMatchObject({left:true,right:false});
  await page.keyboard.up('a');
  await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input)).toMatchObject({left:false,right:false});

  // Two physical keys can be held for the same direction.
  await page.keyboard.down('a');
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.up('a');
  expect((await page.evaluate(()=>window.__catastrophe.snapshot())).input.left).toBe(true);
  await page.keyboard.up('ArrowLeft');
  expect((await page.evaluate(()=>window.__catastrophe.snapshot())).input.left).toBe(false);

  // Releasing a key while a modifier is held must still release it.
  await page.keyboard.down('a');
  await page.keyboard.down('Control');
  await page.keyboard.up('a');
  await page.keyboard.up('Control');
  expect((await page.evaluate(()=>window.__catastrophe.snapshot())).input.left).toBe(false);

  // Simulate an interrupted hold: blur clears inputs and pauses the round.
  await page.keyboard.down('d');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  expect((await page.evaluate(()=>window.__catastrophe.snapshot())).input.right).toBe(false);
  await expect(page.locator('.pause-card')).toBeVisible();
  await page.keyboard.up('d');
  expect(errors).toEqual([]);
});

test('mobile gamepad stays visible while scrolling and releases held pointers',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=await boot(page);
  await expect(page.locator('.mobile-hint')).toBeVisible();
  await expect(page.locator('.gamepad')).toBeHidden();

  await page.getByRole('button',{name:/BẮT ĐẦU QUẬY/}).click();
  const left=page.locator('#mobile-left');
  await expect(left).toBeVisible();
  const pad=page.locator('.gamepad');
  const rect=await pad.boundingBox();
  expect(rect).not.toBeNull();
  expect(Math.abs(rect.y+rect.height-844)).toBeLessThan(3);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  const rect2=await pad.boundingBox();
  expect(Math.abs(rect2.y+rect2.height-844)).toBeLessThan(3);

  await left.hover();
  await page.mouse.down();
  await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input.left)).toBe(true);
  await expect(left).toHaveClass(/is-held/);
  await page.mouse.move(18,25); // pointer capture keeps hold until actual release
  await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input.left)).toBe(false);
  await expect(left).not.toHaveClass(/is-held/);
  expect(errors).toEqual([]);
});

test('two simultaneous touch contacts switch direction correctly and cancel safely',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const page=await context.newPage();
  try{
    await page.goto('http://127.0.0.1:4230/');
    await expect(page.locator('#app')).toBeVisible();
    await page.getByRole('button',{name:/BẮT ĐẦU QUẬY/}).tap();
    const left=await page.locator('#mobile-left').boundingBox();
    const right=await page.locator('#mobile-right').boundingBox();
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    const a={x:Math.round(left.x+left.width/2),y:Math.round(left.y+left.height/2),id:11};
    const d={x:Math.round(right.x+right.width/2),y:Math.round(right.y+right.height/2),id:12};
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input.left)).toBe(true);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,d]});
    await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input)).toMatchObject({left:false,right:true});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[a]});
    await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input)).toMatchObject({left:true,right:false});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await expect.poll(()=>page.evaluate(()=>window.__catastrophe.snapshot().input)).toMatchObject({left:false,right:false});
  } finally {await context.close();}
});
