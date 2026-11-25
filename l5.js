/* L5 · Business case indicatif — site Saint-André-de-Cubzac (L4), partage L3.
   Modèle annuel, 100 % fonds propres, k€. Tout est hypothèse illustrative sauf mention. */
(function(g){
'use strict';
const N=20,DEP=15,RDEP=10,RYEAR=10,IS=0.25,SURF=5000,KW=350;
/* Cas de base = scénario central ; il fige aussi la courbe de revenu net servant aux paliers de partage (L3). */
const BASE={landPrice:110,grid:1.5,n:8,capexBorne:200,s1:4,kwh:300,price:0.45,cost:0.24,growth:0.08,cap:7,
  opexCpo:25,taxeFonc:10,assur:0.004,frais:0.08,subv:0,renew:0.5,infl:0.02,wacc:0.08};
const DEG=Object.assign({},BASE,{s1:2.8,growth:0.04,capexBorne:230,grid:1.95});
const DEG_TXT='recharges −30 %, croissance 4 %, CAPEX par borne +15 %, raccordement +30 %';

function netCurve(p){const o=[];for(let t=1;t<=N;t++){const s=Math.min(p.cap,p.s1*Math.pow(1+p.growth,t-1));
  o.push(p.n*s*p.kwh*365*Math.max(0,p.price-p.cost)/1000);}return o;}
const BC=netCurve(BASE);
/* Paliers L3 par tranches : 50 % jusqu'à 150 % du cas de base, puis 45 / 40 / 35 % */
function atomsShare(x,b){if(b<=0)return .5*x;const r=x/b,seg=(a,c)=>Math.max(0,Math.min(r,c)-a);
  return b*(.5*seg(0,1.5)+.45*seg(1.5,2)+.40*seg(2,2.5)+.35*Math.max(0,r-2.5));}
function npv(r,cf){let s=0;for(let t=0;t<cf.length;t++)s+=cf[t]/Math.pow(1+r,t);return s;}
function irr(cf){let lo=-.5,hi=1,flo=npv(lo,cf);if(flo*npv(hi,cf)>0)return null;
  for(let i=0;i<80;i++){const m=(lo+hi)/2,fm=npv(m,cf);if(flo*fm<=0)hi=m;else{lo=m;flo=fm;}}return(lo+hi)/2;}
function run(p){
  const land=SURF*p.landPrice/1000,grid=p.grid*1000,bornes=p.n*p.capexBorne*(1-p.subv),
    sub=land+grid+bornes,frais=sub*p.frais,total=sub+frais,
    dep0=(total-land)/DEP,rc=p.renew*p.n*p.capexBorne,net=netCurve(p);
  let loss=0;const cf=[-total],cum=[-total],o={net,dep:[],ti:[],ebitda:[],opexA:[],cpoShare:[],cpoOpex:[],cpoM:[],tax:[],aShare:[]};
  for(let t=1;t<=N;t++){
    const i=Math.pow(1+p.infl,t-1),x=net[t-1],a=atomsShare(x,BC[t-1]),c=x-a,
      oa=(p.taxeFonc+p.assur*total)*i,oc=p.n*p.opexCpo*i,e=a-oa;
    const d=(t<=DEP?dep0:0)+(t>RYEAR?rc/RDEP:0),ti=e-d;let tax=0;
    if(ti<0)loss+=-ti;else{const u=Math.min(loss,ti);loss-=u;tax=IS*(ti-u);}
    const f=e-tax-(t===RYEAR?rc:0);
    cf.push(f);cum.push(cum[t-1]+f);
    o.dep.push(d);o.ti.push(ti);o.ebitda.push(e);o.opexA.push(oa);o.cpoShare.push(c);o.cpoOpex.push(oc);o.cpoM.push(c-oc);o.tax.push(tax);o.aShare.push(a);
  }
  let pb=null;for(let t=1;t<=N;t++){if(cum[t]>=0){pb=(t-1)+(-cum[t-1])/(cf[t]||1);break;}}
  return Object.assign(o,{land,grid,bornes,frais,total,cf,cum,irr:irr(cf),npv:npv(p.wacc,cf),yoc:o.ebitda[0]/total,pb,rc});
}

/* ---------- format ---------- */
const nf=(v,d=0)=>v.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=(x,d=1)=>x==null?'n.s.':nf(x*100,d)+' %';
const sg=v=>(v>=0?'+':'−')+nf(Math.abs(v),v%1?1:0);

/* ---------- contrôles ---------- */
const CTL=[
 {g:'Site et CAPEX',it:[
  {k:'landPrice',l:'Prix du terrain (5 000 m²)',min:30,max:150,step:5,f:v=>nf(v)+' €/m²',note:'Annonce : 110 €/m² · cible L4 ≈ 45'},
  {k:'grid',l:'Raccordement réseau (poste HTA inclus)',min:.5,max:4,step:.1,f:v=>nf(v,1)+' M€',note:'Hypothèse : ≈ 3 MW, à confirmer par pré-étude Enedis'},
  {k:'n',l:'Nombre de bornes',min:4,max:16,step:1,f:v=>nf(v),note:()=>S.n>8?'Au-delà de 8 : phase 2, lot voisin et renfort réseau à prévoir':'8 postes sur le plan L4'},
  {k:'capexBorne',l:'CAPEX par borne (installé)',min:150,max:400,step:10,f:v=>nf(v)+' k€'}]},
 {g:'Recharge et revenus',it:[
  {k:'s1',l:'Recharges par borne et par jour (an 1)',min:1,max:8,step:.1,f:v=>nf(v,1),note:()=>'Taux d’utilisation ≈ '+nf(S.s1*S.kwh/(KW*24)*100,0)+' % (borne 350 kW)'},
  {k:'price',l:'Prix de vente',min:.35,max:.65,step:.01,f:v=>nf(v,2)+' €/kWh'},
  {k:'cost',l:'Coût de l’électricité',min:.12,max:.34,step:.01,f:v=>nf(v,2)+' €/kWh',note:()=>'Marge brute '+nf(Math.max(0,S.price-S.cost),2)+' €/kWh (L1 : 0,20–0,22)'},
  {k:'growth',l:'Croissance annuelle du revenu',min:0,max:.12,step:.01,f:v=>nf(v*100,0)+' %',note:()=>'Portée par le volume, plafonnée à '+nf(S.cap,0)+' recharges/jour'}]},
 {g:'Exploitation (Atoms)',it:[
  {k:'taxeFonc',l:'Taxe foncière (Atoms)',min:0,max:40,step:1,f:v=>nf(v)+' k€/an'},
  {k:'assur',l:'Assurance (Atoms)',min:0,max:.01,step:.001,f:v=>nf(v*100,1)+' % du CAPEX'}]},
 {g:'Hypothèses avancées',adv:1,it:[
  {k:'kwh',l:'Énergie par recharge',min:200,max:450,step:10,f:v=>nf(v)+' kWh'},
  {k:'cap',l:'Plafond de saturation',min:4,max:10,step:.5,f:v=>nf(v,1)+' recharges/jour'},
  {k:'frais',l:'Frais de développement et imprévus',min:0,max:.15,step:.01,f:v=>nf(v*100,0)+' % du CAPEX'},
  {k:'subv',l:'Subvention sur les bornes',min:0,max:.5,step:.05,f:v=>nf(v*100,0)+' %',note:'France : Advenir jusqu’à 50 % par point PL (L1), plafond à confirmer'},
  {k:'renew',l:'Renouvellement des bornes, an 10',min:0,max:1,step:.1,f:v=>nf(v*100,0)+' % du CAPEX bornes'},
  {k:'infl',l:'Inflation des OPEX',min:0,max:.04,step:.005,f:v=>nf(v*100,1)+' %/an'},
  {k:'wacc',l:'WACC (L0)',min:.05,max:.12,step:.005,f:v=>nf(v*100,1)+' %'}]}
];
let S=Object.assign({},BASE),root;
const same=(a,b)=>Object.keys(b).every(k=>Math.abs(a[k]-b[k])<1e-9);

function ctlHTML(){
  const row=c=>`<div class="l5r"><label for="l5-${c.k}">${c.l}</label><output id="l5o-${c.k}"></output>
   <input type="range" id="l5-${c.k}" data-k="${c.k}" min="${c.min}" max="${c.max}" step="${c.step}"><small id="l5n-${c.k}"></small></div>`;
  return `<div class="l5sw" role="group" aria-label="Scénario"><button type="button" data-m="deg">Dégradé</button><button type="button" data-m="base">Base</button><span class="mono" id="l5mode"></span></div>`+
   CTL.map(gp=>gp.adv?`<details class="l5adv"><summary>${gp.g}</summary>${gp.it.map(row).join('')}</details>`
     :`<div class="l5g"><h3>${gp.g}</h3>${gp.it.map(row).join('')}</div>`).join('');
}
function sync(){
  CTL.forEach(gp=>gp.it.forEach(c=>{
    const i=root.querySelector('#l5-'+c.k),o=root.querySelector('#l5o-'+c.k),n=root.querySelector('#l5n-'+c.k);
    if(+i.value!==S[c.k])i.value=S[c.k];o.textContent=c.f(S[c.k]);
    const t=typeof c.note==='function'?c.note():c.note;n.textContent=t||'';n.style.display=t?'':'none';
  }));
}

/* ---------- graphiques ---------- */
const niceMax=v=>{const m=Math.pow(10,Math.floor(Math.log10(v||1))),r=v/m;return(r<=1?1:r<=2?2:r<=2.5?2.5:r<=5?5:10)*m;};
function chartA(r){
  const W=560,H=196,L=44,R=8,T=10,B=22,iw=W-L-R,ih=H-T-B,max=niceMax(Math.max.apply(null,r.net)),bw=iw/N;let s='';
  for(let i=0;i<=4;i++){const y=T+ih-ih*i/4;s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.09)"/><text x="${L-6}" y="${y+4}" text-anchor="end" font-size="11" fill="#9d9582">${nf(max*i/4)}</text>`;}
  r.net.forEach((x,i)=>{let y=T+ih;const x0=L+i*bw+bw*.14,w=bw*.72;
    [[Math.max(0,r.ebitda[i]),'#C8AD86'],[r.opexA[i],'#6f5a3c'],[Math.max(0,r.cpoShare[i]),'rgba(255,247,221,.28)']].forEach(a=>{
      const h=ih*a[0]/max;y-=h;s+=`<rect x="${x0.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${a[1]}"/>`;});
  });
  [1,5,10,15,20].forEach(t=>{s+=`<text x="${(L+(t-.5)*bw).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="11" fill="#9d9582">${t}</text>`;});
  s+=`<text x="${L+(RYEAR-.5)*bw}" y="${T+8}" text-anchor="middle" font-size="10" fill="#E9A23B">▼ renouvellement</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenu net annuel réparti entre Atoms, ses OPEX et le CPO, sur 20 ans">${s}</svg>`;
}
function chartB(r,rd){
  const W=560,H=196,L=44,R=40,T=12,B=22,iw=W-L-R,ih=H-T-B;
  const all=r.cum.concat(rd?rd.cum:[]).map(v=>v/1000),mn=Math.min(0,Math.min.apply(null,all)),mx=Math.max(0,Math.max.apply(null,all)),
    pad=(mx-mn)*.06||1,lo=mn-pad,hi=mx+pad;
  const X=t=>L+iw*t/N,Y=v=>T+ih*(1-(v/1000-lo)/(hi-lo));
  const path=a=>a.map((v,t)=>(t?'L':'M')+X(t).toFixed(1)+' '+Y(v).toFixed(1)).join('');
  let s='';
  const step=niceMax((hi-lo)/3);
  for(let v=Math.ceil(lo/step)*step;v<=hi;v+=step){const y=Y(v*1000);s+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="${Math.abs(v)<1e-9?'rgba(255,247,221,.5)':'rgba(255,255,255,.09)'}"/><text x="${L-6}" y="${y+4}" text-anchor="end" font-size="11" fill="#9d9582">${nf(v,step<1?1:0)}</text>`;}
  [0,5,10,15,20].forEach(t=>{s+=`<text x="${X(t)}" y="${H-6}" text-anchor="middle" font-size="11" fill="#9d9582">${t}</text>`;});
  if(rd)s+=`<path d="${path(rd.cum)}" fill="none" stroke="#E9A23B" stroke-width="1.6" stroke-dasharray="5 4"/><text x="${W-R+4}" y="${Y(rd.cum[N])+4}" font-size="11" fill="#E9A23B">Dégradé</text>`;
  s+=`<path d="${path(r.cum)}" fill="none" stroke="#C8AD86" stroke-width="2.4"/><text x="${W-R+4}" y="${Y(r.cum[N])+4}" font-size="11" fill="#FFF7DD">${nf(r.cum[N]/1000,1)}</text>`;
  s+=`<circle cx="${X(0)}" cy="${Y(r.cum[0])}" r="3.5" fill="#C8AD86"/>`;
  if(r.pb!=null){const cx=X(r.pb);s+=`<circle cx="${cx}" cy="${Y(0)}" r="5" fill="#000" stroke="#FFF7DD" stroke-width="2"/><text x="${cx}" y="${Y(0)-9}" text-anchor="middle" font-size="11" fill="#FFF7DD">payback ${nf(r.pb,1)} ans</text>`;}
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Flux de trésorerie cumulé d'Atoms sur 20 ans, en M€">${s}</svg>`;
}
const TOR=[['s1',1,'Recharges / borne / jour','±1',.5],['price',.05,'Prix de vente','±0,05 €/kWh'],['cost',.03,'Coût de l’électricité','±0,03 €/kWh'],
  ['capexBorne',50,'CAPEX par borne','±50 k€'],['grid',.5,'Raccordement','±0,5 M€'],['landPrice',40,'Prix du terrain','±40 €/m²'],['growth',.03,'Croissance du revenu','±3 pts']];
function tornado(base){
  const val=r=>r.irr==null?-.1:Math.max(-.1,r.irr);
  const rows=TOR.map(t=>{const a=Object.assign({},S),b=Object.assign({},S);
    a[t[0]]=Math.max(t[0]==='s1'?.5:0,S[t[0]]-t[1]);b[t[0]]=S[t[0]]+t[1];
    const x=val(run(a)),y=val(run(b));return{l:t[2],r:t[3],lo:Math.min(x,y),hi:Math.max(x,y)};})
    .sort((p,q)=>(q.hi-q.lo)-(p.hi-p.lo));
  const b0=val(base),mn=Math.min(b0,Math.min.apply(null,rows.map(r=>r.lo))),mx=Math.max(b0,Math.max.apply(null,rows.map(r=>r.hi))),sp=(mx-mn)||1,P=v=>((v-mn)/sp*100).toFixed(1);
  return rows.map(r=>`<div class="tr"><span class="tl">${r.l} <i>${r.r}</i></span><div class="tb">
    <i class="ng" style="left:${P(r.lo)}%;width:${(P(b0)-P(r.lo)).toFixed(1)}%"></i><i class="ps" style="left:${P(b0)}%;width:${(P(r.hi)-P(b0)).toFixed(1)}%"></i>
    <u style="left:${P(b0)}%"></u></div><span class="tv">${nf(r.lo*100,1)} – ${nf(r.hi*100,1)} %</span></div>`).join('');
}
function topKeys(){
  const val=r=>r.irr==null?-.1:Math.max(-.1,r.irr);
  return TOR.map(t=>{const a=Object.assign({},BASE),b=Object.assign({},BASE);
    a[t[0]]=Math.max(t[0]==='s1'?.5:0,BASE[t[0]]-t[1]);b[t[0]]=BASE[t[0]]+t[1];
    return[t[0],Math.abs(val(run(b))-val(run(a)))];}).sort((p,q)=>q[1]-p[1]).slice(0,4).map(p=>p[0]);
}
const CAPC=[['Terrain','land','#9a9a94'],['Raccordement','grid','#74746f'],['Bornes','bornes','#b9b9b2'],['Frais et imprévus','frais','#52524f']];
const NEG={opex:'#85857f',tax:'#5f5f5b',ren:'#a9a9a2'},POS='#E3C38F';
let SEL={t:1,c:'rev'};
function chartFlows(r){
  const W=640,H=232,L=54,R=48,T=12,B=24,iw=W-L-R,ih=H-T-B,n=N+1,bw=iw/n;
  const maxP=niceMax(Math.max.apply(null,r.aShare)),minN=-niceMax(r.total),Y=v=>T+ih*(maxP-v)/(maxP-minN);
  const cmax=Math.max(1,Math.max.apply(null,r.cum)),cmin=Math.min.apply(null,r.cum),Y0=Y(0),sc=Math.min((Y0-T)/cmax,(T+ih-Y0)/Math.max(1,-cmin)),YC=v=>Y0-v*sc,cx=t=>L+(t+.5)*bw;
  const step=niceMax((maxP-minN)/4);let s='';
  for(let v=Math.ceil(minN/step)*step;v<=maxP+1e-9;v+=step){const y=Y(v);
    s+=`<line x1="${L}" x2="${W-R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${Math.abs(v)<1e-9?'rgba(255,247,221,.55)':'rgba(255,255,255,.08)'}"/><text x="${L-6}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="11" fill="#9d9582">${nf(v)}</text>`;}
  for(let t=0;t<=N;t++){const on=SEL.t===t&&SEL.c==='year';s+=`<rect class="l5col" data-t="${t}" data-c="year" x="${(L+t*bw).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${ih}" fill="${on?'rgba(255,247,221,.1)':'transparent'}"/>`;}
  if(SEL.t>=0&&SEL.c!=='year')s+=`<rect x="${(L+SEL.t*bw).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${ih}" fill="rgba(255,247,221,.06)" pointer-events="none"/>`;
  const bar=(i,v0,v1,c,k)=>{const x=L+i*bw+bw*.14,w=bw*.72,y0=Y(v0),y1=Y(v1),on=SEL.t===i&&SEL.c===k;
    return `<rect class="l5seg" data-t="${i}" data-c="${k}" x="${x.toFixed(1)}" y="${Math.min(y0,y1).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(.8,Math.abs(y1-y0)).toFixed(1)}" fill="${c}"${on?' stroke="#FFF7DD" stroke-width="1.6"':''}/>`;};
  let cum=0;CAPC.forEach(c=>{s+=bar(0,-cum,-(cum+r[c[1]]),c[2],c[1]);cum+=r[c[1]];});
  for(let t=1;t<=N;t++){
    s+=bar(t,0,r.aShare[t-1],POS,'rev');
    let c=0;[[r.opexA[t-1],NEG.opex,'opex'],[r.tax[t-1],NEG.tax,'tax'],[t===RYEAR?r.rc:0,NEG.ren,'ren']].forEach(a=>{if(a[0]>0){s+=bar(t,-c,-(c+a[0]),a[1],a[2]);c+=a[0];}});
  }
  for(let t=0;t<=N;t++){s+=`<text x="${cx(t).toFixed(1)}" y="${H-7}" text-anchor="middle" font-size="${t%5===0?11:9.5}" fill="${t%5===0?'#c9c2ae':'#8a846f'}" pointer-events="none">${t}</text>`;}
  const cs=Math.max(.5,Math.ceil(Math.max(cmax,-cmin)/1000/3*2)/2);
  for(let v=Math.ceil(cmin/1000/cs)*cs;v<=cmax/1000+1e-9;v+=cs){s+=`<text x="${W-R+6}" y="${(YC(v*1000)+4).toFixed(1)}" font-size="10.5" fill="#E9A23B" pointer-events="none">${nf(v,cs%1?1:0)}</text>`;}
  s+=`<text x="${W-2}" y="${T-2}" text-anchor="end" font-size="9.5" fill="#E9A23B" pointer-events="none">cumul M€</text>`;
  s+=`<path d="${r.cum.map((v,t)=>(t?'L':'M')+cx(t).toFixed(1)+' '+YC(v).toFixed(1)).join('')}" fill="none" stroke="#E9A23B" stroke-width="2.2" stroke-linejoin="round" pointer-events="none"/>`;
  r.cum.forEach((v,t)=>{const on=SEL.t===t;s+=`<circle class="l5col" data-t="${t}" data-c="year" cx="${cx(t).toFixed(1)}" cy="${YC(v).toFixed(1)}" r="${on?5:3.2}" fill="${on?'#FFF7DD':'#E9A23B'}" stroke="#0a0a09" stroke-width="1"/>`;});
  if(r.pb!=null){const px=L+(r.pb+.5)*bw;s+=`<circle cx="${px.toFixed(1)}" cy="${Y0.toFixed(1)}" r="4.5" fill="#0a0a09" stroke="#FFF7DD" stroke-width="1.8" pointer-events="none"/><text x="${px.toFixed(1)}" y="${(Y0+22).toFixed(1)}" text-anchor="middle" font-size="11" fill="#FFF7DD" stroke="#0a0a09" stroke-width="4" paint-order="stroke" pointer-events="none">payback ${nf(r.pb,1)} ans</text>`;}
  s+=`<text x="${(L+bw*1.4).toFixed(1)}" y="${Y(-r.total*.55).toFixed(1)}" font-size="12" fill="#FFF7DD" pointer-events="none">◀ Investissement initial : ${nf(r.total/1000,1)} M€</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Flux annuels d'Atoms sur 20 ans : investissement initial en année 0, puis revenus en positif et coûts en négatif, en k€. Cliquer sur une barre pour voir le calcul.">${s}</svg>`;
}
function detail(r){
  const t=SEL.t,c=SEL.c,k=v=>nf(v)+' k€',L=[];let h='';
  const head=(a,b)=>`<b>${a}</b><span>${b}</span>`;
  if(t===0){
    const sub=r.land+r.grid+r.bornes;
    if(c==='land'){h=head('Terrain · année 0',k(r.land));L.push(`${nf(SURF)} m² × ${nf(S.landPrice)} €/m² = ${k(r.land)}`,'Annonce : 110 €/m² ; cible L4 : ≈ 45 €/m². Le terrain n’est pas amorti.');}
    else if(c==='grid'){h=head('Raccordement réseau · année 0',k(r.grid));L.push(`Hypothèse de ${nf(S.grid,1)} M€ pour ≈ 3 MW en HTA, poste de livraison inclus.`,'À confirmer par une pré-étude Enedis ; c’est le poste le plus incertain.');}
    else if(c==='bornes'){h=head('Bornes · année 0',k(r.bornes));L.push(`${S.n} bornes × ${nf(S.capexBorne)} k€ × (1 − subvention ${nf(S.subv*100)} %) = ${k(r.bornes)}`,'Installation comprise (génie civil, puissance, pose).');}
    else if(c==='frais'){h=head('Frais et imprévus · année 0',k(r.frais));L.push(`${nf(S.frais*100)} % × (terrain + raccordement + bornes = ${k(sub)}) = ${k(r.frais)}`,'Études, permis, maîtrise d’ouvrage et marge d’imprévus.');}
    else{h=head('Année 0 · investissement',k(r.total));L.push(`Terrain ${k(r.land)} + raccordement ${k(r.grid)} + bornes ${k(r.bornes)} + frais ${k(r.frais)}.`,'Financé à 100 % en fonds propres ; amorti sur 15 ans hors terrain.');}
    if(c!=='year')L.push(`Part de l’investissement total (${k(r.total)}) : ${nf((c==='land'?r.land:c==='grid'?r.grid:c==='bornes'?r.bornes:r.frais)/r.total*100)} %.`);
  }else{
    const i=t-1,x=r.net[i],a=r.aShare[i],sess=Math.min(S.cap,S.s1*Math.pow(1+S.growth,i)),idx=Math.pow(1+S.infl,i);
    if(c==='rev'){h=head(`Revenu d’Atoms · année ${t}`,'+'+k(a));
      L.push(`Revenu net = ${S.n} bornes × ${nf(sess,1)} recharges/jour × 365 × ${nf(S.kwh)} kWh × (${nf(S.price,2)} − ${nf(S.cost,2)}) €/kWh = ${k(x)}`,
        `Recharges/jour : ${nf(S.s1,1)} en an 1, +${nf(S.growth*100)} %/an, plafonné à ${nf(S.cap,1)}.`,
        `Part d’Atoms (L3) : ${k(a)}, soit ${nf(a/x*100)} % du revenu net (50 % jusqu’à 150 % du cas de base, puis 45, 40 et 35 % par tranches).`);}
    else if(c==='opex'){h=head(`OPEX d’Atoms · année ${t}`,'−'+k(r.opexA[i]));
      L.push(`(taxe foncière ${nf(S.taxeFonc)} k€ + assurance ${nf(S.assur*100,1)} % × ${k(r.total)}) × indexation ${nf(idx,3)} = ${k(r.opexA[i])}`,`Indexation : ${nf(S.infl*100,1)} %/an. L’exploitation des bornes ne pèse pas sur Atoms.`);}
    else if(c==='tax'){h=head(`Impôt · année ${t}`,'−'+k(r.tax[i]));
      L.push(`EBITDA ${k(r.ebitda[i])} − amortissement ${k(r.dep[i])} = résultat imposable ${k(r.ti[i])}`,r.tax[i]>0?`IS 25 % sur ce résultat, après imputation des déficits reportés = ${k(r.tax[i])}`:'Résultat négatif ou absorbé par les déficits reportés : pas d’impôt cette année.');}
    else if(c==='ren'){h=head(`Renouvellement des bornes · année ${t}`,'−'+k(r.rc));
      L.push(`${nf(S.renew*100)} % × ${S.n} bornes × ${nf(S.capexBorne)} k€ = ${k(r.rc)}`,'Dépense de l’année 10, amortie sur 10 ans à partir de l’année 11.');}
    else{const f=r.cf[t];h=head(`Année ${t} · flux net`,(f>=0?'+':'−')+k(Math.abs(f)));
      L.push(`Revenu ${k(a)} − OPEX ${k(r.opexA[i])} − impôt ${k(r.tax[i])}${t===RYEAR?` − renouvellement ${k(r.rc)}`:''} = ${(f>=0?'+':'−')+k(Math.abs(f))}`,`Trésorerie cumulée : ${(r.cum[t]>=0?'+':'−')+k(Math.abs(r.cum[t]))}.`);}
  }
  return `<div class="l5dh">${h}</div>`+L.map(l=>`<p>${l}</p>`).join('');
}
function capexBar(r){
  const parts=[['Terrain',r.land,'#C8AD86'],['Raccordement',r.grid,'#8f7a5a'],['Bornes',r.bornes,'#E3C38F'],['Frais et imprévus',r.frais,'#4d4334']];
  return `<div class="cbar">${parts.map(p=>`<i style="width:${(p[1]/r.total*100).toFixed(1)}%;background:${p[2]}" title="${p[0]}"></i>`).join('')}</div>
   <div class="cleg">${parts.map(p=>`<span><i style="background:${p[2]}"></i>${p[0]} <b>${nf(p[1])}</b></span>`).join('')}</div>`;
}

/* ---------- rendu ---------- */
function update(){
  const r=run(S),rb=run(BASE),rd=run(DEG),mode=same(S,BASE)?'base':same(S,DEG)?'deg':'libre';
  root.querySelectorAll('.l5sw button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===mode)));
  root.querySelector('#l5mode').textContent=mode==='libre'?'Libre':'';
  sync();
  const d=r.irr==null?null:r.irr-S.wacc,cls=r.irr==null?'r':d>=.02?'g':d>=-.005?'o':'r';
  const head=document.getElementById('l5h'),sub=document.getElementById('l5sub');
  const verdict=r.irr==null?'le capital n’est pas remboursé en 20 ans':d>=.02?nf(d*100,1)+' pts au-dessus du WACC':d>=-.005?'au niveau du WACC, sans marge de sécurité':'sous le WACC de '+pct(S.wacc);
  if(head)head.textContent=`TRI de ${pct(r.irr)} pour ${nf(r.total/1000,1)} M€ investis : ${verdict}`;
  if(sub)sub.textContent=`Dégradé (${DEG_TXT}) : TRI ${pct(rd.irr)}, payback ${rd.pb==null?'> 20':nf(rd.pb,0)} ans. Revenu net partagé selon L3 ; 100 % fonds propres ; valeur résiduelle du terrain ignorée.`;
  root.querySelector('#l5k').innerHTML=
   `<div class="kp big ${cls}"><div class="t">TRI après impôt · 20 ans</div><div class="v">${pct(r.irr)}</div><div class="s">WACC ${pct(S.wacc)}${d==null?'':' · '+(d>=0?'+':'−')+nf(Math.abs(d)*100,1)+' pt'}</div></div>`+
   `<div class="kp"><div class="t">Rendement sur coût</div><div class="v">${pct(r.yoc)}</div><div class="s">EBITDA an 1 / CAPEX</div></div>`+
   `<div class="kp"><div class="t">Payback</div><div class="v">${r.pb==null?'> 20 ans':nf(r.pb,1)+' ans'}</div><div class="s">cumul de trésorerie ≥ 0</div></div>`+
   `<div class="kp ${r.npv>=0?'g':'o'}"><div class="t">VAN au WACC</div><div class="v">${r.npv>=0?'+':'−'}${nf(Math.abs(r.npv)/1000,2)} M€</div><div class="s">flux 0–20 ans</div></div>`;
  root.querySelector('#l5f').innerHTML=chartFlows(r);root.querySelector('#l5d').innerHTML=detail(r);window.__l5r=r;
}

const CSS=`.l5seg,.l5col{cursor:pointer}.l5seg:hover{filter:brightness(1.25)}.l5leg em{margin-left:auto;font-style:normal;color:var(--gold)}.l5d{margin:0 9px 9px;padding:8px 11px;border:1px solid var(--line);border-left:3px solid #E3C38F;border-radius:4px;background:rgba(0,0,0,.25);font-size:12.5px;line-height:1.4;color:var(--ink2);min-height:98px}.l5dh{display:flex;justify-content:space-between;gap:10px;color:var(--cream);font-size:13.5px;margin-bottom:3px}.l5dh span{font-family:"Fragment Mono",monospace;color:#E3C38F}.l5d p{margin:2px 0}.l5r.hl{border-left:3px solid #E3C38F;padding-left:7px;margin-left:-10px;background:rgba(227,195,143,.07)}.l5r.hl label{color:#E3C38F}.l5r.hl output{color:#E3C38F;font-weight:600}.l5lg{margin:0;font-size:11.5px;color:var(--ink2);display:flex;align-items:center;gap:7px}.l5lg i{width:3px;height:14px;background:#E3C38F;display:inline-block}.l5fl{flex:1}.l5{display:grid;grid-template-columns:minmax(240px,290px) minmax(0,1fr);gap:14px;flex:1;min-height:0}
.l5c{border:1px solid var(--line);border-radius:4px;background:var(--card);padding:10px 12px;overflow:auto;scrollbar-width:thin;display:flex;flex-direction:column;gap:10px;min-height:0}
.l5sw{display:flex;align-items:center;gap:0}.l5sw button{font:inherit;font-size:13px;color:var(--ink2);background:#000;border:1px solid var(--line);padding:5px 12px;cursor:pointer}
.l5sw button:first-child{border-radius:4px 0 0 4px}.l5sw button:nth-child(2){border-radius:0 4px 4px 0;border-left:0}
.l5sw button[aria-pressed=true]{color:#000;background:var(--gold);border-color:var(--gold)}.l5sw button:focus-visible{outline:2px solid var(--cream);outline-offset:2px}.l5sw .mono{margin-left:10px}
.l5g h3,.l5adv summary{margin:0 0 6px;font:400 11.5px "Fragment Mono",monospace;color:var(--gold);text-transform:uppercase;letter-spacing:.03em}
.l5adv summary{cursor:pointer;margin-bottom:8px}
.l5r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 8px;font-size:12.5px;margin-bottom:8px}
.l5r label{color:var(--ink2)}.l5r output{color:var(--cream);font-family:"Fragment Mono",monospace;font-size:12px;white-space:nowrap}
.l5r input{grid-column:1/-1;width:100%;margin:3px 0 0;accent-color:#C8AD86}.l5r small{grid-column:1/-1;color:var(--ink2);font-size:11px;opacity:.85;line-height:1.3}
.l5o{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto;scrollbar-width:thin}
.l5k{display:grid;grid-template-columns:1.2fr repeat(3,minmax(0,1fr));gap:8px}
.kp{border:1px solid var(--line);border-radius:4px;background:var(--card);padding:7px 10px;min-width:0}
.kp .t{font:400 10.5px "Fragment Mono",monospace;color:var(--ink2);text-transform:uppercase;letter-spacing:.02em}
.kp .v{font-size:clamp(19px,3vh,27px);color:var(--cream);line-height:1.15;white-space:nowrap}.kp .s{font-size:11.5px;color:var(--ink2)}
.kp.big{border-color:rgba(200,173,134,.5)}.kp.g .v{color:#7CC58A}.kp.o .v{color:#E9A23B}.kp.r .v{color:#E26D5A}
.l5ch,.l5bt{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}
.l5o .pan svg{width:100%;height:auto;display:block}.l5o .pan .cap{align-items:center}
.l5leg{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--ink2);padding:2px 9px 7px}.l5leg i{display:inline-block;width:9px;height:9px;margin-right:5px}
.tor{padding:6px 9px 8px;display:grid;gap:5px}.tr{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1.4fr) 82px;gap:8px;align-items:center;font-size:12px;color:var(--ink2)}
.tl i{font-style:normal;color:var(--gold);font-size:11px;margin-left:3px}.tb{position:relative;height:13px;background:rgba(255,255,255,.05);border-radius:2px}
.tb i{position:absolute;top:0;height:100%}.tb .ng{background:#E9A23B}.tb .ps{background:#7CC58A}.tb u{position:absolute;top:-2px;height:17px;width:2px;background:var(--cream)}
.tv{font-family:"Fragment Mono",monospace;font-size:11px;text-align:right;color:var(--ink)}
.cbar{display:flex;height:16px;margin:8px 9px 6px;gap:2px}.cbar i{display:block;height:100%}
.cleg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11.5px;color:var(--ink2);padding:0 9px 6px}.cleg i{display:inline-block;width:9px;height:9px;margin-right:5px}.cleg b{color:var(--cream);font-weight:500}
.l5t{width:calc(100% - 18px);margin:2px 9px 8px;border-collapse:collapse;font-size:12px}.l5t th{font:400 10.5px "Fragment Mono",monospace;color:var(--ink2);text-align:left;text-transform:uppercase;padding:3px 0}
.l5t td{padding:3px 0;border-top:1px solid var(--line);color:var(--ink)}.l5t td:first-child{color:var(--cream)}
@media(max-width:900px){.l5,.l5ch,.l5bt{grid-template-columns:minmax(0,1fr)}.l5k{grid-template-columns:repeat(2,minmax(0,1fr))}.l5c{max-height:46vh}}`;

function init(el){
  root=el;
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  el.innerHTML=`<div class="l5c"><p class="l5lg"><i></i>Les 4 paramètres qui font le plus bouger le TRI</p>${ctlHTML()}</div>
  <div class="l5o"><div class="l5k" id="l5k"></div>
   <div class="pan l5fl"><div class="cap"><span>Flux annuels d’Atoms, k€</span><b>revenus en positif · coûts en négatif</b></div><div id="l5f"></div><div class="l5d" id="l5d" aria-live="polite"></div>
    <div class="l5leg"><span><i style="background:#E3C38F"></i>Revenu d’Atoms</span><span><i style="background:#E9A23B;height:3px;vertical-align:middle"></i>Trésorerie cumulée</span><span><i style="background:#9a9a94"></i>Terrain</span><span><i style="background:#74746f"></i>Raccordement</span><span><i style="background:#b9b9b2"></i>Bornes</span><span><i style="background:#52524f"></i>Frais</span><span><i style="background:#85857f"></i>OPEX</span><span><i style="background:#5f5f5b"></i>Impôt</span><span><i style="background:#a9a9a2"></i>Renouvellement</span><em>Cliquer sur une barre ou une année</em></div></div>
  </div>`;
  const top=topKeys();top.forEach(k=>{const i=el.querySelector('#l5-'+k);if(i)i.closest('.l5r').classList.add('hl');});
  el.addEventListener('click',e=>{const t=e.target.closest('.l5seg,.l5col');if(!t||!el.contains(t))return;SEL={t:+t.dataset.t,c:t.dataset.c};update();});
  el.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.k;if(!k)return;S[k]=+e.target.value;update();});
  el.addEventListener('click',e=>{const b=e.target.closest('.l5sw button');if(!b)return;S=Object.assign({},b.dataset.m==='deg'?DEG:BASE);update();});
  update();
}
g.L5={init,run,BASE,DEG,N,_setS:p=>{S=p;}};
if(typeof module!=='undefined')module.exports=g.L5;
})(typeof window!=='undefined'?window:globalThis);
