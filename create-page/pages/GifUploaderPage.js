function GifUploaderPage(){
  const el = document.createElement('div');
  el.className = 'gif-uploader-page';

  const STORAGE_KEY = 'daedalus_gif_registry';

  /* ---------- storage helpers ---------- */
  function loadRegistry(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(_){ return []; }
  }
  function saveRegistry(registry){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
  }

  function makeId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

  /* ---------- build DOM ---------- */
  el.innerHTML = `
    <h2 class="page-title">GIF UPLOADER</h2>

    <section class="drop-zone" id="gif-zone">
      <div class="drop-icon">▤</div>
      <p class="drop-hint">Drop a .GIF here or click to browse</p>
      <p class="drop-sub">Max 20 MB. Only .gif files accepted.</p>
      <input type="file" id="gif-input" accept=".gif,image/gif" style="display:none">
    </section>

    <section class="preview-section" id="preview-section" style="display:none">
      <h3 class="section-title">PREVIEW</h3>
      <div class="preview-card">
        <div class="preview-frame">
          <img id="gif-preview-img" alt="GIF preview" />
        </div>
        <div class="preview-meta">
          <div><span class="meta-label">Name:</span> <span id="meta-name" class="meta-value">—</span></div>
          <div><span class="meta-label">Size:</span> <span id="meta-size" class="meta-value">—</span></div>
          <div><span class="meta-label">Type:</span> <span id="meta-type" class="meta-value">—</span></div>
          <div><span class="meta-label">Last Modified:</span> <span id="meta-mod" class="meta-value">—</span></div>
          <div><span class="meta-label">Data URL size:</span> <span id="meta-dsize" class="meta-value">—</span></div>
          <button id="btn-save-gif" class="btn-primary">✓ Save to registry</button>
          <button id="btn-clear-preview" class="btn-ghost">✕ Clear</button>
          <p id="save-msg" class="feedback"></p>
        </div>
      </div>
    </section>

    <section class="registry-section" id="registry-section">
      <h3 class="section-title">SAVED GIFS</h3>
      <div class="registry-header">
        <span class="count" id="registry-count">0 items</span>
        <button id="btn-clear-all" class="btn-ghost btn-small">Clear all</button>
      </div>
      <div id="registry-list" class="registry-list"></div>
      <p id="registry-empty" class="empty">No saved GIFs yet. Upload one above.</p>
    </section>
  `;

  /* ---------- refs ---------- */
  const zone   = el.querySelector('#gif-zone');
  const input  = el.querySelector('#gif-input');
  const prevSec= el.querySelector('#preview-section');
  const gifImg = el.querySelector('#gif-preview-img');
  const btnSave= el.querySelector('#btn-save-gif');
  const btnClr = el.querySelector('#btn-clear-preview');
  const saveMsg= el.querySelector('#save-msg');
  const regList= el.querySelector('#registry-list');
  const regEmpty=el.querySelector('#registry-empty');
  const regCount=el.querySelector('#registry-count');
  const btnClrAll=el.querySelector('#btn-clear-all');

  let currentFile = null;
  let currentDataUrl = '';

  /* ---------- drag & drop ---------- */
  zone.addEventListener('dragover', (e)=>{ e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', ()=> zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e)=>{
    e.preventDefault();
    zone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if(files.length) handleFile(files[0]);
  });
  zone.addEventListener('click', ()=> input.click());
  input.addEventListener('change', ()=>{
    if(input.files.length) handleFile(input.files[0]);
  });

  /* ---------- file handling ---------- */
  function handleFile(file){
    if(!file.name.toLowerCase().endsWith('.gif') && file.type !== 'image/gif'){
      showFeedback('Only .gif files accepted.', 'error');
      return;
    }
    if(file.size > 20 * 1024 * 1024){
      showFeedback('File exceeds 20 MB limit.', 'error');
      return;
    }
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e)=>{
      currentDataUrl = e.target.result;
      gifImg.src = currentDataUrl;
      el.querySelector('#meta-name').textContent = file.name;
      el.querySelector('#meta-size').textContent = fmtBytes(file.size);
      el.querySelector('#meta-type').textContent = file.type || 'image/gif';
      el.querySelector('#meta-mod').textContent = new Date(file.lastModified).toLocaleString();
      el.querySelector('#meta-dsize').textContent = fmtBytes(currentDataUrl.length);
      prevSec.style.display = '';
      saveMsg.textContent = '';
      saveMsg.className = 'feedback';
    };
    reader.onerror = ()=> showFeedback('Read failed.', 'error');
    reader.readAsDataURL(file);
  }

  function fmtBytes(n){
    if(n<1024) return n+' B';
    if(n<1024*1024) return (n/1024).toFixed(1)+' KB';
    return (n/(1024*1024)).toFixed(2)+' MB';
  }

  /* ---------- preview actions ---------- */
  btnSave.addEventListener('click', ()=>{
    if(!currentDataUrl || !currentFile) return;
    const reg = loadRegistry();
    const item = {
      id: makeId(),
      name: currentFile.name,
      size: currentFile.size,
      type: currentFile.type || 'image/gif',
      lastModified: currentFile.lastModified,
      dataUrl: currentDataUrl,
      addedAt: Date.now(),
    };
    reg.unshift(item);
    saveRegistry(reg);
    renderRegistry();
    showFeedback('Saved to registry.', 'success');
  });

  btnClr.addEventListener('click', ()=>{
    currentFile = null; currentDataUrl = '';
    gifImg.src = '';
    prevSec.style.display = 'none';
    saveMsg.textContent = '';
  });

  function showFeedback(msg, kind){
    saveMsg.textContent = msg;
    saveMsg.className = 'feedback ' + kind;
  }

  /* ---------- registry ---------- */
  function renderRegistry(){
    const reg = loadRegistry();
    regList.innerHTML = '';
    regCount.textContent = reg.length + ' item' + (reg.length===1?'' : 's');

    if(!reg.length){
      regEmpty.style.display = '';
      regList.style.display = 'none';
      return;
    }
    regEmpty.style.display = 'none';
    regList.style.display = '';

    reg.forEach((item, idx)=>{
      const card = document.createElement('div');
      card.className = 'reg-card';
      const dateStr = new Date(item.addedAt).toLocaleString();
      const sizeStr = fmtBytes(item.size);
      card.innerHTML = `
        <div class="reg-thumb"><img src="${esc(item.dataUrl)}" alt="thumb" loading="lazy"/></div>
        <div class="reg-info">
          <div class="reg-name">${esc(item.name)}</div>
          <div class="reg-meta">${sizeStr} • ${esc(dateStr)}</div>
          <div class="reg-actions">
            <button class="btn-small btn-ghost" data-act="preview" data-id="${esc(item.id)}">Preview</button>
            <button class="btn-small btn-danger" data-act="del"    data-id="${esc(item.id)}">Delete</button>
          </div>
        </div>
      `;
      regList.appendChild(card);
    });

    regList.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-act]');
      if(!btn) return;
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if(act === 'del'){
        const reg = loadRegistry().filter(r => r.id !== id);
        saveRegistry(reg);
        renderRegistry();
      } else if(act === 'preview'){
        const found = loadRegistry().find(r => r.id === id);
        if(found){
          currentFile = null;
          currentDataUrl = found.dataUrl;
          gifImg.src = found.dataUrl;
          el.querySelector('#meta-name').textContent = found.name;
          el.querySelector('#meta-size').textContent = fmtBytes(found.size);
          el.querySelector('#meta-type').textContent = found.type;
          el.querySelector('#meta-mod').textContent = new Date(found.lastModified).toLocaleString();
          el.querySelector('#meta-dsize').textContent = fmtBytes(found.dataUrl.length);
          prevSec.style.display = '';
          saveMsg.textContent = '';
          showFeedback('Loaded from registry.', 'success');
        }
      }
    });
  }

  btnClrAll.addEventListener('click', ()=>{
    if(!confirm('Remove all saved GIFs from registry?')) return;
    saveRegistry([]);
    renderRegistry();
  });

  function esc(s){
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ---------- init ---------- */
  renderRegistry();

  return el;
}
