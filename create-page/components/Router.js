class Router {
  constructor(rootElement){
    this.root = rootElement;
    this.routes = new Map();
    this.current = null;
    this.onNavigate = null;
  }

  register(path, renderFn, meta={}){
    this.routes.set(path, { render: renderFn, meta });
  }

  navigate(path, push=true){
    const route = this.routes.get(path);
    if(!route) return this.navigate('/404', false);

    this.current = path;
    this.root.innerHTML = '';
    const node = route.render();
    this.root.appendChild(node);

    if(push && typeof history !== 'undefined'){
      history.pushState({ path }, '', '#' + path);
    }
    if(typeof this.onNavigate === 'function'){
      this.onNavigate(path, route.meta);
    }
    return route;
  }

  start(){
    const hash = (location.hash || '#/').replace('#','');
    const path = this.routes.has(hash) ? hash : '/';
    this.navigate(path, false);

    if(typeof window !== 'undefined'){
      window.addEventListener('popstate', (e)=>{
        const p = e.state?.path || (location.hash||'#/').replace('#','') || '/';
        this.navigate(p, false);
      });
      window.addEventListener('hashchange', ()=>{
        const p = (location.hash||'#/').replace('#','');
        this.navigate(p, false);
      });
    }
  }
}
