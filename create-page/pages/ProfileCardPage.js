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

  const reloadBtn = document.createElement('button');
  reloadBtn.className = 'stl-btn';
  reloadBtn.textContent = '↻ Reload Card';
  reloadBtn.style.background = 'transparent';
  reloadBtn.style.border = '1px solid var(--grid)';
  reloadBtn.style.color = 'var(--green)';
  reloadBtn.style.padding = '8px 14px';
  reloadBtn.style.borderRadius = '3px';
  reloadBtn.style.cursor = 'pointer';
  reloadBtn.style.fontFamily = 'var(--mono)';
  reloadBtn.style.fontSize = '13px';

  const openBtn = document.createElement('button');
  openBtn.textContent = 'Open in New Tab';
  openBtn.className = 'stl-btn';
  openBtn.style.background = 'transparent';
  openBtn.style.border = '1px solid var(--grid)';
  openBtn.style.color = 'var(--green)';
  openBtn.style.padding = '8px 14px';
  openBtn.style.borderRadius = '3px';
  openBtn.style.cursor = 'pointer';
  openBtn.style.fontFamily = 'var(--mono)';
  openBtn.style.fontSize = '13px';

  toolbar.appendChild(reloadBtn);
  toolbar.appendChild(openBtn);
  el.appendChild(toolbar);

  const frameWrap = document.createElement('div');
  frameWrap.style.flex = '1';
  frameWrap.style.border = '1px solid var(--grid)';
  frameWrap.style.borderRadius = '4px';
  frameWrap.style.overflow = 'hidden';
  frameWrap.style.position = 'relative';
  frameWrap.style.background = 'var(--bg2)';
  frameWrap.style.minHeight = '500px';

  const iframe = document.createElement('iframe');
  iframe.src = '../index.html';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.style.display = 'block';
  iframe.setAttribute('title', 'Profile Card Preview');

  frameWrap.appendChild(iframe);
  el.appendChild(frameWrap);

  reloadBtn.addEventListener('click', () => {
    iframe.src = '../index.html?t=' + Date.now();
  });

  openBtn.addEventListener('click', () => {
    window.open('../index.html', '_blank');
  });

  return el;
}