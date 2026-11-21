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
