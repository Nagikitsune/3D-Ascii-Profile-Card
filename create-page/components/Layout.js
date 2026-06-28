function Layout({ header, sidebar, content }){
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const hdr = document.createElement('header');
  hdr.className = 'app-header';
  hdr.appendChild(header);

  const sbr = document.createElement('aside');
  sbr.className = 'app-sidebar';
  sbr.appendChild(sidebar);

  const cnt = document.createElement('main');
  cnt.className = 'app-content';
  cnt.appendChild(content);

  shell.append(hdr, sbr, cnt);
  return shell;
}

function HeaderBrand(title='DAEDALUS'){
  const el = document.createElement('div');
  el.className = 'brand';
  el.textContent = title;
  return el;
}

function HeaderStatus(text='ONLINE'){
  const el = document.createElement('div');
  el.className = 'status';
  el.textContent = text;
  return el;
}
