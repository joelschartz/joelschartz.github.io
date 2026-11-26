import {autoResultsState,paneTitleOffset,descriptorColumnWidth,stickyDescriptor,LIMIT,format,text,points,capacity,parseCode,counts,countText,makeCode,seed,mathDemo,emptyDocument,clone,validate,total,possible,filled,linked,removeTask,toCSV,pasteBlock,pinState,DEMO_CATALOGUE,DEFAULT_GRADING,LEVEL_SCALE_GRADING,LEVEL_COLOURS,LEVEL_SWATCHES,MAX_GRADING_LEVELS,levelColour,addGradingInterval,appendGradingLevel,moveGradingLevel,removeGradingInterval,validateGrading,validateCatalogue,levelFor,pupilResult,competencyResult,resultStats,catalogueSelection,thresholdAt,PLAN_CATALOGUE,PLAN_INFO,cycleRoot,subjectName,matchesCompetency,competencyMeta,encodeDocument,upgradeCatalogue,refreshDefaultDemo} from './model.mjs?v=D1.83';
import {layoutPage as layoutGarde,toSVG as gardeSVG,buildPDF as buildGardePDF,fileName as gardeFileName,proposal as gardeProposal,needsUnicode,useUnicodeFont} from './pages-garde.mjs?v=D1.83';
import {PLAN_ONLINE,PLAN_LINKS} from './plan-links.mjs?v=D1.83';

const root=document.getElementById('ge-canvas');
const $=s=>root.querySelector(s);
const vp=$('[data-viewport]'),surface=$('.ge-surface'),world=$('[data-world]'),stage=$('[data-stage]'),board=$('[data-board]');
const headPin=$('[data-pin-head]'),headInner=$('[data-pin-head-inner]'),labelsPin=$('[data-pin-labels]'),cornerPin=$('[data-pin-corner]');
const dialog=$('[data-dialog]'),codeInput=$('[data-document-title]'),fileInput=$('[data-file]');
// D1.53 · Version web : mêmes fichiers sur claude.ai (dans un cadre) et sur un hébergement propre (GitHub Pages).
const APP_VERSION='D1.83',PLAN_PDF='https://www.script.lu/sites/default/files/2026-02/Plan%20d%27etudes%20-%20Enseignement%20fondamental%20%282026%29.pdf',JSPDF_CDN='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
const TOP=(()=>{try{return window.top===window;}catch{return false;}})();
// D1.59 · Version de développement sur GitHub (/grilleeval-dev/) : même adresse que la version des collègues, donc stockage séparé.
const DEV=(()=>{try{return /\/grilleeval-dev\//.test(location.pathname);}catch{return false;}})(),STORE_NS=DEV?'dev:':'';
const FILE_PICKER=TOP&&typeof window.showSaveFilePicker==='function'&&typeof window.showOpenFilePicker==='function';
// D1.64 · Statistiques d’utilisation anonymes (GoatCounter, sans cookie) : seulement sur la version publiée
// (joelschartz.github.io, page principale). Ne sont envoyés que l’ouverture de l’app et le nom de quelques actions,
// jamais un nom d’élève, un titre de test ou une note.
const STATS=TOP&&!DEV&&(()=>{try{return location.hostname==='joelschartz.github.io';}catch{return false;}})();
// D1.65 · Pas de comptage automatique : il enverrait le titre de l’onglet, qui contient le titre du test. On compte l’ouverture à la main, avec un titre fixe.
// D1.71 · Aucun script extérieur dans l’application : une simple requête « pixel » vers GoatCounter, avec des champs fixes.
// GoatCounter : « #toggle-goatcounter » exclut (ou réinclut) ce navigateur, comme le script officiel (même clé « skipgc »).
const STATS_SKIP=(()=>{try{if(STATS&&location.hash==='#toggle-goatcounter'){const off=localStorage.getItem('skipgc')==='t';if(off)localStorage.removeItem('skipgc');else localStorage.setItem('skipgc','t');history.replaceState(null,'',location.pathname+location.search);setTimeout(()=>notice(off?'Statistiques : ce navigateur est de nouveau compté.':'Statistiques : ce navigateur n’est plus compté.'),1200);}return localStorage.getItem('skipgc')==='t';}catch{return false;}})();
function countHit(path,title,event=false){if(!STATS||STATS_SKIP)return;try{const q=new URLSearchParams({p:path,t:title,r:'',s:[screen.width,screen.height,devicePixelRatio||1].join(','),b:'0',rnd:Math.random().toString(36).slice(2,8)});if(event)q.set('e','true');const img=new Image();img.referrerPolicy='no-referrer';img.src='https://grilleeval.goatcounter.com/count?'+q;}catch{}}
if(STATS)setTimeout(()=>countHit('/grilleeval/','GrilleÉval'),800);
const STAT_TITLES={'test-enregistre':'Test enregistré','bilan-affiche':'Bilan affiché','bilan-enregistre':'Bilan enregistré','pdf-exporte':'PDF exporté','visite-guidee':'Visite guidée'};
function track(name){countHit(name,STAT_TITLES[name]||name,true);}
let bilanTracked=false;
let restoredSaved=false,fileHandle=null,fileSaveKind='written',otherTabWarned=false;
const COPY_PREFIX=STORE_NS+'grilleeval-copy:',COPY_LIMIT=12,TAB_ID=Math.random().toString(36).slice(2,10);
const KEY=STORE_NS+'grilleeval-canvas-v2',PREVIOUS=KEY+'-previous',X=900,Y=700,LABEL=360,COL=100,SUM=390,COMP=130,SHEET_GAP=40,LOWER_HEAD=146,LOWER_NAMES=112;
// D1.74 · Premier passage sur cet appareil (aucun test gardé, visite jamais proposée) : on propose une fois la visite guidée.
const TOUR_KEY=STORE_NS+'grilleeval-tour',FIRST_VISIT=(()=>{try{return !localStorage.getItem(KEY)&&!localStorage.getItem(TOUR_KEY);}catch{return false;}})();
let DESCRIPTOR=360,EXTEND=0,descriptorAnimation=0,descriptorTarget=360;
let fileSavedHash='',hadSavedView=false,d,view={zoom:1,x:X-28,y:Y-28},active=null,draft=null,geometry={rows:[],groups:[],width:0,height:0},worldSize={w:6000,h:5000};
let gradeNodes=new Map(),rowNodes=new Map(),columnNodes=new Map(),totalNodes=new Map(),linkNodes=new Map(),linkCountNodes=new Map();
let labelCache=new Map(),headKey='',cornerKey='',lastPinned={showHeader:false,showLabels:false},history=[],future=[];
let saveTimer=null,viewTimer=null,noticeTimer=null,pendingFrame=false,pendingMeasure=false,pan=null,space=false,inside=false,suppressClick=false;
let savedRevision=-1,savedDocumentObject=null;
let storageState='ok',lastSavedDoc='',revision=0,uid=0,mapScale=1,mapOffset={x:0,y:0},selectAllNode=null,afterDialog=null;
let workspaceMounted=false,resultsPanel=null,catalogueFilter={subject:'',cycle:'',section:'',search:'',kind:'',pathway:''},gradingDrag=null;
let catalogueLimit=80,freeOpen=false,freeDraft='',catalogueUsedOnly=false,preferredUsedOnly=false,associationContext=null,transposed=false,appearance='system',filterPanel=null,resultsPin=null,overview=null;
const groupOpen=new Map(),groupLimits=new Map(),autoGroupOpen=new Map();
let autoResultsOnly=false,autoChanging=false,autoReadingId=null,wheelZooming=false,wheelZoomTimer=null;
let scrollSettling=false,scrollIdleTimer=null,setupCatalogueOpen=false;
let hoveredRow=null,hoverPointer=null,hoverMirrors=[];
let cameraDirty=false,scrollHideTooltip=null,scrollFrame={x:0,y:0};
let scrollCache=null,pinsDirty=true,pinLayers={},cornerLayers={};
const bilanMount = $('#ge-bilan-workspace'), bilanFiles = $('[data-bilan-files]');
let bilanPane = null, bilanLoading = null, bilanOrigin = null, bilanLayout = null, bilanOverview = null;
let lastGridCell = null, restoringGridCell = false;


const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=(a,b)=>JSON.stringify([a,b]);
const num=i=>String(i+1).padStart(2,'0');
function icon(name){const paths={close:'<path d="m6 6 8 8m0-8-8 8"/>',frame:'<path d="M3.5 7v-3.5H7M13 3.5h3.5V7M16.5 13v3.5H13M7 16.5H3.5V13"/>',pencil:'<path d="m12.5 3.5 4 4-9 9-4.5.5.5-4.5zM10.5 5.5l4 4"/>',chevron:'<path d="m7 5 5 5-5 5"/>',arrow:'<path d="M4 10h12m-5-5 5 5-5 5"/>',sliders:'<path d="M4 3v4m0 4v6M10 3v8m0 4v2M16 3v2m0 4v8M1.5 7h5M7.5 11h5M13.5 5h5"/>',more:'<circle cx="5" cy="10" r=".75"/><circle cx="10" cy="10" r=".75"/><circle cx="15" cy="10" r=".75"/>'};return `<svg class="ge-line-icon ge-icon-${name}" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;}

const dims=()=>({w:vp.clientWidth||1000,h:vp.clientHeight||650});
const task=id=>d.tasks.find(t=>t.id===id),pupil=id=>d.students.find(p=>p.id===id),competency=id=>d.competencies.find(c=>c.id===id);
// D1.69 · Un message d’avertissement reste jusqu’au prochain message ou jusqu’à un clic sur ✕ ; les autres disparaissent après 6,5 s.
function notice(message,error=false){clearTimeout(noticeTimer);const box=$('[data-message]'),clear=()=>{clearTimeout(noticeTimer);box.textContent='';box.classList.remove('ge-error-message');};box.textContent=message;box.classList.toggle('ge-error-message',error);if(error&&message){const x=document.createElement('button');x.type='button';x.className='ge-message-close';x.setAttribute('aria-label','Fermer le message');x.title='Fermer';x.addEventListener('click',clear);box.append(x);}else noticeTimer=setTimeout(clear,6500);}
// D1.53 · L’indicateur parle du fichier, pas du navigateur : point vert = test enregistré, « Non enregistré » = à enregistrer (clic).
function showSave(pending=false){const node=$('[data-save]');if(!node)return;
 if(!d)return;const unsaved=Boolean(draft?.dirty)||isUnsaved(),local=storageState==='ok';
 const nothing=!unsaved&&(!(d.students.length||d.tasks.length||d.competencies.length)||untouchedDemo());
 node.classList.toggle('ge-unsaved',unsaved);node.disabled=false;node.setAttribute('aria-disabled',String(!unsaved));if(unsaved)node.dataset.action='save';else delete node.dataset.action;node.textContent=unsaved?'Non enregistré':'';
 // D1.58 · Au survol : à quoi sert ce point (bulle immédiate, pas seulement le title du navigateur).
 const state=unsaved?'Des modifications ne sont pas encore dans un fichier. Cliquer pour enregistrer (⌘S / Ctrl+S).':'Ce point montre si le test est enregistré. '+(nothing?'Pour l’instant, il n’y a rien à enregistrer.':fileSaveKind==='exported'?'Vert : le test est téléchargé dans un fichier (dossier Téléchargements).':'Vert : le test est enregistré dans un fichier.');
 const rule=unsaved?'':' Dès qu’une modification n’est pas encore enregistrée, il devient « Non enregistré ».';
 const backup=local?' Une copie de secours est aussi gardée sur cet appareil (Fichier → Copies de secours).':' Ce navigateur ne garde pas de copie de secours : enregistrez souvent.';
 node.dataset.tip=state+rule+backup;node.removeAttribute('title');node.setAttribute('aria-label',node.dataset.tip);}
function storageRead(){
 // D1.48 · L’ancienne liste « Mes évaluations » (D1.43–47) n’est plus utilisée.
 try{localStorage.removeItem?.('grilleeval-library-v1');localStorage.removeItem?.('grilleeval-bilan-v1');}catch{}
 try {const raw=localStorage.getItem(KEY);if(raw){try{const pack=JSON.parse(raw);d=validate(pack.document||pack);if(pack.view&&Number.isFinite(pack.view.zoom)&&Number.isFinite(pack.view.x)&&Number.isFinite(pack.view.y))hadSavedView=true,view={zoom:Math.max(.02,Math.min(1.8,pack.view.zoom)),x:Math.max(0,pack.view.x),y:Math.max(0,pack.view.y)};transposed=pack.ui?.transposed===true;catalogueUsedOnly=preferredUsedOnly=pack.ui?.retainedOnly===true;appearance=['light','dark'].includes(pack.ui?.theme)?pack.ui.theme:'system';fileSavedHash=typeof pack.ui?.saved==='string'?pack.ui.saved:'';restoredSaved=Boolean(fileSavedHash)&&docHash(JSON.stringify(pack.document))===fileSavedHash;lastSavedDoc=encodeDocument(d);}catch(error){const previous=localStorage.getItem(PREVIOUS);if(!previous)throw error;const p=JSON.parse(previous);d=validate(p.document||p);notice('Le précédent enregistrement valide a été récupéré. Exportez un fichier JSON.');}}}
 catch(error){storageState='blocked';if(!d)notice('Le stockage local est indisponible. L’export JSON permet de conserver cette session.',true);}
 if(d){const previous=d;d=refreshDefaultDemo(d);if(d!==previous){view={zoom:1,x:X-28,y:Y-28};lastSavedDoc='';}}if(!d)d=mathDemo();upgradeCatalogue(d);if(restoredSaved)fileSavedHash=docHash(encodeDocument(d));if(lastSavedDoc){const canonical=encodeDocument(d);if(canonical===lastSavedDoc){savedRevision=revision;savedDocumentObject=JSON.parse(canonical);}}applyAppearance();
}
function persist(){clearTimeout(saveTimer);clearTimeout(viewTimer);try{if(!d.evalId)d.evalId=newId('e');const encoded=encodeDocument(d);const pack=JSON.stringify({document:JSON.parse(encoded),view:bilanOrigin?.camera??view,ui:{transposed,retainedOnly:preferredUsedOnly,theme:appearance,saved:fileSavedHash}});if(encoded!==lastSavedDoc){const previous=localStorage.getItem(KEY);if(previous){try{validate(JSON.parse(previous).document);localStorage.setItem(PREVIOUS,previous);}catch{}}}localStorage.setItem(KEY,pack);writeCopy(encoded);lastSavedDoc=encoded;savedRevision=revision;savedDocumentObject=JSON.parse(encoded);storageState='ok';}catch(error){storageState=error?.name==='QuotaExceededError'?'failed':'blocked';}showSave();}
// D1.57 · Une copie de secours par test (clé = evalId) : deux onglets ou deux tests ne s’écrasent plus.
function copyKeys(){const keys=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(COPY_PREFIX))keys.push(k);}}catch{}return keys;}
function readCopies(){return copyKeys().map(k=>{try{const p=JSON.parse(localStorage.getItem(k));return p&&p.document?{key:k,...p}:null;}catch{return null;}}).filter(Boolean).sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));}
function writeCopy(encoded){
 const key=COPY_PREFIX+d.evalId,value=JSON.stringify({document:JSON.parse(encoded),hash:docHash(encoded),savedAt:Date.now(),saved:fileSavedHash,tab:TAB_ID});
 // D1.71 · Faire de la place : d’abord les copies déjà enregistrées dans un fichier, les plus anciennes en premier.
 const prune=keep=>{const old=readCopies().filter(c=>c.key!==key),unsaved=c=>c.saved!==c.hash?1:0;old.sort((a,b)=>unsaved(b)-unsaved(a)||(b.savedAt||0)-(a.savedAt||0));for(const c of old.slice(keep))localStorage.removeItem(c.key);};
 try{localStorage.setItem(key,value);prune(COPY_LIMIT-1);}
 catch(error){if(error?.name!=='QuotaExceededError')throw error;prune(2);localStorage.setItem(key,value);}
}
window.addEventListener('storage',e=>{if(!d||otherTabWarned||e.key!==COPY_PREFIX+d.evalId||!e.newValue)return;try{if(JSON.parse(e.newValue).tab!==TAB_ID){otherTabWarned=true;notice('Ce test est aussi ouvert dans un autre onglet. Gardez un seul onglet ouvert pour ce test.',true);}}catch{}});
// D1.57 · Bilan : copie de secours automatique (dernier bilan) et fichier .json à enregistrer / rouvrir.
const BILAN_KEY=STORE_NS+'grilleeval-bilan-v2';let bilanAutosaveTimer=null,bilanHandle=null;
function readBilanAutosave(){try{const raw=localStorage.getItem(BILAN_KEY);return raw?JSON.parse(raw):null;}catch{return null;}}
function queueBilanAutosave(){clearTimeout(bilanAutosaveTimer);bilanAutosaveTimer=setTimeout(persistBilan,500);}
function persistBilan(){clearTimeout(bilanAutosaveTimer);if(!bilanPane)return;try{if(!bilanPane.testCount()){localStorage.removeItem(BILAN_KEY);return;}localStorage.setItem(BILAN_KEY,JSON.stringify({data:bilanPane.exportBilan(),saved:!bilanPane.isDirty()}));}catch{}}
// D1.57 · Bilans individuels (PDF) : l’élève choisi dans le bilan, sinon toute la classe.
async function bilanReports(workspace){
 const data=workspace.reportData();if(!data?.pupils.length){notice('Ajoutez d’abord des tests au bilan.',true);return;}
 const pupils=data.pupil?data.pupils.filter(p=>p.key===data.pupil):data.pupils;
 try{const [jsPDF,{buildReportPDF,reportFileName,needsUnicodeReport}]=await Promise.all([loadJsPDF(),import('./report-pdf.mjs?v='+encodeURIComponent(APP_VERSION))]);
  const fonts=needsUnicodeReport(data,pupils)?await loadUnicodeFonts():null;
  const ok=await exportFile(buildReportPDF(jsPDF,data,pupils,{fonts}),reportFileName(pupils),'application/pdf');
  if(ok)notice(pupils.length===1?`Bilan individuel de ${pupils[0].name} enregistré (PDF).`:`${pupils.length} bilans individuels enregistrés (PDF).`);}
 catch(error){notice('Les bilans individuels n’ont pas pu être créés : '+error.message,true);}
}
async function saveBilan(workspace,saveAs=false){
 if(!workspace.testCount()){notice('Ajoutez d’abord des tests au bilan.',true);return;}
 const name=`${new Date().toISOString().slice(0,10)} Bilan des compétences.json`,text=JSON.stringify(workspace.exportBilan(),null,1);let result;
 if(FILE_PICKER){try{if(!bilanHandle||saveAs)bilanHandle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'Bilan GrilleÉval',accept:{'application/json':['.json']}}]});const w=await bilanHandle.createWritable();await w.write(new Blob([text],{type:'application/json'}));await w.close();result={written:bilanHandle.name||name};}catch(error){if(error?.name==='AbortError'){notice('Enregistrement annulé.');return;}bilanHandle=null;result=await download(text,name,'application/json');}}
 else result=await download(text,name,'application/json');
 if(!result)return;workspace.markSaved();persistBilan();track('bilan-enregistre');notice(result==='exported'?`Bilan téléchargé : « ${name} ».`:`Bilan enregistré${result.written?` dans « ${result.written} »`:''}.`);
}
function newEvaluation(message='Nouvelle évaluation · annulation possible.'){fileHandle=null;fileSaveKind='written';if(overview)leaveOverview();mutation(()=>{const prev=d;d=emptyDocument('Nouvelle évaluation');d.cycle=prev.cycle;d.grading=clone(prev.grading);d.catalogue=clone(prev.catalogue);if(prev.teacher)d.teacher=prev.teacher;if(prev.school)d.school=prev.school;active=null;transposed=false;resetCatalogueContext();catalogueUsedOnly=false;},message,{shape:true});requestAnimationFrame(()=>frameStart());}
// D1.57 · « Copies de secours… » : les tests gardés sur cet appareil ; en rouvrir un, ou tout effacer (ordinateur partagé).
function openCopies(){
 const copies=readCopies(),when=t=>t?new Date(t).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
 const rows=copies.map((c,i)=>{const doc=c.document;let saved=false,ok=true;try{validate(doc);saved=Boolean(c.hash)&&c.hash===c.saved;}catch{ok=false;}
  const open=doc.evalId&&doc.evalId===d.evalId;const pupils=Array.isArray(doc.students)?doc.students.length:0;
  return `<li class="ge-copy"><div class="ge-copy-text"><strong>${esc(doc.title||'Sans titre')}</strong><small>${esc([doc.date?euroDate(doc.date):'',pupils?`${pupils} élève${pupils>1?'s':''}`:'',`copie du ${when(c.savedAt)}`].filter(Boolean).join(' · '))}</small><small class="${saved?'':'ge-copy-unsaved'}">${ok?(saved?'Enregistré dans un fichier':'Pas encore enregistré dans un fichier'):'Copie illisible'}</small></div>${open?'<span class="ge-copy-open">Ouvert</span>':ok?`<button type="button" class="ge-button" data-copy-open="${i}">Ouvrir</button>`:''}</li>`;}).join('');
 modal({title:'Copies de secours',note:'Gardées dans ce navigateur, sur cet appareil.',content:copies.length?`<ul class="ge-copies">${rows}</ul>`:'<p class="ge-dialog-note">Aucune copie pour l’instant.</p>',cancel:'Fermer',after:copies.length?'<button type="button" class="ge-button ge-quiet ge-copies-clear" data-copies-clear>Tout effacer…</button>':''});
 const clear=dialog.querySelector('[data-copies-clear]');if(clear){dialog.querySelector('.ge-dialog-actions')?.prepend(clear);clear.addEventListener('click',()=>{if(clear.dataset.confirm!=='true'){clear.dataset.confirm='true';clear.textContent='Confirmer : tout effacer';clear.classList.add('ge-remove');return;}afterDialog=()=>guardUnsaved(()=>clearLocalData());dialog.dataset.proceed='true';dialog.close();});}
 for(const button of dialog.querySelectorAll('[data-copy-open]'))button.addEventListener('click',()=>{const c=copies[Number(button.dataset.copyOpen)];afterDialog=()=>guardUnsaved(()=>restoreCopy(c));dialog.dataset.proceed='true';dialog.close();});
}
function restoreCopy(c){try{const next=validate(c.document);upgradeCatalogue(next);mutation(()=>{d=next;active=null;transposed=false;resetCatalogueContext();},`Copie rouverte : ${next.title}.`,{shape:true});fileSavedHash=c.hash&&c.hash===c.saved?docHash(encodeDocument(d)):'';fileHandle=null;fileSaveKind='written';showSave();requestAnimationFrame(()=>frameStart());}catch(error){notice('Cette copie ne peut pas être ouverte : '+error.message,true);}}
function clearLocalData(){for(const k of copyKeys())try{localStorage.removeItem(k);}catch{}try{localStorage.removeItem(KEY);localStorage.removeItem(PREVIOUS);}catch{}newEvaluation('Copies effacées de cet appareil.');history=[];future=[];updateHistory();}
function queueSave(){clearTimeout(saveTimer);showSave(true);saveTimer=setTimeout(persist,300);}
function persistCamera(){if(savedRevision!==revision||!savedDocumentObject){persist();return;}try{localStorage.setItem(KEY,JSON.stringify({document:savedDocumentObject,view:bilanOrigin?.camera??view,ui:{transposed,retainedOnly:preferredUsedOnly,theme:appearance,saved:fileSavedHash}}));}catch(error){storageState=error?.name==='QuotaExceededError'?'failed':'blocked';showSave();}}
function queueViewSave(){clearTimeout(viewTimer);viewTimer=setTimeout(persistCamera,600);}
function normalizeActive(){if(!active)return;if(active.p&&!pupil(active.p)||active.t&&!task(active.t)||active.c&&!competency(active.c))active=null;}
function saveHistory(){history.push(encodeDocument(d));if(history.length>60)history.shift();future=[];}
function mutation(fn,message,{render=true,shape=false,scoreChange=null}={}){saveHistory();fn();revision++;normalizeActive();if(render)renderBoard();else{syncCounts();updateHistory();updateResults(scoreChange);mark();}if(shape)codeInput.value=d.title;queueSave();if(message)notice(message);}
function updateHistory(){const report=bilanOrigin?bilanPane:null;$('[data-action="undo"]').disabled=bilanOrigin?!report?.canUndo():!history.length;$('[data-action="redo"]').disabled=bilanOrigin?!report?.canRedo():!future.length;}
function undo(redo=false){if(bilanOrigin){if(bilanPane&&(redo?bilanPane.redo():bilanPane.undo()))updateHistory();return;}if(!commitDraft())return;const from=redo?future:history,to=redo?history:future;if(!from.length)return;to.push(encodeDocument(d));d=validate(from.pop());revision++;active=null;draft=null;codeInput.value=d.title;renderBoard();queueSave();notice(redo?'Modification rétablie.':'Dernière modification annulée.');}
// D1.57 · Identifiant durable d’un élève : il suit l’élève d’un test à l’autre (copie d’un test, liste de classe).
function newUid(){try{return crypto.randomUUID();}catch{return 'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,12);}}
function newId(prefix){const known=new Set([...d.students,...d.tasks,...d.competencies].map(x=>x.id));let id;do{id=`${prefix}-${Date.now()}-${++uid}`;}while(known.has(id));return id;}
// D1.35 · Une grille vide garde sa forme : exercices et élèves fantômes en gris montrent où va quoi.
const GHOST_TASKS=3,GHOST_PUPILS=6;
function ghostTaskHead(i){return `<button type="button" class="ge-task-head ge-ghost" data-add="task" title="Ajouter des exercices"><span class="ge-task-index">${num(i)}</span><span class="ge-task-name">Exercice ${i+1}</span><span class="ge-task-max">/ — pts</span></button>`;}
// D1.39 · Une case fantôme (là où iront les points) ouvre l’ajout d’exercices, ou d’élèves s’il y a déjà des exercices.
function ghostCell(kind){return `<td class="ge-ghost-cell"><button type="button" class="ge-ghost-add" data-add="${kind}" tabindex="-1" title="${kind==='task'?'Ajouter des exercices':'Ajouter des élèves'}"><span>·</span></button></td>`;}
function ghostPupilHead(i){return `<button type="button" class="ge-task-head ge-student-head ge-ghost" data-add="student" title="Ajouter des élèves"><span class="ge-task-index">${num(i)}</span><span class="ge-task-name">Nom élève ${i+1}</span></button>`;}
function layout(){const primary=transposed?Math.max(1,d.students.length):Math.max(1,d.tasks.length||GHOST_TASKS),secondary=transposed?Math.max(4,d.tasks.length):Math.max(3,d.students.length||GHOST_PUPILS);return {primary,secondary,pw:transposed?COMP:COL,sw:transposed?COL:COMP,all:1+primary+secondary};}
function applyAppearance(){root.style.colorScheme=appearance==='system'?'light dark':appearance;root.dataset.appearance=appearance;const select=$('[data-theme]');if(select)select.value=appearance;}
function paneFrame(name,title){return `<button type="button" class="ge-pane-frame" data-fit-pane="${name}" title="Cadrer le volet ${esc(title)}" aria-label="Cadrer le volet ${esc(title)}">${icon('frame')}</button>`;}
function paneHeading(name,title,count=null,displayTitle=title,frame=true){return `<span class="ge-pane-actions"><button type="button" class="ge-pane-heading" data-focus-pane="${name}" title="Aller à ce volet · conserver le zoom" aria-label="Aller au volet ${esc(title)}">${esc(displayTitle)}${count==null?'':` <small>${count}</small>`}</button>${frame?paneFrame(name,title):''}</span>`;}
function compactPrimary(){return layout().primary*layout().pw<280;}
function upperPinnedHeads(){return `<div class="ge-upper-head-group"><div class="ge-assessment-title ${compactPrimary()?'ge-compact-axis':''}">${paneHeading('points',transposed?'Élèves':'Exercices',transposed?d.students.length:d.tasks.length)}<button type="button" class="ge-button" data-add="${transposed?'student':'task'}">+ ${transposed?'Élève':'Exercice'}</button></div><div class="ge-upper-names">${primaryHeads()}</div></div>`;}

function section(kind){if(kind==='students'&&transposed)kind='tasks';const isP=kind==='students',isT=kind==='tasks',list=isP?d.students:isT?d.tasks:d.competencies;const isC=!isP&&!isT;return `<div class="ge-section ${isC?'ge-competency-section':''}">${paneHeading(isP||isT?'points':'competencies',isP?'Élèves':isT?'Exercices':'Compétences',list.length)}${isC?`<div class="ge-competency-tools"><div class="ge-visibility-switch" role="radiogroup" aria-label="Compétences affichées">${[['selected','Retenues'],['all','Catalogue']].map(([value,label])=>`<button type="button" role="radio" data-competency-visibility="${value}" aria-checked="${catalogueUsedOnly===(value==='selected')}" tabindex="${catalogueUsedOnly===(value==='selected')?0:-1}">${label}</button>`).join('')}</div>${paneFrame('competencies','Compétences')}</div>`:''}<button type="button" class="ge-button" data-add="${isP?'student':isT?'task':'competency'}" title="${isP?'Ajouter un ou plusieurs élèves':isT?'Ajouter un exercice':'Écrire une compétence libre · utiliser Catalogue pour le plan d’études'}" ${isC?'aria-label="Ajouter une compétence"':''}>+<span class="ge-add-word"> ${isP?'Élève':isT?'Exercice':'<span class="ge-add-long">Compétence</span><span class="ge-add-short">Comp.</span>'}</span></button></div>`;}
function pupilHead(p,index){return `<button type="button" class="ge-task-head ge-student-head" data-edit-student="${esc(p.id)}" title="${esc(p.name+' · modifier cet élève')}" data-pupil-column="${esc(p.id)}"><span class="ge-task-index">${num(index)}</span><span class="ge-task-name">${esc(p.name)}</span></button>`;}
function primaryHeads(){return transposed?d.students.map((p,i)=>pupilHead(p,i)).join(''):d.tasks.length?d.tasks.map((t,i)=>taskHead(t,i)).join(''):Array.from({length:GHOST_TASKS},(_,i)=>ghostTaskHead(i)).join('');}
function associationHeaders(){const cols=transposed?layout().secondary:layout().primary;return `<div class="ge-association-head-group ge-lower-head-group" data-task-head-group style="width:${cols*COL}px"><div class="ge-assessment-title">${paneHeading('associations','Exercices associés',null,d.tasks.length<3?'Liens':'Exercices associés')}<button type="button" class="ge-link-button ge-pane-link" data-jump="assessment" aria-label="Voir les compétences par élève" title="Rejoindre les compétences par élève sans changer le zoom">Voir par élève</button></div><div class="ge-association-names">${d.tasks.map((t,i)=>taskHead(t,i)).join('')||(transposed?'<span class="ge-no-tasks">Aucun exercice</span>':Array.from({length:GHOST_TASKS},(_,i)=>ghostTaskHead(i)).join(''))}</div></div>`;}
function lowerHeads(){return transposed?assessmentHeaders()+associationHeaders():associationHeaders()+assessmentHeaders();}

function scoreCell(p,t){return `<td data-column="${esc(t.id)}" data-pupil-column="${esc(p.id)}" data-grade-cell="${esc(key(p.id,t.id))}"><input class="ge-grade${d.scores[p.id]?.[t.id]==='D'?' ge-dispensed':''}" type="text" inputmode="decimal" data-p="${esc(p.id)}" data-t="${esc(t.id)}" value="${format(d.scores[p.id]?.[t.id])}" placeholder="·" autocomplete="off" aria-label="${esc(p.name+' · '+t.title+' / '+format(t.maxPoints))}"></td>`;}
// Before both axes exist, the canvas shows a useful preparation sheet instead
// of squeezed, empty matrices. The established grid takes over automatically.
function needsSetup(){return false;}
function setupSheet(){
 if(!needsSetup())return '';
 const cards=[{kind:'student',title:'Élèves',list:d.students,help:'Collez toute votre liste de noms en une seule fois.',button:'+ Élèves'},{kind:'task',title:'Exercices',list:d.tasks,help:'Donnez un titre et un nombre de points à chaque exercice.',button:'+ Exercice'}];
 return `<section class="ge-setup-sheet" data-setup-sheet style="margin-left:${EXTEND}px" aria-labelledby="ge-setup-title"><header class="ge-setup-intro"><h1 id="ge-setup-title">Préparer l’évaluation</h1></header><div class="ge-setup-cards">${cards.map(c=>`<section class="ge-setup-card ${c.list.length?'ge-setup-done':''}" aria-label="Préparer les ${c.title.toLowerCase()}"><header><div><h2>${c.title}</h2><span>${c.list.length?c.list.length+' '+(c.kind==='student'?'élève':'exercice')+(c.list.length>1?'s':'')+' ajouté'+(c.list.length>1?'s':''):'À ajouter'}</span></div><span class="ge-setup-actions">${c.kind==='student'?'<button type="button" class="ge-button ge-quiet" data-import-csv>Depuis un fichier…</button>':''}<button type="button" class="ge-button ${!c.list.length&&(c.kind==='student'||d.students.length)?'ge-primary':''}" data-add="${c.kind}">${c.button}</button></span></header>${c.list.length?`<div class="ge-setup-list" aria-label="${esc(c.title+' ajoutés')}">${c.list.map(item=>`<button type="button" class="ge-setup-item" data-edit-${c.kind}="${esc(item.id)}"><span>${esc(c.kind==='student'?item.name:item.title)}</span>${c.kind==='task'?`<small>${format(item.maxPoints)} pts</small>`:icon('pencil')}</button>`).join('')}</div>`:''}</section>`).join('')}</div><section class="ge-setup-competencies"><div><h2>Compétences <small data-setup-competency-count>${d.competencies.length?d.competencies.length+' retenue'+(d.competencies.length>1?'s':''):'Facultatif'}</small></h2></div><div class="ge-setup-competency-actions"><button type="button" class="ge-button" data-open-setup-catalogue>Choisir dans le catalogue</button><button type="button" class="ge-button ge-quiet" data-add="competency">Écrire une compétence</button></div></section><footer class="ge-setup-footer"><span>Barème · ${d.grading.labels.length} niveaux</span><button type="button" class="ge-button ge-quiet" data-edit-grading data-direct-control>Configurer le barème</button></footer></section><div class="ge-setup-catalogue-bar" data-setup-catalogue-bar hidden><strong>Choisir les compétences</strong><button type="button" class="ge-button" data-close-setup-catalogue>Revenir à la préparation</button></div>`;
}
function syncSetup(){
 const setup=needsSetup(),catalogue=setup&&setupCatalogueOpen;root.dataset.setup=String(setup);root.dataset.setupCatalogue=String(catalogue);
 hidden(board.querySelector('.ge-points-sheet'),setup);hidden(board.querySelector('.ge-competencies-sheet'),setup&&!catalogue);hidden($('[data-setup-catalogue-bar]'),!catalogue);hidden(filterPanel,catalogueUsedOnly||setup&&!catalogue);const banner=$('[data-setup-catalogue-bar]');if(banner)banner.style.width=Math.min(920,DESCRIPTOR+d.tasks.length*COL)+'px';
 const sheet=$('[data-setup-sheet]');if(sheet)sheet.style.width=Math.min(920,Math.max(320,dims().w-64))+'px';
 const sparse=!d.students.length||!d.tasks.length,transposeButton=$('[data-action="transpose"]');transposeButton.disabled=sparse&&!transposed;transposeButton.title=sparse?'Ajouter des élèves et des exercices pour transposer':'Échanger les élèves et les exercices, sans modifier les données';
 for(const b of root.querySelectorAll('[data-map-shortcuts] [data-focus-pane]')){b.disabled=setup&&!['points','competencies'].includes(b.dataset.focusPane);if(b.dataset.focusPane==='points')b.textContent=setup?'Préparation':'Points';}
 const count=$('[data-setup-competency-count]');if(count)count.textContent=d.competencies.length?d.competencies.length+' retenue'+(d.competencies.length>1?'s':''):'Facultatif';
}
function openSetupCatalogue(){if(!needsSetup())return;setupCatalogueOpen=true;syncSetup();measure();}
function closeSetupCatalogue(){setupCatalogueOpen=false;syncSetup();measure();startSetup();}
function startSetup(){const v=dims(),w=Math.min(920,Math.max(320,v.w-64));view.zoom=1;updateScale();vp.scrollLeft=Math.max(0,X-Math.max(24,(v.w-w)/2));vp.scrollTop=Math.max(0,Y-48);rememberCamera();schedule();}
function home(){if(bilanOrigin)return revealBilanResults();if(!commitDraft())return;if(overview)leaveOverview();closeMenus();active=null;if(needsSetup())startSetup();else panTo(X,Y);mark();}
function transpose(){if(!commitDraft())return;if(overview)leaveOverview();const lower=vp.scrollTop/view.zoom>=(geometry.groups.find(g=>g.kind==='competencies')?.y??Infinity);transposed=!transposed;active=null;draft=null;renderBoard();root.dataset.transposed=String(transposed);$('[data-action="transpose"]').setAttribute('aria-pressed',String(transposed));panTo(X,lower?(geometry.groups.find(g=>g.kind==='competencies')?.y??Y):Y);queueViewSave();notice(transposed?'Élèves en colonnes · exercices en lignes':'Exercices en colonnes · élèves en lignes');}
function label(kind,id){if(kind==='task'){const t=task(id),i=d.tasks.findIndex(t=>t.id===id);return t?`<button type="button" class="ge-label ge-task-label" data-edit-task="${esc(id)}"><span class="ge-row-index">${num(i)}</span><span class="ge-label-text">${esc(t.title)}<small>/ ${format(t.maxPoints)} pts</small></span><span class="ge-pencil" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M10.9 2.6 13.4 5.1 5.6 12.9l-3.1.6.6-3.1z"/></svg></span></button>`:'';}if(kind==='candidate'){const entry=d.catalogue.find(c=>c.id===id);return entry?catalogueLabel(entry):'';}const p=kind==='student',list=p?d.students:d.competencies,index=list.findIndex(x=>x.id===id),entry=list[index];if(!entry)return '';return `<button type="button" class="ge-label ${p?(entry.absent?'ge-absent':''):'ge-descriptor'}" data-edit-${p?'student':'competency'}="${esc(id)}" aria-label="Modifier ${p?'l’élève':'la compétence'} ${index+1}"><span class="ge-row-index">${p?index+1:'C'+num(index)}</span><span class="ge-label-text">${esc(p?entry.name:entry.text)}</span>${p&&entry.absent?'<small class="ge-absent-tag">absent</small>':''}<span class="ge-pencil" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M10.9 2.6 13.4 5.1 5.6 12.9l-3.1.6.6-3.1z"/></svg></span></button>`;}
function taskHead(t,index){return `<button type="button" class="ge-task-head" data-edit-task="${esc(t.id)}" title="${esc(t.title+' · / '+format(t.maxPoints)+' pts · modifier cet exercice')}"><span class="ge-task-index">${num(index)}</span><span class="ge-task-name">${esc(t.title)}</span><span class="ge-task-max">/ ${format(t.maxPoints)} pts</span><span class="ge-edit-affordance">${icon('pencil')}</span></button>`;}
// D1.30 · Dates affichées et saisies à l’européenne (12.10.2026), stockées en ISO.
function euroDate(iso){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');return m?`${m[3]}.${m[2]}.${m[1]}`:(iso||'');}
function isoDate(value){const v=String(value||'').trim();if(!v)return '';let m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v),y,mo,da;if(m)[,y,mo,da]=m;else{m=/^(\d{1,2})[.\/\-\s](\d{1,2})[.\/\-\s](\d{2}|\d{4})$/.exec(v);if(!m)throw new Error('Date : JJ.MM.AAAA, par exemple 12.10.2026.');[,da,mo,y]=m;if(y.length===2)y='20'+y;}
 const date=new Date(Date.UTC(Number(y),Number(mo)-1,Number(da)));if(date.getUTCFullYear()!==Number(y)||date.getUTCMonth()!==Number(mo)-1||date.getUTCDate()!==Number(da))throw new Error('Date invalide : JJ.MM.AAAA.');
 return `${y}-${String(mo).padStart(2,'0')}-${String(da).padStart(2,'0')}`;}
function syncCounts(){const c=counts(d);codeInput.value=d.title;$('[data-document-title-text]').textContent=d.title;root.dataset.demo=String(Boolean(d.demoId));$('[data-document-meta]').textContent=[d.subject,'Cycle '+d.cycle,euroDate(d.date),d.duration].filter(Boolean).join(' · ');root.dataset.students=String(c[0]);root.dataset.tasks=String(c[1]);root.dataset.competencies=String(c[2]);root.dataset.revision=String(revision);document.title=`${d.title} · GrilleÉval`;}

let textContext=null,descriptorFont='14px system-ui';const descriptorMeasureCache=new Map();
let descriptorMeasure=text=>{
 if(!textContext){try{textContext=document.createElement('canvas').getContext?.('2d');}catch{}}
 if(!textContext)return String(text).length*7;
 textContext.font=descriptorFont;const key=descriptorFont+'\n'+text;if(!descriptorMeasureCache.has(key))descriptorMeasureCache.set(key,textContext.measureText(text).width);return descriptorMeasureCache.get(key);
};
// D1.27 · Une seule largeur pour la colonne fixe, en haut (noms) comme en bas (compétences).
// Elle ne dépend que du zoom et de la largeur de la vue, jamais du texte ni du défilement.
// Écran = min(base × zoom, part × vue), au moins COLUMN_MIN px, au plus la colonne native.
const COLUMN_DEFAULT={base:280,cap:.25},COLUMN_MIN=120,COLUMN_MAX_SHARE=.6,READING=480,READING_MAX=920;
function viewWidth(){return scrollCache?.v.w||vp.clientWidth||1000;}
function pinnedWidth(zoom=view.zoom,width=viewWidth()){
 const p=COLUMN_DEFAULT;
 const screen=Math.max(COLUMN_MIN,Math.min(p.base*zoom,p.cap*width));
 return Math.min(LABEL,screen/zoom);
}
// Paliers de place (px du monde) : sous 360 la méta latérale cède sa place au texte, sous 260 « + Élève » devient « + ».
// Largeur du texte lui-même (le nom de catégorie s’étire en flex : scrollWidth donnerait la boîte).
function textWidth(node,z){if(!node||!document.createRange)return 0;try{const r=document.createRange();r.selectNodeContents(node);return r.getBoundingClientRect().width/z;}catch{return 0;}}
// « Compétences 5 ⊡ … + Comp. » tient sur une ligne à partir de 280 px du monde.
const FRAME_ROOM=280;
function columnRoom(width){return width>=359.5?'full':width>=260?'narrow':'tight';}
function upperAt(scrollX,zoom=view.zoom){
 return stickyDescriptor(LABEL,X*zoom-scrollX,zoom,pinnedWidth(zoom));
}
function descriptorAt(scrollX,zoom=view.zoom){
 return stickyDescriptor(DESCRIPTOR,(X-EXTEND)*zoom-scrollX,zoom,pinnedWidth(zoom));
}
function paneSide(name,rect,zoom=view.zoom){
 if(rect.x<=X+1)return 0;
 return pinnedWidth(zoom);
}
function applyDescriptorWidth(width,refresh=true){
 DESCRIPTOR=width;EXTEND=width-LABEL;const base=geometry.width||LABEL+layout().primary*layout().pw+layout().secondary*layout().sw;
 board.style.left=(X-EXTEND)+'px';board.style.width=(base+EXTEND)+'px';
 const upper=board.querySelector('.ge-points-sheet'),lower=board.querySelector('.ge-competencies-sheet');
 if(upper){upper.style.marginLeft=EXTEND+'px';upper.style.setProperty('--sheet-visible',(LABEL+layout().primary*layout().pw+(transposed?0:SUM))+'px');}if(lower){lower.style.width=(needsSetup()?width+d.tasks.length*COL:base+EXTEND)+'px';lower.querySelector('col').style.width=width+'px';}const setup=board.querySelector('[data-setup-sheet]');if(setup)setup.style.marginLeft=EXTEND+'px';
 root.dataset.descriptorWidth=String(width);if(refresh){measure();updatePins();}
}
// D1.28 · Largeur pleine de la colonne de lecture (non fixée), étendue vers la gauche sur le plan infini :
// chaque descripteur du catalogue filtré (matière, cycle…) tient en deux lignes, et chaque catégorie montre
// son nom, « x sur y retenues » et « Plan d’études p. » avec un écart. Indépendant des catégories ouvertes,
// de Retenues/Catalogue, de la recherche et du défilement ; plafonné pour rester lisible sur un écran.
function measureIn(font,text){const previous=descriptorFont;descriptorFont=font;try{return descriptorMeasure(text);}finally{descriptorFont=previous;}}
function readingWidth(){
 const font=node=>node&&window.getComputedStyle?window.getComputedStyle(node).font||null:null;
 const textFont=font(board.querySelector('.ge-competencies-sheet .ge-descriptor-line .ge-label-text'))||descriptorFont;
 const filter={...catalogueFilter,section:'',search:''};
 const texts=d.catalogue.filter(e=>matchesCompetency(e,filter)).map(e=>catalogueSelection(d,e)?.text||e.text);
 for(const c of d.competencies)texts.push(c.text);if(freeOpen&&freeDraft.trim())texts.push(freeDraft);
 const lines=descriptorColumnWidth(texts.map(displayDescriptor),text=>measureIn(textFont,text),{min:READING,max:READING_MAX,padding:172});
 const sample=board.querySelector('.ge-competencies-sheet .ge-category-heading'),nameFont=font(sample?.querySelector('strong'))||'600 14px system-ui',smallFont=font(sample?.querySelector('button>span:last-child'))||'12px system-ui';
 const groups=new Map();for(const e of d.catalogue.filter(e=>matchesCompetency(e,filter))){const key=e.subject+'::'+(e.section||'Personnalisées');if(!groups.has(key))groups.set(key,{title:e.section||'Personnalisées',rows:[]});groups.get(key).rows.push(e);}
 let headings=0;
 for(const g of groups.values()){const n=g.rows.length,first=g.rows[0],shared=Boolean(first?.page)&&g.rows.every(e=>e.page===first.page);
  const need=80+40+measureIn(nameFont,g.title)+measureIn(smallFont,`${n} sur ${n} retenues`)+(shared?8+measureIn(smallFont,planHref(first)?'Plan d’études ↗':'Plan d’études p. '+(first.printedPage||first.page-2)):0);
  headings=Math.max(headings,need);}
 return Math.min(READING_MAX,Math.max(lines,Math.ceil(headings)));
}
function finishDescriptorResize(){if(Math.abs(DESCRIPTOR-descriptorTarget)>.01){descriptorAnimation++;applyDescriptorWidth(descriptorTarget);}}
function resizeDescriptors(animate=true,refresh=true){
 const sample=board.querySelector('.ge-descriptor-line .ge-label-text');if(sample&&window.getComputedStyle)descriptorFont=window.getComputedStyle(sample).font;
 const target=Math.max(needsSetup()?620:0,readingWidth()),start=DESCRIPTOR,serial=++descriptorAnimation;descriptorTarget=target;
 if(Math.abs(target-start)<.01)return;
 const motion=animate&&root.dataset.ready==='true'&&window.matchMedia&&window.performance&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!motion){applyDescriptorWidth(target,refresh);return;}
 const began=window.performance.now();
 const frame=now=>{if(serial!==descriptorAnimation)return;const t=Math.min(1,Math.max(0,(now-began)/180)),ease=1-Math.pow(1-t,3);applyDescriptorWidth(start+(target-start)*ease);if(t<1)requestAnimationFrame(frame);};requestAnimationFrame(frame);
}
function renderBoard(){
 const camera={left:vp.scrollLeft,top:vp.scrollTop};cornerPin.replaceChildren();const {primary:n,secondary:m,pw,sw,all}=layout(),width=Math.max(LABEL+n*pw+m*sw,needsSetup()?Math.min(920,Math.max(320,dims().w-64)):0);board.style.width=(width+EXTEND)+'px';board.style.left=(X-EXTEND)+'px';
 root.dataset.transposed=String(transposed);$('[data-action="transpose"]').setAttribute('aria-pressed',String(transposed));
 const columns=`<colgroup><col style="width:${LABEL}px">${Array.from({length:n},()=>`<col style="width:${pw}px">`).join('')}${Array.from({length:m},()=>`<col style="width:${sw}px">`).join('')}</colgroup>`;
 let top;
 if(transposed){
 const rows=d.tasks.map(t=>`<tr data-row-kind="task" data-row-group="students" data-row-id="${esc(t.id)}"><th>${label('task',t.id)}</th>${d.students.length?d.students.map(p=>scoreCell(p,t)).join(''):'<td></td>'}</tr>`).join('')||`<tr><td colspan="${1+n}" class="ge-empty">Aucun exercice</td></tr>`;
 top=`<thead><tr><th class="ge-board-document" aria-hidden="true"></th><th colspan="${n}"><div class="ge-section ${compactPrimary()?'ge-compact-axis':''}">${paneHeading('points','Élèves',d.students.length)}<button type="button" class="ge-button" data-add="student">+ Élève</button></div></th></tr><tr data-column-chart><th class="ge-chart-side">${verticalResultHeader()}</th>${d.students.map(p=>`<td class="ge-column-chart-cell" data-summary-pupil="${esc(p.id)}">${summaryContent(p)}</td>`).join('')||'<td class="ge-column-chart-empty">Aucun élève</td>'}</tr><tr data-group-header="students"><th>${section('tasks')}</th>${d.students.map((p,i)=>`<th data-pupil-column="${esc(p.id)}">${pupilHead(p,i)}</th>`).join('')||'<th>Ajouter un élève avec +</th>'}</tr></thead><tbody data-grade-rows>${rows}</tbody>`;
 }else{
 const rows=d.students.map(p=>`<tr data-row-kind="student" data-row-id="${esc(p.id)}"><th>${label('student',p.id)}</th>${d.tasks.length?d.tasks.map(t=>scoreCell(p,t)).join(''):Array.from({length:n},()=>ghostCell('task')).join('')}<td class="ge-inline-result-cell" colspan="3"><div class="ge-score-result"><span data-total="${esc(p.id)}">${format(total(d,p.id))}${filled(d,p.id)!==d.tasks.length?'*':''}</span>${rowResult(p)}</div></td></tr>`).join('')||Array.from({length:GHOST_PUPILS},(_,i)=>`<tr class="ge-ghost-row"><th><button type="button" class="ge-label ge-ghost" data-add="student" title="Ajouter des élèves"><span class="ge-row-index">${num(i)}</span><span class="ge-label-text">Nom élève ${i+1}</span></button></th>${Array.from({length:n},()=>ghostCell(d.tasks.length?'student':'task')).join('')}<td class="ge-inline-result-cell" colspan="3"></td></tr>`).join('');
 top=`<thead><tr><th class="ge-board-document" aria-hidden="true"></th><th colspan="${n}"><div class="ge-section ge-task-section ${compactPrimary()?'ge-compact-axis':''}">${paneHeading('points','Exercices',d.tasks.length)}<button type="button" class="ge-button" data-add="task">+ Exercice</button></div></th><th colspan="3" class="ge-total-title"><strong>Maximum</strong>${format(possible(d))} pts</th></tr><tr data-group-header="students"><th>${section('students')}</th>${taskHeaders()}<th colspan="3" data-inline-results-head>${resultHeader()}</th></tr></thead><tbody data-grade-rows>${rows}</tbody>`;
 }
 const lower=needsSetup()?`${d.tasks.length?`<th colspan="${d.tasks.length}" class="ge-association-band" data-association-heading>${associationHeaders()}</th>`:''}`:transposed?`<th colspan="${n}" data-assessment-heading>${assessmentHeaders()}</th><th colspan="${m}" data-association-heading>${associationHeaders()}</th>`:`<th colspan="${n}" class="ge-association-band" data-association-heading>${associationHeaders()}</th><th colspan="${m}" data-assessment-heading>${assessmentHeaders()}</th>`;
 const lowerColumns=needsSetup()?`<colgroup><col style="width:${DESCRIPTOR}px">${d.tasks.map(()=>`<col style="width:${COL}px">`).join('')}</colgroup>`:columns.replace(`width:${LABEL}px`,`width:${DESCRIPTOR}px`);
 board.innerHTML=`<table class="ge-grid ge-points-sheet" style="width:${width}px;margin-left:${EXTEND}px;--sheet-visible:${LABEL+layout().primary*layout().pw+(transposed?0:SUM)}px" aria-label="Points et résultats des élèves">${columns}${top}<tbody><tr class="ge-class-summary"><td colspan="${1+n+(transposed?0:3)}" class="ge-class-footcell"><div class="ge-class-rail" data-class-rail><div class="ge-class-strip"><button type="button" class="ge-summary-jump" data-jump="results" aria-label="Résultats de la classe" title="Voir les résultats et régler le barème"><span>Résultats de la classe</span><span aria-hidden="true">Classe</span></button><div data-result-stats><span>Moyenne <b data-class-stat="mean"></b></span><span>Médiane <b data-class-stat="median"></b></span><span>Taux de réussite <b data-class-stat="success"></b></span></div><span data-complete-count></span></div></div></td></tr></tbody></table><table class="ge-grid ge-competencies-sheet" style="width:${needsSetup()?DESCRIPTOR+d.tasks.length*COL:width+EXTEND}px" aria-label="Associations et résultats des compétences">${lowerColumns}<tbody><tr data-group-header="competencies"><th>${section('competencies')}</th>${lower}</tr></tbody><tbody data-links-rows data-catalogue-rows>${catalogueRows(all)}</tbody></table>`;
 filterPanel.innerHTML=catalogueTools();syncSetup();syncCatalogueOptions();indexBoard();updateCatalogueStatus();headKey='';cornerKey='';cornerPin.replaceChildren();labelCache.clear();labelsPin.replaceChildren();geometry.width=width;resizeDescriptors();syncCounts();updateHistory();syncWorkspace();measure();vp.scrollLeft=camera.left;vp.scrollTop=camera.top;mark();schedule(true);
}
function indexBoard(){
 pinsDirty=true;
 gradeNodes=new Map();rowNodes=new Map();columnNodes=new Map();totalNodes=new Map();linkNodes=new Map();linkCountNodes=new Map();
 for(const e of board.querySelectorAll('input[data-p]'))gradeNodes.set(key(e.dataset.p,e.dataset.t),e);
 for(const e of board.querySelectorAll('[data-row-id]'))rowNodes.set(`${e.dataset.rowKind}:${e.dataset.rowId}`,e);
 for(const e of board.querySelectorAll('[data-column]')){const id=e.dataset.column;if(!columnNodes.has(id))columnNodes.set(id,[]);columnNodes.get(id).push(e);}
 for(const e of board.querySelectorAll('[data-total]'))totalNodes.set(e.dataset.total,e);
 for(const e of board.querySelectorAll('input[data-c]'))linkNodes.set(key(e.dataset.c,e.dataset.t),e);
 for(const e of board.querySelectorAll('[data-links-count]'))linkCountNodes.set(e.dataset.linksCount,e);
}
// Catalogue-only changes do not alter points, pupil labels or either header.
// Keep their nodes and indexes, and replace only the detached lower-row entries.
function indexCatalogue(){
 const body=board.querySelector('[data-catalogue-rows]');
 for(const identity of rowNodes.keys())if(!identity.startsWith('student:')&&!identity.startsWith('task:'))rowNodes.delete(identity);
 for(const [id,nodes]of columnNodes){const kept=nodes.filter(node=>node.isConnected);if(kept.length)columnNodes.set(id,kept);else columnNodes.delete(id);}
 for(const e of body.querySelectorAll('[data-row-id]'))rowNodes.set(`${e.dataset.rowKind}:${e.dataset.rowId}`,e);
 for(const e of body.querySelectorAll('[data-column]')){const id=e.dataset.column;if(!columnNodes.has(id))columnNodes.set(id,[]);columnNodes.get(id).push(e);}
 linkNodes=new Map([...body.querySelectorAll('input[data-c]')].map(e=>[key(e.dataset.c,e.dataset.t),e]));
 linkCountNodes=new Map([...body.querySelectorAll('[data-links-count]')].map(e=>[e.dataset.linksCount,e]));
}
function measure(){
 if(bilanOrigin){measureBilan();return;}
 if(needsSetup())syncSetup();const br=board.getBoundingClientRect(),z=view.zoom;
 const local=e=>{const r=e.getBoundingClientRect();return {y:(r.top-br.top)/z,h:r.height/z};};
 const studentHead=board.querySelector('[data-group-header="students"]');const headHeight=studentHead.offsetHeight||112;geometry.studentHeaderHeight=headHeight;
 geometry.studentTitleHeight=transposed?0:(board.querySelector('.ge-points-sheet>thead>tr:first-child')?.offsetHeight||0);
 const rawHeight=board.offsetHeight||240+d.students.length*33+d.competencies.length*100;
 geometry.height=rawHeight;geometry.rows=[];
 for(const e of board.querySelectorAll('[data-row-id]')){const m=local(e);geometry.rows.push({kind:e.dataset.rowKind,id:e.dataset.rowId,group:e.dataset.rowGroup||(e.dataset.rowKind==='student'?'students':'competencies'),y:Y+m.y,h:m.h|| (['student','task'].includes(e.dataset.rowKind)?40:100)});}
 geometry.groups=[];
 for(const kind of ['students','competencies']){const head=board.querySelector(`[data-group-header="${kind}"]`),m=local(head),rows=geometry.rows.filter(r=>r.group===kind);const fallback=kind==='students'?65:180+d.students.length*33;const headerY=m.h?Y+m.y:Y+fallback;const h=m.h||(kind==='students'?headHeight:112);const bottom=rows.length?Math.max(...rows.map(r=>r.y+r.h)):headerY+h+45;geometry.groups.push({kind,y:headerY,h,bottom});}
 if(geometry.groups.length===2)geometry.groups[0].bottom=geometry.groups[1].y-SHEET_GAP;
 geometry.bounds={x:X-EXTEND-320,y:Y,w:geometry.width+EXTEND+320,h:geometry.height};
 // Folding must not shrink the scroll range and let the browser clamp the camera.
 worldSize={w:Math.max(autoResultsOnly?worldSize.w:0,6000,X+geometry.width+1500),h:Math.max(autoResultsOnly?worldSize.h:0,5000,Y+geometry.height+1300)};
 stage.style.width=worldSize.w+'px';stage.style.height=worldSize.h+'px';updateScale();drawMap();prepareScroll();
}
function updateScale(){world.style.width=worldSize.w*view.zoom+'px';world.style.height=worldSize.h*view.zoom+'px';stage.style.transform=`scale(${view.zoom})`;root.dataset.zoom=view.zoom.toFixed(4);$('[data-zoom-label]').textContent=Math.round(view.zoom*100)+' %';}
function schedule(measureToo=false){pendingMeasure||=measureToo;if(pendingFrame)return;pendingFrame=true;requestAnimationFrame(()=>{pendingFrame=false;if(pendingMeasure){pendingMeasure=false;measure();}updatePins();updateMap();if(cameraDirty){cameraDirty=false;scrollHideTooltip?.();rememberCamera(scrollFrame);}});}
function zoomTo(value,anchor){const v=dims(),a=anchor||{x:v.w/2,y:v.h/2};const at={x:(vp.scrollLeft+a.x)/view.zoom,y:(vp.scrollTop+a.y)/view.zoom};view.zoom=Math.max(.02,Math.min(1.8,value));updateScale();vp.scrollLeft=Math.max(0,at.x*view.zoom-a.x);vp.scrollTop=Math.max(0,at.y*view.zoom-a.y);rememberCamera();schedule(true);}
function panTo(x,y,center=false){const v=dims();vp.scrollLeft=Math.max(0,x*view.zoom-(center?v.w/2:26));vp.scrollTop=Math.max(0,y*view.zoom-(center?v.h/2:26));rememberCamera();schedule();}
function rememberCamera(camera){view.x=(camera?camera.x:vp.scrollLeft)/view.zoom;view.y=(camera?camera.y:vp.scrollTop)/view.zoom;if(!bilanOrigin)queueViewSave();}
function jump(kind){if(needsSetup()&&['students','tasks','results','barème'].includes(kind)){if(!commitDraft())return;startSetup();return;}if(kind==='assessment')return showAssessment(true);if(overview)leaveOverview();if(kind==='catalogue'||kind==='competencies')return jumpCatalogue();if(['results','barème'].includes(kind))return jumpWorkspace(kind);if(!commitDraft())return;const g=geometry.groups.find(g=>g.kind===(kind==='competencies'?'competencies':'students'));panTo(kind==='tasks'?X+LABEL-70:X,kind==='competencies'?(g?.y??Y):Y);notice(kind==='competencies'?'Compétences · textes complets et associations':kind==='tasks'?'Exercices · cliquer un intitulé pour le modifier':'Élèves · points par exercice');}
function leaveOverview(){if(!overview)return;const prev=overview;overview=null;catalogueUsedOnly=prev.usedOnly;groupOpen.clear();for(const [k,v]of prev.groups)groupOpen.set(k,v);view={...prev.view};renderBoard();updateScale();vp.scrollLeft=view.x*view.zoom;vp.scrollTop=view.y*view.zoom;$('[data-action="fit"]').innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4"/></svg>';$('[data-action="fit"]').setAttribute('aria-pressed','false');$('[data-action="fit"]').setAttribute('aria-label','Vue d’ensemble');$('[data-action="fit"]').title='Cadrer le plan · cliquer à nouveau pour revenir';schedule(true);}
function fit(){if(bilanOrigin)return fitBilan();if(!commitDraft())return;autoResultsOnly=false;autoGroupOpen.clear();finishDescriptorResize();if(overview){leaveOverview();return;}overview={view:{...view,x:vp.scrollLeft/view.zoom,y:vp.scrollTop/view.zoom},usedOnly:catalogueUsedOnly,groups:[...groupOpen]};catalogueUsedOnly=true;groupOpen.clear();renderBoard();measure();const v=dims(),b=geometry.bounds;zoomTo(Math.min((v.w-72)/b.w,(v.h-72)/b.h,1));panTo(b.x+b.w/2,b.y+b.h/2,true);$('[data-action="fit"]').innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4 3.5 7.5 7 11"/><path d="M3.5 7.5H12a4.5 4.5 0 0 1 0 9H9"/></svg>';$('[data-action="fit"]').setAttribute('aria-pressed','true');$('[data-action="fit"]').setAttribute('aria-label','Revenir à la vue précédente');$('[data-action="fit"]').title='Revenir à la position et au zoom précédents';}

// Layout is read only during measure(), never in the scrolling pass.
function css(node,key,value){if(node&&node.style[key]!==value)node.style[key]=value;}
function data(node,key,value){if(node&&node.dataset[key]!==String(value))node.dataset[key]=String(value);}
function hidden(node,value){if(node&&node.hidden!==value)node.hidden=value;}
function inactive(node,value){if(node.hasAttribute('inert')!==value){if(value)node.setAttribute('inert','');else node.removeAttribute('inert');}}
function move(node,x,y=0,z=1){css(node,'transform',`translate3d(${x}px,${y}px,0) scale(${z})`);}
function prepareScroll(){
 const z=view.zoom,v=dims();
 css($('[data-scroll-pins]'),'width',v.w+'px');css($('[data-scroll-frame]'),'height',v.h+'px');
 if(pinsDirty){
  pinsDirty=false;headInner.replaceChildren();cornerPin.replaceChildren();labelsPin.replaceChildren();labelCache.clear();
  for(const kind of ['students','competencies']){
   const layer=document.createElement('div');layer.dataset.pinLayer=kind;layer.innerHTML=kind==='students'?upperPinnedHeads():lowerHeads();headInner.append(layer);pinLayers[kind]=layer;
   const corner=document.createElement('div');corner.dataset.cornerLayer=kind;corner.innerHTML=section(kind);cornerPin.append(corner);cornerLayers[kind]=corner;
  }
  for(const row of geometry.rows.filter(r=>r.group!=='competencies')){const node=document.createElement('div');node.className='ge-floating-label';node.dataset.hoverRow=row.kind+':'+row.id;node.innerHTML=rowNodes.get(row.kind+':'+row.id)?.querySelector('th')?.innerHTML||label(row.kind,row.id);labelsPin.append(node);labelCache.set(row.kind+':'+row.id,node);}
 }
 const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return{x:(r.left+vp.scrollLeft)/z,y:(r.top-vp.getBoundingClientRect().top+vp.scrollTop)/z,w:r.width/z,h:r.height/z};};
 const lower=geometry.groups.find(g=>g.kind==='competencies'),matrix=rect(board.querySelector('[data-association-heading]')),results=rect(board.querySelector('[data-assessment-heading]')),resultsX=rect(board.querySelector('[data-inline-results-head]'))?.x;
 const descriptors=[];
 for(const row of geometry.rows.filter(r=>r.group==='competencies')){const cell=rowNodes.get(row.kind+':'+row.id)?.querySelector('th'),content=cell?.querySelector('.ge-compact-descriptor,.ge-category-heading');if(!content)continue;cell.dataset.hoverRow=row.kind+':'+row.id;let category=null;
  if(content.classList.contains('ge-category-heading')){const name=content.querySelector('strong'),count=content.querySelector('button>span:last-child'),page=content.querySelector('.ge-plan-page');hidden(count,false);hidden(page,false);category={count,page,nameWidth:textWidth(name,z)||name?.scrollWidth||180,countWidth:count?.getBoundingClientRect().width/z||110,pageWidth:page?.getBoundingClientRect().width/z||130};}
  descriptors.push({row,content,category});
 }
 {const head=board.querySelector('.ge-competencies-sheet .ge-competency-section');if(head){css(head,'marginLeft','0px');descriptors.push({row:null,content:head,category:null});}}
 const titles=[];
 for(const band of root.querySelectorAll('.ge-assessment-title,.ge-task-section,.ge-points-sheet thead>tr:first-child>th>.ge-section,.ge-inline-heading,.ge-vertical-heading')){
  if(band.closest('.ge-chart-side'))continue;
  let run=band.querySelector(':scope>[data-pane-run]');if(!run){run=document.createElement('div');run.dataset.paneRun='';while(band.firstChild)run.append(band.firstChild);band.append(run);band.dataset.paneBand='';}
  const isLower=Boolean(band.closest('.ge-competencies-sheet,.ge-lower-head-group')),association=Boolean(band.closest('.ge-association-head-group')),assessment=Boolean(band.closest('.ge-assessment-head-group'));
  let r=rect(band);const pin=band.closest('[data-pin-head]');if(pin){r={x:isLower?(association?matrix?.x:results?.x):X+LABEL,w:isLower?(association?matrix?.w:results?.w):layout().primary*layout().pw};}
  if(band.closest('[data-region="results"]'))r={x:X+LABEL+layout().primary*layout().pw,w:SUM};
  if(!r||!Number.isFinite(r.x))continue;
  css(run,'width','max-content');const full=run.scrollWidth||400,hint=run.querySelector(':scope>small'),hintWidth=hint?.getBoundingClientRect().width/z||0;
  css(run,'width',Math.min(full,r.w)+'px');titles.push({band,run,x:r.x,w:r.w,full,core:Math.max(0,full-hintWidth-(hint?10:0)),hint,lower:isLower});
 }
 headPin.hidden=false;labelsPin.hidden=false;cornerPin.hidden=false;
 css(headPin,'height',LOWER_HEAD*z+'px');css(headPin,'width',v.w+'px');css(headInner,'left','0px');css(headInner,'width',(layout().primary*layout().pw+layout().secondary*layout().sw)+'px');const T0=geometry.studentTitleHeight||0;css(headInner,'height',Math.max(LOWER_HEAD,T0+geometry.studentHeaderHeight)+'px');if(T0)css(pinLayers.students?.querySelector('.ge-assessment-title'),'height',T0+'px');
 for(const [kind,layer]of Object.entries(pinLayers)){css(layer,'width',(layout().primary*layout().pw+(kind==='competencies'?layout().secondary*layout().sw:0))+'px');for(const node of layer.querySelectorAll('.ge-task-head'))css(node,'height',(kind==='students'?geometry.studentHeaderHeight:LOWER_NAMES)+'px');}
 css(labelsPin,'height',v.h+'px');css(labelsPin,'left','0px');css(cornerPin,'height',LOWER_HEAD*z+'px');css(cornerPin,'left','0px');css(cornerPin,'top','0px');
 for(const row of geometry.rows.filter(r=>r.group!=='competencies')){const node=labelCache.get(row.kind+':'+row.id);css(node,'top','0px');css(node,'height',row.h+'px');node?.classList.toggle('ge-even-row',row.kind==='student'&&d.students.findIndex(p=>p.id===row.id)%2===1);}
 const resultRows=geometry.rows.filter(r=>r.kind==='student').map(row=>({row,node:resultsPin?.querySelector(`[data-pin-result-row="${row.id}"]`)}));for(const {row,node}of resultRows){css(node,'top','0px');css(node,'height',row.h+'px');}
 const resultHead=resultsPin?.querySelector('.ge-result-pin-head');css(resultsPin,'left','0px');css(resultsPin,'height',Math.ceil(v.h/z)+'px');css(resultHead,'top','0px');css(resultHead,'height',((geometry.studentTitleHeight||0)+geometry.studentHeaderHeight)+'px');css(resultHead?.querySelector('.ge-result-pin-title'),'height',(geometry.studentTitleHeight||0)+'px');css(resultHead?.querySelector('.ge-inline-results-head'),'height',geometry.studentHeaderHeight+'px');
 const map=$('[data-map-camera]');map.setAttribute('x','0');map.setAttribute('y','0');map.setAttribute('width',String(Math.min(worldSize.w,v.w/z)*mapScale));map.setAttribute('height',String(Math.min(worldSize.h,v.h/z)*mapScale));
 const scoreRows=rect(board.querySelector('[data-grade-rows]'));
 const scoresEnd=scoreRows?.h>0 ? scoreRows.y+scoreRows.h : null;
 const rail=board.querySelector('[data-class-rail]'),complete=rail?.querySelector('[data-complete-count]');
 const {primary,pw}=layout(),sheetWidth=LABEL+primary*pw+(transposed?0:SUM);
 scrollCache={v,matrix,results,lower,descriptors,titles,rail,complete,sheetWidth,scoresEnd,filterHeight:filterPanel?.offsetHeight||490,resultRows,resultHead,map,resultsX,chartSide:transposed?board.querySelector('.ge-chart-side .ge-vertical-results-head'):null};if(hoveredRow)paintRowHover();
}
// D1.24 · Les intitulés partiellement couverts glissent sous la colonne fixe pixel par pixel,
// comme les lignes au défilement vertical (plus de repli sur le numéro).
function updateReadingLayout(cache,zoom,scrollX,upperEdge,lowerEdge,lowerVisible){
 const visibleWidth=rect=>rect?Math.max(0,Math.min(cache.v.w,(rect.x+rect.w)*zoom-scrollX)-Math.max(lowerEdge,rect.x*zoom-scrollX)):0;
 const pupilWidth=visibleWidth(cache.results),exerciseWidth=visibleWidth(cache.matrix);
 const sharedScores=cache.scoresEnd!=null && scrollFrame.y<cache.scoresEnd*zoom;
 const readingPupils=pupilWidth>exerciseWidth || (sharedScores && pupilWidth>=COMP*zoom-1);
 data(root,'readingResults',lowerVisible && zoom>=.55 && pupilWidth>0 && readingPupils && !needsSetup());
 const start=X*zoom-scrollX;
 const {sheetWidth}=cache;
 const shift=Math.max(0,Math.min(sheetWidth,-start/zoom));
 const available=Math.max(0,Math.min(sheetWidth-shift,(cache.v.w-Math.max(0,start))/zoom));
 // Translate two anchors without resizing a DOM box on every pan frame.
 let room='wide';
 if(available<=64)room='empty';
 else if(available<=170)room='link';
 else if(available<=315)room='mean';
 else if(available<=430)room='two';
 else if(available<=620)room='stats';
 else if(available<=740)room='compact';
 data(cache.rail,'room',room);
 move(cache.rail,shift);
 move(cache.complete,available-sheetWidth);
}
function updatePins(){
 if(bilanOrigin){scrollFrame={x:vp.scrollLeft,y:vp.scrollTop};pinBilanHeadings();return;}
 if(!scrollCache)return;const c=scrollCache,z=view.zoom,v=c.v,sx=vp.scrollLeft,sy=vp.scrollTop,left=X*z-sx;
 scrollFrame={x:sx,y:sy};
 const T=geometry.studentTitleHeight||0,UH=T?T+geometry.studentHeaderHeight:LOWER_HEAD,pinH=kind=>kind==='students'?UH:LOWER_HEAD,natH=kind=>kind==='students'&&!T&&geometry.studentHeaderHeight?geometry.studentHeaderHeight:pinH(kind);
 const groups=geometry.groups.map(g=>({...g,screenTop:(g.kind==='students'?g.y-(T||34):g.y)*z-sy,natTop:(g.kind==='students'?g.y-T:g.y)*z-sy,screenBottom:g.bottom*z-sy,headerHeight:g.kind==='students'?(T?T+g.h:g.h+34):g.h}));
 const lowerVisible=groups.some(g=>g.kind==='competencies'&&g.screenBottom>0&&g.screenTop<v.h);
 const fixed=pinnedWidth(z,v.w),upper=upperAt(sx,z);
 const pin=pinState({left,top:Y*z-sy,width:(LABEL+layout().primary*layout().pw+(lowerVisible?layout().secondary*layout().sw:(transposed?400:SUM)))*z,height:geometry.height*z,labelWidth:fixed,groups,zoom:z,viewportWidth:v.w});
 const sticky=descriptorAt(sx,z),compPin=lowerVisible&&sticky.shift>0&&z>=.55;lastPinned={...pin,showLabels:pin.showLabels||compPin,upperLabels:Boolean(pin.showLabels)};
 data(root,'autoResults',autoResultsOnly);data(root,'competencyLabels',compPin);data(root,'stickyDescriptorWidth',sticky.width);data(root,'columnRoom',columnRoom(sticky.width));data(root,'columnFrame',sticky.width>=FRAME_ROOM?'title':'tools');data(root,'pinnedHeader',pin.showHeader?pin.group.kind:'');data(root,'pinnedLabels',pin.showLabels);
 // D1.52 · Le barème (vue transposée) reste à gauche au défilement, comme la colonne des noms et comme dans le bilan.
 if(c.chartSide){const shift=Math.max(0,Math.min(upper.shift,LABEL+layout().primary*layout().pw-upper.width));css(c.chartSide,'width',upper.width+'px');move(c.chartSide,shift);data(c.chartSide,'pinned',shift>0);}
 for(const {content,category}of c.descriptors){css(content,'width',(sticky.width-1)+'px');move(content,sticky.shift);if(category){const available=sticky.width-80;hidden(category.page,available<category.nameWidth+category.countWidth+category.pageWidth);hidden(category.count,available<category.nameWidth+category.countWidth);}}
 if(filterPanel&&c.lower){const y=Math.min(Math.max(c.lower.y,sy/z+LOWER_HEAD+14),Math.max(c.lower.y,c.lower.bottom-c.filterHeight));panelY=y;css(filterPanel,'top','0px');css(filterPanel,'left','0px');move(filterPanel,X-EXTEND-300,y);}
 css(headPin,'height',pinH(pin.group?.kind)*z+'px');move(headPin,0,pin.showHeader?Math.min(0,pin.group.screenBottom-pinH(pin.group.kind)*z):-10000);move(headInner,left+LABEL*z,0,z);
 for(const [kind,layer]of Object.entries(pinLayers)){const visible=pin.showHeader&&kind===pin.group.kind;move(layer,0,visible?0:-10000);inactive(layer,!visible);}
 const cg=pin.showHeader?pin.group:groups.find(g=>g.screenTop>=0&&g.screenTop<v.h);
 const showCorner=Boolean(cg&&(pin.showLabels||pin.showHeader||compPin));const wide=cg?.kind==='competencies',cw=wide?sticky.width:upper.width,cx=wide?Math.max(0,left-EXTEND*z):pin.showLabels?pin.labelLeft:Math.max(left,0),cy=pin.showHeader?Math.min(0,cg?.screenBottom-pinH(cg?.kind)*z):cg?.natTop;
 css(cornerPin,'width',cw*z+'px');data(cornerPin,'room',columnRoom(cw));data(cornerPin,'frame',cw>=FRAME_ROOM?'title':'tools');const cornerH=kind=>pin.showHeader?pinH(kind):natH(kind);css(cornerPin,'height',cornerH(cg?.kind)*z+'px');move(cornerPin,cx,showCorner?cy:-10000);
 for(const [kind,layer]of Object.entries(cornerLayers)){css(layer,'width',cw+'px');css(layer,'height',cornerH(kind)+'px');css(layer,'paddingTop',(kind==='students'?T:0)+'px');const visible=showCorner&&kind===cg.kind;move(layer,0,visible?0:-10000,z);inactive(layer,!visible);}
 for(const row of geometry.rows.filter(r=>r.group!=='competencies')){const node=labelCache.get(row.kind+':'+row.id),y=row.y*z-sy;const shown=pin.showLabels&&y+row.h*z>=0&&y<=v.h;css(node,'width',upper.width+'px');move(node,pin.labelLeft,shown?y:-10000,z);inactive(node,!shown);}
 css(labelsPin,'width',Math.ceil(upper.width*z)+'px');
 const upperEdge=pin.showLabels ? pin.labelLeft+upper.width*z : 0;
 const lowerEdge=compPin ? Math.max(0,left-EXTEND*z)+sticky.width*z : Math.max(0,left+LABEL*z);
 lastPinned.edge=Math.max(pin.showLabels?upperEdge:0,compPin?lowerEdge:0);
 updateReadingLayout(c,z,sx,upperEdge,lowerEdge,lowerVisible);
 updateResultsPin();updatePaneTitles();queueAutoResults();
}
function fitCategoryName(heading){
 const name=heading.querySelector('strong'),count=heading.querySelector('button>span:last-child'),page=heading.querySelector('.ge-plan-page');if(!name)return;
 if(page)page.hidden=false;if(count)count.hidden=false;
 if(name.scrollWidth>name.clientWidth+.5&&page)page.hidden=true;
 if(name.scrollWidth>name.clientWidth+.5&&count)count.hidden=true;
}
// Seule une case réellement en cours d’usage au clavier (et encore visible) retient le repli.
// Un clic de souris laisse le focus sur la case : il ne doit pas bloquer le repli quand on fait défiler.
function checkboxInUse(){const el=document.activeElement;if(!el?.matches?.('input[data-c],input[data-catalogue-link],input[data-free-link]')||!el.matches(':focus-visible'))return false;const r=el.getBoundingClientRect(),v=vp.getBoundingClientRect();return r.right>v.left&&r.left<v.right&&r.bottom>v.top&&r.top<v.bottom;}
function autoResultsInputs(){const c=scrollCache,z=view.zoom,sx=scrollFrame.x,sy=scrollFrame.y,v=c?.v||{w:0,h:0},sticky=descriptorAt(sx,z),left=Math.max(0,(X-EXTEND)*z-sx)+sticky.width*z,m=c?.matrix,r=c?.results;return {catalogue:!catalogueUsedOnly,overview:Boolean(overview),zooming:Boolean(pinch||gestureZoom||wheelZooming),checkboxFocused:checkboxInUse(),resultsVisible:Boolean(d.students.length&&d.tasks.length&&m&&r&&r.w>0&&c.lower?.bottom*z>sy&&r.y*z-sy<v.h&&(r.x+r.w)*z-sx>left&&r.x*z-sx<v.w),bothFit:Boolean(m&&r&&(m.w+r.w)*z<=v.w-sticky.width*z),matrixStart:m?m.x*z-sx:0,matrixEnd:m?(m.x+m.w)*z-sx:0,viewportLeft:left,viewportRight:v.w};}
// Keep the DOM/camera stable through native momentum, then react on the first
// frame after scrollend. The quiet timer is a fallback, not an additional pause.
function finishAutomaticResultsScroll(){if(!scrollSettling)return;clearTimeout(scrollIdleTimer);scrollIdleTimer=null;scrollSettling=false;schedule();}
function deferAutomaticResults(){if(bilanOrigin)return;scrollSettling=true;clearTimeout(scrollIdleTimer);scrollIdleTimer=setTimeout(finishAutomaticResultsScroll,180);}
function queueAutoResults(){
 if(needsSetup()||autoChanging||scrollSettling||pan?.dragging||gradingDrag)return;const next=autoResultsState(autoResultsOnly,autoResultsInputs());if(next!==autoResultsOnly)changeAutoResults(next);}
// Keep a reading anchor for an explicit Retenues/Catalogue switch only.
function retainedAnchor(){
 const v=vp.getBoundingClientRect(),head=lastPinned.showHeader&&lastPinned.group?.kind==='competencies'?LOWER_HEAD*view.zoom:0;
 const row=[...board.querySelectorAll('[data-selected-competency]')].find(row=>{const r=row.getBoundingClientRect();return r.height>0&&r.bottom>v.top+head&&r.top<v.bottom;});
 return row?{id:row.dataset.rowId,top:row.getBoundingClientRect().top}:null;
}
function correctRetainedAnchor(anchor){if(!anchor)return;const row=rowNodes.get('competency:'+anchor.id);if(row){const delta=row.getBoundingClientRect().top-anchor.top;if(Number.isFinite(delta))vp.scrollTop+=delta;}}
function automaticResultsAnchor(folding){
 const v=vp.getBoundingClientRect(),upper=board.querySelector('.ge-points-sheet')?.getBoundingClientRect();
 // Any visible part of the points sheet takes priority over the lower list.
 if(upper&&upper.bottom>v.top&&upper.top<v.bottom)return null;
 const top=v.top+Math.min(LOWER_HEAD*view.zoom,Math.max(0,v.bottom-v.top-80))+8,bottom=Math.max(top+1,v.bottom-16);
 const rows=[...board.querySelectorAll('[data-selected-competency]')].map(node=>({id:node.dataset.rowId,rect:node.getBoundingClientRect()})).filter(row=>row.rect.height>0);
 const visible=rows.filter(row=>row.rect.bottom>top&&row.rect.top<bottom);
 const row=(!folding&&visible.find(row=>row.id===autoReadingId))||visible.find(row=>row.rect.top>=top)||visible[0]||rows.reduce((nearest,row)=>!nearest||Math.abs(row.rect.top-top)<Math.abs(nearest.rect.top-top)?row:nearest,null);
 // A retained row may be far above a viewport containing only catalogue candidates.
 // Bring the nearest retained row into the reading area instead of leaving it blank.
 const targetTop=row&&visible.includes(row)?Math.max(top,Math.min(row.rect.top,bottom-Math.min(row.rect.height,bottom-top))):top;
 return {id:row?.id||null,top:targetTop,bottom,recover:folding&&!visible.length};
}
function correctAutomaticResultsAnchor(anchor){
 if(!anchor)return;
 const body=board.querySelector('[data-catalogue-rows]'),bounds=body?.getBoundingClientRect();
 // Only a lower-only view with no retained row in sight may reveal the whole short list.
 const target=anchor.recover&&bounds?.height>0&&bounds.height<=anchor.bottom-anchor.top?body:(anchor.id&&rowNodes.get('competency:'+anchor.id))||board.querySelector('[data-selected-competency]')||body?.firstElementChild;
 if(!target)return;const delta=target.getBoundingClientRect().top-anchor.top;
 if(Number.isFinite(delta)&&Math.abs(delta)>.5)vp.scrollTop+=delta;
 // Do not reveal a sliver of the upper footer while recovering the lower list:
 // it would incorrectly protect that footer instead of the reading row on return.
 const v=vp.getBoundingClientRect(),upper=board.querySelector('.ge-points-sheet')?.getBoundingClientRect();
 if(upper&&upper.bottom>v.top)vp.scrollTop+=upper.bottom-v.top+1;
}
function changeAutoResults(next){
 if(autoChanging||scrollSettling||next===autoResultsOnly)return;
 const anchor=automaticResultsAnchor(next);
 autoReadingId=next?anchor?.id||null:null;
 autoChanging=true;
 try{
  autoResultsOnly=next;autoGroupOpen.clear();root.dataset.autoResults=String(next);
  // Preserve the upper sheet; follow a retained row only in a lower-only view.
  refreshCatalogue(false,{preserveViewport:true,animate:false});
  correctAutomaticResultsAnchor(anchor);
  updatePins();updateMap();
 }finally{autoChanging=false;}
 rememberCamera();
}
function drawMap(){mapScale=Math.min(166/worldSize.w,111/worldSize.h);mapOffset={x:(180-worldSize.w*mapScale)/2,y:(125-worldSize.h*mapScale)/2};const gP=geometry.groups.find(g=>g.kind==='students'),gC=geometry.groups.find(g=>g.kind==='competencies');const x=mapOffset.x+X*mapScale,w=(geometry.width+EXTEND)*mapScale;$('[data-map-shapes]').innerHTML=[gP,gC].filter(Boolean).map(g=>`<rect class="${g.kind==='students'?'ge-map-students':'ge-map-competencies'}" x="${g.kind==='competencies'?x-EXTEND*mapScale:x}" y="${mapOffset.y+g.y*mapScale}" width="${g.kind==='students'?(LABEL+layout().primary*layout().pw+(transposed?400:SUM))*mapScale:w}" height="${Math.max(3,(g.bottom-g.y)*mapScale)}" rx="1"></rect><rect class="ge-map-head" x="${g.kind==='competencies'?x-EXTEND*mapScale:x}" y="${mapOffset.y+g.y*mapScale}" width="${g.kind==='students'?(LABEL+layout().primary*layout().pw+(transposed?400:SUM))*mapScale:w}" height="${Math.max(2,g.h*mapScale)}"></rect>`).join('');}
function updateMap(){if(!scrollCache)return;move(scrollCache.map,mapOffset.x+scrollFrame.x/view.zoom*mapScale,mapOffset.y+scrollFrame.y/view.zoom*mapScale);}
function mark(){for(const n of root.querySelectorAll('.ge-active-col,.ge-active-row,.ge-active-cell'))n.classList.remove('ge-active-col','ge-active-row','ge-active-cell');if(active?.t)for(const n of root.querySelectorAll('.ge-task-head[data-edit-task]'))if(n.dataset.editTask===active.t)n.classList.add('ge-active-col');if(active?.t)for(const n of columnNodes.get(active.t)||[]){const row=n.closest('tr');if((!transposed&&row?.hasAttribute('data-group-header'))||!transposed&&active.p&&row?.dataset.rowKind==='student'||active.c&&row?.dataset.rowGroup==='competencies')n.classList.add('ge-active-col');}if(transposed&&active?.p)for(const node of board.querySelectorAll('[data-pupil-column]'))if(node.dataset.pupilColumn===active.p)node.classList.add('ge-active-col');if(transposed&&active?.p&&active?.t)rowNodes.get('task:'+active.t)?.classList.add('ge-active-row');if(active?.p)rowNodes.get('student:'+active.p)?.classList.add('ge-active-row');if(active?.c)rowNodes.get('competency:'+active.c)?.classList.add('ge-active-row');const selected=active?.p&&active?.t?gradeNodes.get(key(active.p,active.t)):active?.c&&active?.t?linkNodes.get(key(active.c,active.t)):null;selected?.closest('td')?.classList.add('ge-active-cell');if(active?.p)labelCache.get('student:'+active.p)?.classList.add('ge-active-col');if(active?.t)labelCache.get('task:'+active.t)?.classList.add('ge-active-col');updateContext();schedule();}
// Hover is a transient reading aid shared by native rows and their frozen copies.
function hoverIdentity(target){
 if(!target?.closest)return null;
 const mirror=target.closest('[data-hover-row]');if(mirror)return mirror.dataset.hoverRow;
 const row=target.closest('tr[data-row-kind][data-row-id]');return row?row.dataset.rowKind+':'+row.dataset.rowId:null;
}
function paintRowHover(){
 for(const node of hoverMirrors)node.classList.remove('ge-row-hover');hoverMirrors=[];
 const row=hoveredRow&&rowNodes.get(hoveredRow);if(!row){hoveredRow=null;return;}
 hoverMirrors.push(row);for(const node of surface.querySelectorAll('[data-hover-row]'))if(node.dataset.hoverRow===hoveredRow)hoverMirrors.push(node);
 for(const node of hoverMirrors)node.classList.add('ge-row-hover');
}
function setRowHover(identity){if(identity===hoveredRow)return;hoveredRow=identity;paintRowHover();}
function refreshRowHover(){
 if(dialog.open||pan?.dragging){setRowHover(null);return;}
 if(hoverPointer&&document.elementFromPoint){const node=document.elementFromPoint(hoverPointer.x,hoverPointer.y);hoveredRow=surface.contains(node)?hoverIdentity(node):null;}
 paintRowHover();
}
function followRowHover(event){
 if(event.pointerType==='touch')return;hoverPointer={x:event.clientX,y:event.clientY};
 setRowHover(dialog.open||pan?.dragging?null:hoverIdentity(event.target));
}
surface.addEventListener('pointerover',followRowHover);
surface.addEventListener('pointermove',followRowHover);
surface.addEventListener('pointerout',event=>{if(event.pointerType==='touch')return;const next=event.relatedTarget;if(!surface.contains(next)){hoverPointer=null;setRowHover(null);}else setRowHover(hoverIdentity(next));});
surface.addEventListener('pointerleave',()=>{hoverPointer=null;setRowHover(null);});
function clearGridFocus(){
 if(!commitDraft())return false;
 const focused=document.activeElement;if(focused?.matches?.('input[data-p],input[data-c]'))focused.blur();
 active=null;mark();return true;
}
// A click on another control or on the canvas ends grid selection, never a pan.
root.addEventListener('click',event=>{
 if(bilanOrigin||suppressClick&&event.detail!==0||event.target.closest('[data-dialog],.ge-mode-controls,input[data-p],input[data-c],.ge-check-label'))return;
 if(!clearGridFocus()){event.preventDefault();event.stopImmediatePropagation();}
},{capture:true});
root.addEventListener('focusin',event=>{if(!bilanOrigin&&active&&!event.target.matches('input[data-p],input[data-c]')&&!event.target.closest('[data-dialog],.ge-mode-controls'))clearGridFocus();});
document.addEventListener('click',event=>{if(!bilanOrigin&&!root.contains(event.target)&&!event.composedPath().includes(root))clearGridFocus();});
function updateContext(){}
// D1.40 · Dans la feuille des points, seule la colonne des élèves épinglée compte (pas celle des compétences) : sinon chaque Entrée décalait la vue.
function reveal(node){if(bilanOrigin||!node||!node.isConnected)return;updatePins();const r=node.getBoundingClientRect(),v=vp.getBoundingClientRect(),lower=Boolean(node.closest('.ge-competencies-sheet'));const left=v.left+((lower?lastPinned.showLabels:lastPinned.upperLabels)?(lastPinned.edge||pinnedWidth()*view.zoom):0)+10,top=v.top+(lastPinned.showHeader?(lastPinned.group?.kind==='students'?geometry.studentHeaderHeight+34:LOWER_HEAD)*view.zoom:0)+10;let dx=0,dy=0;if(r.left<left)dx=r.left-left;else{const right=v.left+vp.clientWidth-0-15;if(r.right>right)dx=r.right-right;}if(r.top<top)dy=r.top-top;else if(r.bottom>v.top+vp.clientHeight-15)dy=r.bottom-(v.top+vp.clientHeight-15);for(const overlay of [$('[data-map]'),$('.ge-zoom')]){if(!overlay||overlay.hasAttribute('data-map')&&$('[data-map-navigate]').hidden)continue;const q=overlay.getBoundingClientRect();if(q.width>0&&q.height>0&&r.right>q.left&&r.bottom>q.top&&r.left<q.right&&r.top<q.bottom)dy=Math.max(dy,r.bottom-q.top+14);}vp.scrollLeft+=dx;vp.scrollTop+=dy;rememberCamera();schedule();}
function focusGrade(p,t){const e=gradeNodes.get(key(p,t));if(!e)return;if(draft?.node!==e&&!commitDraft())return;if(view.zoom<.55)zoomTo(1);e.focus({preventScroll:true});if(!draft||draft.node!==e)beginGrade(e);e.select();schedule();requestAnimationFrame(()=>{updatePins();reveal(e);});}
function beginGrade(e){if(draft?.node!==e&&!commitDraft())return false;active={p:e.dataset.p,t:e.dataset.t};if(draft?.node!==e)draft={node:e,p:e.dataset.p,t:e.dataset.t,dirty:false};e.classList.add('ge-editing');selectAllNode=e;e.select();if(view.zoom<.55&&!restoringGridCell){zoomTo(1);requestAnimationFrame(()=>reveal(e));}mark();return true;}
function updateTotal(pid,preview){const node=totalNodes.get(pid);if(!node)return;let n=total(d,pid),complete=filled(d,pid)===d.tasks.length;if(preview){const num=v=>typeof v==='number'?v:0;n=n-num(d.scores[pid]?.[preview.t])+num(preview.value);complete=d.tasks.every(t=>t.id===preview.t?preview.value!==null:d.scores[pid]?.[t.id]!=null);}node.textContent=format(n)+(complete?'':'*');}
function commitDraft(){
 if(!draft)return true;const edit=draft,node=edit.node;if(!node.isConnected){draft=null;return true;}
 let value;try{value=points(node.value,task(edit.t).maxPoints);}catch(error){node.classList.add('ge-invalid');node.setAttribute('aria-invalid','true');node.setCustomValidity(error.message);node.focus({preventScroll:true});reveal(node);notice(error.message,true);return false;}
 node.classList.remove('ge-invalid');node.setAttribute('aria-invalid','false');node.setCustomValidity('');node.value=format(value);node.classList.remove('ge-editing');node.classList.toggle('ge-dispensed',value==='D');draft=null;
 if(d.scores[edit.p][edit.t]!==value)mutation(()=>{d.scores[edit.p][edit.t]=value;},null,{render:false,scoreChange:edit});updateTotal(edit.p);showSave(Boolean(saveTimer));return true;
}
function cancelDraft(){if(!draft)return;const e=draft;draft=null;e.node.value=format(d.scores[e.p][e.t]);e.node.classList.remove('ge-invalid','ge-editing');e.node.setAttribute('aria-invalid','false');e.node.setCustomValidity('');updateTotal(e.p);showSave(Boolean(saveTimer));}
function closeMenus(){for(const menu of root.querySelectorAll('details[open]'))menu.open=false;}
// D1.30 · Carte mobile : on la déplace par son titre ; autour d’elle, le plan reste navigable (molette, pincer, glisser).
let dialogControls=null,dialogMoved=false;
function freeDialog(){
 dialogControls?.abort();const offs=[],on=(node,type,fn,options)=>{node.addEventListener(type,fn,options);offs.push(()=>node.removeEventListener(type,fn,options));};dialogControls={abort(){for(const off of offs.splice(0))off();}};dialogMoved=false;
 const head=dialog.querySelector('h2');if(head){head.classList.add('ge-dialog-handle');head.title='Glisser pour déplacer la carte';
  on(head,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const r=dialog.getBoundingClientRect(),vw=window.innerWidth||1000,vh=window.innerHeight||700,start={x:e.clientX,y:e.clientY,l:r.left,t:r.top,id:e.pointerId};dialog.style.left=r.left+'px';dialog.style.top=r.top+'px';dialog.dataset.anchored='';try{head.setPointerCapture(e.pointerId);}catch{}
   const moveCard=ev=>{if(ev.pointerId!==start.id)return;dialog.style.left=Math.round(Math.max(8-r.width*.6,Math.min(vw-r.width*.4,start.l+ev.clientX-start.x)))+'px';dialog.style.top=Math.round(Math.max(0,Math.min(vh-48,start.t+ev.clientY-start.y)))+'px';dialog.style.maxHeight=Math.round(Math.max(200,vh-Math.max(0,start.t+ev.clientY-start.y)-12))+'px';};
   const stop=ev=>{if(ev.pointerId!==start.id)return;head.removeEventListener('pointermove',moveCard);head.removeEventListener('pointerup',stop);head.removeEventListener('pointercancel',stop);};
   head.addEventListener('pointermove',moveCard);head.addEventListener('pointerup',stop);head.addEventListener('pointercancel',stop);});}
 const form=dialog.querySelector('form');
 on(dialog,'wheel',e=>{if(form?.contains(e.target)&&dialog.scrollHeight>dialog.clientHeight+1&&!(e.ctrlKey||e.metaKey))return;e.preventDefault();e.stopPropagation();dialogMoved=true;
  if(e.ctrlKey||e.metaKey){const r=vp.getBoundingClientRect();zoomTo(view.zoom*Math.exp(-e.deltaY*.006),{x:e.clientX-r.left,y:e.clientY-r.top});}
  else{const sideways=e.shiftKey&&Math.abs(e.deltaX)<1;vp.scrollLeft+=sideways?e.deltaY:e.deltaX;vp.scrollTop+=sideways?0:e.deltaY;scrollFrame.x=vp.scrollLeft;scrollFrame.y=vp.scrollTop;schedule();}},{passive:false});
 on(dialog,'pointerdown',e=>{if(e.target!==dialog||e.button!==0)return;const r=dialog.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)return;e.preventDefault();const start={x:e.clientX,y:e.clientY,sx:vp.scrollLeft,sy:vp.scrollTop,id:e.pointerId};dialog.classList.add('ge-panning');try{dialog.setPointerCapture(e.pointerId);}catch{}
  const pan=ev=>{if(ev.pointerId!==start.id)return;dialogMoved=true;vp.scrollLeft=start.sx-(ev.clientX-start.x);vp.scrollTop=start.sy-(ev.clientY-start.y);scrollFrame.x=vp.scrollLeft;scrollFrame.y=vp.scrollTop;schedule();};
  const stop=ev=>{if(ev.pointerId!==start.id)return;dialog.classList.remove('ge-panning');dialog.removeEventListener('pointermove',pan);dialog.removeEventListener('pointerup',stop);dialog.removeEventListener('pointercancel',stop);};
  on(dialog,'pointermove',pan);on(dialog,'pointerup',stop);on(dialog,'pointercancel',stop);});
}
function modal({title,fields=[],note='',submit='Enregistrer',onSubmit,remove,content='',cancel=null,after=''}){
 if(!commitDraft())return;hoverPointer=null;setRowHover(null);const trigger=document.activeElement,cameraBefore={...view},selectionBefore=active?{...active}:null;let submitted=false;afterDialog=null;closeMenus();
 dialog.innerHTML=`<form class="ge-dialog-form"><h2 id="ge-dialog-title">${esc(title)}</h2>${note?`<p class="ge-dialog-note">${esc(note)}</p>`:''}${content}${fields.map(f=>f.type==='checkbox'?`<label class="ge-field ge-check-field"><input type="checkbox" name="${f.name}" ${f.value?'checked':''}><span>${esc(f.label)}</span>${f.hint?`<small>${esc(f.hint)}</small>`:''}</label>`:`<label class="ge-field"><span>${esc(f.label)}</span>${f.multiline?`<textarea name="${f.name}" rows="${f.rows||4}" ${f.required?'required':''}>${esc(f.value||'')}</textarea>`:`<input name="${f.name}" value="${esc(f.value??'')}" ${f.required?'required':''} ${f.numeric?'inputmode="decimal"':''} autocomplete="off">`}</label>`).join('')}${after}<div class="ge-dialog-error" role="alert" hidden></div><div class="ge-dialog-actions">${remove?'<button type="button" class="ge-button ge-remove" data-modal-remove>Retirer</button>':''}<button type="button" class="ge-button" data-modal-cancel>${cancel||(onSubmit?'Annuler':'Fermer')}</button>${onSubmit?`<button type="submit" class="ge-button ge-primary">${esc(submit)}</button>`:''}</div></form>`;
 const form=dialog.querySelector('form');form.addEventListener('submit',e=>{e.preventDefault();const values={};for(const field of fields){const el=form.elements.namedItem(field.name);values[field.name]=field.type==='checkbox'?el.checked:el.value;}try{const result=onSubmit?.(values);submitted=true;if(result==='keep')return;dialog.close();}catch(error){const n=dialog.querySelector('.ge-dialog-error');n.textContent=error.message;n.hidden=false;}});
 dialog.querySelector('[data-modal-cancel]').addEventListener('click',()=>dialog.close());if(remove)dialog.querySelector('[data-modal-remove]').addEventListener('click',()=>{remove();submitted=true;dialog.close();});
 dialog.addEventListener('close',()=>{dialogControls?.abort();dialogControls=null;dialog.style.translate='';const follow=afterDialog,proceed=dialog.dataset.proceed==='true';afterDialog=null;delete dialog.dataset.proceed;requestAnimationFrame(()=>{if(dialog.open)return;if((submitted||proceed)&&follow){follow();return;}if(!submitted&&trigger?.isConnected)trigger.focus({preventScroll:true});if(dialogMoved){rememberCamera();schedule(true);return;}view={...cameraBefore};updateScale();vp.scrollLeft=view.x*view.zoom;vp.scrollTop=view.y*view.zoom;active=selectionBefore;normalizeActive();mark();schedule(true);});},{once:true});dialog.showModal();anchorDialog(trigger);freeDialog();const first=dialog.querySelector('input,textarea');if(first){first.focus();if(first.tagName==='INPUT')first.select();}
}
function add(kind){if(kind==='competency')return needsSetup()||overview?jumpCatalogue(true):openFreeCompetency();const c=counts(d);capacity(c[0]+(kind==='student'?1:0),c[1]+(kind==='task'?1:0),c[2]+(kind==='competency'?1:0));
 if(kind==='student')modal({title:'Ajouter des élèves',after:'<div class="ge-import-row"><button type="button" class="ge-button" data-import-csv title="Une liste CSV, ou un test GrilleÉval déjà enregistré pour reprendre ses élèves">Depuis un fichier…</button></div>',fields:[{name:'names',label:'Noms et prénoms (un par ligne)',multiline:true,required:true,rows:6}],submit:'Ajouter',onSubmit:v=>{const names=v.names.split(/\r?\n/).map(n=>n.trim()).filter(Boolean).map(n=>text(n,'Nom'));if(!names.length)throw new Error('Saisir au moins un nom.');checkPupilNames(names);capacity(d.students.length+names.length,d.tasks.length,d.competencies.length);let first;mutation(()=>{for(const name of names){const p={id:newId('s'),uid:newUid(),name};first||=p.id;d.students.push(p);d.scores[p.id]=Object.fromEntries(d.tasks.map(t=>[t.id,null]));}},`${names.length} élève(s) ajouté(s).`,{shape:true});afterDialog=()=>{if(d.tasks.length)focusGrade(first,d.tasks[0].id);else{/* D1.80 · la vue reste en place : on fait juste apparaître le premier élève ajouté s’il est caché */const n=[...board.querySelectorAll('[data-edit-student]')].find(b=>b.dataset.editStudent===first);if(n){reveal(n);n.focus({preventScroll:true});}}};}});
 if(kind==='task')addTasks();

}
// D1.29 · Ajouter des exercices en série : la carte reste ouverte, rien n’envoie vers la saisie des points.
// Entrée ajoute l’exercice et vide l’intitulé ; Entrée sur un intitulé vide (ou « Terminer ») ferme.
// Coller plusieurs lignes « Intitulé ; points » ajoute tout en une fois.
let lastTaskPoints='10';
function parseTaskLines(textValue,fallback){return textValue.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const m=line.match(/^(.*?)(?:\s*[;\t|]\s*|\s+[–—-]\s+|\s+\/\s*|\s+)(\d+(?:[.,]\d+)?)\s*(?:pts?\.?|points?)?$/i);return m&&m[1].trim()?{title:m[1].trim(),max:m[2]}:{title:line,max:fallback};});}
function addTasks(){
 const added=[];
 const content=`<div class="ge-task-adder"><div class="ge-task-line"><label class="ge-field"><span>Intitulé</span><input name="title" data-task-title autocomplete="off" placeholder="p. ex. Comparer des fractions"></label><label class="ge-field ge-task-max"><span>Points</span><span class="ge-points-box"><input name="max" data-task-max inputmode="decimal" autocomplete="off" value="${esc(lastTaskPoints)}"><small aria-hidden="true">pts</small></span></label></div><ol class="ge-task-added" data-task-added hidden></ol></div>`;
 const listAdded=()=>{const list=dialog.querySelector('[data-task-added]');if(!list)return;list.hidden=!added.length;list.innerHTML=added.map(id=>{const t=task(id);if(!t)return '';const n=d.tasks.findIndex(x=>x.id===id)+1;return `<li><span class="ge-task-added-n">${String(n).padStart(2,'0')}</span><span class="ge-task-added-title">${esc(t.title)}</span><span class="ge-task-added-pts">/ ${format(t.maxPoints)} pts</span><button type="button" class="ge-button" data-task-undo="${esc(id)}" aria-label="Retirer ${esc(t.title)}" title="Retirer cet exercice">${icon('close')}</button></li>`;}).join('');const submit=dialog.querySelector('button[type="submit"]');if(submit)submit.textContent='Ajouter';const cancelButton=dialog.querySelector('[data-modal-cancel]');if(cancelButton)cancelButton.textContent=added.length?`Terminer · ${added.length} ajouté${added.length>1?'s':''}`:'Annuler';};
 const addMany=items=>{checkTaskTitles(items.map(item=>text(item.title,'Intitulé')));const ready=items.map(item=>{const name=text(item.title,'Intitulé'),max=points(item.max,Infinity,{empty:false,dispensed:false});if(!max)throw new Error('Le maximum doit être supérieur à zéro.');return {id:newId('t'),title:name,maxPoints:max};});capacity(d.students.length,d.tasks.length+ready.length,d.competencies.length);mutation(()=>{for(const t of ready){d.tasks.push(t);for(const p of d.students)d.scores[p.id][t.id]=null;}},ready.length>1?`${ready.length} exercices ajoutés.`:'Exercice ajouté.',{shape:true});added.push(...ready.map(t=>t.id));lastTaskPoints=String(ready.at(-1).maxPoints).replace('.',',');listAdded();};
 modal({title:'Ajouter des exercices',content,submit:'Ajouter',cancel:'Annuler',onSubmit:()=>{const form=dialog.querySelector('form'),title=form.elements.namedItem('title'),max=form.elements.namedItem('max');
  if(!title.value.trim()){if(added.length)return;throw new Error('Saisir un intitulé.');}
  addMany([{title:title.value,max:max.value}]);title.value='';title.focus();return 'keep';}});
 if(!dialog.open)return;
 const form=dialog.querySelector('form'),title=form.elements.namedItem('title'),max=form.elements.namedItem('max'),error=message=>{const n=dialog.querySelector('.ge-dialog-error');n.textContent=message;n.hidden=!message;};
 max.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const n=Number(max.value.trim().replace(',','.'))||0,next=Math.max(.5,Math.round((n+(e.key==='ArrowUp'?.5:-.5))*2)/2);max.value=format(next);});
 form.addEventListener('click',e=>{const undo=e.target.closest('[data-task-undo]');
  if(undo){const id=undo.dataset.taskUndo,t=task(id);if(t){mutation(()=>removeTask(d,id),'Exercice retiré. Annulation possible.',{shape:true});}added.splice(added.indexOf(id),1);listAdded();title.focus();}});
 title.addEventListener('paste',e=>{const raw=e.clipboardData?.getData('text')||'';if(!/\n/.test(raw.trim()))return;e.preventDefault();try{addMany(parseTaskLines(raw,max.value));error('');title.value='';}catch(ex){error(ex.message);}});
 title.addEventListener('input',()=>error(''));
 afterDialog=()=>{board.querySelector('[data-add="task"]')?.focus({preventScroll:true});};
}
function editStudent(id){const p=pupil(id);if(!p)return;modal({title:'Modifier l’élève',fields:[{name:'name',label:'Nom et prénom',value:p.name,required:true},{name:'absent',type:'checkbox',label:'Absent(e) à ce test',hint:'Sans résultat ni croix ; ne compte pas dans les statistiques de la classe.',value:!!p.absent}],onSubmit:v=>{const name=text(v.name,'Nom'),absent=!!v.absent;checkPupilNames([name],id);mutation(()=>{p.name=name;if(absent)p.absent=true;else delete p.absent;},absent!==!!p.absent?(absent?'Élève marqué absent.':'Élève de nouveau présent.'):'Nom modifié.');},remove:()=>mutation(()=>{d.students=d.students.filter(s=>s.id!==id);delete d.scores[id];},'Élève retiré. Annulation possible.',{shape:true})});}
function editTask(id){const t=task(id);if(!t)return;modal({title:'Modifier l’exercice',fields:[{name:'title',label:'Intitulé complet',value:t.title,required:true},{name:'max',label:'Maximum de points',value:format(t.maxPoints),required:true,numeric:true}],onSubmit:v=>{const title=text(v.title,'Intitulé');checkTaskTitles([title],id);const max=points(v.max,Infinity,{empty:false,dispensed:false}),highest=Math.max(0,...d.students.map(p=>d.scores[p.id][id]).filter(n=>typeof n==='number'));if(!max||max<highest)throw new Error(`Le maximum doit être positif et couvrir les points saisis : au moins ${format(highest)}.`);mutation(()=>{t.title=title;t.maxPoints=max;},'Exercice modifié.');},remove:()=>mutation(()=>removeTask(d,id),'Exercice et associations retirés. Annulation possible.',{shape:true})});}
function editCompetency(id){const c=competency(id);if(!c)return;
 const entry=d.catalogue.find(item=>item.id===c.catalogueId),meta=competencyMeta(d,c);
 const details=[meta.level,meta.pathway,competencyBasis(c)].filter(Boolean).join(' · ');
 modal({title:'Modifier la compétence',note:details,content:pageLink(entry,'Plan d’études p. '),fields:[{name:'text',label:'Descripteur complet',value:c.text,multiline:true,required:true,rows:7}],onSubmit:v=>{const value=text(v.text,'Compétence');if(d.competencies.some(k=>k.id!==id&&sameLabel(k.text,value)))throw new Error('Cette compétence figure déjà dans l’évaluation.');mutation(()=>{c.text=value;},'Compétence modifiée.');},remove:()=>mutation(()=>{d.competencies=d.competencies.filter(k=>k.id!==id);delete d.links[id];},'Compétence retirée. Annulation possible.',{shape:true})});}
// ── Pages de garde (v4 · deckblatt.dart) ───────────────────────────────────
let jsPDFReady=null;
function loadJsPDF(){
 if(window.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
 const load=(src,next)=>new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;
  s.onload=()=>window.jspdf?.jsPDF?ok(window.jspdf.jsPDF):fail(new Error('Le module PDF est indisponible.'));
  s.onerror=()=>{s.remove();if(next)load(next,null).then(ok,fail);else fail(new Error('Le module PDF n’a pas pu être chargé.'));};document.head.append(s);});
 // D1.53 · Copie locale (hors ligne possible), sinon le CDN autorisé sur claude.ai.
 return jsPDFReady||(jsPDFReady=load(new URL('./vendor/jspdf.umd.min.js',import.meta.url).href,JSPDF_CDN).catch(error=>{jsPDFReady=null;throw error;}));
}
function shrinkLogo(file){return new Promise((ok,fail)=>{const r=new FileReader();r.onerror=()=>fail(new Error('Image illisible.'));r.onload=()=>{const img=new Image();img.onerror=()=>fail(new Error('Image illisible.'));img.onload=()=>{
 const k=Math.min(1,480/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*k));c.height=Math.max(1,Math.round(img.naturalHeight*k));
 const g=c.getContext('2d');const png=file.type==='image/png';if(!png){g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);}g.drawImage(img,0,0,c.width,c.height);ok(c.toDataURL(png?'image/png':'image/jpeg',.9));};img.src=r.result;};r.readAsDataURL(file);});}
let schoolLogo=null;
function loadSchoolLogo(){return schoolLogo||(schoolLogo=fetch(new URL('./assets/schullogo.png',import.meta.url)).then(r=>r.ok?r.blob():null).then(b=>b&&new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=()=>ok(null);f.readAsDataURL(b);})).catch(()=>null));}
// D1.57 · Police Unicode (sous-ensemble de Liberation Sans, SIL OFL) chargée seulement si un nom en a besoin.
let unicodeFonts=null;
function loadUnicodeFonts(){
 const b64=buf=>{const bytes=new Uint8Array(buf);let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(bin);};
 const get=name=>fetch(new URL('./vendor/'+name,import.meta.url)).then(r=>{if(!r.ok)throw new Error(r.status);return r.arrayBuffer();}).then(b64);
 return unicodeFonts||(unicodeFonts=Promise.all([get('ge-sans-Regular.ttf'),get('ge-sans-Bold.ttf')]).then(([regular,bold])=>({regular,bold})).catch(()=>{unicodeFonts=null;notice('Police des noms indisponible : certains signes seront simplifiés dans le PDF.',true);return null;}));
}
// D1.57 · Vue d’ensemble imprimable (A4 paysage) : points de la classe et compétences par élève.
async function overviewPDF(){
 if(!commitDraft())return;closeMenus();
 try{const [jsPDF,{buildOverviewPDF,overviewFileName}]=await Promise.all([loadJsPDF(),import('./overview-pdf.mjs?v='+encodeURIComponent(APP_VERSION))]);
  const fonts=needsUnicode(d)?await loadUnicodeFonts():null;
  const blob=buildOverviewPDF(jsPDF,d,{fonts});const ok=await exportFile(blob,overviewFileName(d),'application/pdf');if(ok)notice('Vue d’ensemble enregistrée (PDF).');}
 catch(error){notice('La vue d’ensemble n’a pas pu être créée : '+error.message,true);}
}
async function pagesDeGarde(){
 if(!commitDraft())return;closeMenus();
 let jsPDF;try{jsPDF=await loadJsPDF();}catch(error){notice(error.message,true);return;}
 const defaultLogo=await loadSchoolLogo();
 // Sans choix, le logo de l’école ; « none » = imprimer sans logo.
 // D1.43 · Attitude et écriture valent A tant qu’on n’a rien choisi.
 const gardeLetter=(p,key)=>p[key]||'A',withLetters=p=>({...p,attitude:gardeLetter(p,'attitude'),ecriture:gardeLetter(p,'ecriture')});
 const sheet=()=>({...d,students:d.students.map(withLetters),logo:d.logo==='none'?'':d.logo||defaultLogo||''});
 const fonts=needsUnicode(d)?await loadUnicodeFonts():null;
 const m=useUnicodeFont(new jsPDF({unit:'pt',format:'a4'}),fonts),picked=new Set(d.students.filter(p=>!p.absent).map(p=>p.id));
 const pick=(p,key)=>`<span class="ge-garde-letters" role="group" aria-label="${key==='attitude'?'Attitude au travail':'Écriture et propreté'} · ${esc(p.name)}">${['A','B','C','D'].map(L=>`<button type="button" data-garde-set="${key}" data-garde-who="${esc(p.id)}" data-letter="${L}" aria-pressed="${gardeLetter(p,key)===L}" title="${L} · Alt-clic : pour tous les élèves cochés">${L}</button>`).join('')}</span>`;
 const row=p=>{const r=gardeProposal(d,p.id);const note=p.absent?'<small>absent</small>':d.tasks.length&&!r.complete?'<small>incomplet</small>':'';
  return `<div class="ge-garde-pupil" data-garde-pupil="${esc(p.id)}"><label><input type="checkbox" ${picked.has(p.id)?'checked':''} data-garde-check="${esc(p.id)}"><span>${esc(p.name)}</span>${note}</label>${pick(p,'attitude')}${pick(p,'ecriture')}</div>`;};
 const logoTools=()=>{const state=d.logo==='none'?'aucun':d.logo?'image choisie':defaultLogo?'logo de l’école':'aucun';return `<span>Logo · ${state}</span><button type="button" class="ge-link-button" data-garde-logo>${d.logo&&d.logo!=='none'||defaultLogo&&d.logo!=='none'?'Remplacer…':'Choisir une image…'}</button>${d.logo==='none'?(defaultLogo?'<button type="button" class="ge-link-button" data-garde-logo-default>Logo de l’école</button>':''):(d.logo||defaultLogo)?'<button type="button" class="ge-link-button" data-garde-logo-remove>Sans logo</button>':''}${d.logo&&d.logo!=='none'&&defaultLogo?'<button type="button" class="ge-link-button" data-garde-logo-default>Logo de l’école</button>':''}`;};
 const content=`<div class="ge-garde" data-garde><div class="ge-garde-side"><div class="ge-garde-bar"><span><button type="button" class="ge-link-button" data-garde-all>Tout sélectionner</button><span aria-hidden="true"> · </span><button type="button" class="ge-link-button" data-garde-none>Aucun</button></span><small data-garde-count></small></div>`+
  `<div class="ge-garde-cols" aria-hidden="true"><span></span><span>Attitude</span><span>Écriture</span></div><div class="ge-garde-list">${d.students.map(row).join('')||'<p class="ge-dialog-note">Aucun élève.</p>'}</div>`+
  `<div class="ge-garde-logo" data-garde-logo-tools>${logoTools()}</div><input type="file" accept="image/png,image/jpeg" data-garde-logo-file hidden>`+
  `</div>`+
  `<figure class="ge-garde-preview" data-garde-preview aria-label="Aperçu de la page de garde"></figure></div>`;
 modal({title:'Pages de garde',content,submit:'Créer le PDF',onSubmit:()=>{
  const ids=d.students.filter(p=>picked.has(p.id)).map(p=>p.id);if(!ids.length)throw new Error('Choisir au moins un élève.');
  const blob=buildGardePDF(jsPDF,sheet(),ids,fonts),many=ids.length>1;
  afterDialog=()=>exportFile(blob,gardeFileName(d),'application/pdf').then(ok=>{if(ok)notice(many?`${ids.length} pages de garde enregistrées.`:'Page de garde enregistrée.');});}});
 const box=dialog.querySelector('[data-garde]');if(!box)return;
 const submit=dialog.querySelector('button[type="submit"]'),count=box.querySelector('[data-garde-count]'),preview=box.querySelector('[data-garde-preview]');
 const measure=it=>{m.setFont('helvetica',it.bold?'bold':'normal');m.setFontSize(it.size);return m.getTextWidth(it.s)+(it.space||0)*Math.max(0,it.s.length-1);};
 let shown=null;
 const show=(pid,sketch=false)=>{const p=sheet().students.find(x=>x.id===pid);const key=p?pid+(sketch?':s':''):'';if(shown===key)return;shown=key;
  preview.classList.toggle('ge-sketch',sketch);preview.innerHTML=p?gardeSVG(layoutGarde(sheet(),p,m).items,{sketch,measure}):'<p class="ge-garde-empty">Aucun élève choisi</p>';};
 const rest=()=>show(d.students.find(p=>picked.has(p.id))?.id);
 const sync=()=>{const n=picked.size;count.textContent=`${n} sur ${d.students.length}`;submit.textContent=n>1?`Créer le PDF · ${n} pages`:n?'Créer le PDF · 1 page':'Créer le PDF';submit.disabled=!n;
  for(const el of box.querySelectorAll('[data-garde-pupil]'))el.classList.toggle('ge-off',!picked.has(el.dataset.gardePupil));};
 const setAll=on=>{for(const p of d.students)on?picked.add(p.id):picked.delete(p.id);for(const c of box.querySelectorAll('[data-garde-check]'))c.checked=on;sync();rest();};
 box.addEventListener('change',e=>{const id=e.target.dataset?.gardeCheck;if(id==null)return;e.target.checked?picked.add(id):picked.delete(id);sync();rest();});
 box.querySelector('[data-garde-all]').addEventListener('click',()=>setAll(true));
 box.querySelector('[data-garde-none]').addEventListener('click',()=>setAll(false));
 const list=box.querySelector('.ge-garde-list');
 list.addEventListener('click',e=>{const b=e.target.closest?.('[data-garde-set]');if(!b)return;e.preventDefault();
  const key=b.dataset.gardeSet,who=pupil(b.dataset.gardeWho);if(!who)return;const value=b.dataset.letter;
  const targets=e.altKey?d.students.filter(p=>picked.has(p.id)):[who];
  mutation(()=>{for(const p of targets){if(value)p[key]=value;else delete p[key];}},e.altKey?`${key==='attitude'?'Attitude':'Écriture'} ${value||'effacée'} pour ${targets.length} élève${targets.length>1?'s':''}.`:'',{render:false});
  for(const p of targets)for(const x of list.querySelectorAll(`[data-garde-set="${key}"][data-garde-who="${CSS.escape(p.id)}"]`))x.setAttribute('aria-pressed',String(gardeLetter(p,key)===x.dataset.letter));
  shown=null;show(who.id);});
 list.addEventListener('pointerover',e=>{const r=e.target.closest?.('[data-garde-pupil]');if(r)show(r.dataset.gardePupil,!e.target.closest('.ge-garde-letters'));});
 list.addEventListener('pointerleave',rest);
 list.addEventListener('focusin',e=>{const r=e.target.closest?.('[data-garde-pupil]');if(r)show(r.dataset.gardePupil,true);});
 list.addEventListener('focusout',e=>{if(!list.contains(e.relatedTarget))rest();});
 const file=box.querySelector('[data-garde-logo-file]'),tools=box.querySelector('[data-garde-logo-tools]');
 tools.addEventListener('click',e=>{if(e.target.closest('[data-garde-logo]'))file.click();
  if(e.target.closest('[data-garde-logo-remove]')){mutation(()=>{d.logo='none';},'Pages de garde sans logo.',{render:false});tools.innerHTML=logoTools();shown=null;rest();}
  if(e.target.closest('[data-garde-logo-default]')){mutation(()=>{delete d.logo;},'Logo de l’école rétabli.',{render:false});tools.innerHTML=logoTools();shown=null;rest();}});
 file.addEventListener('change',async()=>{const f=file.files?.[0];file.value='';if(!f)return;
  try{const url=await shrinkLogo(f);mutation(()=>{d.logo=url;},'Logo enregistré.',{render:false});tools.innerHTML=logoTools();shown=null;rest();}catch(error){notice(error.message,true);}});
 sync();rest();
}
async function download(contents,name,type){const blob=contents instanceof Blob?contents:new Blob([contents],{type});const saver=window.claude?.use?await window.claude.use('downloads').catch(()=>null):null;if(saver){try{await saver.save({filename:name,data:blob});return true;}catch(error){if(error?.code==='declined')notice('Enregistrement annulé.');else if(error?.code==='rate_limited')notice('Une demande d’enregistrement est déjà ouverte.',true);else notice('Le fichier n’a pas pu être enregistré ici.',true);return false;}}const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;(dialog.open?dialog:document.body).append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return 'exported';}
function testFileName(){const day=d.date&&/^\d{4}-\d{2}-\d{2}$/.test(d.date)?d.date:new Date().toISOString().slice(0,10);return `${day} ${d.title}`.replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim().slice(0,120)+'.json';}
// D1.48 · « Enregistrer le test » : un fichier par test ; on retient l’empreinte du dernier fichier enregistré.
function docHash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36)+':'+text.length;}
function untouchedDemo(){if(!d.demoId)return false;const m=mathDemo(),pick=x=>JSON.stringify([x.title,x.students,x.tasks,x.scores,x.links,x.competencies.map(c=>c.catalogueId||c.text)]);return pick(d)===pick(m);}
function isUnsaved(){if(!(d.students.length||d.tasks.length||d.competencies.length)||untouchedDemo())return false;return docHash(encodeDocument(d))!==fileSavedHash;}
function exportJSON(after=null,saveAs=false){if(!commitDraft())return;persist();const hash=docHash(encodeDocument(d));const fileName=testFileName();saveTestFile(JSON.stringify(d,null,2),fileName,saveAs).then(result=>{if(!result)return;fileSavedHash=hash;fileSaveKind=result==='exported'?'exported':'written';persist();showSave();track('test-enregistre');notice(result==='exported'?`Fichier téléchargé : « ${fileName} ».`:result.written?`Test enregistré dans « ${result.written} ».`:'Test enregistré.');after?.();});}
// D1.53 · Sur un hébergement propre (Chrome, Edge), « Enregistrer » réécrit le même fichier ; ailleurs, un fichier est téléchargé.
// D1.58 · Chrome / Edge : chaque export demande où l’enregistrer (comme un programme). Ailleurs, le navigateur décide (Téléchargements).
async function exportFile(contents,name,type){
 const result=await exportFileRaw(contents,name,type);if(result&&type==='application/pdf')track('pdf-exporte');return result;
}
async function exportFileRaw(contents,name,type){
 if(!FILE_PICKER)return download(contents,name,type);
 const ext=(name.match(/\.[a-z0-9]+$/i)||['.pdf'])[0].toLowerCase(),label=ext==='.pdf'?'Document PDF':'Fichier GrilleÉval';
 try{const handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:label,accept:{[type]:[ext]}}]});const w=await handle.createWritable();await w.write(contents instanceof Blob?contents:new Blob([contents],{type}));await w.close();return {written:handle.name||name};}
 catch(error){if(error?.name==='AbortError'){notice('Enregistrement annulé.');return false;}return download(contents,name,type);}
}
async function saveTestFile(text,name,saveAs=false){
 if(!FILE_PICKER)return download(text,name,'application/json');
 try{
  if(!fileHandle||saveAs)fileHandle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'Test GrilleÉval',accept:{'application/json':['.json']}}]});
  const w=await fileHandle.createWritable();await w.write(new Blob([text],{type:'application/json'}));await w.close();return {written:fileHandle.name||name};
 }catch(error){if(error?.name==='AbortError'){notice('Enregistrement annulé.');return false;}fileHandle=null;return download(text,name,'application/json');}
}
async function pickTestFile(){
 if(!FILE_PICKER){fileInput.click();return;}
 try{const [handle]=await window.showOpenFilePicker({types:[{description:'Test GrilleÉval',accept:{'application/json':['.json']}}]});openTestFile(await handle.getFile(),handle);}
 catch(error){if(error?.name!=='AbortError')fileInput.click();}
}
function guardUnsaved(next){if(!isUnsaved())return next();
 modal({title:'Enregistrer le test actuel ?',note:`« ${d.title} » n’est pas encore enregistré dans un fichier.`,submit:'Enregistrer',cancel:'Annuler',after:'<button type="button" class="ge-button ge-quiet ge-skip-save" data-skip-save>Continuer sans enregistrer</button>',onSubmit:()=>{afterDialog=()=>exportJSON(next);}});
 const skip=dialog.querySelector('[data-skip-save]');if(skip){dialog.querySelector('.ge-dialog-actions')?.prepend(skip);skip.addEventListener('click',()=>{afterDialog=next;dialog.dataset.proceed='true';dialog.close();});}}
function help(){modal({title:'Travailler dans la grande grille',content:`<div class="ge-help-copy"><p><strong>Se déplacer</strong> : trackpad, molette, Maj + molette pour l’horizontal. Glisser partout sur la grille pour déplacer le plan ; un clic sans glisser ouvre un champ ou change une case. Dans un champ en cours de saisie, glisser sélectionne le texte. Le bouton central de la souris permet de déplacer le plan même depuis ce champ. Ctrl/Cmd + molette ou un pincement à deux doigts ajuste le zoom. Un clic sur le titre d’un volet (ou Entrée au clavier) — Élèves, Exercices, Résultats, Compétences ou Compétences par élève — y conduit à 100 %, pour garder les textes lisibles. La carte propose les mêmes raccourcis ; seule la vue d’ensemble réduit tout le plan.</p><p><strong>Transposer</strong> : le bouton Transposer dans la barre supérieure échange élèves et exercices. Les résultats par compétence et les cases d’association se replacent automatiquement ; les données restent identiques. Entrée descend dans la colonne visible et Tab avance dans la ligne visible, y compris pour le collage de blocs.</p><p><strong>Compétences affichées</strong> : utiliser le commutateur Retenues / Catalogue dans l’en-tête Compétences. Les filtres masquent des lignes sans supprimer de données.</p><p><strong>Revenir au début</strong> : cliquer sur GrilleÉval dans la barre supérieure. La vue d’ensemble, à côté du zoom en bas à droite, cadre tout le plan ; le même bouton revient exactement à votre position précédente.</p><p><strong>Garder ses repères</strong> : les intitulés d’exercices restent en haut et les noms ou compétences restent à gauche pendant le défilement. La carte permet de revenir aux différentes zones du plan.</p><p><strong>Saisir les points</strong> : virgule ou point, deux décimales maximum. Entrée descend, Maj + Entrée remonte ; Tab avance dans la ligne. Les flèches haut/bas passent aussi d’un élève à l’autre. Échap annule la saisie en cours. Un champ vide est une valeur manquante ; zéro reste zéro.</p><p><strong>Coller depuis un tableur</strong> : sélectionner une cellule de points et coller un bloc de valeurs séparées par tabulations et lignes. Tout le bloc est vérifié avant son insertion.</p><p><strong>Associer au clavier</strong> : les flèches parcourent les cases d’association visibles. Espace coche ou décoche. Les catégories repliées sont ignorées.</p><p><strong>Modifier les listes</strong> : + ajoute un élément. Cliquer sur un nom, un intitulé ou un texte de compétence pour le modifier. Les textes de compétence restent complets. Retirer un élément se fait dans ce même dialogue.</p><p><strong>Catalogue</strong> : à gauche de la zone Compétences, sur le même plan. Les filtres à gauche du raster modifient les lignes visibles, sans supprimer les associations masquées. Filtrer par matière, cycle et domaine, puis cocher directement un exercice pour reprendre le texte. Le cercle à gauche permet de retenir une compétence sans association, ou de la retirer ; une confirmation protège les associations existantes. La recherche filtre les descripteurs du plan fourni (2026), cycles 1 à 4. + Compétence ouvre une ligne avec son propre texte et ses cases d’association. Le menu du filtre donne accès au PDF original et aux imports.</p><p><strong>Résultats et barème</strong> : dans les lignes des élèves, ou au-dessus des exercices après transposition. Le diagramme suit l’orientation : barres horizontales ou colonnes verticales. Déplacer les seuils sur leur axe, ou saisir leurs valeurs dans le menu du barème. Seuls les élèves entièrement évalués entrent dans les statistiques.</p><p><strong>Compétences par élève</strong> : à droite des cases d’association, sur les mêmes lignes de compétences. Les noms des élèves sont au-dessus des résultats ; chaque descripteur reste entier à gauche. Le pourcentage additionne les points des exercices associés puis les divise par leur maximum total. Le même barème détermine le niveau ; un résultat incomplet reste provisoire et gris. Aucune association donne un résultat non évalué. Les associations, notes et seuils actualisent ces colonnes automatiquement. Résultats par élève affiche temporairement les seules compétences retenues ; Associer revient au catalogue et à ses catégories précédentes.</p><p><strong>Codes dans le titre</strong> : saisir un code dans le titre en haut puis appuyer sur Entrée. c201010 remplit 20 élèves, 10 exercices, 10 compétences. c603030 crée 60 / 30 / 30. Plus de 99 : c120-30-25. Le remplissage remplace les données actuelles et peut être annulé.</p><p><strong>Conserver le travail</strong> : enregistrement automatique dans ce navigateur. Exporter JSON crée une sauvegarde complète ; le menu permet de la rouvrir. Les données ne sont pas synchronisées entre appareils. Les 60 étapes d’annulation restent disponibles durant la session.</p><p><strong>Absence</strong> : cliquer sur le nom d’un élève et cocher « Absent(e) à ce test ». Sa ligne reste dans la grille, sans résultat ; il ne compte pas dans les statistiques et ne reçoit pas de page de garde par défaut.</p><p><strong>Pages de garde</strong> : Fichier › Pages de garde (PDF), ou Ctrl/Cmd + P. Une page A4 par élève, comme le modèle papier : en-tête, attitude et écriture à entourer, observations, signature des parents, évaluation globale et compétences retenues avec la croix proposée par le barème. Choisir les élèves, survoler un nom pour sa version abrégée ; attitude au travail et écriture se choisissent dans la même liste (Alt-clic : pour tous les élèves cochés). Instituteur et école se saisissent dans Informations de l’évaluation, le logo dans la fenêtre des pages de garde.</p><p>Ctrl/Cmd + Z annule une modification, Ctrl/Cmd + Maj + Z la rétablit. Le premier lancement contient des élèves et des points fictifs. Le catalogue reprend les descripteurs socles et avancés du plan fourni (2026).</p></div>`});}

function fillExample(raw){
 const values=parseCode(raw);if(!commitDraft())return false;if(overview)leaveOverview();
 mutation(()=>{const prev=d;d=values.join(',')==='14,12,5'?mathDemo():seed(values);resetCatalogueContext();d.grading=clone(prev.grading);d.catalogue=clone(prev.catalogue);if(prev.teacher)d.teacher=prev.teacher;if(prev.school)d.school=prev.school;active=null;},'Exemple chargé · données fictives · annulation possible.',{shape:true});jump('students');return true;
}
function commitTitle(allowCode=false){
 const value=codeInput.value.trim();if(value===d.title)return;
 try{if(/^c\d/i.test(value)){if(allowCode)fillExample(value);else codeInput.value=d.title;return;}const title=text(value,'Titre');if(!commitDraft())return;mutation(()=>{d.title=title;},'Titre modifié.');}catch(error){codeInput.setCustomValidity(error.message);notice(error.message,true);}
}
$('[data-title-form]').addEventListener('submit',event=>{event.preventDefault();commitTitle(true);});
codeInput.addEventListener('change',()=>{if(!/^c\d/i.test(codeInput.value.trim()))commitTitle();});
codeInput.addEventListener('input',()=>codeInput.setCustomValidity(''));
codeInput.addEventListener('keydown',event=>{if(event.key==='Escape'){codeInput.value=d.title;codeInput.setCustomValidity('');codeInput.blur();}});

root.addEventListener('click',event=>{
 if(event.target.matches('input[data-p]')){const e=event.target;if(!e.classList.contains('ge-editing')){focusGrade(e.dataset.p,e.dataset.t);selectAllNode=null;}else if(selectAllNode===e){e.select();selectAllNode=null;}return;}
 const b=event.target.closest('button');if(!b)return;
 try {
 if(b.hasAttribute('data-open-setup-catalogue')){openSetupCatalogue();jumpCatalogue();return;}if(b.hasAttribute('data-close-setup-catalogue')){closeSetupCatalogue();return;}
 if(b.hasAttribute('data-back-associations')){backToAssociations();return;}if(b.dataset.fitPane){fitPane(b.dataset.fitPane);return;}if(b.dataset.focusPane){focusPane(b.dataset.focusPane);return;}
 if(b.hasAttribute('data-show-catalogue')){setVisibility('all');return;}if(b.hasAttribute('data-competency-visibility')){setVisibility(b.dataset.competencyVisibility);return;}
 if(b.dataset.add){add(b.dataset.add);return;}
 if(b.dataset.editStudent){editStudent(b.dataset.editStudent);return;}
 if(b.dataset.editTask){editTask(b.dataset.editTask);return;}
 if(b.dataset.editCompetency){editCompetency(b.dataset.editCompetency);return;}
 if(b.dataset.jump){jump(b.dataset.jump);return;}
 if(b.dataset.zoom){if(overview&&!bilanOrigin)leaveOverview();if(b.dataset.zoom==='actual'){modal({title:'Zoom',fields:[{name:'zoom',label:'Zoom en %',value:String(Math.round(view.zoom*100)),required:true,numeric:true}],submit:'Appliquer',onSubmit:v=>{const n=Number(v.zoom);if(!Number.isFinite(n)||n<2||n>180)throw new Error('Choisir entre 2 et 180 %.');afterDialog=()=>zoomTo(n/100);}});}else zoomTo(view.zoom*(b.dataset.zoom==='in'?1.25:.8));return;}
 const a=b.dataset.action;if(!a)return;closeMenus();if(a.startsWith('bilan-')){bilanAction(a);return;}if(a==='tour'){startTour();return;}if(a==='math-demo'){if(!commitDraft())return;if(overview)leaveOverview();mutation(()=>{d=mathDemo();active=null;resetCatalogueContext();},'Test de mathématiques chargé · données fictives · annulation possible.',{shape:true});jump('students');return;}
 if(a==='home')home();if(a==='transpose')transpose();if(a==='undo')undo();if(a==='redo')undo(true);if(a==='fit')fit();if(a==='export'||a==='save')exportJSON();if(a==='save-as')exportJSON(null,true);if(a==='open'&&commitDraft())guardUnsaved(()=>pickTestFile());if(a==='csv'&&commitDraft())download(toCSV(d),'grilleeval-points.csv','text/csv;charset=utf-8');
 

 if(a==='import-csv')pickStudentCsv();
 if(a==='import-eb')openEbImport();
 if(a==='metadata')modal({title:'Informations de l’évaluation',fields:[{name:'title',label:'Titre',value:d.title,required:true},{name:'date',label:'Date (JJ.MM.AAAA)',value:euroDate(d.date)},{name:'subject',label:'Matière',value:d.subject,required:true},{name:'cycle',label:'Cycle',value:d.cycle,required:true},{name:'duration',label:'Durée',value:d.duration||''},{name:'teacher',label:'Instituteur / institutrice (pages de garde)',value:d.teacher||''},{name:'school',label:'École (pages de garde)',value:d.school||''},{name:'observation',label:'Observations et remarques (pages de garde)',value:d.observation||'',multiline:true,rows:3}],onSubmit:v=>{if(/^c\d/i.test(v.title.trim())){const code=v.title.trim();afterDialog=()=>fillExample(code);return;}const values={title:text(v.title,'Titre'),subject:text(v.subject,'Matière'),cycle:text(v.cycle,'Cycle'),date:isoDate(v.date),duration:v.duration.trim(),teacher:v.teacher.trim().slice(0,200),school:v.school.trim().slice(0,200),observation:String(v.observation||'').trim().slice(0,600)};mutation(()=>{const contextChanged=d.subject!==values.subject||d.cycle!==values.cycle;Object.assign(d,values);if(contextChanged)resetCatalogueContext();},'Informations modifiées.');}});{const form=dialog.querySelector('form'),obs=form?.querySelector('[name="observation"]');if(obs){form.classList.add('ge-dialog-split');obs.closest('label').classList.add('ge-observation-field');}}enhanceDateField(dialog.querySelector('input[name="date"]'));
 if(a==='new'){if(!commitDraft())return;guardUnsaved(()=>newEvaluation());}
 if(a==='copies')openCopies();
 if(a==='fullscreen'){if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.({navigationUI:'hide'}).catch(()=>{b.hidden=true;notice('Plein écran refusé dans cette fenêtre. Sur Mac : ⌃⌘F dans le navigateur.',true);});}
 if(a==='pages-garde')pagesDeGarde();
 if(a==='overview')overviewPDF();
 if(a==='help')help();if(a==='map'){toggleMap();}
 }catch(error){notice(error.message,true);}
});
fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];fileInput.value='';if(file)openTestFile(file);});
async function openTestFile(file,handle=null){
 try{if(file.size>8*1024*1024)throw new Error('Ce fichier dépasse 8 Mo.');const next=validate(await file.text());upgradeCatalogue(next);const hash=docHash(encodeDocument(next));
  mutation(()=>{d=next;active=null;transposed=false;resetCatalogueContext();},`Test ouvert : ${next.title}.`,{shape:true});fileSavedHash=hash;fileHandle=handle;fileSaveKind='written';showSave();queueViewSave();requestAnimationFrame(()=>frameStart());}
 catch(error){notice('Ce fichier ne peut pas être ouvert : '+error.message,true);}}
board.addEventListener('focusin',event=>{
 const field=event.target;
 if(!field.matches('input[data-p],input[data-c],input[data-catalogue-link]'))return;
 const {p,c,t,catalogueLink}=field.dataset;
 if(p){if(!beginGrade(field))return;}
 else if(c){active={c,t};mark();}
 lastGridCell={p,c,t,catalogueLink};
 if(!restoringGridCell)requestAnimationFrame(()=>{if(document.activeElement===field)reveal(field);});
});
board.addEventListener('input',event=>{const e=event.target;if(!e.matches('input[data-p]'))return;selectAllNode=null;if(!draft||draft.node!==e)draft={node:e,p:e.dataset.p,t:e.dataset.t,dirty:false};draft.dirty=true;e.classList.add('ge-editing');e.classList.remove('ge-invalid');e.setCustomValidity('');try{const value=points(e.value,task(e.dataset.t).maxPoints);updateTotal(e.dataset.p,{t:e.dataset.t,value});}catch{}showSave();});
board.addEventListener('focusout',event=>{if(event.target===draft?.node)commitDraft();});
board.addEventListener('change',event=>{const e=event.target;if(!e.matches('input[data-c]'))return;const c=e.dataset.c,t=e.dataset.t;active={c,t};mutation(()=>{if(e.checked&&!d.links[c].includes(t))d.links[c].push(t);else if(!e.checked)d.links[c]=d.links[c].filter(id=>id!==t);},null,{render:false});linkCountNodes.get(c).textContent=d.links[c].length;});
board.addEventListener('paste',event=>{const e=event.target;if(!e.matches('input[data-p]'))return;const raw=event.clipboardData?.getData('text/plain')||'';if(!/[\t\r\n]/.test(raw))return;event.preventDefault();try{const updates=pasteBlock(d,e.dataset.p,e.dataset.t,raw,{transposed});if(!commitDraft())return;mutation(()=>{for(const [p,t,n]of updates)d.scores[p][t]=n;},`${updates.length} valeurs collées.`,{render:false});for(const [p,t,n]of updates){gradeNodes.get(key(p,t)).value=format(n);updateTotal(p);}draft={node:e,p:e.dataset.p,t:e.dataset.t,dirty:false};}catch(error){notice(error.message,true);}});
board.addEventListener('keydown',event=>{const e=event.target;if(!e.matches('input[data-c],input[data-catalogue-link]')||event.ctrlKey||event.metaKey||event.altKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();if(!commitDraft())return;const rows=[...board.querySelectorAll('[data-row-group="competencies"]')].filter(row=>row.querySelector('input[data-c],input[data-catalogue-link]'));let ri=rows.indexOf(e.closest('tr')),ti=d.tasks.findIndex(t=>t.id===e.dataset.t);if(event.key==='ArrowLeft')ti--;if(event.key==='ArrowRight')ti++;if(event.key==='ArrowUp')ri--;if(event.key==='ArrowDown')ri++;if(ri<0||ri>=rows.length||ti<0||ti>=d.tasks.length)return;const next=[...rows[ri].querySelectorAll('input[data-t]')].find(input=>input.dataset.t===d.tasks[ti].id);if(next){next.focus({preventScroll:true});reveal(next);}});
board.addEventListener('keydown',event=>{const e=event.target;if(!e.matches('input[data-p]'))return;if(event.key==='Escape'){event.preventDefault();cancelDraft();e.blur();return;}if(event.ctrlKey||event.metaKey||event.altKey)return;if(!['Enter','Tab','ArrowUp','ArrowDown'].includes(event.key))return;const p=e.dataset.p,t=e.dataset.t;if(!commitDraft()){event.preventDefault();return;}let pi=d.students.findIndex(x=>x.id===p),ti=d.tasks.findIndex(x=>x.id===t);const step=event.key==='ArrowUp'||event.key==='Enter'&&event.shiftKey||event.key==='Tab'&&event.shiftKey?-1:1;if(transposed){if(event.key==='Tab'){pi+=step;if(pi>=d.students.length){pi=0;ti++;}if(pi<0){pi=d.students.length-1;ti--;}}else ti+=step;}else{if(event.key==='Tab'){ti+=step;if(ti>=d.tasks.length){ti=0;pi++;}if(ti<0){ti=d.tasks.length-1;pi--;}}else pi+=step;}if(pi>=0&&pi<d.students.length&&ti>=0&&ti<d.tasks.length){event.preventDefault();focusGrade(d.students[pi].id,d.tasks[ti].id);}else if(event.key!=='Tab')event.preventDefault();});
board.addEventListener('focusin',()=>schedule());board.addEventListener('focusout',()=>schedule());
vp.addEventListener('scroll',()=>{if(scrollSettling)deferAutomaticResults();cameraDirty=true;schedule();},{passive:true});
vp.addEventListener('scrollend',event=>{if(event.target===vp)finishAutomaticResultsScroll();},{passive:true});
surface.addEventListener('wheel',event=>{if(event.target.closest('.ge-menu-panel,.ge-descriptor-tooltip'))return;if(event.ctrlKey||event.metaKey){wheelZooming=true;clearTimeout(wheelZoomTimer);wheelZoomTimer=setTimeout(()=>{wheelZooming=false;schedule();},180);event.preventDefault();const r=vp.getBoundingClientRect();zoomTo(view.zoom*Math.exp(-event.deltaY*.006),{x:event.clientX-r.left,y:event.clientY-r.top});}else{if(!bilanOrigin)deferAutomaticResults();if(event.shiftKey&&Math.abs(event.deltaX)<1){event.preventDefault();vp.scrollLeft+=event.deltaY;schedule();}}},{passive:false});
vp.addEventListener('touchstart',event=>{if(!bilanOrigin&&event.touches.length===1)deferAutomaticResults();},{passive:true});
// Native controls receive a click only when the gesture stayed below the
// threshold. Preventing pointer-down focus keeps a closed score cell draggable.
const PAN_THRESHOLD=6;
surface.addEventListener('pointerdown',event=>{
 inside=true;
 if(event.pointerType==='touch'||event.isPrimary===false||event.target.closest('.ge-map,.ge-zoom,[data-direct-control],select,textarea,input[type=search],input[type=number]'))return;
 const r=vp.getBoundingClientRect();
 if(event.clientX<r.left||event.clientY<r.top||event.clientX>=r.left+vp.clientWidth||event.clientY>=r.top+vp.clientHeight)return;
 if(event.button!==0&&event.button!==1)return;
 const editing=event.target.closest('input[data-p].ge-editing');
 if(event.button===0&&editing&&!space)return;
 event.preventDefault();
 pan={id:event.pointerId,x:event.clientX,y:event.clientY,left:vp.scrollLeft,top:vp.scrollTop,dragging:event.button===1};
 if(pan.dragging)startPan(event);
},{capture:true});
function startPan(event){
 pan.dragging=true;setRowHover(null);
 surface.classList.add('ge-panning');vp.classList.add('ge-panning');
 surface.setPointerCapture?.(event.pointerId);
}
surface.addEventListener('pointermove',event=>{
 if(!pan||event.pointerId!==pan.id)return;
 if(event.buttons===0){endPan();return;}
 const dx=event.clientX-pan.x,dy=event.clientY-pan.y;
 if(!pan.dragging&&Math.hypot(dx,dy)<PAN_THRESHOLD)return;
 if(!pan.dragging)startPan(event);
 event.preventDefault();
 vp.scrollLeft=pan.left-dx;vp.scrollTop=pan.top-dy;
 rememberCamera();schedule();
});
function endPan(event){
 if(!pan||event&&event.pointerId!==pan.id)return;
 const gesture=pan;pan=null;
 surface.classList.remove('ge-panning');vp.classList.remove('ge-panning');
 if(event?.type==='pointerup'&&gesture.dragging){
  suppressClick=true;
  // The compatibility click follows pointerup in the same event turn.
  // Clear afterwards, so an unrelated next click is never swallowed.
  setTimeout(()=>{suppressClick=false;},0);
 }
 if(surface.hasPointerCapture?.(gesture.id))surface.releasePointerCapture(gesture.id);
 schedule();
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(name,endPan);
for(const name of ['pointerup','pointercancel'])window.addEventListener(name,endPan);
surface.addEventListener('click',event=>{
 if(suppressClick&&event.detail!==0){
  suppressClick=false;event.preventDefault();event.stopImmediatePropagation();return;
 }
 const field=event.target.closest('input[data-p]');
 if(draft&&draft.node!==field){
  if(!commitDraft()){event.preventDefault();event.stopImmediatePropagation();return;}
  if(document.activeElement?.matches?.('input[data-p]'))document.activeElement.blur();
 }
},{capture:true});
surface.addEventListener('auxclick',event=>{if(event.button===1&&!event.target.closest('.ge-map'))event.preventDefault();});
surface.addEventListener('dragstart',event=>{if(!event.target.closest('input.ge-editing,.ge-map'))event.preventDefault();});
document.addEventListener('pointerdown',event=>{const current=event.target.closest?.('details');for(const menu of root.querySelectorAll('details[open]'))if(menu!==current&&!menu.contains(current))menu.open=false;if(!root.contains(event.target))inside=false;});
document.addEventListener('keydown',event=>{if(!bilanOrigin&&!dialog.open&&(event.ctrlKey||event.metaKey)&&!event.shiftKey&&!event.altKey&&event.key.toLowerCase()==='p'){event.preventDefault();pagesDeGarde();}});
document.addEventListener('keydown',event=>{
 if(dialog.open)return;
 if(event.key==='Escape'){if(event.target.matches?.('[data-free-text]')){event.preventDefault();freeOpen=false;freeDraft='';refreshCatalogue();return;}closeMenus();if(!$('[data-map-navigate]').hidden){toggleMap(false);$('[data-action="map"]').focus({preventScroll:true});}if(!bilanOrigin)clearGridFocus();return;}
 const undoKey=(event.ctrlKey||event.metaKey)&&!event.altKey&&(event.key.toLowerCase()==='z'||event.key.toLowerCase()==='y'&&!event.shiftKey);if(undoKey&&(root.contains(document.activeElement)||inside)&&!dialog.open){if(event.target.matches?.('input,textarea')&&(bilanOrigin||!event.target.matches('input[data-p]')||draft?.dirty))return;event.preventDefault();undo(event.shiftKey||event.key.toLowerCase()==='y');}
 if(event.code==='Space'&&inside&&!event.target.closest?.('input,textarea,select,button,summary')){event.preventDefault();space=true;vp.classList.add('ge-space');}
});
document.addEventListener('keyup',event=>{if(event.code==='Space'){space=false;vp.classList.remove('ge-space');}});
window.addEventListener('blur',()=>{pinch=null;gestureZoom=null;wheelZooming=false;space=false;vp.classList.remove('ge-space');endPan();});
// D1.63 · La carte se ferme d’un clic à côté (comme un popover) ; le clic garde son effet normal.
document.addEventListener('pointerdown',event=>{const map=$('[data-map-navigate]');if(!map||map.hidden)return;if(event.target.closest?.('[data-map-navigate],[data-map-shortcuts],[data-action="map"]'))return;toggleMap(false);},true);
function toggleMap(open=$('[data-map-navigate]').hidden){$('[data-map-navigate]').hidden=!open;$('[data-map-shortcuts]').hidden=!open;$('[data-action="map"]').setAttribute('aria-expanded',String(open));}
$('[data-map-navigate]').addEventListener('click',event=>{if(event.detail===0)return bilanOrigin?revealBilanResults():focusPane('points');const r=$('[data-map-svg]').getBoundingClientRect();const x=(event.clientX-r.left)/r.width*180,y=(event.clientY-r.top)/r.height*125;panTo(Math.max(0,(x-mapOffset.x)/mapScale),Math.max(0,(y-mapOffset.y)/mapScale),true);});
{const fs=$('[data-action="fullscreen"]');if(fs){fs.hidden=!document.fullscreenEnabled;document.addEventListener('fullscreenchange',()=>{const on=Boolean(document.fullscreenElement);fs.setAttribute('aria-pressed',String(on));fs.innerHTML=on?'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 3.5 11 9M11 4.5V9h4.5M3.5 16.5 9 11M9 15.5V11H4.5"/></svg>':'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.5 3.5h5v5M16.5 3.5l-5.5 5.5M8.5 16.5h-5v-5M3.5 16.5 9 11"/></svg>';fs.title=on?'Quitter le plein écran':'Plein écran';fs.setAttribute('aria-label',fs.title);schedule(true);});}}
// Carte : on peut aussi saisir le rectangle (ou n'importe quel point) et le faire glisser.
{const nav=$('[data-map-navigate]');let drag=null,dragged=false;
 const mapPoint=e=>{const r=$('[data-map-svg]').getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*180,y:(e.clientY-r.top)/r.height*125};};
 const camera=()=>{const z=view.zoom,cam=scrollCache?.map;return {x:mapOffset.x+vp.scrollLeft/z*mapScale,y:mapOffset.y+vp.scrollTop/z*mapScale,w:Number(cam?.getAttribute('width'))||0,h:Number(cam?.getAttribute('height'))||0};};
 const inside=(p,c)=>p.x>=c.x&&p.x<=c.x+c.w&&p.y>=c.y&&p.y<=c.y+c.h;
 nav.addEventListener('pointerdown',e=>{if(e.button!==0)return;const p=mapPoint(e),c=camera(),hit=inside(p,c);drag={dx:hit?p.x-c.x:c.w/2,dy:hit?p.y-c.y:c.h/2,x0:e.clientX,y0:e.clientY};dragged=false;try{nav.setPointerCapture(e.pointerId);}catch{}});
 nav.addEventListener('pointermove',e=>{
  if(!drag){nav.classList.toggle('ge-map-grab',inside(mapPoint(e),camera()));return;}
  if(!dragged&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<3)return;
  dragged=true;nav.classList.add('ge-map-dragging');const p=mapPoint(e),z=view.zoom;
  vp.scrollLeft=Math.max(0,(p.x-drag.dx-mapOffset.x)/mapScale*z);vp.scrollTop=Math.max(0,(p.y-drag.dy-mapOffset.y)/mapScale*z);});
 const end=()=>{if(!drag)return;drag=null;nav.classList.remove('ge-map-dragging');if(dragged){rememberCamera();schedule();}};
 nav.addEventListener('pointerup',end);nav.addEventListener('pointercancel',end);
 nav.addEventListener('pointerleave',()=>{if(!drag)nav.classList.remove('ge-map-grab');});
 nav.addEventListener('click',e=>{if(dragged){e.stopImmediatePropagation();e.preventDefault();dragged=false;}},true);}
window.addEventListener('pagehide',()=>{commitDraft();persist();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){commitDraft();persist();}});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>schedule(true)).observe(vp);
function mountWorkspace(){
 // All floating controls share the real scroll container. Native wheel/momentum
 // therefore follows the same path over headers, labels, results and grid cells.
 world.insertAdjacentHTML('afterbegin','<div class="ge-scroll-pins" data-scroll-pins><div class="ge-scroll-frame" data-scroll-frame></div></div>');
 const frame=$('[data-scroll-frame]');for(const node of [headPin,labelsPin,cornerPin,$('.ge-zoom'),$('.ge-map')])frame.append(node);
 
 stage.insertAdjacentHTML('beforeend','<aside class="ge-canvas-filters" data-filter-panel aria-label="Filtrer les compétences"></aside>');filterPanel=$('[data-filter-panel]');frame.insertAdjacentHTML('beforeend','<section class="ge-pin-results" data-region="results" aria-label="Résultats alignés sur les élèves" hidden></section>');resultsPin=$('[data-region="results"]');catalogueFilter={subject:subjectName(d.subject),cycle:cycleRoot(d.cycle),section:'',search:'',kind:'',pathway:''};workspaceMounted=true;bindInlineCatalogue();bindResults();}

function finishGradingDrag(event,cancel=false){
 const drag=gradingDrag;if(!drag||event&&event.pointerId!==drag.pointerId)return;gradingDrag=null;drag.line.classList.remove('ge-dragging-threshold');
 if(drag.line.hasPointerCapture?.(drag.pointerId))drag.line.releasePointerCapture(drag.pointerId);
 if (drag.report) {
  if (cancel) drag.report.previewGrading(drag.report.getGrading());
  else if (drag.scale.thresholds.some((n,i)=>n!==drag.thresholds[i])) drag.report.applyGrading(drag.scale);
  return;
 }
 if(cancel){d.grading={...d.grading,thresholds:drag.thresholds};updateResults();return;}
 if(JSON.stringify(d.grading.thresholds)!==JSON.stringify(drag.thresholds)){history.push(drag.before);if(history.length>60)history.shift();future=[];revision++;syncCounts();updateHistory();queueSave();notice('Barème mis à jour. Annulation possible.');}
}
function catalogueEntries(){
 const rows=[],included=new Set();
 for(const original of d.catalogue){const selected=catalogueSelection(d,original),entry=selected?{...original,text:selected.text}:original;if(!matchesCompetency(entry,{...catalogueFilter,section:''}))continue;if(selected)included.add(selected.id);rows.push({entry,selected});}
 const custom=d.competencies.filter(c=>!included.has(c.id)&&matchesCompetency({...c,...competencyMeta(d,c)},{...catalogueFilter,section:''})).filter(c=>!c.catalogueId||!d.catalogue.some(e=>e.id===c.catalogueId));
 const result=[...custom.map(c=>({entry:{...c,...competencyMeta(d,c),id:'free:'+c.id},selected:c})),...rows];return catalogueUsedOnly?result.filter(r=>r.selected):result;
}
// D1.41 · Lecture des résultats (mode automatique) : toutes les catégories restent visibles ;
// dans une catégorie qui a des compétences retenues, seules celles-ci s’affichent.
function readingOnlyRetained(){return autoResultsOnly&&!catalogueUsedOnly;}
function cataloguePage(){const rows=catalogueEntries(),max=Math.max(1,Math.floor(LIMIT/Math.max(1,d.tasks.length))-d.students.length);return {rows,visible:rows.slice(0,Math.min(catalogueLimit,max)),max};}
function catalogueSource(){return `Plan fourni · ${PLAN_INFO.year} · ${PLAN_INFO.count} entrées`;}
function displayDescriptor(value){return String(value).trim().replace(/[;.]+$/u,'').trimEnd();}
// D1.52 · Les liens ouvrent le plan d’études en ligne (plandetudes.lu) au bon descripteur ; le PDF reste en secours.
function planHref(entry,section=false){const path=entry&&PLAN_LINKS[entry.id];return path?PLAN_ONLINE+(section?path.split('#')[0]:path):'';}
function pageLink(entry,label='p. ',section=false){const href=planHref(entry,section);if(href)return `<a class="ge-plan-page" href="${esc(href)}" target="_blank" rel="noopener" data-direct-control title="${section?'Ouvrir ce sous-domaine':'Ouvrir ce descripteur'} dans le plan d’études en ligne">${label.startsWith('Plan')?'Plan d’études':'Plan'}<span aria-hidden="true"> ↗</span></a>`;return entry?.page?`<a class="ge-plan-page" href="${PLAN_PDF}#page=${entry.page}" target="_blank" rel="noopener" data-direct-control title="Voir le descripteur dans le plan fourni">${label}${esc(entry.printedPage||entry.page-2)}</a>`:'';}
function catalogueLabel(entry,selected=catalogueSelection(d,entry),sharedPage=false){
 const full=selected?.text||entry.text,level=entry.kind==='libre'||entry.id?.startsWith('free:')?'Libre':entry.level||'Libre';
 const selector=selected?`data-toggle-retained="${esc(selected.id)}"`:`data-catalogue-adopt="${esc(entry.id)}"`;
 return `<div class="ge-compact-descriptor ${selected?'ge-retained':''}" title="${esc(full)}"><button type="button" class="ge-retain-toggle" role="checkbox" aria-checked="${Boolean(selected)}" aria-label="${selected?'Retirer':'Retenir'} : ${esc(full)}" ${selector}><span class="ge-selection-circle" aria-hidden="true">${selected?'<svg viewBox="0 0 20 20"><path d="m5 10 3 3 7-7"/></svg>':''}</span></button><div class="ge-descriptor-line">${selected?`<button type="button" class="ge-descriptor-text" data-edit-competency="${esc(selected.id)}" aria-label="Modifier la compétence ${d.competencies.indexOf(selected)+1} · ${esc(displayDescriptor(full))}" title="${esc(full)}"><span class="ge-label-text">${highlightSearch(displayDescriptor(full))}</span></button>`:`<span class="ge-label-text">${highlightSearch(displayDescriptor(full))}</span>`}</div><div class="ge-descriptor-meta"><span title="${esc([level,entry.pathway].filter(Boolean).join(' · '))}">${esc([level,entry.pathway].filter(Boolean).join(' · '))}</span>${selected?`<small class="ge-competency-basis" data-competency-basis="${esc(selected.id)}"><span data-links-count="${esc(selected.id)}">${d.links[selected.id].length}</span> ex. · <span data-competency-max="${esc(selected.id)}">${format(competencyResult(d,d.students[0]?.id,selected.id).possible)}</span> pts</small>`:''}${sharedPage?'':pageLink(entry)}</div></div>`;
}
function removeRetained(id){const c=competency(id);if(!c||!commitDraft())return;const remove=()=>mutation(()=>{d.competencies=d.competencies.filter(k=>k.id!==id);delete d.links[id];},'Compétence retirée. Annulation possible.',{shape:true});const n=d.links[id].length;if(n)modal({title:'Retirer cette compétence ?',note:`${n} association${n>1?'s':''} avec les exercices ${n>1?'seront retirées':'sera retirée'}. Les points des élèves restent conservés. Vous pourrez annuler cette action.`,submit:'Retirer',onSubmit:remove});else remove();}

function catalogueTools(){
 const subjects=[...new Set([...d.catalogue.map(c=>subjectName(c.subject)),...d.competencies.map(c=>competencyMeta(d,c).subject)])].sort((a,b)=>a.localeCompare(b,'fr'));
 const options=(list,value)=>list.map(s=>`<option value="${esc(s)}" ${s===value?'selected':''}>${esc(s)}</option>`).join('');
 return `<div class="ge-compact-controls" data-catalogue-tools><h3>Catalogue des compétences</h3><label class="ge-filter-search-field">Recherche<span class="ge-search-box"><input type="search" data-catalogue-search aria-label="Chercher dans le catalogue" placeholder="Mot-clé ou texte du descripteur…" value="${esc(catalogueFilter.search)}"><button type="button" class="ge-search-clear" data-catalogue-search-clear aria-label="Effacer la recherche" ${catalogueFilter.search?'':'hidden'}>${icon('close')}</button></span></label><div class="ge-filter-context"><label>Matière<select data-catalogue-subject aria-label="Matière du catalogue"><option value="">Toutes les matières</option>${options(subjects,catalogueFilter.subject)}</select></label><label>Cycle<select data-catalogue-cycle aria-label="Cycle du catalogue"><option value="">Tous</option>${['1','2','3','4'].map(c=>`<option value="${c}" ${c===catalogueFilter.cycle?'selected':''}>${c}</option>`).join('')}</select></label></div><label>Catégories ouvertes<select data-catalogue-section aria-label="Catégories ouvertes du catalogue" title="Ouvrir uniquement la catégorie choisie ; les autres restent disponibles sur le plan"></select></label><label>Niveau<select data-catalogue-kind aria-label="Niveau du catalogue"><option value="">Socle et avancé</option><option value="socle">Socle</option><option value="avance">Avancé</option><option value="libre">Compétences libres</option></select></label><label data-pathway-control hidden>Parcours de langue<select data-catalogue-pathway aria-label="Parcours de langue"><option value="">Tous les parcours</option><option value="Alphabétisation">Alphabétisation</option><option value="Deuxième langue">Deuxième langue</option></select></label><div class="ge-filter-status"><span data-catalogue-count role="status" aria-live="polite"></span><button type="button" class="ge-search-results-action" data-show-search hidden>Afficher les résultats</button><details class="ge-menu ge-catalogue-menu"><summary class="ge-filter-more" aria-label="Catalogue et source" title="Plan d’études et import du catalogue">${icon('more')}</summary><div class="ge-menu-panel"><small data-catalogue-source>${esc(catalogueSource())}</small><a href="${PLAN_ONLINE}" target="_blank" rel="noopener">Plan d’études en ligne</a><a href="${PLAN_PDF}" target="_blank" rel="noopener">Plan complet (PDF 2026)</a><button type="button" data-catalogue-import>Importer un catalogue JSON…</button><button type="button" data-catalogue-template>Exporter le catalogue</button></div></details></div><span data-catalogue-selected hidden></span><input type="file" data-catalogue-file accept=".json,application/json" hidden></div>`;
}
function syncCatalogueOptions(){
 const levelSelect=$('[data-catalogue-kind]');if(levelSelect)levelSelect.value=catalogueFilter.kind||'';
 const languageTrack=['Langue allemande','Langue française'].includes(catalogueFilter.subject)&&catalogueFilter.cycle==='2';const pathwayControl=$('[data-pathway-control]');if(pathwayControl)pathwayControl.hidden=!languageTrack;const pathwaySelect=$('[data-catalogue-pathway]');if(pathwaySelect)pathwaySelect.value=catalogueFilter.pathway||'';
 const sections=[...new Set([...d.catalogue,...d.competencies.map(c=>({...c,...competencyMeta(d,c)}))].filter(c=>(!catalogueFilter.subject||subjectName(c.subject)===catalogueFilter.subject)&&(!catalogueFilter.cycle||cycleRoot(c.cycle)===catalogueFilter.cycle)&&(!catalogueFilter.pathway||c.pathway===catalogueFilter.pathway)).map(c=>c.section).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
 if(catalogueFilter.section&&!sections.includes(catalogueFilter.section))catalogueFilter.section='';
 $('[data-catalogue-section]').innerHTML='<option value="" hidden>Catégories repliées</option><optgroup label="Toutes les catégories"><option value="__all">Tout ouvrir</option><option value="__none">Tout replier</option></optgroup>'+(sections.length?'<optgroup label="Ouvrir seulement">'+sections.map(s=>`<option value="${esc(s)}" ${s===catalogueFilter.section?'selected':''}>${esc(s)}</option>`).join('')+'</optgroup>':'');
}
function taskHeaders(){return d.tasks.map((t,i)=>`<th data-column="${esc(t.id)}">${taskHead(t,i)}</th>`).join('')||Array.from({length:GHOST_TASKS},(_,i)=>`<th class="ge-ghost-col">${ghostTaskHead(i)}</th>`).join('');}
function associationCells(entry,c){const cells=d.tasks.map(t=>`<td data-column="${esc(t.id)}"><label class="ge-check-label"><input type="checkbox" ${c?`data-c="${esc(c.id)}" ${linked(d,c.id,t.id)?'checked':''}`:`data-catalogue-link="${esc(entry.id)}"`} data-t="${esc(t.id)}" aria-label="${esc((c?.text||entry.text)+' — '+t.title)}"></label></td>`).join('');const padding=needsSetup()?0:(transposed?layout().secondary:layout().primary)-d.tasks.length;return cells+(padding?`<td colspan="${padding}"></td>`:'');}
function assessmentCells(c){if(needsSetup())return '';const slots=transposed?layout().primary:layout().secondary;if(!c||!d.students.length)return `<td class="ge-assessment-empty" colspan="${slots}"></td>`;return d.students.map(p=>competencyCell(p,c)).join('')+(slots>d.students.length?`<td colspan="${slots-d.students.length}"></td>`:'');}
function freeRow(){if(!freeOpen)return '';const checks=d.tasks.map(t=>`<td><label class="ge-check-label"><input type="checkbox" data-free-link="${esc(t.id)}" aria-label="Associer la nouvelle compétence libre à ${esc(t.title)}"></label></td>`).join(''),padding=needsSetup()?0:(transposed?layout().secondary:layout().primary)-d.tasks.length,links=checks+(padding?`<td colspan="${padding}"></td>`:''),blank=`<td colspan="${transposed?layout().primary:layout().secondary}"></td>`;return `<tr class="ge-free-row" data-free-row><th><form data-free-form data-direct-control><label>Nouvelle compétence libre<textarea data-free-text rows="3" aria-label="Texte de la compétence libre" placeholder="Écrire le descripteur complet…" required>${esc(freeDraft)}</textarea></label><div><button type="button" class="ge-button" data-free-cancel>Annuler</button><button type="submit" class="ge-button ge-primary">Ajouter</button></div><p data-free-error role="alert" hidden></p></form></th>${needsSetup()?links:transposed?blank+links:links+blank}</tr>`;}
function catalogueRow(entry,c,sharedPage=false){const checks=associationCells(entry,c),results=assessmentCells(c);return `<tr class="ge-candidate-row ${c?'ge-candidate-selected':''}" data-row-kind="${c?'competency':'candidate'}" data-row-id="${esc(c?.id||entry.id)}" data-row-group="competencies" data-catalogue-row="${esc(entry.id)}" ${c?'data-selected-competency':`aria-label="${esc(entry.text+' · compétence non retenue')}"`}><th>${catalogueLabel(entry,c,sharedPage)}</th>${needsSetup()?checks:transposed?results+checks:checks+results}</tr>`;}
function syncExpandedCategory(groups=null){
 if(!groups){const selected=catalogueUsedOnly,auto=autoResultsOnly;catalogueUsedOnly=false;autoResultsOnly=false;try{groups=catalogueGroups();}finally{catalogueUsedOnly=selected;autoResultsOnly=auto;}}
 const map=catalogueUsedOnly?groupOpen:visibleGroups(),open=groups.filter(g=>{if(!map.has(g.key))map.set(g.key,defaultGroupOpen(g));return map.get(g.key);}),sections=[...new Set(open.map(g=>g.title))];const select=$('[data-catalogue-section]');if(!select)return;const first=select.querySelector('option[value=""]');const all=groups.length>1&&open.length===groups.length;if(first)first.textContent=all?'Toutes les catégories ouvertes':sections.length>1?'Plusieurs catégories ouvertes':sections.length===0?'Catégories repliées':sections[0];select.value=sections.length===1&&!all?sections[0]:'';
}
// Snapshot defaults once per filter context; selection edits must never fold a row.
function visibleGroups(){return autoResultsOnly||catalogueUsedOnly?autoGroupOpen:groupOpen;}
// D1.39 · Pendant une recherche (2 caractères ou plus), les catégories trouvées s’ouvrent d’elles-mêmes.
function searching(){return (catalogueFilter.search||'').trim().length>=2;}
function defaultGroupOpen(group){return searching()||group.rows.some(row=>Boolean(row.selected));}
function groupExpanded(group){const groups=visibleGroups();if(!groups.has(group.key))groups.set(group.key,defaultGroupOpen(group));return groups.get(group.key);}
// Surligner le texte cherché (sans tenir compte des accents ni des majuscules).
function foldChar(ch){return ch.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();}
function highlightSearch(value,search=catalogueFilter.search){const str=String(value??''),query=[...(search||'').trim()].map(foldChar).join('');if(!query)return esc(str);
 let folded='',pos=0;const owner=[],starts=[],ends=[];for(const ch of str){for(const c of foldChar(ch)){folded+=c;owner.push(starts.length);}starts.push(pos);pos+=ch.length;ends.push(pos);}
 let out='',last=0,from=0,at;while((at=folded.indexOf(query,from))>=0){const a=starts[owner[at]],b=ends[owner[at+query.length-1]];if(a>=last){out+=esc(str.slice(last,a))+`<mark class="ge-search-hit">${esc(str.slice(a,b))}</mark>`;last=b;}from=at+query.length;}
 return out+esc(str.slice(last));}

function resetCatalogueContext(){if(bilanOrigin)closeBilan(false);lastGridCell=null;setupCatalogueOpen=false;autoResultsOnly=false;autoGroupOpen.clear();catalogueUsedOnly=preferredUsedOnly;associationContext=null;groupOpen.clear();groupLimits.clear();catalogueLimit=80;catalogueFilter={subject:subjectName(d.subject),cycle:cycleRoot(d.cycle),section:'',search:'',kind:'',pathway:''};if(filterPanel)filterPanel.innerHTML=catalogueTools();}
function catalogueGroups(page=cataloguePage()){const groups=new Map();for(const row of page.rows){const key=row.entry.subject+'::'+(row.entry.section||'Personnalisées');if(!groups.has(key))groups.set(key,{key,title:row.entry.section||'Personnalisées',rows:[]});groups.get(key).rows.push(row);}return [...groups.values()];}
function autoNoteRow(all){const n=d.competencies.length;return `<tr class="ge-catalogue-category ge-auto-note-row" data-row-kind="note" data-row-id="auto-note" data-row-group="competencies"><th colspan="${all}"><div class="ge-category-heading ge-auto-note"><span class="ge-auto-note-text"><strong>${n} compétence${n>1?'s':''} retenue${n>1?'s':''}</strong></span></div></th></tr>`;}
function catalogueRows(all,page=cataloguePage()){if(needsSetup())all=1+d.tasks.length;let budget=page.max;const groups=catalogueGroups(page);return freeRow()+groups.map(g=>{const selected=g.rows.filter(r=>r.selected).length,open=groupExpanded(g),limit=groupLimits.get(g.key)||40,pool=readingOnlyRetained()&&selected?g.rows.filter(r=>r.selected):g.rows,rows=pool.slice(0,open?Math.min(limit,budget):0),first=g.rows[0]?.entry,shared=Boolean(first?.page)&&g.rows.every(r=>r.entry.page===first.page);if(open)budget-=rows.length;return `<tr class="ge-catalogue-category" data-row-kind="category" data-row-id="${esc(g.key)}" data-row-group="competencies"><th colspan="${all}"><div class="ge-category-heading"><button type="button" data-catalogue-group="${esc(g.key)}" title="${esc(g.title)}" aria-expanded="${open}"><span class="ge-category-chevron">${icon('chevron')}</span><strong>${esc(g.title)}</strong><span>${selected} sur ${g.rows.length} retenue${selected>1?'s':''}${catalogueFilter.search?` · ${g.rows.length} résultat${g.rows.length>1?'s':''}`:''}</span></button>${shared?pageLink(first,'Plan d’études p. ',true):''}</div></th></tr>`+(open?rows.map(r=>catalogueRow(r.entry,r.selected,shared)).join('')+(rows.length<pool.length?`<tr><td colspan="${all}" class="ge-empty">${budget>0?`<button type="button" class="ge-button" data-group-more="${esc(g.key)}">Afficher davantage</button>`:'Affiner les filtres pour afficher davantage.'}</td></tr>`:''):'');}).join('')+(autoResultsOnly&&!catalogueUsedOnly&&groups.length?autoNoteRow(all):'')+(groups.length?'':catalogueUsedOnly?`<tr><td colspan="${all}" class="ge-empty ge-empty-retained">Aucune compétence retenue pour l’instant.<br><button type="button" class="ge-button ge-primary" data-show-catalogue>Choisir dans le catalogue</button></td></tr>`:`<tr><td colspan="${all}" class="ge-empty">Aucune compétence pour ces filtres.<br><button type="button" class="ge-button" data-reset-catalogue>Revenir aux filtres du test</button></td></tr>`);}


function syncVisibility(){hidden(filterPanel,catalogueUsedOnly||needsSetup()&&!setupCatalogueOpen);for(const button of root.querySelectorAll('[data-competency-visibility]')){const selected=catalogueUsedOnly===(button.dataset.competencyVisibility==='selected');button.setAttribute('aria-checked',String(selected));button.setAttribute('tabindex',selected?'0':'-1');}}
function setVisibility(value,{temporary=false}={}){if(!commitDraft()){syncVisibility();return false;}if(overview)leaveOverview();const category=$('[data-catalogue-section]'),categoryValue=category?.value,categoryLabel=category?.querySelector('option[value=""]')?.textContent,anchor=retainedAnchor(),left=vp.scrollLeft,top=vp.scrollTop;autoChanging=true;autoResultsOnly=false;autoGroupOpen.clear();if(!temporary){preferredUsedOnly=value==='selected';associationContext=null;queueViewSave();}catalogueUsedOnly=value==='selected';refreshCatalogue();finishDescriptorResize();vp.scrollLeft=left;vp.scrollTop=top;correctRetainedAnchor(anchor);if(category){category.value=categoryValue;const first=category.querySelector('option[value=""]');if(first)first.textContent=categoryLabel;}autoChanging=false;rememberCamera();schedule();return true;}

function updateCatalogueStatus(page=cataloguePage()){
 const groups=catalogueGroups(page),rows=page.rows;syncVisibility();syncExpandedCategory(catalogueUsedOnly?null:groups);
 $('[data-catalogue-count]').textContent=`${catalogueFilter.search?`${rows.length} résultat${rows.length>1?'s':''} · `:''}${d.competencies.length} retenues · ${groups.length} catégorie${groups.length>1?'s':''}${catalogueFilter.search?'':` · ${rows.length} entrées`}`;
 const action=$('[data-show-search]');action.hidden=!catalogueFilter.search||!groups.some(g=>!groupExpanded(g));action.textContent=`Afficher les ${rows.length} résultat${rows.length>1?'s':''}`;$('[data-catalogue-selected]').textContent=`${d.competencies.length} dans la grille`;
}

// D1.52 · Le catalogue ne saute plus : le panneau reste exactement à la même place à l’écran.
// Si la liste raccourcit sous lui, c’est la liste qui remonte (la vue suit), jamais le panneau.
let panelY=null;
function catalogueAnchor(){return panelY!=null&&filterPanel?{y:panelY,s:panelY*view.zoom-vp.scrollTop}:null;}
function keepCatalogueAnchor(a){if(!a)return;const g=geometry.groups.find(g=>g.kind==='competencies');if(!g)return;const fh=filterPanel.offsetHeight||490,y=Math.min(Math.max(a.y,g.y),Math.max(g.y,g.bottom-fh));if(Math.abs(y-a.y)<.5)return;vp.scrollTop=Math.max(0,y*view.zoom-a.s);}
function refreshCatalogue(reset=false,{preserveViewport=true,animate=true}={}){
 const anchor=catalogueAnchor();
 if(reset)syncCatalogueOptions();const page=cataloguePage();$('[data-catalogue-rows]').innerHTML=catalogueRows(layout().all,page);indexCatalogue();updateCatalogueStatus(page);
 // Apply width writes in the same batch and measure once. Automatic folding
 // settles immediately, as before, without queuing a cancelled resize animation.
 resizeDescriptors(animate,false);measure();keepCatalogueAnchor(anchor);mark();schedule();
}
function adoptCatalogue(id,tid=null){
 const entry=d.catalogue.find(c=>c.id===id);if(!entry||!commitDraft())return false;
 let c=catalogueSelection(d,entry);if(c&&(!tid||d.links[c.id].includes(tid))){notice('Cette compétence est déjà utilisée.');return true;}
 capacity(d.students.length,d.tasks.length,d.competencies.length+(c?0:1));
 const anchor=catalogueAnchor();mutation(()=>{if(!c){c={id:newId('k'),text:entry.text,catalogueId:entry.id,subject:entry.subject,cycle:entry.cycle,section:entry.section,kind:entry.kind||'socle',level:entry.level,competence:entry.competence||'',source:entry.source,domain:entry.domain,pathway:entry.pathway,sourceScope:entry.sourceScope,...(entry.page?{page:entry.page}:{})};d.competencies.push(c);d.links[c.id]=[];}if(tid)d.links[c.id].push(tid);active={c:c.id,...(tid?{t:tid}:{})};},tid?'Compétence reprise et exercice associé.':'Compétence reprise sans association.',{shape:true});measure();keepCatalogueAnchor(anchor);if(tid){const input=linkNodes.get(key(c.id,tid));if(input){input.focus({preventScroll:true});reveal(input);}}return true;
}
function jumpCatalogue(focus=false){
 if(overview)leaveOverview();if(!commitDraft())return;if(needsSetup())openSetupCatalogue();if(focus){freeOpen=true;refreshCatalogue();}
 finishDescriptorResize();measure();const g=geometry.groups.find(g=>g.kind==='competencies');const banner=needsSetup()?worldRect([board.querySelector('[data-setup-catalogue-bar]')]):null;panTo(X-EXTEND-320,banner?banner.y+26:(g?.y??Y)-140);if(focus)$('[data-free-text]')?.focus({preventScroll:true});notice(needsSetup()?'Cocher le cercle à gauche pour retenir une compétence.':'Filtrer à gauche · cocher directement sous les exercices');
}
// D1.62 · + Compétence ouvre la ligne libre sur place : la vue ne bouge que si la ligne est hors de l’écran.
function openFreeCompetency(){
 if(!commitDraft())return;if(!freeOpen){freeOpen=true;refreshCatalogue();}
 const input=$('[data-free-text]');if(!input)return jumpCatalogue(true);input.focus({preventScroll:true});const row=input.closest('[data-free-row]');if(row){const r=row.getBoundingClientRect(),i=input.getBoundingClientRect(),bottom=vp.getBoundingClientRect().top+vp.clientHeight-90;if(r.bottom>bottom)vp.scrollTop+=Math.min(r.bottom-bottom,Math.max(0,i.top-vp.getBoundingClientRect().top-LOWER_HEAD*view.zoom-10));}reveal(input);
}
function addFreeCompetency(tid=null){
 if(!commitDraft())return false;const value=text(freeDraft,'Compétence'),meta={subject:catalogueFilter.subject||subjectName(d.subject),cycle:catalogueFilter.cycle||cycleRoot(d.cycle),section:catalogueFilter.section||'Personnalisées',kind:'libre',level:'Libre'};
 let c=d.competencies.find(c=>sameLabel(c.text,value));
 if(c&&(!tid||d.links[c.id].includes(tid))){notice('Cette compétence est déjà utilisée.');return true;}
 capacity(d.students.length,d.tasks.length,d.competencies.length+(c?0:1));
 mutation(()=>{if(!c){c={id:newId('k'),text:value,...meta};d.competencies.push(c);d.links[c.id]=[];}if(tid)d.links[c.id].push(tid);active={c:c.id,...(tid?{t:tid}:{})};groupOpen.set(meta.subject+'::'+meta.section,true);freeDraft='';freeOpen=false;catalogueFilter.search='';if(catalogueFilter.kind&&catalogueFilter.kind!=='libre')catalogueFilter.kind='';},'Compétence libre ajoutée'+(tid?' et associée.':'.'),{shape:true});return true;
}
root.addEventListener('change',event=>{if(!event.target.matches('[data-theme]'))return;if(!commitDraft()){event.target.value=appearance;return;}appearance=['light','dark'].includes(event.target.value)?event.target.value:'system';applyAppearance();queueViewSave();});
function bindInlineCatalogue(){
 root.addEventListener('keydown',e=>{const button=e.target.closest('[data-competency-visibility]');if(!button||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const value=e.key==='Home'?'selected':e.key==='End'?'all':button.dataset.competencyVisibility==='selected'?'all':'selected';if(setVisibility(value))button.closest('[role="radiogroup"]').querySelector(`[data-competency-visibility="${value}"]`).focus();});

 root.addEventListener('input',e=>{
  const t=e.target;if(t.matches('[data-free-text]')){freeDraft=t.value;resizeDescriptors();return;}
  if(!t.matches('[data-catalogue-search]'))return;if(!commitDraft()){t.value=catalogueFilter.search;return;}catalogueFilter.search=t.value;groupOpen.clear();catalogueLimit=80;refreshCatalogue(false,{preserveViewport:true});syncSearchClear();
 });
 root.addEventListener('change',async e=>{
  const t=e.target;


  if(t.matches('[data-catalogue-subject],[data-catalogue-cycle],[data-catalogue-section],[data-catalogue-kind],[data-catalogue-pathway]')){
   const key=t.hasAttribute('data-catalogue-subject')?'subject':t.hasAttribute('data-catalogue-cycle')?'cycle':t.hasAttribute('data-catalogue-section')?'section':t.hasAttribute('data-catalogue-pathway')?'pathway':'kind';
   if(!commitDraft()){t.value=catalogueFilter[key];syncExpandedCategory();return;}if(key==='section'){const selected=t.value;catalogueFilter.section='';groupLimits.clear();for(const map of new Set([groupOpen,visibleGroups()])){map.clear();for(const g of catalogueGroups())map.set(g.key,selected==='__all'?true:selected==='__none'?false:selected?g.title===selected:defaultGroupOpen(g));}refreshCatalogue();return;}catalogueFilter[key]=t.value;groupOpen.clear();groupLimits.clear();catalogueLimit=80;if(key==='subject'||key==='cycle'){catalogueFilter.section='';catalogueFilter.pathway='';}refreshCatalogue(key!=='kind');
  }
  if(t.matches('[data-catalogue-link]')){try{if(!adoptCatalogue(t.dataset.catalogueLink,t.dataset.t))t.checked=false;}catch(error){t.checked=false;notice(error.message,true);}}
  if(t.matches('[data-free-link]')){try{if(!addFreeCompetency(t.dataset.freeLink))t.checked=false;}catch(error){t.checked=false;$('[data-free-error]').textContent=error.message;$('[data-free-error]').hidden=false;}}
  if(t.matches('[data-catalogue-file]')){
   const file=t.files?.[0];t.value='';if(!file||!commitDraft())return;
   try{if(file.size>8*1024*1024)throw new Error('Catalogue trop volumineux (8 Mo maximum).');const incoming=validateCatalogue(JSON.parse(await file.text()),catalogueFilter.cycle||cycleRoot(d.cycle));const merged=new Map(d.catalogue.map(c=>[c.id,c]));for(const c of incoming)merged.set(c.id,c);const next=validateCatalogue([...merged.values()]);mutation(()=>{d.catalogue=next;},`${incoming.length} descripteur(s) importé(s).`);}catch(error){notice('Import du catalogue : '+error.message,true);}
  }
 });
 root.addEventListener('click',e=>{
  if(suppressClick&&e.detail!==0)return;const b=e.target.closest('button');if(!b)return;
  try{if(b.hasAttribute('data-toggle-retained')){removeRetained(b.dataset.toggleRetained);return;}if(b.hasAttribute('data-show-search')&&commitDraft()){for(const g of catalogueGroups())groupOpen.set(g.key,true);refreshCatalogue();board.querySelector('[data-catalogue-group]')?.focus({preventScroll:true});return;}if(b.hasAttribute('data-reset-catalogue')&&commitDraft()){catalogueFilter={subject:subjectName(d.subject),cycle:cycleRoot(d.cycle),section:'',search:'',kind:'',pathway:''};groupOpen.clear();groupLimits.clear();filterPanel.innerHTML=catalogueTools();refreshCatalogue(true);return;}if(b.hasAttribute('data-catalogue-group')&&commitDraft()){visibleGroups().set(b.dataset.catalogueGroup,b.getAttribute('aria-expanded')!=='true');refreshCatalogue();return;}if(b.hasAttribute('data-group-more')&&commitDraft()){const k=b.dataset.groupMore;groupLimits.set(k,(groupLimits.get(k)||40)+40);refreshCatalogue();return;}if(b.hasAttribute('data-catalogue-adopt'))adoptCatalogue(b.dataset.catalogueAdopt);
   if(b.hasAttribute('data-catalogue-import')&&commitDraft())$('[data-catalogue-file]').click();
   if(b.hasAttribute('data-catalogue-template')&&commitDraft())exportFile(JSON.stringify({catalogue:d.catalogue},null,2),'grilleeval-catalogue.json','application/json');
   if(b.hasAttribute('data-catalogue-more')&&commitDraft()){catalogueLimit+=80;refreshCatalogue();}
   if(b.hasAttribute('data-free-cancel')){freeOpen=false;freeDraft='';refreshCatalogue();}
  }catch(error){notice(error.message,true);}
 });
 root.addEventListener('submit',e=>{if(!e.target.matches('[data-free-form]'))return;e.preventDefault();try{addFreeCompetency();}catch(error){$('[data-free-error]').textContent=error.message;$('[data-free-error]').hidden=false;}});
}



function showAssessment(navigate=true){if(!commitDraft())return;if(navigate)horizontalPane('assessment');}
function backToAssociations(){if(!commitDraft())return;horizontalPane('associations');}
function horizontalPane(name){if(!commitDraft())return;if(overview)leaveOverview();finishDescriptorResize();const rect=paneRect(name);if(!rect)return;vp.scrollLeft=Math.max(0,(rect.x-paneSide(name,rect))*view.zoom);rememberCamera();schedule();}

function assessmentHeaders(){const count=transposed?layout().primary:layout().secondary;return `<div class="ge-assessment-head-group ge-lower-head-group${count<3?' ge-assessment-narrow':''}" style="width:${count*COMP}px"><div class="ge-assessment-title">${paneHeading('assessment','Compétences par élève')}<button type="button" class="ge-link-button ge-pane-link ge-back-associations" data-back-associations aria-label="Voir les exercices associés" title="Revenir aux exercices associés sans changer le zoom">Voir les exercices</button></div><div class="ge-assessment-names">${transposed?(primaryHeads()||'<span class="ge-no-pupils">Aucun élève</span>'):(d.students.map((p,i)=>`<div class="ge-pupil-result-head" role="columnheader" data-assessment-pupil="${esc(p.id)}" style="width:${COMP}px"><small>${num(i)}</small><span>${esc(p.name)}</span></div>`).join('')||Array.from({length:GHOST_PUPILS},(_,i)=>`<div class="ge-pupil-result-head ge-ghost" style="width:${COMP}px"><small>${num(i)}</small><span>Nom élève ${i+1}</span></div>`).join(''))}</div></div>`;}

function competencyBasis(c){const ts=d.tasks.filter(t=>d.links[c.id]?.includes(t.id));return ts.length?`${ts.length} exercice${ts.length>1?'s':''} · / ${format(ts.reduce((n,t)=>n+t.maxPoints,0))} pts`:'Aucun exercice associé';}
function competencyCell(p,c){return `<td class="ge-competency-result-cell" data-competency-pupil="${esc(p.id)}" data-competency-result="${esc(c.id)}">${competencyCellContent(p,c)}</td>`;}
function competencyCellContent(p,c){
 const r=competencyResult(d,p.id,c.id),status=r.absent?'Absent':!r.total?'Sans exercice':!r.filled?'Non saisi':!r.complete?'Provisoire':d.grading.labels[r.level];
 const value=resultPercent(r.percent)+(r.percent!=null&&!r.complete?'*':'');
 const explanation=`${p.name} · ${c.text} · ${format(r.points)} / ${format(r.possible)} points · ${r.filled}/${r.total} exercices saisis · ${status}`;
 return `<div class="ge-competency-result" data-level="${r.complete&&r.level!=null?r.level:''}" style="--lv:${gradingLevelInk(r.level)}" role="img" aria-label="${esc(explanation)}" title="${esc(explanation)}" data-result-state="${r.absent?'absent':r.complete?'complete':r.total?'incomplete':'unassociated'}"><strong class="ge-result-label">${esc(status==="En voie d’acquisition"?"En voie d’acq.":status)}</strong><small class="ge-result-percent">${value}</small><i><b style="width:${r.percent??0}%;background:${r.level==null?'var(--control)':levelColour(d.grading,r.level)}"></b></i></div>`;
}
function updateCompetencyResults(scoreChange=null){
 const selector=scoreChange?`[data-competency-pupil="${CSS.escape(scoreChange.p)}"][data-competency-result]`:'[data-competency-result]';
 for(const node of board.querySelectorAll(selector)){
  const id=node.dataset.competencyResult;
  if(scoreChange&&!d.links[id]?.includes(scoreChange.t))continue;
  const p=pupil(node.dataset.competencyPupil),c=competency(id);
  if(p&&c)node.innerHTML=competencyCellContent(p,c);
 }
 if(scoreChange)return;
 for(const node of root.querySelectorAll('[data-links-count]')){const c=competency(node.dataset.linksCount);if(c)node.textContent=d.links[c.id].length;}
 for(const node of root.querySelectorAll('[data-competency-max]')){const c=competency(node.dataset.competencyMax);if(c)node.textContent=format(competencyResult(d,d.students[0]?.id,c.id).possible);}

}

function summaryContent(p){const r=pupilResult(d,p.id),status=r.absent?'Absent':r.complete?d.grading.labels[r.level]:r.percent==null?'Non saisi':'Provisoire',colour=r.level==null?'var(--control)':levelColour(d.grading,r.level);return `<div class="ge-pupil-column-result" data-level="${r.level??''}" style="--lv:${gradingLevelInk(r.level)}" role="img" aria-label="${esc(p.name+' · '+status+' · '+resultPercent(r.percent)+' · '+format(r.points)+' / '+format(r.possible)+' points')}" title="${esc(p.name+' · '+status+' · '+resultPercent(r.percent))}" data-result-state="${r.absent?'absent':r.complete?'complete':'incomplete'}"><div class="ge-column-plot">${d.grading.thresholds.map((n,i)=>`<i class="ge-column-guide" data-column-threshold="${i}" style="bottom:${n}%"></i>`).join('')}<div class="ge-column-fill" style="height:${r.percent??0}%;background:${colour}"></div><small class="ge-result-percent ge-column-percent" style="bottom:${r.percent??0}%">${resultPercent(r.percent)}${r.complete||r.absent?'':'*'}</small></div><strong class="ge-result-label ge-column-level">${esc(status)}</strong></div>`;}
function resultPercent(n){return n==null?'—':format(Math.round(n*10)/10)+' %';}
function gradingLevelInk(index,g=d.grading){const c=levelColour(g,index);return g.labels.length===4&&index!=null&&!g.colours?.[index]?`var(--lv${index})`:`light-dark(color-mix(in srgb,${c} 82%,black),color-mix(in srgb,${c} 60%,white))`;}
function gradingMenu(){return `<button type="button" class="ge-button ge-grading-button" data-edit-grading data-direct-control aria-haspopup="dialog" aria-label="Configurer le barème" title="Modifier le barème (niveaux et seuils)">${icon('sliders')}</button>`;}
// D1.69 · Légende : les noms des niveaux écrits dans la couleur de leur niveau, dans l’ordre de la bande.
function axisLegend(g){return g.labels.map((l,i)=>`<span style="color:${gradingLevelInk(i,g)}">${esc(l)}</span>`).join(' ');}
// D1.31 · La légende du barème devient la ligne de l’axe : chaque niveau y a sa couleur (nom au survol).
function axisLevels(g=d.grading){return g.labels.map((l,i)=>`<i style="flex:${(g.thresholds[i]??100)-(g.thresholds[i-1]??0)};background:${levelColour(g,i)}" title="${esc(l)} · ${format(g.thresholds[i-1]??0)}–${format(g.thresholds[i]??100)} %"></i>`).join('');}
function gradingPreview(g){return g.labels.map((l,i)=>`<i style="flex:${(g.thresholds[i]??100)-(g.thresholds[i-1]??0)};background:${levelColour(g,i)}" title="${esc(l)}"></i>`).join('');}
// D1.25 · Poignées du barème dans la carte : on les tire, les voisines sont poussées (thresholdAt).
function gradingHandles(g){return g.thresholds.map((n,i)=>`<button type="button" class="ge-grading-handle" data-grading-handle="${i}" role="slider" aria-label="Seuil ${esc(g.labels[i+1])}" aria-valuemin="${i*.5}" aria-valuemax="${100-(g.thresholds.length-1-i)*.5}" aria-valuenow="${n}" aria-valuetext="${format(n)} %" data-value="${format(n)} %" style="left:${n}%"></button>`).join('');}
function gradingDraftMarkup(g){
 const count=g.labels.length;
 return `<div class="ge-grading-toolbar"><label><span class="ge-visually-hidden">Choisir une base</span><select data-label-preset aria-label="Modèle du barème">${[['acquisition','Acquisition · 4 niveaux'],['niveaux','Niveaux D à A+ · 7 niveaux'],['appreciation','Appréciation · 4 niveaux'],['custom','Mes niveaux personnalisés']].map(([v,l])=>`<option value="${v}" ${g.preset===v?'selected':''}>${l}</option>`).join('')}</select></label><span class="ge-grading-pass">Réussite dès <strong><span data-grading-pass>${format(g.thresholds[0])}</span> %</strong></span><button type="button" class="ge-button ge-grading-reset" data-grading-reset title="Revenir au barème par défaut : Acquisition, 4 niveaux, couleurs automatiques">Réinitialiser</button></div><div class="ge-grading-track"><div class="ge-grading-preview" aria-hidden="true">${gradingPreview(g)}</div><div class="ge-grading-handles">${gradingHandles(g)}</div></div><div class="ge-grading-summary" aria-hidden="true"><span>0 %</span><span>100 %</span></div><div class="ge-grading-grid"><div class="ge-grading-grid-head"><span>Niveau</span><span>Dès</span><span>Jusqu’à</span><span></span></div>${g.labels.map((l,i)=>`<div class="ge-grading-row" data-grading-row="${i}"><button type="button" class="ge-grading-grip" data-grading-grip="${i}" aria-label="Déplacer le niveau ${esc(l)} (flèches haut et bas)" title="Glisser pour déplacer ce niveau"><svg viewBox="0 0 10 16" aria-hidden="true"><circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/><circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/></svg></button><label class="ge-grading-name"><button type="button" class="ge-grading-swatch" data-grading-colour="${i}" style="--swatch:${levelColour(g,i)}" aria-haspopup="true" aria-expanded="false" aria-label="Couleur du niveau ${esc(l)}" title="Choisir la couleur de ce niveau"></button><input data-grading-label="${i}" value="${esc(l)}" maxlength="80" aria-label="Libellé de l’intervalle ${i+1}" required></label>${i?`<label class="ge-grading-percent"><input type="text" inputmode="decimal" autocomplete="off" data-threshold-input="${i-1}" aria-label="Seuil ${esc(l)}" value="${format(g.thresholds[i-1])}" required><span>%</span></label>`:'<span class="ge-grading-fixed">0 %</span>'}<output class="ge-grading-end" data-grading-end="${i}">${i<count-1?'&lt; '+format(g.thresholds[i]):'≤ 100'} %</output><div class="ge-grading-row-actions"><button type="button" class="ge-button ge-grading-remove" data-grading-remove="${i}" aria-label="Retirer l’intervalle ${i+1} : ${esc(l)}" title="Supprimer ce niveau et fusionner avec le voisin" ${count<=2?'disabled':''}>${icon('close')}</button></div></div>`).join('')}</div><div class="ge-grading-add"><button type="button" class="ge-button" data-grading-add ${count>=MAX_GRADING_LEVELS?'disabled':''}>+ Ajouter un niveau</button></div><p class="ge-grading-feedback" data-grading-feedback role="status"></p>`;
}
function editGrading(){
 const report = bilanOrigin ? bilanPane : null;
 const initial = report ? report.getGrading() : d.grading;
 if (!initial) return;
 let g=clone(initial);
 const labels=()=>[...dialog.querySelectorAll('[data-grading-label]')].map(e=>e.value.trim());
 const read=()=>{const names=labels(),thresholds=[...dialog.querySelectorAll('[data-threshold-input]')].map(e=>e.value.trim()===''?NaN:Number(e.value.replace(',','.'))),preset=names.every((l,i)=>l===g.labels[i])?g.preset:'custom';return validateGrading({labels:names,thresholds,preset,colours:g.colours});};
 const error=message=>{const n=dialog.querySelector('.ge-dialog-error');n.textContent=message;n.hidden=!message;};
 modal({title:'Barème',content:`<div class="ge-grading-editor">${gradingDraftMarkup(g)}</div>`,submit:'Appliquer le barème',onSubmit:()=>{const next=read();if(JSON.stringify(next)===JSON.stringify(initial))return;if(report)report.applyGrading(next);else mutation(()=>{d.grading=next;},'Barème mis à jour. Annulation possible.');}});
 if(!dialog.open)return;dialog.querySelector('form').setAttribute('novalidate','');
 const editor=dialog.querySelector('.ge-grading-editor');
 // D1.29 · Rien n’est présélectionné : le modèle d’abord ; les libellés seulement pour un barème personnalisé.
 {const first=g.preset==='custom'?editor.querySelector('[data-grading-label="0"]'):editor.querySelector('[data-label-preset]');first?.focus({preventScroll:true});}
 const paint=(focusIndex=null)=>{editor.innerHTML=gradingDraftMarkup(g);error('');if(focusIndex!=null){const input=editor.querySelector(`[data-grading-label="${focusIndex}"]`);input?.focus();input?.select();}};
 const sync=()=>{error('');editor.querySelector('[data-grading-pass]').textContent=format(g.thresholds[0]);editor.querySelector('[data-label-preset]').value=g.preset;for(const n of editor.querySelectorAll('[data-grading-end]')){const i=Number(n.dataset.gradingEnd);n.textContent=(i<g.thresholds.length?'< '+format(g.thresholds[i]):'≤ 100')+' %';}for(const n of editor.querySelectorAll('[data-threshold-input]')){const i=Number(n.dataset.thresholdInput);n.value=format(g.thresholds[i]);n.setAttribute('aria-label','Seuil '+g.labels[i+1]);}for(const n of editor.querySelectorAll('[data-grading-colour]'))n.style.setProperty('--swatch',levelColour(g,Number(n.dataset.gradingColour)));editor.querySelector('.ge-grading-preview').innerHTML=gradingPreview(g);for(const h of editor.querySelectorAll('[data-grading-handle]')){const i=Number(h.dataset.gradingHandle),n=g.thresholds[i];h.style.left=n+'%';h.setAttribute('aria-valuenow',n);h.setAttribute('aria-valuetext',format(n)+' %');h.dataset.value=format(n)+' %';h.setAttribute('aria-label','Seuil '+g.labels[i+1]);}};
 editor.addEventListener('click',e=>{
  const swatch=e.target.closest('[data-grading-colour]'),pick=e.target.closest('[data-pick-colour]');
  if(pick){const i=Number(pick.closest('[data-swatch-pop]').dataset.swatchPop);try{g=read();const colours=g.colours?[...g.colours]:g.labels.map(()=>null);colours[i]=pick.dataset.pickColour||null;g=validateGrading({...g,colours});closeSwatches();sync();editor.querySelector(`[data-grading-colour="${i}"]`)?.focus();}catch(ex){error(ex.message);}return;}
  if(swatch){const i=Number(swatch.dataset.gradingColour),open=editor.querySelector(`[data-swatch-pop="${i}"]`);closeSwatches();if(!open)openSwatches(swatch,i);return;}
  if(!e.target.closest('[data-swatch-pop]'))closeSwatches();
  if(e.target.closest('[data-grading-reset]')){g=clone(DEFAULT_GRADING);paint();editor.querySelector('[data-label-preset]')?.focus();return;}
  const add=e.target.closest('[data-grading-add]'),remove=e.target.closest('[data-grading-remove]');if(!add&&!remove)return;try{g=read();let index=remove?Number(remove.dataset.gradingRemove):g.labels.length;if(add){const previous=g;g=appendGradingLevel(g);index=g.thresholds.findIndex(n=>!previous.thresholds.includes(n))+1;}else g=removeGradingInterval(g,index);paint(Math.min(index,g.labels.length-1));if(add)flashRow(index);}catch(ex){error(ex.message);}});
 // D1.37 · Glisser un niveau par sa poignée (ou flèches haut/bas) : seuls les noms et couleurs changent de place.
 const flashRow=i=>{const row=editor.querySelector(`[data-grading-row="${i}"]`);if(!row)return;row.classList.remove('ge-grading-flash');void row.offsetWidth;row.classList.add('ge-grading-flash');row.scrollIntoView?.({block:'nearest'});};
 const reorder=(from,to,focusGrip)=>{if(from===to)return;try{g=moveGradingLevel(read(),from,to);paint();flashRow(to);if(focusGrip)editor.querySelector(`[data-grading-grip="${to}"]`)?.focus();}catch(ex){error(ex.message);}};
 let rowDrag=null;
 const rowTarget=y=>{const {from,rects}=rowDrag,centre=rects[from].top+rects[from].height/2+y;let to=from;rects.forEach((r,j)=>{const mid=r.top+r.height/2;if(j<from&&centre<mid)to=Math.min(to,j);if(j>from&&centre>mid)to=Math.max(to,j);});return to;};
 editor.addEventListener('pointerdown',e=>{const grip=e.target.closest('[data-grading-grip]');if(!grip||e.button>0)return;e.preventDefault();closeSwatches();const rows=[...editor.querySelectorAll('[data-grading-row]')];rowDrag={from:Number(grip.dataset.gradingGrip),id:e.pointerId,y:e.clientY,rows,rects:rows.map(r=>r.getBoundingClientRect()),to:Number(grip.dataset.gradingGrip)};grip.setPointerCapture?.(e.pointerId);editor.classList.add('ge-grading-sorting');rows[rowDrag.from].classList.add('ge-grading-lifted');});
 editor.addEventListener('pointermove',e=>{if(!rowDrag||e.pointerId!==rowDrag.id)return;e.preventDefault();const {from,rows,rects}=rowDrag,first=rects[0].top,last=rects[rects.length-1].bottom,dy=Math.max(first-rects[from].top,Math.min(last-rects[from].bottom,e.clientY-rowDrag.y)),to=rowTarget(dy),h=rects[from].height;rowDrag.to=to;rows.forEach((r,j)=>{r.style.transform=j===from?`translateY(${dy}px)`:from<j&&j<=to?`translateY(${-h}px)`:to<=j&&j<from?`translateY(${h}px)`:'';});});
 const endRow=e=>{if(!rowDrag||e.pointerId!==rowDrag.id)return;const {from,to,rows}=rowDrag;rowDrag=null;for(const r of rows){r.style.transform='';r.classList.remove('ge-grading-lifted');}editor.classList.remove('ge-grading-sorting');if(e.type==='pointerup')reorder(from,to,true);};
 editor.addEventListener('pointerup',endRow);editor.addEventListener('pointercancel',endRow);
 editor.addEventListener('keydown',e=>{const grip=e.target.closest('[data-grading-grip]');if(!grip||!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const i=Number(grip.dataset.gradingGrip),n=g.labels.length;reorder(i,e.key==='Home'?0:e.key==='End'?n-1:Math.max(0,Math.min(n-1,i+(e.key==='ArrowUp'?-1:1))),true);});
 // D1.29 · Nuancier d’un niveau : pastilles proposées + « Auto » (couleur calculée).
 function closeSwatches(){for(const n of editor.querySelectorAll('[data-swatch-pop]'))n.remove();for(const n of editor.querySelectorAll('[data-grading-colour][aria-expanded="true"]'))n.setAttribute('aria-expanded','false');}
 function openSwatches(button,i){const current=g.colours?.[i]||null,pop=document.createElement('div');pop.className='ge-swatch-pop';pop.dataset.swatchPop=String(i);pop.setAttribute('role','group');pop.setAttribute('aria-label','Couleur du niveau '+g.labels[i]);
  pop.innerHTML=LEVEL_SWATCHES.map(c=>`<button type="button" data-pick-colour="${c}" style="--swatch:${c}" aria-label="${c}" aria-pressed="${current===c}"></button>`).join('')+`<button type="button" class="ge-swatch-auto" data-pick-colour="" aria-pressed="${!current}" title="Couleur calculée selon la position du niveau">Auto</button>`;
  button.closest('.ge-grading-row').append(pop);button.setAttribute('aria-expanded','true');pop.querySelector('[aria-pressed="true"]')?.focus()||pop.querySelector('button').focus();}
 editor.addEventListener('keydown',e=>{if(e.key==='Escape'&&editor.querySelector('[data-swatch-pop]')){e.preventDefault();e.stopPropagation();const i=editor.querySelector('[data-swatch-pop]').dataset.swatchPop;closeSwatches();editor.querySelector(`[data-grading-colour="${i}"]`)?.focus();}},true);
 const moveHandle=(i,n,base=g.thresholds)=>{const names=labels(),before=[...g.thresholds];g=validateGrading({...g,labels:names,thresholds:thresholdAt({...g,thresholds:base},i,Math.round(Math.max(0,Math.min(100,n))*2)/2),preset:names.every((l,j)=>l===g.labels[j])?g.preset:'custom'});sync();const moved=g.thresholds.filter((v,j)=>j!==i&&v!==before[j]).length;return moved;};
 let handleDrag=null;
 editor.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-grading-handle]');if(!h)return;e.preventDefault();e.stopPropagation();const r=editor.querySelector('.ge-grading-track').getBoundingClientRect();handleDrag={i:Number(h.dataset.gradingHandle),id:e.pointerId,left:r.left,width:r.width||1,start:[...g.thresholds]};h.setPointerCapture?.(e.pointerId);h.classList.add('ge-dragging');h.focus({preventScroll:true});});
 editor.addEventListener('pointermove',e=>{if(!handleDrag||e.pointerId!==handleDrag.id)return;e.preventDefault();try{moveHandle(handleDrag.i,(e.clientX-handleDrag.left)/handleDrag.width*100);}catch(ex){error(ex.message);}});
 const endHandle=e=>{if(!handleDrag||e.pointerId!==handleDrag.id)return;const moved=g.thresholds.filter((v,j)=>j!==handleDrag.i&&v!==handleDrag.start[j]).length;editor.querySelector('.ge-dragging')?.classList.remove('ge-dragging');handleDrag=null;};
 editor.addEventListener('pointerup',endHandle);editor.addEventListener('pointercancel',endHandle);
 editor.addEventListener('keydown',e=>{const h=e.target.closest('[data-grading-handle]');if(!h||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))return;e.preventDefault();const i=Number(h.dataset.gradingHandle),step=e.shiftKey||e.key.startsWith('Page')?5:.5,dir=['ArrowLeft','ArrowDown','PageDown'].includes(e.key)?-1:1,n=e.key==='Home'?0:e.key==='End'?100:g.thresholds[i]+dir*step;try{const moved=moveHandle(i,n);}catch(ex){error(ex.message);}});
 editor.addEventListener('change',e=>{try{if(e.target.matches('[data-label-preset]')){const preset=e.target.value;g=read();if(preset==='niveaux')g={...clone(LEVEL_SCALE_GRADING),...(g.labels.length===7&&g.colours?{colours:g.colours}:{})};else if(preset!=='custom')g={thresholds:g.labels.length===4?g.thresholds:[...DEFAULT_GRADING.thresholds],labels:preset==='acquisition'?[...DEFAULT_GRADING.labels]:['Insuffisant','Satisfaisant','Bien','Très bien'],preset,...(g.labels.length===4&&g.colours?{colours:g.colours}:{})};else g.preset='custom';paint(preset==='custom'?0:null);if(preset!=='custom')editor.querySelector('[data-label-preset]')?.focus();}else if(e.target.matches('[data-threshold-input]')){const i=Number(e.target.dataset.thresholdInput),raw=e.target.value.trim(),n=raw===''?NaN:Number(raw.replace(',','.'));if(!Number.isFinite(n)||n<0||n>100)throw new Error('Saisir un pourcentage entre 0 et 100.');const names=labels(),before=[...g.thresholds];g=validateGrading({...g,labels:names,thresholds:thresholdAt(g,i,n),preset:names.every((l,j)=>l===g.labels[j])?g.preset:'custom'});sync();const moved=g.thresholds.filter((v,j)=>j!==i&&v!==before[j]).length;}else if(e.target.matches('[data-grading-label]')){g=read();sync();}}catch(ex){error(ex.message);}});
}
function closeThreshold(index,g=d.grading){return g.thresholds.some((n,i)=>i!==index&&Math.abs(n-g.thresholds[index])<12);}
function crowdedThreshold(index,g=d.grading){return g.thresholds.some((n,i)=>i!==index&&Math.abs(n-g.thresholds[index])<6);}
function verticalGradingAxis(scale) {
 const lines = scale.thresholds.map((value,i)=>{
  const label = esc(scale.labels[i+1]);
  return `<div class="ge-vertical-threshold ${closeThreshold(i,scale)?'ge-close-threshold':''} ${crowdedThreshold(i,scale)?'ge-crowded-threshold':''}"
    data-threshold-line="${i}" aria-orientation="vertical"
    aria-label="Seuil ${label}" aria-valuenow="${value}" aria-valuetext="${format(value)} %" aria-valuemin="${i*.5}"
    aria-valuemax="${100-(scale.thresholds.length-1-i)*.5}" style="bottom:${value}%">
    <small style="color:${gradingLevelInk(i+1,scale)}">${label}</small><b>${format(value)} %</b></div>`;
 });
 // D1.67 · Le premier niveau a aussi son nom, à 0 % ; 0 % et 100 % sont alignés avec les autres valeurs.
 return `<div class="ge-vertical-axis" data-plot data-vertical-plot><span class="ge-vertical-axis-max"><b>100 %</b></span>
   <span class="ge-vertical-axis-zero" data-axis-zero><small style="color:${gradingLevelInk(0,scale)}">${esc(scale.labels[0])}</small><b>0 %</b></span><div class="ge-axis-levels" data-axis-levels aria-hidden="true">${axisLevels(scale)}</div>${lines.join('')}</div>`;
}
function verticalResultHeader(){return `<div class="ge-vertical-results-head"><div class="ge-vertical-heading">${paneHeading('results','Résultats · Barème')}${gradingMenu()}</div>${verticalGradingAxis(d.grading)}<small class="ge-vertical-chart-note">/ ${format(possible(d))} pts</small></div>`;}
function horizontalGradingAxis(g){return `<div class="ge-inline-axis" data-plot><small class="ge-axis-zero">0 %</small><small class="ge-axis-end">100 %</small><div class="ge-axis-levels" data-axis-levels aria-hidden="true">${axisLevels(g)}</div>${g.thresholds.map((n,i)=>`<div class="ge-inline-threshold ${closeThreshold(i,g)?'ge-close-threshold':''} ${crowdedThreshold(i,g)?'ge-crowded-threshold':''}" data-threshold-line="${i}" aria-orientation="horizontal" aria-label="Seuil ${esc(g.labels[i+1])}" aria-valuenow="${n}" aria-valuemin="${i*.5}" aria-valuemax="${100-(g.thresholds.length-1-i)*.5}" style="left:${n}%;--threshold-lane:${i%2}"><b>${format(n)} %</b></div>`).join('')}</div><div class="ge-axis-legend" data-axis-legend aria-label="Niveaux du barème">${axisLegend(g)}</div>`;}
function resultHeader(){return `<div class="ge-inline-results-head"><div class="ge-inline-heading">${paneHeading('results','Résultats · Barème')}${gradingMenu()}</div>${horizontalGradingAxis(d.grading)}</div>`;}
function updateGradingAxis(container,g) {
 const levels = axisLevels(g);
 for (const node of container.querySelectorAll('[data-axis-levels]')) if (node.innerHTML!==levels) node.innerHTML=levels;
 const legend=axisLegend(g);for (const node of container.querySelectorAll('[data-axis-legend]')) if (node.innerHTML!==legend) node.innerHTML=legend;
 for (const node of container.querySelectorAll('[data-axis-zero]>small')) {node.textContent=g.labels[0]??'';node.style.color=gradingLevelInk(0,g);}
 for (const line of container.querySelectorAll('[data-threshold-line]')) {
  const i=Number(line.dataset.thresholdLine), n=g.thresholds[i];
  line.style[line.getAttribute('aria-orientation')==='vertical'?'bottom':'left']=n+'%';
  line.setAttribute('aria-valuenow',n);
  line.setAttribute('aria-valuetext',format(n)+' %');
  line.setAttribute('aria-valuemin',i*.5);
  line.setAttribute('aria-valuemax',100-(g.thresholds.length-1-i)*.5);
  line.querySelector('b').textContent=format(n)+' %';
  const name=line.querySelector('small');if(name){name.textContent=g.labels[i+1]??'';name.style.color=gradingLevelInk(i+1,g);}
  line.classList.toggle('ge-close-threshold',closeThreshold(i,g));
  line.classList.toggle('ge-crowded-threshold',crowdedThreshold(i,g));
 }
}
function rowResult(p){const r=pupilResult(d,p.id);return `<div class="ge-inline-result" data-level="${r.level??''}" style="--lv:${gradingLevelInk(r.level)}" data-result-pupil="${esc(p.id)}" aria-label="${esc(p.name)}"><div class="ge-inline-track"><span class="ge-inline-fill" style="width:${r.percent??0}%;background:${r.level==null?'#8b97a7':levelColour(d.grading,r.level)}"></span>${d.grading.thresholds.map((n,i)=>`<i data-row-threshold="${i}" style="left:${n}%"></i>`).join('')}</div><span class="ge-inline-value">${resultPercent(r.percent)}${r.complete?'':'*'}</span></div>`;}
function syncWorkspace(){if(!workspaceMounted)return;for(const head of board.querySelectorAll('[data-inline-results-head]'))head.innerHTML=resultHeader();if(transposed){resultsPin.replaceChildren();const side=board.querySelector('.ge-chart-side');if(side)side.innerHTML=verticalResultHeader();resultsPin.hidden=true;updateResults();return;}resultsPin.innerHTML=`<div class="ge-result-pin-head"><div class="ge-total-title ge-result-pin-title"><strong>Maximum</strong>${format(possible(d))} pts</div>${resultHeader()}</div>${d.students.map((p,i)=>`<div class="ge-result-pin-row ${i%2?'ge-even-row':''}" data-pin-result-row="${esc(p.id)}" data-hover-row="student:${esc(p.id)}"><span data-result-total="${esc(p.id)}">${format(total(d,p.id))}</span>${rowResult(p)}</div>`).join('')}`;updateResults();}
function updateResults(scoreChange=null){
 if(!workspaceMounted)return;
 updateCompetencyResults(scoreChange);
 const summaries=scoreChange?`[data-summary-pupil="${CSS.escape(scoreChange.p)}"]`:'[data-summary-pupil]';
 for(const node of board.querySelectorAll(summaries)){
  const p=pupil(node.dataset.summaryPupil);if(p)node.innerHTML=summaryContent(p);
 }
 const stat=resultStats(d);{const absent=d.students.filter(p=>p.absent).length;$('[data-complete-count]').textContent=`${stat.n}/${d.students.length-absent} élèves complets`+(absent?` · ${absent} absent${absent>1?'s':''}`:'');}for(const metric of ['mean','median','success']){
 const node=board.querySelector(`[data-class-stat="${metric}"]`),value=resultPercent(stat[metric]);
 if(node.textContent!==value)node.textContent=value;
 if(metric==='success'){
  const threshold=resultPercent(d.grading.thresholds[0]);
  node.parentElement.title=stat.n ? (stat.n-stat.distribution[0])+' sur '+stat.n+' au seuil de '+threshold+' ou plus' : 'Seuil de réussite · '+threshold;
 }
}
 const students=scoreChange?[pupil(scoreChange.p)]:d.students;
 for(const p of students){const r=pupilResult(d,p.id);for(const node of root.querySelectorAll(`[data-result-pupil="${CSS.escape(p.id)}"]`)){node.querySelector('.ge-inline-fill').style.width=(r.percent??0)+'%';node.querySelector('.ge-inline-fill').style.background=r.level==null?'#8b97a7':levelColour(d.grading,r.level);node.dataset.level=r.level??'';node.style.setProperty('--lv',gradingLevelInk(r.level));node.querySelector('.ge-inline-value').textContent=r.absent?'absent':resultPercent(r.percent)+(r.complete?'':'*');node.dataset.absent=r.absent?'true':'';node.setAttribute('aria-label',p.name+' : '+resultPercent(r.percent)+' · '+(r.complete?d.grading.labels[r.level]:'provisoire'));for(const mark of node.querySelectorAll('[data-row-threshold]'))mark.style.left=d.grading.thresholds[Number(mark.dataset.rowThreshold)]+'%';}for(const n of root.querySelectorAll(`[data-result-total="${CSS.escape(p.id)}"]`))n.textContent=r.absent?'—':format(total(d,p.id))+(r.complete?'':'*');}
 if(scoreChange)return;
 updateGradingAxis(root,d.grading);
 for (const input of root.querySelectorAll('[data-threshold-input]')) if (input!==document.activeElement) input.value=d.grading.thresholds[Number(input.dataset.thresholdInput)];
}
function updateResultsPin(){if(!resultsPin||!scrollCache)return;const c=scrollCache,z=view.zoom,v=c.v,g=geometry.groups.find(g=>g.kind==='students');if(!g)return;const T=geometry.studentTitleHeight||0,HH=T+geometry.studentHeaderHeight,x=(Number.isFinite(c.resultsX)?c.resultsX:X+LABEL+Math.max(1,d.tasks.length)*COL)*z-scrollFrame.x,bottom=g.bottom*z-scrollFrame.y,show=!transposed&&z>=.55&&bottom>112*z&&x+SUM*z>0&&x<v.w;hidden(resultsPin,false);inactive(resultsPin,!show);move(resultsPin,show?x:-10000,0,z);move(c.resultHead,0,Math.min(Math.max(0,(g.y-T)*z-scrollFrame.y),bottom-HH*z)/z);for(const {row,node}of c.resultRows){const y=row.y*z-scrollFrame.y;hidden(node,false);move(node,0,y+row.h*z>=0&&y<=v.h?y/z:-10000);}}

function bindResults(){
 root.addEventListener('click',e=>{if(e.target.closest('[data-edit-grading]'))editGrading();});
 // D1.66 · Le barème ne se modifie plus en glissant les seuils sur le canevas (on le changeait par mégarde en déplaçant la vue) :
 // seulement dans la fenêtre « Barème » (bouton à côté de « Résultats · Barème »). Les seuils restent affichés.
 root.addEventListener('pointermove',e=>{
  const drag=gradingDrag;if(!drag||e.pointerId!==drag.pointerId)return;e.preventDefault();
  const {plot,scale}=drag, percent=drag.vertical?(plot.bottom-e.clientY)/plot.height*100:(e.clientX-plot.left)/plot.width*100;
  const thresholds=thresholdAt(scale,drag.index,percent);
  if(thresholds.every((n,i)=>n===scale.thresholds[i]))return;
  drag.scale={...scale,thresholds};
  if (drag.report) drag.report.previewGrading(drag.scale);
  else {d.grading=drag.scale;updateResults();}
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(name,e=>finishGradingDrag(e,e.type==='pointercancel'));
 window.addEventListener('blur',()=>finishGradingDrag(null,false));
}
function jumpWorkspace(){focusPane('results');}

// ── Design-Fassung: Arbeitsfläche ──────────────────────────────────────────
// Ein Volet einpassen (Doppelklick auf seinen Titel), Zwei-Finger-Zoom auf
// Touch-Geräten und Trackpad-Zoom in Safari. Alles liest die Geometrie aus dem
// DOM und ändert weder Dokument noch Verlauf.
function worldRect(nodes){const vr=vp.getBoundingClientRect(),z=view.zoom;let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;for(const n of nodes){if(!n)continue;const q=n.getBoundingClientRect();if(!q.width&&!q.height)continue;l=Math.min(l,q.left);t=Math.min(t,q.top);r=Math.max(r,q.right);b=Math.max(b,q.bottom);}return l===Infinity?null:{x:(l-vr.left+vp.scrollLeft)/z,y:(t-vr.top+vp.scrollTop)/z,w:(r-l)/z,h:(b-t)/z};}
function paneRect(name){const q=selector=>board.querySelector(selector),lower=q('[data-links-rows]'),down=rect=>{const all=worldRect([lower]);if(rect&&all)rect.h=Math.max(rect.h,all.y+all.h-rect.y);return rect;};
 if(needsSetup())return ['points','results'].includes(name)?worldRect([q('[data-setup-sheet]')]):worldRect([q('[data-setup-catalogue-bar]'),q('.ge-competencies-sheet'),filterPanel]);
 if(name==='points'){
  const rect=worldRect([q('thead th'),q('.ge-class-summary')]);
  if(rect)rect.w=LABEL+layout().primary*layout().pw;
  return rect;
 }
 if(name==='results'){
  if(transposed)return worldRect([q('[data-column-chart]')]);
  const rect=worldRect([q('.ge-total-title')]),foot=worldRect([q('.ge-class-summary')]);
  if(rect&&foot)rect.h=foot.y+foot.h-rect.y;
  return rect;
 }
 if(name==='assessment')return down(worldRect([q('[data-assessment-heading]')]));
 if(name==='associations')return down(worldRect([q('[data-association-heading]')]));
 // D1.29 · Cadrer « Compétences » : catalogue + colonne des compétences, sans les cases d’association.
 const sheet=worldRect([q('.ge-competencies-sheet')]);if(!sheet)return null;
 const rect={x:X-EXTEND,y:sheet.y,w:DESCRIPTOR,h:sheet.h};
 if(rect&&!catalogueUsedOnly&&filterPanel){const panel=worldRect([filterPanel]);if(panel){const right=Math.max(rect.x+rect.w,panel.x+panel.w),bottom=Math.max(rect.y+rect.h,panel.y+panel.h);rect.x=Math.min(rect.x,panel.x);rect.y=Math.min(rect.y,panel.y);rect.w=right-rect.x;rect.h=bottom-rect.y;}}return rect;}

// ── D1.73 · Une seule caméra pour tous les cadrages (titres de volet, symbole « Cadrer », carte, bilan, démarrage) ──
// Règles décidées avec Joël (revue avec ChatGPT, rondes 5–6) :
//  · titre d’un volet = y aller : le zoom reste s’il est entre 70 et 180 %, sinon cadrage de travail ;
//  · symbole « Cadrer » = cadrage de travail : tout le volet entre 70 et 100 %, sinon la largeur (au moins 70 %) ;
//  · toujours 24 px d’air (aucun entre une colonne épinglée et son volet) ; vues de travail en haut à gauche :
//    le titre du volet apparaît toujours au même endroit (ronde 7, après essai dans Chrome) ; seuls le démarrage
//    et la vue d’ensemble, des compositions d’ensemble, sont centrés ;
//  · transition de 220 ms (position et zoom ensemble), sans animation au démarrage, avec « réduire les animations »
//    ou pour un très grand document ; toute action de l’utilisateur l’interrompt.
const stopFrame=id=>{try{globalThis.cancelAnimationFrame?.(id);}catch{}};
const CAM={margin:24,workMin:.7,workMax:1,keepMax:1.8,ms:220};let camAnim=null;
function camHeavy(){try{if(bilanOrigin)return (bilanLayout?.table?.querySelectorAll('td').length||0)>1500;const c=counts(d);return c[0]*(c[1]+c[2])>1500;}catch{return true;}}
function camStill(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches||document.hidden||camHeavy();}catch{return true;}}
function camStop(){if(!camAnim)return;stopFrame(camAnim.raf);camAnim=null;rememberCamera();schedule(true);}
for(const type of ['wheel','pointerdown','touchstart','keydown'])vp.addEventListener(type,camStop,{capture:true,passive:true});
function moveCamera(zoom,left,top,animate=true){
 camStop();left=Math.max(0,left);top=Math.max(0,top);
 const z0=view.zoom,x0=vp.scrollLeft/z0,y0=vp.scrollTop/z0,x1=left/zoom,y1=top/zoom;
 const apply=(z,x,y)=>{view.zoom=z;updateScale();vp.scrollLeft=x*z;vp.scrollTop=y*z;};
 if(!animate||camStill()||Math.abs(zoom-z0)<.001&&Math.hypot((x1-x0)*zoom,(y1-y0)*zoom)<2){apply(zoom,x1,y1);rememberCamera();schedule(true);return;}
 const start=performance.now(),ease=t=>1-Math.pow(1-t,4);
 const step=now=>{const t=Math.min(1,(now-start)/CAM.ms),e=ease(t);apply(z0*Math.pow(zoom/z0,e),x0+(x1-x0)*e,y0+(y1-y0)*e);schedule();
  if(t<1)camAnim.raf=requestAnimationFrame(step);else{camAnim=null;rememberCamera();schedule(true);}};
 camAnim={raf:requestAnimationFrame(step)};
}
// side(z) : place à l’écran (px) prise à gauche par une colonne épinglée, pour ce zoom.
function workZoom(rect,side=()=>0,{widthOnly=false}={}){const v=dims(),m=CAM.margin;let z=Math.min(CAM.workMax,Math.max(CAM.workMin,view.zoom));
 for(let i=0;i<12;i++){const pin=side(z),zw=(v.w-(pin?m:2*m)-pin)/rect.w,zh=(v.h-2*m)/rect.h,whole=Math.min(CAM.workMax,zw,zh);
  const next=Math.max(.02,widthOnly?Math.max(CAM.workMin,Math.min(CAM.workMax,zw)):whole>=CAM.workMin?whole:Math.max(CAM.workMin,Math.min(CAM.workMax,zw)));
  if(Math.abs(next-z)<.00001){z=next;break;}z=next;}
 return z;}
function frameRect(rect,{zoom='keep',align='work',side=()=>0,widthOnly=false,animate=true}={}){
 if(!rect||!rect.w)return;const v=dims(),m=CAM.margin;
 const z=zoom==='keep'&&view.zoom>=CAM.workMin-.0001&&view.zoom<=CAM.keepMax?view.zoom:workZoom(rect,side,{widthOnly});
 // Une colonne épinglée à gauche (noms, compétences) touche directement le volet : pas d’air entre l’étiquette et ses cases.
 const pin=side(z),gap=pin?0:m,room=v.w-gap-m-pin,wide=rect.w*z;
 const centre=align==='centre',left=rect.x*z-pin-gap-(centre&&wide<=room?(room-wide)/2:0);
 const tall=rect.h*z,top=centre&&tall<=v.h-2*m?rect.y*z-(v.h-tall)/2:rect.y*z-m;
 moveCamera(z,left,top,animate);}
function focusPane(name){if(!commitDraft())return;if(needsSetup()&&!['points','results'].includes(name))openSetupCatalogue();if(overview)leaveOverview();finishDescriptorResize();measure();const rect=paneRect(name);if(!rect||!rect.w)return;
 frameRect(rect,{zoom:'keep',side:z=>paneSide(name,rect,z)*z});
 if(!$('[data-map-navigate]').hidden){toggleMap(false);$('[data-action="map"]').focus({preventScroll:true});}}
function fitPane(name){if(!commitDraft())return;if(needsSetup()&&!['points','results'].includes(name))openSetupCatalogue();if(overview)leaveOverview();finishDescriptorResize();measure();const rect=paneRect(name);if(!rect||!rect.w)return;
 // Compétences : catalogue + colonne ; le catalogue est très long, on cadre donc la largeur seulement.
 frameRect(rect,{zoom:'work',side:z=>paneSide(name,rect,z)*z,widthOnly:name==='competencies'&&!needsSetup()});}

function updatePaneTitles(){if(!scrollCache)return;const z=view.zoom,sx=scrollFrame.x;for(const t of scrollCache.titles){const start=t.x*z-sx,end=start+t.w*z,label=(t.lower?X-EXTEND:X)*z-sx,width=(t.lower?descriptorAt(sx,z):upperAt(sx,z)).width*z,edge=Math.max(0,label)+width;const available=Math.max(0,Math.min(scrollCache.v.w,end)-Math.max(edge,start))/z;const showHint=available>=t.full;move(t.hint,showHint?0:-10000);const groupWidth=Math.min(showHint?t.full:t.core,t.w);move(t.run,paneTitleOffset(start,end,edge,groupWidth*z)/z);}}
let pinch=null;
const touchPair=event=>{const a=event.touches[0],b=event.touches[1],r=vp.getBoundingClientRect();return{dist:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1,x:(a.clientX+b.clientX)/2-r.left,y:(a.clientY+b.clientY)/2-r.top};};
const zoomAround=(zoom,anchor,point)=>{if(![zoom,anchor.x,anchor.y,point.x,point.y].every(Number.isFinite))return;view.zoom=Math.max(.2,Math.min(1.8,zoom));updateScale();vp.scrollLeft=Math.max(0,anchor.x*view.zoom-point.x);vp.scrollTop=Math.max(0,anchor.y*view.zoom-point.y);rememberCamera();schedule(true);};
const gestureControl=target=>target.closest?.('.ge-map,.ge-zoom,.ge-menu,[data-direct-control],textarea,select,input[type=search],input[type=number]');
surface.addEventListener('touchstart',event=>{if(event.touches.length!==2||gestureControl(event.target)){pinch=null;return;}event.preventDefault();if(!commitDraft()){pinch=null;return;}endPan();finishGradingDrag(null,false);gestureZoom=null;if(overview&&!bilanOrigin)leaveOverview();const p=touchPair(event);pinch={dist:p.dist,zoom:view.zoom,anchor:{x:(vp.scrollLeft+p.x)/view.zoom,y:(vp.scrollTop+p.y)/view.zoom}};},{passive:false});
surface.addEventListener('touchmove',event=>{if(!pinch||event.touches.length!==2)return;event.preventDefault();const p=touchPair(event);zoomAround(pinch.zoom*p.dist/pinch.dist,pinch.anchor,p);},{passive:false});
for(const name of ['touchend','touchcancel'])surface.addEventListener(name,event=>{if(event.touches.length<2)pinch=null;},{passive:true});
let gestureZoom=null;
surface.addEventListener('gesturestart',event=>{if(gestureControl(event.target))return;event.preventDefault();if(pinch||!commitDraft())return;endPan();if(overview&&!bilanOrigin)leaveOverview();const r=vp.getBoundingClientRect(),v=dims(),x=Number.isFinite(event.clientX)?event.clientX-r.left:v.w/2,y=Number.isFinite(event.clientY)?event.clientY-r.top:v.h/2;gestureZoom={zoom:view.zoom,anchor:{x:(vp.scrollLeft+x)/view.zoom,y:(vp.scrollTop+y)/view.zoom},point:{x,y}};});
surface.addEventListener('gesturechange',event=>{event.preventDefault();if(pinch||!gestureZoom)return;zoomAround(gestureZoom.zoom*event.scale,gestureZoom.anchor,gestureZoom.point);});
surface.addEventListener('gestureend',event=>{event.preventDefault();gestureZoom=null;schedule();});

for(const control of root.querySelectorAll('button[aria-label],summary[aria-label]'))if(!control.title&&!control.hasAttribute('data-mode-help'))control.title=control.getAttribute('aria-label');
storageRead();mountWorkspace();
// D1.53 · Quitter la page : la copie de secours est écrite tout de suite, et le navigateur avertit s’il reste des modifications hors fichier.
// La saisie en cours (valeur valide) est validée avant la copie de secours.
function flushDraft(){if(draft?.node?.isConnected){try{points(draft.node.value,task(draft.t).maxPoints);commitDraft();}catch{}}try{persist();}catch{}}
window.addEventListener('beforeunload',e=>{flushDraft();persistBilan();if(d&&(draft?.dirty||isUnsaved())||bilanPane?.isDirty()){e.preventDefault();e.returnValue='';}});
window.addEventListener('pagehide',flushDraft);
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&!e.altKey&&e.key.toLowerCase()==='s'){e.preventDefault();if(dialog.open)return;if(bilanOrigin){if(bilanPane)saveBilan(bilanPane,e.shiftKey);}else exportJSON(null,e.shiftKey);}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushDraft();});
// D1.53 · Hébergement propre seulement (pas dans le cadre de claude.ai) : application installable, hors ligne, stockage durable.
if(TOP&&window.isSecureContext&&!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)||TOP&&new URLSearchParams(location.search).has('pwa')){
 try{const link=document.createElement('link');link.rel='manifest';link.href='manifest.json';document.head.append(link);
  const touch=document.createElement('link');touch.rel='apple-touch-icon';touch.href='assets/icon-180.png';document.head.append(touch);}catch{}
 try{navigator.serviceWorker?.register('sw.js?v='+encodeURIComponent(APP_VERSION)).catch(()=>{});}catch{}
 // D1.71 · Charger tout de suite les modules utilisés plus tard (bilan, PDF) : une mise à jour publiée pendant
 // la séance ne peut plus mélanger une ancienne et une nouvelle partie de l’application.
 if('serviceWorker' in navigator)setTimeout(()=>{for(const load of [()=>import('./bilan-view.mjs?v=D1.83'),()=>import('./report-pdf.mjs?v='+encodeURIComponent(APP_VERSION)),()=>import('./overview-pdf.mjs?v='+encodeURIComponent(APP_VERSION))])load().catch(()=>{});},1500);
 // Stockage durable seulement pour l’application installée (aucune question de Firefox au premier passage).
 try{if(matchMedia('(display-mode: standalone)').matches||navigator.standalone)navigator.storage?.persist?.().catch(()=>{});}catch{}
}
{const v=$('[data-app-version]');if(v){v.textContent='GrilleÉval · version '+APP_VERSION+(DEV?' · développement':'');if(STATS){const n=document.createElement('p');n.className='ge-menu-version ge-menu-stats';n.textContent='Statistiques d’utilisation anonymes, sans données d’élèves';v.after(n);}}for(const sa of root.querySelectorAll('[data-action="save-as"],[data-action="bilan-save-as"]'))sa.hidden=!FILE_PICKER;}codeInput.value=d.title;renderBoard();
requestAnimationFrame(()=>{measure();if(needsSetup())startSetup();else{updateScale();vp.scrollLeft=view.x*view.zoom;vp.scrollTop=view.y*view.zoom;}updatePins();updateMap();showSave();if(!lastSavedDoc)queueSave();root.dataset.ready='true';});

if(document.fonts?.ready)document.fonts.ready.then(()=>{descriptorMeasureCache.clear();resizeDescriptors(false);});

// Full text stays beside its row, within the label area, outside the checkboxes.
function bindDescriptorTooltip(){
 root.insertAdjacentHTML('beforeend','<div class="ge-descriptor-tooltip" id="ge-descriptor-tooltip" role="tooltip" data-direct-control hidden></div>');
 const tip=$('#ge-descriptor-tooltip');let anchor=null,timer=null,saved=[],described=null;
 const hide=()=>{if(tip.hidden&&!timer&&!anchor)return;clearTimeout(timer);timer=null;tip.hidden=true;for(const [node,title]of saved)if(node.isConnected)node.setAttribute('title',title);saved=[];if(described){const [node,value]=described;if(value==null)node.removeAttribute('aria-describedby');else node.setAttribute('aria-describedby',value);described=null;}anchor=null;};
 const show=(node,keyboard=false)=>{if(!node?.isConnected)return;hide();anchor=node;const full=node.title;if(!full)return;for(const n of [node,...node.querySelectorAll('[title]')]){if(n.hasAttribute('title')){saved.push([n,n.getAttribute('title')]);n.removeAttribute('title');}}
  const cut=node.querySelector('.ge-descriptor-line .ge-label-text')||node.querySelector('.ge-descriptor-text .ge-label-text')||node.querySelector('.ge-descriptor-text')||node;
  const reading=root.dataset.readingResults==='true'&&node.classList.contains('ge-retained');
  if(cut.scrollHeight<=cut.clientHeight+1 && cut.scrollWidth<=cut.clientWidth+1 && !(keyboard&&reading))return;
  tip.textContent=full;
  if(reading){
   const details=document.createElement('small');
   details.textContent=[...node.querySelectorAll('.ge-descriptor-meta>span,.ge-descriptor-meta>small')].map(el=>el.textContent.trim()).filter(Boolean).join(' · ');
   tip.append(details);
  }
  tip.hidden=false;const r=node.getBoundingClientRect(),v=vp.getBoundingClientRect(),room=v.right-r.right-16;
  // D1.36 · La bulle se place à droite de la colonne, à hauteur de la ligne : les compétences au-dessous restent lisibles.
  if(room>=220){const width=Math.min(420,room);tip.style.width=width+'px';tip.style.left=(r.right+8)+'px';const h=tip.getBoundingClientRect().height;tip.style.top=Math.max(v.top+8,Math.min(r.top+r.height/2-h/2,v.bottom-h-8))+'px';tip.dataset.side='right';}
  else{const width=Math.max(1,Math.min(500,r.width-16));tip.style.width=width+'px';tip.style.left=Math.max(v.left+4,r.left+8)+'px';const h=tip.getBoundingClientRect().height;tip.style.top=(r.top-h-5>=v.top+8?r.top-h-5:Math.min(r.bottom+5,v.bottom-h-8))+'px';tip.dataset.side='above';}const control=node.querySelector('.ge-descriptor-text')||node;described=[control,control.getAttribute('aria-describedby')];control.setAttribute('aria-describedby',tip.id);
 };
 root.addEventListener('pointerover',event=>{const node=event.target.closest?.('.ge-compact-descriptor');if(!node||node===anchor)return;clearTimeout(timer);timer=setTimeout(()=>show(node),350);});
 root.addEventListener('pointerout',event=>{if(event.relatedTarget&&((anchor&&anchor.contains(event.relatedTarget))||tip.contains(event.relatedTarget)))return;clearTimeout(timer);timer=setTimeout(hide,100);});
 root.addEventListener('focusin',event=>{const node=event.target.closest?.('.ge-compact-descriptor');if(node)requestAnimationFrame(()=>{if(node.contains(document.activeElement))show(node,true);});});
 root.addEventListener('focusout',event=>{if(!anchor?.contains(event.relatedTarget))hide();});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!tip.hidden){hide();event.stopPropagation();}},{capture:true});
 root.addEventListener('click',hide,{capture:true});scrollHideTooltip=hide;window.addEventListener('blur',hide);
}
bindDescriptorTooltip();
// D1.22 — la carte se range à gauche du zoom, quelle que soit sa largeur (plein écran, pointeur tactile).
(()=>{const zoom=document.querySelector('.ge-zoom'),root=document.getElementById('ge-canvas');if(!zoom||!root||typeof ResizeObserver==='undefined')return;const set=()=>root.style.setProperty('--ge-zoom-width',Math.ceil(zoom.getBoundingClientRect().width)+'px');new ResizeObserver(set).observe(zoom);set();})();
// D1.24 — Les fenêtres de saisie s’ouvrent comme une carte à côté de l’élément touché,
// la surface reste visible. Écran étroit, grandes fenêtres ou position impossible : centré comme avant.
let lastPress=null;
root.addEventListener('pointerdown',e=>{lastPress={el:e.target.closest?.('button,summary,[role="button"],input,label')||e.target,t:Date.now()};},true);
function anchorDialog(fallback){
 dialog.removeAttribute('data-anchored');dialog.style.left=dialog.style.top=dialog.style.maxHeight='';
 const el=lastPress&&Date.now()-lastPress.t<1500&&lastPress.el?.isConnected&&dialog.contains(lastPress.el)===false?lastPress.el:fallback;
 const vw=window.innerWidth||0,vh=window.innerHeight||0;
 if(!el?.getBoundingClientRect||vw<720||vh<480||el.closest?.('.ge-menu-panel,.ge-menu')||dialog.querySelector('.ge-garde,.ge-help-copy,.ge-catalogue'))return;
 const r=el.getBoundingClientRect(),w=dialog.offsetWidth,h=dialog.offsetHeight,m=12,gap=10;
 if(!r.width||!r.height||!w||!h||r.bottom<0||r.top>vh||r.right<0||r.left>vw)return;
 let left,top;
 if(r.right+gap+w<=vw-m)left=r.right+gap;
 else if(r.left-gap-w>=m)left=r.left-gap-w;
 if(left!=null)top=Math.max(m+48,Math.min(r.top-18,vh-m-Math.min(h,vh*.8)));
 else{left=Math.max(m,Math.min(r.left+r.width/2-w/2,vw-m-w));top=r.bottom+gap;if(top+Math.min(h,320)>vh-m){top=r.top-gap-h;if(top<m)return;}}
 dialog.style.left=Math.round(left)+'px';dialog.style.top=Math.round(top)+'px';dialog.style.maxHeight=Math.round(vh-top-m)+'px';dialog.dataset.anchored='';
}

// D1.32 · Effacer la recherche du catalogue (×, ou Échap dans le champ) sans déplacer la vue.
function syncSearchClear(){const input=root.querySelector('[data-catalogue-search]'),clear=root.querySelector('[data-catalogue-search-clear]');if(input&&clear)clear.hidden=!input.value;}
function clearCatalogueSearch(){const input=root.querySelector('[data-catalogue-search]');if(!input||!commitDraft())return;input.value='';catalogueFilter.search='';groupOpen.clear();catalogueLimit=80;refreshCatalogue(false,{preserveViewport:true});syncSearchClear();input.focus({preventScroll:true});}
root.addEventListener('click',e=>{if(e.target.closest('[data-catalogue-search-clear]')){e.preventDefault();clearCatalogueSearch();}});
root.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.matches?.('[data-catalogue-search]')&&e.target.value){e.preventDefault();e.stopPropagation();clearCatalogueSearch();}},true);

// ── D1.33 · Importer des élèves depuis un fichier CSV (repris de GrilleÉval v4, setup_view.dart) ──
// 1 colonne (nom complet) ou 2 colonnes (Prénom, Nom) ; en-têtes reconnus ; séparateur , ; ou tabulation ;
// UTF-8 ou Windows-1252 (export Excel). Les doublons sont reconnus même si prénom et nom sont inversés.
function foldName(value){return String(value||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()||String(value||'').toLowerCase().trim();}
function namePartsKey(value){return foldName(value).split(' ').filter(Boolean).sort().join(' ');}
// D1.38 · Pas de doublons : même nom d’élève (aussi « Nom Prénom » inversé), même intitulé d’exercice,
// même texte de compétence (majuscules, accents et ponctuation ignorés).
function sameLabel(a,b){const x=foldName(a),y=foldName(b);return Boolean(x)&&x===y;}
function quoteList(list){const shown=list.slice(0,3).map(n=>`« ${n} »`).join(', ');return shown+(list.length>3?` et ${list.length-3} autre${list.length>4?'s':''}`:'');}
function duplicatePupils(names,exceptId=null){const out=[];names.forEach((n,i)=>{if(d.students.some(p=>p.id!==exceptId&&studentNamesMatch(p.name,n))||names.slice(0,i).some(m=>studentNamesMatch(m,n)))out.push(n);});return out;}
function checkPupilNames(names,exceptId=null){const dup=duplicatePupils(names,exceptId);if(dup.length)throw new Error(`${dup.length>1?'Ces noms figurent':'Ce nom figure'} déjà dans la liste : ${quoteList(dup)}. Ajouter une initiale pour distinguer deux élèves.`);}
function checkTaskTitles(titles,exceptId=null){const dup=titles.filter((n,i)=>d.tasks.some(t=>t.id!==exceptId&&sameLabel(t.title,n))||titles.slice(0,i).some(m=>sameLabel(m,n)));if(dup.length)throw new Error(`${dup.length>1?'Ces intitulés existent':'Cet intitulé existe'} déjà : ${quoteList(dup)}. Choisir un autre intitulé.`);}
function studentNamesMatch(a,b){const x=foldName(a),y=foldName(b);if(!x||!y)return false;if(x===y)return true;const k=namePartsKey(a);return k.includes(' ')&&k===namePartsKey(b);}
function parseCsvRows(source,delimiter){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<source.length;i++){const ch=source[i];
 if(ch==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
 else if(!quoted&&ch===delimiter){row.push(cell);cell='';}
 else if(!quoted&&(ch==='\n'||ch==='\r')){if(ch==='\r'&&source[i+1]==='\n')i++;row.push(cell);cell='';rows.push(row);row=[];}
 else cell+=ch;}
 row.push(cell);rows.push(row);return rows;}
function studentNamesFromCsv(source){
 const clean=String(source||'').replace(/^﻿/,'').trim();if(!clean)return [];
 const first=clean.split(/\r?\n/)[0],delimiter=[';',',','\t'].map(c=>[c,first.split(c).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=parseCsvRows(clean,delimiter).filter(r=>r.some(c=>c.trim()));if(!rows.length)return [];
 const norm=v=>String(v).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/_/g,' ').replace(/\s+/g,' ');
 const headers=rows[0].map(norm),find=set=>headers.findIndex(h=>set.includes(h));
 const firstI=find(['prenom','firstname','first name','givenname','given name']),lastI=find(['nom de famille','lastname','last name','familyname','family name','surname']);
 let fullI=find(['eleve','nom complet','fullname','full name','student','student name','name']);const nomI=headers.indexOf('nom');
 if(fullI<0&&firstI<0&&lastI<0)fullI=nomI;
 const recognised=firstI>=0||lastI>=0||fullI>=0,data=recognised?rows.slice(1):rows,at=(r,i)=>i>=0&&i<r.length?r[i].trim():'',names=[];
 for(const r of data){let name='';
  if(firstI>=0||lastI>=0)name=[at(r,firstI),at(r,lastI>=0?lastI:nomI)].filter(Boolean).join(' ');
  else if(fullI>=0)name=at(r,fullI);
  else name=r.map(c=>c.trim()).filter(c=>c&&!c.includes('@')&&!/^\+?[0-9 .()/\-]+$/.test(c)).slice(0,2).join(' ');
  name=name.replace(/\s+/g,' ').trim();
  if(name&&!names.some(n=>studentNamesMatch(n,name)))names.push(name.slice(0,120));}
 return names;}
let csvInput=null;
function pickStudentCsv(){if(!commitDraft())return;
 if(!csvInput){csvInput=document.createElement('input');csvInput.type='file';csvInput.accept='.csv,.txt,.json,text/csv,text/plain,application/json';csvInput.hidden=true;root.append(csvInput);
  csvInput.addEventListener('change',async()=>{const file=csvInput.files?.[0];csvInput.value='';if(!file)return;
   // D1.58 · Un test GrilleÉval (.json) donne ses élèves avec leur identifiant : le bilan les reconnaît ensuite à coup sûr.
   if(/\.json$/i.test(file.name)){try{if(file.size>32*1024*1024)throw new Error('Fichier trop volumineux.');const raw=JSON.parse(await file.text());const list=raw?.type==='grilleeval.classe'&&Array.isArray(raw.students)?raw.students:validate(raw).students;
     const entries=list.map(s=>({name:String(s?.name||'').replace(/\s+/g,' ').trim().slice(0,120),uid:typeof s?.uid==='string'&&/^[A-Za-z0-9-]{8,40}$/.test(s.uid)?s.uid:''})).filter(s=>s.name);
     if(!entries.length){notice('Aucun élève dans ce fichier.');return;}if(dialog.open)dialog.close();requestAnimationFrame(()=>importClass(entries));}
    catch(error){notice('Ce fichier ne peut pas être lu : '+error.message,true);}return;}
   try{const bytes=await file.arrayBuffer();let textValue=new TextDecoder('utf-8').decode(bytes);if(textValue.includes('�'))textValue=new TextDecoder('windows-1252').decode(bytes);
    const names=studentNamesFromCsv(textValue);if(!names.length){notice('Aucun nom d’élève trouvé dans ce fichier.');return;}
    if(dialog.open)dialog.close();requestAnimationFrame(()=>importStudents(names,'CSV'));}
   catch{notice('Le fichier n’a pas pu être lu.');}});}
 csvInput.click();}
// D1.57 · Liste de classe : un petit fichier .json (type grilleeval.classe) avec les noms et l’identifiant durable de chaque élève.
// Ouvrir une liste (ou un test enregistré) reprend ces élèves : déjà présents → reconnus, sinon ajoutés. Le bilan les relie ensuite par identifiant.
function importClass(entries){
 const seen=new Set(),unique=entries.filter(e=>{const k=e.uid||'n:'+foldName(e.name);if(seen.has(k))return false;seen.add(k);return true;});
 const plan=unique.map(e=>({e,match:d.students.find(p=>e.uid&&p.uid===e.uid)||d.students.find(p=>(!p.uid||!e.uid||p.uid===e.uid)&&studentNamesMatch(p.name,e.name))}));
 const added=plan.filter(x=>!x.match),known=plan.length-added.length;
 capacity(d.students.length+added.length,d.tasks.length,d.competencies.length);
 const label=n=>n+' élève'+(n>1?'s':'');
 mutation(()=>{for(const {e,match} of plan){if(match){if(!match.uid&&e.uid)match.uid=e.uid;continue;}const p={id:newId('s'),uid:e.uid||newUid(),name:e.name};d.students.push(p);d.scores[p.id]=Object.fromEntries(d.tasks.map(t=>[t.id,null]));}},
  added.length?`${label(added.length)} ajouté${added.length>1?'s':''}${known?` · ${label(known)} déjà dans la liste`:''}.`:`Les ${label(known)} de la liste sont déjà dans le test.`,{shape:true});
}
function importStudents(names,source){
 names=names.filter((n,i)=>!names.slice(0,i).some(m=>studentNamesMatch(m,n)));
 const missing=names.filter(n=>!d.students.some(p=>studentNamesMatch(p.name,n))),label=n=>n+' élève'+(n>1?'s':'');
 const addMissing=()=>{if(!missing.length){notice(`Les ${label(names.length)} de l’import figurent déjà dans la liste.`);return;}capacity(d.students.length+missing.length,d.tasks.length,d.competencies.length);mutation(()=>{for(const name of missing){const p={id:newId('s'),uid:newUid(),name};d.students.push(p);d.scores[p.id]=Object.fromEntries(d.tasks.map(t=>[t.id,null]));}},`${label(missing.length)} ajouté${missing.length>1?'s':''} (${source}).`,{shape:true});};
 const allKnown=d.students.every(p=>names.some(n=>studentNamesMatch(p.name,n)));
 if(!d.students.length||allKnown){addMissing();return;}
 modal({title:`Importer ${label(names.length)} (${source})`,note:`La liste contient déjà ${label(d.students.length)}.`,content:`<p class="ge-import-choice">${missing.length?`« Ajouter » garde la liste et y ajoute ${label(missing.length)}.`:'Tous les noms de l’import figurent déjà dans la liste.'}<br>« Remplacer » reprend la liste de l’import et efface les points déjà saisis.</p>`,submit:missing.length?`Ajouter ${missing.length}`:'Fermer',cancel:'Annuler',onSubmit:()=>{addMissing();}});
 if(!dialog.open)return;
 const actions=dialog.querySelector('.ge-dialog-actions'),replace=document.createElement('button');replace.type='button';replace.className='ge-button ge-remove';replace.textContent='Remplacer la liste';actions.prepend(replace);
 replace.addEventListener('click',()=>{capacity(names.length,d.tasks.length,d.competencies.length);mutation(()=>{d.students=names.map(name=>({id:newId('s'),uid:newUid(),name}));d.scores=Object.fromEntries(d.students.map(p=>[p.id,Object.fromEntries(d.tasks.map(t=>[t.id,null]))]));},`Liste remplacée : ${label(names.length)} (${source}). Annulation possible.`,{shape:true});dialog.close();});
}
root.addEventListener('click',e=>{if(e.target.closest('[data-import-csv]')){e.preventDefault();pickStudentCsv();}});

// D1.62 · Cadre de départ (premier lancement, nouvelle évaluation, test ouvert) : la feuille des points avec ses
// résultats, entière, au plus 100 % et au moins 70 %, centrée ; trop large, elle s’aligne à gauche (noms visibles) ;
// trop haute, elle commence en haut. Au retour dans l’app, la vue enregistrée reste inchangée.
function frameStart(){if(bilanOrigin)return;finishDescriptorResize();measure();const sheet=worldRect([board.querySelector('.ge-points-sheet'),transposed?board.querySelector('[data-column-chart]'):null]);
 if(!sheet){panTo(X,Y);return;}
 sheet.w=Math.min(sheet.w,LABEL+layout().primary*layout().pw+(transposed?0:SUM));
 // D1.75 · Un test vide se construit, il ne s’évalue pas encore : on cadre tout le bloc d’installation (points + « Compétences » avec son
 // catalogue et ses filtres, qui commencent bien plus à gauche) en haut à gauche comme une vue de travail, largeur à 70–100 %. Un test rempli
 // est cadré et centré (D1.73). Revu avec ChatGPT (ronde 8) : « les tests vides s’ancrent, les tests remplis s’encadrent ».
 if(!d.students.length||!d.tasks.length){const comp=transposed?null:paneRect('competencies');let block=sheet;
  if(comp){const l=Math.min(sheet.x,comp.x),r=Math.max(sheet.x+sheet.w,comp.x+comp.w);block={x:l,y:sheet.y,w:r-l,h:sheet.h};}
  frameRect(block,{zoom:'work',widthOnly:true,animate:false});return;}
 frameRect(sheet,{zoom:'work',align:'centre',animate:false});}
// Premier lancement : seulement avec une vraie mise en page (pas dans les tests sans rendu).
if(!hadSavedView)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(board.getBoundingClientRect().height>0)frameStart();}));

// ── D1.35 · e-Bichelchen dans le navigateur ──
// Une page web ne peut pas interroger e-Bichelchen (le navigateur réserve la session à ssl.education.lu).
// Le favori « → GrilleÉval » s’exécute donc SUR e-Bichelchen, avec la session de l’enseignant, et lit les
// classes par la même requête que GrilleÉval v4 (ebichelchen.dart). Il les envoie à GrilleÉval quand celui-ci
// a ouvert l’onglet (postMessage vers notre origine), et les copie toujours dans le presse-papiers.
const EB_URL='https://ssl.education.lu/ebichelchen/app/',EB_STORE='grilleeval-eb-v1';
// D1.40 · e-Bichelchen retiré de l’interface (code gardé en réserve) : EB_ENABLED=true le réactive.
const EB_ENABLED=false;
let ebData=null;const EB_MARK=/^\s*\{\s*"grilleeval"\s*:\s*"eb1"/;
function ebBookmarklet(){
 const here=String(window.location?.origin||''),origin=/^https?:/.test(here)?here:'';
 const code=`(async()=>{const say=m=>alert(m);try{if(!/(^|\\.)education\\.lu$/.test(location.hostname)){say('Ouvrez d’abord e-Bichelchen et connectez-vous, puis cliquez à nouveau sur « → GrilleÉval ».');return;}const r=await fetch('/ebichelchen/app/api/group/get-groups-from-teacher',{credentials:'include',headers:{accept:'application/json, text/plain, */*',mobileappversion:'web'}});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();const arr=[j,j&&j.objects,j&&j.groups,j&&j.data,j&&j.data&&j.data.objects,j&&j.result,j&&j.result&&j.result.objects].find(Array.isArray)||[];const P=p=>{if(!p||typeof p!=='object')return null;const f=p.firstName??p.firstname??'',l=p.lastName??p.lastname??'';return String(p.fullName??p.displayName??p.name??(f+' '+l)).trim()||null};const T=o=>{const n=[];const add=v=>{v&&!n.includes(v)&&n.push(v)};if(!o)return n;[o.teacher,o.titulaire,o.titular,o.instituteur].forEach(x=>add(P(x)));['tutors','titulaires','teachers','instituteurs'].forEach(k=>(Array.isArray(o[k])?o[k]:[]).forEach(x=>add(P(x))));return n};const groups=arr.map(g=>({id:Number(g&&(g.id??g.groupId)),name:String((g&&(g.classAlias??g.name))||''),classGrade:String((g&&g.classGrade)||''),teachers:T(g),students:[...new Set(((g&&(g.students||g.children))||[]).map(P).filter(Boolean))].sort((a,b)=>a.localeCompare(b))})).filter(g=>g.students.length);if(!groups.length){say('Aucune classe trouvée. Êtes-vous connecté(e) à e-Bichelchen ?');return;}const data=JSON.stringify({grilleeval:'eb1',read:new Date().toISOString(),groups});let sent=false;${origin?`try{if(window.opener){window.opener.postMessage(data,${JSON.stringify(origin)});sent=true}}catch(e){}`:''}try{await navigator.clipboard.writeText(data)}catch(e){const t=document.createElement('textarea');t.value=data;document.body.append(t);t.select();document.execCommand('copy');t.remove()}say(groups.length+' classe(s) lue(s). '+(sent?'Elles sont dans GrilleÉval.':'Revenez à GrilleÉval et collez (⌘V / Ctrl+V).'))}catch(e){say('Lecture impossible ('+e.message+'). Êtes-vous connecté(e) à e-Bichelchen ?')}})();`;
 return 'javascript:'+encodeURIComponent(code).replace(/'/g,'%27');}
function cycleFromClassGrade(raw){const text=String(raw||'').toLowerCase();if(/pr[ée]coce/.test(text))return 'Précoce';let m=/([1-4])\s*[.,]\s*([1-2])/.exec(text);if(m)return m[1]+'.'+m[2];m=/(?:^|[^0-9.,])([1-4])(?:[^0-9.,]|$)/.exec(text);return m?m[1]:'';}
function readEbStore(){try{const raw=window.localStorage?.getItem(EB_STORE);return raw?parseEbData(raw):null;}catch{return null;}}
function parseEbData(raw){try{const data=typeof raw==='string'?JSON.parse(raw.trim()):raw;if(!data||data.grilleeval!=='eb1'||!Array.isArray(data.groups))return null;
 const groups=data.groups.map(g=>({id:Number(g.id),name:String(g.name||'').slice(0,120),classGrade:String(g.classGrade||'').slice(0,40),teachers:(Array.isArray(g.teachers)?g.teachers:[]).map(t=>String(t).slice(0,120)).slice(0,10),students:(Array.isArray(g.students)?g.students:[]).map(n=>String(n).replace(/\s+/g,' ').trim().slice(0,120)).filter(Boolean).slice(0,250)})).filter(g=>g.students.length);
 return groups.length?{read:String(data.read||''),groups}:null;}catch{return null;}}
function receiveEb(raw){const data=parseEbData(raw);if(!data)return false;ebData=data;try{window.localStorage?.setItem(EB_STORE,JSON.stringify({grilleeval:'eb1',...data}));}catch{}
 if(dialog.open&&dialog.querySelector('[data-eb-card]'))renderEbClasses();else openEbImport();return true;}
function renderEbClasses(){const box=dialog.querySelector('[data-eb-classes]');if(!box)return;const data=ebData||readEbStore();
 box.innerHTML=data?`<div class="ge-eb-read">Lu le ${esc(euroDate((data.read||'').slice(0,10))||'')}</div>${data.groups.map((g,i)=>`<button type="button" class="ge-eb-class" data-eb-class="${i}"><strong>${esc(g.name||('Classe '+g.id))}</strong><span>${esc([g.classGrade,g.students.length+' élève'+(g.students.length>1?'s':'')].filter(Boolean).join(' · '))}</span></button>`).join('')}`:'';box.hidden=!data;}
function openEbImport(){if(!commitDraft())return;ebData=ebData||readEbStore();
 modal({title:'e-Bichelchen',content:`<div class="ge-eb-card" data-eb-card><div class="ge-eb-classes" data-eb-classes hidden></div><ol class="ge-eb-steps"><li><b>1</b><div>Une seule fois : glisser <a class="ge-eb-bookmarklet" href="${esc(ebBookmarklet())}" data-eb-bookmarklet title="À glisser dans la barre de favoris">→ GrilleÉval</a> dans la barre de favoris <small>(⌘⇧B / Ctrl+Maj+B l’affiche)</small>.</div></li><li><b>2</b><div><button type="button" class="ge-button ge-primary" data-eb-open>Ouvrir e-Bichelchen</button> et se connecter.</div></li><li><b>3</b><div>Sur e-Bichelchen, cliquer sur le favori <span class="ge-eb-chip">→ GrilleÉval</span>. Les classes apparaissent ici.</div></li></ol><label class="ge-field ge-eb-paste"><span>Si rien n’apparaît : coller ici</span><textarea data-eb-paste rows="1" placeholder="⌘V"></textarea></label></div>`});
 if(!dialog.open)return;renderEbClasses();
 const card=dialog.querySelector('[data-eb-card]');
 card.addEventListener('click',e=>{const link=e.target.closest('[data-eb-bookmarklet]');if(link){e.preventDefault();notice('Glissez « → GrilleÉval » dans la barre de favoris.');return;}
  if(e.target.closest('[data-eb-open]')){try{window.open(EB_URL,'grilleeval-ebichelchen');}catch{notice('Ouvrez ssl.education.lu/ebichelchen dans un nouvel onglet.');}return;}
  const choice=e.target.closest('[data-eb-class]');if(choice){const g=(ebData||readEbStore())?.groups[Number(choice.dataset.ebClass)];if(!g)return;dialog.close();applyEbGroup(g);}});
 const paste=card.querySelector('[data-eb-paste]');paste.addEventListener('input',()=>{if(!paste.value.trim())return;if(receiveEb(paste.value))paste.value='';else{const n=dialog.querySelector('.ge-dialog-error');n.textContent='Ce texte ne vient pas du favori « → GrilleÉval ».';n.hidden=false;}});
}
function applyEbGroup(g){const before=d.students.length;importStudents(g.students,'e-Bichelchen');
 const cycle=cycleFromClassGrade(g.classGrade),teacher=g.teachers[0]||'';const patch={};if(g.name&&!d.className)patch.className=g.name;if(cycle&&cycle!==d.cycle&&!before)patch.cycle=cycle;if(teacher&&!d.teacher)patch.teacher=teacher;
 if(Object.keys(patch).length&&!dialog.open)mutation(()=>{Object.assign(d,patch);},'Classe reprise d’e-Bichelchen.');}
window.addEventListener('message',e=>{if(!EB_ENABLED||typeof e.data!=='string'||!EB_MARK.test(e.data))return;receiveEb(e.data);});
root.addEventListener('click',e=>{if(e.target.closest('[data-import-eb]')){e.preventDefault();if(dialog.open)dialog.close();requestAnimationFrame(()=>openEbImport());}});
document.addEventListener('paste',e=>{if(!EB_ENABLED||bilanOrigin||dialog.open)return;const t=e.clipboardData?.getData('text')||'';if(EB_MARK.test(t)){e.preventDefault();receiveEb(t);}});


function currentCamera() {
  return {zoom:view.zoom, x:vp.scrollLeft/view.zoom, y:vp.scrollTop/view.zoom};
}

function loadBilan() {
  if (!bilanLoading) {
    bilanLoading = import('./bilan-view.mjs?v=D1.83').then(({createBilanWorkspace}) => {
      bilanPane = createBilanWorkspace({
        getDocument:()=>d, getRevision:()=>revision, esc, icon, euroDate, highlightSearch, foldName,
        displayDescriptor, gradingLevelInk, gradingMenu, verticalGradingAxis, updateGradingAxis, download, notice, chooseFiles:()=>bilanFiles.click(),
        onLayout:()=>{if (bilanOrigin) { schedule(true); syncBilanHeader(); }}, onSelection:revealBilanResults, onKeepResults:keepBilanResults, onOpened:()=>{bilanHandle=null;},
        onHistory:()=>{if (bilanOrigin) updateHistory();},
        onChange:()=>queueBilanAutosave(), initial:readBilanAutosave(),
        setGrading:next=>mutation(()=>{d.grading=next;},null,{render:false})
      });
      return bilanPane;
    }).catch(error => { bilanLoading = null; throw error; });
  }
  return bilanLoading;
}

function setMode(mode) {
  const isBilan = mode === 'bilan';
  if (isBilan && !bilanTracked) { bilanTracked = true; track('bilan-affiche'); }
  root.dataset.mode = mode;
  board.hidden = isBilan;
  bilanMount.hidden = !isBilan;
  for (const tab of root.querySelectorAll('[data-mode-tab]')) {
    const selected = tab.dataset.modeTab === mode;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  const menu = $('.ge-header-actions > .ge-menu > summary');
  menu.setAttribute('aria-label', isBilan ? 'Fichier du bilan' : 'Fichier et informations');
  menu.title = isBilan ? 'Ajouter des tests, exporter le bilan' : 'Sauvegarder, ouvrir et modifier les informations';
  $('[data-bilan-identity]').hidden = !isBilan;
  $('[data-map-navigate]').setAttribute('aria-label',isBilan ? 'Naviguer avec la carte du bilan' : 'Naviguer avec la carte du test');
  $('[data-map-svg]').setAttribute('aria-label',isBilan ? 'Position des tests et des résultats sur le plan' : 'Position des élèves et compétences sur le plan');
  document.title = (isBilan ? 'Bilan des compétences' : d.title) + ' · GrilleÉval';
  closeMenus();
  toggleMap(false);
  updateHistory();
  syncBilanHeader();
}
// D1.52 · En-tête et menu du bilan, comme pour le test : titre, nombre de tests, actions du fichier.
function syncBilanHeader() {
  if (!bilanOrigin) return;
  const tests = bilanPane?.testCount() ?? 0, pupils = bilanPane?.pupilCount() ?? 0;
  $('[data-bilan-meta]').textContent = tests ? [tests + (tests > 1 ? ' tests' : ' test'), pupils + (pupils > 1 ? ' élèves' : ' élève')].join(' · ') : 'Aucun test choisi';
  const set = (action, enabled) => { const item = $(`[data-action="${action}"]`); if (item) item.disabled = !enabled; };
  set('bilan-csv', Boolean(bilanPane?.canExport()));
  set('bilan-save', Boolean(bilanPane?.testCount()));
  set('bilan-save-as', Boolean(bilanPane?.testCount()));
  set('bilan-new', Boolean(bilanPane?.testCount()));
  set('bilan-report', Boolean(bilanPane?.canExport()));
}
async function bilanAction(action) {
  if (!bilanOrigin) return;
  if (action === 'bilan-add' || action === 'bilan-open') { bilanFiles.click(); return; }
  const workspace = await loadBilan();
  if (action === 'bilan-save') await saveBilan(workspace);
  if (action === 'bilan-save-as') await saveBilan(workspace, true);
  if (action === 'bilan-new') { if (workspace.newBilan()) { bilanHandle = null; persistBilan(); notice('Nouveau bilan · annulation possible.'); } }
  if (action === 'bilan-report') await bilanReports(workspace);
  if (action === 'bilan-csv' && !workspace.exportCSV()) notice('Aucune compétence à exporter.');
  updateHistory();
  syncBilanHeader();
}
// D1.52 · Cadrer un volet du bilan exactement comme fitPane() dans le test :
// 100 % au plus, 32 px d’air en largeur, volet collé au bord, colonne épinglée comptée à gauche.
const FIT_ICON='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4"/></svg>';
const BACK_ICON='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4 3.5 7.5 7 11"/><path d="M3.5 7.5H12a4.5 4.5 0 0 1 0 9H9"/></svg>';
function bilanPaneRect(name) {
  const L = bilanLayout;
  if (name === 'tests') return L.areas.tests;
  if (name === 'results') return L.areas.results;
  if (!L.tableRect) return null;
  if (name === 'chart') return {x:L.tableRect.x, y:L.tableRect.y, w:L.tableRect.w, h:L.headOffset};
  if (name === 'table') return {x:L.tableRect.x, y:L.tableRect.y+L.headOffset, w:L.tableRect.w, h:L.tableRect.h-L.headOffset};
  if (name === 'competencies') return {x:L.barHead.x, y:L.barHead.y, w:L.barHead.w, h:L.tableRect.y+L.tableRect.h-L.barHead.y};
  return null;
}
// Place prise par la colonne des compétences épinglée quand le volet est à sa droite (paneSide dans le test).
function bilanSide(name, zoom) {
  if (name !== 'competencies' && name !== 'chart' || !bilanLayout.tableRect) return 0;
  return name === 'competencies' ? Math.min(bilanLayout.labelWidth, pinnedWidth(zoom)) : 0;
}
function fitBilanArea(name) {
  if (!bilanPane?.element.isConnected) return;
  if (bilanOverview) fitBilan();
  measureBilan();
  toggleMap(false);
  // D1.73 · Même cadrage de travail que dans le test.
  frameRect(bilanPaneRect(name), {zoom:'work', side:z=>bilanSide(name,z)*z});
}


function measureBilan() {
  if (!bilanPane?.element.isConnected) return;
  const {element, selection, results} = bilanPane, v = dims();
  const bounds = {x:X, y:Y, w:element.offsetWidth, h:element.offsetHeight};
  const areas = {tests:worldRect([selection]), results:results.hidden ? null : worldRect([results])};
  const table = element.querySelector('.ge-bilan-table');
  const tableRect = table && worldRect([table]);
  const header = table?.querySelector('thead .ge-bilan-column-heads');
  const headOffset = header ? table.querySelector('thead tr')?.offsetHeight || 0 : 0;
  const labelWidth = header?.firstElementChild?.offsetWidth || 0;
  const barWidth = header?.lastElementChild.offsetWidth || 0;
  const barHead = tableRect && {x:tableRect.x+tableRect.w-barWidth, y:tableRect.y+headOffset, w:barWidth};
  // « Tests du bilan » colle aux résultats comme le catalogue aux compétences dans le test.
  // Ancrée à la ligne « Compétences » (comme le catalogue au volet Compétences), puis suit le défilement jusqu’au bas des résultats.
  const stick = results.hidden ? null : {top:tableRect && header ? tableRect.y+headOffset : Y+results.offsetTop, bottom:Y+results.offsetTop+results.offsetHeight, natural:Y+selection.offsetTop, height:selection.offsetHeight};
  bilanLayout = {bounds,areas,table,tableRect,labelWidth,headOffset,headHeight:header?.offsetHeight || 0,barHead,stick,selection,stickY:bilanLayout?.selection===selection?bilanLayout.stickY:undefined};
  worldSize = {w:Math.max(6000,X+bounds.w+v.w), h:Math.max(5000,Y+bounds.h+v.h)};
  css(stage,'width',worldSize.w+'px');
  css(stage,'height',worldSize.h+'px');
  updateScale();
  css($('[data-scroll-pins]'),'width',v.w+'px');
  css($('[data-scroll-frame]'),'height',v.h+'px');
  mapScale = Math.min(166/worldSize.w,111/worldSize.h);
  mapOffset = {x:(180-worldSize.w*mapScale)/2,y:(125-worldSize.h*mapScale)/2};
  $('[data-map-shapes]').innerHTML = Object.entries(areas).filter(([,r])=>r).map(([name,r])=>
    `<rect class="ge-map-${name === 'tests' ? 'students' : 'competencies'}" x="${mapOffset.x+r.x*mapScale}" y="${mapOffset.y+r.y*mapScale}" width="${r.w*mapScale}" height="${Math.max(3,r.h*mapScale)}" rx="1"></rect>`).join('');
  const camera = $('[data-map-camera]');
  camera.setAttribute('width', Math.min(worldSize.w,v.w/view.zoom)*mapScale);
  camera.setAttribute('height', Math.min(worldSize.h,v.h/view.zoom)*mapScale);
  $('[data-map-shortcuts] [data-bilan-target="results"]').disabled = !areas.results;
  for (const button of root.querySelectorAll('[data-bilan-target="competencies"]')) button.disabled = !barHead;
}

function pinBilanHeadings() {
  const st = bilanLayout?.stick;
  if (bilanLayout) {
    const y = st ? Math.max(st.top - st.natural, Math.min(scrollFrame.y/view.zoom + 14 - st.natural, st.bottom - st.height - st.natural)) : 0;
    if (bilanLayout.stickY !== y) { bilanLayout.selection.style.transform = y ? `translateY(${y}px)` : ''; bilanLayout.stickY = y; }
  }
  if (!bilanLayout?.table) return;
  const {table,tableRect:r,barHead,labelWidth,headOffset,headHeight} = bilanLayout, z = view.zoom;
  // D1.52 · Même logique que la colonne des compétences du test : elle se resserre en restant épinglée.
  const pin = stickyDescriptor(labelWidth,r.x*z-scrollFrame.x,z,Math.min(labelWidth,pinnedWidth(z)));
  const w = Math.round(pin.width*10)/10;
  const x = Math.max(0,Math.min(pin.shift,barHead.x-r.x-w));
  const y = Math.max(0,Math.min(scrollFrame.y/z-r.y-headOffset,r.h-headOffset-headHeight));
  if (bilanLayout.pinW !== w) { table.style.setProperty('--pin-w',w+'px'); table.classList.toggle('ge-bilan-pinned',w<labelWidth-.5); table.classList.toggle('ge-bilan-narrow',w<360); bilanLayout.pinW = w; }
  if (bilanLayout.pinX !== x) { table.style.setProperty('--pin-x',x+'px'); bilanLayout.pinX = x; }
  if (bilanLayout.pinY !== y) { table.style.setProperty('--pin-y',y+'px'); bilanLayout.pinY = y; }
}

function focusBilanArea(name, includeTests = false) {
  if (!bilanPane?.element.isConnected) return;
  if (bilanOverview) fitBilan();
  measureBilan();
  toggleMap(false);
  let rect = bilanPaneRect(name);
  if (!rect || !rect.w) return;
  // Résultats : avec la liste des tests à gauche quand l’ensemble tient à l’écran au zoom de travail.
  const left = bilanLayout.areas.tests;
  if (includeTests && name === 'results' && left) {
    const both = {x:left.x, y:Math.min(left.y,rect.y), w:rect.x+rect.w-left.x, h:Math.max(left.y+left.h,rect.y+rect.h)-Math.min(left.y,rect.y)};
    const z = view.zoom >= CAM.workMin && view.zoom <= CAM.keepMax ? view.zoom : workZoom(both);
    if ((rect.x - left.x + Math.min(620, rect.w)) * z + 2*CAM.margin <= vp.clientWidth) rect = {...rect, x:left.x, w:rect.x+rect.w-left.x};
  }
  // D1.73 · Comme un titre de volet du test.
  frameRect(rect, {zoom:'keep', side:z=>bilanSide(name,z)*z});
}

// D1.63 · Après le choix d’un élève : la vue reste ; si le tableau des résultats est sorti de l’écran (il devient plus étroit), on le ramène juste assez.
function keepBilanResults(){
  if (!bilanOrigin || !bilanPane?.element.isConnected) return;
  measureBilan();const r=bilanPaneRect('results'),z=view.zoom,v=dims(),m=32;if(!r||!r.w)return;
  const right=(r.x+r.w)*z+m-v.w,bottom=(r.y+r.h)*z+m-v.h;
  if(vp.scrollLeft>right)vp.scrollLeft=Math.max(0,Math.min(vp.scrollLeft,Math.max(right,r.x*z-m)));
  if(vp.scrollTop>bottom)vp.scrollTop=Math.max(0,Math.min(vp.scrollTop,Math.max(bottom,r.y*z-m)));
  rememberCamera();schedule(true);
}
function revealBilanResults() {
  if (!bilanOrigin || !bilanPane?.element.isConnected) return;
  if (bilanPane.results.hidden) {
    // Aucun test : la carte de départ au centre, un peu au-dessus du milieu (centre optique).
    if (bilanOverview) fitBilan();
    measureBilan();
    const r = bilanLayout.areas.tests, v = dims(), z = view.zoom;
    if (!r) return;
    vp.scrollLeft = Math.max(0, (r.x + r.w/2)*z - v.w/2);
    vp.scrollTop = Math.max(0, (r.y + r.h/2)*z - v.h*.4);
    rememberCamera();
    schedule(true);
    return;
  }
  focusBilanArea(bilanPane.results.hidden ? 'tests' : 'results',true);
}

function fitBilan() {
  if (!bilanLayout) return;
  const fitButton = $('[data-action="fit"]');
  if (bilanOverview) {
    view = {...bilanOverview};
    bilanOverview = null;
    updateScale();
    vp.scrollLeft = view.x*view.zoom;
    vp.scrollTop = view.y*view.zoom;
    fitButton.innerHTML = FIT_ICON;
    fitButton.setAttribute('aria-pressed','false');
    fitButton.setAttribute('aria-label','Vue d’ensemble');
    fitButton.title = 'Cadrer le plan · cliquer à nouveau pour revenir';
  } else {
    bilanOverview = currentCamera();
    const b = bilanLayout.bounds, v = dims();
    zoomTo(Math.min((v.w-72)/b.w,(v.h-72)/b.h,1));
    panTo(b.x+b.w/2,b.y+b.h/2,true);
    fitButton.innerHTML = BACK_ICON;
    fitButton.setAttribute('aria-pressed','true');
    fitButton.setAttribute('aria-label','Revenir à la vue précédente');
    fitButton.title = 'Revenir à la position et au zoom précédents';
  }
  schedule(true);
}

async function openBilan() {
  if (bilanOrigin || !commitDraft()) return;
  finishGradingDrag(null,false);
  if (!d.evalId) d.evalId = newId('e');
  finishDescriptorResize();
  const fitButton = $('[data-action="fit"]');
  const origin = {camera:currentCamera(), worldSize, cell:lastGridCell, doc:d,
    fit:{html:fitButton.innerHTML, title:fitButton.title, label:fitButton.getAttribute('aria-label'), pressed:fitButton.getAttribute('aria-pressed')}};
  bilanOrigin = origin;
  setMode('bilan');
  notice('');
  fitButton.innerHTML = FIT_ICON;
  fitButton.title = 'Cadrer le plan · cliquer à nouveau pour revenir';
  fitButton.setAttribute('aria-label','Vue d’ensemble');
  fitButton.setAttribute('aria-pressed','false');
  scrollHideTooltip?.();
  setRowHover(null);
  // D1.52 · Même zoom dans le test et dans le bilan.
  view = {zoom:origin.camera.zoom || 1,x:X-26,y:Y-26};
  updateScale();
  panTo(X,Y);
  const loading = loadBilan();
  try {
    const workspace = await loading;
    if (bilanOrigin !== origin) return;
    bilanMount.append(workspace.element);
    workspace.element.style.left = X+'px';
    workspace.element.style.top = Y+'px';
    workspace.sync(revision);
    updateHistory();
    syncBilanHeader();
    revealBilanResults();
  } catch (error) {
    if (bilanOrigin !== origin) return;
    closeBilan(false);
    notice('Impossible d’ouvrir le bilan. ' + error.message,true);
  }
}

function closeBilan(restoreFocus = true) {
  if (!bilanOrigin) return;
  finishGradingDrag(null,false);
  const origin = bilanOrigin;
  const bilanZoom = (bilanOverview || view).zoom;
  bilanOrigin = null;
  bilanPane?.detach();
  bilanLayout = null;
  bilanOverview = null;
  setMode('test');
  const fitButton = $('[data-action="fit"]');
  fitButton.innerHTML = origin.fit.html;
  fitButton.title = origin.fit.title;
  fitButton.setAttribute('aria-label',origin.fit.label);
  fitButton.setAttribute('aria-pressed',origin.fit.pressed);
  worldSize = origin.worldSize;
  view = {...origin.camera};
  // Le zoom choisi dans le bilan revient dans le test, autour du même point qu’avant.
  if (bilanZoom && Math.abs(bilanZoom - view.zoom) > .001) {
    const v = dims(), cx = view.x + v.w/2/view.zoom, cy = view.y + v.h/2/view.zoom;
    view = {zoom:bilanZoom, x:Math.max(0,cx - v.w/2/bilanZoom), y:Math.max(0,cy - v.h/2/bilanZoom)};
  }
  updateScale();
  measure();
  vp.scrollLeft = view.x*view.zoom;
  vp.scrollTop = view.y*view.zoom;
  const {p,c,t,catalogueLink} = origin.cell || {};
  const cell = p ? gradeNodes.get(key(p,t)) : c ? linkNodes.get(key(c,t)) : catalogueLink ?
    board.querySelector(`input[data-catalogue-link="${CSS.escape(catalogueLink)}"][data-t="${CSS.escape(t)}"]`) : null;
  if (restoreFocus && cell && origin.doc === d) {
    restoringGridCell = true;
    try { cell.focus({preventScroll:true}); } finally { restoringGridCell = false; }
  }
  rememberCamera();
  schedule();
}

const modeTabs = $('.ge-mode-switch');
modeTabs.addEventListener('click', e=>{
  const tab = e.target.closest('[data-mode-tab]');
  if (tab?.dataset.modeTab === 'bilan') openBilan();
  else if (tab?.dataset.modeTab === 'test') closeBilan();
});
modeTabs.addEventListener('keydown', e=>{
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
  e.preventDefault();
  const tabs = [...modeTabs.querySelectorAll('[role="tab"]')];
  const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[1] : tabs.find(t=>t!==e.target);
  if (next) { for (const tab of tabs) tab.tabIndex = tab === next ? 0 : -1; next.focus(); }
});
modeTabs.addEventListener('focusout', e=>{
  if (!modeTabs.contains(e.relatedTarget)) for (const tab of modeTabs.querySelectorAll('[role="tab"]')) tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
});
bilanFiles.addEventListener('change',async()=>{
  const files = [...bilanFiles.files];
  bilanFiles.value = '';
  if (!files.length) return;
  try { const workspace = await loadBilan(); await workspace.addFiles(files); updateHistory(); syncBilanHeader(); }
  catch (error) { notice('Impossible de lire les tests. ' + error.message,true); }
});
root.addEventListener('click', e=>{
  if (!bilanOrigin) return;
  const frame = e.target.closest('[data-bilan-frame]');
  if (frame) return fitBilanArea(frame.dataset.bilanFrame);
  const target = e.target.closest('[data-bilan-target]');
  if (target) focusBilanArea(target.dataset.bilanTarget === 'chart' ? 'results' : target.dataset.bilanTarget);
});
// D1.52 · Un clic hors d’un champ du bilan (coefficient, recherche) quitte le champ, comme la saisie des points.
vp.addEventListener('pointerdown', e=>{
  if (!bilanOrigin) return;
  const field = document.activeElement;
  if (!field || !bilanMount.contains(field) || !field.matches('input,textarea,select')) return;
  if (e.target.closest?.('input,textarea,select,label,.ge-calendar')) return;
  field.blur();
}, true);
// D1.52 · Glisser-déposer des fichiers de test sur le plan du bilan.
const carriesFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
vp.addEventListener('dragover', e=>{
  if (!bilanOrigin || !carriesFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  root.classList.add('ge-bilan-dropping');
});
vp.addEventListener('dragleave', e=>{ if (!vp.contains(e.relatedTarget)) root.classList.remove('ge-bilan-dropping'); });
vp.addEventListener('drop', async e=>{
  root.classList.remove('ge-bilan-dropping');
  if (!bilanOrigin || !carriesFiles(e)) return;
  e.preventDefault();
  const files = [...e.dataTransfer.files];
  if (!files.length) return;
  try { const workspace = await loadBilan(); await workspace.addFiles(files); updateHistory(); syncBilanHeader(); }
  catch (error) { notice('Impossible de lire les tests. ' + error.message,true); }
});
window.addEventListener('resize', ()=>{ if (bilanOrigin) bilanPane?.resize(); });

// D1.50 · Date : saisie JJ.MM.AAAA ou choix dans le calendrier du navigateur.
function enhanceDateField(field){
 if(!field||field.closest('.ge-date-box'))return;
 const wrap=document.createElement('span');wrap.className='ge-date-box';field.replaceWith(wrap);wrap.append(field);field.placeholder='JJ.MM.AAAA';
 // Le champ natif reste pour le clavier et les tests ; le calendrier affiché est celui de l’app (fonctionne aussi dans une page intégrée).
 const native=document.createElement('input');native.type='date';native.className='ge-date-native';native.tabIndex=-1;native.setAttribute('aria-hidden','true');
 const button=document.createElement('button');button.type='button';button.className='ge-date-button';button.setAttribute('aria-label','Choisir la date dans le calendrier');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.title='Calendrier';
 button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4.5" width="13" height="12" rx="2.5"/><path d="M3.5 8.5h13M7 3v3M13 3v3"/></svg>';
 const pop=document.createElement('div');pop.className='ge-calendar';pop.hidden=true;pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Calendrier');
 wrap.append(native,button,pop);
 const MONTHS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
 const pad=n=>String(n).padStart(2,'0'),isoOf=(y,m,dd)=>`${y}-${pad(m+1)}-${pad(dd)}`;
 const current=()=>{let iso='';try{iso=isoDate(field.value);}catch{}return iso||'';};
 let shown=null;
 const draw=()=>{const {y,m}=shown,first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),sel=current(),today=new Date(),todayIso=isoOf(today.getFullYear(),today.getMonth(),today.getDate());
  let cells='';for(let k=0;k<offset;k++)cells+='<span></span>';
  for(let dd=1;dd<=days;dd++){const iso=isoOf(y,m,dd);cells+=`<button type="button" data-cal-day="${iso}"${iso===sel?' aria-pressed="true"':''}${iso===todayIso?' data-today':''}>${dd}</button>`;}
  pop.innerHTML=`<div class="ge-calendar-head"><button type="button" data-cal-step="-1" aria-label="Mois précédent">‹</button><strong>${MONTHS[m]} ${y}</strong><button type="button" data-cal-step="1" aria-label="Mois suivant">›</button></div><div class="ge-calendar-week" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="ge-calendar-days">${cells}</div><div class="ge-calendar-foot"><button type="button" data-cal-day="${todayIso}">Aujourd’hui</button></div>`;};
 const close=(focus=false)=>{if(pop.hidden)return;pop.hidden=true;button.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside,true);if(focus)button.focus();};
 const outside=e=>{if(!wrap.contains(e.target))close();};
 const open=()=>{const iso=current()||new Date().toISOString().slice(0,10);native.value=iso;const [y,m]=iso.split('-').map(Number);shown={y,m:m-1};draw();pop.hidden=false;pop.classList.remove('ge-calendar-up');{const box=(wrap.closest('dialog')||document.documentElement).getBoundingClientRect(),r=pop.getBoundingClientRect(),f=field.getBoundingClientRect();if(r.bottom>box.bottom-8&&f.top-box.top>r.height+14)pop.classList.add('ge-calendar-up');}button.setAttribute('aria-expanded','true');document.addEventListener('pointerdown',outside,true);(pop.querySelector('[aria-pressed="true"]')||pop.querySelector('[data-cal-day]'))?.focus();};
 const choose=iso=>{native.value=iso;field.value=euroDate(iso);field.dispatchEvent(new window.Event('input',{bubbles:true}));close();field.focus();};
 button.addEventListener('click',()=>pop.hidden?open():close());
 pop.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;e.preventDefault();if(b.dataset.calStep){shown.m+=Number(b.dataset.calStep);if(shown.m<0){shown.m=11;shown.y--;}if(shown.m>11){shown.m=0;shown.y++;}draw();pop.querySelector(`[data-cal-step="${b.dataset.calStep}"]`)?.focus();return;}if(b.dataset.calDay)choose(b.dataset.calDay);});
 pop.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
  const day=e.target.closest?.('[data-cal-day]');const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(!day||!step||!day.closest('.ge-calendar-days'))return;e.preventDefault();
  const t=new Date(day.dataset.calDay+'T12:00:00');t.setDate(t.getDate()+step);const iso=isoOf(t.getFullYear(),t.getMonth(),t.getDate());if(t.getMonth()!==shown.m||t.getFullYear()!==shown.y){shown={y:t.getFullYear(),m:t.getMonth()};draw();}pop.querySelector(`[data-cal-day="${iso}"]`)?.focus();});
 native.addEventListener('change',()=>{if(native.value)choose(native.value);});
}


// ── D1.83 · Visite guidée : montrer où remplir quoi ───────────────────────────────────────────────────────────────────
// Facultative : proposée une seule fois au tout premier lancement, puis par « Fichier › Visite guidée ».
// Décision de Joël après essai du « faire soi-même » : la visite montre seulement. Elle met en lumière chaque zone sur le test
// ouvert (rien n’est chargé ni modifié), on avance et recule librement (« Précédent », « Suivant », flèches, puces), on peut
// quitter à tout moment et recommencer à la fin. Le sous-titre rappelle que l’ordre de saisie est libre.
let tour=null;
const tourSheet=()=>board.querySelector('.ge-points-sheet');
const TOUR_STEPS=[
 {label:'Infos',title:'Le test en bref',
  text:'En haut à gauche, le titre du test. Un clic ouvre ses informations : titre, date, matière, cycle, durée. Elles figurent aussi sur les pages de garde.',
  target:()=>$('.ge-document-button')},
 {label:'Élèves',title:'Les élèves',pane:'points',
  text:'La colonne des élèves. « + Élève » ou un clic sur une ligne : un nom par ligne, ou toute une liste collée depuis un tableur.',
  target:()=>{const sh=tourSheet();return sh?[sh.querySelectorAll('thead tr')[1]?.firstElementChild,...sh.querySelectorAll('tbody tr:not(.ge-class-summary) > th:first-child')]:null;}},
 {label:'Exercices',title:'Les exercices',pane:'points',
  text:'Les exercices du test, en colonnes. « + Exercice » : un titre court et le maximum de points. Un clic sur un exercice le modifie.',
  target:()=>{const sh=tourSheet();if(!sh)return null;const rows=sh.querySelectorAll('thead tr');return [rows[0]?.children[1],...(rows[1]?.querySelectorAll(':scope > th[data-column], :scope > th.ge-ghost-col')||[])];}},
 {label:'Compétences',title:'Les compétences',pane:'competencies',
  text:'Les compétences évaluées. Le catalogue du plan d’études se filtre à gauche par matière, cycle ou mot-clé ; cochez le rond devant une compétence pour la retenir. « + Compétence » pour en écrire une à vous.',
  target:()=>[catalogueUsedOnly?null:filterPanel,board.querySelector('.ge-competencies-sheet [data-group-header="competencies"] > th'),...board.querySelectorAll('[data-catalogue-group], [data-edit-competency]')].filter(Boolean)},
 {label:'Liens',title:'Relier exercices et compétences',pane:'associations',
  text:'Ici se croisent exercices et compétences. Une case cochée : l’exercice compte pour cette compétence. Les résultats par compétence et par élève suivent à droite.',
  target:()=>{const head=board.querySelector('[data-association-heading]'),cells=[...board.querySelectorAll('input[data-c][data-t], input[data-catalogue-link][data-t]')].map(i=>i.closest('td')||i);
   // Test encore vide : pas de cases, on montre quand même tout le champ, jusqu’au bas du volet.
   const sheet=board.querySelector('.ge-competencies-sheet'),foot=head&&sheet&&!cells.length?{getBoundingClientRect:()=>{const h=head.getBoundingClientRect(),b=sheet.getBoundingClientRect();return {left:h.left,right:h.right,top:b.bottom-1,bottom:b.bottom,width:h.width,height:1};}}:null;
   return [head,...cells,foot].filter(Boolean);}},
 {label:'Points',title:'Les points',pane:'points',
  text:'Après le test, tapez les points dans la grille puis Entrée : on passe à l’élève suivant. D = dispensé. Total, pourcentage et niveau se calculent à droite, selon le barème.',
  target:()=>{const sh=tourSheet();return sh?[...sh.querySelectorAll('td[data-grade-cell], td.ge-ghost-cell')]:null;}},
 {label:'Enregistrer',title:'Enregistrer',
  text:'« Fichier › Enregistrer le test » crée un fichier .json sur votre ordinateur : c’est votre test. Une copie de secours reste aussi dans ce navigateur.',
  target:()=>$('.ge-header-actions > .ge-menu > summary')},
 {label:'Bilan',title:'Le bilan de la période',
  text:'« Bilan des compétences » regroupe vos tests enregistrés : les résultats par élève et par compétence, et les bilans individuels en PDF.',
  target:()=>$('[data-mode-tab="bilan"]')},
];
function tourUI(){let el=document.querySelector('.ge-tour');if(el)return el;el=document.createElement('div');el.className='ge-tour';
 el.innerHTML=`<div class="ge-tour-spot" aria-hidden="true"></div><section class="ge-tour-card" role="dialog" aria-modal="false" aria-labelledby="ge-tour-title"><header class="ge-tour-head"><p class="ge-tour-count"><span class="ge-tour-badge">Tutoriel</span><span class="ge-tour-name">Où remplir quoi</span></p><p class="ge-tour-sub">Procédez ensuite dans l’ordre que vous voulez.</p></header><ol class="ge-tour-list">${TOUR_STEPS.map((s,i)=>`<li><button type="button" data-tour-go="${i}"><span class="ge-tour-tick" aria-hidden="true">${i+1}</span>${s.label}</button></li>`).join('')}</ol><h2 id="ge-tour-title"></h2><p class="ge-tour-text"></p><div class="ge-tour-actions"><button type="button" class="ge-button ge-tour-quit" data-tour-quit>Quitter</button><span class="ge-tour-gap"></span><button type="button" class="ge-button" data-tour-prev>← Précédent</button><button type="button" class="ge-button ge-primary" data-tour-next>Suivant →</button></div></section>`;
 root.append(el);el.addEventListener('click',e=>{const go=e.target.closest('[data-tour-go]');if(go)return tourShow(Number(go.dataset.tourGo));
  if(e.target.closest('[data-tour-next]'))return tour.i>=TOUR_STEPS.length-1?finishTour():tourShow(tour.i+1);
  if(e.target.closest('[data-tour-prev]'))return tourShow(Math.max(0,tour.i-1));
  if(e.target.closest('[data-tour-again]'))return restartTour();
  if(e.target.closest('[data-tour-quit]'))endTour();});return el;}
function startTour(){if(!commitDraft())return;closeMenus();hideTourInvite();if(tour)return;try{localStorage.setItem(TOUR_KEY,'started');}catch{}
 if(bilanOrigin)$('[data-mode-tab="test"]')?.click();if(overview)leaveOverview();
 tour={i:0,raf:0};track('visite-guidee');tourUI().hidden=false;tourShow(0);}
function restartTour(){document.querySelector('.ge-tour')?.remove();tour={i:0,raf:0};tourUI();tourShow(0);}
// Montre une étape ; la vue ne bouge que si la zone n’est pas déjà à l’écran.
function tourShow(i){if(!tour)return;tour.i=i;const step=TOUR_STEPS[i],ui=tourUI();
 ui.querySelector('#ge-tour-title').textContent=step.title;ui.querySelector('.ge-tour-text').textContent=step.text;
 ui.querySelectorAll('[data-tour-go]').forEach((b,j)=>{b.classList.toggle('ge-tour-current',j===i);b.classList.toggle('ge-tour-done',j<i);b.setAttribute('aria-current',j===i?'step':'false');});
 ui.querySelector('[data-tour-prev]').disabled=i===0;ui.querySelector('[data-tour-next]').textContent=i===TOUR_STEPS.length-1?'Terminer':'Suivant →';
 if(step.pane)requestAnimationFrame(()=>{const r=tourRect(step.target()),v=vp.getBoundingClientRect();if(!r||r.top<v.top||r.left<v.left||r.top+Math.min(r.height,v.height*.6)>v.bottom||r.left+Math.min(r.width,v.width*.6)>v.right)focusPane(step.pane);});
 stopFrame(tour.raf);tour.raf=requestAnimationFrame(tourTick);ui.querySelector('[data-tour-next]').focus({preventScroll:true});}
function tourRect(target){const list=(Array.isArray(target)?target:[target]).filter(Boolean).map(e=>e.getBoundingClientRect()).filter(r=>r.width||r.height);if(!list.length)return null;
 const l=Math.min(...list.map(r=>r.left)),t=Math.min(...list.map(r=>r.top)),r=Math.max(...list.map(r=>r.right)),b=Math.max(...list.map(r=>r.bottom));return {left:l,top:t,right:r,bottom:b,width:r-l,height:b-t};}
function finishTour(){const ui=tourUI();stopFrame(tour.raf);tour.raf=0;ui.classList.add('ge-tour-end','ge-tour-centre');ui.querySelector('.ge-tour-spot').style.display='none';
 ui.querySelector('.ge-tour-name').textContent='C’est tout';ui.querySelector('.ge-tour-sub').textContent='';ui.querySelector('#ge-tour-title').textContent='À vous de jouer.';
 ui.querySelector('.ge-tour-text').textContent='Commencez par ce qui vous arrange : infos, élèves, exercices ou compétences. Pour un test vide : « Fichier › Nouvelle évaluation ». La visite reste disponible dans le même menu.';
 ui.querySelector('.ge-tour-actions').innerHTML='<button type="button" class="ge-button" data-tour-again>Recommencer la visite</button><button type="button" class="ge-button ge-primary" data-tour-quit>Terminer</button>';
 ui.querySelector('[data-tour-quit]').focus({preventScroll:true});}
function endTour(){if(!tour)return;stopFrame(tour.raf);tour=null;try{localStorage.setItem(TOUR_KEY,'done');}catch{}document.querySelector('.ge-tour')?.remove();}
// Suit la zone mise en lumière pendant que la vue bouge ; masque la visite tant qu’une fenêtre est ouverte.
function tourTick(){if(!tour)return;const ui=document.querySelector('.ge-tour');if(!ui)return;
 ui.classList.toggle('ge-tour-hidden',dialog.open);
 const step=TOUR_STEPS[tour.i],spot=ui.querySelector('.ge-tour-spot'),card=ui.querySelector('.ge-tour-card'),r=tourRect(step.target());
 if(r&&r.width){const pad=6;Object.assign(spot.style,{display:'block',left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+2*pad+'px',height:r.height+2*pad+'px'});
  // La carte se met dans un coin libre (bas gauche, bas droite, haut droite, haut gauche) : elle ne cache pas la zone.
  const cw=card.offsetWidth||390,ch=card.offsetHeight||300,W=globalThis.innerWidth||1000,H=globalThis.innerHeight||700,g=24,near=40;
  const spots=[[g,H-ch-g],[W-cw-g,H-ch-g],[W-cw-g,64+g],[g,64+g]],free=([x,y])=>x>r.right+near||x+cw<r.left-near||y>r.bottom+near||y+ch<r.top-near;
  const [x,y]=spots.find(free)||spots[0];card.style.left=x+'px';card.style.top=y+'px';}
 else spot.style.display='none';
 tour.raf=requestAnimationFrame(tourTick);}
document.addEventListener('keydown',e=>{if(!tour||dialog.open||document.querySelector('.ge-menu[open]'))return;
 if(e.key==='Escape'){e.preventDefault();endTour();return;}
 if(document.querySelector('.ge-tour-end')||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 if(e.key==='ArrowRight'){e.preventDefault();tour.i>=TOUR_STEPS.length-1?finishTour():tourShow(tour.i+1);}
 else if(e.key==='ArrowLeft'&&tour.i>0){e.preventDefault();tourShow(tour.i-1);}},true);
// Invitation unique au premier lancement.
function hideTourInvite(){document.querySelector('.ge-tour-invite')?.remove();}
function showTourInvite(){if(document.querySelector('.ge-tour-invite'))return;const el=document.createElement('section');el.className='ge-tour-invite';el.setAttribute('aria-label','Visite guidée');
 el.innerHTML='<p><b>Découvrir GrilleÉval en 1 minute</b><span>Une courte visite : où remplir quoi.</span></p><div><button type="button" class="ge-button" data-invite-later>Plus tard</button><button type="button" class="ge-button ge-primary" data-invite-start>Commencer</button></div>';
 el.addEventListener('click',e=>{if(e.target.closest('[data-invite-start]'))startTour();else if(e.target.closest('[data-invite-later]')){try{localStorage.setItem(TOUR_KEY,'later');}catch{}hideTourInvite();}});root.append(el);}
if(FIRST_VISIT&&TOP)setTimeout(()=>{if(!tour&&!dialog.open)showTourInvite();},1400);
