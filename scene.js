import * as THREE from 'three';
const W = 720, H = 1280, CELL = 14, MAXH = 10000;
const params = new URLSearchParams(location.search);
const CITY = await (await fetch('city.json?'+Date.now())).json();
await Promise.all([document.fonts.load('800 60px Zain', 'عبود Abc'), document.fonts.load('900 60px Zain', '123'), document.fonts.load('700 40px Zain', 'عبود Abc')]);
await document.fonts.ready;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOutBack = p => { p = clamp(p); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const easeInOutCubic = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const easeOutCubic = p => 1 - Math.pow(1 - clamp(p), 3);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function spiral(n) { let x = 0, y = 0, dx = 1, dy = 0, seg = 1; const out = [[0, 0]];
  while (out.length < n) { for (let k = 0; k < 2; k++) { for (let s = 0; s < seg; s++) { x += dx; y += dy; out.push([x, y]); if (out.length >= n) return out; } [dx, dy] = [-dy, dx]; } seg++; }
  return out; }
const CELLS = spiral(MAXH + 10);
const cellPos = (c) => new THREE.Vector3(c[0] * CELL, 0, -c[1] * CELL);

// ---------- renderer / scene ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0xe8cf9f);
const scene = new THREE.Scene();
const FOGC = new THREE.Color(0xe9cf9f);
scene.fog = new THREE.FogExp2(FOGC, 0.0012);
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.4, 9000);
const hemi = new THREE.HemisphereLight(0xdfe8ff, 0xd8b27a, 1.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d2, 2.1); sun.position.set(-70, 95, 55); scene.add(sun);

// sky
const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 24, 14), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec3 vD; void main(){ float h=clamp(vD.y,0.,1.);
    vec3 hor=vec3(.914,.808,.624), mid=vec3(.70,.78,.88), top=vec3(.33,.55,.80);
    vec3 c=mix(hor,mid,smoothstep(0.,.10,h)); c=mix(c,top,smoothstep(.07,.55,h)); gl_FragColor=vec4(c,1.); }` }));
scene.add(sky);

// ground
const groundMat = new THREE.ShaderMaterial({
  uniforms: { uReveal: { value: 0 }, uYellow: { value: 0 }, uCell: { value: CELL }, uFog: { value: 0.001 }, uZF: { value: 9999 }, uBand: { value: 0 }, uNight: { value: 0 }, uFogC: { value: new THREE.Vector3(.914, .808, .624) } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
  fragmentShader: `varying vec3 vW; uniform float uReveal,uYellow,uCell,uFog,uZF,uBand,uNight; uniform vec3 uFogC;
   float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
   float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
   void main(){
    vec2 p=vW.xz; float vDist=length(cameraPosition-vW); float n=vn(p*.035)*.7+vn(p*.11)*.3;
    float nf=1.-smoothstep(120.,500.,vDist);
    vec3 sand=mix(vec3(.80,.63,.38),vec3(.87,.71,.45),n); sand=mix(vec3(.835,.67,.415),sand,nf);
    vec2 c=p/uCell+.5; vec2 f=fract(c); vec2 d=min(f,1.-f)*uCell; float dm=min(d.x,d.y);
    float aa=max(fwidth(dm),1e-4)*1.2;
    float road=1.-smoothstep(1.7-aa,1.7+aa,dm);
    float edge=(1.-smoothstep(.17,.17+aa,abs(dm-1.7)));
    vec3 roadC=vec3(.905,.80,.60), lineC=vec3(.47,.55,.30);
    float pv=step(uZF,vW.z); roadC=mix(roadC,vec3(.15,.16,.18),pv); lineC=mix(lineC,vec3(.92,.92,.86),pv);
    float oth=max(d.x,d.y); float dsh=step(.5,fract((d.x<d.y?vW.z:vW.x)/5.)); float cl=(1.-smoothstep(.12,.12+aa,dm))*step(2.4,oth)*dsh*pv;
    float fade=1.-smoothstep(260.,1100.,vDist);
    float r=max(abs(p.x),abs(p.y)); float mask=1.-smoothstep(uReveal-1.2,uReveal,r);
    vec3 col=sand;
    vec3 avg=mix(sand,roadC,.22+.2*pv);
    vec3 grid=mix(col,roadC,road*.9); grid=mix(grid,lineC,edge*.8); grid=mix(grid,vec3(.98,.84,.28),cl);
    col=mix(col,mix(avg,grid,fade),mask);
    float band=smoothstep(uReveal-2.0,uReveal-.9,r)*(1.-smoothstep(uReveal-.9,uReveal,r));
    col=mix(col,vec3(.98,.86,.18),band*uYellow);
    col+=vec3(1.,.78,.3)*(1.-smoothstep(0.,4.,abs(vW.z-uZF)))*uBand*.8;
    col*=mix(vec3(1.),vec3(.30,.36,.62),uNight); float fg=1.-exp(-pow(vDist*uFog,2.)); col=mix(col,uFogC,clamp(fg,0.,1.));
    gl_FragColor=vec4(col,1.); }` });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), groundMat); ground.rotation.x = -Math.PI / 2; scene.add(ground);

// dust
const NP = 300, dBase = new Float32Array(NP * 3), r0 = rng(77);
for (let i = 0; i < NP; i++) { dBase[i * 3] = r0() * 800 - 400; dBase[i * 3 + 1] = .6 + r0() * 34; dBase[i * 3 + 2] = r0() * 800 - 400; }
const dGeo = new THREE.BufferGeometry(); const dPos = new Float32Array(NP * 3); dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
const dotC = document.createElement('canvas'); dotC.width = dotC.height = 32; { const g = dotC.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ size: 3.2, map: new THREE.CanvasTexture(dotC), transparent: true, opacity: .42, depthWrite: false, fog: false, color: 0xf3dcb2 }));
dust.frustumCulled = false; scene.add(dust);

// ---------- signs ----------
const AR = /[؀-ۿ]/;
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fitText(g, txt, weight, max, w) { let s = max; do { g.font = `${weight} ${s}px Zain, sans-serif`; s -= 3; } while (g.measureText(txt).width > w && s > 20); }
function signTex(name, handle, kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const store = kind === 'store', ghost = kind === 'ghost';
  rr(g, 6, 6, 500, 244, 34); g.fillStyle = store ? '#07070f' : ghost ? '#f1f8e8' : '#fbf8ef'; g.fill();
  g.lineWidth = 8; g.strokeStyle = store ? '#00a8ff' : ghost ? '#6aa63e' : '#3a3a3a'; g.stroke();
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const main = store ? '#00a8ff' : ghost ? '#2f5a1a' : '#1d1d1d', sub = store ? '#e8ecf1' : '#31603a';
  if (name) { g.direction = AR.test(name) ? 'rtl' : 'ltr'; g.fillStyle = main; fitText(g, name, 800, store ? 100 : 86, 440); g.fillText(name, 256, handle ? 120 : 150); }
  if (handle) { g.direction = 'ltr'; g.fillStyle = sub; fitText(g, handle, 800, name ? 62 : 84, 440); g.fillText(handle, 256, name ? 205 : 160); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------- houses ----------
const STORE_TEX = await new Promise(res => { new THREE.TextureLoader().load('store.png', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }); });
const M = (hex) => new THREE.MeshLambertMaterial({ color: hex });
const matBody = ['#cdbfa4', '#d6c9ae', '#c6b89a', '#d9cdb7', '#cbbd9f'].map(M), matRoof = M('#ece7d9'), matDoor = M('#7b4a2c'), matWin = M('#5e92c0');
const gBody = new THREE.BoxGeometry(7, 3.4, 5.6), gRoof = new THREE.BoxGeometry(7.8, .45, 6.4), gDoor = new THREE.BoxGeometry(1.3, 2.1, .14), gWin = new THREE.BoxGeometry(1.35, 1.1, .14), gPole = new THREE.CylinderGeometry(.09, .09, 2.6, 6);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x5b4320, transparent: true, opacity: .22, depthWrite: false });
const gShadow = new THREE.PlaneGeometry(9.4, 7.4).rotateX(-Math.PI / 2);
const plaqueG = new THREE.PlaneGeometry(3.8, 1.9);
const poleMat = M('#6b5b3e');
function makeHouse(f, store) {
  const g = new THREE.Group();
  const s = store ? 1.5 : 1;
  const bodyM = store ? M('#14142a') : matBody[f.slot % 5], roofM = store ? M('#00a8ff') : matRoof, doorM = store ? M('#8a2be2') : matDoor, winM = store ? M('#7fd0ff') : matWin;
  const b = new THREE.Mesh(gBody, bodyM); b.position.y = 1.7; g.add(b);
  const r = new THREE.Mesh(gRoof, roofM); r.position.y = 3.62; g.add(r);
  const d = new THREE.Mesh(gDoor, doorM); d.position.set(0, 1.05, 2.84); g.add(d);
  for (const sx of [-2.2, 2.2]) { const w = new THREE.Mesh(gWin, winM); w.position.set(sx, 1.95, 2.84); g.add(w); }
  const sh = new THREE.Mesh(gShadow, shadowMat); sh.position.set(1.4, .05, .6); g.add(sh);
  const pole = new THREE.Mesh(gPole, poleMat); pole.position.set(4.7, 1.3, 3.5); g.add(pole);
  const tex = signTex(store ? 'عبود ستور' : f.name_display, store ? '@abods_tore' : f.handle, store ? 'store' : 'f');
  const plM = new THREE.MeshBasicMaterial({ map: tex }); const pl = new THREE.Mesh(plaqueG, plM); pl.position.set(4.7, 3.4, 3.57); const pl2 = new THREE.Mesh(plaqueG, plM); pl2.position.set(4.7, 3.4, 3.53); pl2.rotation.y = Math.PI; if (!store) { pl.scale.setScalar(1.4); pl2.scale.setScalar(1.4); } g.add(pl); g.add(pl2);
  if (store) { // facade banner with the store name
    const bn = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), new THREE.MeshBasicMaterial({ map: STORE_TEX, transparent: true, side: THREE.DoubleSide })); bn.position.set(0, 7.1, 0); g.add(bn);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.4, 1.0, .4), M("#00a8ff")); post.position.set(0, 3.95, 0); g.add(post);
  }
  g.scale.setScalar(.0001);
  return { g, s };
}
const houses = [];
const storeH = makeHouse(null, true); storeH.g.position.copy(cellPos([0, 0])); scene.add(storeH.g); storeH.slot = 0;
for (const f of CITY.followers) { const h = makeHouse(f, false); h.g.position.copy(cellPos(f.cell)); h.slot = f.slot; h.f = f; scene.add(h.g); houses.push(h); }

// ---------- country flags above residents' houses (follower.flag in city.json) ----------
function star(g, x, y, r, n, inner) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, k = i % 2 ? r * inner : r; g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * k, y + Math.sin(a) * k); } g.closePath(); g.fill(); }
const stripes = (g, W, H, cols) => cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * H / 3, W, H / 3 + 1); });
const FLAGS = {
  jo: { w: 600, h: 300, draw: (g, W, H) => { stripes(g, W, H, ['#000000', '#ffffff', '#007a3d']); g.fillStyle = '#ce1126'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, H / 2); g.lineTo(0, H); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; star(g, W * .155, H / 2, H * .095, 7, .48); } },
  sy: { w: 600, h: 400, draw: (g, W, H) => { stripes(g, W, H, ['#007a3d', '#ffffff', '#000000']); g.fillStyle = '#ce1126'; for (const k of [.25, .5, .75]) star(g, W * k, H / 2, H * .13, 5, .382); } },
};
const flagTex = {}; const texFor = code => flagTex[code] || (flagTex[code] = (() => { const F = FLAGS[code], c = document.createElement('canvas'); c.width = F.w; c.height = F.h; F.draw(c.getContext('2d'), F.w, F.h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })());
const flags = [];
for (const h of houses) { const code = h.f.flag; if (!FLAGS[code]) continue; const g = new THREE.Group(); g.position.set(-2.4, 3.8, 0);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.13, .16, 7.4, 8), new THREE.MeshLambertMaterial({ color: '#d9dde3' })); pole.position.y = 3.7; g.add(pole);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd45a' })); knob.position.y = 7.5; g.add(knob);
  const W = 5.6, H = W * FLAGS[code].h / FLAGS[code].w; const geo = new THREE.PlaneGeometry(W, H, 28, 8).translate(W / 2, 0, 0);
  const cloth = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texFor(code), side: THREE.DoubleSide, fog: false })); cloth.position.set(.12, 7.25 - H / 2, 0); g.add(cloth);
  h.g.add(g); flags.push({ slot: h.slot, code, g, geo, base: geo.attributes.position.array.slice(), W, ph: h.slot * 1.7 }); }
// pure function of t (seconds), so the film can seek it
function waveFlags(t) { for (const f of flags) { const a = f.geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) { const x = f.base[i], k = x / f.W; a[i + 2] = Math.sin(x * 1.5 - t * 6 + f.ph) * .5 * k; a[i + 1] = f.base[i + 1] + Math.sin(x * 1.1 - t * 4.3 + f.ph) * .14 * k; } f.geo.attributes.position.needsUpdate = true; } }
waveFlags(0);

// ghost plot (next free slot) for the closing shot
const ghostCell = CITY.meta.next_free_cell; const ghost = new THREE.Group(); ghost.position.copy(cellPos(ghostCell));
{ const pad = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 7.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9ccf6a, transparent: true, opacity: .55, depthWrite: false })); pad.position.y = .09; ghost.add(pad);
  const pole = new THREE.Mesh(gPole, poleMat); pole.position.set(0, 1.3, 0); ghost.add(pole);
  const pl = new THREE.Mesh(plaqueG, new THREE.MeshBasicMaterial({ map: signTex('بيتك هنا', '@username', 'ghost'), side: THREE.DoubleSide })); pl.position.set(0, 3.15, .05); ghost.add(pl); }
ghost.scale.setScalar(.0001); scene.add(ghost);

// ---------- services: reserved plots, cinema (Netflix) + mosque ----------
const SV = Object.fromEntries(CITY.services.map(s => [s.id, s]));
const svPos = (id) => cellPos(SV[id].cell);
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
const NFLX_TEX = await new Promise(res => new THREE.TextureLoader().load('netflix.png', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }));
const nRibbonTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  const bar = (x0, x1, c0, c1) => { const gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x0, 40, x1 - x0, 432); };
  bar(130, 215, '#7a0409', '#b20710'); bar(297, 382, '#b20710', '#7a0409');
  g.beginPath(); g.moveTo(130, 40); g.lineTo(215, 40); g.lineTo(382, 472); g.lineTo(297, 472); g.closePath(); const gd = g.createLinearGradient(130, 40, 382, 472); gd.addColorStop(0, '#f5333d'); gd.addColorStop(1, '#e50914'); g.fillStyle = gd; g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const pad = (w, d, col, op) => new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false }));
const addTo = (g) => (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m); return m; };
const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const MB = (hex, extra = {}) => new THREE.MeshBasicMaterial({ color: hex, ...extra });
const sprite = (col, size, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.set(size, size, 1); return s; };

// plots (visible from the first frame): green pad + four stakes; beam lights up on the announcement
function makePlot(id) {
  const g = new THREE.Group(); g.position.copy(svPos(id)); const add = addTo(g);
  const p = pad(11.8, 11.8, 0x9ccf6a, .55); p.position.y = .08; g.add(p);
  const bord = new THREE.Mesh(new THREE.RingGeometry(1, 1.0001, 4), new THREE.MeshBasicMaterial({ visible: false })); g.add(bord);
  for (const [sx, sz] of [[-5.4, -5.4], [5.4, -5.4], [-5.4, 5.4], [5.4, 5.4]]) { add(BX(.35, 1.5, .35), M('#f2eee4'), sx, .75, sz); add(BX(.45, .25, .45), M('#d9a441'), sx, 1.55, sz); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.6, 140, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })); beam.position.y = 70; g.add(beam);
  const lit = pad(11.8, 11.8, 0xffd45a, 0); lit.position.y = .12; lit.material.blending = THREE.AdditiveBlending; g.add(lit);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 5.6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); ring.position.y = .2; g.add(ring);
  scene.add(g); return { g, p, beam, lit, ring, stakes: g.children.filter(c => c.geometry && c.geometry.type === 'BoxGeometry') };
}
const plotN = makePlot('netflix'), plotM = makePlot('mosque');

// cinema: black body, Netflix-red accents, N ribbon on the facade, transparent logo above
const cinema = (() => { const g = new THREE.Group(); g.position.copy(svPos('netflix')); const add = addTo(g);
  const blk = M('#0c0c0e'), blk2 = M('#17171b'), red = new THREE.MeshLambertMaterial({ color: '#e50914', emissive: '#6a0309' });
  add(BX(13.4, 8.2, 9.2), blk, 0, 4.1, 0); add(BX(14.2, .6, 10), red, 0, 8.5, 0); add(BX(14, .5, 9.8), blk2, 0, 7.9, 0);
  add(BX(14, .7, .5), red, 0, 6.5, 4.75); // marquee band
  for (let i = 0; i < 11; i++) add(BX(.55, .55, .3), MB(i % 2 ? '#fff3c4' : '#ffd05a'), -6 + i * 1.2, 6.5, 5.1);
  const rib = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2), new THREE.MeshBasicMaterial({ map: nRibbonTex, transparent: true })); rib.position.set(0, 3.4, 4.62); g.add(rib);
  add(BX(4.8, .35, 2.6), red, 0, 3.05, 5.9); for (const sx of [-2.2, 2.2]) add(BX(.25, 3, .25), blk2, sx, 1.5, 7.0); // canopy over entrance
  add(BX(2.2, 2.7, .2), M('#2a0c0f'), 0, 1.35, 4.65); add(BX(1.2, 2.2, .1), MB('#ff4a52'), 0, 1.3, 4.78);
  for (const sx of [-5.1, 5.1]) { add(BX(2.0, 3.0, .15), MB('#3a0d11'), sx, 2.6, 4.66); add(BX(1.7, 2.6, .1), MB(sx < 0 ? '#c1121f' : '#8a1f2b'), sx, 2.6, 4.74); } // film posters
  add(BX(.5, 3.4, .5), red, 0, 9.4 + .8, 0);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: NFLX_TEX, transparent: true, side: THREE.DoubleSide })); logo.position.set(0, 15.2, 0); g.add(logo);
  const gl = sprite(0xe50914, 30, .55); gl.position.set(0, 15.2, -.8); g.add(gl); const gl2 = sprite(0xe50914, 26, .45); gl2.position.set(0, 3, 9); g.add(gl2);
  g.scale.setScalar(.0001); scene.add(g); return { g, top: 20.5 }; })();

// mosque: bigger than a house, dome + minaret + crescent, warm light
const mosque = (() => { const g = new THREE.Group(); g.position.copy(svPos('mosque')); const parts = [];
  const cream = M('#f3e9d1'), cream2 = M('#e3d4b3'), teal = M('#1b8a74'), teal2 = M('#13705e'), stone = M('#eadfc4');
  const gold = new THREE.MeshLambertMaterial({ color: '#e0ad34', emissive: '#7a5410' }), lit = MB('#ffd27a'), water = new THREE.MeshBasicMaterial({ color: 0x7fd8ee, transparent: true, opacity: .85 });
  const P = (geo, mat, x, y, z, o, ex = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (ex.rx) m.rotation.x = ex.rx; if (ex.rz) m.rotation.z = ex.rz; if (ex.ry) m.rotation.y = ex.ry; m.userData = { o, sy: ex.sy || 1, x, y, z }; g.add(m); parts.push(m); return m; };
  const BZ = -1.6;
  // foundation + courtyard
  P(new THREE.PlaneGeometry(12.4, 4.2).rotateX(-Math.PI / 2), stone, 0, .11, 4.7, 0);
  P(BX(11.6, .5, 8.8), cream2, 0, .25, BZ, 0);
  // main hall
  P(BX(10.6, 6.2, 8.2), cream, 0, 3.6, BZ, 1); P(BX(11.4, .5, 9.0), cream2, 0, 6.95, BZ, 2);
  // front iwan + arches
  P(BX(4.6, 7.8, 1.2), cream2, 0, 4.2, 3.0, 2); P(BX(2.6, 4.2, .14), lit, 0, 2.5, 3.66, 7);
  P(new THREE.CylinderGeometry(1.3, 1.3, .14, 18, 1, false, 0, Math.PI), lit, 0, 4.6, 3.66, 7, { rx: Math.PI / 2 });
  for (const sx of [-4.0, -2.4, 2.4, 4.0]) { P(BX(1.0, 2.6, .12), lit, sx, 3.7, 2.78, 7); P(new THREE.CylinderGeometry(.5, .5, .12, 12, 1, false, 0, Math.PI), lit, sx, 5.0, 2.78, 7, { rx: Math.PI / 2 }); }
  // drum + main dome
  P(new THREE.CylinderGeometry(3.3, 3.5, 2.0, 24), cream, 0, 8.0, BZ, 3);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + .2; P(BX(.55, 1.0, .12), lit, Math.sin(a) * 3.45, 8.1, BZ + Math.cos(a) * 3.45, 7, { ry: a }); }
  P(new THREE.SphereGeometry(3.9, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), teal, 0, 9.0, BZ, 4, { sy: 1.18 });
  P(new THREE.CylinderGeometry(.14, .14, 1.9, 8), gold, 0, 14.1, BZ, 6);
  P(new THREE.TorusGeometry(.7, .14, 8, 24, Math.PI * 1.55), gold, 0, 15.5, BZ, 6, { rz: Math.PI * .5 + Math.PI * .225 });
  // four corner domes
  for (const [sx, sz] of [[-4.3, -3.9], [4.3, -3.9], [-4.3, .7], [4.3, .7]]) { P(new THREE.CylinderGeometry(1.1, 1.2, 1.0, 14), cream, sx, 7.7, sz, 3); P(new THREE.SphereGeometry(1.4, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), teal2, sx, 8.2, sz, 5, { sy: 1.15 }); P(new THREE.CylinderGeometry(.07, .07, .9, 6), gold, sx, 10.1, sz, 6); }
  // two minarets
  for (const sx of [-5.9, 5.9]) { const mz = .2;
    P(new THREE.CylinderGeometry(.82, 1.0, 15.2, 16), cream, sx, 7.6, mz, 2); P(new THREE.CylinderGeometry(1.4, 1.4, .45, 16), cream2, sx, 12.9, mz, 3);
    P(new THREE.CylinderGeometry(1.5, 1.5, .18, 16), gold, sx, 13.2, mz, 5);
    P(new THREE.CylinderGeometry(.74, .74, 3.4, 16), cream, sx, 14.9, mz, 4); P(new THREE.CylinderGeometry(1.05, 1.05, .3, 16), cream2, sx, 16.7, mz, 5);
    P(new THREE.ConeGeometry(1.0, 2.8, 16), teal, sx, 18.3, mz, 5); P(new THREE.CylinderGeometry(.07, .07, 1.3, 6), gold, sx, 20.3, mz, 6);
    P(new THREE.TorusGeometry(.38, .09, 8, 20, Math.PI * 1.55), gold, sx, 21.2, mz, 6, { rz: Math.PI * .5 + Math.PI * .225 });
    for (const yy of [5.0, 9.5]) P(BX(.28, .9, .12), lit, sx, yy, mz + .86, 7); }
  // fountain + lanterns
  P(new THREE.CylinderGeometry(1.3, 1.45, .55, 18), stone, 0, .4, 5.0, 3); const wat = P(new THREE.CylinderGeometry(1.1, 1.1, .1, 18), water, 0, .72, 5.0, 7);
  const jet = P(new THREE.CylinderGeometry(.05, .2, 2.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: .7, depthWrite: false }), 0, 1.95, 5.0, 7);
  for (const sx of [-5.2, 5.2]) { P(new THREE.CylinderGeometry(.1, .12, 2.6, 6), gold, sx, 1.3, 6.3, 6); P(new THREE.SphereGeometry(.34, 10, 8), lit, sx, 2.8, 6.3, 7); }
  const glow = sprite(0xffb347, 42, .0); glow.position.set(0, 8, 6); g.add(glow); const glow2 = sprite(0xffd27a, 20, .0); glow2.position.set(0, 3, 6.5); g.add(glow2);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc866, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pool.position.y = .15; g.add(pool);
  glow.material.opacity = .3; glow2.material.opacity = .25; pool.material.opacity = .4; g.scale.setScalar(.0001); scene.add(g); return { g, top: 22 }; })();

// ---------- central bank (episode 8) ----------
const goldM = new THREE.MeshLambertMaterial({ color: '#e0ad34', emissive: '#7a5410' });
const bank = (() => { const g = new THREE.Group(); g.position.copy(svPos('bank'));
  const cream = M('#f1e6cc'), cream2 = M('#dccfae'), stone = M('#e8dec6'), green = M('#17503f'), lit = MB('#ffd27a');
  const P = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  P(BX(12.6, .5, 11.4), stone, 0, .25, .9);
  P(BX(10.4, 6.6, 8), cream, 0, 3.9, 0);
  P(BX(2.4, 3.6, .14), lit, 0, 2.6, 4.06); for (const sx of [-3.4, 3.4]) P(BX(1.1, 2.2, .12), lit, sx, 3.8, 4.06);
  for (const sx of [-4.5, -2.7, -.9, .9, 2.7, 4.5]) { P(new THREE.CylinderGeometry(.5, .56, 6.6, 14), cream2, sx, 3.8, 4.8); P(BX(1.3, .32, 1.3), cream2, sx, 7.2, 4.8); }
  P(BX(11.6, .6, 10), cream2, 0, 7.5, .5);
  const sh = new THREE.Shape(); sh.moveTo(-6, 0); sh.lineTo(6, 0); sh.lineTo(0, 2.6); sh.closePath(); const ped = new THREE.ExtrudeGeometry(sh, { depth: 1.4, bevelEnabled: false }); ped.translate(0, 0, -.7);
  P(ped, cream, 0, 7.8, 4.9);
  P(BX(8.4, 1.3, .25), green, 0, 8.55, 5.75);
  P(new THREE.CylinderGeometry(3.0, 3.2, 1.3, 26), cream, 0, 8.45, 0);
  const dome = P(new THREE.SphereGeometry(3.1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), goldM, 0, 9.1, 0); dome.scale.y = 1.1;
  P(new THREE.CylinderGeometry(.12, .12, 1.8, 8), goldM, 0, 13.4, 0);
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 140; { const c2 = sc.getContext('2d'); c2.fillStyle = '#ffd45a'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.direction = 'rtl'; c2.font = '900 104px Zain, sans-serif'; c2.fillText('البنك المركزي', 512, 74); }
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; st.anisotropy = 8;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 1.1), new THREE.MeshBasicMaterial({ map: st, transparent: true })); sign.position.set(0, 8.55, 5.9); g.add(sign);
  const glow = sprite(0xffb347, 40, .3); glow.position.set(0, 8, 6); g.add(glow);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc866, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pool.position.set(0, .12, 3); g.add(pool);
  scene.add(g); return { g, glow, pool }; })();

// ---------- Shahid VIP (episode 9, opened at 300 followers) ----------
const SHAHID_TEX = await new Promise(res => new THREE.TextureLoader().load('shahid.png', t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }));
const shahid = (() => { const g = new THREE.Group(); g.position.copy(svPos('shahid')); const add = addTo(g);
  const body = M('#101c30'), deck = M('#0a1322');
  const green = new THREE.MeshLambertMaterial({ color: '#2bd67b', emissive: '#12804a' }), blue = new THREE.MeshLambertMaterial({ color: '#0a84f0', emissive: '#054a8c' }), teal = new THREE.MeshLambertMaterial({ color: '#17abbd', emissive: '#0b5f6b' });
  add(BX(12.4, .4, 11.2), deck, 0, .2, .6);
  add(BX(11.2, 8.6, 8.2), body, 0, 4.5, 0);
  // gradient crown (green -> blue) and base trim
  [green, teal, blue].forEach((m, i) => { add(BX(3.96, .55, 9.0), m, -3.96 + i * 3.96, 9.07, 0); add(BX(3.8, .2, 8.5), m, -3.8 + i * 3.8, .5, 0); });
  // side pillars of light
  add(BX(.3, 8.6, .3), green, -5.6, 4.5, 4.15); add(BX(.3, 8.6, .3), blue, 5.6, 4.5, 4.15);
  for (const sx of [-4.0, 4.0]) for (const yy of [2.0, 4.1]) add(BX(1.7, 1.35, .12), MB(sx < 0 ? '#9ff3c9' : '#9fd2ff'), sx, yy, 4.13);
  add(BX(2.6, 3.2, .14), MB('#c9fff0'), 0, 1.9, 4.13); add(BX(.12, 3.2, .1), deck, 0, 1.9, 4.23);
  add(BX(4.4, .3, 2.0), teal, 0, 3.8, 5.0); for (const sx of [-2.0, 2.0]) add(BX(.2, 3.5, .2), deck, sx, 2.0, 5.85);
  const sc = document.createElement('canvas'); sc.width = 1024; sc.height = 220; { const c = sc.getContext('2d'); rr(c, 4, 4, 1016, 212, 40); c.fillStyle = '#060c17'; c.fill(); const gr = c.createLinearGradient(80, 0, 944, 0); gr.addColorStop(0, '#0a84f0'); gr.addColorStop(1, '#2ee07f'); c.lineWidth = 8; c.strokeStyle = gr; c.stroke(); c.fillStyle = gr; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'; c.font = '900 150px Zain, sans-serif'; c.fillText('شاهد VIP', 512, 118); }
  const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; st.anisotropy = 8;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 2.06), new THREE.MeshBasicMaterial({ map: st, transparent: true })); sign.position.set(0, 6.55, 4.22); g.add(sign);
  add(BX(.45, 2.4, .45), teal, 0, 10.4, 0);
  const logoMat = new THREE.MeshBasicMaterial({ map: SHAHID_TEX, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 9.6), logoMat); logo.position.set(0, 15.0, .05); g.add(logo);
  const gl = sprite(0x1fd6a0, 30, .45); gl.position.set(0, 15.0, -1); g.add(gl); const gl2 = sprite(0x1597e8, 26, .4); gl2.position.set(0, 3, 8.5); g.add(gl2);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x2fd0c0, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); pool.position.set(0, .14, 3); g.add(pool);
  scene.add(g); return { g, top: 19.5, logo, glow: gl, glow2: gl2, pool }; })();

// ---------- street lamps + day/night ----------
const LAMPS = []; for (let i = -10; i <= 9; i++) for (let j = -10; j <= 9; j++) LAMPS.push([i * CELL + 7 + 2.0, j * CELL + 7 + 2.0]);
const mkI = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; scene.add(m); return m; };
const lampPole = mkI(new THREE.BoxGeometry(.28, 6, .28), new THREE.MeshLambertMaterial({ color: '#3b3d42' }), LAMPS.length);
const lampHead = mkI(new THREE.BoxGeometry(1.5, .34, .7), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), LAMPS.length);
const lampPool = mkI(new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffc866, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), LAMPS.length);
{ const m4 = new THREE.Matrix4(); LAMPS.forEach(([x, z], i) => {
    lampPole.setMatrixAt(i, m4.makeTranslation(x, 3, z)); lampHead.setMatrixAt(i, m4.makeTranslation(x, 6.1, z)); lampPool.setMatrixAt(i, m4.makeTranslation(x, .13, z)); }); }
lampPole.visible = lampHead.visible = lampPool.visible = false;
const daySky = sky.material;
const nightSky = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec3 vD; float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
   void main(){ vec3 d=normalize(vD); float h=clamp(d.y,0.,1.);
    vec3 hor=vec3(.07,.12,.27), mid=vec3(.03,.06,.17), top=vec3(.012,.025,.085);
    vec3 c=mix(hor,mid,smoothstep(0.,.14,h)); c=mix(c,top,smoothstep(.1,.6,h));
    vec2 uv=vec2(atan(d.z,d.x),asin(clamp(d.y,-1.,1.)))*70.; vec2 cl=floor(uv); float r=h21(cl); float st=step(.987,r)*smoothstep(.06,.25,h); vec2 fc=fract(uv)-.5; st*=smoothstep(.5,.0,length(fc)*1.6);
    c+=vec3(.85,.9,1.)*st*(.5+.5*h21(cl+3.));
    vec3 md=normalize(vec3(-.45,.5,.55)); float m=dot(d,md); c+=vec3(.95,.96,.88)*smoothstep(.9965,.9985,m)+vec3(.35,.4,.6)*smoothstep(.97,.999,m)*.35;
    gl_FragColor=vec4(c,1.); }` });
const DAY = { clear: 0xe8cf9f, fog: 0xe9cf9f, ufog: [.914, .808, .624], hs: 0xdfe8ff, hg: 0xd8b27a, hi: 1.55, sun: 0xfff0d2, si: 2.1, dust: 0xf3dcb2 };
const NIGHT = { clear: 0x0a1330, fog: 0x0b1530, ufog: [.043, .082, .19], hs: 0x7d93d6, hg: 0x303658, hi: 1.05, sun: 0xa9bcff, si: 1.0, dust: 0x9fb2e6 };
let isNight = false;
function setNight(on) {
  isNight = !!on; const k = isNight ? NIGHT : DAY;
  renderer.setClearColor(k.clear); scene.fog.color.set(k.fog); groundMat.uniforms.uFogC.value.set(...k.ufog); groundMat.uniforms.uNight.value = isNight ? 1 : 0;
  hemi.color.set(k.hs); hemi.groundColor.set(k.hg); hemi.intensity = k.hi; sun.color.set(k.sun); sun.intensity = k.si;
  sky.material = isNight ? nightSky : daySky; dust.material.color.set(k.dust);
  if (isNight) { matWin.color.set('#ffd77a'); matWin.emissive.set('#ffb640'); matWin.emissiveIntensity = 1.3; } else { matWin.color.set('#5e92c0'); matWin.emissive.set('#000000'); matWin.emissiveIntensity = 1; }
  lampPole.visible = lampHead.visible = lampPool.visible = isNight;
  bank.glow.material.opacity = isNight ? .75 : .3; bank.pool.material.opacity = isNight ? .8 : .4;
  return isNight;
}
const getNight = () => isNight;

export { flags, waveFlags, setNight, getNight, bank, shahid,  THREE, renderer, scene, camera, houses, storeH, cinema, mosque, groundMat, sky, dust, CITY, CELL, cellPos, SV, svPos, plotN, plotM, ghost, pad, sprite };
