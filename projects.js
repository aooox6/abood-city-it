// City projects (episode 11): stadium, airport and park. Static geometry + pure-function-of-time animation.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const bas = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CY = (a, b, h, n = 16) => new THREE.CylinderGeometry(a, b, h, n);
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function tex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function put(g, geo, mat, x = 0, y = 0, z = 0, ry = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m; }
function flat(g, w, d, mat, x, y, z, ry = 0) { return put(g, new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat, x, y, z, ry); }
function sign(g, text, x, y, z, w, fg, bg) {
  const t = tex(1024, 200, (c) => { c.fillStyle = bg; c.beginPath(); c.roundRect(6, 6, 1012, 188, 44); c.fill(); c.lineWidth = 8; c.strokeStyle = fg; c.stroke(); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'; c.font = '900 128px Zain, sans-serif'; c.fillText(text, 512, 108); });
  const m = bas('#ffffff', { map: t, transparent: true }); const h = w * 200 / 1024;
  put(g, new THREE.PlaneGeometry(w, h), m, x, y, z + .06); put(g, new THREE.PlaneGeometry(w, h), m, x, y, z - .06, Math.PI);
  for (const s of [-1, 1]) put(g, BX(.3, y, .3), lam('#d9dde3'), x + s * (w / 2 - .6), y / 2, z);
}
function bushes(g, list, s = 1) { const geo = new THREE.IcosahedronGeometry(1, 1), ms = ['#3f8f3a', '#2f7d34', '#56a33f'].map(c => lam(c, { flatShading: true }));
  list.forEach(([x, z], i) => { for (let k = 0; k < 3; k++) { const m = put(g, geo, ms[(i + k) % 3], x + (k - 1) * .8 * s, .55 * s + (k === 1 ? .2 : 0), z + (k % 2) * .4 * s); m.scale.setScalar((k === 1 ? .9 : .68) * s); } }); }
function trees(g, list) { const trunk = lam('#7a5434'), crowns = ['#3f8f3a', '#2f7d34', '#56a33f', '#47963c'].map(c => lam(c, { flatShading: true })), ico = new THREE.IcosahedronGeometry(1.25, 1), cone = new THREE.ConeGeometry(.95, 4, 9);
  list.forEach(([x, z, k = 0], i) => { put(g, CY(.18, .26, 1.8, 6), trunk, x, .9, z); if (k) put(g, cone, crowns[1], x, 3.5, z); else { put(g, ico, crowns[i % 4], x, 2.5, z); put(g, ico, crowns[(i + 2) % 4], x + .25, 3.45, z - .1).scale.setScalar(.62); } }); }

// =====================================================================  STADIUM
// p -> angle warp so equal steps of p cover equal arc length (the raw superellipse bunches points near the corners)
const ARC = (() => { const N = 6000, at = t => { const c = Math.cos(t), s = Math.sin(t); return [18.65 * Math.sign(c) * Math.pow(Math.abs(c), 2 / 3.1), 13.65 * Math.sign(s) * Math.pow(Math.abs(s), 2 / 3.1)]; };
  const len = [0]; let q = at(0); for (let i = 1; i <= N; i++) { const p = at(i / N * TAU); len.push(len[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1])); q = p; }
  const M = 1440, out = []; let j = 1; for (let k = 0; k <= M; k++) { const s = len[N] * k / M; while (j < N && len[j] < s) j++; out.push((j - 1 + (s - len[j - 1]) / (len[j] - len[j - 1])) / N * TAU); } return out; })();
function warp(p) { const turns = Math.floor(p / TAU), x = (p / TAU - turns) * 1440, i = Math.min(1439, Math.floor(x)); return turns * TAU + ARC[i] + (ARC[i + 1] - ARC[i]) * (x - i); }
function superPt(p, a, b, n) { const t = warp(p), c = Math.cos(t), s = Math.sin(t); return [a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]; }
// loft a surface between rings [{a,b,y}] along the superellipse; u around, v along the rings
function loft(rings, n = 3.1, seg = 160, t0 = 0, t1 = TAU) {
  const pos = [], uv = [], idx = [];
  rings.forEach((r, j) => { for (let i = 0; i <= seg; i++) { const t = t0 + (t1 - t0) * i / seg; const [x, z] = superPt(t, r.a, r.b, n); pos.push(x, r.y, z); uv.push(i / seg, r.v !== undefined ? r.v : j / (rings.length - 1)); } });
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < seg; i++) { const p = j * (seg + 1) + i, q = p + seg + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
function seatTex(bands, aisles = 40, letters = null) {
  return tex(4096, 512, (g, W, H) => {
    // v = 0 is the bottom of the canvas
    for (const [v0, v1, col] of bands) { g.fillStyle = col; g.fillRect(0, H * (1 - v1), W, H * (v1 - v0) + 1); }
    const R = rng(5);
    for (let y = 0; y < H; y += 16) { g.fillStyle = 'rgba(40,20,20,.22)'; g.fillRect(0, y, W, 4); for (let x = 0; x < W; x += 12) if (R() < .3) { g.fillStyle = R() < .5 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.12)'; g.fillRect(x, y + 4, 9, 11); } }
    for (let i = 0; i < aisles; i++) { g.fillStyle = '#eee9df'; g.fillRect((i + .5) * W / aisles - 5, 0, 10, H); }
    for (const [v0] of bands.slice(1)) { g.fillStyle = '#f2efe8'; g.fillRect(0, H * (1 - v0) - 6, W, 12); }
    if (letters) letters(g, W, H);
  });
}
function makeStadium() {
  const g = new THREE.Group(), anim = [];
  const A = 26, B = 21; // outer footprint
  // plaza: faceted grey base with a dark brown rim
  const rim = put(g, CY(1, 1, .8, 10), lam('#5a2f22'), 0, .4, 0, Math.PI / 10); rim.scale.set(33, 1, 28.5);
  const plazaTex = tex(512, 512, (c, W, H) => { c.fillStyle = '#c9c8c4'; c.fillRect(0, 0, W, H); const R = rng(9); for (let i = 0; i < 9000; i++) { c.fillStyle = R() < .5 ? 'rgba(255,255,255,.3)' : 'rgba(60,60,60,.16)'; c.fillRect(R() * W, R() * H, 2, 2); } });
  const top = put(g, new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2), lam('#ffffff', { map: plazaTex }), 0, .83, 0, Math.PI * .1 - Math.PI / 2); top.scale.set(31.6, 1, 27.2);
  const Y = .85;
  // seating bowl: terracotta lower tier, blue ring, terracotta upper tier
  const rings = [{ a: 15.2, b: 10.4, y: Y + .5, v: 0 }, { a: 18.4, b: 13.4, y: Y + 2.7, v: .36 }, { a: 18.9, b: 13.9, y: Y + 3.6, v: .42 }, { a: 21.6, b: 16.5, y: Y + 6.3, v: .7 }, { a: 22.1, b: 17.0, y: Y + 7.2, v: .76 }, { a: 25.4, b: 20.4, y: Y + 11.2, v: 1 }];
  const bandsT = [[0, .36, '#c98a7a'], [.36, .42, '#2d3f6b'], [.42, .7, '#4f9bd3'], [.7, .76, '#5a3a36'], [.76, 1, '#c4867a']];
  const letters = (c, W, H) => { // north stand (u = .75); the loft is arc-length uniform, so plain text stays undistorted
    c.fillStyle = '#1f6fb4'; c.fillRect(W * .635, H * (1 - .56) - 66, W * .23, 132);
    c.font = '900 118px Zain, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'ltr'; c.fillStyle = '#ffd23f'; c.fillText('ABOOD  STORE', W * .75, H * (1 - .56) + 6, W * .21); };
  put(g, loft(rings), lam('#ffffff', { map: seatTex(bandsT, 44, letters), side: THREE.DoubleSide, emissive: '#1a1210' }));
  // pitch-side wall with advertising boards
  const adTex = tex(2048, 64, (c, W, H) => { c.fillStyle = '#14234a'; c.fillRect(0, 0, W, H); c.font = '800 40px Zain, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffd23f' : '#ffffff'; c.fillText(i % 2 ? 'عبود ستور' : 'ملعب المدينة', (i + .5) * W / 8, H / 2); } });
  put(g, loft([{ a: 15.2, b: 10.4, y: Y }, { a: 15.2, b: 10.4, y: Y + .7 }]), bas('#ffffff', { map: adTex, side: THREE.DoubleSide }));
  // pitch
  const pitchTex = tex(1024, 700, (c, W, H) => { for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#2f9a3d' : '#3cb04a'; c.fillRect(i * W / 14, 0, W / 14 + 1, H); }
    c.strokeStyle = '#f4fff4'; c.lineWidth = 6; const mx = 95, my = 80; c.strokeRect(mx, my, W - 2 * mx, H - 2 * my); c.beginPath(); c.moveTo(W / 2, my); c.lineTo(W / 2, H - my); c.stroke(); c.beginPath(); c.arc(W / 2, H / 2, 82, 0, TAU); c.stroke();
    for (const s of [0, 1]) { const x = s ? W - mx - 140 : mx; c.strokeRect(x, H / 2 - 145, 140, 290); c.strokeRect(s ? W - mx - 52 : mx, H / 2 - 70, 52, 140); c.beginPath(); c.arc(s ? W - mx - 140 : mx + 140, H / 2, 62, s ? Math.PI / 2 : -Math.PI / 2, s ? Math.PI * 1.5 : Math.PI / 2); c.stroke(); } });
  const pitch = put(g, new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2), bas('#2f9a3d'), 0, Y + .06, 0); pitch.visible = false;
  { const sh = []; for (let i = 0; i < 120; i++) { const [x, z] = superPt(i / 120 * TAU, 15.2, 10.4, 3.1); sh.push(new THREE.Vector2(x, -z)); } const geo = new THREE.ShapeGeometry(new THREE.Shape(sh)); const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 29 + .5, p.getY(i) / 19.8 + .5); geo.rotateX(-Math.PI / 2); put(g, geo, bas('#ffffff', { map: pitchTex }), 0, Y + .08, 0); }
  for (const s of [-1, 1]) { const white = bas('#ffffff'); for (const dz of [-1.7, 1.7]) put(g, BX(.18, 1.4, .18), white, s * 12.3, Y + .75, dz); put(g, BX(.18, .18, 3.58), white, s * 12.3, Y + 1.45, 0); put(g, new THREE.PlaneGeometry(3.4, 1.35), bas('#ffffff', { transparent: true, opacity: .3, side: THREE.DoubleSide }), s * 12.9, Y + .75, 0, Math.PI / 2); }
  const ball = put(g, new THREE.SphereGeometry(.38, 12, 10), bas('#ffffff'), 0, Y + .45, 0);
  // outer facade: dark glazing between white mullions and floor slabs
  const facTex = tex(2048, 256, (c, W, H) => { c.fillStyle = '#3a4247'; c.fillRect(0, 0, W, H); for (let i = 0; i < 80; i++) { const x = i * W / 80; c.fillStyle = i % 3 ? '#26323a' : '#56666e'; c.fillRect(x + 4, 0, W / 80 - 8, H); c.fillStyle = '#d9d8d2'; c.fillRect(x, 0, 5, H); } for (const y of [0, 62, 128, 194, 244]) { c.fillStyle = '#e6e4dd'; c.fillRect(0, y, W, 12); } });
  put(g, loft([{ a: 26.0, b: 21.0, y: Y }, { a: 26.0, b: 21.0, y: Y + 11.2 }]), lam('#ffffff', { map: facTex, side: THREE.DoubleSide }));
  const white = lam('#eeece5', { side: THREE.DoubleSide });
  put(g, loft([{ a: 25.3, b: 20.3, y: Y + 11.2 }, { a: 26.3, b: 21.3, y: Y + 11.25 }, { a: 26.3, b: 21.3, y: Y + 10.5 }]), white);
  // pillars all round
  for (let i = 0; i < 56; i++) { const t = i / 56 * TAU; const [x, z] = superPt(t, 26.35, 21.35, 3.1); put(g, BX(.45, 11.2, .45), white, x, Y + 5.6, z); }
  // south front: three stacked curved ramps with railings (the model's terraces)
  const rail = tex(1024, 32, (c, W, H) => { c.fillStyle = '#efede6'; c.fillRect(0, 0, W, H); c.fillStyle = '#5f6f52'; for (let x = 0; x < W; x += 14) c.fillRect(x, 8, 6, H - 10); });
  const T0 = .17 * Math.PI, T1 = .83 * Math.PI; // +z side
  [[2.6, 29.6, 24.6, T0, T1], [5.4, 28.7, 23.7, T0 + .06, T1 - .02], [8.1, 27.8, 22.8, T0 + .12, T1 - .08]].forEach(([y, a, b, s0, s1]) => {
    put(g, loft([{ a: 26.0, b: 21.0, y: Y + y }, { a, b, y: Y + y - .25 }], 3.1, 80, s0, s1), white);
    put(g, loft([{ a, b, y: Y + y - .65 }, { a, b, y: Y + y + .55 }], 3.1, 80, s0, s1), lam('#ffffff', { map: rail, side: THREE.DoubleSide }));
    for (let i = 0; i <= 8; i++) { const [x, z] = superPt(s0 + (s1 - s0) * i / 8, a - .4, b - .4, 3.1); put(g, BX(.35, y, .35), white, x, Y + y / 2, z); } });
  for (const x of [-7, 0, 7]) { put(g, BX(3.6, 2.4, .5), bas('#ffd98a'), x, Y + 1.2, 21.25); }
  // north grandstand roof: sloped canopy carried by white fins
  const R0 = 1.17 * Math.PI, R1 = 1.83 * Math.PI;
  const roofTex = tex(1024, 128, (c, W, H) => { c.fillStyle = '#b7bcb6'; c.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 52) { c.fillStyle = '#e9ece6'; c.fillRect(x, 0, 30, H); c.fillStyle = '#7f877f'; c.fillRect(x + 30, 0, 5, H); } });
  put(g, loft([{ a: 22.4, b: 17.2, y: Y + 15.0 }, { a: 26.9, b: 21.9, y: Y + 13.9 }], 3.1, 90, R0, R1), lam('#ffffff', { map: roofTex, side: THREE.DoubleSide, emissive: '#2a2d2a' }));
  for (let i = 0; i <= 11; i++) { const t = R0 + (R1 - R0) * i / 11; const [x0, z0] = superPt(t, 22.2, 17.0, 3.1), [x1, z1] = superPt(t, 28.4, 23.4, 3.1); const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
    const fin = put(g, BX(.5, .9, L), white, (x0 + x1) / 2, Y + 14.9, (z0 + z1) / 2, Math.atan2(dx, dz)); fin.rotateX(.17);
    const [px, pz] = superPt(t, 26.6, 21.6, 3.1); put(g, BX(.4, 14, .4), white, px, Y + 7, pz); }
  // floodlights
  const lamps = [];
  for (const [x, z] of [[-27, -20.5], [27, -20.5], [-27, 20.5], [27, 20.5]]) { put(g, CY(.28, .42, 20, 8), lam('#cfd4da'), x, Y + 10, z); const head = put(g, BX(4.2, 2.2, .5), lam('#3a3f47'), x, Y + 20.6, z); head.lookAt(g.localToWorld(new THREE.Vector3(0, 0, 0)));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(.75, .75), bas('#fff6cf')); l.position.set(-1.5 + i, -.45 + j * .9, .27); head.add(l); lamps.push(l); } }
  // yellow team bus, little bushes, name sign
  const bus = new THREE.Group(); put(bus, BX(6.4, 2.3, 2.5), lam('#f2b81d', { emissive: '#3a2a00' }), 0, 1.75, 0); put(bus, BX(5.8, .85, 2.56), bas('#263b52'), -.1, 2.25, 0); put(bus, BX(6.0, .25, 2.2), lam('#ffd75a'), 0, 3.0, 0); for (const x of [-2.2, 2.2]) for (const z of [-1.2, 1.2]) put(bus, CY(.55, .55, .35, 14).rotateX(Math.PI / 2), lam('#17181a'), x, .6, z); bus.position.set(-18.5, Y, 24.2); bus.rotation.y = .38; g.add(bus);
  const bl = []; for (let i = 0; i < 22; i++) { const t = i / 22 * TAU + .1; if (i === 8) continue; const [x, z] = superPt(t, 30.2, 25.4, 2.3); bl.push([x, z]); } const bg = new THREE.Group(); bg.position.y = Y; g.add(bg); bushes(bg, bl, .95);
  sign(g, 'ملعب المدينة', 9, 4.2, 28.6, 13, '#ffd23f', '#10213f');
  anim.push(t => { ball.position.x = Math.sin(t * 1.3) * 7; ball.position.z = Math.sin(t * 2.1 + 1) * 4; ball.position.y = Y + .45 + Math.abs(Math.sin(t * 5)) * .5; });
  return { g, lamps, bus, anim, size: [66, 57], top: 23 };
}

// =====================================================================  AIRPORT
function planeModel(accent = '#e9edf2') {
  const g = new THREE.Group(), body = lam('#f4f6f8', { emissive: '#2a2c30' }), acc = lam(accent, { emissive: '#15181c' });
  const f = put(g, new THREE.CapsuleGeometry(.95, 8.2, 8, 18).rotateZ(Math.PI / 2), body, 0, 1.9, 0);
  const wing = (pts, th, mat) => { const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); return new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }).rotateX(-Math.PI / 2); };
  put(g, wing([[1.4, 0], [-1.3, 6.2], [-2.3, 6.2], [-1.3, 0], [-2.3, -6.2], [-1.3, -6.2]], .22, acc), acc, 0, 1.55, 0);
  put(g, wing([[-3.9, 0], [-5.2, 2.6], [-5.9, 2.6], [-5.2, 0], [-5.9, -2.6], [-5.2, -2.6]], .16, acc), acc, 0, 2.1, 0);
  { const s = new THREE.Shape([new THREE.Vector2(-3.3, 0), new THREE.Vector2(-5.1, 3.0), new THREE.Vector2(-5.9, 3.0), new THREE.Vector2(-5.1, 0)]); put(g, new THREE.ExtrudeGeometry(s, { depth: .2, bevelEnabled: false }), acc, 0, 2.5, -.1); }
  for (const z of [-2.5, 2.5]) { put(g, CY(.48, .42, 1.7, 12).rotateZ(Math.PI / 2), lam('#c7ccd3'), .15, 1.15, z); put(g, CY(.38, .38, .08, 12).rotateZ(Math.PI / 2), bas('#252a31'), 1.04, 1.15, z); }
  for (let i = 0; i < 9; i++) for (const z of [-.93, .93]) put(g, BX(.28, .3, .06), bas('#2e5b85'), 3.1 - i * .75, 2.2, z);
  put(g, BX(.5, .32, 1.2), bas('#1d3a58'), 4.3, 2.4, 0);
  for (const [x, z] of [[3.2, 0], [-1, .8], [-1, -.8]]) { put(g, BX(.14, .8, .14), lam('#6d737a'), x, .75, z); put(g, CY(.32, .32, .26, 10).rotateX(Math.PI / 2), lam('#17181a'), x, .32, z); }
  return g; // nose points +x
}
function makeAirport() {
  const g = new THREE.Group(), anim = [], leds = [];
  const W = 68, D = 56;
  put(g, BX(W + 1.6, .6, D + 1.6), lam('#e9e7e0'), 0, .3, 0);
  const Y = .64;
  flat(g, W, D, lam('#23252b'), 0, Y, 0);
  const grass = tex(256, 256, (c, w, h) => { c.fillStyle = '#26763a'; c.fillRect(0, 0, w, h); const R = rng(4); for (let i = 0; i < 6000; i++) { c.fillStyle = R() < .5 ? 'rgba(120,200,90,.35)' : 'rgba(0,40,0,.3)'; c.fillRect(R() * w, R() * h, 2, 2); } });
  const gm = lam('#ffffff', { map: grass });
  // model layout (top view): grass U around the runway block, wide strip at the front and the right
  const patch = (x0, x1, z0, z1) => flat(g, x1 - x0, z1 - z0, gm, (x0 + x1) / 2, Y + .04, (z0 + z1) / 2);
  patch(-34, 34, 21, 28); patch(21.5, 34, -1, 21); patch(-21, 21.5, -1, 4.5);
  const line = (w, d, x, z, c = '#f2f2ee', y = .08) => flat(g, w, d, bas(c), x, Y + y, z);
  // white edge of the runway block
  line(42.5, .35, .5, 4.5); line(.35, 16.5, -20.6, 12.75); line(.35, 16.5, 21.5, 12.75); line(42.5, .35, .5, 21);
  // orange taxi line (L shape)
  line(56, .45, 1, -4.4, '#ff8c1a'); line(.45, 18, -27, 4.4, '#ff8c1a');
  // runway markings
  for (const z of [10.3, 15.6]) line(5.4, 3.6, -29.5, z);
  for (let i = 0; i < 7; i++) line(2.6, .55, -23.5 + i * 4.4, 13);
  for (const cx of [-5.5, 13.5]) for (let i = 0; i < 6; i++) line(5.6, 1.25, cx, 6.6 + i * 2.6);
  // terminal blocks with lit windows
  const wall = lam('#eef0f2', { emissive: '#33363a' }), glassW = bas('#7fb8e8'), warm = bas('#ffd96a');
  const block = (x, z, w, h, ry = 0) => { const b = new THREE.Group(); b.position.set(x, Y, z); b.rotation.y = ry; g.add(b); put(b, BX(w, h, 5.2), wall, 0, h / 2, 0); put(b, BX(w + .5, .4, 5.7), lam('#cfd5da'), 0, h + .2, 0); for (let i = 0; i < Math.floor(w / 1.7); i++) put(b, BX(1.1, 1.5, .12), i % 4 === 1 ? warm : glassW, -w / 2 + 1.15 + i * 1.7, h * .52, 2.62); put(b, BX(w * .5, .35, .9), lam('#b9c0c7'), 0, h + .55, -.8); };
  block(-26, -21.5, 10.5, 4.2); block(-13.8, -21.5, 10.5, 4.2);
  block(-1.5, -17.5, 9.5, 4.2, .12); block(9.3, -18.3, 9.5, 4.2); block(20.1, -17.5, 9.5, 4.2, -.12);
  // control tower
  const T = new THREE.Group(); T.position.set(8.5, Y, -23.5); g.add(T);
  put(T, CY(2.9, 3.3, 3, 24), wall, 0, 1.5, 0); put(T, CY(1.7, 2.2, 12, 24), wall, 0, 9, 0);
  put(T, CY(3.4, 2.4, 1.1, 24), wall, 0, 15.5, 0); put(T, CY(3.7, 3.2, 2.5, 24), bas('#8fd0ff'), 0, 17.3, 0);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; put(T, BX(.22, 2.6, .22), wall, Math.sin(a) * 3.5, 17.3, Math.cos(a) * 3.5); }
  put(T, CY(4.1, 4.0, .6, 24), wall, 0, 18.85, 0); put(T, CY(1.9, 2.6, 1.0, 20), wall, 0, 19.65, 0); put(T, CY(.1, .1, 3, 6), lam('#9aa0a7'), 0, 21.6, 0);
  const beacon = put(T, new THREE.SphereGeometry(.5, 10, 8), bas('#ff3b30'), 0, 23.2, 0);
  put(T, CY(3.05, 3.05, .5, 24), warm, 0, 3.2, 0);
  // parked planes along the apron
  const parked = [[-20, -12.5, '#e9edf2'], [-3.5, -9.5, '#dfe6ee'], [8.5, -9.5, '#eef1f4'], [20.5, -9.5, '#6fc3e8']];
  parked.forEach(([x, z, c]) => { const p = planeModel(c); p.position.set(x, Y, z); p.rotation.y = -Math.PI / 2; p.scale.setScalar(.72); g.add(p); });
  // hero plane on the runway
  const hero = planeModel('#d9e1ea'); hero.scale.setScalar(1.18); g.add(hero);
  const home = { x: 12, y: Y, z: 13 }; hero.position.set(home.x, home.y, home.z); hero.rotation.y = Math.PI;
  // LEDs: blue along the runway, yellow on the right lawn and under the terminals
  const glow = tex(128, 128, (c) => { const r = c.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = r; c.fillRect(0, 0, 128, 128); });
  const led = (x, z, col, s = 3.4) => { put(g, new THREE.SphereGeometry(.34, 10, 8), bas(col === 'b' ? '#4d7dff' : '#ffe14d'), x, Y + .45, z); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: col === 'b' ? 0x2f5bff : 0xffd21f, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); sp.position.set(x, Y + .6, z); sp.scale.set(s, s, 1); g.add(sp); leds.push(sp); };
  for (let i = 0; i < 9; i++) { led(-17.5 + i * 4.6, 2.9, 'b'); led(-27 + i * 6, 22.6, 'b'); }
  for (let i = 0; i < 3; i++) led(-4 + i * 9, -1.9, i === 1 ? 'y' : 'b');
  for (const [x, z] of [[24, 1], [27, 5.5], [31, 2.5], [25, 10], [29.5, 12], [32, 8], [24.5, 16], [30, 18], [27.5, 23], [32, 25]]) led(x, z, 'y', 2.8);
  for (const x of [-31.5, -20, -8.2, 3.8, 26.5]) led(x, -17.8, 'y', 4);
  // light mast, service cars, little trees
  put(g, CY(.18, .24, 11, 8), lam('#e8ecef'), -32, Y + 5.5, -7); for (const dy of [9.6, 10.6, 11.6]) { put(g, BX(3.2, .16, .16), lam('#e8ecef'), -32, Y + dy, -7); for (let i = 0; i < 4; i++) put(g, BX(.45, .55, .4), bas('#fff3c0'), -33.3 + i * .87, Y + dy + .1, -6.9); }
  const car = (x, z, ry, c) => { const v = new THREE.Group(); v.position.set(x, Y, z); v.rotation.y = ry; g.add(v); put(v, BX(2.4, .8, 1.3), lam(c), 0, .65, 0); put(v, BX(1.1, .6, 1.2), bas('#8fc4ea'), -.2, 1.3, 0); for (const px of [-.75, .75]) for (const pz of [-.65, .65]) put(v, CY(.3, .3, .2, 10).rotateX(Math.PI / 2), lam('#15161a'), px, .3, pz); };
  car(1, 1.6, .2, '#f4f4f0'); car(-14, 24.8, -.3, '#f4f4f0'); car(10, 25, .15, '#f2b81d');
  const tg = new THREE.Group(); tg.position.y = Y; g.add(tg); trees(tg, [[-9, 1.5], [6, 1.4], [14, 1.8], [-6, 25], [3, 25.2, 1], [17, 24.8], [-24, 25.2, 1]]);
  sign(g, 'مطار المدينة', -20, 3.6, 29.6, 13, '#ffffff', '#0e4f8a');
  anim.push(t => { beacon.visible = (t * 1.4) % 1 < .6; leds.forEach((l, i) => l.material.opacity = .62 + .3 * Math.sin(t * 3 + i * .7)); });
  // k: 0 = waiting on the runway, 1 = climbed away to the west
  const takeoff = (k) => { const run = Math.min(1, k / .5), air = Math.max(0, (k - .42) / .58);
    hero.position.set(home.x - run * run * 28 - air * 80, home.y + air * air * 44 + air * 6, home.z); hero.rotation.set(0, Math.PI, 0); hero.rotateZ(Math.min(1, air * 2.4) * .3); };
  takeoff(0);
  return { g, hero, takeoff, anim, size: [70, 58], top: 25 };
}

// =====================================================================  PARK
function makePark() {
  const g = new THREE.Group(), anim = [];
  const S = 42; const R = rng(31);
  const lawn = tex(1024, 1024, (c, w, h) => { c.fillStyle = '#58a844'; c.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(255,255,255,.05)'; if (i % 2) c.fillRect(0, i * h / 12, w, h / 12); } for (let i = 0; i < 26000; i++) { c.fillStyle = R() < .5 ? 'rgba(180,235,110,.35)' : 'rgba(20,80,20,.25)'; c.fillRect(R() * w, R() * h, 3, 3); }
    const path = (draw, wd) => { c.lineCap = 'round'; c.strokeStyle = '#b79f74'; c.lineWidth = wd + 12; draw(); c.stroke(); c.strokeStyle = '#ead9b0'; c.lineWidth = wd; draw(); c.stroke(); };
    path(() => { c.beginPath(); c.moveTo(w / 2, 10); c.lineTo(w / 2, h - 10); }, 84); path(() => { c.beginPath(); c.moveTo(10, h / 2); c.lineTo(w - 10, h / 2); }, 84); path(() => { c.beginPath(); c.arc(w / 2, h / 2, 190, 0, TAU); }, 70);
    c.fillStyle = '#ead9b0'; c.beginPath(); c.arc(w / 2, h / 2, 150, 0, TAU); c.fill(); });
  put(g, BX(S + 1.4, .6, S + 1.4), lam('#cbb894'), 0, .3, 0); const Y = .62;
  flat(g, S, S, lam('#ffffff', { map: lawn }), 0, Y, 0);
  // three-tier fountain with animated jets
  const stone = lam('#efe6d2'), water = bas('#63cdec', { transparent: true, opacity: .92 }), jetM = bas('#d9f6ff', { transparent: true, opacity: .7, depthWrite: false });
  put(g, CY(5.0, 5.3, .9, 36), stone, 0, Y + .45, 0); put(g, CY(4.5, 4.5, .1, 36), water, 0, Y + .93, 0); put(g, CY(.7, .9, 2.4, 14), stone, 0, Y + 1.9, 0); put(g, CY(2.3, 1.2, .55, 28), stone, 0, Y + 3.2, 0); put(g, CY(2.0, 2.0, .08, 28), water, 0, Y + 3.5, 0); put(g, CY(.35, .45, 1.5, 10), stone, 0, Y + 4.2, 0); put(g, CY(1.0, .45, .35, 20), stone, 0, Y + 5.0, 0);
  const jet = put(g, CY(.1, .38, 3.2, 10), jetM, 0, Y + 6.7, 0);
  const drops = []; const dg = new THREE.SphereGeometry(.17, 6, 5);
  for (let i = 0; i < 150; i++) { const d = put(g, dg, jetM, 0, Y, 0); drops.push({ d, a: (i % 15) / 15 * TAU, p: R(), tier: i % 3 }); }
  anim.push(t => { jet.scale.y = 1 + .12 * Math.sin(t * 9); for (const q of drops) { const k = (t * .75 + q.p) % 1; const [r0, y0, rr, up] = q.tier === 0 ? [.2, 7.9, 2.1, 1.0] : q.tier === 1 ? [1.9, 3.7, 3.7, .9] : [4.2, 1.2, 1.2, 3.4];
    const rad = q.tier === 2 ? r0 - rr * k * 1.6 : r0 + (rr - r0) * k; const yy = q.tier === 0 ? y0 + up * Math.sin(k * Math.PI) - k * k * 4.2 : q.tier === 1 ? y0 + up * Math.sin(k * Math.PI) - k * k * 2.6 : y0 + up * Math.sin(k * Math.PI);
    q.d.position.set(Math.cos(q.a) * rad, Y + yy, Math.sin(q.a) * rad); } });
  // pond with an arched wooden bridge (north-west)
  const pond = put(g, new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), bas('#3fb6e0'), -12.3, Y + .08, -12); pond.scale.set(6.6, 1, 5.2);
  const pe = put(g, new THREE.RingGeometry(1, 1.12, 40).rotateX(-Math.PI / 2), lam('#d8cbac'), -12.3, Y + .1, -12); pe.scale.set(6.6, 1, 5.2);
  const wood = lam('#9b6534'), woodD = lam('#6f4522');
  for (let i = 0; i <= 12; i++) { const u = i / 12, x = -19 + u * 13.4, y = Y + .3 + Math.sin(u * Math.PI) * 2.0; const p = put(g, BX(1.2, .22, 2.8), wood, x, y, -12); p.rotation.z = Math.cos(u * Math.PI) * .42; if (i % 2 === 0) for (const z of [-13.35, -10.65]) { put(g, BX(.18, 1.2, .18), woodD, x, y + .65, z); put(g, BX(.35, .22, .22), wood, x, y + 1.25, z); } }
  for (const [x, z, s] of [[-14.5, -9.3, .8], [-9.6, -15, .65], [-10, -9, .5]]) { put(g, new THREE.CircleGeometry(s, 10).rotateX(-Math.PI / 2), bas('#2f8f3d'), x, Y + .14, z); put(g, new THREE.SphereGeometry(s * .3, 8, 6), bas('#ff8fb5'), x + .1, Y + .3, z); }
  // gazebo (north-east)
  const gz = new THREE.Group(); gz.position.set(12.4, Y, -12.4); g.add(gz); put(gz, CY(5.2, 5.4, .5, 8), stone, 0, .25, 0); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + TAU / 16; put(gz, CY(.24, .28, 4.4, 8), lam('#fbf6ea'), Math.sin(a) * 4.4, 2.7, Math.cos(a) * 4.4); }
  put(gz, CY(5.4, 5.4, .4, 8), lam('#fbf6ea'), 0, 5.05, 0); put(gz, new THREE.ConeGeometry(5.9, 3.0, 8), lam('#c0453a', { flatShading: true, emissive: '#3a0d08' }), 0, 6.7, 0); put(gz, new THREE.SphereGeometry(.5, 10, 8), bas('#ffd45a'), 0, 8.5, 0); put(gz, CY(1.2, 1.2, .2, 12), wood, 0, 1.7, 0); put(gz, CY(.2, .2, 1.2, 8), woodD, 0, 1.1, 0);
  // playground (south-east): sand pit, swings, slide
  flat(g, 14, 13, lam('#e7c37a'), 12.4, Y + .07, 12);
  const metal = lam('#2f7fd0'), red = lam('#e0453a'), yellow = lam('#ffc93a');
  const sw = new THREE.Group(); sw.position.set(10.2, Y, 8.4); g.add(sw); for (const x of [-3.2, 3.2]) for (const z of [-1.2, 1.2]) { const l = put(sw, CY(.14, .14, 4.9, 8), red, x, 2.35, z * .6); l.rotation.x = -Math.sign(z) * .27; } put(sw, CY(.16, .16, 6.8, 8).rotateZ(Math.PI / 2), red, 0, 4.65, 0);
  const seats = [-1.5, 1.5].map((x, i) => { const p = new THREE.Group(); p.position.set(x, 4.6, 0); sw.add(p); for (const dx of [-.55, .55]) put(p, CY(.05, .05, 3.2, 5), lam('#c9ced4'), dx, -1.6, 0); put(p, BX(1.4, .18, .6), yellow, 0, -3.2, 0); return p; });
  anim.push(t => seats.forEach((s, i) => s.rotation.x = Math.sin(t * 2.6 + i * 2.2) * .5));
  const sl = new THREE.Group(); sl.position.set(14.2, Y, 15.2); g.add(sl); put(sl, BX(2.4, .3, 2.4), yellow, 2, 3.2, 0); for (const x of [1, 3]) for (const z of [-1, 1]) put(sl, BX(.22, 4.4, .22), metal, x, 2.2, z); put(sl, new THREE.ConeGeometry(2.0, 1.5, 4).rotateY(Math.PI / 4), red, 2, 5.15, 0);
  const chute = put(sl, BX(6.0, .2, 1.5), metal, -1.5, 1.75, 0); chute.rotation.z = .5; for (const z of [-.75, .75]) { const e = put(sl, BX(6.0, .5, .15), yellow, -1.5, 1.95, z); e.rotation.z = .5; }
  for (let i = 0; i < 5; i++) put(sl, BX(.25, .15, 1.6), woodD, 4.3 - i * .25, .6 + i * .6, 0);
  // flower beds (south-west)
  const cols = ['#ff5d6c', '#ffd23f', '#b06bff', '#ff8fd0', '#ffffff', '#ff8c1a'];
  const fg = new THREE.SphereGeometry(.26, 7, 5), fm = cols.map(c => lam(c, { emissive: c, emissiveIntensity: .22 }));
  [[-12.4, 12.4]].forEach(([cx, cz]) => { for (let ring = 0; ring < 5; ring++) { const rad = 1.0 + ring * 1.35; const soil = put(g, new THREE.RingGeometry(rad - .45, rad + .45, 40).rotateX(-Math.PI / 2), lam('#6b4a2c'), cx, Y + .09, cz); const n = Math.round(rad * 8.5); for (let i = 0; i < n; i++) { const a = i / n * TAU; put(g, fg, fm[ring % 6], cx + Math.cos(a) * rad + (R() - .5) * .2, Y + .42 + R() * .2, cz + Math.sin(a) * rad + (R() - .5) * .2); } } put(g, CY(.18, .18, 2.2, 8), woodD, cx, Y + 1.1, cz); put(g, new THREE.SphereGeometry(1.1, 14, 10), fm[3], cx, Y + 2.6, cz); });
  // benches + lamps around the plaza
  const bench = (x, z, ry) => { const b = new THREE.Group(); b.position.set(x, Y, z); b.rotation.y = ry; g.add(b); put(b, BX(2.8, .2, .9), wood, 0, .85, 0); put(b, BX(2.8, .75, .18), wood, 0, 1.45, -.42); for (const sx of [-1.15, 1.15]) put(b, BX(.2, .85, .8), woodD, sx, .42, 0); };
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; bench(Math.sin(a) * 11, Math.cos(a) * 11, a + Math.PI); }
  for (const [x, z] of [[-3.4, 9.5], [3.4, 9.5], [-3.4, -9.5], [3.4, -9.5], [-9.5, 3.4], [-9.5, -3.4], [9.5, 3.4], [9.5, -3.4], [-3.4, 17], [3.4, -17]]) { put(g, CY(.1, .14, 4.2, 6), lam('#2f3b33'), x, Y + 2.1, z); put(g, new THREE.SphereGeometry(.45, 10, 8), bas('#fff0b8'), x, Y + 4.45, z); }
  // trees and hedge border, with the entrance open to the south
  const tg = new THREE.Group(); tg.position.y = Y; g.add(tg);
  const tl = []; for (let i = -3; i <= 3; i++) { const v = i * 6.1; tl.push([v, -19.2, Math.abs(i) % 2]); tl.push([-19.2, v, (Math.abs(i) + 1) % 2]); tl.push([19.2, v, Math.abs(i) % 2]); if (Math.abs(i) > 0) tl.push([v, 19.2, (Math.abs(i) + 1) % 2]); }
  trees(tg, tl.concat([[-6.5, 18], [18, 3.8], [-17, -4], [7, -17], [-6, -17.5, 1], [5.5, 5.2], [-17, 4.5]]).filter(([x, z]) => !(Math.abs(z + 12) < 3.5 && x < -3)));
  const hedge = lam('#2f7a35'); for (const s of [-1, 1]) { put(g, BX(17, 1.1, .8), hedge, s * 12.5, Y + .55, 20.9); put(g, BX(.8, 1.1, S), hedge, s * 20.9, Y + .55, 0); } put(g, BX(S, 1.1, .8), hedge, 0, Y + .55, -20.9);
  // entrance arch with the name
  for (const s of [-1, 1]) { put(g, BX(1.2, 6.2, 1.2), stone, s * 4.6, Y + 3.1, 20.9); put(g, new THREE.SphereGeometry(.65, 10, 8), bas('#ffd45a'), s * 4.6, Y + 6.8, 20.9); }
  const st = tex(1024, 230, (c) => { c.fillStyle = '#145c33'; c.beginPath(); c.roundRect(6, 6, 1012, 218, 60); c.fill(); c.lineWidth = 10; c.strokeStyle = '#ffd45a'; c.stroke(); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'; c.font = '900 140px Zain, sans-serif'; c.fillText('حديقة المدينة', 512, 122); });
  const sm = bas('#ffffff', { map: st, transparent: true }); put(g, new THREE.PlaneGeometry(9.2, 2.07), sm, 0, Y + 6.2, 21.55); put(g, new THREE.PlaneGeometry(9.2, 2.07), sm, 0, Y + 6.2, 20.25, Math.PI);
  return { g, anim, size: [43, 43], top: 12 };
}

export function buildProjects(scene, posOf) {
  const park = makePark(), airport = makeAirport(), stadium = makeStadium();
  for (const [id, p] of [['park', park], ['airport', airport], ['stadium', stadium]]) { p.g.position.copy(posOf(id)); scene.add(p.g); }
  // access roads: an avenue from the housing blocks and a boulevard in front of the three projects
  const roads = new THREE.Group(); scene.add(roads);
  const asp = lam('#34373d'), kerb = lam('#dcd8cc'), yel = bas('#f5c233');
  const x0 = posOf('park').x - 24, x1 = posOf('stadium').x + 34, z = posOf('airport').z + 33.5;
  flat(roads, x1 - x0, 7.4, kerb, (x0 + x1) / 2, .07, z); flat(roads, x1 - x0, 6, asp, (x0 + x1) / 2, .1, z);
  for (let x = x0 + 3; x < x1; x += 6) flat(roads, 3, .24, yel, x, .13, z);
  for (const ax of [-7, 49]) { const za = -9 * 14 - 5; flat(roads, 6.4, za - z, kerb, ax, .06, (za + z) / 2); flat(roads, 5, za - z, asp, ax, .09, (za + z) / 2); for (let q = z + 5; q < za; q += 6) flat(roads, .24, 3, yel, ax, .12, q); }
  const update = (t) => { for (const p of [park, airport, stadium]) for (const f of p.anim) f(t); };
  update(0);
  return { park, airport, stadium, roads, update };
}
