export const DEFAULT_GRADING={thresholds:[50,67,83],labels:['En voie d’acquisition','Acquis','Bien acquis','Très bien acquis'],preset:'acquisition'};
// D1.52 · Niveaux détaillés de D à A+ (échelle de l’école, seuils de la grille partagée par les titulaires).
export const LEVEL_SCALE_GRADING={thresholds:[50,59,67,75,83,92],labels:['D','C','C+','B','B+','A','A+'],preset:'niveaux'};
// D1.29 · quatre teintes nettement distinctes : corail → ambre → vert → bleu pétrole.
export const LEVEL_COLOURS=['#e0564a','#eda02e','#3f9e6a','#2f86b8'];
// Nuancier proposé dans la carte du barème (couleur par niveau, enregistrée avec le barème).
export const LEVEL_SWATCHES=['#e0564a','#f07c3a','#eda02e','#d4b62a','#8bb83f','#3f9e6a','#2a9d9a','#2f86b8','#4f6fd6','#7a5cc7','#c24f8e','#8b97a7'];
const HEX=/^#[0-9a-f]{6}$/i;
export const MAX_GRADING_LEVELS=10;
export function validateGrading(raw=DEFAULT_GRADING){
 if(!raw||typeof raw!=='object'||!Array.isArray(raw.thresholds)||raw.thresholds.length<1||raw.thresholds.length>=MAX_GRADING_LEVELS||raw.thresholds.some((n,i)=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>100||i>0&&n<=raw.thresholds[i-1]))throw new Error('Définir 2 à 10 intervalles avec des bornes strictement croissantes entre 0 et 100 %.');
 const labels=raw.labels||DEFAULT_GRADING.labels;
 if(!Array.isArray(labels)||labels.length!==raw.thresholds.length+1||labels.some(s=>typeof s!=='string'||!s.trim()||s.length>80))throw new Error('Chaque intervalle doit avoir un libellé de 1 à 80 caractères.');
 const g={thresholds:[...raw.thresholds],labels:labels.map(s=>s.trim()),preset:labels.length===4&&['acquisition','appreciation','custom'].includes(raw.preset)||labels.length===7&&raw.preset==='niveaux'?raw.preset:'custom'};
 // Couleurs personnalisées : une entrée par niveau, null = couleur automatique.
 if(Array.isArray(raw.colours)&&raw.colours.length===labels.length&&raw.colours.every(c=>c==null||typeof c==='string'&&HEX.test(c))&&raw.colours.some(Boolean))g.colours=raw.colours.map(c=>c?c.toLowerCase():null);
 return g;
}
// Extra levels share the same four-step progression.
export function levelColour(grading,index){
 if(index==null||index<0||index>=grading.labels.length)return '#8b97a7';
 if(grading.colours?.[index])return grading.colours[index];
 const pos=index*3/(grading.labels.length-1),a=Math.floor(pos),b=Math.min(3,a+1),f=pos-a;
 const rgb=h=>[1,3,5].map(p=>parseInt(h.slice(p,p+2),16)),x=rgb(LEVEL_COLOURS[a]),y=rgb(LEVEL_COLOURS[b]);
 return '#'+x.map((n,i)=>Math.round(n+(y[i]-n)*f).toString(16).padStart(2,'0')).join('');
}
export function addGradingInterval(grading,splitIndex=null){
 const g=validateGrading(grading);if(g.labels.length>=MAX_GRADING_LEVELS)throw new Error('Le barème comporte déjà 10 intervalles.');
 const bounds=[0,...g.thresholds,100];let index=g.labels.length-1;
 // Keep the first (success) boundary; split the widest remaining range.
 if(splitIndex==null){for(let i=1;i<g.labels.length;i++)if(bounds[i+1]-bounds[i]>bounds[index+1]-bounds[index])index=i;}
 else if(Number.isInteger(splitIndex)&&splitIndex>=0&&splitIndex<g.labels.length)index=splitIndex;
 else throw new Error('Intervalle à diviser invalide.');
 const boundary=Math.round(bounds[index]+bounds[index+1])/2;
 if(boundary<=bounds[index]||boundary>=bounds[index+1])throw new Error('Élargir un intervalle au-dessus du seuil de réussite avant d’en ajouter un.');
 g.thresholds.splice(index,0,boundary);g.labels.splice(index+1,0,'Nouveau niveau');g.colours?.splice(index+1,0,null);g.preset='custom';return validateGrading(g);
}
// D1.37 · Déplacer un niveau : son nom (et sa couleur choisie) changent de place, les seuils restent.
export function moveGradingLevel(grading,from,to){
 const g=validateGrading(grading),n=g.labels.length;
 if(![from,to].every(i=>Number.isInteger(i)&&i>=0&&i<n))throw new Error('Position de niveau invalide.');
 if(from===to)return g;
 const move=a=>{const x=[...a],[item]=x.splice(from,1);x.splice(to,0,item);return x;};
 return validateGrading({...g,labels:move(g.labels),...(g.colours?{colours:move(g.colours)}:{}),preset:'custom'});
}
// D1.37 · Un nouveau niveau arrive toujours en bas de la liste (il partage le niveau le plus haut) ;
// seulement si ce dernier intervalle est trop étroit, on partage le plus large.
export function appendGradingLevel(grading){
 const g=validateGrading(grading),last=g.labels.length-1,from=g.thresholds[last-1]??0;
 return addGradingInterval(g,100-from>=2?last:null);
}
export function removeGradingInterval(grading,index){
 const g=validateGrading(grading);if(g.labels.length<=2||!Number.isInteger(index)||index<0||index>=g.labels.length)throw new Error('Conserver au moins deux intervalles.');
 g.labels.splice(index,1);g.colours?.splice(index,1);g.thresholds.splice(Math.max(0,index-1),1);g.preset='custom';return validateGrading(g);
}
export function validateCatalogue(raw,fallbackCycle='4.2'){
 const list=Array.isArray(raw)?raw:raw?.catalogue;
 if(!Array.isArray(list)||list.length>5000)throw new Error('Le catalogue doit contenir une liste de 5 000 descripteurs au maximum.');
 const required=(s,label)=>{if(typeof s!=='string'||!s.trim()||s.length>12000)throw new Error(`${label} invalide.`);return s.trim();};
 const result=list.map(c=>{
  if(!c||typeof c!=='object')throw new Error('Descripteur invalide.');
  const id=required(c.id,'Identifiant');if(/[\x00-\x1f]/.test(id)||['__proto__','constructor','prototype'].includes(id))throw new Error('Identifiant invalide.');
  return {id,subject:required(c.subject||c.domainName||c.domain,'Matière'),cycle:required(c.cycle||fallbackCycle,'Cycle'),section:required(c.section||'Compétences','Domaine'),text:required(c.text,'Descripteur'),level:required(c.level||'Socle','Niveau'),source:typeof c.source==='string'?c.source.trim().slice(0,500):'Importé',...Object.fromEntries(['kind','domain','pathway','sourceScope'].filter(key=>typeof c[key]==='string').map(key=>[key,c[key]])),...(typeof c.competence==='string'?{competence:c.competence}:{}),...(Number.isInteger(c.page)&&c.page>0?{page:c.page}:{}),...(typeof c.printedPage==='string'?{printedPage:c.printedPage}:{})};
 });
 if(new Set(result.map(c=>c.id)).size!==result.length)throw new Error('Identifiants en double dans le catalogue.');
 return result;
}
// Vor dem Vergleich auf zwei Nachkommastellen runden (wie GrilleÉval Flutter seit v3.8.57):
// Summen von Zehntelpunkten treffen die Schwelle sonst knapp nicht – 1,2 von 2,4 Punkten
// ergeben im Rechner 49,999999999999986 %, angezeigt werden « 50 % », eingestuft würde darunter.
export const roundForThreshold=value=>Math.round(value*100)/100;
export function levelFor(value,grading=DEFAULT_GRADING){if(value==null||!Number.isFinite(value))return null;const v=roundForThreshold(value);return grading.thresholds.reduce((level,n)=>level+(v>=n?1:0),0);}
// D1.57 · Exercice dispensé (« D ») : saisi, mais retiré des points et du maximum de l’élève.
function tally(d,pid,tasks){
 let possible=0,points=0,filled=0,dispensed=0;
 for(const t of tasks){const v=d.scores[pid]?.[t.id];if(v==null){possible+=t.maxPoints;continue;}filled++;if(v==='D'){dispensed++;continue;}possible+=t.maxPoints;points+=v;}
 return {possible,points,filled,dispensed};
}
export function pupilResult(d,pid){
 if(d.students.find(s=>s.id===pid)?.absent){const possible=d.tasks.reduce((sum,t)=>sum+t.maxPoints,0);return {points:0,possible,filled:0,total:d.tasks.length,complete:false,percent:null,level:null,absent:true};}
 const {possible,points,filled,dispensed}=tally(d,pid,d.tasks);
 const complete=d.tasks.length>0&&filled===d.tasks.length&&possible>0;
 const percent=possible>0&&filled>dispensed?points/possible*100:null;
 return {points,possible,filled,total:d.tasks.length,complete,percent,level:complete?levelFor(percent,d.grading):null,dispensed,allDispensed:d.tasks.length>0&&dispensed===d.tasks.length};
}
export function competencyResult(d,pid,cid){
 const tasks=d.tasks.filter(t=>d.links[cid]?.includes(t.id));
 if(d.students.find(s=>s.id===pid)?.absent){const possible=tasks.reduce((n,t)=>n+t.maxPoints,0);return {points:0,possible,filled:0,total:tasks.length,percent:null,complete:false,level:null,absent:true};}
 const {possible,points,filled,dispensed}=tally(d,pid,tasks);
 const complete=tasks.length>0&&filled===tasks.length&&possible>0;
 const percent=possible>0&&filled>dispensed?points/possible*100:null;
 return {points,possible,filled,total:tasks.length,percent,complete,level:complete?levelFor(percent,d.grading):null,dispensed,allDispensed:tasks.length>0&&dispensed===tasks.length};
}
export function resultStats(d){
 const pupils=d.students.map(p=>({id:p.id,name:p.name,...pupilResult(d,p.id)}));
 const values=pupils.filter(p=>p.complete&&p.percent!=null).map(p=>p.percent).sort((a,b)=>a-b);
 const n=values.length,mean=n?values.reduce((a,b)=>a+b,0)/n:null;
 const median=n?(n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2):null;
 const sd=n?Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/n):null;
 const distribution=Array(d.grading.labels.length).fill(0);for(const p of pupils)if(p.level!=null)distribution[p.level]++;
 return {pupils,n,mean,median,sd,max:n?values.at(-1):null,min:n?values[0]:null,success:n?(n-distribution[0])/n*100:null,distribution};
}
export function catalogueSelection(d,entry){return d.competencies.find(c=>c.catalogueId===entry.id||!c.catalogueId&&c.text.trim()===entry.text.trim()&&subjectName(c.subject||d.subject)===subjectName(entry.subject)&&cycleRoot(c.cycle||d.cycle)===cycleRoot(entry.cycle));}
export function thresholdAt(grading,index,value){
 if(!Number.isInteger(index)||index<0||index>=grading.thresholds.length||!Number.isFinite(value))throw new Error('Seuil invalide.');
 const a=[...grading.thresholds],before=a[index];
 // Leave room for the entire chain at 0/100; neighbours move only when touched.
 a[index]=Math.max(index*.5,Math.min(100-(a.length-1-index)*.5,Math.round(value*2)/2));
 if(a[index]>before)for(let i=index+1;i<a.length;i++)a[i]=Math.max(a[i],a[i-1]+.5);
 if(a[index]<before)for(let i=index-1;i>=0;i--)a[i]=Math.min(a[i],a[i+1]-.5);
 return a;
}

export function cycleRoot(value){const m=/^[1-4](?:[.][12])?$/.exec(String(value??''));return m?m[0][0]:String(value??'');}
export function subjectName(value){const aliases={'Luxembourgeois':'Langue luxembourgeoise','Allemand':'Langue allemande','Français':'Langue française','Sport':'Sports et santé'};return aliases[value]||value;}
export function matchesCompetency(entry,filter){
 const fold=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
 return (!filter.subject||subjectName(entry.subject)===subjectName(filter.subject))&&(!filter.cycle||cycleRoot(entry.cycle)===cycleRoot(filter.cycle))&&(!filter.section||entry.section===filter.section)&&(!filter.kind||entry.kind===filter.kind)&&(!filter.pathway||entry.pathway===filter.pathway)&&fold([entry.text,entry.section,entry.competence,entry.level,entry.pathway].join(' ')).includes(fold(filter.search?.trim()));
}
export function competencyMeta(d,c){const entry=c.catalogueId?d.catalogue.find(e=>e.id===c.catalogueId):null;return {subject:subjectName(c.subject||entry?.subject||d.subject),cycle:cycleRoot(c.cycle||entry?.cycle||d.cycle),section:c.section||entry?.section||'Personnalisées',kind:c.kind||entry?.kind||'libre',pathway:c.pathway||entry?.pathway||'',source:c.source||entry?.source||'',competence:c.competence||entry?.competence||'',level:c.level||entry?.level||'Libre',page:c.page||entry?.page};}
