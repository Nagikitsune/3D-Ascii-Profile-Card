(function(){
  /* ---- bootstrap layout ---- */
  const app = document.getElementById('app');
  if(!app) return console.error('No #app mount point found');

  const headerWrap = document.createElement('div');
  headerWrap.style.display = 'flex';
  headerWrap.style.alignItems = 'center';
  headerWrap.style.justifyContent = 'space-between';
  headerWrap.style.width = '100%';
  headerWrap.appendChild(HeaderBrand('DAEDALUS'));
  headerWrap.appendChild(HeaderStatus('ONLINE'));

  const sidebarWrap = document.createElement('nav');
  const contentWrap = document.createElement('div');

  const layout = Layout({
    header: headerWrap,
    sidebar: sidebarWrap,
    content: contentWrap,
  });

  app.appendChild(layout);

  /* ---- router & nav ---- */
  const router = new Router(contentWrap);

  PAGE_REGISTRY.forEach(({ path, component }) => {
    router.register(path, component);
  });
  router.register('/404', NotFoundPage);

  function buildSidebar(activePath){
    sidebarWrap.innerHTML = '';
    const nav = Sidebar(PAGE_REGISTRY, activePath, (path) => router.navigate(path));
    sidebarWrap.appendChild(nav);
  }

  router.onNavigate = (path) => buildSidebar(path);

  /* ---- overlays ---- */
  ['crt-scan','crt-glow','crt-flicker'].forEach(cls => {
    const div = document.createElement('div');
    div.className = cls;
    document.body.appendChild(div);
  });

  /* ---- start ---- */
  buildSidebar('/');
  router.start();
})();
