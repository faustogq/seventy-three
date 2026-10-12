/* ================= Book identity ================= */
const ICON_DEFAULT='<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13"/>';
const META = /*META*/{}/*END META*/;
const CAT_OF={};
[['law','GEN EXO LEV NUM DEU'],['history','JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH TOB JDT EST 1MA 2MA'],['poetry','JOB PSA PRO ECC SOL WIS SIR'],
 ['prophets','ISA JER LAM BAR EZE DAN HOS JOE AMO OBA JON MIC NAH HAB ZEP HAG ZEC MAL'],['gospels','MAT MAR LUK JOH ACT'],
 ['letters','ROM 1CO 2CO GAL EPH PHI COL 1TH 2TH 1TI 2TI TIT PHM HEB JAM 1PE 2PE 1JO 2JO 3JO JUD'],['apoc','REV']]
 .forEach(([k,s])=>s.split(' ').forEach(c=>CAT_OF[c]=k));
const CATS={law:'Pentateuch',history:'Historical books',poetry:'Wisdom books',prophets:'Prophets',gospels:'Gospels & Acts',letters:'Letters',apoc:'Revelation'};

/* ================= Data ================= */
let BIBLE=null, XR=null, XR_FAILED=false, BOOKS=[], BK={}, TOTAL=0, VB, VC, VV, VS=null, POP=[];
let SAINTS=[], WRITERS=[], ACC={}, AUTH={}, EMB={}, TYPES={}, QUOTES=[], QBY={}, QBYG={}, CAL=null, MART=null, FCOUNT=null, FAUTH=null, CREDITS=null;
const FCACHE={}, FLOAD={}, DATA={};
const DV='/*DV*/';                 // data version, set at build time so updated files are never read from an old cache
const T=g=>BIBLE.text[g];
function handleOf(name){return name.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join('')}
function indexBible(){
  BOOKS=BIBLE.books;TOTAL=BIBLE.text.length;
  VB=new Uint8Array(TOTAL);VC=new Uint16Array(TOTAL);VV=new Uint16Array(TOTAL);
  BOOKS.forEach((b,bi)=>{
    b.cat=CAT_OF[b.code];b.cum=[];let s=0;
    b.ch.forEach((n,ci)=>{b.cum.push(s);for(let v=1;v<=n;v++){const g=b.start+s+v-1;VB[g]=bi;VC[g]=ci+1;VV[g]=v}s+=n});
    b.n=s;b.handle=handleOf(b.name);BK[b.code]=b;
    const m=META[b.code]||{};b.icon=m.icon||ICON_DEFAULT;b.bio=m.bio||'';b.pinned=m.pinned||'';
  });
  buildAliases();
}
function indexSaints(d){
  TYPES=d.types||{};EMB=d.emblems||{};
  SAINTS=d.saints||[];
  SAINTS.forEach(s=>{s.kind=s.lv==='Blessed'?'blessed':'saint';ACC[s.id]=s});
  Object.values(BUILTIN).forEach(a=>{ACC[a.id]=Object.assign({},a)});
  (d.extra||[]).forEach(a=>{ACC[a.id]=a});
  AUTH=d.authors||{};
  WRITERS=(d.extra||[]).filter(a=>a.kind);
}
const PEOPLE=()=>SAINTS.concat(WRITERS,Object.keys(BUILTIN).map(k=>ACC[k]).filter(Boolean));
function indexQuotes(d){
  QUOTES=d.q||[];
  QUOTES.forEach(q=>{QBY[q.i]=q;if(q.g>=0)(QBYG[q.g]=QBYG[q.g]||[]).push(q)});
}
const bookOf=g=>BOOKS[VB[g]];
function idx(code,c,v){const b=BK[code];if(!b||c<1||c>b.ch.length||v<1||v>b.ch[c-1])return -1;return b.start+b.cum[c-1]+v-1}
function bname(b){return b.code==='PSA'?'Psalm':b.name}
function refLabel(g,span){
  const b=bookOf(g);let s=`${bname(b)} ${VC[g]}:${VV[g]}`;
  if(span){const e=Math.min(g+span,b.start+b.n-1);if(e>g)s+=VC[e]===VC[g]?`–${VV[e]}`:`–${VC[e]}:${VV[e]}`}
  return s;
}
function rangeLabel(a,e){return refLabel(a,e>a?e-a:0)}
function altNumber(g){
  const s=BIBLE.std[g];if(!s)return '';
  const b=bookOf(g);
  return b.code==='PSA'?`Psalm ${s} in Hebrew numbering`:`${b.name} ${s} in most modern Bibles`;
}
function xrefs(g){
  if(!XR)return null;const s=XR[g];if(!s)return [];
  return s.split(';').map(p=>{const a=p.split(',');return a.length===4?{t:+a[0],span:+a[1],votes:+a[2],src:a[3]}:a.length===3?{t:+a[0],span:+a[1],votes:+a[2]}:{t:+a[0],span:0,votes:+a[1]}});
}
function xcount(g){if(!XR)return null;const s=XR[g];return s?s.split(';').length:0}
function fcount(g){const b=bookOf(g),F=FCACHE[b.code];if(F&&F[g])return F[g].filter(it=>{const a=authorAcc(it[1]);return a&&a.k!=='exclude'}).length;if(!FCOUNT)return null;return (FCOUNT[b.code]&&FCOUNT[b.code][g])||0}
function buildScores(){
  VS=new Float32Array(TOTAL);
  for(let g=0;g<TOTAL;g++){const s=XR[g];if(!s)continue;const ps=s.split(';');let sum=0;for(let i=0;i<ps.length&&i<6;i++){const a=ps[i].split(',');sum+=+(a.length===4?a[2]:a[a.length-1])||0}VS[g]=sum}
  const ids=[];for(let g=0;g<TOTAL;g++)if(VS[g]>0&&T(g).length>=40)ids.push(g);
  ids.sort((a,b)=>VS[b]-VS[a]);POP=ids.slice(0,6000);
}
async function loadFathers(code){
  if(FCACHE[code])return FCACHE[code];
  if(!FLOAD[code])FLOAD[code]=fetch(`data/fathers/${code}.json?v=${DV}`).then(r=>{if(!r.ok)throw 0;return r.json()}).then(d=>FCACHE[code]=d.v).catch(()=>FCACHE[code]={});
  return FLOAD[code];
}

/* ---- reference parsing (search box) ---- */
const ALIAS={};
const EXTRA={GEN:'gen gn',EXO:'ex exod exo',LEV:'lev lv',NUM:'num nm nb',DEU:'deut dt deu',JOS:'josh jos josue',JDG:'judg jdg jgs',RUT:'ru rut rth',
 '1SA':'1sam 1sm 1sa','2SA':'2sam 2sm 2sa','1KI':'1kgs 1kg 1ki 3kings 3kgs','2KI':'2kgs 2kg 2ki 4kings 4kgs','1CH':'1chr 1chron 1ch 1paralipomenon 1par','2CH':'2chr 2chron 2ch 2paralipomenon 2par',
 EZR:'ezr 1esdras',NEH:'neh nehemias 2esdras',TOB:'tob tb tobias',JDT:'jdt jth',EST:'esth est','1MA':'1macc 1mc 1mac 1machabees 1maccabees','2MA':'2macc 2mc 2mac 2machabees 2maccabees',
 JOB:'jb',PSA:'ps psa psalm pss psalms',PRO:'prov prv pr',ECC:'eccl eccles qoheleth qoh qo',SOL:'song sos sg canticles canticle canticleofcanticles songofsolomon',
 WIS:'wis ws wisdomofsolomon',SIR:'sir ecclus ecclesiasticus',ISA:'isa is isaias',JER:'jer jeremias',LAM:'lam',BAR:'bar',EZE:'ezek ezk ezechiel eze',DAN:'dan dn',
 HOS:'hos osee',JOE:'jl joel',AMO:'am amos',OBA:'obad ob abdias',JON:'jon jonas',MIC:'mic mi micheas',NAH:'nah na',HAB:'hab habacuc',ZEP:'zeph zep sophonias',
 HAG:'hag hg aggeus',ZEC:'zech zec zacharias',MAL:'mal malachias',MAT:'mt matt mat',MAR:'mk mark mar mrk',LUK:'lk luke luk',JOH:'jn john joh jhn',ACT:'acts ac act',
 ROM:'rom rm','1CO':'1cor 1co','2CO':'2cor 2co',GAL:'gal',EPH:'eph',PHI:'phil php phi',COL:'col','1TH':'1thess 1thes 1th','2TH':'2thess 2thes 2th',
 '1TI':'1tim 1tm 1ti','2TI':'2tim 2tm 2ti',TIT:'tit',PHM:'phlm philem phm',HEB:'heb',JAM:'jas jam jm','1PE':'1pet 1pt 1pe','2PE':'2pet 2pt 2pe',
 '1JO':'1jn 1john 1jo','2JO':'2jn 2john 2jo','3JO':'3jn 3john 3jo',JUD:'jude jud',REV:'rev rv apoc apocalypse revelations'};
const normName=s=>s.toLowerCase().replace(/^(first|i)\s+/,'1').replace(/^(second|ii)\s+/,'2').replace(/^(third|iii)\s+/,'3').replace(/^(fourth|iv)\s+/,'4').replace(/[\s.]/g,'');
function buildAliases(){
  BOOKS.forEach(b=>{ALIAS[normName(b.dr)]=b.code});
  Object.entries(EXTRA).forEach(([c,s])=>s.split(' ').forEach(a=>ALIAS[a]=c));
  BOOKS.forEach(b=>{ALIAS[normName(b.name)]=b.code});
}
function resolveBook(s){return ALIAS[normName(s)]||null}
function parseRef(q){
  const m=q.trim().match(/^((?:[1-4]|i{1,3}|iv|first|second|third|fourth)?\s*[a-z][a-z .]*?)\s*(\d+)(?:\s*[:.\s]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/i);
  if(!m){const code=resolveBook(q);return code?{code}:null}
  const code=resolveBook(m[1]);if(!code)return null;
  const c=+m[2],v=m[3]?+m[3]:0;
  if(!v&&BK[code].ch.length===1&&c>1)return {code,c:1,v:c,g:idx(code,1,c)};
  if(v){const r={code,c,v,g:idx(code,c,v)};if(c<1||c>BK[code].ch.length)r.bad=true;return r}
  return c>=1&&c<=BK[code].ch.length?{code,c}:{code,c,bad:true};
}
/* ================= Helpers ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hash(str){let h=2166136261;for(const c of String(str)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0)/4294967295}
function rnd(){let t=(S.rng+=0x6D2B79F5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
const LOC='en-US';
const svg=inner=>`<svg viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
const CHECK='<svg class="check" viewBox="0 0 24 24" aria-label="Book of the Bible"><path fill="currentColor" d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z"/><path d="M8 12.2l2.6 2.6L16.2 9" fill="none" stroke="var(--surface)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const HALO=(label)=>`<svg class="check gold" viewBox="0 0 24 24" role="img" aria-label="${label}"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 12.2l2.6 2.6L16.2 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const I={
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  vote:'<path d="M12 4l7 8h-4v8H9v-8H5z"/>',
  back:'<path d="M15 5l-7 7 7 7"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  books:'<path d="M4 4h4v16H4zM9.5 4h4v16h-4z"/><path d="M15 5.2l3.6-.9 2.9 15-3.6.9z"/>',
  read:'<path d="M3 5.5C5.5 4.5 8.5 4.5 11 6v13c-2.5-1.5-5.5-1.5-8-.5zM21 5.5c-2.5-1-5.5-1-8 .5v13c2.5-1.5 5.5-1.5 8-.5z"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  pin:'<path d="M9 3h6l-1 6 4 4H6l4-4zM12 13v8" fill="none" stroke="currentColor" stroke-width="2"/>',
  scroll:'<path d="M7 4h11a2 2 0 0 1 2 2v1h-4M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7M7 4a2 2 0 0 1 2 2v12"/><path d="M11 9h4M11 12h4M11 15h3"/>',
  mark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  speak:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  halo:'<circle cx="12" cy="6" r="4"/><circle cx="12" cy="14" r="3"/><path d="M6 22c0-3.3 2.7-5 6-5s6 1.7 6 5"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  cloud:'<path d="M7 18a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.4 1.6A3.8 3.8 0 0 1 17 18z"/><path d="M12 11v5M9.8 13.8L12 16l2.2-2.2"/>'
};

/* ---- accounts ---- */
function saintAcc(id){return ACC[id]||null}
const BUILTIN={
  haydock:{id:'haydock',n:'Haydock Commentary',h:'HaydockCommentary',kind:'author',k:'commentary',t:'compilation',e:'book',y:'1859',sort:9000,bio:'Fr. George Leo Haydock\'s verse-by-verse Catholic commentary on the Douay-Rheims, drawing on the Fathers.'},
  challoner:{id:'challoner',n:'Challoner Notes',h:'ChallonerNotes',kind:'author',k:'commentary',t:'compilation',e:'quill',y:'1749–52',sort:9100,bio:'Bishop Richard Challoner\'s notes to his revision of the Douay-Rheims Bible.'}
};
const RAWACC={};
Object.values(BUILTIN).forEach(a=>{ACC[a.id]=a});
function authorAcc(key){
  if(key==='haydock'||key==='challoner')return ACC[key]||BUILTIN[key];
  const a=AUTH[key];if(a&&ACC[a.acc])return ACC[a.acc];
  if(a&&a.k==='exclude')return {k:'exclude'};
  if(!RAWACC[key]){const raw=key.replace(/^[ch]:/,'');const n=raw===raw.toUpperCase()?raw.toLowerCase().replace(/(^|[\s-])\w/g,m=>m.toUpperCase()):raw;
    RAWACC[key]={id:'raw:'+key,n,h:n.replace(/[^A-Za-z0-9]/g,''),kind:'author',k:'writer',t:'writer',e:'quill',y:'',sort:5000};ACC[RAWACC[key].id]=RAWACC[key];}
  return RAWACC[key];
}
function accAv(a,size,inert){
  if(!a)return `<div class="av ${size||''}"></div>`;
  const t=a.t||'writer',e=EMB[a.e]||ICON_DEFAULT;
  const ring=a.kind==='saint'||a.kind==='blessed'?'saint':'saint writer';
  if(inert)return `<span class="av ${ring} ${size||''}" style="--cat:var(--t-${t})" aria-hidden="true">${svg(e)}</span>`;
  return `<button class="av ${ring} ${size||''}" style="--cat:var(--t-${t})" data-acct="${esc(a.id)}" aria-label="${esc(a.n)} profile">${svg(e)}</button>`;
}
function accWho(a,extra){
  if(!a)return '';
  const badge=a.kind==='saint'?HALO('Saint'):a.kind==='blessed'?HALO('Blessed'):'';
  return `<b>${esc(a.n)}</b>${badge}<span class="h">@${esc(a.h)}</span>${extra||''}`;
}
function bookAv(code,size,inert){const b=BK[code];if(inert)return `<span class="av ${size||''}" style="--cat:var(--c-${b.cat})" aria-hidden="true">${svg(b.icon)}</span>`;return `<button class="av ${size||''}" style="--cat:var(--c-${b.cat})" data-book="${b.code}" aria-label="${esc(b.name)} profile">${svg(b.icon)}</button>`}
function bookWho(b,extra){return `<b>${esc(b.name)}</b>${CHECK}<span class="h">@${b.handle}</span>${extra||''}`}
function trunc(s,n){return s.length>n?s.slice(0,n-1).replace(/\s+\S*$/,'')+'…':s}
function spanText(g,span){
  if(!span)return esc(T(g));
  const b=bookOf(g),end=Math.min(g+span,b.start+b.n-1),show=Math.min(end,g+2);let out='';
  for(let i=g;i<=show;i++)out+=`<sup>${VV[i]}</sup>${esc(T(i))} `;
  if(end>show)out+='…';
  return out.trim();
}
function todayKey(d){d=d||new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const mmdd=k=>k.slice(5);
function prettyDate(k){const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString(LOC,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
const principal=day=>day&&day.c&&day.c.length?(day.c.find(x=>x.r!=='commemoration'&&x.r!=='optional memorial')||day.c.find(x=>x.r!=='commemoration')||day.c[0]):null;
function saintsOn(md){return SAINTS.filter(s=>s.f===md).sort((a,b)=>(b.grc?1:0)-(a.grc?1:0)||(a.lv==='Saint'?0:1)-(b.lv==='Saint'?0:1))}
const litColor=c=>({green:'var(--lit-green)',violet:'var(--lit-violet)',purple:'var(--lit-violet)',white:'var(--lit-white)',gold:'var(--lit-white)',red:'var(--lit-red)',rose:'var(--lit-rose)',pink:'var(--lit-rose)',black:'var(--lit-black)'})[String(c||'').toLowerCase()]||'var(--muted)';
