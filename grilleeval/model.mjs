import {PLAN_CATALOGUE,PLAN_INFO} from './curriculum.mjs?v=D1.70';
export {PLAN_CATALOGUE,PLAN_INFO};
import {DEMO_CATALOGUE} from './catalogue.mjs?v=D1.70';
import {DEFAULT_GRADING,validateGrading,validateCatalogue} from './analysis.mjs?v=D1.70';
export {DEMO_CATALOGUE};
export * from './analysis.mjs?v=D1.70';
export const LIMIT = 30000;
export const DEFAULT_NAMES = ['Léa Weber','Tom Schmit','Elena Rossi','Louis Bernard','Anna Wagner','Max Hoffmann','Sophie Klein','Liam Muller','Mia Meyer','Noah Becker','Emma Hoffmann','Lucas Schneider','Chloé Martin','Hugo Lambert','Léonie Thill','Paul Dupont','Jade Ferreira','Gabriel Carvalho','Manon Lefèvre','Raphaël Simon'];
export const EXAMPLES = [
 ['Compréhension orale',5],['Vocabulaire',8],['Structures de phrases',10],['Expression orale',12],['Lecture à voix haute',15],['Compréhension écrite',20],['Expressions idiomatiques',6],['Intentions du locuteur',14],['Textes courts',16],['Production écrite',25],['Reformulation orale',10],['Ponctuation et intonation',8],['Argumentation',12],['Informations implicites',10],['Récit écrit',20]
];
export const DESCRIPTORS = [
 'S’exprimer au présent, au passé et au futur en utilisant des structures de phrases complexes lors d’une conversation ou d’une présentation.',
 'Articuler clairement en respectant la ponctuation, l’intonation et le rythme.',
 'Choisir des mots et expressions précis en fonction des situations de communication.',
 'Illustrer ses arguments lors d’une conversation par des exemples.',
 'Relier les éléments d’une conversation, d’une écoute ou d’une présentation en classe et expliquer les liens entre les éléments.',
 'Interpréter des informations explicites et implicites tirées de divers textes d’écoute.',
 'Expliquer des expressions idiomatiques.',
 'Déduire les intentions et l’émotion du locuteur dans une conversation.',
 'Interpréter des textes courts, en s’appuyant sur le contexte, les mots-clés et la ponctuation.',
 'Lire à voix haute un texte préparé — compétence personnalisée.'
];
// D1.57 · « D » = dispensé : l’exercice ne compte ni dans les points ni dans le maximum de cet élève.
export const DISPENSED='D';
export function format(value) {return value == null ? '' : value === DISPENSED ? DISPENSED : Number(value.toFixed(2)).toString().replace('.',',');}
export function text(value,label) {if(typeof value!=='string'||!value.trim())throw new Error(`${label} ne peut pas être vide.`);if(value.length>12000)throw new Error(`${label} est trop long.`);return value.trim();}
export function points(raw,max=Infinity,{empty=true}={}) {
 const s=String(raw).trim();if(!s&&empty)return null;
 if(/^d(?:isp(?:ens[ée])?)?\.?$/i.test(s))return DISPENSED;
 if(!/^\d+(?:[.,]\d{1,2})?$/.test(s))throw new Error('Saisir un nombre (deux décimales au maximum) ou D pour dispensé.');
 const n=Number(s.replace(',','.'));if(!Number.isFinite(n)||n<0||n>max)throw new Error(`Saisir entre 0 et ${format(max)} points.`);return n;
}
export function capacity(s,t,c) {if([s,t,c].some(n=>!Number.isInteger(n)||n<0||n>250))throw new Error('Entre 0 et 250 éléments par liste.');if((s+c)*t>LIMIT)throw new Error(`Cette version accepte ${LIMIT.toLocaleString('fr-FR')} cellules au maximum.`);}
export function parseCode(raw) {const s=raw.trim();const m=/^c(\d{2})(\d{2})(\d{2})$/i.exec(s)||/^c(\d{1,3})[-/](\d{1,3})[-/](\d{1,3})$/i.exec(s);if(!m)throw new Error('Exemple : c201010 = 20 élèves, 10 exercices, 10 compétences. Plus de 99 : c120-30-25.');const counts=m.slice(1).map(Number);capacity(...counts);return counts;}
export function counts(d) {return [d.students.length,d.tasks.length,d.competencies.length];}
export function countText([s,t,c]) {return `${s} élèves · ${t} exercices · ${c} compétences`;}
export function makeCode(d) {const a=counts(d);return a.every(n=>n<100)?'c'+a.map(n=>String(n).padStart(2,'0')).join(''):'c'+a.join('-');}
export function seed([s,t,c]=[20,10,10]) {
 capacity(s,t,c);
 const d={schemaVersion:2,app:'GrilleEvalCanvas',title:'Évaluation du chapitre 2',subject:'Luxembourgeois',cycle:'4.2',students:Array.from({length:s},(_,i)=>({id:`s${i+1}`,name:DEFAULT_NAMES[i]||`Élève ${i+1}`})),tasks:Array.from({length:t},(_,i)=>({id:`t${i+1}`,title:EXAMPLES[i]?.[0]||`Exercice ${i+1}`,maxPoints:EXAMPLES[i]?.[1]||10})),competencies:Array.from({length:c},(_,i)=>({id:`k${i+1}`,text:DESCRIPTORS[i]||`${DESCRIPTORS[i%DESCRIPTORS.length]} (Compétence ${i+1})`})),scores:{},links:{}};
 const first=[[4.5,6.5,7,7,7,17.5,4.5,6.5,3.5,18.5],[4,2,6,7.5,5.5,15,1,11,10,24],[2,6.5,9,5,14.5,8,5.5,3.5,3,20],[2,7.5,7,3.5,9.5,16.5,4,6.5,7.5,9.5]];
 const assoc=[[0,7],[8,9],[0,9],[2,6],[4,9],[1,3],[3,6],[0,3],[1,7],[4,5]];
 d.grading=validateGrading();d.catalogue=validateCatalogue(PLAN_CATALOGUE);
 for(const [p,student]of d.students.entries())d.scores[student.id]=Object.fromEntries(d.tasks.map((task,j)=>[task.id,first[p]?.[j]??Math.round(task.maxPoints*(.36+((p*7+j*11)%55)/100)*2)/2]));
 for(const [i,k]of d.competencies.entries())d.links[k.id]=t?[...new Set((assoc[i]||[i,i*3+2]).map(n=>d.tasks[n%t].id))]:[];
 // Extend the demonstration associations to every additional task.
 for(let j=10;j<t&&c>0;j++){const competency=d.competencies[[2,1,3,5,2][(j-10)%5]%c];if(!d.links[competency.id].includes(d.tasks[j].id))d.links[competency.id].push(d.tasks[j].id);}
 return d;
}
function previousMathDemo() {
 const d=seed([15,12,0]);Object.assign(d,{title:'Test de mathématiques · Nombres, mesures et géométrie',subject:'Mathématiques',cycle:'4.2',date:'2026-11-12',className:'Classe 4.2 · Groupe A',duration:'50 min',demoId:'maths-c42-plan2026'});
 const names=['Nora Laurent','Elias Wagner','Inès Carvalho','Milo Hoffmann','Amira Schmit','Oscar Ribeiro','Zoé Bernard','Sami Weber','Lina Moreau','Hugo Klein','Eva Fernandes','Adam Rossi','Clara Muller','Noé Lambert','Maya Becker'];d.students.forEach((p,i)=>p.name=names[i]);
 const tasks=[['Comparer des fractions',5],['Ordonner des décimaux',5],['Additionner et soustraire',6],['Multiplier et diviser',6],['Résoudre un problème à étapes',8],['Justifier une solution',4],['Convertir des longueurs',5],['Calculer une durée',5],['Périmètre d’un rectangle',5],['Aire d’un rectangle',5],['Reconnaître des quadrilatères',6],['Tracer et mesurer des angles',6]];
 d.tasks=tasks.map(([title,maxPoints],i)=>({id:'t'+(i+1),title,maxPoints}));
 // Seven exact source descriptors, all at the cycle-4 socle level.
 const starts=['représenter et comparer des nombres décimaux','mobiliser des stratégies de calcul efficaces','résoudre un problème jusqu’à 4 étapes','effectuer des conversions de grandeurs','calculer l’aire et le périmètre','lire des données sous forme de fractions','identifier, mesurer et tracer des angles'];
 const fold=s=>s.replaceAll('’',"'");
 d.competencies=starts.map((start,i)=>{const e=PLAN_CATALOGUE.find(e=>e.subject==='Mathématiques'&&e.cycle==='4'&&e.kind==='socle'&&fold(e.text).startsWith(fold(start)));if(!e)throw new Error('Compétence de démonstration introuvable : '+start);return {...e,id:'k'+(i+1),catalogueId:e.id};});
 d.tasks[5].title='Choisir les opérations d’un problème';d.tasks[7].title='Convertir des durées';d.tasks[10].title='Lire un graphique et ses pourcentages';
 d.links={k1:['t1','t2'],k2:['t3','t4'],k3:['t5','t6'],k4:['t7','t8'],k5:['t9','t10'],k6:['t11'],k7:['t12']};

 let randomState=42151207;const rand=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;};
 d.scores={};for(const pupil of d.students){const ability=.35+rand()*.55;d.scores[pupil.id]=Object.fromEntries(d.tasks.map(t=>[t.id,Math.max(0,Math.min(t.maxPoints,Math.round(t.maxPoints*(ability+(rand()-.5)*.4)*2)/2))]));}
 return d;
}
export function mathDemoV11(){
 const d=previousMathDemo();d.demoId='maths-nombres-c4-v11';d.title='Les nombres dans tous leurs états';d.cycle='4';d.className='Groupe A';d.students=d.students.slice(0,14);
 const tasks=[['Comparer des décimaux',5],['Fractions équivalentes',5],['Addition de décimaux',6],['Soustraction de décimaux',6],['Multiplier des décimaux',6],['Diviser des décimaux',6],['Placer des fractions',5],['Placer des décimaux',5],['Additionner des fractions',6],['Soustraire des fractions',6],['Fractions et décimaux',5],['Calculer avec deux écritures',5]];
 d.tasks=tasks.map(([title,maxPoints],i)=>({id:'t'+(i+1),title,maxPoints}));
 const entries=PLAN_CATALOGUE.filter(e=>e.subject==='Mathématiques'&&e.cycle==='4'&&e.section==='Nombres et opérations');
 if(entries.length!==5)throw new Error('Le plan doit contenir cinq descripteurs Nombres et opérations, cycle 4.');
 d.competencies=entries.map((e,i)=>({...e,id:'k'+(i+1),catalogueId:e.id}));
 d.links={k1:['t1','t2'],k2:['t3','t4','t5','t6'],k3:['t7','t8'],k4:['t9','t10'],k5:['t11','t12']};
 d.scores=Object.fromEntries(d.students.map((p,i)=>[p.id,Object.fromEntries(d.tasks.map((t,j)=>[t.id,Math.min(t.maxPoints,Math.round(t.maxPoints*([.38,.76,.63,.89,.51,.68,.84,.46,.58,.74,.93,.34,.8,.61][i]+(((i*13+j*7)%21)-10)/100)*2)/2)]))]));return d;
}
// D1.42 · Exemple par défaut (c141205) : 3 compétences « Nombres et opérations » et 2 « Grandeurs et mesures ».
export function mathDemo(){
 const d=mathDemoV11();d.demoId='maths-nombres-grandeurs-c4-v12';d.title='Nombres et grandeurs';
 const tasks=[['Comparer des décimaux',5],['Fractions équivalentes',5],['Addition de décimaux',6],['Soustraction de décimaux',6],['Multiplier des décimaux',6],['Diviser des décimaux',6],['Fractions et décimaux',5],['Calculer avec deux écritures',5],['Convertir des longueurs',6],['Convertir des masses',6],['Fraction d’une longueur',5],['Fraction d’une durée',5]];
 d.tasks.forEach((t,i)=>{t.title=tasks[i][0];t.maxPoints=tasks[i][1];});
 const pick=(section,start)=>{const e=PLAN_CATALOGUE.find(e=>e.subject==='Mathématiques'&&e.cycle==='4'&&e.section===section&&e.text.startsWith(start));if(!e)throw new Error('Compétence de démonstration introuvable : '+start);return e;};
 const entries=[pick('Nombres et opérations','représenter et comparer'),pick('Nombres et opérations','mobiliser des stratégies'),pick('Nombres et opérations','établir des liens'),pick('Grandeurs et mesures','effectuer des conversions'),pick('Grandeurs et mesures','mesurer une fraction')];
 d.competencies=entries.map((e,i)=>({...e,id:'k'+(i+1),catalogueId:e.id}));
 d.links={k1:['t1','t2'],k2:['t3','t4','t5','t6'],k3:['t7','t8'],k4:['t9','t10'],k5:['t11','t12']};
 for(const p of d.students)for(const t of d.tasks)d.scores[p.id][t.id]=Math.min(t.maxPoints,d.scores[p.id][t.id]);
 return d;
}
// Upgrade only the untouched previous example. Any changed points, labels,
// associations, titles, or catalogue entries preserve the user's document.
export function refreshDefaultDemo(d){
 if(d.demoId!=='maths-c42-plan2026'&&d.demoId!=='maths-nombres-c4-v11')return d;
 const old=d.demoId==='maths-nombres-c4-v11'?mathDemoV11():previousMathDemo(),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 for(const key of ['title','subject','cycle','date','className','duration','students','tasks','scores','links','grading'])if(!same(d[key],old[key]))return d;
 if(d.competencies.length!==old.competencies.length||d.competencies.some((c,i)=>c.text!==old.competencies[i].text||c.catalogueId!==old.competencies[i].catalogueId))return d;
 if(d.catalogue.length!==PLAN_CATALOGUE.length||d.catalogue.some(e=>!unchangedPlanEntry(e)))return d;
 return mathDemo();
}
export function emptyDocument(catalogTitle='Nouvelle évaluation') {const d=seed([0,0,0]);d.title=catalogTitle;d.subject='Mathématiques';return d;}
export function clone(d) {return JSON.parse(JSON.stringify(d));}
function object(x,label) {if(!x||typeof x!=='object'||Array.isArray(x))throw new Error(`${label} doit être un objet.`);return x;}
function id(x) {const s=text(x,'Identifiant');if(/[\x00-\x1f]/.test(s)||['__proto__','constructor','prototype'].includes(s))throw new Error('Identifiant invalide.');return s;}
export function validate(source) {
 let raw=typeof source==='string'?JSON.parse(source):source;object(raw,'Sauvegarde');
 if(raw.schemaVersion===1&&Array.isArray(raw.catalogue)&&Array.isArray(raw.selectedCompetencyIds))raw={...raw,schemaVersion:2,competencies:raw.selectedCompetencyIds.map(key=>{const c=raw.catalogue.find(c=>c.id===key);if(!c)throw new Error('Compétence manquante.');return {id:c.id,text:c.text};})};
 if(raw.schemaVersion!==2)throw new Error('Version de sauvegarde non prise en charge.');
 for(const key of ['students','tasks','competencies'])if(!Array.isArray(raw[key]))throw new Error(`Liste ${key} invalide.`);
 capacity(raw.students.length,raw.tasks.length,raw.competencies.length);
 const d={schemaVersion:2,app:'GrilleEvalCanvas',title:text(raw.title,'Titre'),subject:text(raw.subject||'Luxembourgeois','Matière'),cycle:text(raw.cycle||'4.2','Cycle'),students:raw.students.map(s=>({id:id(s.id),...(typeof s.uid==='string'&&/^[A-Za-z0-9-]{8,40}$/.test(s.uid)?{uid:s.uid}:{}),name:text(s.name,'Nom'),...(s.absent===true?{absent:true}:{}),...(/^[ABCD]$/.test(s.attitude||'')?{attitude:s.attitude}:{}),...(/^[ABCD]$/.test(s.ecriture||'')?{ecriture:s.ecriture}:{})})),tasks:raw.tasks.map(t=>{if(typeof t.maxPoints!=='number'||!Number.isFinite(t.maxPoints)||t.maxPoints<=0)throw new Error('Maximum de points invalide.');return {id:id(t.id),title:text(t.title,'Exercice'),maxPoints:t.maxPoints};}),competencies:raw.competencies.map(k=>({id:id(k.id),text:text(k.text,'Compétence'),...(k.catalogueId?{catalogueId:id(k.catalogueId)}:{}),...Object.fromEntries(['subject','cycle','section','kind','level','competence','source','domain','pathway','sourceScope','printedPage'].filter(key=>typeof k[key]==='string').map(key=>[key,k[key]])),...(Number.isInteger(k.page)&&k.page>0?{page:k.page}:{})})),scores:{},links:{}};
 for(const field of ['date','className','duration','demoId','teacher','school','evalId'])if(typeof raw[field]==='string')d[field]=raw[field].slice(0,200);if(typeof raw.observation==='string')d.observation=raw.observation.slice(0,600);
 if(raw.logo==='none')d.logo='none';else if(typeof raw.logo==='string'&&raw.logo.length<700000&&/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(raw.logo))d.logo=raw.logo;
 for(const a of [d.students,d.tasks,d.competencies])if(new Set(a.map(x=>x.id)).size!==a.length)throw new Error('Identifiants en double.');
 const scoreMap=object(raw.scores,'Points'),linkMap=object(raw.links,'Associations');
 const pids=new Set(d.students.map(p=>p.id)),tids=new Set(d.tasks.map(t=>t.id)),kids=new Set(d.competencies.map(k=>k.id));
 if(Object.keys(scoreMap).some(p=>!pids.has(p)))throw new Error('Points associés à un élève inconnu.');
 for(const p of d.students){const row=object(scoreMap[p.id]||{},'Points élève');if(Object.keys(row).some(t=>!tids.has(t)))throw new Error('Points associés à un exercice inconnu.');d.scores[p.id]={};for(const t of d.tasks){const n=row[t.id]??null;if(n!==null&&n!==DISPENSED&&(typeof n!=='number'||!Number.isFinite(n)||n<0||n>t.maxPoints||Math.abs(n*100-Math.round(n*100))>1e-6))throw new Error(`Points invalides : ${p.name} / ${t.title}.`);d.scores[p.id][t.id]=n;}}
 if(Object.keys(linkMap).some(k=>!kids.has(k)))throw new Error('Association à une compétence inconnue.');
 for(const k of d.competencies){const row=linkMap[k.id]||[];if(!Array.isArray(row)||row.some(t=>!tids.has(t)))throw new Error('Association à un exercice inconnu.');d.links[k.id]=[...new Set(row)];}
 d.grading=validateGrading(raw.grading);d.catalogue=validateCatalogue(raw.catalogueIncludesPlan?[...new Map([...PLAN_CATALOGUE,...(raw.catalogue||[])].map(e=>[e.id,e])).values()]:raw.catalogue||PLAN_CATALOGUE,d.cycle);
 return d;
}
export function total(d,p) {return d.tasks.reduce((n,t)=>{const v=d.scores[p]?.[t.id];return n+(typeof v==='number'?v:0);},0);}
export function possible(d) {return d.tasks.reduce((n,t)=>n+t.maxPoints,0);}
export function filled(d,p) {return d.tasks.filter(t=>d.scores[p]?.[t.id]!=null).length;}
export function linked(d,k,t) {return d.links[k]?.includes(t)||false;}
export function removeTask(d,tid) {d.tasks=d.tasks.filter(t=>t.id!==tid);for(const row of Object.values(d.scores))delete row[tid];for(const [key,list]of Object.entries(d.links))d.links[key]=list.filter(id=>id!==tid);}
// D1.57 · Une cellule de texte qui commence par = + - @ serait exécutée comme formule par Excel : on la préfixe d’une apostrophe.
export function csvSafe(v){const t=String(v);return /^[=+\-@\t\r]/.test(t)&&!/^-?\d+(?:[.,]\d+)?$/.test(t)?"'"+t:t;}
export function toCSV(d) {const q=v=>'"'+csvSafe(v).replaceAll('"','""')+'"';return '\ufeff'+[['Élève',...d.tasks.map(t=>`${t.title} / ${format(t.maxPoints)}`),'Total','Saisie complète'],...d.students.map(p=>[p.name,...d.tasks.map(t=>format(d.scores[p.id]?.[t.id])),format(total(d,p.id)),filled(d,p.id)===d.tasks.length?'Oui':'Non'])].map(row=>row.map(q).join(';')).join('\r\n');}
export function pasteBlock(d,pid,tid,source,{transposed=false}={}) {
 const p=d.students.findIndex(s=>s.id===pid),t=d.tasks.findIndex(task=>task.id===tid);if(p<0||t<0)throw new Error('Cellule inconnue.');
 const lines=source.replace(/\r\n?/g,'\n').replace(/\n$/,'').split('\n').map(row=>row.split('\t'));
 if(transposed?(t+lines.length>d.tasks.length||lines.some(row=>p+row.length>d.students.length)):(p+lines.length>d.students.length||lines.some(row=>t+row.length>d.tasks.length)))throw new Error('Le bloc dépasse la grille. Ajouter les lignes ou colonnes nécessaires avant de coller.');
 const updates=[];for(const [i,row]of lines.entries())for(const [j,value]of row.entries()){try{const pi=p+(transposed?j:i),ti=t+(transposed?i:j);updates.push([d.students[pi].id,d.tasks[ti].id,points(value,d.tasks[ti].maxPoints)]);}catch(e){throw new Error(`Collage, ligne ${i+1}, colonne ${j+1} : ${e.message}`);}}
 return updates;
}
export function pinState({left,top,width,height,labelWidth,groups,zoom,viewportWidth}) {
 const visible=left<viewportWidth&&left+width>0&&top+height>0;
 const active=groups.find(g=>g.screenTop<=0&&g.screenBottom>0);
 const showHeader=visible&&zoom>=.55&&Boolean(active);
 const showLabels=visible&&zoom>=.55&&left<0&&left+width>(labelWidth+96)*zoom&&labelWidth*zoom<viewportWidth*.6;
 return {showHeader,showLabels,group:active||null,headTop:active?Math.min(0,active.screenBottom-active.headerHeight*zoom):0,labelLeft:Math.min(0,left+width-labelWidth*zoom)};
}

const builtInMap=new Map(PLAN_CATALOGUE.map(e=>[e.id,e]));
function unchangedPlanEntry(e){const original=builtInMap.get(e.id);return original&&['subject','cycle','section','text','kind','level','source','competence','page','printedPage','domain','pathway','sourceScope'].every(key=>e[key]===original[key]);}
export function encodeDocument(d){return JSON.stringify({...d,catalogue:d.catalogue.filter(e=>!unchangedPlanEntry(e)),catalogueIncludesPlan:true,catalogueVersion:2026});}
export function upgradeCatalogue(d){
 const obsolete=e=>e.id?.startsWith('pe2011-')||e.source==='Démonstration'||/2011/.test(e.source||'');
 for(const c of d.competencies){
  const entry=c.catalogueId?d.catalogue.find(e=>e.id===c.catalogueId):null;
  if(entry){for(const key of ['subject','cycle','section','kind','level','source','domain','pathway','sourceScope']){if(!c[key]&&typeof entry[key]==='string')c[key]=entry[key];}}
  if(c.catalogueId?.startsWith('pe2011-')||entry&&obsolete(entry)){
   delete c.catalogueId;delete c.page;c.kind='libre';c.level='Texte conservé · ancien catalogue';c.section='Personnalisées · ancien catalogue';c.source='Ancien catalogue · texte conservé';delete c.competence;
  }
 }
 d.catalogue=[...new Map([...PLAN_CATALOGUE,...d.catalogue.filter(e=>!obsolete(e))].map(e=>[e.id,e])).values()];return d;
}

export {twoLineWidth,descriptorColumnWidth,stickyDescriptor} from './descriptor-layout.mjs?v=D1.70';
export {autoResultsState,paneTitleOffset} from './auto-results.mjs?v=D1.70';
