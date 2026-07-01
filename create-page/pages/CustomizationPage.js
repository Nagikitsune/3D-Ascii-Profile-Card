/*!
 * CustomizationPage.js - Full customization panel for Daedalus
 * Features: collapsible field groups, live preview iframe, config persistence,
 *           theme/colors/ramp presets, link CRUD, STL/GIF toggles, JSON import/export.
 */
function CustomizationPage() {
  // ======== DEFAULT CONFIG (mirrors parent card CONFIG) ========
  const DEFAULTS = {
    termTitle:  "Boa noite @usuario",
    handle:     "Usuario",
    role:       "\u2022 cargo aqui:)",
    bio:        "Biografia",
    promptText: "Texto.teste.",
    links: [
      { cmd: "github",    val: "Seu_nome", url: "https://github.com/Seu_git_hub" },
      { cmd: "instagram", val: "Seu_nome", url: "https://www.instagram.com/seu_instagram" },
      { cmd: "Linkedin",  val: "Seu_nome", url: "https://www.linkedin.com/in/seu_linkedin" },
      { cmd: "discord",   val: "Seu_nome", url: "https://discord.com/users/seu_user" },
    ],
    stlUrl: "assets/model.stl",
    spriteUrl: "assets/sprite.gif",
    // --- ASCII render ---
    GRID_W: 74,
    GRID_H: 46,
    RAMP: " .:-=+*#%@",
    AUTO_X: 0.0,
    AUTO_Y: 1.0,
    DRAG_SENS: 0.45,
    INERTIA: 0.93,
    TILT_X: -8,
    TILT_Y: 0,
    ZOOM: 1.45,
    POINTS: 9000,
    LIGHT: [0.3, 0.35, 0.9],
    FPS: 30,
    // --- Theme ---
    themeHue: 280,
    accentColor: "#b84cff",
    // --- Layout / visibility ---
    showAscii: true,
    showSprite: true,
    showMusicPanel: true,
    showLinks: true,
    showWorkspace: true,
    asciiStatusText: "ascii~3d_renderer loaded",
    layoutMode: "auto", // auto | side-by-side | stacked
  };

  const STORAGE_KEY = "daedalus_profile_config";

  // Load existing or initialize
  let cfg = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return JSON.parse(JSON.stringify(DEFAULTS));
  })();

  // Deep-fill missing defaults so old configs stay compatible
  function deepFill(target, defs) {
    Object.keys(defs).forEach((k) => {
      if (target[k] === undefined || target[k] === null) {
        target[k] = JSON.parse(JSON.stringify(defs[k]));
      } else if (typeof defs[k] === "object" && !Array.isArray(defs[k])) {
        deepFill(target[k], defs[k]);
      }
    });
  }
  deepFill(cfg, DEFAULTS);

  // Ensure links are always mutable array
  if (!Array.isArray(cfg.links)) cfg.links = [...DEFAULTS.links];
  // Ensure LIGHT is array
  if (!Array.isArray(cfg.LIGHT) || cfg.LIGHT.length !== 3) cfg.LIGHT = [...DEFAULTS.LIGHT];

  // State used for dirty indicator
  let savedSnapshot = JSON.stringify(cfg);

  // ======== HELPERS ========
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    savedSnapshot = JSON.stringify(cfg);
    updateDirty();
    debouncedRefresh();
  }
  function isDirty() { return JSON.stringify(cfg) !== savedSnapshot; }
  function updateDirty() {
    if (dirtyBadge) dirtyBadge.style.display = isDirty() ? "inline-block" : "none";
  }
  function debounce(fn, ms = 250) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function el(tag, cls, attrs = {}) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === undefined || v === null) { /* skip */ }
      else e.setAttribute(k, v);
    });
    return e;
  }
  function section(title, id) {
    const wrap = el("div", "custom-section", { id: "sec-" + id });
    const head = el("div", "custom-section-header", { text: title });
    const body = el("div", "custom-section-body");
    wrap.appendChild(head);
    wrap.appendChild(body);
    head.addEventListener("click", () => wrap.classList.toggle("expanded"));
    return { wrap, body };
  }
  function field(labelText, inputEl) {
    const d = el("div", "custom-field");
    d.appendChild(el("label", null, { text: labelText }));
    d.appendChild(inputEl);
    return d;
  }
  function input(type, val, onInput, extra = {}) {
    const i = el("input", null, { type, value: String(val), ...extra });
    i.addEventListener("input", onInput);
    return i;
  }
  function numberInput(key, min, max, step) {
    return input("number", cfg[key], (e) => {
      cfg[key] = parseFloat(e.target.value) || 0;
      persist();
    }, { min: String(min), max: String(max), step: String(step) });
  }
  function textInput(key, placeholder = "") {
    return input("text", cfg[key], (e) => {
      cfg[key] = e.target.value;
      persist();
    }, { placeholder });
  }
  function textareaInput(key, placeholder = "") {
    const t = el("textarea", null, { placeholder });
    t.value = cfg[key];
    t.addEventListener("input", (e) => { cfg[key] = e.target.value; persist(); });
    return t;
  }
  function toggleRow(labelText, key) {
    const row = el("div", "custom-row");
    const chk = el("input", null, { type: "checkbox" });
    if (cfg[key]) chk.setAttribute("checked", "checked");
    chk.addEventListener("change", (e) => { cfg[key] = e.target.checked; persist(); });
    const label = el("label", "", { text: labelText, style: "display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--green);" });
    label.prepend(chk);
    row.appendChild(field(labelText, label));
    return row;
  }
  function clamp(n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; }
  function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  // ======== EXPORTED PREVIEW GENERATOR ========
  function generatePreviewHTML() {
    const hue = cfg.themeHue ?? 280;
    const accent = cfg.accentColor ?? "#b84cff";
    const ramp = cfg.RAMP || " .:-=+*#%@";
    const gridColor = "hsl(" + hue + ", 85%, 12%)";
    const rampJSON = JSON.stringify(ramp);
    const linksJSON = JSON.stringify(cfg.links || []);
    const lightJSON = JSON.stringify(cfg.LIGHT || [0.3, 0.35, 0.9]);
    const layoutClass = cfg.layoutMode === "stacked" ? "layout-stacked" : cfg.layoutMode === "side-by-side" ? "layout-side-by-side" : "";
    const showAscii = cfg.showAscii;

    // STL saved by the STL Uploader (localStorage 'daedalus:stl', base64).
    // Inlined into the preview so the blob: iframe can load it WITHOUT fetch().
    let stlB64 = "";
    try {
      const _rawStl = localStorage.getItem("daedalus:stl");
      if (_rawStl) {
        const _p = JSON.parse(_rawStl);
        if (_p && _p.inline && _p.data) stlB64 = _p.data;
      }
    } catch (_) { /* ignore */ }

    const spriteHTML = cfg.showSprite ? `
      <div class="sprite-track" aria-hidden="true">
        <div class="sprite-runner">
          <img class="header-sprite" src="${cfg.spriteUrl || "assets/sprite.gif"}" alt="" onerror="this.parentElement.style.display='none'">
        </div>
      </div>` : "";

    const asciiHTML = showAscii ? `
      <section class="ascii-wrap">
        <pre id="ascii" aria-hidden="true"></pre>
        <div class="ascii-status" id="status">${cfg.asciiStatusText||""}</div>
      </section>` : "";

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>preview</title>
<style>
:root{
  --bg:#020202; --bg2:#0a0a0a; --grid:${gridColor}; --green:#ededed; --green-dim:#9aa0a4; --green-faint:#5a5f63; --hi:#ffffff; --yellow:${accent}; --crimson:${gridColor}; --amber:${gridColor};
  --mono:'Share Tech Mono',ui-monospace,Consolas,monospace; --display:'VT323',var(--mono);
}
*{box-sizing:border-box;}html,body{height:100%;margin:0;}
body{background:radial-gradient(120% 90% at 30% 10%,#141414 0%,var(--bg) 60%,#000 100%);color:var(--green);font-family:var(--mono);overflow:hidden;}
.crt-scan{pointer-events:none;position:fixed;inset:0;z-index:50;background:repeating-linear-gradient(to bottom,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,0.28) 3px,rgba(0,0,0,0.28) 4px);mix-blend-mode:multiply;}
.crt-glow{pointer-events:none;position:fixed;inset:0;z-index:51;background:radial-gradient(120% 120% at 50% 50%,transparent 55%,rgba(0,0,0,0.7) 100%);}
.crt-flicker{pointer-events:none;position:fixed;inset:0;z-index:52;background:rgba(46,0,48,0.04);animation:flicker 6s infinite steps(60);}
@keyframes flicker{0%,100%{opacity:.10}7%{opacity:.25}8%{opacity:.05}20%{opacity:.18}21%{opacity:.06}50%{opacity:.14}70%{opacity:.20}71%{opacity:.05}}
.stage{position:relative;z-index:1;height:100%;width:100%;display:grid;grid-template-columns:${showAscii?"1.05fr 0.95fr":"1fr"};gap:clamp(12px,3vw,56px);align-items:center;padding:clamp(14px,3vw,48px);}
.stage.layout-side-by-side{grid-template-columns:1.05fr 0.95fr !important;}
.stage.layout-stacked{grid-template-columns:1fr !important;grid-template-rows:1fr 1fr;}
.ascii-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;height:100%;}
#ascii{margin:0;font-family:var(--mono);line-height:.92;letter-spacing:.02em;font-size:clamp(5px,1.15vw,12px);color:var(--yellow);text-shadow:0 0 6px ${hexToRgba(accent,0.75)},0 0 18px ${hexToRgba(accent,0.35)};white-space:pre;user-select:none;}
.sprite-track{position:relative;height:86px;overflow:hidden;background:transparent;border:0;margin-bottom:-4px;}
.sprite-runner{position:absolute;left:0;bottom:0;width:86px;height:86px;animation:haunterRun 8s linear infinite alternate;pointer-events:none;}
.header-sprite{display:block;width:86px;height:auto;image-rendering:pixelated;filter:none;animation:haunterFlip 16s steps(1,end) infinite;transform-origin:center center;}
@keyframes haunterRun{from{left:0;}to{left:calc(100% - 86px);}}
@keyframes haunterFlip{0%,49.999%{transform:scaleX(-1);}50%,100%{transform:scaleX(1);}}
.term-stack{width:100%;max-width:520px;display:flex;flex-direction:column;gap:8px;margin:0 auto;}
.term{width:100%;max-width:520px;background:linear-gradient(180deg,rgba(18,0,20,.94),rgba(5,0,7,.94));border:1px solid var(--grid);border-radius:8px;box-shadow:0 0 0 1px rgba(46,0,48,.45),0 30px 80px -30px rgba(0,0,0,.9),inset 0 0 60px rgba(46,0,48,.25);overflow:hidden;}
.term-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--grid);background:rgba(46,0,48,.95);}
.term-title{margin-left:0;font-size:12px;color:var(--green-dim);letter-spacing:.08em;}
.term-body{padding:clamp(16px,2vw,26px);}
.handle{font-family:var(--display);font-size:clamp(40px,7vw,72px);line-height:.85;color:var(--hi);text-shadow:0 0 10px rgba(255,255,255,.55),0 0 28px rgba(255,255,255,.2);margin:6px 0 2px;letter-spacing:.02em;}
.role{color:var(--green);font-size:clamp(14px,1.6vw,17px);}
.bio{color:var(--green-dim);font-size:14px;margin:14px 0 18px;line-height:1.5;}
.rule{border:0;border-top:1px dashed var(--grid);margin:16px 0;}
.links{display:flex;flex-direction:column;gap:2px;}
.link{display:flex;align-items:baseline;gap:10px;padding:9px 10px;border:1px solid transparent;border-radius:5px;color:var(--green);text-decoration:none;font-size:15px;transition:background .12s,border-color .12s,color .12s,transform .12s;}
.link .arrow{color:var(--green-faint);} .link .cmd{color:var(--green);} .link .val{margin-left:auto;color:var(--green-dim);font-size:13px;}
.link:hover,.link:focus-visible{background:rgba(46,0,48,.35);border-color:var(--green-faint);color:var(--hi);outline:none;transform:translateX(3px);}
.link:hover .arrow{color:var(--amber);} .link:hover .cmd{color:var(--hi);} .link:hover .val{color:var(--green);}
@media(max-width:820px){body{overflow:auto;}.stage{grid-template-columns:1fr;grid-template-rows:auto auto;align-content:start;min-height:100%;}#ascii{font-size:clamp(5px,2.4vw,10px);}.term{margin:0 auto;}}
@media(prefers-reduced-motion:reduce){.crt-flicker,.header-sprite,.sprite-runner{animation:none;}}
</style>
</head>
<body>
<div class="crt-scan"></div><div class="crt-glow"></div><div class="crt-flicker"></div>
<main class="stage ${layoutClass}">
${asciiHTML}
<section class="term-stack">
${spriteHTML}
<div class="term">
<div class="term-bar"><span class="term-title">${cfg.termTitle}</span></div>
<div class="term-body">
<div class="handle">${cfg.handle}</div>
<div class="role">${cfg.role}</div>
<p class="bio">${cfg.bio}</p>
<hr class="rule">
<nav class="links">
${cfg.showLinks ? (cfg.links||[]).map(l=>`<a class="link" href="${l.url}" target="_blank" rel="noopener"><span class="arrow">\u25b8</span> <span class="cmd">open ${l.cmd}</span> <span class="val">${l.val}</span></a>`).join("") : ""}
</nav>
</div>
</div>
</section>
</main>
<script>
const RAMP=${rampJSON}, RN=RAMP.length;
const CFG={GRID_W:${cfg.GRID_W},GRID_H:${cfg.GRID_H},AUTO_X:${cfg.AUTO_X},AUTO_Y:${cfg.AUTO_Y},DRAG_SENS:${cfg.DRAG_SENS},INERTIA:${cfg.INERTIA},TILT_X:${cfg.TILT_X},TILT_Y:${cfg.TILT_Y},ZOOM:${cfg.ZOOM},POINTS:${cfg.POINTS},LIGHT:${lightJSON},FPS:${cfg.FPS},stlUrl:"${cfg.stlUrl}"};
const STL_B64=${JSON.stringify(stlB64)};
function parseSTL(buf){const dv=new DataView(buf),n=dv.getUint32(80,true);if(buf.byteLength>=84&&84+n*50===buf.byteLength){const tris=new Float32Array(n*9);let o=84;for(let i=0;i<n;i++){o+=12;for(let k=0;k<9;k++){tris[i*9+k]=dv.getFloat32(o,true);o+=4;}o+=2;}return tris;}const txt=new TextDecoder().decode(new Uint8Array(buf)),verts=[];for(const raw of txt.split("\\n")){const l=raw.trim();if(l.startsWith("vertex")){const p=l.split(/\\s+/);verts.push(+p[1],+p[2],+p[3]);}}return new Float32Array(verts);}
function sampleSurface(tris,target){const nT=tris.length/9;const areas=new Float32Array(nT);const nrm=new Float32Array(nT*3);let totalArea=0;for(let i=0;i<nT;i++){const a=i*9,ax=tris[a],ay=tris[a+1],az=tris[a+2],bx=tris[a+3],by=tris[a+4],bz=tris[a+5],cx=tris[a+6],cy=tris[a+7],cz=tris[a+8];const e1x=bx-ax,e1y=by-ay,e1z=bz-az,e2x=cx-ax,e2y=cy-ay,e2z=cz-az;let nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x;const len=Math.hypot(nx,ny,nz)||1e-12;areas[i]=len/2;totalArea+=areas[i];nrm[i*3]=nx/len;nrm[i*3+1]=ny/len;nrm[i*3+2]=nz/len;}totalArea=totalArea||1;const pts=[],pnr=[];for(let i=0;i<nT;i++){const k=Math.max(1,Math.round(target*areas[i]/totalArea));const a=i*9,ax=tris[a],ay=tris[a+1],az=tris[a+2],bx=tris[a+3],by=tris[a+4],bz=tris[a+5],cx=tris[a+6],cy=tris[a+7],cz=tris[a+8];for(let j=0;j<k;j++){let u=Math.random(),v=Math.random();if(u+v>1){u=1-u;v=1-v;}pts.push(ax+u*(bx-ax)+v*(cx-ax),ay+u*(by-ay)+v*(cy-ay),az+u*(bz-az)+v*(cz-az));pnr.push(nrm[i*3],nrm[i*3+1],nrm[i*3+2]);}}return{pts:new Float32Array(pts),nrm:new Float32Array(pnr)};}
function proceduralModel(n){const pts=new Float32Array(n*3),nrm=new Float32Array(n*3);for(let i=0;i<n;i++){let x=0,y=0,z=0,d=0;do{x=Math.random()*2-1;y=Math.random()*2-1;z=Math.random()*2-1;d=x*x+y*y+z*z;}while(d>1||d===0);const inv=1/Math.sqrt(d);x*=inv;y*=inv;z*=inv;const theta=Math.atan2(y,x),phi=Math.acos(z),spike=Math.pow(Math.abs(Math.sin(4*phi)*Math.cos(4*theta)),6);const r=0.62+0.4*spike;pts[i*3]=x*r;pts[i*3+1]=y*r;pts[i*3+2]=z*r;nrm[i*3]=x;nrm[i*3+1]=y;nrm[i*3+2]=z;}return{pts,nrm};}
function centerScale(tris){let mnx=1e9,mny=1e9,mnz=1e9,mxx=-1e9,mxy=-1e9,mxz=-1e9;for(let i=0;i<tris.length;i+=3){mnx=Math.min(mnx,tris[i]);mxx=Math.max(mxx,tris[i]);mny=Math.min(mny,tris[i+1]);mxy=Math.max(mxy,tris[i+1]);mnz=Math.min(mnz,tris[i+2]);mxz=Math.max(mxz,tris[i+2]);}const cx=(mnx+mxx)/2,cy=(mny+mxy)/2,cz=(mnz+mxz)/2;let maxr=1e-9;for(let i=0;i<tris.length;i+=3){tris[i]-=cx;tris[i+1]-=cy;tris[i+2]-=cz;maxr=Math.max(maxr,Math.hypot(tris[i],tris[i+1],tris[i+2]));}for(let i=0;i<tris.length;i++)tris[i]/=maxr;return tris;}
function matMul(A,B){const C=new Float32Array(9);for(let r=0;r<3;r++)for(let c=0;c<3;c++)C[r*3+c]=A[r*3]*B[c]+A[r*3+1]*B[3+c]+A[r*3+2]*B[6+c];return C;}
function rotMatrix(ax,ay,az){ax*=Math.PI/180;ay*=Math.PI/180;az*=Math.PI/180;const cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az);const Rx=new Float32Array([1,0,0,0,cx,-sx,0,sx,cx]),Ry=new Float32Array([cy,0,sy,0,1,0,-sy,0,cy]),Rz=new Float32Array([cz,-sz,0,sz,cz,0,0,0,1]);return matMul(matMul(Rz,Ry),Rx);}
const W=CFG.GRID_W,H=CFG.GRID_H,asciiEl=document.getElementById("ascii");
function fitAscii(){if(!asciiEl)return;var wrap=asciiEl.parentElement;if(!wrap)return;var aw=wrap.clientWidth,ah=wrap.clientHeight;if(!aw||!ah)return;asciiEl.style.fontSize="10px";var cw=asciiEl.scrollWidth||1,ch=asciiEl.scrollHeight||1;var fs=10*Math.min(aw/cw,ah/ch);if(fs<3)fs=3;if(fs>16)fs=16;asciiEl.style.fontSize=fs+"px";}
window.addEventListener("resize",fitAscii);
let model=null,scale=1,ax=0,ay=0,az=0;const light=(()=>{const[a,b,c]=CFG.LIGHT;const n=Math.hypot(a,b,c);return[a/n,b/n,c/n];})();const zbuf=new Float32Array(W*H),bbuf=new Float32Array(W*H);
function setModel(geom){model=geom;scale=Math.min(W/2,H)*0.9*CFG.ZOOM;}
function renderFrame(){if(!model||!asciiEl)return;const R=matMul(rotMatrix(CFG.TILT_X,CFG.TILT_Y,0),rotMatrix(ax,ay,az));const r0=R[0],r1=R[1],r2=R[2],r3=R[3],r4=R[4],r5=R[5],r6=R[6],r7=R[7],r8=R[8];const lx=light[0],ly=light[1],lz=light[2];zbuf.fill(-Infinity);bbuf.fill(-1);const P=model.pts,N=model.nrm,len=P.length;for(let i=0;i<len;i+=3){const x=P[i],y=P[i+1],z=P[i+2];const px=x*r0+y*r1+z*r2;const py=x*r3+y*r4+z*r5;const pz=x*r6+y*r7+z*r8;let nx=N[i]*r0+N[i+1]*r1+N[i+2]*r2;let ny=N[i]*r3+N[i+1]*r4+N[i+2]*r5;let nz=N[i]*r6+N[i+1]*r7+N[i+2]*r8;if(nz<0){nx=-nx;ny=-ny;nz=-nz;}const xp=(W/2+scale*px)|0;const yp=(H/2-scale*py*0.5)|0;if(xp<0||xp>=W||yp<0||yp>=H)continue;const cell=yp*W+xp;if(pz>zbuf[cell]){zbuf[cell]=pz;let sh=nx*lx+ny*ly+nz*lz;if(sh<0)sh=0;else if(sh>1)sh=1;bbuf[cell]=sh;}}let out="";for(let yy=0;yy<H;yy++){let row="";for(let xx=0;xx<W;xx++){const b=bbuf[yy*W+xx];if(b<0){row+=RAMP[0];}else{let idx=(b*(RN-1))|0;if(idx<0)idx=0;else if(idx>RN-1)idx=RN-1;row+=RAMP[idx];}}out+=yy?"\\n"+row:row;}asciiEl.textContent=out;}
let last=0;const frameMs=1000/CFG.FPS;let velAx=0,velAy=0;function loop(t){if(t-last>=frameMs){last=t;renderFrame();if(dragging){ax+=velAx;ay+=velAy;}else{velAx*=CFG.INERTIA;velAy*=CFG.INERTIA;if(Math.abs(velAx)<0.002)velAx=0;if(Math.abs(velAy)<0.002)velAy=0;ax+=velAx+CFG.AUTO_X;ay+=velAy+CFG.AUTO_Y;}}requestAnimationFrame(loop);}
function loadGeometryFromBuffer(buf){try{let tris=parseSTL(buf);if(!tris.length)throw new Error("vazio");tris=centerScale(tris);setModel(sampleSurface(tris,CFG.POINTS));}catch(e){console.error(e);}}
async function loadModelSTL(){try{const res=await fetch(CFG.stlUrl);if(!res.ok)throw new Error("HTTP "+res.status);const buf=await res.arrayBuffer();loadGeometryFromBuffer(buf);}catch(e){console.warn("STL load failed:",e);}}
let dragging=false,lastX=0,lastY=0;function pStart(x,y){dragging=true;lastX=x;lastY=y;velAx=0;velAy=0;asciiEl.style.cursor="grabbing";}
function pMove(x,y){if(!dragging)return;const dx=x-lastX,dy=y-lastY;lastX=x;lastY=y;velAy=dx*CFG.DRAG_SENS;velAx=-dy*CFG.DRAG_SENS;ax+=velAx;ay+=velAy;}
function pEnd(){dragging=false;asciiEl.style.cursor="grab";}
if(asciiEl){asciiEl.style.cursor="grab";asciiEl.style.touchAction="none";asciiEl.addEventListener("pointerdown",e=>{e.preventDefault();asciiEl.setPointerCapture?.(e.pointerId);pStart(e.clientX,e.clientY);});window.addEventListener("pointermove",e=>pMove(e.clientX,e.clientY));window.addEventListener("pointerup",pEnd);window.addEventListener("pointercancel",pEnd);}
function b64ToBuf(b64){var bin=atob(b64);var n=bin.length;var bytes=new Uint8Array(n);for(var i=0;i<n;i++)bytes[i]=bin.charCodeAt(i);return bytes.buffer;}
setModel(proceduralModel(Math.min(CFG.POINTS,6000)));ax=CFG.TILT_X;ay=-25;requestAnimationFrame(loop);
if(STL_B64){try{loadGeometryFromBuffer(b64ToBuf(STL_B64));}catch(e){console.warn("inline STL failed",e);loadModelSTL();}}else{loadModelSTL();}
requestAnimationFrame(function(){requestAnimationFrame(fitAscii);});setTimeout(fitAscii,120);setTimeout(fitAscii,400);
</script>
</body>
</html>`;
  }

  // ======== BUILD UI ========
  const wrap = el("div", "custom-page");

  const editor = el("div", "custom-editor");

  // -- Actions bar --
  const actions = el("div", "custom-actions");
  actions.appendChild(el("button", "btn-imp", { text: "Save to File", onClick: () => {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const a = el("a", null, { href: URL.createObjectURL(blob), download: "profile-config.json" });
    a.click();
    URL.revokeObjectURL(a.href);
    savedSnapshot = JSON.stringify(cfg);
    updateDirty();
  }}));

  const importInput = el("input", null, { type: "file", accept: "application/json" });
  importInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        cfg = JSON.parse(JSON.stringify(DEFAULTS));
        deepFill(cfg, parsed);
        if (!Array.isArray(cfg.links)) cfg.links = [...DEFAULTS.links];
        if (!Array.isArray(cfg.LIGHT) || cfg.LIGHT.length !== 3) cfg.LIGHT = [...DEFAULTS.LIGHT];
        persist();
        location.reload();
      } catch (err) { alert("Invalid JSON: " + err.message); }
    };
    reader.readAsText(file);
  });
  const importBtn = el("button", "btn", { text: "Import JSON" });
  importBtn.addEventListener("click", () => importInput.click());
  actions.appendChild(importBtn);

  actions.appendChild(el("button", "btn", { text: "Reset Defaults", onClick: () => {
    if (confirm("Reset all settings to factory defaults?")) {
      cfg = JSON.parse(JSON.stringify(DEFAULTS));
      persist();
      location.reload();
    }
  }}));
  const dirtyBadge = el("span", "dirty-badge", { text: "unsaved" });
  dirtyBadge.style.display = "none";
  actions.appendChild(dirtyBadge);
  editor.appendChild(actions);

  // -- Identity Section --
  const idS = section("Identity", "identity");
  idS.body.appendChild(field("Terminal Title (termTitle)", textInput("termTitle")));
  idS.body.appendChild(field("Handle / Name", textInput("handle")));
  idS.body.appendChild(field("Role / Tagline", textInput("role")));
  idS.body.appendChild(field("Bio", textareaInput("bio", "Short bio line...")));
  idS.body.appendChild(field("Prompt / Footer Text", textInput("promptText")));
  idS.wrap.classList.add("expanded");
  editor.appendChild(idS.wrap);

  // -- Links Section --
  const linkS = section("Links", "links");
  const linkList = el("div", "link-list");
  function rebuildLinks() {
    linkList.innerHTML = "";
    cfg.links.forEach((lnk, idx) => {
      const row = el("div", "link-row");
      const cmdIn = input("text", lnk.cmd, (e) => { cfg.links[idx].cmd = e.target.value; persist(); }, { placeholder: "cmd" });
      const valIn = input("text", lnk.val, (e) => { cfg.links[idx].val = e.target.value; persist(); }, { placeholder: "val" });
      const urlIn = input("text", lnk.url, (e) => { cfg.links[idx].url = e.target.value; persist(); }, { placeholder: "url" });
      const remBtn = el("button", "btn-rem", { text: "\u2212" });
      remBtn.addEventListener("click", () => {
        cfg.links.splice(idx, 1);
        persist();
        rebuildLinks();
      });
      row.appendChild(field("cmd", cmdIn));
      row.appendChild(field("value", valIn));
      row.appendChild(field("url", urlIn));
      row.appendChild(remBtn);
      linkList.appendChild(row);
    });
  }
  rebuildLinks();
  const addLinkBtn = el("button", "btn", { text: "+ Add Link" });
  addLinkBtn.addEventListener("click", () => {
    cfg.links.push({ cmd: "new", val: "new", url: "https://" });
    persist();
    rebuildLinks();
  });
  linkS.body.appendChild(linkList);
  linkS.body.appendChild(addLinkBtn);
  linkS.wrap.classList.add("expanded");
  editor.appendChild(linkS.wrap);

  // -- Theme Section --
  const themeS = section("Theme & Colors", "theme");
  themeS.body.appendChild(field("Accent Color (hex)", (() => {
    const c = el("input", null, { type: "color", value: cfg.accentColor });
    c.addEventListener("input", (e) => { cfg.accentColor = e.target.value; persist(); });
    return c;
  })()));
  themeS.body.appendChild(field("Theme Hue (0\u2013360)", numberInput("themeHue", 0, 360, 1)));
  // highlight theme of UI itself
  themeS.body.appendChild(field("Sync UI Theme", (() => {
    const wrap = el("div");
    const note = el("button", "btn", { text: "Apply to Daedalus UI (reload)", onClick: () => {
      document.documentElement.style.setProperty("--yellow", cfg.accentColor);
      document.documentElement.style.setProperty("--grid", "hsl(" + cfg.themeHue + ", 85%, 12%)");
    }});
    wrap.appendChild(note);
    return wrap;
  })()));
  themeS.wrap.classList.add("expanded");
  editor.appendChild(themeS.wrap);

  // -- ASCII Render Section --
  const asciiS = section("ASCII Render Settings", "ascii");
  asciiS.body.appendChild(field("Grid Width", numberInput("GRID_W", 10, 200, 1)));
  asciiS.body.appendChild(field("Grid Height", numberInput("GRID_H", 10, 200, 1)));
  asciiS.body.appendChild(field("Brightness Ramp", (() => {
    const rampInp = el("input", null, { type: "text", value: cfg.RAMP });
    rampInp.addEventListener("input", (e) => { cfg.RAMP = e.target.value; persist(); });
    const presets = el("div", "ramp-presets");
    const presetsData = [
      { label: "classic", ramp: " .:-=+*#%@" },
      { label: "dense",   ramp: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$" },
      { label: "blocks",  ramp: " \u2591\u2592\u2593\u2588" },
      { label: "mono",    ramp: " \u00b7:oO8@" },
      { label: "invert",  ramp: "@%#8&WMoOB0QCJYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,'^`.", },
    ];
    presetsData.forEach(p => {
      const b = el("button", "ramp-btn", { text: p.label });
      b.addEventListener("click", () => {
        cfg.RAMP = p.ramp;
        rampInp.value = p.ramp;
        presets.querySelectorAll(".ramp-btn").forEach(x => x.classList.remove("selected"));
        b.classList.add("selected");
        persist();
      });
      if (cfg.RAMP === p.ramp) b.classList.add("selected");
      presets.appendChild(b);
    });
    const wrap = el("div");
    wrap.appendChild(rampInp);
    wrap.appendChild(presets);
    return wrap;
  })()));
  asciiS.wrap.classList.add("expanded");
  editor.appendChild(asciiS.wrap);

  // -- Animation & Camera Section --
  const camS = section("Animation & Camera", "camera");
  camS.body.appendChild(field("Auto Rotate X", numberInput("AUTO_X", -10, 10, 0.1)));
  camS.body.appendChild(field("Auto Rotate Y", numberInput("AUTO_Y", -10, 10, 0.1)));
  camS.body.appendChild(field("Drag Sensitivity", numberInput("DRAG_SENS", 0, 2, 0.05)));
  camS.body.appendChild(field("Inertia", numberInput("INERTIA", 0, 1, 0.01)));
  camS.body.appendChild(field("Tilt X", numberInput("TILT_X", -90, 90, 1)));
  camS.body.appendChild(field("Tilt Y", numberInput("TILT_Y", -90, 90, 1)));
  camS.body.appendChild(field("Zoom", numberInput("ZOOM", 0.1, 5, 0.05)));
  camS.body.appendChild(field("Points (resolution)", numberInput("POINTS", 500, 50000, 500)));
  camS.body.appendChild(field("FPS Target", numberInput("FPS", 1, 120, 1)));
  // light direction
  camS.body.appendChild(field("Light X", numberInput("LIGHT0", -10, 10, 0.1)));
  camS.body.appendChild(field("Light Y", numberInput("LIGHT1", -10, 10, 0.1)));
  camS.body.appendChild(field("Light Z", numberInput("LIGHT2", -10, 10, 0.1)));
  // update LIGHT on persist
  const realNumber = numberInput;
  function numberInput(key, min, max, step) {
    const node = input("number", cfg[key], (e) => {
      cfg[key] = parseFloat(e.target.value) || 0;
      persist();
    }, { min: String(min), max: String(max), step: String(step) });
    return node;
  }
  // Override LIGHT inputs
  function lightInput(idx) {
    return input("number", cfg.LIGHT[idx], (e) => {
      cfg.LIGHT[idx] = parseFloat(e.target.value) || 0;
      persist();
    }, { step: "0.1" });
  }
  // replace light inputs
  camS.body.replaceChild(field("Light X", lightInput(0)), camS.body.children[camS.body.children.length - 3]);
  camS.body.replaceChild(field("Light Y", lightInput(1)), camS.body.children[camS.body.children.length - 2]);
  camS.body.replaceChild(field("Light Z", lightInput(2)), camS.body.children[camS.body.children.length - 1]);
  editor.appendChild(camS.wrap);

  // -- Visibility Toggles Section --
  const visS = section("Visibility", "vis");
  visS.body.appendChild(toggleRow("Show ASCII 3D Renderer", "showAscii"));
  visS.body.appendChild(toggleRow("Show Sprite / GIF", "showSprite"));
  visS.body.appendChild(toggleRow("Show Music Panel", "showMusicPanel"));
  visS.body.appendChild(toggleRow("Show Links", "showLinks"));
  visS.body.appendChild(toggleRow("Show Workspace / Projects", "showWorkspace"));
  editor.appendChild(visS.wrap);

  // -- Layout Mode Section --
  const layS = section("Layout", "layout");
  layS.body.appendChild(field("Layout Mode", (() => {
    const sel = el("select");
    ["auto", "side-by-side", "stacked"].forEach(m => {
      const opt = el("option", null, { value: m, text: m });
      if (cfg.layoutMode === m) opt.setAttribute("selected", "selected");
      sel.appendChild(opt);
    });
    sel.addEventListener("change", (e) => { cfg.layoutMode = e.target.value; persist(); });
    return sel;
  })()));
  editor.appendChild(layS.wrap);

  // -- STL / Media Paths Section --
  const mediaS = section("Media Paths", "media");
  mediaS.body.appendChild(field("STL Model URL", textInput("stlUrl")));
  mediaS.body.appendChild(field("Sprite GIF URL", textInput("spriteUrl")));
  editor.appendChild(mediaS.wrap);

  wrap.appendChild(editor);

  // ======== LIVE PREVIEW PANEL ========
  const previewWrap = el("div", "custom-preview");
  const previewBar = el("div", "custom-preview-bar");
  previewBar.appendChild(el("span", null, { text: "LIVE PREVIEW" }));
  const reloadBtn = el("button", "btn", { text: "Reload", onClick: refreshPreview });
  previewBar.appendChild(reloadBtn);
  previewWrap.appendChild(previewBar);

  const iframe = el("iframe", null, { sandbox: "allow-scripts allow-same-origin" });
  previewWrap.appendChild(iframe);
  wrap.appendChild(previewWrap);

  let refreshTimer = null;
  function refreshPreview() {
    const html = generatePreviewHTML();
    const blob = new Blob([html], { type: "text/html" });
    iframe.src = URL.createObjectURL(blob);
  }
  const debouncedRefresh = debounce(refreshPreview, 300);

  // -- sync dirty on interval --
  updateDirty();
  setInterval(updateDirty, 1000);

  // Initial preview
  requestAnimationFrame(refreshPreview);

  return wrap;
}
