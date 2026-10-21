/* ================= Feeds ================= */
function likedBookCodes(){const s=new Set();Object.keys(M.mine).forEach(id=>{const m=/^v(\d+)$/.exec(id);if(m){const b=bookOf(+m[1]);if(b)s.add(b.code)}});Object.keys(M.me.following).forEach(k=>{if(k.startsWith('b:')&&BK[k.slice(2)])s.add(k.slice(2))});return [...s]}
function pickOne(seen){
  const liked=likedBookCodes();
  for(let tries=0;tries<40;tries++){
    const r=rnd();let g,why;
    if(liked.length&&r<0.22){const b=BK[liked[Math.floor(rnd()*liked.length)]];g=b.start+Math.floor(rnd()*b.n);why=M.me.following['b:'+b.code]?'You follow '+b.name:'Because you liked '+b.name}
    else if(r<0.68&&POP.length){g=POP[Math.floor(rnd()*POP.length)];why='Much-linked verse'}
    else{g=Math.floor(rnd()*TOTAL);why=bookOf(g).deut?'Deuterocanon':'Deep cut'}
    if(seen.has(g)||T(g).length<35)continue;
    return {g,why};
  }
  return null;
}
function pickMany(n){const seen=new Set(S.feed.map(f=>f.g)),out=[];for(let i=0;i<n;i++){const p=pickOne(seen);if(!p)break;seen.add(p.g);out.push(p)}return out}
function pickQuotes(n){
  if(!QUOTES.length)return [];
  const seen=new Set(S.qfeed.map(x=>x.i)),today=new Set(saintsOn(mmdd(todayKey())).map(s=>s.id)),out=[];
  for(let k=0;k<n*8&&out.length<n;k++){
    const r=rnd();let q,why='';
    if(r<0.2){const pool=QUOTES.filter(x=>today.has(x.s)&&!seen.has(x.i));if(pool.length){q=pool[Math.floor(rnd()*pool.length)];why='Feast today'}}
    if(!q&&r<0.4){const pool=QUOTES.filter(x=>M.me.following['s:'+x.s]&&!seen.has(x.i));if(pool.length){q=pool[Math.floor(rnd()*pool.length)];why='You follow '+(ACC[q.s]?ACC[q.s].n:'this saint')}}
    if(!q){q=QUOTES[Math.floor(rnd()*QUOTES.length)]}
    if(seen.has(q.i))continue;seen.add(q.i);out.push({i:q.i,why});
  }
  return out;
}
function loadNewOnTop(){
  const items=S.tab==='saints'?[]:pickMany(4),qs=S.tab==='verses'?[]:pickQuotes(3);
  S.newIds={};items.forEach(x=>S.newIds['v'+x.g]=true);qs.forEach(x=>S.newIds['q'+x.i]=true);
  S.feed=items.concat(S.feed).slice(0,400);S.qfeed=qs.concat(S.qfeed).slice(0,300);return items.length+qs.length}
function loadMoreBelow(){
  let n=0;
  if(S.tab!=='saints'&&S.feed.length<600){const v=pickMany(6);S.feed=S.feed.concat(v);n+=v.length}
  if(S.tab!=='verses'&&S.qfeed.length<400){const q=pickQuotes(4);S.qfeed=S.qfeed.concat(q);n+=q.length}
  return n}
const MIX={scripture:[.75,.25],balanced:[.55,.45],saints:[.35,.65]};
function forYou(){
  const [wv,wq]=MIX[S.mix]||MIX.balanced;
  const v=S.feed.map(x=>({kind:'v',x})),q=S.qfeed.filter(x=>QBY[x.i]).map(x=>({kind:'q',x})),out=[];
  let av=0,aq=0;
  while(v.length||q.length){
    av+=wv;aq+=wq;
    const pick=[['v',av,v],['q',aq,q]].filter(p=>p[2].length).sort((a,b)=>b[1]-a[1])[0];
    out.push(pick[2].shift());
    if(pick[0]==='v')av-=1;else aq-=1;
  }
  return out;
}
function followingFeed(){
  const f=Object.keys(M.me.following),out=[];
  const books=f.filter(k=>k.startsWith('b:')).map(k=>BK[k.slice(2)]).filter(Boolean);
  const saints=new Set(f.filter(k=>k.startsWith('s:')).map(k=>k.slice(2)));
  const day=todayKey();
  books.forEach(b=>{for(let i=0;i<3;i++){const g=b.start+Math.floor(hash(b.code+day+i)*b.n);if(T(g).length>=35)out.push({kind:'v',x:{g,why:'You follow '+b.name},h:hash('v'+g+day)})}});
  QUOTES.filter(q=>saints.has(q.s)).forEach(q=>out.push({kind:'q',x:{i:q.i,why:'You follow '+(ACC[q.s]||{}).n},h:hash('q'+q.i+day)}));
  if(FAUTH)f.filter(k=>k.startsWith('a:')||k.startsWith('s:')).forEach(k=>{const a=ACC[k.slice(2)];if(!a)return;
    const vs=[...new Set(acctKeys(a.id).flatMap(x=>FAUTH[x]||[]))];
    for(let i=0;i<Math.min(3,vs.length);i++){const g=vs[Math.floor(hash(a.id+day+i)*vs.length)];out.push({kind:'v',x:{g,why:'You follow '+a.n,ptabgo:'fathers',ffocus:a.id},h:hash('v'+g+day+a.id)})}});
  return out.sort((a,b)=>a.h-b.h).slice(0,60);
}

/* ================= Rendering ================= */
let V={name:'feed'};
const hist=[];
const expanded={};
function topBar(title,sub){
  return `<div class="top"><div class="backbar"><button class="backbtn" id="back" aria-label="Back">${svg(I.back)}</button>
    <div class="ttl"><h1>${title}</h1>${sub?`<span>${sub}</span>`:''}</div>
    <button class="iconbtn" data-go="search" aria-label="Search">${svg(I.search)}</button></div></div>`;
}
function header(){
  const tabs=[['foryou','For you'],['following','Following'],['verses','Verses'],['saints','Saints']];
  return `<div class="top">
    <div class="brand"><div class="logo">Seventy-Three</div>
      <div class="hicons">
        <button class="iconbtn" data-go="today" aria-label="Today">${svg(I.sun)}</button>
        <button class="iconbtn" data-go="search" aria-label="Search">${svg(I.search)}</button>
        <button class="iconbtn" data-go="books" aria-label="Books and saints">${svg(I.books)}</button>
        <button class="iconbtn" data-go="me" aria-label="Your bookmarks, notes and plan">${svg(I.user)}</button></div></div>
    <nav class="tabs" aria-label="Feeds">${tabs.map(([k,l])=>`<button class="tab" aria-pressed="${S.tab===k}" data-tab="${k}">${l}</button>`).join('')}</nav>
    ${S.tab==='foryou'?`<div class="mixrow"><span>Mix</span><div class="seg" role="group" aria-label="Feed mix">${[['scripture','More Scripture'],['balanced','Balanced'],['saints','More saints']].map(([k,l])=>`<button data-mix="${k}" aria-pressed="${S.mix===k}">${l}</button>`).join('')}</div></div>`:''}
  </div><div id="ptr" class="ptr" aria-live="polite"></div>`;
}
function likeBtn(id){const on=liked(id);return `<button data-like="${esc(id)}" class="${on?'liked':''}" aria-pressed="${on}" aria-label="Like">${svg(I.heart)}</button>`}
function markBtn(id){const on=!!M.me.bookmarks[id];return `<button data-mark="${esc(id)}" class="${on?'liked':''}" aria-pressed="${on}" aria-label="${on?'Remove bookmark':'Bookmark'}">${svg(I.mark)}</button>`}
function verseCard(x){
  const g=x.g,b=bookOf(g),xc=xcount(g),fc=fcount(g);
  return `<article class="post ${S.newIds['v'+g]?'just':''}" data-verse="${g}"${x.ptabgo?` data-ptabgo="${x.ptabgo}"`:''}${x.ffocus?` data-ffocus="${esc(x.ffocus)}"`:''}>
    ${bookAv(b.code)}
    <div class="body">
      <div class="who">${bookWho(b)}</div>
      <div class="verse">${esc(T(g))}</div>
      <a class="ref" href="#" data-verse="${g}"${x.ptabgo?` data-ptabgo="${x.ptabgo}"`:''}${x.ffocus?` data-ffocus="${esc(x.ffocus)}"`:''}>${refLabel(g)} <span class="tr">· Douay-Rheims</span></a>
      <div class="meta">
        <span class="stat" title="Other books replying with cross-references">${svg(I.link)}${xc==null?'…':xc}</span>
        <span class="stat" title="Fathers, saints and commentary">${svg(I.scroll)}${fc==null?'…':fc+(QBYG[g]?QBYG[g].length:0)}</span>
        ${likeBtn('v'+g)}${markBtn('v'+g)}
        ${S.newIds['v'+g]?'<span class="chip gold">New</span>':''}
        ${x.why?`<span class="chip why">${esc(x.why)}</span>`:''}
      </div>
    </div></article>`;
}
function quoteSrc(q){
  if(q.xl)return `${esc(q.w)}${q.l?`, ${esc(q.l)}`:''} · translated from the ${esc(q.xl)} for Seventy-Three`;
  return `${esc(q.w)}${q.l?`, ${esc(q.l)}`:''}${q.tr?` · tr. ${esc(q.tr)}`:''}${q.y?` (${esc(q.y)})`:''}`}
function quoteCard(x){
  const q=QBY[x.i];if(!q)return '';const a=ACC[q.s];
  return `<article class="post ${S.newIds['q'+q.i]?'just':''}" data-quote="${q.i}">
    ${accAv(a)}
    <div class="body">
      <div class="who">${accWho(a)}</div>
      <div class="qtext">${esc(q.t)}</div>
      <a class="src" href="#" data-quote="${q.i}">${quoteSrc(q)}</a>
      ${q.g>=0?`<a class="attached" href="#" data-verse="${q.g}"><div class="verse">${esc(trunc(T(q.g),220))}</div><div class="ref">${refLabel(q.g)}</div></a>`:''}
      <div class="meta">
        ${likeBtn('q'+q.i)}${markBtn('q'+q.i)}
        <button data-img="q${q.i}" aria-label="Save as image">${svg(I.image)}</button>
        ${S.newIds['q'+q.i]?'<span class="chip gold">New</span>':''}
        ${x.why?`<span class="chip why">${esc(x.why)}</span>`:''}
      </div>
    </div></article>`;
}
function todayCard(){
  const k=todayKey(),day=calDay(k),ss=saintsOn(mmdd(k)).slice(0,6);
  const c=principal(day);
  return `<div class="today" data-go="today">
    <div class="body"><div class="d"><span class="litdot" role="img" aria-label="Liturgical colour: ${esc((c&&c.col)||'not given')}" title="Liturgical colour: ${esc((c&&c.col)||'not given')}" style="--lit:${litColor(c&&c.col)}"></span>${esc(prettyDate(k))}</div>
    <a class="n" href="#" data-go="today">${esc(c?c.n:(ss[0]?ss[0].n:'Today'))}</a>
    <div class="avrow">${ss.map(s=>accAv(s,'xs',true)).join('')}<span class="hint">${day&&day.rd&&day.rd.length?'Readings · ':''}Saints · Martyrology · Bible in a year</span></div></div></div>`;
}
function suggestions(){
  const books=['JOH','PSA','ISA','MAT','ROM','GEN'].map(c=>BK[c]);
  const ss=SAINTS.filter(s=>QUOTES.some(q=>q.s===s.id)).slice(0,10);
  const row=(id,av,name,sub)=>`<div class="bookrow">${av}<div><b>${esc(name)}</b><span>${esc(sub)}</span></div><button class="follow" style="margin-left:auto" data-follow="${esc(id)}" aria-pressed="${!!M.me.following[id]}">${M.me.following[id]?'Following':'Follow'}</button></div>`;
  return `<div class="empty"><b>Follow books and saints</b>Their posts will gather here.</div>
    <div class="sect">Books</div>${books.map(b=>row('b:'+b.code,bookAv(b.code,'sm'),b.name,b.bio||'')).join('')}
    <div class="sect">Saints with writings</div>${ss.map(s=>row('s:'+s.id,accAv(s,'sm'),s.n,s.bio||'')).join('')}`;
}
function renderFeed(){
  let body='';const t=S.tab;
  const card=it=>it.kind==='v'?verseCard(it.x):quoteCard(it.x);
  if(t==='verses')body=S.feed.map(verseCard).join('');
  else if(t==='saints')body=todayCard()+`<div class="sortbar"><span>Words of the saints, from their own writings</span><button class="btn" data-go="saints">All saints</button></div>`+(S.qfeed.length?S.qfeed.map(quoteCard).join(''):`<div class="empty">${DATA.quotes==='missing'?'<b>Saints are on their way</b>Their profiles and words are still being prepared and checked.':'Loading the saints…'}</div>`);
  else if(t==='following'){const f=followingFeed();body=f.length?f.map(card).join('')+`<button class="earlier" data-go="me" data-mtab="following">Manage who you follow</button>`:suggestions()}
  else body=todayCard()+forYou().map(card).join('');
  $('#main').innerHTML=header()+`<div id="feedList">${body}</div>`+
    `<div class="foot">${TOTAL.toLocaleString(LOC)} verses${SAINTS.length?`, ${SAINTS.length.toLocaleString(LOC)} saints`:''}. Pull down at the top for new posts; more load as you scroll. <button class="linkbtn" data-go="credits">Sources and credits</button></div>`;
}

/* ---- Scripture tab ---- */
const XSRC={h:"Haydock's commentary",c:"Challoner's notes",hc:"Haydock's commentary and Challoner's notes"};
/* commentary citations carry no reader votes, so they rank like a well-voted link */
const rank=r=>r.src?20+10*r.votes:r.votes;
function sectionChip(b){return `<span class="chip">${esc(CATS[b.cat])}</span>`}
function scriptureList(g,trail){
  if(XR_FAILED)return `<div class="notice">Cross-references could not be loaded. Reload the page to try again.</div>`;
  const all=xrefs(g);
  if(all==null)return `<div class="writing"><span class="dots"><i></i><i></i><i></i></span><span>Loading cross-references…</span></div>`;
  const b0=bookOf(g);
  if(!all.length)return `<div class="empty"><b>No cross-references for this verse</b>${b0.deut?`For ${esc(b0.name)}, links come from the verses that Haydock and Challoner cite in their notes, and they did not cite any for this verse. See the Fathers tab.`:'No other verse is linked to this one in our sources.'}</div>`;
  let list=all.filter(r=>S.xfilt==='all'||bookOf(r.t).t===S.xfilt);
  if(S.xsort==='top')list=[...list].sort((a,b)=>rank(b)-rank(a));
  else if(S.xsort==='canon')list=[...list].sort((a,b)=>a.t-b.t);
  else if(S.xsort==='rev')list=[...list].sort((a,b)=>b.t-a.t);
  const shown=list.slice(0,V.more||10);
  const srcChip=r=>`<span class="chip gold" title="Cited in ${esc(XSRC[r.src]||'the commentary')}">${({h:'Haydock',c:'Challoner',hc:'Haydock · Challoner'})[r.src]||'Commentary'}</span>`;
  const branch=r=>{
    const b=bookOf(r.t);
    const sub=(xrefs(r.t)||[]).filter(x=>x.t!==g&&x.t!==r.t&&!trail.includes(x.t));
    const pv=sub[0];const pb=pv&&bookOf(pv.t);
    return `<div class="branch">
      <div class="node tap" data-verse="${r.t}" data-from="${g}">
        <div class="lcol">${bookAv(b.code,'sm')}${pv?'<span class="line"></span>':''}</div>
        <div class="body">
          <div class="who">${bookWho(b)}</div>
          <div class="rto">Replying to <b>@${b0.handle}</b></div>
          <div class="verse">${spanText(r.t,r.span)}</div>
          <a class="ref" href="#" data-verse="${r.t}" data-from="${g}">${refLabel(r.t,r.span)}</a>
          <div class="meta"><span class="stat" title="Its own cross-references">${svg(I.link)}${xcount(r.t)}</span>${r.src?srcChip(r):`<span class="stat" title="Votes on OpenBible.info">${svg(I.vote)}${r.votes}</span>`}${sectionChip(b)}${trail.length&&r.t===trail[trail.length-1]?'<span class="chip gold">You came from here</span>':''}</div>
        </div>
      </div>
      ${pv?`<div class="node tap" data-verse="${pv.t}" data-from="${g}" data-via="${r.t}">
        <div class="lcol">${bookAv(pb.code,'sm')}</div>
        <div class="body"><div class="who">${bookWho(pb)}</div><div class="rto">Replying to <b>@${b.handle}</b></div>
          <div class="verse sm">${esc(trunc(T(pv.t),180))}</div><a class="ref" href="#" data-verse="${pv.t}" data-from="${g}" data-via="${r.t}">${refLabel(pv.t,pv.span)}</a></div>
      </div>${sub.length>1?`<button class="more" data-verse="${r.t}" data-from="${g}">Show ${sub.length-1} more ${sub.length-1===1?'reply':'replies'}</button>`:''}`:''}
    </div>`;
  };
  return `<div class="sortbar"><div class="seg" role="group" aria-label="Filter">${[['all','All'],['OT','Old Testament'],['NT','New Testament']].map(([k,l])=>`<button data-xfilt="${k}" aria-pressed="${S.xfilt===k}">${l}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="Sort">${[['top','Top'],['canon','Genesis first'],['rev','Revelation first']].map(([k,l])=>`<button data-xsort="${k}" aria-pressed="${S.xsort===k}">${l}</button>`).join('')}</div></div>
    ${shown.map(branch).join('')||'<div class="empty">No replies from this part of the Bible.</div>'}
    ${list.length>shown.length?`<button class="earlier" data-moreref="1">Show ${Math.min(10,list.length-shown.length)} more of ${list.length}</button>`:''}
    <div class="credit">Cross-references from <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noopener">OpenBible.info</a> (CC BY), mapped to Douay-Rheims numbering; votes are OpenBible.info readers' votes. Links marked Haydock or Challoner are verses those commentators cite in their notes, which is how the deuterocanonical books get theirs. <button class="linkbtn" data-go="credits">All sources</button></div>`;
}

/* ---- Fathers tab ---- */
const SRC_LABEL={catena:'Catena Aurea',hcf:'Fathers',haydock:'Haydock',challoner:'Challoner'};
function longText(id,text){
  const long=text.length>520;
  if(!long||expanded[id])return `<div class="qtext" style="font-size:17px">${esc(text)}</div>${long?`<button class="showmore" data-expand="${esc(id)}">Show less</button>`:''}`;
  return `<div class="qtext clamp" style="font-size:17px">${esc(text)}</div><button class="showmore" data-expand="${esc(id)}">Show more</button>`;
}
function fathersList(g){
  const b=bookOf(g),F=FCACHE[b.code];
  const qs=QBYG[g]||[];
  if(!F){loadFathers(b.code).then(()=>softRender());return `<div class="writing"><span class="dots"><i></i><i></i><i></i></span><span>Gathering the Fathers…</span></div>`}
  let items=(F[g]||[]).map((it,i)=>({src:it[0],acc:authorAcc(it[1]),text:it[2],cite:it[3],url:it[4],end:it[5],id:`f:${g}:${i}`})).filter(x=>x.acc&&x.acc.k!=='exclude');
  const ord=x=>x.src==='haydock'?9000:x.src==='challoner'?9100:(x.acc.sort||5000);
  items.sort((a,c)=>ord(a)-ord(c));
  const quoteItems=qs.map(q=>({src:'saint',acc:ACC[q.s],text:q.t,cite:quoteSrc(q),url:'',end:0,id:'q'+q.i,q}));
  let all=[...quoteItems,...items];
  const f=V.ffocus?'all':S.ffilt;
  if(f==='fathers')all=all.filter(x=>x.src==='catena'||x.src==='hcf'||x.src==='saint');
  else if(f==='haydock')all=all.filter(x=>x.src==='haydock');
  else if(f==='challoner')all=all.filter(x=>x.src==='challoner');
  const filts=[['all','All'],['fathers','Fathers & saints'],['haydock','Haydock'],['challoner','Challoner']];
  const head=`<div class="sortbar"><span>${all.length} ${all.length===1?'voice':'voices'} on this verse</span><div class="seg" role="group" aria-label="Filter">${filts.map(([k,l])=>`<button data-ffilt="${k}" aria-pressed="${f===k}">${l}</button>`).join('')}</div></div>`;
  if(!all.length)return head+`<div class="empty"><b>No commentary on this verse yet</b>Haydock and Challoner annotate many verses, and the Fathers concentrate on the Gospels, Psalms, Paul and Job.</div>`;
  if(V.ffocus){const i=all.findIndex(x=>x.id===V.ffocus||(x.acc&&x.acc.id===V.ffocus));if(i>=(V.fmore||15))V.fmore=i+1}
  const shown=all.slice(0,V.fmore||15);
  return head+shown.map(x=>{
    const a=x.acc,yrs=a.y?`<span class="t">· ${esc(a.y)}</span>`:'';
    const kindTag=a.kind==='saint'||a.kind==='blessed'?'':`<span class="kindchip">${esc(a.k==='writer'?'Church writer':a.k==='compilation'?'Compilation':a.k==='pseudonymous'?'Attributed':a.k==='commentary'?'Commentary':a.k==='council'?'Council':'')}</span>`;
    const via=x.src==='catena'?' · via the Catena Aurea of St. Thomas Aquinas':'';
    const hl=V.ffocus&&(x.id===V.ffocus||a.id===V.ffocus);
    return `<div class="branch"><div class="node${hl?' hl':''}"${hl?' id="ffocus"':''}>
      <div class="lcol">${accAv(a,'sm')}</div>
      <div class="body">
        <div class="who">${accWho(a,yrs)} ${kindTag}</div>
        <div class="rto">On <b>${esc(rangeLabel(g,x.end||g))}</b>${via}</div>
        ${longText(x.id,x.text)}
        <div class="src">${x.src==='saint'?x.cite:esc(x.cite)}${/^https?:\/\//.test(x.url||'')?` · <a href="${esc(x.url)}" target="_blank" rel="noopener">Source</a>`:''}</div>
        <div class="meta">${x.q?`<a class="stat" href="#" data-quote="${x.q.i}">Open quote</a>`:''}${likeBtn(x.id)}${markBtn(x.id)}<button data-img="${esc(x.id)}" aria-label="Save as image">${svg(I.image)}</button></div>
      </div></div></div>`;
  }).join('')+(all.length>shown.length?`<button class="earlier" data-fmore="1">Show ${Math.min(15,all.length-shown.length)} more of ${all.length}</button>`:'')+
  `<div class="credit">Public-domain sources: the Catena Aurea of St. Thomas Aquinas (Oxford translation, 1841–45); 19th-century translations of the Fathers (Ante-Nicene and Nicene and Post-Nicene Fathers, Library of the Fathers), kept only where the words were found in the cited text; Haydock's Catholic Bible Commentary (1859); Bishop Challoner's notes (1749–52). <button class="linkbtn" data-go="credits">All sources</button></div>`;
}

/* ---- Verse page ---- */
let speaking=null;
function noteBox(g){
  const n=M.me.notes['v'+g];
  if(V.editNote)return `<div class="section"><h3>Your note</h3><textarea class="note" id="note-text" maxlength="5000" aria-label="Your note on this verse" placeholder="Write a private note">${esc(n||'')}</textarea><div class="crow" style="border:0"><span class="hint">Saved on this device only</span><button class="btn primary" data-savenote="${g}">Save note</button></div></div>`;
  if(n)return `<div class="section"><h3>Your note</h3><p class="text">${esc(n)}</p><button class="showmore" data-editnote="1">Edit note</button></div>`;
  return '';
}
function renderVerse(){
  const g=V.g,b=bookOf(g),trail=V.trail||[];
  const xc=xcount(g),fc=fcount(g),qc=(QBYG[g]||[]).length;
  const tab=V.ptab==='fathers'?'fathers':'scripture';
  let anc='';
  if(trail.length){
    const showAll=V.allTrail||trail.length<=3,list=showAll?trail:trail.slice(-3);
    if(!showAll)anc+=`<button class="earlier" data-alltrail="1">Show ${trail.length-3} earlier ${trail.length-3===1?'verse':'verses'} in this path</button>`;
    anc+=list.map((t,i)=>{const tb=bookOf(t),pos=trail.length-list.length+i;return `<div class="node tap" data-trailpos="${pos}"><div class="lcol">${bookAv(tb.code,'sm')}<span class="line"></span></div><div class="body"><div class="who">${bookWho(tb)}</div><div class="verse sm">${esc(trunc(T(t),200))}</div><a class="ref" href="#" data-trailpos="${pos}" aria-label="Back to ${refLabel(t)}">${refLabel(t)}</a></div></div>`}).join('');
  }
  const alt=altNumber(g),on=id=>!!M.me.bookmarks[id];
  const focus=`<div class="focus">
      <div class="who" style="gap:10px">${bookAv(b.code)}<div>${bookWho(b)}<div class="h" style="font-size:13px;color:var(--muted)">${esc(CATS[b.cat])}${b.deut?' · Deuterocanonical':''}</div></div></div>
      <div class="verse">${esc(T(g))}</div>
      <div class="ref">${refLabel(g)} <span class="tr">· Douay-Rheims 1899</span></div>
      ${alt?`<div class="alt">${esc(alt)}</div>`:''}
      <div class="factions">
        <button class="btn" data-read="${b.code}" data-c="${VC[g]}" data-hl="${g}">${svg(I.read)}Read ${esc(bname(b))} ${VC[g]}</button>
        <button class="btn ${speaking==='v'+g?'on':''}" data-speak="v${g}">${svg(speaking==='v'+g?I.stop:I.speak)}${speaking==='v'+g?'Stop':'Listen'}</button>
        <button class="btn ${liked('v'+g)?'liked':''}" data-like="v${g}" aria-pressed="${liked('v'+g)}">${svg(I.heart)}${liked('v'+g)?'Liked':'Like'}</button>
        <button class="btn ${on('v'+g)?'on':''}" data-mark="v${g}" aria-pressed="${on('v'+g)}">${svg(I.mark)}${on('v'+g)?'Saved':'Save'}</button>
        <button class="btn" data-editnote="1">${svg(I.copy)}${M.me.notes['v'+g]?'Note':'Add note'}</button>
        <button class="btn" data-img="v${g}">${svg(I.image)}Image</button>
        <button class="btn" data-copy="${g}">${svg(I.copy)}Copy</button>
      </div></div>${noteBox(g)}`;
  const tabs=`<nav class="ptabs" aria-label="Replies">
      <button class="tab" aria-pressed="${tab==='scripture'}" data-ptab="scripture">Scripture<span class="n">${xc==null?'':xc}</span></button>
      <button class="tab" aria-pressed="${tab==='fathers'}" data-ptab="fathers">Fathers<span class="n">${fc==null?'':fc+qc}</span></button></nav>`;
  const body=tab==='scripture'?scriptureList(g,trail):fathersList(g);
  $('#main').innerHTML=topBar(refLabel(g),`${esc(b.name)}${trail.length?` · ${trail.length+1} verses deep`:''}`)+anc+focus+tabs+body;
}

/* ---- Quote page ---- */
const LANGCODE={Latin:'la',Greek:'grc',French:'fr',Italian:'it',Spanish:'es',German:'de',Armenian:'xcl',Syriac:'syr'};
function renderQuote(){
  const q=QBY[V.id];if(!q){V={name:'feed'};return render()}
  const a=ACC[q.s],on=!!M.me.bookmarks['q'+q.i];
  const more=QUOTES.filter(x=>x.s===q.s&&x.i!==q.i);
  const pick=more.map(x=>({x,h:hash(q.i+x.i)})).sort((m,n)=>m.h-n.h).slice(0,6).map(m=>m.x);
  const focus=`<div class="focus" style="border-bottom:1px solid var(--line);padding-bottom:14px">
    <div class="who" style="gap:10px">${accAv(a)}<div>${accWho(a)}</div></div>
    <div class="qtext" style="font-size:24px">${esc(q.t)}</div>
    <div class="src">${quoteSrc(q)}</div>
    ${q.g>=0?`<a class="attached" href="#" data-verse="${q.g}"><div class="verse">${esc(T(q.g))}</div><div class="ref">${refLabel(q.g)}</div></a>`:''}
    <div class="factions" style="border:0;padding-bottom:0">
      <button class="btn ${liked('q'+q.i)?'liked':''}" data-like="q${q.i}" aria-pressed="${liked('q'+q.i)}">${svg(I.heart)}${liked('q'+q.i)?'Liked':'Like'}</button>
      <button class="btn ${on?'on':''}" data-mark="q${q.i}" aria-pressed="${on}">${svg(I.mark)}${on?'Saved':'Save'}</button>
      <button class="btn" data-speak="q${q.i}">${svg(speaking==='q'+q.i?I.stop:I.speak)}${speaking==='q'+q.i?'Stop':'Listen'}</button>
      <button class="btn" data-img="q${q.i}">${svg(I.image)}Image</button>
      ${q.o?`<button class="btn ${V.orig?'on':''}" data-orig="1" aria-pressed="${!!V.orig}">${svg(I.read)}${V.orig?'Hide':'Show'} the original</button>`:''}</div>
    ${q.o&&V.orig?`<div class="orig"><div class="lbl">Original ${esc(q.xl||'')}</div><div class="qtext" lang="${esc(LANGCODE[q.xl]||'')}">${esc(q.o)}</div><div class="src">${esc(q.oe||'')}</div></div>`:''}</div>`;
  const rest=pick.length?`<div class="sortbar"><span>More from ${esc(a?a.n:'this saint')}</span>${more.length>pick.length&&a?`<button class="btn" data-acct="${esc(a.id)}">All ${more.length+1}</button>`:''}</div>`+pick.map(x=>quoteCard({i:x.i,why:''})).join(''):'';
  $('#main').innerHTML=topBar(esc(a?a.n:'Quote'),esc(q.w))+focus+rest;
}

/* ---- Saint / author profile ---- */
function acctKeys(id){if(id.startsWith('raw:'))return [id.slice(4)];return Object.entries(AUTH).filter(([k,a])=>a.acc===id).map(([k])=>k).concat(id==='haydock'?['haydock']:id==='challoner'?['challoner']:[])}
function feastLabel(s){if(!s.f)return '';const [m,d]=s.f.split('-').map(Number);return new Date(2001,m-1,d).toLocaleDateString(LOC,{month:'long',day:'numeric'})}
function renderAcct(){
  const a=ACC[V.id];if(!a){V={name:'feed'};return render()}
  const tab=V.atab||'posts',qs=QUOTES.filter(q=>q.s===a.id);
  const keys=acctKeys(a.id),verses=FAUTH?[...new Set(keys.flatMap(k=>FAUTH[k]||[]))].sort((x,y)=>x-y):null;
  const fid=(a.kind==='saint'||a.kind==='blessed'?'s:':'a:')+a.id,following=!!M.me.following[fid];
  const kindLabel=a.kind==='saint'?'Saint':a.kind==='blessed'?'Blessed':a.k==='writer'?'Church writer (not canonized)':a.k==='compilation'?'Medieval compilation':a.k==='commentary'?'Catholic commentary':a.k==='pseudonymous'?'Attributed writings':a.k==='council'?'Council':'';
  let body='';
  if(tab==='posts')body=qs.length?qs.map(q=>quoteCard({i:q.i,why:''})).join(''):`<div class="empty"><b>No quotations yet</b>${verses&&verses.length?'See this account\'s commentary on Scripture in the Commentary tab.':'We only post words found in public-domain editions of a saint\'s own writings.'}</div>`;
  else if(tab==='commentary'){
    if(verses==null)body=`<div class="writing"><span class="dots"><i></i><i></i><i></i></span><span>Loading…</span></div>`;
    else if(!verses.length)body='<div class="empty">No verse commentary from this account in our sources.</div>';
    else body=`<div class="sortbar"><span>Comments on ${verses.length.toLocaleString(LOC)} verses</span></div>`+verses.slice(0,V.cmore||30).map(g=>`<button class="res" data-verse="${g}" data-ptabgo="fathers" data-ffocus="${esc(a.id)}">${bookAv(bookOf(g).code,'sm',true)}<div class="body"><b>${refLabel(g)}</b><div class="verse">${esc(trunc(T(g),160))}</div></div></button>`).join('')+(verses.length>(V.cmore||30)?`<button class="earlier" data-cmore="1">Show more</button>`:'');
  }else{
    const works=[...new Map(qs.map(q=>[q.w+'|'+q.tr,q])).values()];
    body=`<div class="section"><h3>About</h3><p class="text">${esc(a.bio||'')}</p>${/^https?:\/\//.test(a.w||'')?`<p class="src"><a href="${esc(a.w)}" target="_blank" rel="noopener">Read more on Wikipedia</a></p>`:''}</div>`+
      (works.length?`<div class="section"><h3>Writings quoted here</h3>${works.map(q=>`<p class="src" style="font-size:14px">${esc(q.w)}${q.tr?`, translated by ${esc(q.tr)}`:''}${q.y?` (${esc(q.y)})`:''}</p>`).join('')}</div>`:'')+
      `<div class="credit">Profiles are built from the General Roman Calendar (romcal, MIT), the Roman Martyrology (1908, public domain) and other public sources, checked by reviewers. Quotations are word-for-word from public-domain translations.</div>`;
  }
  $('#main').innerHTML=topBar(esc(a.n),kindLabel)+`
    <div class="banner" style="--cat:var(--t-${a.t||'writer'})"></div>
    <div class="prof">
      <div style="display:flex;justify-content:space-between;align-items:flex-end">${accAv(a,'lg',true)}<button class="follow" data-follow="${esc(fid)}" aria-pressed="${following}">${following?'Following':'Follow'}</button></div>
      <h2>${esc(a.n)} ${a.kind==='saint'?HALO('Saint'):a.kind==='blessed'?HALO('Blessed'):''}</h2><div class="h">@${esc(a.h)} · ${esc(kindLabel)}</div>
      ${a.bio?`<p>${esc(a.bio)}</p>`:''}
      <div class="facts">${a.f?`<span>Feast <b>${esc(feastLabel(a))}</b>${a.grc?' · General Roman Calendar':''}</span>`:''}${a.b||a.d?`<span>${esc(a.b||'?')}–${esc(a.d||'?')}</span>`:a.y?`<span>${esc(a.y)}</span>`:''}${a.r?`<span>${esc(a.r)}</span>`:''}${TYPES[a.t]?`<span>${esc(TYPES[a.t])}</span>`:''}</div>
      ${a.p&&a.p.length?`<div class="patrons">${a.p.map(x=>`<span class="chip">Patron of ${esc(x)}</span>`).join('')}</div>`:''}
    </div>
    <nav class="ptabs" aria-label="Profile"><button class="tab" aria-pressed="${tab==='posts'}" data-atab="posts">Posts<span class="n">${qs.length}</span></button><button class="tab" aria-pressed="${tab==='commentary'}" data-atab="commentary">Commentary<span class="n">${verses?verses.length:''}</span></button><button class="tab" aria-pressed="${tab==='about'}" data-atab="about">About</button></nav>
    ${body}`;
}

/* ---- Book profile ---- */
function talksWith(b){
  if(!XR)return null;if(b._talks)return b._talks;const cnt={};
  for(let g=b.start;g<b.start+b.n;g++){const s=XR[g];if(!s)continue;for(const p of s.split(';')){const t=+p.slice(0,p.indexOf(','));const c=bookOf(t).code;if(c!==b.code)cnt[c]=(cnt[c]||0)+1}}
  return b._talks=Object.entries(cnt).sort((a,c)=>c[1]-a[1]).slice(0,5);
}
function bookPosts(b,page){const out=[],seen=new Set();let i=0;while(out.length<(page+1)*8&&i<400){const g=b.start+Math.floor(hash(b.code+':'+i)*b.n);i++;if(seen.has(g)||T(g).length<35)continue;seen.add(g);out.push(g)}return out}
function renderBook(){
  const b=BK[V.code],tab=V.btab||'posts',tw=talksWith(b),fid='b:'+b.code,following=!!M.me.following[fid];
  let pin='';
  if(b.pinned){const [c,v]=b.pinned.split(':').map(Number);const g=idx(b.code,c,v);if(g>=0)pin=`<div class="pinned">${svg(I.pin)}Pinned</div>`+verseCard({g,why:''})}
  const posts=tab==='posts'?bookPosts(b,V.page||0).map(g=>verseCard({g,why:''})).join('')+`<button class="earlier" data-bookmore="1">Show more from ${esc(b.name)}</button>`:
    `<div class="chgrid">${b.ch.map((_,i)=>`<button data-read="${b.code}" data-c="${i+1}" aria-label="Chapter ${i+1}">${i+1}</button>`).join('')}</div>`;
  $('#main').innerHTML=topBar(esc(b.name),`${b.n.toLocaleString(LOC)} verses`)+`
    <div class="banner" style="--cat:var(--c-${b.cat})"></div>
    <div class="prof">
      <div style="display:flex;justify-content:space-between;align-items:flex-end"><div class="av lg" style="--cat:var(--c-${b.cat})">${svg(b.icon)}</div><button class="follow" data-follow="${fid}" aria-pressed="${following}">${following?'Following':'Follow'}</button></div>
      <h2>${esc(b.name)} ${CHECK}</h2><div class="h">@${b.handle}</div>
      ${b.dr!==b.name?`<div class="dr">In the Douay-Rheims: ${esc(b.dr)}</div>`:''}
      ${b.bio?`<p>${esc(b.bio)}</p>`:''}
      <div class="facts"><span><b>${b.ch.length}</b> chapters</span><span><b>${b.n.toLocaleString(LOC)}</b> verses</span><span>${b.t==='OT'?'Old':'New'} Testament</span><span>${esc(CATS[b.cat])}</span>${b.deut?'<span>Deuterocanonical</span>':''}</div>
      ${tw&&tw.length?`<div class="talks">Talks most with ${tw.map(([c])=>`<button data-book="${c}">${bookAv(c,'xs',true)}${esc(BK[c].name)}</button>`).join('')}</div>`:''}
    </div>
    <nav class="ptabs" aria-label="Book"><button class="tab" aria-pressed="${tab==='posts'}" data-btab="posts">Posts</button><button class="tab" aria-pressed="${tab==='chapters'}" data-btab="chapters">Chapters</button></nav>
    ${tab==='posts'?pin:''}${posts}`;
}

/* ---- Chapter reader ---- */
function renderChapter(){
  const b=BK[V.code],c=V.c;
  if(!b||!b.ch[c-1]){$('#main').innerHTML=topBar('Not found','')+`<div class="empty"><b>That chapter is not in the Douay-Rheims</b>${b?`${esc(b.name)} has ${b.ch.length} chapters.`:''}</div>`;return}
  const n=b.ch[c-1],start=b.start+b.cum[c-1],key=`c${b.code}${c}`;
  let rows='';
  for(let v=1;v<=n;v++){const g=start+v-1;const xc=xcount(g);rows+=`<button class="rv ${V.hl===g?'hl':''}" data-verse="${g}" id="rv${g}"><sup>${v}</sup>${esc(T(g))}${xc?`<span class="xc">${xc} links</span>`:''}</button>`}
  const prev=c>1?`<button class="btn" data-read="${b.code}" data-c="${c-1}">← Chapter ${c-1}</button>`:'<span></span>';
  const next=c<b.ch.length?`<button class="btn" data-read="${b.code}" data-c="${c+1}">Chapter ${c+1} →</button>`:'<span></span>';
  $('#main').innerHTML=topBar(`${esc(bname(b))} ${c}`,`${esc(b.name)} · ${n} verses`)+
    `<div class="factions" style="padding:10px 16px"><button class="btn ${speaking===key?'on':''}" data-speak="${key}">${svg(speaking===key?I.stop:I.speak)}${speaking===key?'Stop':'Listen to this chapter'}</button></div>`+
    `<div class="reader">${rows}</div><div class="chnav">${prev}${next}</div>`;
}

/* ---- Today ---- */
const CALS={GRC:'General Roman',US:'United States',CA:'Canada'};
/* a national calendar only lists the days that differ from the General Roman Calendar */
function calDay(k){
  const base=CAL&&CAL.days[k];if(S.cal==='GRC'||!base)return base;
  const nat=NATCAL[S.cal];if(!nat)return base;
  const d=nat.days[k];return d?Object.assign({},base,d):base;
}
function calRange(){const ks=CAL?Object.keys(CAL.days).sort():[];if(!ks.length)return '';const f=k=>{const [y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString(LOC,{month:'long',year:'numeric'})};return f(ks[0])+' to '+f(ks[ks.length-1])}
function calPicker(){
  if(!CAL)return '';
  const st=S.cal!=='GRC'&&!NATCAL[S.cal]?(NATCAL_ERR[S.cal]?' <span class="hint bad">could not be loaded</span>':' <span class="hint">loading…</span>'):'';
  return `<div class="mixrow" style="padding:10px 0 0"><span>Calendar</span><div class="seg calseg" role="group" aria-label="Calendar">${Object.entries(CALS).map(([c,l])=>`<button data-calsel="${c}" aria-pressed="${S.cal===c}">${esc(l)}</button>`).join('')}</div>${st}</div>`;
}
const PLAN_CH=()=>{if(PLAN_CH.list)return PLAN_CH.list;const l=[];BOOKS.forEach(b=>b.ch.forEach((_,i)=>l.push([b.code,i+1])));return PLAN_CH.list=l};
function planDay(n){const L=PLAN_CH(),N=L.length;return L.slice(Math.floor((n-1)*N/365),Math.floor(n*N/365))}
function planDayFor(k){const p=M.me.plan;if(!p||!p.start)return 0;const [y,m,d]=p.start.split('-').map(Number),[y2,m2,d2]=k.split('-').map(Number);const n=Math.round((Date.UTC(y2,m2-1,d2)-Date.UTC(y,m-1,d))/864e5)+1;return n>=1&&n<=365?n:(n>365?365:0)}
function readingText(rd){
  if(!rd.g||!rd.g.length)return '';
  let out='',total=0,next=null;
  for(const [a,e] of rd.g){for(let i=a;i<=e;i++){if(total>=60){next=i;break}out+=`<sup>${VC[i]}:${VV[i]}</sup>${esc(T(i))} `;total++}if(next!=null)break}
  if(next!=null){const b=bookOf(next);out+=`… <button class="showmore" data-read="${b.code}" data-c="${VC[next]}" data-hl="${next}">Continue at ${refLabel(next)}</button>`}
  return out;
}
function renderToday(){
  const k=V.date||todayKey(),day=calDay(k),md=mmdd(k),pc=principal(day);
  const ss=saintsOn(md),mart=(MART&&MART.days[md])||[];
  const [y,m,d]=k.split('-').map(Number);
  const shift=n=>{const dt=new Date(y,m-1,d+n);return todayKey(dt)};
  let h=`<div class="section"><div class="today" style="margin:0;cursor:default"><div class="body">
    <div class="d"><span class="litdot" role="img" aria-label="Liturgical colour: ${esc((pc&&pc.col)||'not given')}" title="Liturgical colour: ${esc((pc&&pc.col)||'not given')}" style="--lit:${litColor(pc&&pc.col)}"></span>${esc(prettyDate(k))}</div>
    <div class="n">${esc(pc?pc.n:'')}</div>
    ${day?`<div class="hint">${esc([day.w||day.s,day.sc?`Sunday cycle ${day.sc}`:'',day.wc?`Weekday cycle ${day.wc}`:''].filter(Boolean).join(' · '))}</div>`:CAL?`<div class="hint">The liturgical calendar here covers ${esc(calRange())}.</div>`:'<div class="hint">Loading the calendar…</div>'}
    ${day&&day.c&&day.c.length>1?`<div class="hint">Also: ${day.c.filter(c=>c!==pc).map(c=>esc(c.n)+(c.r?` (${esc(c.r)})`:'')).join('; ')}</div>`:''}
    </div></div>
    ${calPicker()}
    <div class="chnav" style="border:0;padding:10px 0 0"><button class="btn" id="day-prev" data-day="${shift(-1)}">← Previous day</button>${k!==todayKey()?`<button class="btn" id="day-today" data-day="${todayKey()}">Today</button>`:''}<button class="btn" id="day-next" data-day="${shift(1)}">Next day →</button></div></div>`;
  if(day&&day.rd&&day.rd.length){
    h+=`<div class="section"><h3>Readings of the day</h3>${day.rd.map(r=>`<div class="reading"><div class="lbl">${esc(r.l)}</div>
      <div class="rref"><span>${esc(r.ref)}</span>${r.g&&r.g.length?`<a class="vref" href="#" data-g="${r.g[0][0]}">${esc(rangeLabel(r.g[0][0],r.g[r.g.length-1][1]))} in the Douay-Rheims</a>`:''}</div>
      <div class="rtext">${readingText(r)||'<span class="hint">This reading could not be matched to the Douay-Rheims text.</span>'}</div></div>`).join('')}
      <p class="credit" style="padding:8px 0 0">Reading references from the Roman Lectionary, checked against the Ordo Lectionum Missae (1981); text from the Douay-Rheims, so wording and some verse numbers differ from the Mass readings in your parish. <button class="linkbtn" data-go="credits">Sources</button></p></div>`;
  }else if(day)h+=`<div class="section"><h3>Readings of the day</h3><p class="hint">We could not confirm the readings for this day from our sources, so none are shown.</p></div>`;
  h+=`<div class="section"><h3>Saints of the day</h3>${ss.length?ss.slice(0,V.smore||12).map(s=>`<button class="bookrow" data-acct="${esc(s.id)}">${accAv(s,'sm',true)}<div><b>${esc(s.n)}</b><span>${s.grc?'General Roman Calendar · ':''}${esc(s.bio||'')}</span></div></button>`).join('')+(ss.length>(V.smore||12)?`<button class="earlier" data-smore="1">Show all ${ss.length}</button>`:''):'<p class="hint">No saint in our list has a feast on this date.</p>'}</div>`;
  if(mart.length)h+=`<div class="section"><h3>The Roman Martyrology</h3><p class="hint" style="margin-top:0">Saints commemorated on this day in the traditional Roman Martyrology (1908 English translation, public domain).</p>${mart.slice(0,V.mmore?999:3).map(t=>`<p class="mart">${esc(t)}</p>`).join('')}${mart.length>3&&!V.mmore?`<button class="showmore" data-mmore="1">Read all ${mart.length} entries</button>`:''}</div>`;
  const pd=planDayFor(k);
  if(M.me.plan&&M.me.plan.start){
    const doneN=Object.keys(M.me.plan.done||{}).length,chs=pd?planDay(pd):[];
    h+=`<div class="section"><h3>Bible in a year · Day ${pd||'–'}</h3><div class="progress"><i style="width:${Math.round(doneN/365*100)}%"></i></div><p class="hint">${doneN} of 365 days read</p>
      ${chs.map(([c,ch])=>`<button class="btn" style="margin:4px 6px 0 0" data-read="${c}" data-c="${ch}">${esc(bname(BK[c]))} ${ch}</button>`).join('')}
      ${pd?`<div style="margin-top:10px"><button class="btn ${M.me.plan.done&&M.me.plan.done[pd]?'on':'primary'}" data-plandone="${pd}">${M.me.plan.done&&M.me.plan.done[pd]?'Read ✓':'Mark day '+pd+' as read'}</button></div>`:''}</div>`;
  }else h+=`<div class="section"><h3>Bible in a year</h3><p class="hint">All 73 books in 365 days, about four chapters a day.</p><button class="btn primary" data-planstart="1">Start today</button></div>`;
  $('#main').innerHTML=topBar('Today',esc(prettyDate(k)))+h;
}

/* ---- Me ---- */
function bookmarkRow(id){
  if(/^v\d+$/.test(id)){const g=+id.slice(1);return verseCard({g,why:''})}
  if(/^q/.test(id)&&QBY[id.slice(1)])return quoteCard({i:id.slice(1),why:''});
  const m=/^f:(\d+):(\d+)$/.exec(id);if(m)return `<button class="res" data-verse="${m[1]}" data-ptabgo="fathers"><div class="body"><b>Commentary on ${refLabel(+m[1])}</b><div class="hint">Saved from the Fathers tab</div></div></button>`;
  return '';
}
function settingsBody(){
  const off=window.S73Native?`<div class="section"><h3>Offline</h3><p class="hint" style="margin-top:0">Everything is inside the app, including all the commentary of the Fathers, and works without internet.</p></div>`
    :OFFLINE.on?`<div class="section"><h3>Offline</h3>
      <p class="hint" style="margin-top:0">The Bible, cross-references, saints, quotations and the calendar are saved on this device and work without internet.</p>
      ${OFFLINE.total?`<p class="hint">Commentary of the Fathers: <b>${OFFLINE.have} of ${OFFLINE.total}</b> books saved${OFFLINE.busy?' · saving…':''}.</p><div class="progress"><i style="width:${Math.round(OFFLINE.have/OFFLINE.total*100)}%"></i></div>
      ${OFFLINE.have<OFFLINE.total?`<button class="btn primary" data-dlall="1" ${OFFLINE.busy?'disabled':''}>${OFFLINE.busy?'Saving…':'Save all commentary for offline use'}</button><p class="hint">About ${OFFLINE.mb} MB. Books you open are saved anyway.</p>`:''}`:'<p class="hint">Checking what is saved…</p>'}</div>`
    :`<div class="section"><h3>Offline</h3><p class="hint" style="margin-top:0">This page needs an internet connection. The installable version of the app works offline.</p></div>`;
  return `<div class="section"><h3>Liturgical calendar</h3><p class="hint" style="margin-top:0">Which calendar Today follows: celebrations and the Sundays that some countries move.</p>${calPicker()}</div>
    ${off}
    <div class="section"><h3>Backup</h3><p class="hint" style="margin-top:0">Your likes, bookmarks, notes, follows and reading plan are kept on this device only. Save a backup file to keep them or move them to another device.</p>
      <button class="btn" data-export="1">Save a backup</button> <label class="btn" style="display:inline-block">Load a backup<input type="file" id="importfile" accept="application/json,.json" hidden></label></div>
    <div class="section"><h3>About</h3><p class="hint" style="margin-top:0">Every book of the Catholic Bible posts its verses; other books answer with cross-references; the Fathers and saints comment in their own words.</p><button class="btn" data-go="credits">Sources and credits</button></div>`;
}
function renderMe(){
  const tab=V.mtab||'bookmarks';let body='';
  if(tab==='bookmarks'){const ids=Object.entries(M.me.bookmarks).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);body=ids.map(bookmarkRow).join('')||'<div class="empty"><b>No bookmarks yet</b>Tap the bookmark icon on any verse or quote.</div>'}
  else if(tab==='notes'){const ns=Object.entries(M.me.notes);body=ns.length?ns.map(([id,t])=>{const g=+id.slice(1);return `<button class="res" data-verse="${g}"><div class="body"><b>${refLabel(g)}</b><div class="text">${esc(trunc(t,240))}</div></div></button>`}).join(''):'<div class="empty"><b>No notes yet</b>Open a verse and tap Add note.</div>'}
  else if(tab==='following'){const f=Object.keys(M.me.following);body=f.length?f.map(id=>{if(id.startsWith('b:')){const b=BK[id.slice(2)];return b?`<div class="bookrow">${bookAv(b.code,'sm')}<div><b>${esc(b.name)}</b><span>@${b.handle}</span></div><button class="follow" style="margin-left:auto" data-follow="${id}" aria-pressed="true">Following</button></div>`:''}const a=ACC[id.slice(2)];return a?`<div class="bookrow">${accAv(a,'sm')}<div><b>${esc(a.n)}</b><span>@${esc(a.h)}</span></div><button class="follow" style="margin-left:auto" data-follow="${esc(id)}" aria-pressed="true">Following</button></div>`:''}).join(''):suggestions()}
  else if(tab==='plan'){const p=M.me.plan;const doneN=p?Object.keys(p.done||{}).length:0;body=`<div class="section">${p&&p.start?`<h3>Bible in a year</h3><p class="hint">Started ${esc(prettyDate(p.start))} · day ${planDayFor(todayKey())} today</p><div class="progress"><i style="width:${Math.round(doneN/365*100)}%"></i></div><p class="hint">${doneN} of 365 days read</p><button class="btn" data-go="today">Open today's reading</button> <button class="btn" data-planreset="1">Start over</button>`:`<h3>Bible in a year</h3><p class="hint">All 73 books in 365 days.</p><button class="btn primary" data-planstart="1">Start today</button>`}</div>`}
  else body=settingsBody();
  const tabs=[['bookmarks','Bookmarks'],['notes','Notes'],['following','Following'],['plan','Plan'],['settings','Settings']];
  $('#main').innerHTML=topBar('You','Saved on this device only')+`<nav class="ptabs tabs" aria-label="Your things" style="top:calc(env(safe-area-inset-top,0px) + 59.5px)">${tabs.map(([k,l])=>`<button class="tab" aria-pressed="${tab===k}" data-mtab="${k}">${l}</button>`).join('')}</nav>`+body;
}

/* ---- Sources and credits ---- */
function renderCredits(){
  const L=(href,t)=>`<a href="${esc(href)}" target="_blank" rel="noopener">${esc(t)}</a>`;
  const sec=(h,items)=>`<div class="section"><h3>${h}</h3>${items.map(x=>`<p class="cred">${x}</p>`).join('')}</div>`;
  const C=CREDITS;
  const works=C&&C.works?C.works.map(w=>`<li><b>${esc(w.saint)}</b>, <i>${esc(w.work)}</i>${w.xl?`, translated from the ${esc(w.xl)} (original: ${esc(w.oe||'')})`:w.tr?`, tr. ${esc(w.tr)}`:''}${!w.xl&&w.y?` (${esc(w.y)})`:''}${/^https?:\/\//.test(w.url||'')?` · ${L(w.url,'source')}`:''}</li>`).join(''):'';
  const lic=f=>`<a href="data/licenses/${f}" target="_blank" rel="noopener">license text</a>`;
  $('#main').innerHTML=topBar('Sources and credits','Everything in this app and where it comes from')+
  `<div class="section"><p class="cred" style="margin-top:0">Seventy-Three is not an official publication of the Catholic Church. Its texts are public-domain editions; its data comes from the open projects below, which we thank. Where a source requires attribution or a license notice, it is given here.</p></div>`+
  sec('The Bible',[
    `<b>Douay-Rheims Bible</b>, Challoner revision, 1899 American edition. Public domain. Digital text from ${L('https://ebible.org/find/details.php?id=engDRA','eBible.org')}.`,
    `The notes that give each verse's number in modern Bibles were computed by aligning the text with the King James Version with Apocrypha (public domain, eBible.org). That text is used only for the alignment and is not shown.`]) +
  sec('Cross-references',[
    `${L('https://www.openbible.info/labs/cross-references/','OpenBible.info Cross References')}, licensed ${L('https://creativecommons.org/licenses/by/4.0/','CC BY')}. Based on the Treasury of Scripture Knowledge and votes by OpenBible.info readers. We converted the references to Douay-Rheims numbering.`,
    `Links for the deuterocanonical books (Tobias, Judith, Wisdom, Ecclesiasticus, Baruch, 1–2 Machabees and the Greek parts of Esther and Daniel) are the verses cited in Haydock's commentary and Challoner's notes, listed below.`])+
  sec('The Fathers and commentary',[
    `<b>Catena Aurea</b> of St. Thomas Aquinas, English translation edited by John Henry Newman, Oxford, 1841–45. Public domain.`,
    `<b>Writings of the Fathers</b> in 19th-century translations: the Ante-Nicene Fathers (1885–96), the Nicene and Post-Nicene Fathers (1886–1900) and the Library of the Fathers (Oxford, 1838–81). Public domain. Passages and their verse links come from the ${L('https://github.com/HistoricalChristianFaith','Historical Christian Faith')} databases; we kept only passages whose words we found in the cited 19th-century text, and left out machine translations.`,
    `<b>Haydock's Catholic Bible Commentary</b>, George Leo Haydock, 1859 edition. Public domain.`,
    `<b>Challoner's notes</b> to the Douay-Rheims (1749–52), from ${L('https://www.gutenberg.org/ebooks/1581','Project Gutenberg eBook #1581')}. Public domain.`])+
  sec('Saints',[
    `The General Roman Calendar of saints from ${L('https://github.com/romcal/romcal','romcal')} (MIT license, ${lic('romcal-MIT.txt')}).`,
    `<b>The Roman Martyrology</b>, English translation of 1908 (public domain), text from ${L('https://github.com/DivinumOfficium/divinum-officium','Divinum Officium')} (MIT license, ${lic('divinum-officium-MIT.txt')}).`,
    `Profiles, dates and patronages were written for this app with the help of AI and checked against public sources: the Catholic Encyclopedia (1907–14, public domain), Butler's Lives of the Saints, Wikidata (CC0) and Wikipedia (${L('https://creativecommons.org/licenses/by-sa/4.0/','CC BY-SA')}). Mistakes are possible; corrections are welcome.`,
    `The emblems were drawn for this app after the traditional symbols listed in F. C. Husenbeth, <i>Emblems of Saints</i> (1882).`])+
  `<div class="section"><h3>Words of the saints</h3><p class="cred" style="margin-top:0">Most quotations are copied word for word from public-domain English translations and were checked against them. Where no free English translation exists, the words were translated for Seventy-Three from the original Latin, Greek, French, Italian or Spanish, with the help of AI, and checked against the original by a second review. Those quotations say so, and their original text is one tap away. These translations are under CC BY 4.0.</p>${works?`<ul class="credlist">${works}</ul>`:'<p class="hint">Loading the list…</p>'}</div>`+
  sec('Calendar and readings',[
    `Liturgical days, ranks, colours and national calendars from the ${L('https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI','Liturgical Calendar API')} by John R. D'Orazio and contributors (Apache License 2.0, ${lic('litcal-Apache-2.0.txt')}).`,
    `Reading references from the Liturgical Calendar API's lectionary data and the ${L('https://github.com/jayarathina/Tamil-Catholic-Lectionary','Tamil Catholic Lectionary')} (public domain, The Unlicense), cross-checked with ${L('https://github.com/sawirricardo/sate','sate')} (MIT license, ${lic('sate-MIT.txt')}) and against the <i>Ordo Lectionum Missae</i> (1981). The readings are shown in the Douay-Rheims text.`])+
  sec('Design',[
    `Fonts: EB Garamond (Georg Duffner and Octavio Pardo) and Manrope (Mikhail Sharanda), both under the ${L('https://openfontlicense.org','SIL Open Font License 1.1')}.`,
    `Book icons and the app design were made for Seventy-Three.`]);
}
/* ---- Search ---- */
function renderSearch(){
  $('#main').innerHTML=topBar('Search','Verses, books, saints and their words')+
    `<form class="searchbox" id="searchform"><input id="q" type="search" placeholder="John 3:16, Psalm 22, Augustine, or a phrase" value="${esc(V.q||'')}" autocomplete="off" aria-label="Search"><button class="btn primary" type="submit">Go</button></form><div id="results"></div>`;
  searchResults();const q=$('#q');if(q&&!V.q)q.focus();
}
const plain=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function searchResults(){
  const box=$('#results');if(!box)return;
  const q=(V.q||'').trim();
  if(!q){box.innerHTML=`<div class="sect">Try</div>${['John 1:1','Psalm 22','Augustine','Thérèse','charity','shepherd'].map(s=>`<button class="res" data-q="${esc(s)}"><div class="body"><b>${esc(s)}</b></div></button>`).join('')}`;return}
  let out='';const r=parseRef(q);
  if(r){
    const b=BK[r.code];
    if(r.g>=0&&r.v)out+=`<div class="sect">Verse</div><button class="res" data-verse="${r.g}">${bookAv(b.code,'sm',true)}<div class="body"><b>${refLabel(r.g)}</b><div class="verse">${esc(T(r.g))}</div></div></button>`;
    else if(r.v)out+=`<div class="notice">${esc(b.name)} ${r.c}:${r.v} is not in the Douay-Rheims. ${b.code==='PSA'?'Psalm numbers here follow the Vulgate, usually one lower than Hebrew numbering.':''}</div>`;
    else if(r.c&&!r.bad)out+=`<div class="sect">Chapter</div><button class="res" data-read="${b.code}" data-c="${r.c}"><div class="body"><b>Read ${esc(bname(b))} ${r.c}</b><div class="hint">${b.ch[r.c-1]} verses</div></div></button>`;
    out+=`<div class="sect">Book</div><button class="bookrow" data-book="${b.code}">${bookAv(b.code,'sm',true)}<div><b>${esc(b.name)}</b><span>@${b.handle} · ${b.ch.length} chapters</span></div></button>`;
  }
  const pq=plain(q);
  let ss=[];
  if(pq.length>=3){
    ss=PEOPLE().filter(s=>plain(s.n).includes(pq)||plain(s.h).includes(pq.replace(/\s/g,''))).slice(0,12);
    if(ss.length)out+=`<div class="sect">Saints and writers</div>`+ss.map(s=>`<button class="bookrow" data-acct="${esc(s.id)}">${accAv(s,'sm',true)}<div><b>${esc(s.n)}</b><span>${s.f?esc(feastLabel(s))+' · ':''}${esc(s.bio||'')}</span></div></button>`).join('');
  }
  const words=q.toLowerCase().split(/\s+/).filter(w=>w.length>=3);
  if(r&&r.c&&r.bad&&!r.v){const b=BK[r.code];out=`<div class="notice">${esc(bname(b))} ${r.c} is not in the Douay-Rheims. ${esc(b.name)} has ${b.ch.length} chapters.</div>`+out}
  if(words.length&&!(r&&(r.v||r.c))){
    const re=new RegExp('('+words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');
    const qh=QUOTES.filter(x=>words.every(w=>x.t.toLowerCase().includes(w))).slice(0,15);
    if(qh.length)out+=`<div class="sect">Words of the saints</div>`+qh.map(x=>`<button class="res" data-quote="${x.i}">${accAv(ACC[x.s],'sm',true)}<div class="body"><b>${esc((ACC[x.s]||{}).n||'')}</b><div class="verse">${esc(trunc(x.t,240)).replace(re,'<mark>$1</mark>')}</div></div></button>`).join('');
    const hits=[];
    for(let g=0;g<TOTAL&&hits.length<40;g++){const t=T(g).toLowerCase();if(words.every(w=>t.includes(w)))hits.push(g)}
    if(hits.length)out+=`<div class="sect">${hits.length>=40?'First 40 verses':hits.length+' verses'} containing “${esc(words.join(' '))}”</div>`+hits.map(g=>`<button class="res" data-verse="${g}"><div class="body"><b>${refLabel(g)}</b><div class="verse">${esc(T(g)).replace(re,'<mark>$1</mark>')}</div></div></button>`).join('');
    else if(!r&&!qh.length&&!ss.length)out+='<div class="empty">Nothing found. The Douay-Rheims uses older forms like "charity", "Isaias" or "Noe".</div>';
  }
  box.innerHTML=out;
}

/* ---- Books & saints directories ---- */
function renderBooks(){
  let html=`<button class="today" data-go="saints"><div class="body"><div class="d">Saints</div><div class="n">${SAINTS.length.toLocaleString(LOC)} saints and blesseds</div><div class="hint">Browse by name, feast day or type</div></div></button>`;
  Object.entries(CATS).forEach(([k,l])=>{
    const list=BOOKS.filter(b=>b.cat===k);
    html+=`<div class="sect">${esc(l)} · ${list.length}</div>`+list.map(b=>`<button class="bookrow" data-book="${b.code}">${bookAv(b.code,'sm',true)}<div><b>${esc(b.name)}</b><span>@${b.handle}${b.dr!==b.name?` · ${esc(b.dr)}`:''} · ${b.ch.length} chapters${b.deut?' · Deuterocanonical':''}</span></div></button>`).join('');
  });
  $('#main').innerHTML=topBar('Books and saints','The Catholic canon, Douay-Rheims 1899')+html;
}
function renderSaints(){
  const f=plain(V.sq||''),t=V.st||'';
  let list=PEOPLE().filter(s=>(!t||s.t===t)&&(!f||plain(s.n).includes(f)||plain(s.bio||'').includes(f)||(s.p||[]).some(p=>plain(p).includes(f))));
  list.sort((a,b)=>(b.grc?1:0)-(a.grc?1:0)||a.n.localeCompare(b.n));
  const shown=list.slice(0,V.smore||60);
  $('#main').innerHTML=topBar('Saints and writers',`${SAINTS.length.toLocaleString(LOC)} saints and blesseds, plus Church writers`)+
    `<div class="filterbox"><input id="sq" type="search" placeholder="Search by name, patronage or place" value="${esc(V.sq||'')}" aria-label="Filter saints" autocomplete="off"></div>
     <div class="mixrow"><div class="seg" role="group" aria-label="Type">${[['','All'],...Object.entries(TYPES).filter(([k])=>PEOPLE().some(s=>s.t===k))].map(([k,l])=>`<button data-stype="${k}" aria-pressed="${t===k}">${esc(l)}</button>`).join('')}</div></div>
     <div id="saintlist">${saintRows(shown,list.length)}</div>`;
}
function saintRows(shown,total){return shown.map(s=>`<button class="bookrow" data-acct="${esc(s.id)}">${accAv(s,'sm',true)}<div><b>${esc(s.n)}</b><span>${s.f?esc(feastLabel(s))+' · ':''}${esc(s.bio||'')}</span></div></button>`).join('')+(total>shown.length?`<button class="earlier" data-smore="1">Show more (${total-shown.length} left)</button>`:'')+(total?'':'<div class="empty">No saints match.</div>')}

function renderRail(){
  if(!BIBLE)return;
  const cats=Object.entries(CATS).map(([k,l])=>`<span style="--cat:var(--c-${k})"><i></i>${esc(l)}</span>`).join('');
  const ss=saintsOn(mmdd(todayKey())).slice(0,8);
  $('#rail').innerHTML=`
    ${ss.length?`<div class="card"><h3>Saints today</h3>${ss.map(s=>`<button class="bookrow" style="padding:6px 0" data-acct="${esc(s.id)}">${accAv(s,'sm',true)}<div><b>${esc(s.n)}</b><span>${esc(trunc(s.bio||'',70))}</span></div></button>`).join('')}<button class="linkbtn" data-go="today">Open today</button></div>`:''}
    <div class="card"><h3>73 books${SAINTS.length?`, ${SAINTS.length.toLocaleString(LOC)} saints`:''}</h3>
      <p>Every verse of the Douay-Rheims is a post by its book. Other books reply with cross-references, and the Fathers and saints comment in their own words.</p>
      <p>Your likes, bookmarks and notes stay on this device.</p>
      <p><button class="linkbtn" data-go="credits">Sources and credits</button></p></div>
    <div class="card"><h3>The books</h3><div class="minigrid">${BOOKS.map(b=>`<button class="av" style="--cat:var(--c-${b.cat})" data-book="${b.code}" title="${esc(b.name)}" aria-label="${esc(b.name)}">${svg(b.icon)}</button>`).join('')}</div><div class="legend">${cats}</div></div>
`;
}

function focusKey(el){
  const main=document.getElementById('main');
  if(!el||el===document.body||!main||!main.contains(el))return null;
  if(el.id)return '#'+CSS.escape(el.id);
  for(const a of ['like','mark','xsort','xfilt','ffilt','ptab','btab','atab','mtab','tab','mix','calsel','dlall','export','verse','quote','trailpos','moreref','fmore','alltrail','bookmore','follow','stype','expand','orig','smore','cmore','mmore','plandone','planstart','planreset','speak','savenote','editnote','img','copy','read'])
    if(el.dataset&&el.dataset[a]!=null)return `[data-${a}="${CSS.escape(el.dataset[a])}"]`;
  return null;
}
function focusHeading(){const h=document.querySelector('#main h1')||document.querySelector('#main .logo');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}}
const strips=()=>[...document.querySelectorAll('#main .tabs,#main .mixrow .seg')];
function render(){
  if(!BIBLE||!S)return;
  pending=false;
  const fk=focusKey(document.activeElement),sl=strips().map(x=>x.scrollLeft);
  const n=V.name;
  if(n==='verse')renderVerse();
  else if(n==='quote')renderQuote();
  else if(n==='acct')renderAcct();
  else if(n==='book')renderBook();
  else if(n==='chapter')renderChapter();
  else if(n==='search')renderSearch();
  else if(n==='books')renderBooks();
  else if(n==='saints')renderSaints();
  else if(n==='today')renderToday();
  else if(n==='me')renderMe();
  else if(n==='credits')renderCredits();
  else renderFeed();
  savePrefs();
  strips().forEach((x,i)=>{if(sl[i]!=null)x.scrollLeft=sl[i];const b=x.querySelector('[aria-pressed="true"]');if(!b||x.scrollWidth<=x.clientWidth)return;const sr=x.getBoundingClientRect(),br=b.getBoundingClientRect();if(br.left<sr.left||br.right>sr.right)x.scrollLeft+=br.left-sr.left-(sr.width-br.width)/2});
  if(fk){const el=document.querySelector(fk);if(el){if(el!==document.activeElement)el.focus({preventScroll:true})}else focusHeading()}
}
