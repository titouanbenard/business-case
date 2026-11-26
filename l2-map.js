/* Carte L2 interactive : calques, zoom, déplacement, sources au clic. */
window.L2Map = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const C = { sel: "#2d2820", selB: "#6b5d42", scope: "#211f1b", out: "#1b1b1a", outB: "#262626", axis: "#A8B3BF", partner: "#6FB3A2",
    comp: "#B9B9B2", zone: "#E3C38F", ok: "#7CC58A", reinf: "#E9A23B", ko: "#E0664C", text: "#FFF7DD", muted: "rgba(255,247,221,.62)" };
  const CHIPS = [["axes", "Axes RTE-T (épaisseur = trafic PL, hyp.)", "background:#A8B3BF;height:5px;width:16px;border-radius:3px"],
    ["grid-ok", "Réseau : capacité (proxy)", "border:1.5px dashed #7CC58A;border-radius:50%"], ["grid-reinf", "Réseau : renforcement prévu", "border:1.5px dashed #E9A23B;border-radius:50%"],
    ["grid-ko", "Réseau : congestion publiée", "background:repeating-linear-gradient(45deg,#E0664C 0 2px,transparent 2px 5px);border:1px solid #E0664C;border-radius:50%"],
    ["partner", "Partenaire (réf. Milence)", "background:#6FB3A2;border-radius:50%;border:1.5px solid #000"], ["comp", "Concurrence", "background:#B9B9B2"],
    ["zones", "Zones cibles", "background:#E3C38F;height:4px;width:16px;border-radius:2px"]];
  const STEPS = [["axes"], ["grid-ok", "grid-reinf", "grid-ko"], ["partner", "comp"], ["zones"]];
  const KIND = { p: "Partenaire (réf. Milence) · en service", pd: "Partenaire (réf. Milence) · en développement", c: "ENGIE Vianeo · en service",
    cd: "ENGIE Vianeo · prévu 2027", cf: "Concurrent fictif · illustratif", ok: "Réseau · capacité (proxy)", reinf: "Réseau · renforcement prévu", ko: "Réseau · congestion publiée" };
  const el = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function init(o) {
    const D = o.data, W = D.W, H = D.H, root = o.root;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "100%", preserveAspectRatio: "xMidYMid meet", role: "img", "aria-label": "Carte de ciblage L2", style: "touch-action:none;display:block;cursor:grab" });
    root.prepend(svg);
    const defs = el("defs", {}, svg);
    const pid = "l2h" + (window.__l2n = (window.__l2n || 0) + 1);
    const pat = el("pattern", { id: pid, width: 8, height: 8, patternUnits: "userSpaceOnUse" }, defs);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 8, stroke: C.ko, "stroke-width": 2, opacity: 0.7 }, pat);
    el("rect", { width: W, height: H, fill: "#000" }, svg);
    const geo = el("g", {}, svg), ov = el("g", {}, svg);
    const ns = { "vector-effect": "non-scaling-stroke" };
    const gb = el("g", {}, geo);
    D.base.forEach((b) => el("path", { d: b.d, fill: C[b.c], stroke: b.c === "sel" ? C.selB : C.outB, "stroke-width": b.c === "sel" ? 1.2 : 0.7, ...ns }, gb));
    const gAx = el("g", { class: "ly-axes" }, geo);
    D.axes.forEach((a) => el("path", { d: a.d, fill: "none", stroke: C.axis, "stroke-opacity": [0, 0.22, 0.3, 0.42][a.c], "stroke-width": [0, 2.4, 5, 9][a.c], "stroke-linecap": "round", "stroke-linejoin": "round", ...ns }, gAx));
    const gZ = el("g", { class: "ly-zones" }, geo), halos = [];
    D.zones.forEach((z, i) => {
      const g = el("g", { "data-z": z.n, "data-t": "z", "data-i": i, class: "zn" }, gZ);
      halos.push(el("path", { d: z.d, fill: "none", stroke: C.zone, "stroke-opacity": 0.28, "stroke-width": 36, "stroke-linecap": "round", "stroke-linejoin": "round", ...ns }, g));
      el("path", { d: z.d, fill: "none", stroke: C.zone, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round", ...ns }, g);
    });
    const gG = { ko: el("g", { class: "ly-grid-ko" }, geo), reinf: el("g", { class: "ly-grid-reinf" }, geo), ok: el("g", { class: "ly-grid-ok" }, geo) };
    D.grid.forEach((g, i) => {
      const a = g.k === "ko" ? { fill: `url(#${pid})`, "fill-opacity": 0.9, stroke: C.ko, "stroke-opacity": 0.7 } : { fill: C[g.k], "fill-opacity": 0.12, stroke: C[g.k] };
      el("circle", { cx: g.x, cy: g.y, r: g.r, "stroke-width": 1.6, "stroke-dasharray": "5 4", "data-t": "g", "data-i": i, ...a, ...ns }, gG[g.k]);
    });
    // overlay (taille écran constante)
    const items = [];
    const put = (node, x, y, z, box, pri) => items.push({ node, x, y, z: z || 0, box, pri: pri ?? 9 });
    const tw = (t, fs) => t.length * fs * 0.56;
    const lab = (t, a) => { const e = el("text", { "paint-order": "stroke", stroke: "#000", "stroke-width": 3, ...a }); e.textContent = t; return e; };
    const oC = el("g", {}, ov);
    D.ctry.forEach((c) => { const g = el("g", {}, oC); g.appendChild(lab(c.t, { "font-size": 10.5, "font-weight": 600, "letter-spacing": 1.8, fill: "rgba(200,173,134,.5)", "text-anchor": "middle", "stroke-width": 0 })); const w = c.t.length * 8.2; put(g, c.x, c.y, 0, [-w / 2, -9, w / 2, 3], 1); });
    D.cities.forEach((c) => { const g = el("g", {}, oC); el("circle", { r: 1.8, fill: C.text, opacity: 0.7 }, g); const dx = c.dx || 0, dy = c.dy || 0, L = c.left, M = c.mid; if (M) { g.appendChild(lab(c.t, { x: 0, y: -4 + dy, "font-size": 10.5, fill: C.muted, "text-anchor": "middle" })); const hw = tw(c.t, 10.5) / 2 + 2; put(g, c.x, c.y, c.z, [-hw, -13 + dy, hw, 2 + dy], 2 + c.z / 10); return; } g.appendChild(lab(c.t, L ? { x: -5, y: -4 + dy, "font-size": 10.5, fill: C.muted, "text-anchor": "end" } : { x: 5 + dx, y: -4 + dy, "font-size": 10.5, fill: C.muted })); put(g, c.x, c.y, c.z, L ? [-7 - tw(c.t, 10.5), -13 + dy, 2, 2 + dy] : [-2, -13 + dy, 7 + dx + tw(c.t, 10.5), 2 + dy], 2 + c.z / 10); });
    const oGL = { ko: el("g", { class: "ly-grid-ko" }, ov), reinf: el("g", { class: "ly-grid-reinf" }, ov), ok: el("g", { class: "ly-grid-ok" }, ov) };
    D.grid.forEach((g) => { const n = el("g", { "pointer-events": "none" }, oGL[g.k]); n.appendChild(lab(g.n, { "font-size": 9.5, "font-style": "italic", fill: C[g.k], "text-anchor": "middle" })); const w = tw(g.n, 9.5); items.push({ node: n, x: g.x, y: g.y, z: 2.6, dy: g.r, grid: true, box: [-w / 2, -8, w / 2, 2], pri: 3 }); });
    const oZ = el("g", { class: "ly-zones" }, ov), leaders = [];
    D.zones.forEach((z, i) => {
      const ln = el("line", { stroke: C.zone, "stroke-width": 1.5, "stroke-dasharray": "4 3", "pointer-events": "none" }, oZ);
      leaders.push({ ln, z });
      const g = el("g", { class: "zn", "data-z": z.n, "data-t": "z", "data-i": i, style: "cursor:pointer" }, oZ);
      el("rect", { x: -14, y: -12, width: z.name.length * 6.9 + 34, height: 24, rx: 5, fill: "#0b0b0a", "fill-opacity": 0.9, stroke: "rgba(255,255,255,.11)" }, g);
      el("circle", { r: 9.5, fill: C.zone }, g);
      g.appendChild(lab(String(z.n), { y: 4, "font-size": 11, "font-weight": 700, fill: "#000", "text-anchor": "middle", "stroke-width": 0 }));
      g.appendChild(lab(z.name, { x: 15, y: 4, "font-size": 12, "font-weight": 600, fill: C.text, "stroke-width": 0 }));
      items.push({ node: g, x: z.lab[0], y: z.lab[1], z: 0, zone: z, box: [-14, -12, z.name.length * 6.9 + 20, 12], pri: 0 });
    });
    const oP = { partner: el("g", { class: "ly-partner" }, ov), comp: el("g", { class: "ly-comp" }, ov), fict: el("g", { class: "ly-comp" }, ov) };
    D.points.forEach((p, i) => {
      const ly = p.k[0] === "p" ? "partner" : p.k === "cf" ? "fict" : "comp";
      const g = el("g", { "data-t": "p", "data-i": i, style: "cursor:pointer", class: "st" }, oP[ly]);
      el("circle", { r: 12, fill: "transparent" }, g);
      if (p.k === "p") el("circle", { r: 5.5, fill: C.partner, stroke: "#000", "stroke-width": 2 }, g);
      else if (p.k === "pd") el("circle", { r: 5.5, fill: C.partner, "fill-opacity": 0.6, stroke: "#000", "stroke-width": 2 }, g);
      else if (p.k === "c") el("rect", { x: -5, y: -5, width: 10, height: 10, fill: C.comp, stroke: "#000", "stroke-width": 1.8 }, g);
      else if (p.k === "cd") el("rect", { x: -5.5, y: -5.5, width: 11, height: 11, fill: "#000", stroke: C.comp, "stroke-width": 2.4 }, g);
      else el("rect", { x: -5, y: -5, width: 10, height: 10, fill: "#000", stroke: C.comp, "stroke-width": 2, "stroke-dasharray": "3 2" }, g);
      put(g, p.x, p.y);
      const t = el("g", { "pointer-events": "none" }, oP[ly]); t.appendChild(lab(p.n, { x: 8, y: 3.5, "font-size": 10, fill: C.text })); put(t, p.x, p.y, 3.6, [7, -6, 9 + tw(p.n, 10), 5], 4);
    });

    const oX = el("g", { class: "ly-extra" }, ov);
    (o.extra || []).forEach((x, i) => {
      const g = el("g", { "data-t": "x", "data-i": i, style: "cursor:pointer", class: "st" }, oX);
      el("circle", { r: 14, fill: "transparent" }, g);
      el("circle", { r: 13, fill: "none", stroke: C.zone, "stroke-width": 1.5, "stroke-opacity": 0.55 }, g);
      el("path", { d: "M0,-8 L8,0 L0,8 L-8,0 Z", fill: C.zone, stroke: "#000", "stroke-width": 2 }, g);
      put(g, x.x, x.y, 0, null, 0);
      const t = el("g", { "pointer-events": "none" }, oX); t.appendChild(lab(x.n, { x: 16, y: 4, "font-size": 12, "font-weight": 600, fill: C.zone }));
      put(t, x.x, x.y, 0, [14, -10, 18 + tw(x.n, 12), 8], 0);
    });
    items.sort((a, b) => a.pri - b.pri);
    // vue
    let k = 1, tx = 0, ty = 0;
    const clamp = () => { k = Math.min(14, Math.max(1, k)); tx = Math.min(80, Math.max(W * (1 - k) - 80, tx)); ty = Math.min(80, Math.max(H * (1 - k) - 80, ty)); };
    const render = () => {
      geo.setAttribute("transform", `translate(${tx} ${ty}) scale(${k})`);
      pat.setAttribute("patternTransform", `scale(${1 / k}) rotate(45)`);
      const s = 1 / ((svg.getScreenCTM() || { a: 1 }).a || 1), near = k > 2.4;
      halos.forEach((h) => h.setAttribute("stroke-width", 28 * Math.pow(k, 0.35)));
      const placed = [], hidden = (n) => { for (let p = n; p && p !== svg; p = p.parentNode) if (p.style && p.style.display === "none") return true; return false; };
      for (const it of items) {
        let vis = k >= it.z && !(o.nozl && it.zone);
        let x = it.x, y = it.y; if (it.zone && near) { x = it.zone.mid[0]; y = it.zone.mid[1]; }
        const X = k * x + tx + (it.zone && near ? 18 * s : 0), Y = k * y + ty + (it.grid ? k * it.dy + 11 * s : 0) - (it.zone && near ? 24 * s : 0);
        if (vis && it.box && !(it.node.parentNode && hidden(it.node.parentNode))) {
          const r = [X + it.box[0] * s, Y + it.box[1] * s, X + it.box[2] * s, Y + it.box[3] * s];
          if (r[2] < 0 || r[0] > W || r[3] < 0 || r[1] > H) vis = it.pri === 0;
          else if (placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) vis = it.pri === 0;
          if (vis) placed.push(r);
        }
        it.node.style.display = vis ? "" : "none"; if (!vis) continue;
        it.node.setAttribute("transform", `translate(${X} ${Y}) scale(${s})`);
      }
      leaders.forEach(({ ln, z }) => { ln.style.display = (near || o.nozl) ? "none" : ""; ln.setAttribute("x1", k * z.mid[0] + tx); ln.setAttribute("y1", k * z.mid[1] + ty); ln.setAttribute("x2", k * z.lab[0] + tx); ln.setAttribute("y2", k * z.lab[1] + ty); });
    };
    const toSvg = (cx, cy) => { const m = svg.getScreenCTM(); return { x: (cx - m.e) / m.a, y: (cy - m.f) / m.d }; };
    const zoomAt = (p, f) => { const nk = Math.min(14, Math.max(1, k * f)); f = nk / k; tx = p.x - (p.x - tx) * f; ty = p.y - (p.y - ty) * f; k = nk; clamp(); render(); };
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    let anim = 0;
    const flyTo = (bb) => {
      let nk = 1, ntx = 0, nty = 0;
      if (bb) { const bw = bb[2] - bb[0] + 260, bh = bb[3] - bb[1] + 220; nk = Math.min(9, Math.max(1, Math.min(W / bw, H / bh))); ntx = W / 2 - nk * (bb[0] + bb[2]) / 2; nty = H / 2 - nk * (bb[1] + bb[3]) / 2; }
      const k0 = k, x0 = tx, y0 = ty, t0 = performance.now(), dur = reduce ? 0 : 520; cancelAnimationFrame(anim);
      const step = (t) => { const u = dur ? Math.min(1, (t - t0) / dur) : 1, e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        k = k0 * Math.pow(nk / k0, e); tx = x0 + (ntx - x0) * e; ty = y0 + (nty - y0) * e; clamp(); render(); if (u < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    };
    // info-bulle et détail
    const tip = o.tip, det = o.det;
    const info = (n) => { const t = n.dataset.t, i = +n.dataset.i; if (t === "p") { const p = D.points[i]; return { n: p.n, k: p.o || KIND[p.k], d: p.d, s: p.src }; }
      if (t === "g") { const g = D.grid[i]; return { n: g.n, k: KIND[g.k], d: g.d, s: g.src }; } if (t === "x") { const x = o.extra[i]; return { n: x.n, k: x.k, d: x.d, s: x.src || [] }; } const z = D.zones[i]; return { n: `Zone ${z.n} · ${z.name}`, k: z.sub, d: z.desc, s: z.src, z: z.n }; };
    const srcHtml = (s) => s.length ? "Sources : " + s.map((n) => { const [a, u] = (o.src[n - 1] || "|").split("|"); return `<a href="${esc(u)}" target="_blank" rel="noopener">[${n}] ${esc(a)}</a>`; }).join(" · ") : "Hypothèse ou élément illustratif : pas de source.";
    const hl = (z) => { root.querySelectorAll(".zn").forEach((g) => g.classList.toggle("hl", String(g.dataset.z) === String(z))); (o.rows || []).forEach((r) => r.classList.toggle("hl", r.dataset.z === String(z))); };
    const showTip = (n, e) => { const f = info(n); tip.innerHTML = `<b>${esc(f.n)}</b>${esc(f.k)}<br><span style="opacity:.75">Cliquer pour la source</span>`; const r = root.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14; if (x + w > r.width) x -= w + 28; if (y + h > r.height) y -= h + 28; tip.style.left = Math.max(0, x) + "px"; tip.style.top = Math.max(0, y) + "px"; tip.style.opacity = 1; hl(f.z || null); };
    const X_BTN = `<button type="button" class="mdx" aria-label="Fermer" style="position:absolute;top:4px;right:4px;width:28px;height:28px;border:0;background:none;color:inherit;font:inherit;font-size:18px;line-height:1;cursor:pointer;border-radius:4px">×</button>`;
    det.style.position = "relative"; det.style.paddingRight = "36px";
    det.insertAdjacentHTML("afterbegin", X_BTN);
    det.addEventListener("click", (e) => { if (e.target.closest(".mdx")) det.style.display = "none"; });
    const showDet = (n) => { const f = info(n); det.innerHTML = X_BTN + `<b>${esc(f.n)}</b> · ${esc(f.k)}<br>${esc(f.d)}<br>${srcHtml(f.s)}`; det.style.display = ""; };
    // pointeurs : déplacement, pincement, clic
    const pts = new Map(); let moved = false, last = null, pinch = null;
    svg.addEventListener("pointerdown", (e) => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; last = { x: e.clientX, y: e.clientY }; svg.style.cursor = "grabbing";
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; } });
    svg.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) { const n = e.target.closest("[data-t]"); if (n) showTip(n, e); else { tip.style.opacity = 0; hl(null); } return; }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); const m = svg.getScreenCTM();
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(toSvg((a.x + b.x) / 2, (a.y + b.y) / 2), d / pinch.d); pinch.d = d; moved = true; return; }
      const dx = e.clientX - last.x, dy = e.clientY - last.y; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (moved) { tx += dx / m.a; ty += dy / m.d; clamp(); render(); tip.style.opacity = 0; } last = { x: e.clientX, y: e.clientY };
    });
    const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; svg.style.cursor = "grab";
      if (!moved && e.type === "pointerup") { const n = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-t]"); if (n) showDet(n); } };
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    svg.addEventListener("pointerleave", () => { if (!pts.size) { tip.style.opacity = 0; hl(null); } });
    svg.addEventListener("wheel", (e) => { e.preventDefault(); e.stopPropagation(); zoomAt(toSvg(e.clientX, e.clientY), Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
    svg.addEventListener("dblclick", (e) => { e.preventDefault(); zoomAt(toSvg(e.clientX, e.clientY), 2); });
    // contrôles
    const ctl = document.createElement("div"); ctl.className = "l2ctl";
    ctl.innerHTML = `<button data-a="in" aria-label="Zoomer">+</button><button data-a="out" aria-label="Dézoomer">−</button><button data-a="reset" aria-label="Vue d'ensemble">⟲</button>`;
    const pre = document.createElement("div"); pre.className = "l2pre";
    pre.innerHTML = `<button data-f="0">Europe</button>` + D.zones.map((z) => `<button data-f="${z.n}">Zone ${z.n}</button>`).join("");
    root.append(ctl); if (!o.nopre) root.append(pre);
    ctl.addEventListener("click", (e) => { const a = e.target.closest("button")?.dataset.a; if (!a) return; if (a === "reset") flyTo(null); else zoomAt({ x: W / 2, y: H / 2 }, a === "in" ? 1.6 : 1 / 1.6); });
    pre.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const z = D.zones.find((x) => x.n === +b.dataset.f); flyTo(z ? z.bb : null); hl(z ? z.n : null); });
    (o.rows || []).forEach((r) => { const z = D.zones.find((x) => String(x.n) === r.dataset.z);
      r.addEventListener("mouseenter", () => hl(r.dataset.z)); r.addEventListener("mouseleave", () => hl(null)); r.addEventListener("click", () => { flyTo(z.bb); hl(z.n); }); });
    // calques
    o.chips.innerHTML = CHIPS.map((c) => `<button class="chip" aria-pressed="false" data-ly="${c[0]}"><i style="${c[2]}"></i>${c[1]}</button>`).join("");
    o.chips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on);
      root.querySelectorAll(".ly-" + b.dataset.ly).forEach((g) => (g.style.display = on ? "" : "none")); render(); });
    CHIPS.forEach((c) => root.querySelectorAll(".ly-" + c[0]).forEach((g) => (g.style.display = "none")));
    (o.layers || []).forEach((l) => root.querySelectorAll(".ly-" + l).forEach((g) => (g.style.display = "")));
    (o.layers || []).forEach((l) => { const b = o.chips.querySelector('.chip[data-ly="' + l + '"]'); if (b) b.setAttribute("aria-pressed", "true"); });
    if (o.focus) { const z = D.zones.find((q) => q.n === o.focus), bb = z.bb, bw = bb[2] - bb[0] + (o.pad || 260), bh = bb[3] - bb[1] + (o.pad || 220);
      k = Math.min(9, Math.max(1, Math.min(W / bw, H / bh))); tx = W / 2 - k * (bb[0] + bb[2]) / 2; ty = H / 2 - k * (bb[1] + bb[3]) / 2; clamp(); }
    render();
    new ResizeObserver(() => render()).observe(root);
    if (o.revealOnNext) {
      const pg = root.closest(".pg"), deck = pg && pg.parentNode;
      const onPg = () => deck && Math.abs(pg.offsetTop - deck.scrollTop) < pg.clientHeight * 0.3;
      const chipsAll = () => [...o.chips.querySelectorAll(".chip")];
      let si = 0, cool = 0;
      const allOn = () => si >= STEPS.length;
      const showAll = () => { const ls = STEPS[si++] || []; ls.forEach((l) => { const b = o.chips.querySelector('.chip[data-ly="' + l + '"]'); if (b) b.setAttribute("aria-pressed", "true"); root.querySelectorAll(".ly-" + l).forEach((g) => (g.style.display = "")); }); render(); cool = performance.now() + 700; };
      o.chips.addEventListener("click", () => { si = STEPS.findIndex((st) => st.some((l) => { const b = o.chips.querySelector('.chip[data-ly="' + l + '"]'); return !b || b.getAttribute("aria-pressed") !== "true"; })); if (si < 0) si = STEPS.length; });
      window.addEventListener("keydown", (e) => {
        if (!["ArrowDown", "PageDown", " ", "ArrowRight"].includes(e.key) || !onPg() || allOn()) return;
        if (e.target.closest && e.target.closest("input,textarea,select")) return;
        e.preventDefault(); e.stopImmediatePropagation(); showAll();
      }, true);
      if (deck) deck.addEventListener("wheel", (e) => {
        if (!onPg()) return;
        if (performance.now() < cool) { e.preventDefault(); e.stopPropagation(); return; }
        if (e.deltaY > 0 && !allOn()) { e.preventDefault(); e.stopPropagation(); showAll(); }
      }, { capture: true, passive: false });
    }
  }
  return { init };
})();
