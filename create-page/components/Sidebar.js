function Sidebar(pages = [], activePath = '/', onSelect = () => {}){
  const list = document.createElement('ul');
  list.className = 'nav-list';

  pages.forEach(({ path, label, icon }) => {
    const li = document.createElement('li');
    li.dataset.path = path;
    if(path === activePath) li.classList.add('active');
    li.textContent = (icon ? icon + ' ' : '') + label;
    li.addEventListener('click', () => onSelect(path));
    list.appendChild(li);
  });

  return list;
}
