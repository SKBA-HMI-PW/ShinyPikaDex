(() => {
  const STORAGE_KEY = 'pikachu-shiny-dex-web-v1';
  const state = { owned: new Set(), history: [], unownedOnly: false, query: '', checkColor: 'black', checkAlpha: 0.64 };
  const $ = id => document.getElementById(id);
  const grid = $('grid');

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (Array.isArray(saved.owned)) saved.owned.forEach(id => Number.isInteger(id) && id >= 0 && id < CARDS.length && state.owned.add(id));
      if (saved.settings && (saved.settings.checkColor === 'black' || saved.settings.checkColor === 'gray')) {
        state.checkColor = saved.settings.checkColor;
      }
      if (saved.settings && [1, 0.8, 0.6].includes(Number(saved.settings.checkAlpha))) {
        state.checkAlpha = Number(saved.settings.checkAlpha);
      }
    } catch (_) {}
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      owned: [...state.owned].sort((a,b)=>a-b),
      settings: { checkColor: state.checkColor, checkAlpha: state.checkAlpha },
      savedAt: new Date().toISOString()
    }));
  }

  function overlayRgb() {
    return state.checkColor === 'gray' ? [70,70,70] : [7,7,7];
  }

  function applyCheckStyle() {
    const [r,g,b] = overlayRgb();
    document.documentElement.style.setProperty('--owned-overlay', `rgba(${r},${g},${b},${state.checkAlpha})`);
    $('colorBlackBtn').classList.toggle('active', state.checkColor === 'black');
    $('colorGrayBtn').classList.toggle('active', state.checkColor === 'gray');
    document.querySelectorAll('.alpha-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.alpha) === state.checkAlpha);
    });
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
  $('menuBtn').addEventListener('click',(e)=>{
    e.stopPropagation();
    const popup = $('settingsPopup');
    popup.hidden = !popup.hidden;
  });

  $('settingsPopup').addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',()=>{ $('settingsPopup').hidden = true; });
  document.addEventListener('keydown',e=>{ if(e.key === 'Escape') $('settingsPopup').hidden = true; });

  $('colorBlackBtn').addEventListener('click',()=>{ state.checkColor='black'; save(); applyCheckStyle(); });
  $('colorGrayBtn').addEventListener('click',()=>{ state.checkColor='gray'; save(); applyCheckStyle(); });
  document.querySelectorAll('.alpha-btn').forEach(btn => btn.addEventListener('click',()=>{
    state.checkAlpha = Number(btn.dataset.alpha);
    save();
    applyCheckStyle();
  }));
  $('exportBtn').addEventListener('click',()=>{
    const payload={app:'Pikachu Shiny Dex Web',version:2,total:CARDS.length,owned:[...state.owned].sort((a,b)=>a-b),ownedNames:[...state.owned].sort((a,b)=>a-b).map(id=>CARDS[id].name),settings:{checkColor:state.checkColor,checkAlpha:state.checkAlpha},exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`pikachu-shiny-dex-backup-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  });
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  async function saveCurrentListImage() {
    const cards = filteredCards();
    if (!cards.length) {
      alert('저장할 카드가 없습니다.');
      return;
    }

    const button = $('saveImageBtn');
    const oldText = button.textContent;
    button.disabled = true;
    button.textContent = '이미지 만드는 중...';

    try {
      const cols = 7;
      const cardW = 200;
      const cardH = 332;
      const gap = 12;
      const margin = 24;
      const headerH = 132;
      const rows = Math.ceil(cards.length / cols);
      const width = margin * 2 + cols * cardW + (cols - 1) * gap;
      const height = headerH + margin + rows * cardH + Math.max(0, rows - 1) * gap + margin;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#08131e';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#122536';
      ctx.fillRect(0, 0, width, headerH);

      const owned = state.owned.size;
      const total = CARDS.length;
      const unowned = total - owned;
      const progress = (owned * 100 / total).toFixed(1);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 40px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('피카츄 이로치도감', margin, 18);

      ctx.fillStyle = '#d6e0e8';
      ctx.font = '700 24px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(`보유 ${owned} / ${total} · 미보유 ${unowned} · 완성률 ${progress}%`, margin, 68);

      const statusParts = [];
      if (state.unownedOnly) statusParts.push('미보유 카드만');
      if (state.query) statusParts.push(`검색: ${state.query}`);
      statusParts.push(`표시 ${cards.length}개`);
      ctx.fillStyle = '#9aabba';
      ctx.font = '600 20px system-ui, -apple-system, Segoe UI, sans-serif';
      ctx.fillText(statusParts.join(' · '), margin, 100);

      const loaded = await Promise.all(cards.map(card => loadImage(card.image)));
      for (let i = 0; i < cards.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = margin + col * (cardW + gap);
        const y = headerH + margin + row * (cardH + gap);
        const card = cards[i];
        const img = loaded[i];

        ctx.save();
        roundedRect(ctx, x, y, cardW, cardH, 12);
        ctx.clip();
        ctx.drawImage(img, x, y, cardW, cardH);
        if (state.owned.has(card.id)) {
          const [or,og,ob] = overlayRgb();
          ctx.fillStyle = `rgba(${or},${og},${ob},${state.checkAlpha})`;
          ctx.fillRect(x, y, cardW, cardH);
        }
        ctx.restore();

        ctx.strokeStyle = '#dbe4e9';
        ctx.lineWidth = 2;
        roundedRect(ctx, x, y, cardW, cardH, 12);
        ctx.stroke();
      }

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG 생성 실패');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const mode = state.unownedOnly ? 'unowned' : (state.query ? 'search' : 'all');
      a.href = url;
      a.download = `pikachu-shiny-dex-${mode}-${new Date().toISOString().slice(0,10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      alert('현재 목록 이미지를 저장하지 못했습니다. 새로고침 후 다시 시도해 주세요.');
    } finally {
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  $('saveImageBtn').addEventListener('click', saveCurrentListImage);
  $('importBtn').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',async e=>{
    const file=e.target.files[0]; if(!file)return;
    try{
      const data=JSON.parse(await file.text());
      if(!Array.isArray(data.owned)) throw new Error('invalid');
      const imported=new Set(data.owned.map(Number).filter(id=>Number.isInteger(id)&&id>=0&&id<CARDS.length));
      if(!confirm(`백업에서 ${imported.size}개의 보유 기록을 불러옵니다. 현재 기록을 교체할까요?`)) return;
      state.owned=imported;
      state.history=[];
      if (data.settings && (data.settings.checkColor === 'black' || data.settings.checkColor === 'gray')) {
        state.checkColor = data.settings.checkColor;
      }
      if (data.settings && [1,0.8,0.6].includes(Number(data.settings.checkAlpha))) {
        state.checkAlpha = Number(data.settings.checkAlpha);
      }
      save();
      applyCheckStyle();
      render();
      alert('백업을 불러왔습니다.');
    }catch(_){alert('올바른 피카츄 도감 백업 파일이 아닙니다.');}
    e.target.value='';
  });
  load(); applyCheckStyle(); render();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
