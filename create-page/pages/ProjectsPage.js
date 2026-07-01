/*!
 * ProjectsPage.js - Manage projects for the profile card workspace
 * Features: CRUD for projects (name, desc, tags, url), live preview,
 *           persistence to localStorage (daedalus_profile_config).
 */
function ProjectsPage() {
  const STORAGE_KEY = "daedalus_profile_config";

  // Load config
  let cfg = (function(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) { /* ignore */ }
    return {};
  })();
  if (!Array.isArray(cfg.projects)) cfg.projects = [];

  function persist(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  // Helpers
  function el(tag, cls, attrs){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function(k){
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    return e;
  }

  var page = document.createElement('div');
  page.className = 'gif-uploader-page'; // reuse same base layout

  var title = document.createElement('h2');
  title.className = 'page-title';
  title.textContent = '◆ PROJECTS';
  page.appendChild(title);

  var desc = document.createElement('p');
  desc.style.color = 'var(--green-dim)';
  desc.style.fontSize = '13px';
  desc.style.maxWidth = '640px';
  desc.style.lineHeight = '1.5';
  desc.textContent = 'Manage your project portfolio. Projects appear in the workspace section of your profile card.';
  page.appendChild(desc);

  // ---- Project list ----
  var listTitle = document.createElement('h3');
  listTitle.className = 'section-title';
  listTitle.textContent = 'Project List';
  page.appendChild(listTitle);

  var projectList = document.createElement('div');
  projectList.className = 'link-list';
  projectList.id = 'projectList';
  page.appendChild(projectList);

  function loadProjects(){
    try {
      var raw = localStorage.getItem('daedalus_profile_config');
      if (raw) {
        var cfg = JSON.parse(raw);
        return Array.isArray(cfg.projects) ? cfg.projects : [];
      }
    } catch(e) { /* ignore */ }
    return [];
  }

  function saveProjects(projects){
    try {
      var raw = localStorage.getItem('daedalus_profile_config');
      var cfg = raw ? JSON.parse(raw) : {};
      cfg.projects = projects;
      localStorage.setItem('daedalus_profile_config', JSON.stringify(cfg));
    } catch(e) { /* ignore */ }
  }

  function rebuildList(){
    projectList.innerHTML = '';
    var projects = loadProjects();
    projects.forEach(function(p, idx){
      var row = document.createElement('div');
      row.className = 'link-row';
      row.style.flexWrap = 'wrap';

      var nameIn = document.createElement('input');
      nameIn.type = 'text';
      nameIn.value = p.name;
      nameIn.placeholder = 'Project name';
      nameIn.style.flex = '1';
      nameIn.style.minWidth = '120px';
      nameIn.addEventListener('input', function(e){
        var list = loadProjects();
        list[idx].name = e.target.value;
        saveProjects(list);
      });

      var descIn = document.createElement('input');
      descIn.type = 'text';
      descIn.value = p.desc;
      descIn.placeholder = 'Short description';
      descIn.style.flex = '1.5';
      descIn.style.minWidth = '160px';
      descIn.addEventListener('input', function(e){
        var list = loadProjects();
        list[idx].desc = e.target.value;
        saveProjects(list);
      });

      var urlIn = document.createElement('input');
      urlIn.type = 'text';
      urlIn.value = p.url;
      urlIn.placeholder = 'https://...';
      urlIn.style.flex = '1';
      urlIn.style.minWidth = '120px';
      urlIn.addEventListener('input', function(e){
        var list = loadProjects();
        list[idx].url = e.target.value;
        saveProjects(list);
      });

      var tagsIn = document.createElement('input');
      tagsIn.type = 'text';
      tagsIn.value = (p.tags || []).join(', ');
      tagsIn.placeholder = 'tags (separadas por vírgula)';
      tagsIn.style.flex = '1';
      tagsIn.style.minWidth = '120px';
      tagsIn.addEventListener('input', function(e){
        var list = loadProjects();
        list[idx].tags = e.target.value.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        saveProjects(list);
      });

      var remBtn = document.createElement('button');
      remBtn.className = 'btn-rem';
      remBtn.textContent = '\u2212';
      remBtn.addEventListener('click', function(){
        var list = loadProjects();
        list.splice(idx, 1);
        saveProjects(list);
        rebuildList();
      });

      row.appendChild(nameIn);
      row.appendChild(descIn);
      row.appendChild(urlIn);
      row.appendChild(tagsIn);
      row.appendChild(remBtn);
      projectList.appendChild(row);
    });
  }

  rebuildList();

  var addBtn = document.createElement('button');
  addBtn.className = 'btn-primary';
  addBtn.textContent = '+ Add Project';
  addBtn.addEventListener('click', function(){
    var list = loadProjects();
    list.push({ name: 'Novo Projeto', desc: 'Descrição', tags: [], url: 'https://' });
    saveProjects(list);
    rebuildList();
  });
  page.appendChild(addBtn);

  return page;
}