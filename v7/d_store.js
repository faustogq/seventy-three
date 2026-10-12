/* ================= Preferences (this device only) ================= */
const PKEY='seventy-three-prefs-v2';
let S=null;
function savePrefs(){try{localStorage.setItem(PKEY,JSON.stringify(Object.assign({},S,{feed:S.feed.slice(0,60),qfeed:S.qfeed.slice(0,40),newIds:{}})))}catch(e){}}
function loadPrefs(){try{const s=JSON.parse(localStorage.getItem(PKEY));if(s&&s.v===2){if(!MIX[s.mix])s.mix='balanced';if(!CALS[s.cal])s.cal='GRC';if(s.tab==='social')s.tab='foryou';return s}}catch(e){}return null}
function freshPrefs(){return {v:2,tab:'foryou',mix:'balanced',xsort:'top',xfilt:'all',ffilt:'all',cal:'GRC',rng:(Date.now()%2147483647)|0,feed:[],qfeed:[],newIds:{},seq:1}}

/* ================= Your things (this device only) =================
   Likes, bookmarks, notes, follows and the reading plan never leave the device. */
const emptyMe=()=>({bookmarks:{},notes:{},following:{},plan:null});
const M={mine:{},me:emptyMe()};
const LKEY='seventy-three-local-v2';
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
function cleanMe(d){
  const me=emptyMe();if(!isObj(d))return me;
  ['bookmarks','following'].forEach(k=>{if(isObj(d[k]))Object.entries(d[k]).forEach(([id,ts])=>{if(typeof id==='string'&&id.length<200)me[k][id]=Number(ts)||Date.now()})});
  if(isObj(d.notes))Object.entries(d.notes).forEach(([id,t])=>{if(/^v\d+$/.test(id)&&typeof t==='string'&&t.trim())me.notes[id]=t.slice(0,5000)});
  if(isObj(d.plan)&&/^\d{4}-\d\d-\d\d$/.test(d.plan.start||'')){me.plan={start:d.plan.start,done:{}};if(isObj(d.plan.done))Object.keys(d.plan.done).forEach(n=>{if(+n>=1&&+n<=365)me.plan.done[+n]=1})}
  return me;
}
function cleanLikes(d){const m={};if(isObj(d))Object.keys(d).forEach(id=>{if(id.length<200)m[id]=1});return m}
function loadLocal(){
  try{const d=JSON.parse(localStorage.getItem(LKEY));if(d){M.mine=cleanLikes(d.mine);M.me=cleanMe(d.me)}}catch(e){}
  try{const d=JSON.parse(localStorage.getItem(LKEY+'-me'));if(d&&!Object.keys(M.me.bookmarks).length&&!Object.keys(M.me.notes).length)M.me=cleanMe(d)}catch(e){}
}
let saveWarned=false;
function saveLocal(){
  try{localStorage.setItem(LKEY,JSON.stringify({mine:M.mine,me:M.me}))}
  catch(e){if(!saveWarned){saveWarned=true;toast('This browser is not keeping your saved items. Private browsing may be on.')}}
}
const saveMe=saveLocal;
function toggleLike(target){if(M.mine[target])delete M.mine[target];else M.mine[target]=1;saveLocal();return true}
const liked=id=>!!M.mine[id];
function toggleBookmark(id){if(M.me.bookmarks[id])delete M.me.bookmarks[id];else M.me.bookmarks[id]=Date.now();saveLocal();return true}
function toggleFollow(id){if(M.me.following[id])delete M.me.following[id];else M.me.following[id]=Date.now();saveLocal();return true}

/* backup: one JSON file the person can keep and load on another device */
function backupData(){return {app:'Seventy-Three',kind:'backup',v:1,saved:new Date().toISOString(),likes:M.mine,me:M.me}}
function restoreData(d){
  if(!isObj(d)||d.kind!=='backup'||!isObj(d.me))throw new Error('not a backup');
  const me=cleanMe(d.me),likes=cleanLikes(d.likes);
  Object.assign(M.me.bookmarks,me.bookmarks);Object.assign(M.me.following,me.following);
  Object.entries(me.notes).forEach(([id,t])=>{const cur=M.me.notes[id];M.me.notes[id]=cur&&cur!==t&&!cur.includes(t)?cur+'\n\n'+t:t});
  if(me.plan&&(!M.me.plan||!M.me.plan.start))M.me.plan=me.plan;
  else if(me.plan&&M.me.plan)Object.assign(M.me.plan.done=M.me.plan.done||{},me.plan.done);
  Object.assign(M.mine,likes);saveLocal();
  return {bookmarks:Object.keys(me.bookmarks).length,notes:Object.keys(me.notes).length,following:Object.keys(me.following).length};
}
