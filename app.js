import { THREE, renderer, scene, camera, houses, storeH, cinema, mosque, groundMat, sky, dust, CITY, CELL, cellPos, SV, svPos, plotN, plotM, ghost, pad } from './scene.js';
import { OrbitControls } from './OrbitControls.js';
const $ = (id) => document.getElementById(id);
// ---- static (read-only) city state: everything built, no reveal animation
houses.forEach(h => { h.g.scale.setScalar(1); h.g.userData.house = h; });
storeH.g.scale.setScalar(storeH.s || 1); cinema.g.scale.setScalar(1); mosque.g.scale.setScalar(1);
plotN.g.visible = false; plotM.g.visible = false; ghost.visible = false; dust.visible = false;
groundMat.uniforms.uReveal.value = 1e5; groundMat.uniforms.uYellow.value = 0; groundMat.uniforms.uZF.value = 9999; groundMat.uniforms.uBand.value = 0;
const byslot = new Map(houses.map(h => [h.slot, h]));
$('cnt').textContent = String(houses.length);
// bounds
let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9; houses.forEach(h => { const p = h.g.position; bx0 = Math.min(bx0, p.x); bx1 = Math.max(bx1, p.x); bz0 = Math.min(bz0, p.z); bz1 = Math.max(bz1, p.z); });
const M = 45; bx0 -= M; bx1 += M; bz0 -= M; bz1 += M;
// ---- controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .09; controls.screenSpacePanning = false;
controls.minDistance = 6; controls.maxDistance = 520; controls.maxPolarAngle = Math.PI / 2 - .03; controls.rotateSpeed = .7; controls.panSpeed = .9; controls.zoomSpeed = .9;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.target.set(0, 2, 0); camera.position.set(130, 150, 250);
let tween = null; const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function flyTo(pos, tgt, dur = 1.5) { tween = { t0: performance.now(), dur: dur * 1000, p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos, t1: tgt }; controls.enabled = false; }
function stepTween(now) { if (!tween) return; const k = Math.min(1, (now - tween.t0) / tween.dur), e = ease(k); camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0v, tween.t1, e); if (k >= 1) { tween = null; controls.enabled = true; } }
// ---- selection
const focusPad = pad(10.4, 10.4, 0xffd45a, .6); focusPad.position.y = .2; focusPad.visible = false; scene.add(focusPad);
const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 60, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); beam.visible = false; scene.add(beam);
let sel = null;
function select(h, fly = true) {
  sel = h; const p = h.g.position, f = h.f;
  focusPad.position.set(p.x, .2, p.z); focusPad.visible = true; beam.position.set(p.x, 30, p.z); beam.visible = true;
  $('cn').textContent = '#' + f.slot; $('cname').textContent = f.name_display || f.name_original; $('chandle').textContent = f.handle;
  $('cig').href = 'https://instagram.com/' + String(f.handle).replace(/^@/, ''); $('card').classList.remove('hide');
  const u = new URL(location.href); u.search = '?house=' + f.slot; u.hash = ''; history.replaceState(null, '', u);
  if (fly) { const tg = new THREE.Vector3(p.x + 2, 3, p.z + 3); flyTo(new THREE.Vector3(p.x + 10, 7.5, p.z + 22), tg, 1.7); }
  $('hint').style.opacity = 0;
}
function deselect() { sel = null; focusPad.visible = false; beam.visible = false; $('card').classList.add('hide'); const u = new URL(location.href); u.search = ''; history.replaceState(null, '', u); }
$('x').onclick = deselect;
const toast = (m) => { const t = $('toast'); t.textContent = m; t.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.opacity = 0, 2400); };
$('cshare').onclick = async () => { if (!sel) return; const url = location.origin + location.pathname + '?house=' + sel.f.slot; const data = { title: 'مدينة عبود', text: `بيت ${sel.f.name_display} في مدينة عبود`, url };
  try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(url); toast('تم نسخ الرابط'); } } catch (e) { try { await navigator.clipboard.writeText(url); toast('تم نسخ الرابط'); } catch (_) { toast(url); } } };
const openWA = (w) => { const ph = String(w.phone || '').replace(/\D/g, ''); if (!ph) { toast('ضع رقم الواتساب في city.json'); return; } window.open(`https://wa.me/${ph}?text=${encodeURIComponent(w.text || '')}`, '_blank', 'noopener'); };
// ---- picking
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; $('res').style.display = 'none'; $('q').blur(); });
renderer.domElement.addEventListener('pointerup', e => { if (!down) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null; if (d > 7 || dt > 450) return;
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const ch = ray.intersectObject(cinema.g, true)[0], hh = ray.intersectObjects(houses.map(h => h.g), true)[0];
  if (ch && (!hh || ch.distance < hh.distance)) { const s = CITY.services.find(x => x.id === 'netflix'); if (s && s.whatsapp) { openWA(s.whatsapp); return; } }
  const hit = hh; if (!hit) return; let o = hit.object; while (o && !(o.userData && o.userData.house)) o = o.parent; if (o) select(o.userData.house); });
// ---- search (Arabic-friendly)
const norm = (s) => String(s || '').toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/^@/, '').replace(/\s+/g, ' ').trim();
const idx = houses.map(h => ({ h, name: norm(h.f.name_display + ' ' + (h.f.name_original || '')), handle: norm(h.f.handle), slot: String(h.f.slot) }));
function search(q) { q = norm(q); if (!q) return []; const out = [];
  for (const r of idx) { let sc = 0; if (r.slot === q) sc = 100; else if (r.handle === q) sc = 95; else if (r.handle.startsWith(q)) sc = 80; else if (r.name.startsWith(q)) sc = 70; else if (r.handle.includes(q)) sc = 60; else if (r.name.includes(q)) sc = 50; else if (/^\d+$/.test(q) && r.slot.startsWith(q)) sc = 40; if (sc) out.push([sc, r]); }
  return out.sort((a, b) => b[0] - a[0] || a[1].h.slot - b[1].h.slot).slice(0, 8).map(x => x[1].h); }
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('q').addEventListener('input', e => { const r = search(e.target.value), box = $('res'); if (!e.target.value.trim()) { box.style.display = 'none'; return; }
  box.innerHTML = r.length ? r.map(h => `<div class="it" data-s="${h.slot}"><b>#${h.f.slot}</b><span>${esc(h.f.name_display)}</span><i>${esc(h.f.handle)}</i></div>`).join('') : '<div class="none">ما لقينا نتيجة</div>'; box.style.display = 'block'; });
$('q').addEventListener('keydown', e => { if (e.key === 'Enter') { const r = search($('q').value); if (r[0]) { select(r[0]); $('res').style.display = 'none'; $('q').blur(); } } });
$('res').addEventListener('click', e => { const it = e.target.closest('.it'); if (!it) return; select(byslot.get(+it.dataset.s)); $('res').style.display = 'none'; $('q').blur(); });
// ---- buttons
const dist = () => camera.position.distanceTo(controls.target);
$('zin').onclick = () => { const d = camera.position.clone().sub(controls.target).multiplyScalar(.6); flyTo(controls.target.clone().add(d), controls.target.clone(), .5); };
$('zout').onclick = () => { const d = camera.position.clone().sub(controls.target).multiplyScalar(1.6); flyTo(controls.target.clone().add(d), controls.target.clone(), .5); };
$('gnd').onclick = () => { const t = controls.target.clone(); t.y = 3; const d = new THREE.Vector3(camera.position.x - t.x, 0, camera.position.z - t.z); if (d.lengthSq() < 1) d.set(0, 0, 1); d.setLength(20); flyTo(new THREE.Vector3(t.x + d.x, 3.4, t.z + d.z), t, 1.1); };
$('top2').onclick = () => { const t = controls.target.clone(); t.y = 2; flyTo(new THREE.Vector3(t.x + 40, 190, t.z + 110), t, 1.3); };
// ---- service buttons (WhatsApp) above cinema / future services
const WA = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.4 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.8.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg>';
const svc = []; for (const s of CITY.services) { if (!s.whatsapp) continue; const el = document.createElement('div'); el.className = 'svcbtn'; el.innerHTML = WA + `<div>${esc(s.whatsapp.label || 'واتساب')}<small>${esc(s.name)}</small></div>`;
  el.onclick = () => openWA(s.whatsapp);
  document.body.appendChild(el); const top = s.id === 'netflix' ? cinema.top + 3 : 12; svc.push({ el, pos: svPos(s.id).clone().setY(top) }); }
const v3 = new THREE.Vector3();
// ---- loop
function frame(now) {
  stepTween(now); controls.update();
  const t = controls.target; const cx = Math.min(bx1, Math.max(bx0, t.x)), cz = Math.min(bz1, Math.max(bz0, t.z));
  if (cx !== t.x || cz !== t.z) { camera.position.x += cx - t.x; camera.position.z += cz - t.z; t.x = cx; t.z = cz; }
  if (camera.position.y < 1.8) camera.position.y = 1.8;
  const fd = .0014 / (1 + camera.position.y / 50); scene.fog.density = fd; groundMat.uniforms.uFog.value = fd; sky.position.copy(camera.position);
  if (sel) { const k = .5 + .5 * Math.sin(now / 320); focusPad.material.opacity = .35 + .35 * k; beam.material.opacity = (.06 + .06 * k) * Math.min(1, Math.max(0, (camera.position.distanceTo(beam.position) - 30) / 60)); }
  for (const s of svc) { v3.copy(s.pos).project(camera); const d = camera.position.distanceTo(s.pos); const on = v3.z < 1 && Math.abs(v3.x) < .9 && v3.y > -1.1 && v3.y < 1.1 && d < 320; s.el.style.display = on ? 'flex' : 'none';
    if (on) { s.el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px'; s.el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px'; s.el.style.opacity = Math.max(.0, Math.min(1, (320 - d) / 120)); } }
  renderer.render(scene, camera); requestAnimationFrame(frame);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });
requestAnimationFrame(frame);
$('load').style.opacity = 0; setTimeout(() => $('load').remove(), 700);
setTimeout(() => { if (!sel) flyTo(new THREE.Vector3(60, 85, 150), new THREE.Vector3(0, 2, 0), 2.4); }, 300);
setTimeout(() => $('hint').style.opacity = 0, 9000);
// deep links: ?house=57  or  ?u=handle
const P = new URLSearchParams(location.search); const hq = P.get('house') || P.get('u');
if (hq) { const r = /^\d+$/.test(hq) ? [byslot.get(+hq)].filter(Boolean) : search(hq); if (r[0]) setTimeout(() => select(r[0]), 900); }
window.__city = { camera, controls, select, houses, search, flyTo };
