/* Carte L4 : vraie carte vectorielle (zoom, déplacement, mesure) autour du terrain de Saint-André-de-Cubzac.
   Tracés routiers : itinéraires OpenStreetMap calculés via OSRM (l4-geo.json). Positions des aires et du poste RTE : approximatives. */
window.L4Local = (function () {
  const NS = "http://www.w3.org/2000/svg";
  const C = { axis: "#C9503A", road: "#6B6558", gold: "#B7791F", text: "#2B2A27", muted: "rgba(43,42,39,.66)", amber: "#B8681A", chg: "#5E6773", bg: "#EEEAE0", pill: "#FFFFFF" };
  const el = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const W = 1000, H = 800, LAT0 = 44.985, LON0 = -0.43, KX = 78.7, KY = 111.2, S0 = 20;
  const km = (lon, lat) => [(lon - LON0) * KX, -(lat - LAT0) * KY];           // km depuis le centre (x est, y sud)
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const fmt = (v) => (v < 10 ? v.toFixed(1) : Math.round(v)).toString().replace(".", ",");
  const LISTING = "https://www.geolocaux.com/annonce/terrain-industriel-a-vendre-saint-andre-de-cubzac-proximite-a10-545252.html";
  const PIN = [-0.434698, 44.991767];

  function polyLen(pts) { let t = 0; for (let i = 1; i < pts.length; i++) t += dist(pts[i - 1], pts[i]); return t; }
  function atLen(pts, d) { let t = 0; for (let i = 1; i < pts.length; i++) { const s = dist(pts[i - 1], pts[i]); if (t + s >= d) { const f = (d - t) / s; return [pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1])]; } t += s; } return pts[pts.length - 1]; }

  function init(o) {
    const root = o.root, det = o.det;
    root.style.position = "relative"; root.innerHTML = "";
    Promise.all([fetch("l4-geo.json").then((r) => r.json()), fetch("l4-base.json").then((r) => r.json()).catch(() => null)]).then(([g, b]) => build(g, b)).catch(() => { root.textContent = "Carte indisponible."; });

    function build(G, BASE) {
      const P = (a) => a.map((p) => km(p[0], p[1]));
      const A10S = P(G.A10S), A10N = P(G.A10N), A630 = P(G.A630), R40 = P(G.R40), R39 = P(G.R39), R41 = P(G.R41);
      const A10 = A10S.concat(A10N.slice(1)), pin = km(...PIN);
      const e40 = A10S[A10S.length - 1], lA10S = polyLen(A10S);
      // sorties : 45, 41, 40, 39a et 38 mesurées sur les itinéraires ; 42 à 44 interpolées entre 41 et 45
      const s41 = (() => { let b = 0, t = 0; const target = km(-0.463913, 44.949132); for (let i = 1; i < A10S.length; i++) { const sg = dist(A10S[i - 1], A10S[i]); const f = ((target[0] - A10S[i - 1][0]) * (A10S[i][0] - A10S[i - 1][0]) + (target[1] - A10S[i - 1][1]) * (A10S[i][1] - A10S[i - 1][1])) / (sg * sg); if (f >= 0 && f <= 1 && dist(target, [A10S[i - 1][0] + f * (A10S[i][0] - A10S[i - 1][0]), A10S[i - 1][1] + f * (A10S[i][1] - A10S[i - 1][1])]) < 0.3) return t + f * sg; t += sg; } return 6; })();
      const sOf = (frac) => atLen(A10S, frac); // distance depuis Lormont
      const span = lA10S - 0 - (lA10S - s41); // km entre Lormont et la sortie 41
      const EX = [
        { n: "45", zn: 1.4, name: "Lormont · rocade A630", c: A10S[0], side: -1, z: 0, d: "Sortie 45 : Lormont, jonction avec l'A630 (rocade de Bordeaux). Point de départ de l'A10 sur cette carte.", s: [51] },
        { n: "44", c: atLen(A10S, s41 * 6 / 7), z: 1.6, d: "Sortie 44 : Carbon-Blanc. Position interpolée entre les sorties 45 et 41.", s: [51] },
        { n: "43", c: atLen(A10S, s41 * 4 / 7), z: 1.6, d: "Sortie 43 : Sainte-Eulalie. Position interpolée entre les sorties 45 et 41.", s: [51] },
        { n: "42", c: atLen(A10S, s41 * 3 / 7), z: 1.6, d: "Sortie 42 : Ambarès. Position interpolée entre les sorties 45 et 41.", s: [51] },
        { n: "41", zn: 1.4, name: "Ambès · ZI Bassens · port", c: km(-0.463913, 44.949132), side: 1, z: 0, d: "Sortie 41 : Saint-Vincent-de-Paul, Ambès, zone industrielle et portuaire (presqu'île d'Ambès). Elle donne accès aux flux du port de Bordeaux.", s: [43, 51], route: "R41" },
        { n: "40", zn: 2.2, name: "Saint-André · Blaye", c: e40, side: 1, z: 0, d: "Sorties 40a (Blaye) et 40b (Saint-André-de-Cubzac est). Échangeur le plus proche du terrain, à 2,1 km par la route.", s: [42, 43, 51], route: "R40" },
        { n: "39a/b", zn: 2.2, name: "Saint-André nord · Libourne", c: km(-0.431176, 45.015411), side: 1, z: 0, d: "Sorties 39a (Saint-André-de-Cubzac nord, D 1010) et 39b (Angoulême, N10). Deuxième accès au terrain, à 3,9 km par la route.", s: [42, 43, 51], route: "R39" },
        { n: "38", name: "Saint-Aubin-de-Blaye", c: km(-0.539589, 45.250789), side: 1, z: 0, d: "Sortie 38 : Saint-Aubin-de-Blaye, première sortie au nord après Saint-André.", s: [51] },
      ];
      const s40N = (d) => atLen(A10N, d);
      const AIRES = [
        { n: "Aires de l'Estalot et de Meillac", short: "Estalot · Meillac", c: km(-0.4322, 44.9765), kind: "pl", side: -1, z: 2.4, d: "Deux aires de service de l'A10 face à face (Estalot sens Paris → Bordeaux, Meillac sens Bordeaux → Paris), toutes deux listées avec parking PL par VINCI Autoroutes. Stations TotalEnergies et Esso. Accès uniquement depuis l'autoroute. Recharge voitures légères uniquement (TotalEnergies 175 kW, Atlante).", s: [44, 46, 49] },
        { n: "Aire de Cézac", short: "Cézac", c: s40N(10), kind: "pl", side: -1, z: 0, d: "Aire de repos de l'A10 (sens Bordeaux → Paris), parking PL et borne électrique (voitures légères). Position approximative, placée d'après le point kilométrique (≈ 10 km au nord de la sortie 40).", s: [50] },
        { n: "Aires de Saugon et des Terres de l'Estuaire", short: "Saugon · Terres de l'Estuaire", c: s40N(14.5), kind: "pl", side: -1, z: 1.4, d: "Aires de service de l'A10 (Saugon sens Paris → Bordeaux, Terres de l'Estuaire sens Bordeaux → Paris), avec parking PL d'après VINCI Autoroutes. Position approximative, d'après les points kilométriques.", s: [49, 51] },
        { n: "Auchan Saint-André-de-Cubzac", short: "Auchan", c: km(-0.4321, 45.01303), kind: "svc", side: 1, z: 2.2, d: "Station-service de grande surface, à proximité de la D 1010. Position issue d'une base de stations-service.", s: [44] },
        { n: "Tesla Supercharger", short: "Tesla", c: km(-0.447, 44.999), kind: "chg", side: -1, z: 2.2, d: "Supercharger du centre commercial (avenue de l'Europe). Voitures légères, position approximative.", s: [47] },
      ];
      const TOWNS = [["Bordeaux", -0.579027, 44.837638, 0, 20], ["Libourne", -0.243, 44.915, 0, 14], ["Blaye", -0.6622, 45.1275, 0, 14], ["Saint-André-de-Cubzac", -0.4433, 44.9967, 1.3, 16], ["Presqu'île d'Ambès · zone portuaire", -0.530012, 44.95, 0.9, 15], ["Lormont", -0.52, 44.8836, 2.5, 13], ["Cubzac-les-Ponts", -0.4283, 45.0, 3.2, 13]];
      const ROADS = [["A630 · Rocade", A630, 2, 0], ["D 670", R40, 4, 0.52], ["D 1010", R39, 3.5, 0.2], ["Avenue des Marais de Montferrand", R41, 3.5, 0.55]];

      // ---- svg ----
      root.style.touchAction = "none";
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "xMidYMid meet", role: "img", "aria-label": "Carte routière entre Bordeaux et Saint-André-de-Cubzac : A10, sorties, routes d'accès au terrain, aires poids lourds et poste RTE de Cubnezais", style: "display:block;width:100%;height:100%;cursor:grab;user-select:none" }, root);
      el("rect", { width: W, height: H, fill: C.bg }, svg);
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "l4clip" }, defs); el("rect", { width: W, height: H }, cp);
      const gClip = el("g", { "clip-path": "url(#l4clip)" }, svg);
      const gGrid = el("g", {}, gClip), gNet = el("g", {}, gClip), gRoads = el("g", {}, gClip), gOv = el("g", {}, svg);
      const tip = document.createElement("div"); tip.className = "tip"; root.appendChild(tip);

      let k = 1, tx = 0, ty = 0;
      const sc = () => k * S0;
      const X = (p) => W / 2 + tx + sc() * p[0], Y = (p) => H / 2 + ty + sc() * p[1];
      const D = (pts) => "M" + pts.map((p) => X(p).toFixed(1) + "," + Y(p).toFixed(1)).join("L");

      // fond de carte OpenStreetMap (extrait Geofabrik, simplifié) : routes, cours d'eau, communes
      const dec = (a) => { const o = []; let x = a[0], y = a[1]; o.push(km(x / 1e4, y / 1e4)); for (let i = 2; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; o.push(km(x / 1e4, y / 1e4)); } return o; };
      const mkF = (pts) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return { pts, b: [x0, y0, x1, y1] }; };
      // classe : [couleur, couleur du liseré, largeur de base, zoom mini]
      const STY = { res: ["#FFFFFF", "#D4CEBF", 1.1, 2.6], unc: ["#FFFFFF", "#D4CEBF", 1.3, 2], ter: ["#FFFFFF", "#C9C2B0", 1.7, 1.3], sec: ["#F9F1A6", "#C8BE74", 2.3, 0], pri: ["#F9CE8A", "#C99A4E", 2.8, 0], tru: ["#F7A98F", "#C77258", 3, 0], mot: ["#E58F9E", "#B0576A", 3.3, 0] };
      const ORDER = ["res", "unc", "ter", "sec", "pri", "tru", "mot"];
      const baseCls = [];
      let waterF = [];
      const gBase = el("g", {}, gNet), gWater = el("g", {}, gBase), gPoly = el("g", {}, gWater);
      let polyF = [];
      if (BASE) {
        polyF = (BASE.wpoly || []).map((rings) => { const rr = rings.map(dec); const f = mkF([].concat(...rr)); f.rr = rr; f.p = el("path", { fill: "#A8CCE6", "fill-rule": "evenodd", stroke: "#8FBAD8", "stroke-width": 0.8 }, gPoly); return f; });
        waterF = BASE.water.map(([w, n, c]) => ({ w, ...mkF(dec(c)) }));
        waterF.forEach((f) => { f.p = el("path", { fill: "none", stroke: "#A8CCE6", "stroke-linecap": "round", "stroke-linejoin": "round" }, gWater); });
        const gr = {}; ORDER.forEach((c) => { gr[c] = el("g", {}, gBase); });
        // les liaisons (bretelles) sont tracées avec leur classe
        const feats = {}; for (const key in BASE.roads) { const cl = key.replace(/L$/, ""); (feats[cl] = feats[cl] || []).push(...BASE.roads[key].map((r) => mkF(dec(r[0])))); }
        ORDER.forEach((cl) => { if (!feats[cl]) return; baseCls.push({ cl, f: feats[cl], c: el("path", { fill: "none", stroke: STY[cl][1], "stroke-linecap": "round", "stroke-linejoin": "round" }, gr[cl]), l: el("path", { fill: "none", stroke: STY[cl][0], "stroke-linecap": "round", "stroke-linejoin": "round" }, gr[cl]) }); });
      }
      const NETDONE = true;
      // routes
      const mkRoad = (g, pts, w, col, extra = {}) => el("path", { fill: "none", stroke: col, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": w, ...extra }, g);
      const rA630c = mkRoad(gRoads, A630, 0, "#fff"), rA630 = mkRoad(gRoads, A630, 0, C.road);
      const gLocal = el("g", { class: "l4-roads" }, gRoads);
      const loc = [["R41", R41, 0], ["R39", R39, 1]].map(([id, pts]) => ({ id, pts, casing: mkRoad(gLocal, pts, 0, "#fff"), line: mkRoad(gLocal, pts, 0, C.amber, { "stroke-opacity": 0.85, "data-t": "r", "data-id": id, style: "cursor:pointer" }) }));
      const r40 = { id: "R40", pts: R40, casing: mkRoad(gLocal, R40, 0, "#fff"), line: mkRoad(gLocal, R40, 0, C.gold, { "data-t": "r", "data-id": "R40", style: "cursor:pointer" }) };
      loc.push(r40);
      const aC = mkRoad(gRoads, A10, 0, "#fff"), aL = mkRoad(gRoads, A10, 0, C.axis, { "stroke-opacity": 0.95 }), aD = mkRoad(gRoads, A10, 1.2, "#fff", { "stroke-dasharray": "10 8" });
      const hit = mkRoad(gRoads, A10, 18, "transparent", { "data-t": "a10", style: "cursor:pointer" });

      // calques d'objets
      const L = { exits: el("g", { class: "l4-exits" }, gOv), pl: el("g", { class: "l4-pl" }, gOv), svc: el("g", { class: "l4-svc" }, gOv), chg: el("g", { class: "l4-chg" }, gOv), grid: el("g", { class: "l4-grid" }, gOv), dist: el("g", { class: "l4-dist" }, gOv), base: el("g", {}, gOv), pin: el("g", { class: "l4-pin" }, gOv), meas: el("g", {}, gOv) };
      const items = [], data = [], nameNodes = [], pinTxt = [];
      const lab = (t, a, p) => { const e = el("text", { "paint-order": "stroke", stroke: C.bg, "stroke-width": 4, "stroke-linejoin": "round", ...a }, p); e.textContent = t; return e; };
      const reg = (g, info) => { data.push(info); g.setAttribute("data-i", data.length - 1); g.setAttribute("data-t", "p"); g.style.cursor = "pointer"; };
      const add = (node, c, z, w, h, pri, dx = 0, dy = 0) => items.push({ node, c, z, w, h, pri, dx, dy });

      // villes (étiquette seule, à gauche de leur point)
      TOWNS.forEach(([n, lon, lat, z, fs]) => { const g = el("g", {}, L.base); el("circle", { r: 3.5, fill: "#6B6558" }, g); lab(n, { x: 8, y: 5, "font-size": fs, fill: C.muted }, g); add(g, km(lon, lat), z, n.length * fs * 0.55 + 12, fs + 4, n === "Bordeaux" ? 0 : 3, 0, -fs / 2); });

      // communes du fond OSM (étiquettes discrètes, selon le zoom)
      if (BASE) { const skip = new Set(TOWNS.map((t) => t[0].toLowerCase())); const ZP = { city: 0, town: 1, village: 2.2, suburb: 4 };
        BASE.places.forEach(([n, t, lon, lat]) => { if (skip.has(n.toLowerCase()) || n === "Cubzac-les-Ponts") return; const g = el("g", {}, L.base); const fs = t === "town" ? 13 : 12; lab(n, { x: 0, y: 4, "font-size": fs, fill: "#4D4A42", "text-anchor": "middle", "stroke-width": 3, "stroke-opacity": 0.85 }, g); add(g, km(lon, lat), ZP[t], n.length * fs * 0.55 + 6, fs + 4, 5); }); }
      // pastilles de sortie
      EX.forEach((e) => {
        const g = el("g", {}, L.exits), w = 14 + e.n.length * 9.5;
        el("circle", { r: 20, fill: "transparent" }, g); el("rect", { x: -w / 2, y: -12, width: w, height: 24, rx: 12, fill: C.pill, stroke: C.text, "stroke-width": 1.6 }, g);
        lab(e.n, { y: 5, "font-size": 15, "font-weight": 700, fill: C.text, "text-anchor": "middle", "stroke-width": 0 }, g);
        if (e.name) { const nt = lab(e.name, { x: e.side > 0 ? w / 2 + 6 : -w / 2 - 6, y: 5, "font-size": 15, fill: C.text, "text-anchor": e.side > 0 ? "start" : "end" }, g); nameNodes.push([nt, e.zn == null ? 0 : e.zn]); }
        reg(g, { n: `Sortie ${e.n}${e.name ? " · " + e.name : ""}`, k: "Sortie d'autoroute", d: e.d, s: e.s });
        add(g, e.c, e.z, w, 26, e.z === 0 ? 0 : 1, 0, 0);
      });
      // aires, stations, recharge
      AIRES.forEach((a) => {
        const grp = a.kind === "pl" ? L.pl : a.kind === "svc" ? L.svc : L.chg, g = el("g", {}, grp);
        el("circle", { r: 16, fill: "transparent" }, g);
        if (a.kind === "pl") { el("rect", { x: -13, y: -10, width: 26, height: 20, rx: 4, fill: C.pill, stroke: C.amber, "stroke-width": 2.2 }, g); lab("PL", { y: 5, "font-size": 12.5, "font-weight": 700, fill: C.amber, "text-anchor": "middle", "stroke-width": 0 }, g); }
        else if (a.kind === "svc") { el("circle", { r: 10, fill: C.amber, stroke: C.pill, "stroke-width": 2 }, g); lab("S", { y: 5, "font-size": 13, "font-weight": 700, fill: "#fff", "text-anchor": "middle", "stroke-width": 0 }, g); }
        else { el("rect", { x: -10, y: -10, width: 20, height: 20, fill: C.pill, stroke: C.chg, "stroke-width": 2 }, g); lab("VL", { y: 4.5, "font-size": 11, "font-weight": 700, fill: C.chg, "text-anchor": "middle", "stroke-width": 0 }, g); }
        lab(a.short, { x: a.side > 0 ? 20 : -20, y: 5, "font-size": 15, fill: C.text, "text-anchor": a.side > 0 ? "start" : "end" }, g);
        reg(g, { n: a.n, k: a.kind === "pl" ? "Aire avec parking poids lourds" : a.kind === "svc" ? "Station-service" : "Recharge existante · voitures légères", d: a.d, s: a.s });
        const w = a.short.length * 8.2 + 44; add(g, a.c, a.z, w, 22, 1, a.side > 0 ? w / 2 - 22 : -(w / 2 - 22), 0);
      });
      // raccordement : rayon de 3 km autour du terrain et poste RTE de Cubnezais
      const ring = el("circle", { fill: "rgba(233,162,59,.025)", stroke: C.amber, "stroke-width": 1.4, "stroke-dasharray": "7 5", "data-t": "g" }, L.grid);
      const cub = km(-0.40, 45.06), ringC = el("circle", { fill: "rgba(233,162,59,.05)", stroke: C.amber, "stroke-dasharray": "3 4", "stroke-opacity": 0.7 }, L.grid);
      const cg = el("g", {}, L.grid); el("circle", { r: 22, fill: "transparent" }, cg); el("path", { d: "M0,-14 L12,0 L0,14 L-12,0 Z", fill: C.pill, stroke: C.amber, "stroke-width": 2.4 }, cg);
      lab("HTB", { y: 4.5, "font-size": 11, "font-weight": 700, fill: C.amber, "text-anchor": "middle", "stroke-width": 0 }, cg);
      lab("Poste RTE 400 kV de Cubnezais", { x: 20, y: -4, "font-size": 16, fill: C.amber, "font-weight": 600 }, cg); lab("position approximative (commune)", { x: 20, y: 14, "font-size": 13, fill: C.muted }, cg);
      reg(cg, { n: "Poste RTE de Cubnezais (400 kV)", k: "Raccordement · réseau de transport", d: "Nœud 400 kV de la région, choisi comme point d'atterrage de l'interconnexion France–Espagne. C'est un poste de transport, pas un point de soutirage pour une station : pour 3 MW, le raccordement se fera plus probablement en HTA depuis un poste source Enedis voisin, à identifier. Puissance disponible en soutirage non publiée. Position placée au niveau de la commune.", s: [52] });
      add(cg, cub, 0, 260, 34, 2, 120, 0);
      const ringLab = lab("rayon de 3 km autour du terrain", { "font-size": 14, fill: C.amber }, L.grid);
      // badges de distance sur les routes d'accès
      const badges = [["R40", R40, "2,1 km", "sortie 40 → terrain", 0.12], ["R39", R39, "3,9 km", "sortie 39a → terrain", 0.3], ["R41", R41, "8,4 km", "sortie 41 → port d'Ambès", 0.55]].map(([id, pts, v, t, f]) => {
        const g = el("g", { "data-t": "r", "data-id": id, style: "cursor:pointer" }, L.dist), w = (v + " · " + t).length * 7.4 + 16;
        el("rect", { x: -w / 2, y: -12, width: w, height: 24, rx: 5, fill: C.pill, stroke: id === "R40" ? C.gold : C.amber, "stroke-width": 1.4, "fill-opacity": 0.92 }, g);
        lab(v + " · " + t, { y: 5, "font-size": 14, "font-weight": 600, fill: id === "R40" ? C.gold : C.amber, "text-anchor": "middle", "stroke-width": 0 }, g);
        add(g, atLen(pts, polyLen(pts) * f), id === "R40" ? 0 : id === "R39" ? 2 : 1.2, w, 24, 0.5, id === "R40" ? 118 : id === "R39" ? -125 : 0, id === "R40" ? 10 : 0); return g;
      });
      // distances le long de l'A10 vers Bordeaux
      const dg = el("g", { class: "l4-dist" }, L.dist), dtxt = (t, c, z, dy) => { const g = el("g", {}, dg), w = t.length * 7 + 14; el("rect", { x: -w / 2, y: -11, width: w, height: 22, rx: 4, fill: C.pill, stroke: C.axis, "stroke-width": 1, "fill-opacity": 0.92 }, g); lab(t, { y: 5, "font-size": 13, fill: C.axis, "text-anchor": "middle", "stroke-width": 0 }, g); add(g, c, z, w, 22, 0.6, dy < 0 ? 78 : -52, dy); };
      dtxt("A10 · 13 km jusqu'à la rocade", atLen(A10S, 6.5), 0, 0); dtxt("Bordeaux centre ≈ 26 km", A630[0], 0, -34);
      // noms de routes
      const rl = ROADS.map(([n, pts, z, f]) => { const g = el("g", {}, L.base); lab(n, { "font-size": 13, fill: C.road, "text-anchor": "middle", "font-style": "italic" }, g); add(g, atLen(pts, polyLen(pts) * (f || 0.5)), z, n.length * 7 + 8, 16, 4, 0, -10); return g; });
            const a10l = el("g", {}, L.base); lab("A10", { "font-size": 20, "font-weight": 700, fill: C.axis, "text-anchor": "middle" }, a10l); add(a10l, atLen(A10N, 7), 0, 40, 22, 1, 26, 0);
      const a10u = el("g", {}, L.base); lab("↑ Saintes · Paris", { "font-size": 14, fill: C.muted }, a10u); add(a10u, atLen(A10N, 15), 0, 130, 18, 3, 74, 0);

      // terrain (épingle)
      const pg = el("g", { "data-t": "pin", tabindex: 0, role: "button", "aria-label": "Terrain annoncé : ouvrir l'aperçu de l'annonce", style: "cursor:pointer" }, L.pin);
      el("circle", { r: 24, fill: "transparent" }, pg); el("path", { d: "M0,0 C-18,-20 -18,-44 0,-44 C18,-44 18,-20 0,0 Z", fill: C.gold, stroke: "#2B2A27", "stroke-width": 2.2 }, pg); el("circle", { cx: 0, cy: -30, r: 6.5, fill: "#fff" }, pg);
      pinTxt.push(lab("Terrain · 5 000 m² · 110 €/m²", { x: 18, y: -34, "font-size": 18, "font-weight": 700, fill: C.gold }, pg), lab("emplacement exact non communiqué", { x: 18, y: -14, "font-size": 13, fill: C.muted }, pg));
      const pinUnc = el("circle", { fill: "rgba(227,195,143,.07)", stroke: C.gold, "stroke-dasharray": "5 5", "stroke-opacity": 0.7 }, L.pin); L.pin.insertBefore(pinUnc, pg);

      // échelle et mesure
      const scl = el("g", {}, svg), sl = el("line", { y1: H - 22, y2: H - 22, stroke: C.text, "stroke-width": 2 }, scl), slt = lab("", { y: H - 30, "font-size": 15, fill: C.text, "text-anchor": "middle" }, scl);
      let meas = [], measOn = false;
      const mLine = el("line", { stroke: C.text, "stroke-width": 2, "stroke-dasharray": "6 5" }, L.meas), mA = el("circle", { r: 5, fill: C.text }, L.meas), mB = el("circle", { r: 5, fill: C.text }, L.meas), mG = el("g", {}, L.meas);
      const mBox = el("rect", { height: 24, rx: 5, fill: C.pill, stroke: C.text, "stroke-width": 1 }, mG), mTxt = lab("", { y: 17, "font-size": 15, "font-weight": 700, fill: C.text, "text-anchor": "middle", "stroke-width": 0 }, mG);

      // ---- rendu ----
      const gl = [];
      let raf = 0, moving = false, mvT = 0;
      const render = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; renderNow(); }); };
      const bump = () => { moving = true; clearTimeout(mvT); mvT = setTimeout(() => { moving = false; render(); }, 140); };
      const renderNow = () => {
        const s = 1 / ((svg.getScreenCTM() || { a: 1 }).a || 1); // 1 px écran en unités de viewBox
        const pxk = sc();
        // grille
        const step = k < 1.8 ? 10 : k < 4 ? 5 : k < 8 ? 2 : 1; gGrid.innerHTML = "";
        const x0 = Math.floor((-W / 2 - tx) / pxk / step) * step, x1 = Math.ceil((W / 2 - tx) / pxk / step) * step, y0 = Math.floor((-H / 2 - ty) / pxk / step) * step, y1 = Math.ceil((H / 2 - ty) / pxk / step) * step;
        for (let x = x0; x <= x1; x += step) el("line", { x1: W / 2 + tx + pxk * x, y1: 0, x2: W / 2 + tx + pxk * x, y2: H, stroke: "rgba(0,0,0,.05)" }, gGrid);
        for (let y = y0; y <= y1; y += step) el("line", { x1: 0, y1: H / 2 + ty + pxk * y, x2: W, y2: H / 2 + ty + pxk * y, stroke: "rgba(0,0,0,.05)" }, gGrid);
        // routes (largeurs liées au zoom)
        const wz = (b, c) => Math.min(c, b * Math.pow(k, 0.28));
        gNet.setAttribute("shape-rendering", moving ? "optimizeSpeed" : "auto");
        { const vx0 = (-W / 2 - tx) / pxk - 1, vx1 = (W / 2 - tx) / pxk + 1, vy0 = (-H / 2 - ty) / pxk - 1, vy1 = (H / 2 - ty) / pxk + 1, zf = Math.min(2.4, Math.pow(k, 0.3));
          const vis = (f) => f.b[2] >= vx0 && f.b[0] <= vx1 && f.b[3] >= vy0 && f.b[1] <= vy1;
          const dd = (f) => D(f.pts);
          polyF.forEach((f) => { if (!vis(f)) { f.p.setAttribute("d", ""); return; } f.p.setAttribute("d", f.rr.map((r) => D(r) + "Z").join("")); });
          waterF.forEach((f) => { if (f.w === "stream" && k < 3) { f.p.setAttribute("d", ""); return; } if (!vis(f)) { f.p.setAttribute("d", ""); return; } f.p.setAttribute("d", dd(f)); f.p.setAttribute("stroke-width", (f.w === "river" ? 3.2 : 1.3) * zf); });
          baseCls.forEach((b) => { const st = STY[b.cl]; if (k < st[3] || (moving && (b.cl === "res" || b.cl === "unc" || b.cl === "ter"))) { b.c.setAttribute("d", ""); b.l.setAttribute("d", ""); return; } const d = b.f.filter(vis).map(dd).join(""); b.c.setAttribute("d", moving ? "" : d); b.l.setAttribute("d", d); const w = st[2] * zf; b.l.setAttribute("stroke-width", w); b.c.setAttribute("stroke-width", w + 1.6); }); }
        const A = wz(8, 16), Rd = wz(4, 9);
        [[rA630, A630, Rd * 1.5, 1], [rA630c, A630, Rd * 1.5 + 2.5, 0]].forEach(([e, p, w]) => { e.setAttribute("d", D(p)); e.setAttribute("stroke-width", w); });
        rA630c.setAttribute("stroke-opacity", 0.9); rA630.setAttribute("stroke-opacity", 0.9);
        aC.setAttribute("d", D(A10)); aC.setAttribute("stroke-width", A + 3); aL.setAttribute("d", D(A10)); aL.setAttribute("stroke-width", A); aD.setAttribute("d", D(A10)); aD.setAttribute("stroke-width", Math.max(1, A / 7)); hit.setAttribute("d", D(A10));
        loc.forEach((r) => { const w = r.id === "R40" ? Rd * 1.25 : Rd * 0.95; r.casing.setAttribute("d", D(r.pts)); r.casing.setAttribute("stroke-width", w + 3); r.line.setAttribute("d", D(r.pts)); r.line.setAttribute("stroke-width", w); });
        // objets avec collision
        const placed = [], hidden = (n) => { for (let p = n.parentNode; p && p !== svg; p = p.parentNode) if (p.style && p.style.display === "none") return true; return false; };
        items.sort((a, b) => a.pri - b.pri);
        items.forEach((it) => {
          const x = X(it.c), y = Y(it.c); let vis = k >= it.z;
          if (vis && !hidden(it.node)) {
            const r = [x + it.dx - it.w / 2, y + it.dy - it.h / 2, x + it.dx + it.w / 2, y + it.dy + it.h / 2];
            if (r[2] < 0 || r[0] > W || r[3] < 0 || r[1] > H) vis = it.pri < 1;
            else if (it.pri >= 1 && placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) vis = false;
            if (vis) placed.push(r);
          }
          it.node.style.display = vis ? "" : "none"; if (vis) it.node.setAttribute("transform", `translate(${x} ${y + (it.node.dataset.keepy ? 0 : 0)})`);
        });
        nameNodes.forEach(([n, z]) => (n.style.display = k >= z ? "" : "none")); pinTxt.forEach((n) => (n.style.display = k >= 2.5 ? "" : "none"));
        // badges de leur position pour ne pas masquer la route
        const [px, py] = [X(pin), Y(pin)]; pg.setAttribute("transform", `translate(${px} ${py})`);
        pinUnc.setAttribute("cx", px); pinUnc.setAttribute("cy", py); pinUnc.setAttribute("r", pxk * 1);
        ring.setAttribute("cx", px); ring.setAttribute("cy", py); ring.setAttribute("r", pxk * 3);
        const cx = X(cub), cy = Y(cub); ringC.setAttribute("cx", cx); ringC.setAttribute("cy", cy); ringC.setAttribute("r", pxk * 2.5);
        ringLab.setAttribute("x", px + pxk * 3 * 0.72 + 4); ringLab.setAttribute("y", py + pxk * 3 * 0.72 + 14);
        // échelle
        const nice = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20]; let kmv = nice[0]; for (const n of nice) { if (n * pxk <= 190) kmv = n; }
        const len = kmv * pxk; sl.setAttribute("x1", W - 40 - len); sl.setAttribute("x2", W - 40); slt.setAttribute("x", W - 40 - len / 2); slt.textContent = (kmv < 1 ? kmv * 1000 + " m" : kmv + " km");
        // mesure
        if (meas.length) { const a = [X(meas[0]), Y(meas[0])]; mA.setAttribute("cx", a[0]); mA.setAttribute("cy", a[1]); mA.style.display = ""; }
        else mA.style.display = "none";
        if (meas.length === 2) {
          const a = [X(meas[0]), Y(meas[0])], b = [X(meas[1]), Y(meas[1])], d = dist(meas[0], meas[1]), t = fmt(d) + " km à vol d'oiseau";
          mLine.setAttribute("x1", a[0]); mLine.setAttribute("y1", a[1]); mLine.setAttribute("x2", b[0]); mLine.setAttribute("y2", b[1]); mLine.style.display = "";
          mB.setAttribute("cx", b[0]); mB.setAttribute("cy", b[1]); mB.style.display = ""; const w = t.length * 8.6 + 16; mBox.setAttribute("width", w); mBox.setAttribute("x", -w / 2); mTxt.textContent = t; mG.setAttribute("transform", `translate(${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 - 30})`); mG.style.display = "";
        } else { mLine.style.display = "none"; mB.style.display = "none"; mG.style.display = "none"; }
      };
      const clamp = () => { k = Math.min(16, Math.max(0.9, k)); const mx = 28 * sc(), my = 24 * sc(); tx = Math.max(-mx + W / 2 * 0.2, Math.min(mx - W / 2 * 0.2, tx)); ty = Math.max(-my + H / 2 * 0.2, Math.min(my - H / 2 * 0.2, ty)); };
      const toSvg = (cx, cy) => { const m = svg.getScreenCTM(); return { x: (cx - m.e) / m.a, y: (cy - m.f) / m.d }; };
      let zT = null, zRaf = 0;
      const zStep = () => { zRaf = 0; const t = zT; if (!t) return; const d = t.k - k; if (Math.abs(d) < 0.002 * k) { k = t.k; zT = null; } else k += d * 0.22; tx = t.sx - W / 2 - sc() * t.wx; ty = t.sy - H / 2 - sc() * t.wy; clamp(); bump(); renderNow(); if (zT) zRaf = requestAnimationFrame(zStep); };
      const zoomAt = (p, f) => { const base = zT ? zT.k : k; const nk = Math.min(16, Math.max(0.9, base * f)); const w = worldAt(p); zT = { k: nk, sx: p.x, sy: p.y, wx: w[0], wy: w[1] }; if (!zRaf) zRaf = requestAnimationFrame(zStep); };
      const worldAt = (p) => [(p.x - W / 2 - tx) / sc(), (p.y - H / 2 - ty) / sc()];
      const focus = (c, nk) => { zT = null; k = nk; tx = -c[0] * sc(); ty = -c[1] * sc(); clamp(); render(); };
      const home = () => focus(km(-0.5, 44.958), 1.12);

      // ---- détail et infos ----
      const pinHtml = () => `<b>Terrain annoncé · Saint-André-de-Cubzac</b> · Geolocaux, réf. 33_8374<br>5 000 m² (lots de 5 000 à 35 000 m²) · 550 000 € soit 110 €/m² · honoraires de 7 % HT à la charge de l'acquéreur · viabilisé · disponible immédiatement · Cushman &amp; Wakefield Bordeaux.<br>Aucune adresse dans l'annonce : l'épingle indique la commune, pas la parcelle.<br><a href="${LISTING}" target="_blank" rel="noopener">Voir l'annonce ↗</a> · Source [41]`;
      const srcHtml = (s) => s && s.length ? " · Sources : " + s.map((n) => { const [a, u] = (o.src[n - 1] || "|").split("|"); return `<a href="${esc(u)}" target="_blank" rel="noopener">[${n}] ${esc(a)}</a>`; }).join(" ") : "";
      const showDet = (html) => { det.innerHTML = `<button type="button" class="mdx" aria-label="Fermer" style="position:absolute;top:2px;right:4px;width:28px;height:28px;border:0;background:none;color:inherit;font:inherit;font-size:18px;cursor:pointer">×</button>` + html; det.style.display = ""; };
      if (getComputedStyle(det).position === "static") det.style.position = "relative"; det.style.paddingRight = "36px"; det.style.display = "none";
      det.addEventListener("click", (e) => { if (e.target.closest(".mdx")) det.style.display = "none"; });
      const ROUTE = {
        R40: { n: "Sortie 40 → terrain", k: "Itinéraire d'accès", d: "2,06 km depuis la bretelle de la sortie 40 : D 670 (route de Libourne), deux ronds-points, chemin de Bois Milon puis rues locales jusqu'au terrain. Itinéraire voiture calculé sur OpenStreetMap vers un point approximatif ; à valider pour des poids lourds (gabarit, ronds-points).", s: [53] },
        R39: { n: "Sortie 39a → terrain", k: "Itinéraire d'accès", d: "3,85 km depuis la sortie 39a : D 1010, D 1510, avenue Michel Montaigne puis D 670. Plus long que la sortie 40 : utile surtout pour les camions venant du nord. Itinéraire voiture calculé sur OpenStreetMap vers un point approximatif.", s: [53] },
        R41: { n: "Sortie 41 → presqu'île d'Ambès", k: "Itinéraire vers la zone portuaire", d: "8,4 km depuis la sortie 41 jusqu'à la zone industrielle et portuaire de la presqu'île d'Ambès (avenue Robert Massé, avenue des Marais de Montferrand, avenue de la Presqu'île). Le terrain est à environ 6,5 km de cette sortie par l'A10.", s: [53, 43] },
      };
      const infoOf = (n) => { const t = n.dataset.t; if (t === "pin") return { n: "Terrain annoncé", k: "Cliquer pour l'aperçu et le lien vers l'annonce" }; if (t === "g") return { n: "Raccordement", k: "Puissance disponible : à demander" }; if (t === "r") { const r = ROUTE[n.dataset.id]; return { n: r.n, k: r.k }; } if (t === "a10") return { n: "Autoroute A10", k: "L'Aquitaine · Bordeaux ↔ Saintes" }; const i = data[+n.dataset.i]; return { n: i.n, k: i.k }; };
      const open = (n) => {
        const t = n.dataset.t;
        if (t === "pin") return showDet(pinHtml());
        if (t === "g") return showDet(`<b>Raccordement</b> · rayon de recherche du poste source (3 km, hypothèse)<br>Aucun poste source n'est localisé ici : la puissance disponible en soutirage n'est pas publiée. La carte d'accueil d'Enedis et de RTE porte sur l'injection des énergies renouvelables. Action : demander une pré-étude de raccordement à Enedis, et à RTE si la puissance dépasse le domaine HTA.`);
        if (t === "r") { const r = ROUTE[n.dataset.id]; return showDet(`<b>${esc(r.n)}</b> · ${esc(r.k)}<br>${esc(r.d)}${srcHtml(r.s)}`); }
        if (t === "a10") return showDet(`<b>Autoroute A10</b> · L'Aquitaine<br>Terrain → rocade de Bordeaux : 13 km par l'A10 depuis la sortie 40, puis 11 km de rocade et de voies urbaines jusqu'au centre de Bordeaux, soit environ 26 km au total. Distances d'après OpenStreetMap.${srcHtml([53])}`);
        const i = data[+n.dataset.i]; showDet(`<b>${esc(i.n)}</b> · ${esc(i.k)}<br>${esc(i.d)}${srcHtml(i.s)}`);
      };

      // ---- interactions ----
      const pts = new Map(); let last = null, moved = false, down = null;
      svg.addEventListener("pointerdown", (e) => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = { x: e.clientX, y: e.clientY }; moved = false; down = { x: e.clientX, y: e.clientY, t: e.target }; svg.style.cursor = "grabbing"; });
      svg.addEventListener("pointermove", (e) => {
        if (!pts.has(e.pointerId)) { const n = e.target.closest("[data-t]"); if (!n) { tip.style.opacity = 0; return; } const f = infoOf(n); tip.innerHTML = `<b>${esc(f.n)}</b>${esc(f.k)}`; const r = root.getBoundingClientRect(); let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14; if (x + 260 > r.width) x -= 290; if (y + 70 > r.height) y -= 84; tip.style.left = Math.max(0, x) + "px"; tip.style.top = Math.max(0, y) + "px"; tip.style.opacity = 1; return; }
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const m = svg.getScreenCTM(), dx = e.clientX - last.x, dy = e.clientY - last.y;
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) moved = true;
        if (moved) { zT = null; tx += dx / m.a; ty += dy / m.d; clamp(); bump(); render(); tip.style.opacity = 0; } last = { x: e.clientX, y: e.clientY };
      });
      const up = (e) => {
        svg.style.cursor = measOn ? "crosshair" : "grab"; pts.delete(e.pointerId);
        if (!moved && down) {
          if (measOn) { const w = worldAt(toSvg(e.clientX, e.clientY)); if (meas.length >= 2) meas = []; meas.push(w); render(); }
          else { const n = e.target.closest("[data-t]"); if (n) open(n); }
        }
        down = null;
      };
      svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", () => { pts.clear(); down = null; svg.style.cursor = "grab"; });
      svg.addEventListener("pointerleave", () => { tip.style.opacity = 0; });
      svg.addEventListener("wheel", (e) => { e.preventDefault(); e.stopPropagation(); zoomAt(toSvg(e.clientX, e.clientY), Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
      svg.addEventListener("dblclick", (e) => { e.preventDefault(); zoomAt(toSvg(e.clientX, e.clientY), 2); });
      svg.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-t]")) { e.preventDefault(); open(e.target.closest("[data-t]")); } });

      // contrôles : zoom, vue d'ensemble, mesure, vues rapides
      const ctl = document.createElement("div"); ctl.className = "l2ctl";
      ctl.innerHTML = `<button data-a="in" aria-label="Zoomer">+</button><button data-a="out" aria-label="Dézoomer">−</button><button data-a="reset" aria-label="Vue d'ensemble">⟲</button><button data-a="meas" aria-label="Mesurer une distance" aria-pressed="false" title="Mesurer une distance" style="font-size:12px">↔</button>`;
      root.appendChild(ctl);
      const pre = document.createElement("div"); pre.className = "l2pre";
      pre.innerHTML = `<button data-v="all">Bordeaux ↔ site</button><button data-v="exit">Sortie 40 → site</button><button data-v="site">Terrain</button>`;
      root.appendChild(pre);
      ctl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const a = b.dataset.a; if (a === "reset") home(); else if (a === "meas") { measOn = !measOn; b.setAttribute("aria-pressed", measOn); b.style.background = measOn ? C.gold : ""; b.style.color = measOn ? "#fff" : ""; svg.style.cursor = measOn ? "crosshair" : "grab"; if (!measOn) { meas = []; render(); } } else zoomAt({ x: W / 2, y: H / 2 }, a === "in" ? 1.6 : 1 / 1.6); });
      pre.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const v = b.dataset.v; if (v === "all") home(); else if (v === "exit") focus([(pin[0] + e40[0]) / 2, (pin[1] + e40[1]) / 2], 7); else focus(pin, 11); });

      // calques
      const CH = [["exits", "Sorties", "border:2px solid #FFF7DD;border-radius:7px;width:16px;height:10px"], ["roads", "Accès", "background:#E3C38F;width:16px;height:3px"], ["pl", "Aires PL", "border:2px solid #E9A23B;border-radius:3px;width:16px;height:10px"], ["svc", "Stations", "background:#E9A23B;border-radius:50%"], ["chg", "VL", "border:2px solid #B9B9B2"], ["grid", "Réseau", "border:1.5px dashed #E9A23B;border-radius:50%"], ["dist", "Distances", "border-bottom:2px solid #FFF7DD;width:16px;height:8px"]];
      o.chips.innerHTML = CH.map((c) => `<button class="chip" aria-pressed="true" data-ly="${c[0]}"><i style="${c[2]}"></i>${c[1]}</button>`).join("");
      o.chips.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; const on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", on); root.querySelectorAll(".l4-" + b.dataset.ly).forEach((g) => (g.style.display = on ? "" : "none")); render(); });
      new ResizeObserver(() => render()).observe(root);
      home();
    }
  }
  return { init };
})();
