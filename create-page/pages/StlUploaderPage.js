function StlUploaderPage(){
  /* ---------- container ---------- */
  const wrapper = document.createElement('div');
  wrapper.style.height = '100%';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '16px';

  /* ---------- state ---------- */
  let threeLoaded = false;
  let scene = null, camera = null, renderer = null, mesh = null, animId = null;
  let fileBuffer = null;
  let meta = {};

  /* ---------- CSS helpers (injected once) ---------- */
  if (!document.getElementById('stl-page-styles')) {
    const stlCss = document.createElement('style');
    stlCss.id = 'stl-page-styles';
    stlCss.textContent = `
      .stl-dropzone{ border:2px dashed var(--grid); padding:40px; text-align:center; color:var(--green-dim); border-radius:4px; transition:border-color .2s, background .2s; cursor:pointer; }
      .stl-dropzone.hover{ border-color:var(--yellow); background:rgba(46,0,48,0.15); }
      .stl-meta{ display:grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap:10px; }
      .stl-meta .card{ background:rgba(10,10,10,0.6); border:1px solid var(--grid); border-radius:4px; padding:10px 12px; }
      .stl-meta .card .label{ font-size:10px; text-transform:uppercase; color:var(--green-faint); letter-spacing:1px; }
      .stl-meta .card .value{ font-size:14px; color:var(--green); margin-top:4px; word-break:break-word; }
      .stl-preview{ border:1px solid var(--grid); border-radius:4px; overflow:hidden; min-height:240px; position:relative; background:var(--bg2); }
      .stl-ascii pre{ margin:0; font-size:10px; line-height:10px; color:var(--green-dim); }
      .stl-actions{ display:flex; gap:10px; flex-wrap:wrap; }
      .stl-btn{ background:transparent; border:1px solid var(--grid); color:var(--green); padding:8px 14px; border-radius:3px; cursor:pointer; font-family:var(--mono); font-size:13px; transition:border-color .15s, color .15s; }
      .stl-btn:hover{ border-color:var(--yellow); color:var(--yellow); }
      .stl-hidden-input{ position:absolute; left:-9999px; }
    `;
    document.head.appendChild(stlCss);
  }

  /* ---------- header ---------- */
  const title = document.createElement('h2');
  title.textContent = 'STL UPLOADER';
  title.style.fontFamily = 'var(--display)';
  title.style.color = 'var(--yellow)';
  title.style.margin = '0';
  wrapper.appendChild(title);

  /* ---------- drop zone ---------- */
  const dropZone = document.createElement('div');
  dropZone.className = 'stl-dropzone';
  dropZone.innerHTML = '<p style="margin:0 0 6px;">Drag & drop an .STL file here</p><p style="margin:0; font-size:12px; color:var(--green-faint);">or click to browse</p>';
  wrapper.appendChild(dropZone);

  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'file';
  hiddenInput.accept = '.stl,model/stl';
  hiddenInput.className = 'stl-hidden-input';
  wrapper.appendChild(hiddenInput);

  /* ---------- meta grid ---------- */
  const metaGrid = document.createElement('div');
  metaGrid.className = 'stl-meta';
  wrapper.appendChild(metaGrid);

  /* ---------- preview area ---------- */
  const previewWrap = document.createElement('div');
  previewWrap.className = 'stl-preview';
  previewWrap.innerHTML = '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--green-faint); font-size:12px;">No model loaded</div>';
  wrapper.appendChild(previewWrap);

  /* ---------- actions ---------- */
  const actions = document.createElement('div');
  actions.className = 'stl-actions';
  wrapper.appendChild(actions);

  const btnSave = document.createElement('button');
  btnSave.className = 'stl-btn';
  btnSave.textContent = 'Save to Profile';
  actions.appendChild(btnSave);

  const btnClear = document.createElement('button');
  btnClear.className = 'stl-btn';
  btnClear.textContent = 'Clear';
  actions.appendChild(btnClear);

  /* ---------- persistence ---------- */
  const STORAGE_KEY = 'daedalus:stl';

  function saveProfile(){
    if (!fileBuffer) { flash(dropZone, 'No file to save', true); return; }
    const payload = {
      name: meta.name,
      size: meta.size,
      lastModified: meta.lastModified,
      triangles: meta.triangles || 0,
      dimensions: meta.dimensions || null,
      savedAt: Date.now()
    };
    /* Only store full data if under 1.5 MB to avoid clogging localStorage */
    const MAX_INLINE = 1.5 * 1024 * 1024;
    if (fileBuffer.byteLength <= MAX_INLINE) {
      payload.data = arrayBufferToBase64(fileBuffer);
      payload.inline = true;
    } else {
      payload.inline = false;
      payload.note = 'File too large for inline storage; metadata saved only';
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      flash(dropZone, 'Saved to profile', false);
    } catch (e) {
      flash(dropZone, 'Storage error (file too large?)', true);
    }
  }

  function clearProfile(){
    localStorage.removeItem(STORAGE_KEY);
    fileBuffer = null;
    meta = {};
    previewWrap.innerHTML = '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--green-faint); font-size:12px;">No model loaded</div>';
    metaGrid.innerHTML = '';
    if (scene) { cleanupThree(); }
  }

  btnSave.addEventListener('click', saveProfile);
  btnClear.addEventListener('click', clearProfile);

  function flash(el, msg, isErr){
    const old = el.innerHTML;
    el.innerHTML = '<p style="margin:0; color:' + (isErr ? 'var(--crimson)' : 'var(--yellow)') + ';">' + msg + '</p>';
    setTimeout(() => { el.innerHTML = old; }, 1200);
  }

  /* ---------- file handling ---------- */
  dropZone.addEventListener('click', () => hiddenInput.click());
  hiddenInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('hover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('hover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('hover');
    const f = (e.dataTransfer.files && e.dataTransfer.files[0]) ? e.dataTransfer.files[0] : null;
    if (f) handleFile(f);
  });

  function handleFile(file){
    if (!file.name.toLowerCase().endsWith('.stl')) { flash(dropZone, 'Please choose an .STL file', true); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buf = ev.target.result;
      fileBuffer = buf;
      const info = parseSTL(buf);
      meta = {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        triangles: info.triangles,
        dimensions: info.dimensions
      };
      buildMeta(meta);
      loadPreview(buf, info);
    };
    reader.readAsArrayBuffer(file);
  }

  /* ---------- meta card builder ---------- */
  function buildMeta(m){
    metaGrid.innerHTML = '';
    const fields = [
      ['File', m.name],
      ['Size', fmtBytes(m.size)],
      ['Triangles', (m.triangles || 0).toLocaleString()],
      ['Dimensions', m.dimensions ? ('x: ' + m.dimensions.x.toFixed(2) + '  y: ' + m.dimensions.y.toFixed(2) + '  z: ' + m.dimensions.z.toFixed(2)) : '—']
    ];
    fields.forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="label">' + label + '</div><div class="value">' + value + '</div>';
      metaGrid.appendChild(card);
    });
  }

  /* ---------- STL parser (binary + ASCII) ---------- */
  function parseSTL(buf){
    const dv = new DataView(buf);
    let triangles = 0;
    let dims = null;
    const isBinary = dv.getUint32(0, false) === 0; /* rough: check first bytes for ASCII "solid" */
    const header = new Uint8Array(buf, 0, Math.min(80, buf.byteLength));
    const headerText = new TextDecoder().decode(header);
    if (headerText.trim().toLowerCase().startsWith('solid')) {
      /* ASCII STL */
      const text = new TextDecoder().decode(new Uint8Array(buf));
      triangles = (text.match(/facet normal/gi) || []).length;
      dims = boundsFromFacets(text);
    } else {
      /* Binary STL */
      if (buf.byteLength < 84) return { triangles: 0, dimensions: null };
      triangles = dv.getUint32(80, true);
      const verts = [];
      let off = 84;
      for (let i = 0; i < triangles; i++) {
        if (off + 50 > buf.byteLength) break;
        off += 12; /* normal */
        for (let v = 0; v < 3; v++) {
          verts.push(dv.getFloat32(off, true)); off += 4;
          verts.push(dv.getFloat32(off, true)); off += 4;
          verts.push(dv.getFloat32(off, true)); off += 4;
        }
        off += 2; /* attribute byte count */
      }
      dims = boundsFromVerts(verts);
    }
    return { triangles, dimensions: dims };
  }

  function boundsFromFacets(text){
    const verts = [];
    const re = /vertex\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      verts.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    }
    return boundsFromVerts(verts);
  }

  function boundsFromVerts(arr){
    if (!arr.length) return null;
    let minX = arr[0], maxX = arr[0], minY = arr[1], maxY = arr[1], minZ = arr[2], maxZ = arr[2];
    for (let i = 3; i < arr.length; i += 3) {
      const x = arr[i], y = arr[i+1], z = arr[i+2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    return { x: maxX - minX, y: maxY - minY, z: maxZ - minZ };
  }

  /* ---------- preview: try Three.js, else ASCII fallback ---------- */
  function loadPreview(buf, info){
    if (!threeLoaded) {
      loadThreeJS(() => initThreePreview(buf, info), () => asciiPreview(buf, info));
    } else {
      initThreePreview(buf, info);
    }
  }

  function loadThreeJS(onReady, onFail){
    if (typeof window.THREE !== 'undefined') { threeLoaded = true; onReady(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => { threeLoaded = true; onReady(); };
    script.onerror = () => { onFail(); };
    document.head.appendChild(script);
  }

  function initThreePreview(buf, info){
    if (!window.THREE) { asciiPreview(buf, info); return; }
    previewWrap.innerHTML = '';
    const W = previewWrap.clientWidth || 480;
    const H = 340;
    const aspect = W / H;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 0, 1.5 * Math.max(info.dimensions ? Math.max(info.dimensions.x, info.dimensions.y, info.dimensions.z) : 10, 1));
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    previewWrap.appendChild(renderer.domElement);

    const geom = buildThreeGeometry(buf, info);
    if (!geom) { asciiPreview(buf, info); return; }
    const mat = new THREE.MeshNormalMaterial({ wireframe: false });
    mesh = new THREE.Mesh(geom, mat);
    scene.add(mesh);
    const edges = new THREE.EdgesGeometry(geom, 15);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xb84cff, opacity: 0.35, transparent: true });
    const lines = new THREE.LineSegments(edges, lineMat);
    mesh.add(lines);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(1,1,2);
    scene.add(dir);

    camera.lookAt(0,0,0);
    const center = geom.boundingSphere ? geom.boundingSphere.center : new THREE.Vector3(0,0,0);
    const radius = geom.boundingSphere ? geom.boundingSphere.radius : 1;
    camera.position.set(center.x + radius*2, center.y + radius*2, center.z + radius*2);
    camera.lookAt(center);

    animate();
    function animate(){
      animId = requestAnimationFrame(animate);
      if (mesh) { mesh.rotation.y += 0.005; mesh.rotation.x += 0.002; }
      renderer.render(scene, camera);
    }
  }

  function buildThreeGeometry(buf, info){
    try {
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const dv = new DataView(buf);
      const header = new Uint8Array(buf, 0, Math.min(80, buf.byteLength));
      const headerText = new TextDecoder().decode(header).trim().toLowerCase();
      if (headerText.startsWith('solid')) {
        const text = new TextDecoder().decode(new Uint8Array(buf));
        const re = /vertex\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
          positions.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
        }
      } else {
        const triangles = dv.getUint32(80, true);
        let off = 84;
        for (let i = 0; i < triangles; i++) {
          if (off + 50 > buf.byteLength) break;
          off += 12; /* normal */
          for (let v = 0; v < 3; v++) {
            positions.push(dv.getFloat32(off, true)); off += 4;
            positions.push(dv.getFloat32(off, true)); off += 4;
            positions.push(dv.getFloat32(off, true)); off += 4;
          }
          off += 2;
        }
      }
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.computeVertexNormals();
      geom.computeBoundingSphere();
      return geom;
    } catch (e) { return null; }
  }

  function asciiPreview(buf, info){
    if (animId) cancelAnimationFrame(animId);
    scene = null; camera = null; renderer = null; mesh = null; animId = null;
    previewWrap.innerHTML = '';
    const pre = document.createElement('pre');
    const lines = [];
    lines.push('┌─────────────────────────────────────────┐');
    lines.push('│  ASCII WIREFRAME PREVIEW (fallback)      │');
    lines.push('├─────────────────────────────────────────┤');
    lines.push('│  name  : ' + pad(meta.name, 33) + ' │');
    lines.push('│  size  : ' + pad(fmtBytes(meta.size), 33) + ' │');
    lines.push('│  tris  : ' + pad(String(info.triangles || 0), 33) + ' │');
    if (info.dimensions) {
      const d = info.dimensions;
      lines.push('│  dim   : ' + pad(('x:' + d.x.toFixed(2) + ' y:' + d.y.toFixed(2) + ' z:' + d.z.toFixed(2)), 33) + ' │');
    }
    lines.push('├─────────────────────────────────────────┤');
    lines.push('│  [3D viewer unavailable: Three.js not   │');
    lines.push('│   loaded or blocked by CSP]              │');
    lines.push('└─────────────────────────────────────────┘');
    pre.textContent = lines.join('\n');
    pre.style.fontSize = '12px';
    pre.style.lineHeight = '14px';
    pre.style.color = 'var(--green-dim)';
    pre.style.padding = '12px';
    previewWrap.appendChild(pre);
  }

  function cleanupThree(){
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (renderer) { renderer.dispose(); previewWrap.innerHTML = ''; }
    scene = null; camera = null; renderer = null; mesh = null;
  }

  /* ---------- utils ---------- */
  function fmtBytes(b){
    if (b === 0) return '0 B';
    const k = 1024, sizes = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function arrayBufferToBase64(buffer){
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function pad(s, n){
    if (s.length > n) return s.slice(0, n - 3) + '...';
    return s + ' '.repeat(n - s.length);
  }

  /* ---------- restore saved data on mount ---------- */
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const payload = JSON.parse(saved);
      meta = { name: payload.name, size: payload.size, lastModified: payload.lastModified, triangles: payload.triangles || 0, dimensions: payload.dimensions || null };
      buildMeta(meta);
      if (payload.inline && payload.data) {
        fileBuffer = base64ToArrayBuffer(payload.data);
        loadPreview(fileBuffer, { triangles: meta.triangles, dimensions: meta.dimensions });
      } else {
        previewWrap.innerHTML = '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--green-faint); font-size:12px;">Metadata restored — re-upload file for preview</div>';
      }
    }
  } catch (_e) {}

  function base64ToArrayBuffer(base64){
    const bin = atob(base64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  return wrapper;
}
