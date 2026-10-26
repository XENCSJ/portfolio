(() => {
  'use strict';
  const host = document.querySelector('.xd-explorer'); if (!host) return;
  const stage = host.querySelector('.xd-stage'), words = host.querySelector('.xd-words'), center = host.querySelector('.xd-center');
  const crumbs = host.querySelector('.xd-breadcrumb'), controls = host.querySelector('.xd-page-controls');
  const back = host.querySelector('[data-back]'), home = host.querySelector('[data-home]');
  const dialog = document.querySelector('.xd-dialog'), detail = dialog.querySelector('.xd-detail-content');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  let nodes, channels, current = 'home', branch = 'home', pages = {}, busy = false, epoch = 0, flight = null, animation = null, renderedCapacity = 0;
  const parents = {};
  const capacity = () => innerWidth < 768 ? 4 : innerWidth < 1024 ? 6 : 10;
  const pathTo = id => { const path = []; while (id && id !== 'home') { path.unshift(id); id = parents[id]; } return path; };
  const hashFor = id => id === 'home' ? '#home' : '#' + pathTo(id).join('/');
  function readHash() {
    const raw = location.hash.slice(1); if (!raw || raw === 'home') return 'home';
    const segments = raw.split('/'); let parent = 'home';
    for (const id of segments) { if (!nodes[parent]?.children?.includes(id)) return 'home'; parent = id; }
    return parent;
  }
  function state(id, depth, previous = history.state?.previous || null) { return { xenDiscovery: true, id, depth, previous, pages: { ...pages } }; }
  function setBusy(value) {
    busy = value; stage.setAttribute('aria-busy', String(value));
    words.inert = value;
    host.querySelectorAll('button').forEach(button => { button.disabled = value; });
    if (!value) { back.disabled = current === 'home'; home.disabled = current === 'home'; }
  }
  function cancelFlight() { epoch++; if (animation) animation.cancel(); if (flight) flight.remove(); animation = null; flight = null; setBusy(false); }
  function focusNode(id) {
    const button = Array.from(words.querySelectorAll('button')).find(b => b.dataset.node === id);
    if (button) button.focus({ preventScroll: true }); else center.focus({ preventScroll: true });
  }
  function positionList(count) {
    if (count <= 4) return [[23,14],[77,14],[24,86],[76,86]].slice(0,count);
    const rows = Math.ceil(count / 2), positions = [];
    for (let i=0;i<count;i++) positions.push([i % 2 ? 81 : 19, 12 + Math.floor(i/2) * (76/(rows-1))]);
    return positions;
  }
  function renderScene() {
    const data = nodes[branch], list = data.children, cap = capacity();
    renderedCapacity = cap;
    const total = Math.ceil(list.length/cap); pages[branch] = Math.max(0,Math.min(pages[branch] || 0,total-1));
    const start = pages[branch]*cap, visible = list.slice(start,start+cap), positions = positionList(visible.length);
    center.replaceChildren();
    if (branch === 'home') {
      const wrap = el('div','xd-logo-wrap'), img = el('img','xd-logo');
      img.src = './XEN_logo_fixed_black.svg'; img.alt = 'XEN'; img.width = 2232; img.height = 2293;
      wrap.append(img); center.append(wrap);
    } else center.append(el('h2','',data.title));
    center.append(el('p','',data.ja)); center.setAttribute('aria-label',data.title+' — '+data.ja);
    words.replaceChildren();
    visible.forEach((id,index) => {
      const node = nodes[id], wrap = el('div','xd-word'+(['identity','philosophy'].includes(id)?' priority':''));
      wrap.style.setProperty('--x',positions[index][0]+'%'); wrap.style.setProperty('--y',positions[index][1]+'%');
      wrap.style.setProperty('--duration',(7+((start+index)*1.3)%5)+'s'); wrap.style.setProperty('--delay',(-index*1.5)+'s');
      const float = el('div','xd-float'), button = el('button'); button.type = 'button'; button.dataset.node=id;
      button.setAttribute('aria-label',node.title+' — '+node.ja); button.setAttribute('aria-haspopup',node.children?'false':'dialog');
      button.append(el('span','xd-word-no',String(start+index+1).padStart(2,'0')),el('span','xd-word-en',node.title),el('span','xd-word-ja',node.ja));
      button.addEventListener('click',() => select(id,button)); float.append(button);wrap.append(float);words.append(wrap);
    });
    controls.hidden = total === 1; controls.querySelector('.xd-page-count').textContent = `${pages[branch]+1} / ${total}`;
    stage.dataset.branch = branch; stage.dataset.page = String(pages[branch]);
  }
  function renderCrumbs() {
    crumbs.replaceChildren();
    ['home', ...pathTo(current)].forEach((id,index) => {
      if(index) crumbs.append(el('span','','/'));
      const button=el('button','',id==='home'?'XEN':nodes[id].title);button.type='button';
      if(id===current) button.setAttribute('aria-current','location');
      button.addEventListener('click',()=>{if(id!==current) navigate(id);});crumbs.append(button);
    });
  }
  function closeDialog() { if(dialog.open) dialog.close(); document.body.classList.remove('xd-modal-open'); }
  function renderDetail(id) {
    const node=nodes[id]; detail.replaceChildren();
    detail.append(el('h2','','')); detail.firstChild.id='xd-detail-title';detail.firstChild.textContent=node.title;
    detail.append(el('p','xd-detail-ja',node.ja));
    if(node.channel) {
      const channel=channels.find(c=>c.id===node.channel);
      detail.append(window.XenChannels.artwork(channel,'avatar'), window.XenChannels.content(channel));
    } else {
      detail.append(el('p','xd-detail-text',node.text));
      if(node.more?.length) {
        const more=el('details','xd-more');more.append(el('summary','','MORE — さらに見る'));
        node.more.forEach(item=>{more.append(el('h3','',item.title),el('p','',item.text));});detail.append(more);
      }
      const a=el('a','xd-open-link',node.href.startsWith('https:')?'OFFICIAL PAGE ↗':'VIEW '+(node.href.includes('creator')?'CREATOR':node.href.includes('studio')?'STUDIO':node.title)+' →');
      a.href=node.href;
      if(node.href.startsWith('https:')) {a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',node.title+' 公式ページ（新しいタブで開く）');}
      detail.append(a);
    }
    if(node.related?.length) {
      const related=el('div','xd-related');related.append(el('p','','KEEP EXPLORING'));
      node.related.forEach(id=>{const b=el('button','',nodes[id].title+' ↗');b.type='button';b.addEventListener('click',()=>navigate(id));related.append(b);});detail.append(related);
    }
    if(!dialog.open) dialog.showModal();
    document.body.classList.add('xd-modal-open');
    dialog.querySelector('.xd-detail-scroll').scrollTop=0;
    dialog.querySelector('.xd-close').focus({preventScroll:true});
  }
  function render(id, focus=true, previous=current) {
    current=id;branch=nodes[id].children?id:parents[id];
    // The parent constellation stays in place beneath a detail panel.
    if(!nodes[id].children) {
      const index=nodes[branch].children.indexOf(id); pages[branch]=Math.floor(index/capacity());
    }
    renderScene();renderCrumbs();setBusy(false);
    if(nodes[id].children) {closeDialog();if(focus) focusNode(previous);}
    else renderDetail(id);
    host.querySelector('.xd-status').textContent=`${nodes[id].title}。${nodes[id].children ? nodes[id].children.length+'項目を探索できます。' : '詳細を表示しました。'}`;
  }
  function navigate(id, focus=true) {
    if(!nodes[id]||busy||id===current)return;
    const previous=current;
    history.replaceState(state(current,history.state?.xenDiscovery?history.state.depth:0),'',hashFor(current));
    history.pushState(state(id,(history.state?.depth||0)+1,previous),'',hashFor(id));
    render(id,focus,previous);
  }
  async function select(id,button) {
    if(busy)return;
    if(reduce.matches){navigate(id);return;}
    const token=++epoch, from=button.getBoundingClientRect(), to=center.getBoundingClientRect();
    setBusy(true);
    flight=el('div','xd-flight',nodes[id].title);flight.setAttribute('aria-hidden','true');
    Object.assign(flight.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});document.body.append(flight);
    animation=flight.animate([
      {transform:'translate(0,0) scale(1)',opacity:1},
      {transform:`translate(${to.left+to.width/2-from.left-from.width/2}px,${to.top+to.height/2-from.top-from.height/2}px) scale(.96)`,opacity:1}
    ],{duration:460,easing:'cubic-bezier(.22,.68,.2,1)',fill:'forwards'});
    try{await animation.finished;}catch{return;}
    if(token!==epoch)return;
    animation=null;flight.remove();flight=null;setBusy(false);navigate(id);
    if(!reduce.matches)words.animate([{opacity:0,transform:'scale(.98)'},{opacity:1,transform:'scale(1)'}],{duration:330,easing:'ease-out'});
  }
  function goBack() {
    if(busy)cancelFlight();if(current==='home')return;
    if(history.state?.xenDiscovery&&history.state.depth>0)history.back();
    else {const parent=parents[current]||'home';history.replaceState(state(parent,0),'',hashFor(parent));render(parent,true,current);}
  }
  function dismissDetail() {
    if (!dialog.open) return;
    const parent = parents[current] || 'home', previous = current;
    // Related details can follow another detail in history. Closing must still
    // reveal the parent constellation, rather than leave a different panel open.
    if (history.state?.previous === parent) { goBack(); return; }
    history.replaceState(state(parent,history.state?.depth||0),'',hashFor(parent));
    render(parent,true,previous);
  }
  back.addEventListener('click',goBack);home.addEventListener('click',()=>navigate('home'));
  dialog.querySelector('.xd-close').addEventListener('click',dismissDetail);
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismissDetail();});
  controls.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    if(busy)return;const count=Math.ceil(nodes[branch].children.length/capacity());
    pages[branch]=((pages[branch]||0)+Number(button.dataset.page)+count)%count;
    history.replaceState(state(current,history.state?.depth||0),'',hashFor(current));renderScene();
    host.querySelector('.xd-status').textContent=`${nodes[branch].title}、キーワード ${pages[branch]+1} / ${count}`;
  }));
  function restore() {if(!nodes)return;cancelFlight();pages={...(history.state?.pages||{})};render(readHash());}
  addEventListener('popstate',restore);addEventListener('hashchange',()=>{if(nodes&&readHash()!==current)restore();});
  let resizeFrame, viewportWidth = innerWidth;
  addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(!nodes || innerWidth===viewportWidth)return;viewportWidth=innerWidth;cancelFlight();if(capacity()!==renderedCapacity)renderScene();});});
  reduce.addEventListener('change',()=>{if(nodes)cancelFlight();});
  Promise.all([
    fetch('./xen-discovery-data.json').then(r=>{if(!r.ok)throw new Error('Discovery data unavailable');return r.json();}),
    window.XenChannels.load()
  ]).then(([data,channelData])=>{
    nodes=data.nodes;channels=channelData;
    Object.entries(nodes).forEach(([id,n])=>n.children?.forEach(child=>{parents[child]=id;}));
    const first=readHash();history.replaceState(state(first,0),'',hashFor(first));
    host.hidden=false;render(first,false);
    document.querySelector('.xd-fallback').open=false;
    document.documentElement.dataset.discoveryReady='true';
  }).catch(()=>{host.hidden=true;document.querySelector('.xd-fallback').open=true;});
})();
