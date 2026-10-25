/* All-release page navigation and gesture regression, called by the MUSIC browser suite. */
const assert=require('node:assert/strict');
module.exports=async function verifyLinks(page,context,{engineName,width,out}){
 const ids=await page.locator('.sound-release-card').evaluateAll(es=>es.map(e=>e.id));
 const services=await page.locator('.sound-release-card > .music-services').evaluateAll(es=>es.map(e=>e.innerHTML));
 const destination=async id=>{
  await page.waitForFunction(id=>{
   const frame=document.querySelector('#'+id+' .sound-cover-frame'),top=frame.getBoundingClientRect().top,header=document.querySelector('#xen-site-header').getBoundingClientRect().bottom;
   return document.activeElement.id===id&&frame.classList.contains('music-navigation-highlight')&&top>=header-1&&top<header+55;
  },id);
  assert(page.url().endsWith('#'+id));assert.equal(context.pages().length,1);
  assert.equal(await page.locator('#music-reader').isVisible(),false);
  const geometry=await page.locator('#'+id+' .sound-cover-frame').evaluate(e=>({top:e.getBoundingClientRect().top,header:document.querySelector('#xen-site-header').getBoundingClientRect().bottom}));
  assert(geometry.top>=geometry.header-1&&geometry.top<geometry.header+55,JSON.stringify({id,...geometry}));
 };
 for(const selector of ['.sound-slide','.music-index-link']){
  const rows=await page.locator(selector).evaluateAll(es=>es.map(e=>({id:e.dataset.releaseId,href:e.getAttribute('href'),target:e.getAttribute('target')})));
  assert.deepEqual(rows.map(e=>e.id).sort(),[...ids].sort());
  for(const row of rows){assert.equal(row.href,'#'+row.id);assert(!row.target);}
 }
 const stage=page.locator('.sound-showcase-stage');
 // Side jackets retain selection; they cannot also trigger a page jump.
 for(const side of ['previous','next']){
  await stage.scrollIntoViewIfNeeded();const hash=new URL(page.url()).hash;
  const slide=page.locator(`.sound-slide[data-position="${side}"]`),id=await slide.getAttribute('data-release-id');
  await slide.click();assert.equal(await stage.getAttribute('data-active-release'),id);assert.equal(new URL(page.url()).hash,hash);
 }
 // Every central jacket, including the three Spotify releases, selects its local card.
 const visited=new Set();
 for(let n=0;visited.size<ids.length&&n<ids.length*3;n++){
  await stage.scrollIntoViewIfNeeded();await stage.focus();
  const active=page.locator('.sound-slide[data-position="active"]'),id=await active.getAttribute('data-release-id');
  if(!visited.has(id)){await active.click();await destination(id);visited.add(id);}
  await stage.scrollIntoViewIfNeeded();await stage.focus();await page.keyboard.press('ArrowRight');
 }
 assert.equal(visited.size,ids.length);
 // Keyboard confirmation follows the same path, without opening the reader.
 await stage.scrollIntoViewIfNeeded();let active=page.locator('.sound-slide[data-position="active"]'),id=await active.getAttribute('data-release-id');
 await active.focus();await page.keyboard.press('Space');await destination(id);
 // Real pointer movement through the handler: suppress the subsequent synthetic click.
 for(const [dx,dy] of [[-110,3],[2,90]]){
  await stage.scrollIntoViewIfNeeded();const before=await stage.getAttribute('data-active-release'),hash=new URL(page.url()).hash;
  await stage.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:200,clientY:160});
  await stage.dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:200+dx,clientY:160+dy});
  await page.locator('.sound-slide[data-position="active"]').dispatchEvent('click',{button:0});
  assert.equal(new URL(page.url()).hash,hash);
  if(dx<0)assert.notEqual(await stage.getAttribute('data-active-release'),before);else assert.equal(await stage.getAttribute('data-active-release'),before);
 }
 // Every genre row and each nested hit target use the same stable work ID.
 const targets=['.music-index-cover','.music-index-title','.music-index-artist','.music-index-arrow',null];
 for(let i=0;i<ids.length;i++){
  const id=ids[i],link=page.locator(`.music-index-link[data-release-id="${id}"]`);
  const drawer=link.locator('xpath=ancestor::details');
  if(!await drawer.evaluate(e=>e.open))await drawer.locator('summary').click();
  await (targets[i%targets.length]?link.locator(targets[i%targets.length]):link).click();await destination(id);
 }
 // Check the row's five clickable areas for a single representative work too.
 for(const target of targets){
  const link=page.locator('.music-index-link[data-release-id="tochu-no-mamade"]'),drawer=link.locator('xpath=ancestor::details');
  if(!await drawer.evaluate(e=>e.open))await drawer.locator('summary').click();
  await (target?link.locator(target):link).click();await destination('tochu-no-mamade');
 }
 // One normal-motion journey verifies smooth scrolling and the 500ms gold arrival treatment.
 await page.emulateMedia({reducedMotion:'no-preference'});
 const link=page.locator('.music-index-link[data-release-id="hikari-no-arika"]');await link.click();await destination('hikari-no-arika');
 assert.equal(await page.locator('#hikari-no-arika .sound-cover-frame').evaluate(e=>getComputedStyle(e).animationDuration),'0.5s');
 await page.screenshot({path:`${out}/${engineName}-${width}-local-card-navigation.png`});
 await page.waitForFunction(()=>!document.querySelector('#hikari-no-arika .sound-cover-frame').classList.contains('music-navigation-highlight'));
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.deepEqual(await page.locator('.sound-release-card > .music-services').evaluateAll(es=>es.map(e=>e.innerHTML)),services);
 await stage.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${engineName}-${width}-local-carousel.png`});
 console.log(`PASS LINKS ${engineName} ${width}: ${ids.length} central jackets + ${ids.length} genre rows, side selection, keyboard, swipe suppression, header offset and 500ms highlight`);
};
