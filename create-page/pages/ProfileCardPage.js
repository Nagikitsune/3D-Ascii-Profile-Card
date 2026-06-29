function ProfileCardPage(){
  const el = document.createElement('div');
  el.style.height = '100%';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = '12px';

  const title = document.createElement('h2');
  title.textContent = 'PROFILE CARD RENDERER';
  title.style.fontFamily = 'var(--display)';
  title.style.color = 'var(--yellow)';
  title.style.margin = '0';
  el.appendChild(title);

  const desc = document.createElement('p');
  desc.textContent = 'This is the live 3D ASCII profile card. It reads from the same config, STL, and GIF data that the uploaders and customization panel produce.';
  desc.style.color = 'var(--green-dim)';
  desc.style.fontSize = '13px';
  desc.style.maxWidth = '640px';
  desc.style.lineHeight = '1.5';
  el.appendChild(desc);

  const toolbar = document.createElement('div');
  toolbar.style.display = 'flex';
  toolbar.style.gap = '10px';
  toolbar.style.alignItems = 'center';

  function mkBtn(text){
    const b = document.createElement('button');
    b.className = 'stl-btn';
    b.textContent = text;
    b.style.background = 'transparent';
    b.style.border = '1px solid var(--grid)';
    b.style.color = 'var(--green)';
    b.style.padding = '8px 14px';
    b.style.borderRadius = '3px';
    b.style.cursor = 'pointer';
    b.style.fontFamily = 'var(--mono)';
    b.style.fontSize = '13px';
    return b;
  }
  const reloadBtn = mkBtn('\u21bb Reload Card');
  const openBtn   = mkBtn('Open in New Tab');
  toolbar.appendChild(reloadBtn);
  toolbar.appendChild(openBtn);
  el.appendChild(toolbar);

  /* ---- preview frame ---- */
  const frameWrap = document.createElement('div');
  frameWrap.style.flex = '1';
  frameWrap.style.border = '1px solid var(--grid)';
  frameWrap.style.borderRadius = '4px';
  frameWrap.style.overflow = 'hidden';
  frameWrap.style.position = 'relative';
  frameWrap.style.background = 'var(--bg2)';
  frameWrap.style.minHeight = '500px';

  /* Virtual "stage": a normal-window size where the card lays out correctly.
     We render the standalone page at this fixed size, then scale the whole
     iframe down to fit the panel. This shows the ENTIRE card (centered),
     instead of clipping it because the panel is short/wide. */
  const STAGE_W = 1280;
  const STAGE_H = 900;

  const iframe = document.createElement('iframe');
  iframe.src = '../index.html';
  iframe.setAttribute('title', 'Profile Card Preview');
  iframe.style.position = 'absolute';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = STAGE_W + 'px';
  iframe.style.height = STAGE_H + 'px';
  iframe.style.border = '0';
  iframe.style.display = 'block';
  iframe.style.transformOrigin = 'top left';

  frameWrap.appendChild(iframe);
  el.appendChild(frameWrap);

  /* ---- scale the stage to fit the panel (contain + center) ---- */
  function fitStage(){
    const w = frameWrap.clientWidth;
    const h = frameWrap.clientHeight;
    if(!w || !h) return;
    const scale = Math.min(w / STAGE_W, h / STAGE_H);
    const offX = (w - STAGE_W * scale) / 2;
    const offY = (h - STAGE_H * scale) / 2;
    iframe.style.transform = 'translate(' + offX + 'px,' + offY + 'px) scale(' + scale + ')';
  }

  if('ResizeObserver' in window){
    new ResizeObserver(fitStage).observe(frameWrap);
  } else {
    window.addEventListener('resize', fitStage);
  }

  /* ---- best-effort: make the ASCII block fit its column inside the iframe.
     Works only when same-origin (e.g. served from a local server). On
     file:// this throws and is silently ignored; the scale above still
     fixes the overall clipping. ---- */
  function injectAsciiFit(){
    try{
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if(!doc || !win) return;
      const ascii = doc.getElementById('ascii');
      if(!ascii || win.__asciiFitInstalled) return;
      win.__asciiFitInstalled = true;
      const fit = function(){
        const wrap = ascii.parentElement;
        if(!wrap) return;
        const aw = wrap.clientWidth, ah = wrap.clientHeight;
        if(!aw || !ah) return;
        ascii.style.fontSize = '10px';
        const cw = ascii.scrollWidth || 1, ch = ascii.scrollHeight || 1;
        let fs = 10 * Math.min(aw / cw, ah / ch);
        if(fs < 3) fs = 3; if(fs > 16) fs = 16;
        ascii.style.fontSize = fs + 'px';
      };
      win.addEventListener('resize', fit);
      win.requestAnimationFrame(function(){ win.requestAnimationFrame(fit); });
      setTimeout(fit, 200);
      setTimeout(fit, 600);
    }catch(_){ /* cross-origin: ignore */ }
  }

  iframe.addEventListener('load', function(){
    fitStage();
    injectAsciiFit();
  });

  reloadBtn.addEventListener('click', function(){
    iframe.src = '../index.html?t=' + Date.now();
  });
  openBtn.addEventListener('click', function(){
    window.open('../index.html', '_blank');
  });

  /* initial */
  requestAnimationFrame(fitStage);
  setTimeout(fitStage, 120);

  return el;
}
