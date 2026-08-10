(() => {
  const STORAGE_KEY = 'pikachu-shiny-dex-web-v1';
  const state = { owned: new Set(), history: [], unownedOnly: false, query: '' };
  const $ = id => document.getElementById(id);
  const grid = $('grid');

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Array.isArray(saved.owned)) saved.owned.forEach(id => Number.isInteger(id) && id >= 0 && id < CARDS.length && state.owned.add(id));
    } catch (_) {}
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1, owned:[...state.owned].sort((a,b)=>a-b), savedAt:new Date().toISOString()}));
  }
  function filteredCards() {
    const q = state.query.trim().toLowerCase();
    return CARDS.filter(card => (!state.unownedOnly || !state.owned.has(card.id)) && (!q || card.name.toLowerCase().includes(q)));
  }
  function updateHeader(visibleCount) {
    const owned = state.owned.size, total = CARDS.length, unowned = total-owned;
    $('progressText').textContent = `보유 ${owned} / ${total} · 미보유 ${unowned} · 완성률 ${(owned*100/total).toFixed(1)}%`;
    $('unownedBtn').textContent = state.unownedOnly ? '전체 보기' : '미보유만';
    const status = $('filterStatus');
    const parts=[];
    if (state.unownedOnly) parts.push('미보유 카드만 표시 중');
    if (state.query) parts.push(`검색 결과 ${visibleCount}개`);
    status.textContent=parts.join(' · '); status.hidden=!parts.length;
  }
  function render() {
    const cards=filteredCards(); grid.replaceChildren();
    const frag=document.createDocumentFragment();
    cards.forEach(card => {
      const btn=document.createElement('button');
      btn.type='button'; btn.className='card'+(state.owned.has(card.id)?' owned':'');
      btn.dataset.id=card.id; btn.setAttribute('aria-label', `${card.name} ${state.owned.has(card.id)?'보유':'미보유'}`);
      const img=document.createElement('img'); img.src=card.image; img.alt=card.name; img.loading='lazy'; img.draggable=false;
      btn.appendChild(img); frag.appendChild(btn);
    });
    grid.appendChild(frag); $('emptyState').hidden=cards.length>0; updateHeader(cards.length);
  }
  function toggle(id) {
    const wasOwned=state.owned.has(id); wasOwned?state.owned.delete(id):state.owned.add(id);
    state.history.push({id,wasOwned}); save(); render();
  }
  grid.addEventListener('click', e => { const card=e.target.closest('.card'); if(card) toggle(Number(card.dataset.id)); });
  $('unownedBtn').addEventListener('click',()=>{state.unownedOnly=!state.unownedOnly;render();window.scrollTo({top:0,behavior:'smooth'});});
  $('searchInput').addEventListener('input',e=>{state.query=e.target.value;render();});
  $('undoBtn').addEventListener('click',()=>{const last=state.history.pop();if(!last)return;last.wasOwned?state.owned.add(last.id):state.owned.delete(last.id);save();render();});
  $('resetBtn').addEventListener('click',()=>$('confirmDialog').showModal());
  $('confirmReset').addEventListener('click',()=>{state.history.push(...[...state.owned].map(id=>({id,wasOwned:true})));state.owned.clear();save();render();});
  $('menuBtn').addEventListener('click',()=>{$('toolsPanel').hidden=!$('toolsPanel').hidden;});
  $('exportBtn').addEventListener('click',()=>{
    const payload={app:'Pikachu Shiny Dex Web',version:1,total:CARDS.length,owned:[...state.owned].sort((a,b)=>a-b),ownedNames:[...state.owned].sort((a,b)=>a-b).map(id=>CARDS[id].name),exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`pikachu-shiny-dex-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  });
  $('importBtn').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',async e=>{
    const file=e.target.files[0]; if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      if(!Array.isArray(data.owned)) throw new Error('invalid');
      const imported=new Set(data.owned.map(Number).filter(id=>Number.isInteger(id)&&id>=0&&id<CARDS.length));
      if(!confirm(`백업에서 ${imported.size}개의 보유 기록을 불러옵니다. 현재 기록을 교체할까요?`)) return;
      state.owned=imported; state.history=[]; save(); render(); alert('백업을 불러왔습니다.');
    }catch(_){alert('올바른 피카츄 도감 백업 파일이 아닙니다.');}
    e.target.value='';
  });
  load(); render();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
