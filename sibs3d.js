/* SIBS micro-tunnel progress — 3D view add-on.
   Reads the live layout and register from window.MAPGEO (built by alignMap)
   and shows the drives over the SIBS satellite base picture (sibs3d-sat.bin, encrypted).
   Adds a "3D view" button to the map controls; nothing else on the page is changed.  © 2026 Gaurav Tyagi */
(function(){
'use strict';
if(window.__sibs3d)return;window.__sibs3d=true;
/* satellite base picture + where each shaft sits on it (pixels of the original 4160x3120 photo) */
const SAT_URL=window.SIBS3D_SAT||'';            // preview override only
const SAT_BIN='sibs3d-sat.bin?v=1';              // satellite picture, encrypted
const SAT_KEY={spx:1,c:'iW/OZcaBBoUlk9br+FG9mScv3LAAyWKxnOjnLkSRRWwY4Go0ZMnImSDWSWoL1bobLmjzxgsYjFEGbzQXrH18aZntOlFtIUe/4RbbBZpFEZ0='}; // its key, locked with the page data key
async function satSrc(){
  if(SAT_URL)return SAT_URL;
  if(!window.SPX||!SPX.dec)throw new Error('locked');
  const {k}=await SPX.dec(SAT_KEY);
  const kb=Uint8Array.from(atob(k),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('raw',kb,'AES-GCM',false,['decrypt']);
  const r=await fetch(SAT_BIN);if(!r.ok)throw new Error('net');
  const b=new Uint8Array(await r.arrayBuffer());
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b.subarray(0,12)},key,b.subarray(12));
  return URL.createObjectURL(new Blob([pt],{type:'image/jpeg'}));
}
const SAT={OX:38,OY:179,PW:3975,PH:2857,MPP:2.1,boundaryX:1767};
const PHOTO={MHB14:[60,2216],MHB13:[265,2207],MHB12:[389,2198],MHB11:[484,2190],MHB10:[630,2192],MHB9:[807,2133],MHB8:[895,2122],
 MHB7:[1062,2043],MHB6:[1183,1993],MHB5:[1304,1921],MHB4:[1451,1810],MHB3:[1602,1710],MHB2:[1695,1651],MHB1:[1734,1548],
 MHA20:[1770,1505],MHA19A:[1819,1505],MHA19:[1864,1432],MHA18:[1937,1434],MHA17:[2010,1467],MHA16:[2085,1481],
 MHA14:[2326,1326],MHA13:[2464,1261],MHA12:[2558,1223],MHA11:[2671,1186],MHA10:[2923,1120],MHA9:[3018,1110],MHA8:[3183,1103],
 MHA7:[3265,1101],MHA6:[3439,1090],MHA5:[3548,1081],MHA2:[3922,1020],
 'MHB3.1':[1609,1690],'MHA16.1':[2080,1518],'MHA12.1':[2488,1191],'MHA11.1':[2632,1231],'MHA10.1':[2919,1072]};
const pkey=k=>String(k||'').toUpperCase().replace(/^MHSA/,'MHA').replace(/[\s-]/g,'').replace(/ADD$/,'').replace(/^([A-Z]+)0+(\d)/,'$1$2');
const LIBS=['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js'];
const loadJs=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error(src));document.head.appendChild(s)});
let libs=null;const needLibs=()=>libs||(libs=(async()=>{if(!window.THREE)await loadJs(LIBS[0]);if(!THREE.OrbitControls)await loadJs(LIBS[1])})());

/* ---------- styles ---------- */
const css=`
.s3btn{display:inline-flex;align-items:center;gap:6px;font:inherit;font-weight:700;font-size:13px;padding:5px 12px;border-radius:8px;border:1px solid transparent;cursor:pointer;color:#06231a;background:linear-gradient(#5ff5a5,#2fd884);box-shadow:0 2px 10px rgba(47,216,132,.35)}
.s3btn svg{width:15px;height:15px}
#s3{position:fixed;inset:0;z-index:2147483000;background:#071017;color:#eef3f6;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}
#s3 *{box-sizing:border-box}
#s3 .stage{position:absolute;inset:0}
#s3 .labels{position:absolute;inset:0;pointer-events:none;overflow:hidden}
#s3 .lb{position:absolute;transform:translate(-50%,-100%);font-size:10.5px;font-weight:700;color:#fff;background:rgba(32,52,70,.92);padding:1px 6px;border-radius:4px;white-space:nowrap;margin-top:-8px;border:1px solid rgba(255,255,255,.18)}
#s3 .lb.on{background:rgba(26,92,60,.95);border-color:rgba(59,240,140,.5)}
#s3 .lb.sm{font-size:9.5px;opacity:.85}
#s3 .live{position:absolute;transform:translate(-50%,-100%);margin-top:-14px;pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;white-space:nowrap;color:#1b1200;background:linear-gradient(#ffd35c,#ffb21a);padding:3px 8px 3px 6px;border-radius:6px;box-shadow:0 2px 12px rgba(255,178,26,.5)}
#s3 .live.stop{background:linear-gradient(#ff7a70,#ff3b30);color:#fff}
#s3 .live.mob{background:linear-gradient(#7ae8f8,#22d3ee);color:#032a33}
#s3 .live::after{content:"";position:absolute;left:50%;bottom:-5px;transform:translateX(-50%);border:5px solid transparent;border-top-color:#ffb21a;border-bottom:0}
#s3 .live.stop::after{border-top-color:#ff3b30}#s3 .live.mob::after{border-top-color:#22d3ee}
#s3 .live .dot{width:8px;height:8px;border-radius:50%;background:#d00000;animation:s3pl 1.4s infinite}
#s3 .live small{font-weight:600;opacity:.8}
@keyframes s3pl{0%{box-shadow:0 0 0 0 rgba(208,0,0,.7)}70%{box-shadow:0 0 0 7px rgba(208,0,0,0)}100%{box-shadow:0 0 0 0 rgba(208,0,0,0)}}
#s3 header{position:absolute;top:0;left:0;right:0;display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:10px 16px;background:linear-gradient(rgba(7,16,23,.97),rgba(7,16,23,.8));border-bottom:1px solid rgba(255,255,255,.1);z-index:5}
#s3 h1{font-size:15px;margin:0;font-weight:700}
#s3 h1 small{display:block;font-size:11px;color:#93a3af;font-weight:500}
#s3 .chips{display:flex;gap:8px;flex-wrap:wrap}
#s3 .chip{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:4px 10px;font-size:12px;color:#93a3af;display:flex;align-items:center;gap:8px}
#s3 .chip b{color:#eef3f6;font-variant-numeric:tabular-nums}
#s3 .mini{width:56px;height:5px;border-radius:3px;background:#24323d;overflow:hidden}#s3 .mini i{display:block;height:100%;background:#3BF08C}
#s3 .x{margin-left:auto;font:inherit;font-weight:700;padding:7px 14px;border-radius:9px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#eef3f6;cursor:pointer}
#s3 .pan{position:absolute;background:rgba(10,20,28,.9);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;z-index:5;backdrop-filter:blur(8px)}
#s3 .pan h2{font-size:11px;text-transform:uppercase;letter-spacing:.7px;color:#93a3af;margin:0 0 8px;font-weight:700}
#s3 .ctrl{left:16px;bottom:16px;width:252px}
#s3 .lv{right:16px;top:72px;width:282px;max-height:calc(100% - 100px);overflow:auto}
#s3 .r{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:7px 0;font-size:13px}
#s3 .r input[type=range]{width:118px;accent-color:#3BF08C}
#s3 .r select{background:#071017;color:#eef3f6;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px 6px;font:inherit}
#s3 .btn{width:100%;margin-top:6px;padding:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#eef3f6;border-radius:8px;font:inherit;font-weight:600;cursor:pointer;font-size:12.5px}
#s3 .btn.pri{background:#FFC83D;color:#1b1200;border-color:transparent}
#s3 .leg{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin-top:10px;font-size:12px;color:#93a3af}
#s3 .leg i{display:inline-block;width:14px;height:6px;border-radius:3px;margin-right:6px;vertical-align:1px}
#s3 .lvh{cursor:pointer;display:flex;justify-content:space-between}#s3 .lvh .tg::after{content:'– hide'}#s3 .lv.min .lvh .tg::after{content:'+ show'}#s3 .lv.min .lvl,#s3 .lv.min [data-a=tour]{display:none}
#s3 .ld{padding:8px 0;border-top:1px solid rgba(255,255,255,.08)}#s3 .ld:first-of-type{border-top:0}
#s3 .ld .t{display:flex;justify-content:space-between;font-weight:650;font-size:13px}
#s3 .ld .t span{color:#FFC83D;font-variant-numeric:tabular-nums}
#s3 .ld .s{font-size:11.5px;color:#93a3af;margin:2px 0 5px}
#s3 .bar{height:6px;border-radius:3px;background:#24323d;overflow:hidden}
#s3 .bar i{display:block;height:100%;background:linear-gradient(90deg,#3BF08C,#9ff7c6)}
#s3 .ld .row{display:flex;gap:6px}#s3 .ld .row .btn{padding:5px 4px;font-size:11.5px}
#s3 .info{right:16px;bottom:16px;width:290px;display:none}
#s3 .info h3{margin:0 0 8px;font-size:15px}
#s3 .kv{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font-size:12.5px}
#s3 .kv span:nth-child(odd){color:#93a3af}
#s3 .ix{position:absolute;top:6px;right:10px;background:none;border:0;color:#93a3af;font-size:18px;cursor:pointer}
#s3 .note{position:absolute;left:50%;transform:translateX(-50%);bottom:10px;font-size:11px;color:#9db2c1;background:rgba(10,20,28,.85);padding:4px 10px;border-radius:6px;z-index:4;white-space:nowrap}
#s3 .tour{position:absolute;left:50%;top:70px;transform:translateX(-50%);z-index:6;display:none;background:rgba(10,20,28,.92);border:1px solid rgba(255,255,255,.12);padding:6px 12px;border-radius:9px;font-size:13px}
#s3 .wait{position:absolute;inset:0;display:grid;place-items:center;color:#93a3af;font-size:14px;z-index:7}
@media (max-width:1000px){#s3 .lv{width:250px}#s3 .ctrl{width:230px}}
@media (max-width:760px){#s3 .ctrl{width:auto;right:16px;bottom:auto;top:62px;padding:8px 12px}#s3 .hideM{display:none}#s3 .lv{top:auto;bottom:16px;left:16px;right:16px;width:auto;max-height:36%;display:none}#s3 .lv.open{display:block}#s3 .chips{display:none}#s3 .info{left:16px;width:auto}#s3 .note{display:none}#s3 .mLive{display:block!important}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

/* ---------- button in the map controls ---------- */
const ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>';
function addBtn(){
  document.querySelectorAll('.mapctl').forEach(ctl=>{
    if(ctl.querySelector('.s3btn'))return;
    const b=document.createElement('button');b.type='button';b.className='s3btn';b.innerHTML=ICON+'3D view';
    b.title='Open the alignment in 3D with the live MTBMs';b.onclick=open3d;ctl.appendChild(b);
  });
}
addBtn();setInterval(addBtn,1500);

/* ---------- helpers ---------- */
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=k=>String(k||'').toUpperCase().replace(/\s+/g,'').replace(/-0+(\d)/,'-$1');
const fmtD=s=>{if(!s)return '—';const d=new Date(s+'T00:00:00');return isNaN(d)?s:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'})};
const n0=v=>Math.round(v).toLocaleString('en-GB'),n1=v=>(+v).toFixed(1);
function kindOf(s){const c=s.c||{};if(c.stop)return 'stop';const k=c.status||'idle';
  if(k==='done'||k==='bored')return k;if(k==='run'||k==='stop'||k==='mob')return k;if(c.pct>=1)return 'done';if(c.pct>0)return 'run';return 'idle'}

/* ---------- the 3D view ---------- */
let S=null;
async function open3d(){
  if(S)return;
  const G=window.MAPGEO;if(!G||!G.segs){alert('The alignment map has not been drawn yet.');return}
  const root=document.createElement('div');root.id='s3';
  const ttl=(G.title&&G.title.t)||'Micro-tunnel progress — SIBS 1 & 2';
  root.innerHTML=`<div class="stage"></div><div class="labels"></div>
  <header><h1>3D view — micro-tunnelling progress<small>${esc(ttl)}</small></h1><div class="chips"></div><button class="x" data-a="close">✕ Close 3D</button></header>
  <div class="tour"></div>
  <div class="pan ctrl"><h2>View</h2>
   <div class="r">Show<select data-a="pkg"><option value="all">All drives</option><option value="SIBS1">SIBS-1</option><option value="SIBS2">SIBS-2</option></select></div>
   <div class="r hideM">Depth exaggeration<input type="range" data-a="dep" min="4" max="36" value="18"></div>
   <div class="r">Map visibility<input type="range" data-a="op" min="15" max="100" value="62"></div>
   <div class="r hideM">Manhole labels<input type="checkbox" data-a="lbl" checked></div>
   <button class="btn" data-a="reset">Reset view</button><button class="btn" data-a="top">Plan view (from above)</button>
   <button class="btn mLive" data-a="mlive" style="display:none">Live machines</button>
   <div class="leg"><span><i style="background:#3BF08C"></i>Holed through</span><span><i style="background:#FFC83D"></i>Boring now</span><span><i style="background:#FF5B4F;opacity:.7"></i>To launch</span><span><i style="background:#FF3B30"></i>Stopped</span><span><i style="background:#22D3EE"></i>Mobilising</span><span><i style="background:#C77DFF"></i>Shaft</span></div>
  </div>
  <div class="pan lv"><h2 class="lvh">Live MTBMs</h2><div class="lvl"></div><button class="btn pri" data-a="tour">▶ Tour live machines</button></div>
  <div class="pan info"><button class="ix" data-a="ix">×</button><h3></h3><div class="kv"></div><div class="bar" style="margin-top:10px"><i></i></div><button class="btn igo" style="display:none">View machine</button></div>
  <div class="note">Satellite base · drives, lengths and progress live from the register · depths illustrative</div>
  <div class="wait">Loading satellite view…</div>`;
  document.body.appendChild(root);document.documentElement.style.overflow='hidden';
  const q=s=>root.querySelector(s);
  S={root,raf:0,alive:true};
  const close=()=>{if(!S)return;S.alive=false;cancelAnimationFrame(S.raf);clearInterval(S.tourT);try{S.R.dispose();S.R.forceContextLoss()}catch(e){}
    removeEventListener('resize',S.onR);removeEventListener('keydown',S.onK);root.remove();document.documentElement.style.overflow='';S=null};
  q('[data-a=close]').onclick=close;
  S.onK=e=>{if(e.key==='Escape')close()};addEventListener('keydown',S.onK);
  try{await needLibs()}catch(e){q('.wait').textContent='Could not load the 3D library — check the internet connection.';return}
  if(!S||!S.alive)return;
  const W=G.W||1240,H=G.H||565;
  let src=null;try{src=await satSrc()}catch(e){}
  const canvas=src?await new Promise(res=>{const im=new Image();im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src}):null;
  if(!S||!S.alive)return;
  build(G,W,H,canvas,q,close);
  q('.wait').remove();
}

function build(G,W,H,mapCanvas,q,close){
  const T=THREE;
  /* scale: metres per map unit from the register lengths */
  const SH={};(G.shafts||[]).forEach(s=>SH[norm(s.k)]=s);
  /* place every register shaft on the satellite photo */
  const Wm=SAT.PW*SAT.MPP,Hm=SAT.PH*SAT.MPP;
  const P={};const mapXY={};(G.shafts||[]).forEach(s=>mapXY[pkey(s.k)]=[s.x,s.y]);
  G.segs.forEach(s=>{[[s.d.f,s.ax,s.ay],[s.d.t,s.Bx,s.By]].forEach(e=>{const k=pkey(e[0]);if(!mapXY[k])mapXY[k]=[e[1],e[2]]})});
  Object.keys(mapXY).forEach(k=>{if(PHOTO[k])P[k]=PHOTO[k]});
  // least-squares fit page-map -> photo from matched shafts (for direction / fallback)
  const mk=Object.keys(P);let A=null;
  if(mk.length>=3){let mx=0,my=0,px=0,py=0;mk.forEach(k=>{mx+=mapXY[k][0];my+=mapXY[k][1];px+=P[k][0];py+=P[k][1]});const n=mk.length;mx/=n;my/=n;px/=n;py/=n;
    let sxx=0,sxy=0,syy=0,ux=0,uy=0,vx=0,vy=0;mk.forEach(k=>{const dx=mapXY[k][0]-mx,dy=mapXY[k][1]-my,ex=P[k][0]-px,ey=P[k][1]-py;sxx+=dx*dx;sxy+=dx*dy;syy+=dy*dy;ux+=ex*dx;uy+=ex*dy;vx+=ey*dx;vy+=ey*dy});
    const det=sxx*syy-sxy*sxy||1,a=(ux*syy-uy*sxy)/det,b=(uy*sxx-ux*sxy)/det,c=(vx*syy-vy*sxy)/det,d=(vy*sxx-vx*sxy)/det;
    A={lin:(x,y)=>[a*x+b*y,c*x+d*y],map:(x,y)=>[px+a*(x-mx)+b*(y-my),py+c*(x-mx)+d*(y-my)]}}
  for(let pass=0;pass<6;pass++)G.segs.forEach(s=>{const f=pkey(s.d.f),t2=pkey(s.d.t);
    [[f,t2],[t2,f]].forEach(([p,c])=>{if(P[c]||!P[p]||!mapXY[c]||!mapXY[p]||!A)return;
      let [dx,dy]=A.lin(mapXY[c][0]-mapXY[p][0],mapXY[c][1]-mapXY[p][1]);const L=Math.hypot(dx,dy)||1,len=(s.d.len||s.c.len||50)/SAT.MPP;
      P[c]=[P[p][0]+dx/L*len,P[p][1]+dy/L*len]})});
  Object.keys(mapXY).forEach(k=>{if(!P[k]&&A)P[k]=A.map(mapXY[k][0],mapXY[k][1])});
  const xz=(x,y)=>[(x-SAT.OX)*SAT.MPP-Wm/2,(y-SAT.OY)*SAT.MPP-Hm/2];
  const xs=Object.values(P).map(p=>p[0]),minX=Math.min(...xs),maxX=Math.max(...xs);
  const inv=x=>8+(x-minX)/Math.max(1,(maxX-minX))*8;   // illustrative invert depth, m
  const PS=12,SEG=16;let EX=18,FLAT=false;
  const COL={done:0x3BF08C,run:0xFFC83D,idle:0xFF5B4F,stop:0xFF3B30,mob:0x22D3EE,shaft:0xC77DFF};

  const R=new T.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});S.R=R;
  R.setPixelRatio(Math.min(devicePixelRatio,1.75));R.setSize(innerWidth,innerHeight);
  R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=1.1;
  q('.stage').appendChild(R.domElement);
  const scene=new T.Scene();scene.background=new T.Color(0x071017);
  const FOG=new T.FogExp2(0x071017,0.000018);scene.fog=FOG;
  const cam=new T.PerspectiveCamera(42,innerWidth/innerHeight,1,90000);
  const ctl=new T.OrbitControls(cam,R.domElement);
  ctl.enableDamping=true;ctl.dampingFactor=.08;ctl.maxPolarAngle=Math.PI*.49;ctl.minDistance=40;ctl.maxDistance=24000;
  scene.add(new T.HemisphereLight(0xdff3ff,0x2a2016,.75));
  const sun=new T.DirectionalLight(0xfff2dd,1.5);sun.position.set(-3000,5000,2500);scene.add(sun);
  const fil=new T.DirectionalLight(0x9fd8ff,.5);fil.position.set(3000,1500,-3000);scene.add(fil);

  const XR=10;
  const M=o=>{const m=new T.MeshStandardMaterial(Object.assign({roughness:.45,metalness:.25},o));m.transparent=true;return m};
  const mat={
    done:M({color:0x1bc865,emissive:0x0a6a33,emissiveIntensity:.3,roughness:.38,metalness:.15}),
    bored:M({color:0x6fe8a8,emissive:0x0a6a33,emissiveIntensity:.22,roughness:.4}),
    idle:M({color:COL.idle,opacity:.2,depthWrite:false}),
    halo:new T.MeshBasicMaterial({color:0x3BF08C,transparent:true,opacity:.1,blending:T.AdditiveBlending,depthWrite:false}),
    joint:M({color:0xe8efe9,emissive:0x1c3b2a,emissiveIntensity:.2,metalness:.6,roughness:.3}),
    shaft:M({color:COL.shaft,opacity:.3,side:T.DoubleSide,depthWrite:false}),
    rimOn:M({color:0xe2ffee,emissive:0x2a9a5c,emissiveIntensity:.6,metalness:.6}),
    rimOff:M({color:0x9aa9b6,emissive:0x2b3a46,emissiveIntensity:.3,metalness:.6}),
    yel:M({color:0xffb81c,metalness:.55,roughness:.3,emissive:0x5a3200,emissiveIntensity:.3}),
    steel:M({color:0x4a525a,metalness:.85,roughness:.32}),
    dark:M({color:0x23282d,metalness:.7,roughness:.4}),
    conc:M({color:0xb9b3a8,roughness:.8,metalness:0}),
    blue:M({color:0x2563eb,metalness:.4}),
    white:M({color:0xe5e7eb,metalness:.3})
  };
  const glow=c=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false});

  /* ground = the page's own alignment drawing */
  let gMat;
  if(mapCanvas){const tex=new T.Texture(mapCanvas);tex.needsUpdate=true;tex.encoding=T.sRGBEncoding;tex.anisotropy=R.capabilities.getMaxAnisotropy();
    gMat=new T.MeshBasicMaterial({map:tex,transparent:true,opacity:.62,depthWrite:false,side:T.DoubleSide,toneMapped:false})}
  else gMat=new T.MeshBasicMaterial({color:0x0e1d2a,transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide});
  const ground=new T.Mesh(new T.PlaneGeometry(Wm,Hm),gMat);ground.rotation.x=-Math.PI/2;ground.renderOrder=1;scene.add(ground);

  (()=>{const [x]=xz(SAT.boundaryX,0);const pts=[];for(let z=-Hm/2;z<Hm/2;z+=120)pts.push(new T.Vector3(x,4,z),new T.Vector3(x,4,z+70));
    const l=new T.LineSegments(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x38bdf8,transparent:true}));l.renderOrder=XR;scene.add(l)})();
  /* soil block edges */
  const sTex=(()=>{const c=document.createElement('canvas');c.width=64;c.height=512;const g=c.getContext('2d');
    const gr=g.createLinearGradient(0,0,0,512);[[0,'#8C6A40'],[.08,'#b08d5e'],[.22,'#C49A62'],[.45,'#a7987c'],[.7,'#7d7466'],[1,'#4b463f']].forEach(s=>gr.addColorStop(s[0],s[1]));
    g.fillStyle=gr;g.fillRect(0,0,64,512);for(let i=0;i<2500;i++){g.fillStyle='rgba(0,0,0,'+Math.random()*.12+')';g.fillRect(Math.random()*64,Math.random()*512,1.5,1.5)}
    g.fillStyle='rgba(255,255,255,.12)';[.08,.22,.45,.7].forEach(y=>g.fillRect(0,y*512,64,2));const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.wrapS=T.RepeatWrapping;return t})();
  const slab=new T.Group();scene.add(slab);
  function buildSlab(){slab.clear();const d=17*EX+60;
    [[Wm,0,Hm/2,0],[Wm,0,-Hm/2,Math.PI],[Hm,Wm/2,0,Math.PI/2],[Hm,-Wm/2,0,-Math.PI/2]].forEach(s=>{
      const t=sTex.clone();t.needsUpdate=true;t.repeat.set(s[0]/400,1);
      const m=new T.Mesh(new T.PlaneGeometry(s[0],d),new T.MeshBasicMaterial({map:t,transparent:true,opacity:.92,depthWrite:false}));
      m.position.set(s[1],-d/2,s[2]);m.rotation.y=s[3];m.renderOrder=0;slab.add(m)});
    const b=new T.Mesh(new T.PlaneGeometry(Wm,Hm),new T.MeshBasicMaterial({color:0x14110d,transparent:true,opacity:.95,depthWrite:false}));
    b.rotation.x=Math.PI/2;b.position.y=-d;b.renderOrder=0;slab.add(b)}

  const X=new T.Vector3(1,0,0),UP=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);
  const cylX=(r,len,seg=24,open=false)=>{const g=new T.CylinderGeometry(r,r,len,seg,1,open);g.rotateZ(Math.PI/2);return g};
  const between=(m,a,b)=>{const v=b.clone().sub(a);m.position.copy(a).addScaledVector(v,.5);m.quaternion.setFromUnitVectors(X,v.normalize());m.renderOrder=XR;return m};
  const pipe=(a,b,r,m)=>between(new T.Mesh(cylX(r,Math.max(.1,a.distanceTo(b)),28,m===mat.idle),m),a,b);
  const DOT=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.8)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new T.CanvasTexture(c)})();

  const world=new T.Group(),under=new T.Group(),surf=new T.Group();scene.add(world);world.add(under,surf);
  let picks=[],lives=[],LE=[];

  /* ---- live MTBM rig ---- */
  function makeLive(s,i,a,b,r,kind){
    const pct=Math.max(0,Math.min(1,s.c.pct||0));
    const dir=b.clone().sub(a).normalize(),L=a.distanceTo(b),reach=Math.max(r*4,L*pct),f=a.clone().addScaledVector(dir,reach);
    const qd=new T.Quaternion().setFromUnitVectors(X,dir),side=new T.Vector3().crossVectors(UP,dir).normalize();
    const rig=new T.Group();under.add(rig);
    const beaconC=kind==='stop'?COL.stop:kind==='mob'?COL.mob:COL.run;
    const tbm=new T.Group();rig.add(tbm);
    const Ls=r*3.4;
    const sh=new T.Mesh(cylX(r*1.06,Ls,32),mat.yel);sh.position.x=-Ls/2;sh.renderOrder=XR+1;tbm.add(sh);
    const band=new T.Mesh(cylX(r*1.08,r*.18,32),mat.dark);band.position.x=-Ls*.55;band.renderOrder=XR+1;tbm.add(band);
    const tail=new T.Mesh(new T.TorusGeometry(r*1.07,r*.07,8,40),glow(beaconC));tail.rotation.y=Math.PI/2;tail.position.x=-Ls;tail.renderOrder=XR+2;tbm.add(tail);
    const cut=new T.Group();cut.position.x=r*.12;tbm.add(cut);
    const disc=new T.Mesh(cylX(r*1.1,r*.22,36),mat.steel);disc.renderOrder=XR+1;cut.add(disc);
    const cone=new T.Mesh(new T.ConeGeometry(r*.28,r*.5,20),mat.yel);cone.rotation.z=-Math.PI/2;cone.position.x=r*.3;cone.renderOrder=XR+2;cut.add(cone);
    for(let k=0;k<6;k++){const sp=new T.Group();sp.rotation.x=k*Math.PI/3;cut.add(sp);
      const arm=new T.Mesh(new T.BoxGeometry(r*.2,r*1.05,r*.22),mat.yel);arm.position.set(r*.16,r*.55,0);arm.renderOrder=XR+2;sp.add(arm);
      for(let j=1;j<=3;j++){const c=new T.Mesh(cylX(r*.09,r*.1,10),mat.dark);c.position.set(r*.3,r*.3*j,(j%2?1:-1)*r*.08);c.renderOrder=XR+2;sp.add(c)}}
    const hl=new T.PointLight(0xffaa33,1.6,r*14);hl.position.x=r*1.2;tbm.add(hl);
    if(kind==='mob'){tbm.position.copy(a).addScaledVector(dir,SEG*.2)}else tbm.position.copy(f);
    tbm.quaternion.copy(qd);
    const nJ=kind==='mob'?0:Math.ceil(reach/SEG)+2;
    const joints=new T.InstancedMesh(new T.TorusGeometry(r*1.03,r*.09,8,28),mat.joint,Math.max(1,nJ));joints.renderOrder=XR+1;joints.visible=nJ>0;rig.add(joints);
    const jf=new T.Group();jf.position.copy(a);jf.quaternion.copy(qd);rig.add(jf);
    const back=new T.Mesh(new T.BoxGeometry(r*.5,r*2.6,r*2.6),mat.blue);back.position.x=-SEG-r*.4;back.renderOrder=XR+1;jf.add(back);
    const bed=new T.Mesh(new T.BoxGeometry(SEG+r*.8,r*.35,r*2.2),mat.steel);bed.position.set(-SEG/2,-r*1.2,0);bed.renderOrder=XR+1;jf.add(bed);
    const ring=new T.Mesh(new T.TorusGeometry(r*1.05,r*.2,10,32),mat.blue);ring.rotation.y=Math.PI/2;ring.renderOrder=XR+1;jf.add(ring);
    const rams=[];[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(o=>{const g=cylX(r*.16,1,12);g.translate(.5,0,0);const m=new T.Mesh(g,mat.steel);
      m.position.set(-SEG,o[0]*r*.7,o[1]*r*.7);m.renderOrder=XR+2;jf.add(m);rams.push(m)});
    const newPipe=new T.Mesh(cylX(r*1.02,SEG*.96,28),mat.conc);newPipe.renderOrder=XR+1;rig.add(newPipe);
    const top=new T.Vector3(a.x,0,a.z);
    const crane=new T.Group();crane.position.copy(top);crane.quaternion.setFromUnitVectors(X,side);rig.add(crane);
    const hH=r*7;[-1,1].forEach(sg=>{const leg=new T.Mesh(new T.BoxGeometry(r*.35,hH,r*.35),mat.yel);leg.position.set(sg*r*3.2,hH/2,0);leg.renderOrder=XR;crane.add(leg)});
    const beam=new T.Mesh(new T.BoxGeometry(r*7,r*.5,r*.6),mat.yel);beam.position.y=hH;beam.renderOrder=XR;crane.add(beam);
    const cable=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineBasicMaterial({color:0xffffff,transparent:true}));cable.renderOrder=XR+3;rig.add(cable);
    const plant=new T.Group();plant.position.copy(top).addScaledVector(side,-r*9).addScaledVector(dir,-r*4);rig.add(plant);
    const pb=new T.Mesh(new T.BoxGeometry(r*5,r*2.2,r*2.4),mat.blue);pb.position.y=r*1.1;pb.renderOrder=XR;plant.add(pb);
    [-1,1].forEach(sg=>{const t=new T.Mesh(new T.CylinderGeometry(r*.9,r*.9,r*3,16),mat.conc);t.position.set(sg*r*1.6,r*3.7,0);t.renderOrder=XR;plant.add(t)});
    const cont=new T.Mesh(new T.BoxGeometry(r*4,r*1.8,r*1.6),mat.white);cont.position.copy(top).addScaledVector(side,r*8).setY(r*.9);cont.quaternion.copy(qd);cont.renderOrder=XR;rig.add(cont);
    const face=kind==='mob'?tbm.position.clone():f;
    const fs=new T.Vector3(face.x,0,face.z);
    const bg=new T.CylinderGeometry(r*.5,r*1.2,1,16,1,true);bg.translate(0,.5,0);
    const lb=new T.Mesh(bg,new T.MeshBasicMaterial({color:beaconC,transparent:true,opacity:.35,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
    lb.position.copy(face);lb.renderOrder=XR+3;rig.add(lb);
    const pulse=new T.Mesh(new T.RingGeometry(.8,1,48),new T.MeshBasicMaterial({color:beaconC,transparent:true,depthWrite:false,side:T.DoubleSide}));
    pulse.rotation.x=-Math.PI/2;pulse.position.copy(fs).setY(5);pulse.renderOrder=XR+3;surf.add(pulse);
    const NP=kind==='run'?Math.max(30,Math.round(reach/6)):0;
    const pos=new Float32Array(Math.max(1,NP)*3),seeds=[];for(let k=0;k<NP;k++)seeds.push(Math.random());
    const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pos,3));
    const pts=new T.Points(pg,new T.PointsMaterial({color:0x7dd3fc,map:DOT,size:r*.45,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false,depthTest:false}));
    pts.renderOrder=XR+4;pts.visible=NP>0;rig.add(pts);
    const o={s,i,kind,a,b,f:face,fs,dir,side,q:qd,r,reach,cut,joints,nJ,rams,newPipe,cable,hH,pulse,lb,pts,seeds,top,tbm,phase:Math.random()};
    lives.push(o);return o;
  }
  const m4=new T.Matrix4(),one=new T.Vector3(1,1,1),tv=new T.Vector3(),zero=new T.Matrix4().makeScale(0,0,0);
  function anim(o,dt,t){
    const running=o.kind==='run';
    if(running)o.cut.rotation.x+=dt*1.8;
    if(o.kind==='mob'){ // MTBM being lowered into the launch shaft
      const u=(t*.12+o.i*.3)%1,y=o.hH-o.r*2+(o.a.y-(o.hH-o.r*2))*Math.min(1,u*1.3);
      o.tbm.position.set(o.tbm.position.x,y,o.tbm.position.z);
      const cp=o.cable.geometry.attributes.position;cp.setXYZ(0,o.tbm.position.x,o.hH,o.tbm.position.z);cp.setXYZ(1,o.tbm.position.x,y+o.r,o.tbm.position.z);cp.needsUpdate=true;
      o.newPipe.visible=false;o.rams.forEach(m=>m.scale.x=.01);
    }else{
      if(running)o.phase=(o.phase+dt/7)%1;
      const p=running?o.phase:.3,push=p<.72?p/.72:1,ret=p<.72?0:(p-.72)/.28;
      const off=SEG*push-SEG,qr=new T.Quaternion().setFromUnitVectors(Z,o.dir);
      for(let k=0,sx=off;k<o.nJ;k++,sx+=SEG){if(sx>o.reach-o.r*3.4)o.joints.setMatrixAt(k,zero);else{tv.copy(o.a).addScaledVector(o.dir,Math.max(sx,-SEG));m4.compose(tv,qr,one);o.joints.setMatrixAt(k,m4)}}
      o.joints.instanceMatrix.needsUpdate=true;
      const ramL=p<.72?SEG*push:SEG*(1-ret);o.rams.forEach(m=>m.scale.x=Math.max(.01,ramL));
      const yTop=o.hH-o.r*2;let y=yTop,show=running&&p>.35;
      if(running&&p>=.72){y=yTop+(o.a.y-yTop)*Math.min(1,ret*1.2);show=true}
      o.newPipe.visible=show;o.newPipe.position.copy(o.a).addScaledVector(o.dir,-SEG/2);o.newPipe.position.y=y;o.newPipe.quaternion.copy(o.q);
      const cp=o.cable.geometry.attributes.position;cp.setXYZ(0,o.newPipe.position.x,o.hH,o.newPipe.position.z);cp.setXYZ(1,o.newPipe.position.x,y+o.r,o.newPipe.position.z);cp.needsUpdate=true;o.cable.visible=show;
    }
    const sp=(t*.6+o.i*.13)%1;o.pulse.scale.setScalar(o.r*2+sp*o.r*9);o.pulse.material.opacity=(1-sp)*.9;
    o.lb.scale.y=-o.f.y+260;o.lb.material.opacity=(o.kind==='stop'?.3+.25*Math.sin(t*6):.22+.12*Math.sin(t*3));
    if(o.pts.visible){const P=o.pts.geometry.attributes.position;
      for(let j=0;j<o.seeds.length;j++){const u=(o.seeds[j]+t*.05)%1;tv.copy(o.f).addScaledVector(o.dir,-u*o.reach);tv.y+=o.r*.35*Math.sin(j*7.1);tv.addScaledVector(o.side,o.r*.35*Math.cos(j*3.3));P.setXYZ(j,tv.x,tv.y,tv.z)}
      P.needsUpdate=true}
  }

  function ribbon(a,b,w,color,op,dashed){const v=new T.Vector3(b.x-a.x,0,b.z-a.z),L=v.length();v.normalize();const out=[];
    const mk=(s,e)=>{const m=new T.Mesh(new T.PlaneGeometry(Math.max(.5,e-s),w),new T.MeshBasicMaterial({color,transparent:true,opacity:op,depthWrite:false,toneMapped:false}));
      m.rotation.x=-Math.PI/2;m.rotation.z=-Math.atan2(v.z,v.x);m.position.set(a.x+v.x*(s+e)/2,3,a.z+v.z*(s+e)/2);m.renderOrder=XR-1;surf.add(m);out.push(m)};
    if(!dashed)mk(0,L);else for(let s=0;s<L;s+=34)mk(s,Math.min(L,s+20));return out}
  function endPt(key){return P[pkey(key)]||[0,0]}
  function rebuild(){
    under.clear();surf.clear();lives=[];picks=[];
    const pk=q('[data-a=pkg]').value,used=new Map();
    G.segs.forEach((s,i)=>{
      if(pk!=='all'&&s.d.pr!==pk)return;
      const kind=kindOf(s);
      const [ax0,ay0]=endPt(s.d.f),[bx0,by0]=endPt(s.d.t);
      const [ax,az]=xz(ax0,ay0),[bx,bz]=xz(bx0,by0);
      const a=new T.Vector3(ax,-inv(ax0)*EX,az),b=new T.Vector3(bx,-inv(bx0)*EX,bz);
      const r=(s.d.dn||1400)/2000*PS,pct=Math.max(0,Math.min(1,s.c.pct||0));
      const fpt=a.clone().lerp(b,(kind==='done'||kind==='bored')?1:pct);
      { const sa=new T.Vector3(a.x,0,a.z),sb=new T.Vector3(b.x,0,b.z),sf=new T.Vector3(fpt.x,0,fpt.z),w=FLAT?42:18,full=kind==='done'||kind==='bored';
        if(full||pct>0)ribbon(sa,full?sb:sf,w,kind==='bored'?0x9ff7c6:0x22e06b,.95).forEach(m=>{m.userData=i;picks.push(m)});
        if(!full)ribbon(sf,sb,w*.7,kind==='idle'?0xff5b4f:kind==='stop'?0xff3b30:kind==='mob'?0x22d3ee:0xffb020,kind==='idle'?.75:.6,true).forEach(m=>{m.userData=i;picks.push(m)}); }
      if(kind==='done'||kind==='bored'){const m=pipe(a,b,r,kind==='bored'?mat.bored:mat.done);m.userData=i;under.add(m);picks.push(m);under.add(between(new T.Mesh(cylX(r*2,a.distanceTo(b),20,true),mat.halo),a,b))}
      else{
        if(pct>0){const m=pipe(a,fpt,r,mat.done);m.userData=i;under.add(m);picks.push(m);under.add(between(new T.Mesh(cylX(r*2,a.distanceTo(fpt),20,true),mat.halo),a,fpt))}
        const g=pipe(fpt,b,r,mat.idle);g.userData=i;under.add(g);picks.push(g);
        if(kind!=='idle')makeLive(s,i,a,b,r,kind);
      }
      [[s.d.f,ax0,ay0],[s.d.t,bx0,by0]].forEach(e=>{const k=pkey(e[0]),sh=SH[norm(e[0])]||SH[norm(String(e[0]).replace(/^MHSA/i,'MHA'))];if(!used.has(k))used.set(k,{k:sh?sh.k:e[0],x:e[1],y:e[2],live:sh?sh.live:false})});
    });
    const shL=[];
    used.forEach(sv=>{
      const [x,z]=xz(sv.x,sv.y),dep=inv(sv.x)*EX,big=!/\.\d/.test(sv.k),rr=big?20:12;
      const c=new T.Mesh(new T.CylinderGeometry(rr,rr,dep+rr,28,1,true),mat.shaft);c.position.set(x,-dep/2+rr/2,z);c.renderOrder=XR;under.add(c);
      const fl=new T.Mesh(new T.CircleGeometry(rr,28),mat.shaft);fl.rotation.x=-Math.PI/2;fl.position.set(x,-dep-rr/2+1,z);fl.renderOrder=XR;under.add(fl);
      const rim=new T.Mesh(new T.TorusGeometry(rr,FLAT?5:3.2,8,32),sv.live?mat.rimOn:mat.rimOff);rim.rotation.x=Math.PI/2;rim.position.set(x,4,z);rim.renderOrder=XR+1;surf.add(rim);
      shL.push({k:sv.k,p:new T.Vector3(x,6,z),sm:!big,live:sv.live});
    });
    under.visible=!FLAT;
    labels(shL);panels();
  }

  /* labels */
  const LB=q('.labels');
  function labels(shL){LB.innerHTML='';LE=[];
    lives.forEach(o=>{const e=document.createElement('div');e.className='live'+(o.kind==='stop'?' stop':o.kind==='mob'?' mob':'');
      const tag=o.kind==='stop'?'STOPPED':o.kind==='mob'?'MOBILISING':'MTBM';
      e.innerHTML='<span class="dot"></span>'+tag+' '+esc(o.s.d.f)+'→'+esc(o.s.d.t)+' <small>'+Math.round((o.s.c.pct||0)*100)+'%</small>';
      e.onclick=()=>fly(o);LB.appendChild(e);LE.push({e,p:o.fs.clone().setY(8),pri:2})});
    shL.forEach(s=>{const e=document.createElement('div');e.className='lb'+(s.sm?' sm':'')+(s.live?' on':'');e.textContent=s.k;LB.appendChild(e);LE.push({e,p:s.p,pri:s.sm?0:1})});
  }
  const pv=new T.Vector3();
  function placeLabels(){
    const on=q('[data-a=lbl]').checked,taken=[],w0=innerWidth,h0=innerHeight;
    LE.slice().sort((a,b)=>b.pri-a.pri).forEach(L=>{
      if(L.pri<2&&!on){L.e.style.display='none';return}
      pv.copy(L.p).project(cam);
      if(pv.z>1||Math.abs(pv.x)>1.02||Math.abs(pv.y)>1.02){L.e.style.display='none';return}
      const x=(pv.x+1)/2*w0,y=(1-pv.y)/2*h0,w=L.pri==2?180:60,h=L.pri==2?24:16,rc=[x-w/2,y-h-12,x+w/2,y-12];
      if(L.pri<2&&taken.some(t=>!(rc[2]<t[0]||rc[0]>t[2]||rc[3]<t[1]||rc[1]>t[3]))){L.e.style.display='none';return}
      taken.push(rc);L.e.style.display='';L.e.style.left=x+'px';L.e.style.top=y+'px';
    });
  }

  /* panels */
  function panels(){
    const s={SIBS1:[0,0],SIBS2:[0,0]};G.segs.forEach(g=>{const k=g.d.pr in s?g.d.pr:'SIBS1';s[k][0]+=g.c.len||g.d.len||0;s[k][1]+=g.c.p||0});
    const pc=(a,b)=>b?(a/b*100).toFixed(1):'0.0',tot=s.SIBS1[0]+s.SIBS2[0],dn=s.SIBS1[1]+s.SIBS2[1];
    const chip=(t,a,b)=>'<span class="chip">'+t+' <b>'+n0(a)+' / '+n0(b)+' m</b><span class="mini"><i style="width:'+pc(a,b)+'%"></i></span><b>'+pc(a,b)+'%</b></span>';
    const nRun=lives.filter(o=>o.kind==='run').length;
    q('.chips').innerHTML=chip('SIBS-1',s.SIBS1[1],s.SIBS1[0])+chip('SIBS-2',s.SIBS2[1],s.SIBS2[0])+
      '<span class="chip">Overall <b>'+pc(dn,tot)+'%</b></span><span class="chip" style="color:#FFC83D"><b style="color:#FFC83D">'+nRun+'</b> boring now</span>';
    q('.lvh').innerHTML='Live MTBMs ('+lives.length+')<span class="tg"></span>';
    q('.lvl').innerHTML=lives.length?lives.map((o,k)=>{const d=o.s.d,c=o.s.c,eta=c.rate>0&&c.rem>0?Math.ceil(c.rem/c.rate):null;
      const stt=o.kind==='stop'?'<b style="color:#FF3B30">Stopped at face</b> · ':o.kind==='mob'?'<b style="color:#22D3EE">Mobilising</b> · ':'';
      return '<div class="ld"><div class="t">'+esc(d.f)+' → '+esc(d.t)+'<span>'+Math.round((c.pct||0)*100)+'%</span></div>'+
      '<div class="s">'+stt+esc(d.pr)+' · DN'+d.dn+' · '+n1(c.p||0)+' of '+n1(c.len||d.len)+' m · '+n1(c.rem||0)+' m to go'+(c.rate?' · '+n1(c.rate)+' m/day':'')+(eta?' · ~'+eta+' days left':'')+'</div>'+
      '<div class="bar"><i style="width:'+((c.pct||0)*100)+'%"></i></div><div class="row"><button class="btn" data-k="'+k+'" data-v="face">Cutterhead</button><button class="btn" data-k="'+k+'" data-v="pit">Jacking pit</button><button class="btn" data-k="'+k+'" data-v="site">Site</button></div></div>'}).join('')
      :'<div class="s" style="color:#93a3af;font-size:12px">No machine is boring right now.</div>';
    root.querySelectorAll('.lvl button').forEach(b=>b.onclick=()=>{stopTour();fly(lives[+b.dataset.k],b.dataset.v)});
    q('[data-a=tour]').style.display=lives.length?'':'none';
    if(typeof place==='function')place();
  }

  /* camera */
  const root=q('.stage').parentNode;
  let tw=null;
  const go=(p,t,ms=1200)=>{tw={p0:cam.position.clone(),t0:ctl.target.clone(),p,t,s:performance.now(),ms}};
  const span=Math.max(Wm,Hm);
  /* frame the alignment (all shafts), not the whole sheet */
  const bx=[],bz=[];Object.values(P).forEach(p=>{const [x,z]=xz(p[0],p[1]);bx.push(x);bz.push(z)});
  const BX0=Math.min(...bx),BX1=Math.max(...bx),BZ0=Math.min(...bz),BZ1=Math.max(...bz);
  const BW=Math.max(400,(BX1-BX0)*1.18),BH=Math.max(300,(BZ1-BZ0)*1.3),BC=new T.Vector3((BX0+BX1)/2,0,(BZ0+BZ1)/2);
  const fitDist=(w=BW,h=BH)=>{const vf=cam.fov*Math.PI/360,hf=Math.atan(Math.tan(vf)*cam.aspect);return Math.max((w*.5)/Math.tan(hf),(h*.5)/Math.tan(vf))};
  const overview=an=>{const d=fitDist()*1.08,t=BC.clone().setY(-150),p=t.clone().add(new T.Vector3(-.3,.8,.52).normalize().multiplyScalar(d));if(an)go(p,t);else{cam.position.copy(p);ctl.target.copy(t)}};
  function fly(o,v){if(FLAT)setFlat(false);let t,p;const r=o.r;
    if(v==='pit'){t=o.a.clone().addScaledVector(o.dir,-SEG*.4);p=t.clone().addScaledVector(o.dir,r*9).addScaledVector(o.side,r*11).addScaledVector(UP,r*7)}
    else if(v==='site'){t=o.top.clone().addScaledVector(UP,r*2);p=t.clone().addScaledVector(o.side,r*26).addScaledVector(o.dir,r*18).addScaledVector(UP,r*16)}
    else{t=o.f.clone().addScaledVector(o.dir,-r*2.5);p=t.clone().addScaledVector(o.dir,r*11).addScaledVector(o.side,r*9).addScaledVector(UP,r*4.5)}
    go(p,t,1800)}
  const tb=q('.tour');let ti=-1;
  function stopTour(){clearInterval(S.tourT);S.tourT=null;tb.style.display='none';q('[data-a=tour]').textContent='▶ Tour live machines'}
  q('[data-a=tour]').onclick=()=>{if(S.tourT){stopTour();return}if(!lives.length)return;
    const step=()=>{ti=(ti+1)%lives.length;const o=lives[ti];fly(o);tb.style.display='block';tb.innerHTML='Touring live machines · <b>'+esc(o.s.d.f)+' → '+esc(o.s.d.t)+'</b> · '+Math.round((o.s.c.pct||0)*100)+'%'};
    step();S.tourT=setInterval(step,7000);q('[data-a=tour]').textContent='■ Stop tour'};
  const op=q('[data-a=op]');
  function setFlat(f){FLAT=f;ctl.enableRotate=!f;gMat.opacity=f?1:op.value/100;slab.visible=!f;scene.fog=f?null:FOG;rebuild();
    if(f)go(BC.clone().setY(fitDist()*1.05).setZ(BC.z+1),BC.clone());else overview(true);q('[data-a=top]').textContent=f?'Back to 3D':'Plan view (from above)'}
  q('[data-a=top]').onclick=()=>{stopTour();setFlat(!FLAT)};
  q('[data-a=reset]').onclick=()=>{stopTour();FLAT?setFlat(false):overview(true)};
  q('[data-a=dep]').oninput=e=>{EX=+e.target.value;buildSlab();rebuild()};
  op.oninput=e=>{if(!FLAT)gMat.opacity=e.target.value/100};
  q('[data-a=pkg]').onchange=rebuild;
  q('[data-a=mlive]').onclick=()=>q('.lv').classList.toggle('open');
  q('[data-a=ix]').onclick=()=>q('.info').style.display='none';

  /* picking */
  const ray=new T.Raycaster(),mv=new T.Vector2();let down=null;
  R.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];if(S.tourT)stopTour()});
  R.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;
    const rc=R.domElement.getBoundingClientRect();mv.set((e.clientX-rc.left)/rc.width*2-1,-((e.clientY-rc.top)/rc.height)*2+1);ray.setFromCamera(mv,cam);
    const h=ray.intersectObjects(picks.filter(m=>m.parent&&m.parent.visible))[0];if(!h)return;const s=G.segs[h.object.userData],d=s.d,c=s.c,k=kindOf(s);
    const col={done:'#3BF08C',bored:'#6fe8a8',run:'#FFC83D',stop:'#FF3B30',mob:'#22D3EE',idle:'#FF8A80'}[k];
    q('.info h3').textContent=d.f+' → '+d.t;
    q('.info .kv').innerHTML='<span>Status</span><span style="color:'+col+'">'+esc(c.label||k)+'</span><span>Contract</span><span>'+esc(d.pr)+(d.sn?' · S/N '+esc(d.sn):'')+'</span><span>Pipe</span><span>DN'+d.dn+'</span>'+
      '<span>Drive length</span><span>'+n1(c.len||d.len)+' m</span><span>Jacked</span><span>'+n1(c.p||0)+' m ('+((c.pct||0)*100).toFixed(1)+'%)</span>'+
      (c.rem>0?'<span>Remaining</span><span>'+n1(c.rem)+' m</span>':'')+(c.rate?'<span>Avg rate</span><span>'+n1(c.rate)+' m/day</span>':'')+
      '<span>Planned</span><span>'+fmtD(d.ps)+' → '+fmtD(d.pf)+'</span><span>Actual</span><span>'+fmtD(d.as)+' → '+(d.af?fmtD(d.af):'—')+'</span>'+
      (c.delay!=null?'<span>Finish vs plan</span><span>'+(c.delay>0?'+'+c.delay+' days late':c.delay<0?(-c.delay)+' days early':'on plan')+'</span>':'');
    q('.info .bar i').style.width=((c.pct||0)*100)+'%';
    const lo=lives.find(o=>o.i===h.object.userData),g=q('.igo');g.style.display=lo?'':'none';g.onclick=()=>lo&&fly(lo);
    q('.info').style.display='block';
  });
  function place(){const hh=root.querySelector('header').offsetHeight;q('.lv').style.top=(hh+10)+'px';q('.tour').style.top=(hh+10)+'px'}
  if(innerWidth<1000)q('.lv').classList.add('min');
  q('.lvh').onclick=()=>q('.lv').classList.toggle('min');
  S.onR=()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();R.setSize(innerWidth,innerHeight);place()};addEventListener('resize',S.onR);

  buildSlab();rebuild();place();overview(false);
  window.__s3fly=(k,v)=>lives[k]&&fly(lives[k],v);
  let last=performance.now();
  (function loop(now){
    if(!S||!S.alive)return;S.raf=requestAnimationFrame(loop);
    const dt=Math.min(.05,(now-last)/1000);last=now;const t=now/1000;
    if(tw){const k=Math.min(1,(now-tw.s)/tw.ms),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;cam.position.lerpVectors(tw.p0,tw.p,e);ctl.target.lerpVectors(tw.t0,tw.t,e);if(k>=1)tw=null}
    lives.forEach(o=>anim(o,dt,t));ctl.update();R.render(scene,cam);placeLabels();
  })(performance.now());
}
window.SIBS3D={open:open3d};
})();
