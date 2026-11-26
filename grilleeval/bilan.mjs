// D1.43 · Bilan des compétences sur plusieurs évaluations.
// Chaque évaluation garde son propre calcul (points des exercices associés / maximum).
// Le bilan fait la moyenne pondérée de ces pourcentages, élève par élève et compétence par compétence.
// Les élèves sont reconnus par leur nom (accents, majuscules et ordre Nom/Prénom ignorés),
// les compétences du plan par leur identifiant, les compétences libres par leur texte.
import {competencyResult,levelFor,pupilResult} from './analysis.mjs?v=D1.72';
import {csvSafe} from './model.mjs?v=D1.72';

// D1.71 · Toutes les écritures (cyrillique, grec, arabe…) : seuls les accents et la ponctuation sont ignorés.
export function foldName(value){return String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();}
export function pupilKey(name){return foldName(name).split(' ').filter(Boolean).sort().join(' ');}
export function competencyKey(c){return c.catalogueId?'plan:'+c.catalogueId:'libre:'+foldName(c.text);}
export function weightOf(value){const n=Number(String(value??'').replace(',','.'));return Number.isFinite(n)&&n>0?Math.min(n,100):0;}

/**
 * evaluations: [{id,doc,weight}] · grading: barème utilisé pour les niveaux du bilan.
 * Retourne {pupils,competencies,cell(pupilKey,competencyKey),classMean(competencyKey)}.
 * Une note ne compte que si l’évaluation est complète pour cet élève et cette compétence
 * (tous les exercices associés saisis, élève présent).
 */
export function buildBilan(evaluations,grading,{rank=null}={}){
 const pupils=new Map(),competencies=new Map(),cells=new Map();
 const used=evaluations.filter(e=>e&&e.doc&&weightOf(e.weight)>0);
 // D1.57 · Qui est qui d’un test à l’autre : d’abord l’identifiant durable (uid), sinon le nom.
 // Deux élèves différents ne sont jamais fusionnés : même nom dans un test, ou deux uid différents → élèves séparés + signalement.
 const byUid=new Map(),byName=new Map(),collisions=[];
 const keyFor=(student,usedHere,d)=>{
  const name=pupilKey(student.name);if(!name)return null;
  let key=student.uid&&byUid.get(student.uid);
  let ambiguous=false;
  if(!key){const candidates=(byName.get(name)||[]).filter(k=>!usedHere.has(k)&&(!student.uid||!pupils.get(k).uid||pupils.get(k).uid===student.uid));
   // D1.71 · Sans identifiant et plusieurs élèves possibles du même nom : on ne choisit pas au hasard.
   if(candidates.length===1||student.uid&&candidates.length)key=candidates[0];else if(candidates.length>1)ambiguous=true;}
  if(!key){
   const taken=(byName.get(name)||[]).length;
   key=taken?name+'#'+(taken+1):name;
   if(taken)collisions.push({name:student.name,test:d.title,reason:ambiguous?'ambiguous':(byName.get(name)||[]).some(k=>usedHere.has(k))?'same-test':'different-uid'});
   pupils.set(key,{key,name:student.name,uid:student.uid||null,order:pupils.size,tests:new Map()});
   byName.set(name,[...(byName.get(name)||[]),key]);
  }
  const pupil=pupils.get(key);if(student.uid&&!pupil.uid)pupil.uid=student.uid;if(student.uid)byUid.set(student.uid,key);
  usedHere.add(key);return key;
 };
 for(const [index,e] of used.entries()){
  const d=e.doc,w=weightOf(e.weight),usedHere=new Set(),keys=new Map();
  for (const student of d.students) {
   const key = keyFor(student,usedHere,d);
   if (!key) continue;
   keys.set(student.id,key);
   const result = pupilResult(d,student.id);
   pupils.get(key).tests.set(e.id,{
    percent:result.complete ? result.percent : null, absent:Boolean(result.absent), weight:w
   });
  }
  for(const c of d.competencies){
   const ck=competencyKey(c);
   if(!competencies.has(ck))competencies.set(ck,{key:ck,text:c.text,section:c.section||'Compétences libres',subject:c.subject||d.subject,kind:c.catalogueId?(c.kind||'socle'):'libre',catalogueId:c.catalogueId||null,page:c.page||null,order:competencies.size,evaluations:new Set()});
   if(!(d.links[c.id]||[]).length)continue;
   competencies.get(ck).evaluations.add(e.id);
   for(const p of d.students){
    const r=competencyResult(d,p.id,c.id);if(!r.complete||r.percent==null)continue;
    if(!keys.has(p.id))continue;const key=keys.get(p.id)+'|'+ck;if(!cells.has(key))cells.set(key,{parts:[]});
    cells.get(key).parts.push({evaluation:e.id,index,title:d.title,percent:r.percent,points:r.points,possible:r.possible,weight:w});
   }
  }
 }
 for(const cell of cells.values()){const sw=cell.parts.reduce((s,p)=>s+p.weight,0);cell.weight=sw;cell.percent=sw?cell.parts.reduce((s,p)=>s+p.weight*p.percent,0)/sw:null;cell.level=levelFor(cell.percent,grading);}
 const pupilList=[...pupils.values()].sort((a,b)=>a.order-b.order);
 // Chaque test complet contribue une seule fois, indépendamment de ses associations de compétences.
 for (const pupil of pupilList) {
  let sum = 0, weights = 0, count = 0;
  for (const test of pupil.tests.values()) {
   if (test.percent == null) continue;
   sum += test.percent * test.weight;
   weights += test.weight;
   count++;
  }
  pupil.overall = {percent:weights ? sum/weights : null, count};
 }
 const score=c=>{const r=rank?rank(c):null;return Number.isFinite(r)?r:1e6+c.order;};
 const competencyList=[...competencies.values()].filter(c=>c.evaluations.size).sort((a,b)=>score(a)-score(b));
 const cell=(pk,ck)=>cells.get(pk+'|'+ck)||null;
 const means = new Map();
 function classMean(ck) {
  if (!means.has(ck)) {
   const values = pupilList.map(p => cell(p.key,ck)?.percent).filter(v => v != null);
   const percent = values.length ? values.reduce((sum,v)=>sum+v,0)/values.length : null;
   means.set(ck,percent == null ? null : {percent,level:levelFor(percent,grading),n:values.length});
  }
  return means.get(ck);
 }
 function setGrading(next) {
  grading = next;
  for (const result of cells.values()) result.level = levelFor(result.percent,next);
  for (const result of means.values()) if (result) result.level = levelFor(result.percent,next);
 }
 return {pupils:pupilList,competencies:competencyList,cell,classMean,setGrading,evaluations:used.length,collisions};
}

export function bilanCSV(bilan,grading){
 const q=v=>'"'+csvSafe(v??'').replaceAll('"','""')+'"',pct=v=>v==null?'':(Math.round(v*10)/10).toString().replace('.',',');
 const head=['Domaine','Compétence',...bilan.pupils.flatMap(p=>[p.name+' · %',p.name+' · niveau']),'Classe · %'];
 const rows=bilan.competencies.map(c=>{const m=bilan.classMean(c.key);return [c.section,c.text,...bilan.pupils.flatMap(p=>{const x=bilan.cell(p.key,c.key);return [pct(x?.percent),x&&x.level!=null?grading.labels[x.level]:''];}),pct(m?.percent)];});
 return '﻿'+[head,...rows].map(r=>r.map(q).join(';')).join('\r\n');
}
