/* ================= Navigation ================= */
function scrollToFocus(){
  const f=(V.name==='verse'&&(V.trail||[]).length?document.querySelector('#main .focus'):null)
    ||(V.name==='chapter'&&V.hl!=null?document.getElementById('rv'+V.hl):null);
  if(!f){window.scrollTo(0,0);return}
  const top=document.querySelector('.top'),pt=document.querySelector('#main .ptabs');
  let off=top?top.offsetHeight:0;
  window.scrollTo(0,Math.max(0,f.getBoundingClientRect().top+window.scrollY-off-(V.name==='chapter'?60:0)));
}
function go(view){stopSpeaking();hist.push({view:V,y:window.scrollY});V=view;render();scrollToFocus();
  const ff=document.getElementById('ffocus');if(ff){const top=document.querySelector('.top');window.scrollTo(0,Math.max(0,ff.getBoundingClientRect().top+window.scrollY-(top?top.offsetHeight:0)-60))}
  focusHeading()}
function goBack(){stopSpeaking();const prev=hist.pop();V=prev?prev.view:{name:'feed'};render();window.scrollTo(0,prev?prev.y:0);focusHeading()}
window.__s73Back=()=>{if(V.name!=='feed'||hist.length){goBack();return true}if(S&&S.tab!=='foryou'){S.tab='foryou';render();window.scrollTo(0,0);return true}return false};
function openVerse(g,trail,ptab,ffocus){go({name:'verse',g,trail:trail||[],ptab:ptab||'scripture',ffocus:ffocus||null})}

const inField=()=>document.activeElement&&/TEXTAREA|INPUT/.test(document.activeElement.tagName);
function softRender(){if(inField())pending=true;else render()}

/* ================= Files: images and backups =================
   On claude.ai files are saved through the page's download permission; elsewhere the phone's share sheet or a normal download. */
/* inside the Android app (window.S73Native) files go to the gallery (images) or Downloads (backups) */
const NATIVE=window.S73Native||null;
const blobB64=blob=>new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]||'');r.onerror=no;r.readAsDataURL(blob)});
async function saveFile(blob,filename){
  if(NATIVE){const where=NATIVE.saveFile(filename,blob.type||'application/octet-stream',await blobB64(blob));if(!where)throw new Error('not saved');toast('Saved to '+where);return false}
  const dl=window.claude&&window.claude.use?await window.claude.use('downloads').catch(()=>null):null;
  if(dl){try{await dl.save({filename,data:blob});return true}catch(e){if(e&&e.code==='declined')return false;throw e}}
  const file=typeof File==='function'?new File([blob],filename,{type:blob.type}):null;
  if(file&&navigator.canShare&&/image/.test(blob.type)&&matchMedia('(pointer:coarse)').matches&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file]});return true}catch(e){if(e&&e.name==='AbortError')return false}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);return true;
}
async function exportBackup(){
  const blob=new Blob([JSON.stringify(backupData(),null,1)],{type:'application/json'});
  try{if(await saveFile(blob,`seventy-three-backup-${todayKey()}.json`))toast('Backup saved')}catch(e){toast('The backup could not be saved')}
}
async function importBackup(file){
  if(!file)return;
  try{const d=JSON.parse(await file.text());const n=restoreData(d);render();toast(`Loaded ${n.bookmarks} bookmarks, ${n.notes} notes, ${n.following} follows`)}
  catch(e){toast('That file is not a Seventy-Three backup')}
}

/* ================= Offline (installed version only) ================= */
const PWA=!!window.S73_PWA;
const OFFLINE={on:false,have:0,total:0,mb:0,busy:false,info:null};
async function offlineCheck(){
  if(!PWA||!('caches' in window))return;
  OFFLINE.on=true;
  try{
    const info=OFFLINE.info||(OFFLINE.info=await getJSON('data/offline.json'));
    const codes=Object.keys(info.fathers);let have=0,left=0;
    for(const c of codes){if(await caches.match(`data/fathers/${c}.json`,{ignoreSearch:true}))have++;else left+=info.fathers[c]}
    OFFLINE.have=have;OFFLINE.total=codes.length;OFFLINE.mb=Math.max(1,Math.round(left/1e6));
  }catch(e){}
  if(V.name==='me')softRender();
}
async function saveAllOffline(){
  if(OFFLINE.busy||!OFFLINE.info)return;OFFLINE.busy=true;render();
  try{if(navigator.storage&&navigator.storage.persist)await navigator.storage.persist()}catch(e){}
  let failed=0;
  try{
    const cache=await caches.open(OFFLINE.info.fcache);
    const todo=[];for(const c of Object.keys(OFFLINE.info.fathers))if(!(await caches.match(`data/fathers/${c}.json`,{ignoreSearch:true})))todo.push(c);
    const worker=async()=>{while(todo.length){const c=todo.shift();const url=`data/fathers/${c}.json`;
      try{const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw 0;await cache.put(url,r);OFFLINE.have++;if(V.name==='me'&&!inField())render()}catch(e){failed++}}};
    await Promise.all([worker(),worker(),worker()]);
  }catch(e){failed++}
  OFFLINE.busy=false;await offlineCheck();render();
  toast(failed?'Some books could not be saved. Check your connection and try again.':'All commentary is saved for offline use');
}
function startOffline(){
  if(!PWA||!('serviceWorker' in navigator))return;
  const hadController=!!navigator.serviceWorker.controller;let told=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(told||!hadController)return;told=true;toast('Updated. The new version opens next time.')});
  navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(offlineCheck).catch(()=>{});
}

/* ================= National calendars ================= */
const NATCAL={},NATCAL_ERR={},NATLOAD={};
function loadNat(c){
  if(!c||c==='GRC'||NATCAL[c]||NATLOAD[c])return;
  NATLOAD[c]=getJSON(`data/calendar_${c}.json`).then(d=>{NATCAL[c]=d;softRender()}).catch(()=>{NATCAL_ERR[c]=true;delete NATLOAD[c];softRender()});
}

/* ================= Images and reading aloud ================= */
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function wrapLines(ctx,text,width){const words=text.split(/\s+/),lines=[];let line='';words.forEach(w=>{const t=line?line+' '+w:w;if(ctx.measureText(t).width>width&&line){lines.push(line);line=w}else line=t});if(line)lines.push(line);return lines}
function imageFor(id){
  if(/^v\d+$/.test(id)){const g=+id.slice(1);return {text:T(g),ref:refLabel(g)+' · Douay-Rheims',by:bookOf(g).name,file:refLabel(g)}}
  if(/^q/.test(id)&&QBY[id.slice(1)]){const q=QBY[id.slice(1)],a=ACC[q.s];return {text:q.t,ref:q.w+(q.l?', '+q.l:''),by:a?a.n:'',file:(a?a.h:'quote')}}
  const m=/^f:(\d+):(\d+)$/.exec(id);if(m){const g=+m[1],F=FCACHE[bookOf(g).code]||{},it=(F[g]||[])[+m[2]];if(it){const a=authorAcc(it[1]);return {text:trunc(it[2],700),ref:'On '+refLabel(g),by:a?a.n:'',file:(a?a.h:'commentary')+' '+refLabel(g)}}}
  return null;
}
async function saveImage(id){
  const d=imageFor(id);if(!d)return;
  try{await document.fonts.load('48px "EB Garamond"')}catch(e){}
  const W=1080,Hh=1350,c=document.createElement('canvas');c.width=W;c.height=Hh;const x=c.getContext('2d');
  const bg=cssVar('--surface')||'#fff',fg=cssVar('--fg')||'#151922',mu=cssVar('--muted')||'#5b6474',ac=cssVar('--gold')||'#7d5e10';
  x.fillStyle=bg;x.fillRect(0,0,W,Hh);x.fillStyle=ac;x.fillRect(90,140,8,120);
  let size=58;x.font=`${size}px "EB Garamond", Georgia, serif`;let lines=wrapLines(x,d.text,W-200);
  while(lines.length*size*1.32>820&&size>30){size-=4;x.font=`${size}px "EB Garamond", Georgia, serif`;lines=wrapLines(x,d.text,W-200)}
  x.fillStyle=fg;let y=Math.max(200,(Hh-lines.length*size*1.32)/2-60);lines.forEach(l=>{x.fillText(l,110,y);y+=size*1.32});
  x.font='700 30px Manrope, system-ui, sans-serif';x.fillStyle=mu;x.fillText(d.by,110,y+50);x.font='600 26px Manrope, system-ui, sans-serif';x.fillText(d.ref,110,y+92);
  x.font='500 34px "EB Garamond", Georgia, serif';x.fillStyle=ac;x.fillText('Seventy-Three',110,Hh-90);
  c.toBlob(async blob=>{if(!blob)return;try{if(await saveFile(blob,(d.file.replace(/[^\w]+/g,'-').toLowerCase()||'verse')+'.png'))toast('Image saved')}catch(e){toast('The image could not be saved')}},'image/png');
}
function speechText(key){
  if(/^v\d+$/.test(key))return T(+key.slice(1));
  if(/^q/.test(key)&&QBY[key.slice(1)])return QBY[key.slice(1)].t;
  const m=/^c([0-9A-Z]{3})(\d+)$/.exec(key);if(m){const b=BK[m[1]],c=+m[2],s=b.start+b.cum[c-1];let t='';for(let i=0;i<b.ch[c-1];i++)t+=T(s+i)+' ';return t}
  return '';
}
function stopSpeaking(){try{if(NATIVE)NATIVE.stopSpeaking();else if(window.speechSynthesis)speechSynthesis.cancel()}catch(e){}speaking=null}
window.__s73SpeechEnd=()=>{if(speaking){speaking=null;softRender()}};
function toggleSpeak(key){
  if(NATIVE){
    if(speaking===key){stopSpeaking();render();return}
    stopSpeaking();if(!NATIVE.canSpeak()){toast('Install an English voice in the phone settings to listen');return}
    speaking=key;NATIVE.speak(speechText(key));render();return}
  if(!('speechSynthesis' in window)){toast('Reading aloud is not available in this browser');return}
  if(speaking===key){stopSpeaking();render();return}
  stopSpeaking();const u=new SpeechSynthesisUtterance(speechText(key));u.rate=.95;u.lang='en-US';
  u.onend=()=>{if(speaking===key){speaking=null;softRender()}};u.onerror=u.onend;
  speaking=key;try{speechSynthesis.speak(u)}catch(e){speaking=null;toast('Reading aloud is not available here')}
  render();
}

/* ================= Events ================= */
let pending=false,ptrDown=false;
function flushPending(){if(pending&&!ptrDown&&!inField())render()}
document.addEventListener('pointerdown',()=>{ptrDown=true},true);
const ptrUp=()=>{ptrDown=false;if(pending)setTimeout(flushPending,0)};
document.addEventListener('pointerup',ptrUp,true);
document.addEventListener('pointercancel',ptrUp,true);
document.addEventListener('focusout',()=>{if(pending&&!ptrDown)setTimeout(flushPending,50)});
document.addEventListener('keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[role="link"][tabindex]')){e.preventDefault();e.target.click()}
});
document.addEventListener('click',async e=>{
  const a=e.target.closest('a.vref');if(a){e.preventDefault();e.stopPropagation();openVerse(+a.dataset.g);return}
  const t=e.target.closest('a,button,[data-verse],[data-trailpos],[data-quote],[data-go],[data-acct]');if(!t||!BIBLE||!S)return;
  const d=t.dataset;
  if(t.tagName==='A'){if(t.target==='_blank'||/^https?:/.test(t.getAttribute('href')||''))return;e.preventDefault()}
  if(d.tab){S.tab=d.tab;hist.length=0;V={name:'feed'};render();window.scrollTo(0,0);return}
  if(d.mix){S.mix=d.mix;render();return}
  if(d.go){const v={name:d.go};if(d.mtab)v.mtab=d.mtab;go(v);return}
  if(d.book){e.stopPropagation();go({name:'book',code:d.book});return}
  if(d.acct){e.stopPropagation();if(V.name==='acct'&&V.id===d.acct)return;if(ACC[d.acct])go({name:'acct',id:d.acct});return}
  if(d.like){e.stopPropagation();if(toggleLike(d.like))render();return}
  if(d.mark){e.stopPropagation();if(toggleBookmark(d.mark)){render();toast(M.me.bookmarks[d.mark]?'Saved to your bookmarks':'Removed from bookmarks')}return}
  if(d.follow){e.stopPropagation();if(toggleFollow(d.follow))render();return}
  if(d.img){e.stopPropagation();if(/^f:/.test(d.img))await loadFathers(bookOf(+d.img.split(':')[1]).code);saveImage(d.img);return}
  if(d.speak){toggleSpeak(d.speak);return}
  if(d.xsort){S.xsort=d.xsort;V.more=10;render();return}
  if(d.xfilt){S.xfilt=d.xfilt;V.more=10;render();return}
  if(d.ffilt){S.ffilt=d.ffilt;V.fmore=15;V.ffocus=null;render();return}
  if(d.moreref){V.more=(V.more||10)+10;render();return}
  if(d.fmore){V.fmore=(V.fmore||15)+15;render();return}
  if(d.cmore){V.cmore=(V.cmore||30)+30;render();return}
  if(d.smore){V.smore=(V.smore||(V.name==='today'?12:60))+60;render();return}
  if(d.mmore){V.mmore=true;render();return}
  if(d.expand){expanded[d.expand]=!expanded[d.expand];render();return}
  if(d.alltrail){V.allTrail=true;render();return}
  if(d.ptab){V.ptab=d.ptab;V.focus=null;render();return}
  if(d.btab){V.btab=d.btab;render();return}
  if(d.atab){V.atab=d.atab;render();return}
  if(d.mtab){V.mtab=d.mtab;render();return}
  if(d.stype!=null){V.st=d.stype;V.smore=60;render();return}
  if(d.bookmore){V.page=(V.page||0)+1;render();return}
  if(d.day){V.date=d.day;V.mmore=false;V.smore=12;render();window.scrollTo(0,0);return}
  if(d.calsel){S.cal=d.calsel;loadNat(S.cal);render();return}
  if(d.dlall){saveAllOffline();return}
  if(d.export){exportBackup();return}
  if(d.planstart){M.me.plan={start:todayKey(),done:{}};saveMe();render();toast('Plan started: day 1 is today');return}
  if(d.planreset){M.me.plan=null;saveMe();render();return}
  if(d.plandone){const n=+d.plandone;M.me.plan.done=M.me.plan.done||{};if(M.me.plan.done[n])delete M.me.plan.done[n];else M.me.plan.done[n]=1;saveMe();render();return}
  if(d.editnote){V.editNote=true;render();const n=$('#note-text');if(n)n.focus();return}
  if(d.savenote){const g=+d.savenote,v=($('#note-text')||{}).value||'';if(v.trim())M.me.notes['v'+g]=v.trim();else delete M.me.notes['v'+g];V.editNote=false;saveMe();render();toast(v.trim()?'Note saved':'Note removed');return}
  if(d.read){go({name:'chapter',code:d.read,c:+d.c,hl:d.hl!=null?+d.hl:null});return}
  if(d.copy){const g=+d.copy,txt=`“${T(g)}” (${refLabel(g)}, Douay-Rheims)`;try{if(NATIVE)NATIVE.copy(txt);else await navigator.clipboard.writeText(txt);toast('Copied')}catch(err){toast('Copy is not available here')}return}
  if(d.q){V.q=d.q;const q=$('#q');if(q)q.value=d.q;searchResults();return}
  if(t.id==='back'){goBack();return}
  if(d.trailpos!=null){const pos=+d.trailpos,trail=V.trail||[];go({name:'verse',g:trail[pos],trail:trail.slice(0,pos),ptab:'scripture'});return}
  if(d.quote){go({name:'quote',id:d.quote});return}
  if(d.verse!=null&&d.verse!==''){
    const g=+d.verse;
    if(d.from!=null&&V.name==='verse'){const base=[...(V.trail||[]),+d.from];if(d.via!=null)base.push(+d.via);openVerse(g,base)}
    else openVerse(g,[],d.ptabgo,d.ffocus);
    return}
});
document.addEventListener('input',e=>{
  const el=e.target;
  if(el.id==='q'){V.q=el.value;clearTimeout(window._sq);window._sq=setTimeout(searchResults,180)}
  if(el.id==='sq'){V.sq=el.value;V.smore=60;clearTimeout(window._ss);window._ss=setTimeout(()=>{const f=plain(V.sq||''),t=V.st||'';const list=SAINTS.filter(s=>(!t||s.t===t)&&(!f||plain(s.n).includes(f)||plain(s.bio||'').includes(f)||(s.p||[]).some(p=>plain(p).includes(f)))).sort((a,b)=>(b.grc?1:0)-(a.grc?1:0)||a.n.localeCompare(b.n));const box=$('#saintlist');if(box)box.innerHTML=saintRows(list.slice(0,60),list.length)},150)}
});
document.addEventListener('change',e=>{if(e.target.id==='importfile'){importBackup(e.target.files&&e.target.files[0]);e.target.value=''}});
document.addEventListener('submit',e=>{
  e.preventDefault();const f=e.target;
  if(f.id==='searchform'){const r=parseRef(V.q||'');if(r&&r.g>=0&&r.v)openVerse(r.g);else if(r&&r.c&&!r.bad)go({name:'chapter',code:r.code,c:r.c});else searchResults()}
});

/* Pull to refresh and endless scroll on the feeds */
let pulling=0,refreshing=false,touchY=null,wheelAcc=0,wheelT=0;
function showPull(px){const el=$('#ptr');if(!el)return;el.style.height=Math.min(px,70)+'px';el.textContent=px>=60?'Release to load new posts':'Pull to load new posts'}
function doRefresh(){
  if(refreshing||V.name!=='feed'||!S)return;refreshing=true;
  const el=$('#ptr');if(el){el.style.height='44px';el.innerHTML='<span class="dots"><i></i><i></i><i></i></span> Loading new posts'}
  setTimeout(()=>{try{const n=S.tab==='following'?0:loadNewOnTop();render();window.scrollTo(0,0);toast(n?n+' new posts at the top':'Up to date')}finally{refreshing=false}},550);
}
function toast(msg){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=msg;t.hidden=false;clearTimeout(t._h);t._h=setTimeout(()=>t.hidden=true,2200)}
window.addEventListener('touchstart',e=>{touchY=S&&window.scrollY<=0&&V.name==='feed'?e.touches[0].clientY:null},{passive:true});
window.addEventListener('touchmove',e=>{if(touchY==null||refreshing)return;pulling=e.touches[0].clientY-touchY;if(pulling>0)showPull(pulling)},{passive:true});
window.addEventListener('touchend',()=>{if(touchY==null)return;if(pulling>=60)doRefresh();else showPull(0);touchY=null;pulling=0});
window.addEventListener('wheel',e=>{
  if(!S||V.name!=='feed'||window.scrollY>0||e.deltaY>=0||refreshing){wheelAcc=0;return}
  const now=Date.now();if(now-wheelT>500)wheelAcc=0;wheelT=now;
  wheelAcc+=-e.deltaY;showPull(wheelAcc/4);
  clearTimeout(window._wh);window._wh=setTimeout(()=>{if(!refreshing)showPull(0);wheelAcc=0},500);
  if(wheelAcc>=260){wheelAcc=0;doRefresh()}
},{passive:true});
let loadingMore=false;
window.addEventListener('scroll',()=>{
  if(loadingMore||!S||V.name!=='feed'||S.tab==='following')return;
  if(window.innerHeight+window.scrollY>document.documentElement.scrollHeight-500){loadingMore=true;try{if(loadMoreBelow())render()}finally{loadingMore=false}}
},{passive:true});

/* ================= Boot ================= */
const getJSON=p=>fetch(p+'?v='+DV).then(r=>{if(!r.ok)throw new Error(p);return r.json()});
async function boot(){
  try{BIBLE=await getJSON('data/bible.json')}
  catch(e){$('#main').innerHTML='<div class="splash"><div><h1>Seventy-Three</h1><p>The Bible text could not be loaded. Check your connection and reload the page.</p></div></div>';return}
  indexBible();
  S=loadPrefs()||freshPrefs();loadLocal();
  if(!S.feed.length)S.feed=[['JOH',1,1],['LUK',1,28],['PSA',22,1],['ISA',53,5],['WIS',3,1],['MAT',16,18]].map(r=>idx(...r)).filter(g=>g>=0).map(g=>({g,why:''}));
  if(S.feed.length<12)S.feed=S.feed.concat(pickMany(12-S.feed.length));
  render();renderRail();startOffline();loadNat(S.cal);
  const later=(p,fn)=>getJSON(p).then(d=>{fn(d);DATA[p.slice(5,-5)]='ok';softRender()}).catch(()=>{DATA[p.slice(5,-5)]='missing';softRender()});
  later('data/saints.json',d=>{indexSaints(d);renderRail()});
  later('data/quotes.json',d=>{indexQuotes(d);if(S.qfeed.length<10)S.qfeed=S.qfeed.concat(pickQuotes(10-S.qfeed.length))});
  later('data/calendar.json',d=>{CAL=d;renderRail()});
  later('data/martyrology.json',d=>{MART=d});
  later('data/fathers/_counts.json',d=>{FCOUNT=d});
  later('data/fathers/_authors.json',d=>{FAUTH=d});
  later('data/credits.json',d=>{CREDITS=d});
  getJSON('data/xrefs.json').then(d=>{XR=d.r;buildScores();softRender()}).catch(()=>{XR_FAILED=true;XR=[];softRender()});
}
boot();
