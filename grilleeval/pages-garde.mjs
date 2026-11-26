// Pages de garde · une page A4 par élève, comme dans GrilleÉval v4 (deckblatt.dart).
//
// Une seule mise en page, deux sorties : `layoutPage` calcule une liste de formes en
// points (A4 = 595,28 × 841,89), `drawPDF` la dessine avec jsPDF et `toSVG` l'affiche
// dans l'aperçu. L'aperçu montre donc exactement la page qui sort de l'imprimante.
// Les mesures de texte viennent toujours de jsPDF (Helvetica), jamais du navigateur.
import {pupilResult,competencyResult,competencyMeta,LEVEL_COLOURS,levelColour} from './model.mjs?v=D1.80';

export const A4={w:595.28,h:841.89};
const RAND=36,STUFE=38,KOPF=64,KOPF_PLATZ=KOPF-10;
const C={ink:'#1d1d1f',muted:'#595959',line:'#9a9aa4',fein:'#c9c9d2',band:'#edeff4',kopf:'#f2f2f2',tief:'#1f3864',bar:'#dcdce3'};
const MOIS=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// Les polices standard du PDF ne connaissent que le jeu Windows-1252.
const CP1252=new Set([...'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ']);
export function pdfSafe(s){
 return [...String(s??'')].map(ch=>{
  const c=ch.codePointAt(0);
  if(c<0x100&&(c>=0x20||ch==='\n')||CP1252.has(ch))return ch;
  if(/[‐-‒]/.test(ch))return '-';
  if(ch===' '||ch===' ')return ' ';
  const plain=ch.normalize('NFKD').replace(/[̀-ͯ]/g,'');
  return [...plain].every(x=>x.codePointAt(0)<0x100)?plain:'?';
 }).join('');
}

/** « Test de mathématiques » · même règle que testUeberschrift() de la v4. */
export function testHeading(subject){
 const raw=String(subject||'').trim();if(!raw)return 'Évaluation';
 const low=raw.toLowerCase();
 if(['test','épreuve','epreuve','évaluation','evaluation','bilan','devoir','contrôle','controle'].some(w=>low.startsWith(w)))return raw;
 const abbr=raw.length>1&&raw[1]===raw[1].toUpperCase()&&raw[1]!==raw[1].toLowerCase();
 const inSentence=abbr?raw:raw[0].toLowerCase()+raw.slice(1);
 return 'aàâäeéèêëiîïoôöuùûüyh'.includes(inSentence[0].toLowerCase())?`Test d’${inSentence}`:`Test de ${inSentence}`;
}

// D1.30 · Date européenne JJ.MM.AAAA (stockée en AAAA-MM-JJ).
export function frenchDate(iso){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');if(!m)return '';
 return `${m[3]}.${m[2]}.${m[1]}`;
}

/** Ce qui sera coché : niveau global et niveau par compétence (null = aucune croix). */
export function proposal(d,pid){
 const g=pupilResult(d,pid);
 const comp={};for(const c of d.competencies){const r=competencyResult(d,pid,c.id);comp[c.id]=r.total>0?r.level:null;}
 return {global:g.level,complete:g.complete,percent:g.percent,comp};
}

function groups(d){
 const out=[];const by=new Map();
 for(const c of d.competencies){const meta=competencyMeta(d,c);const key=meta.section&&meta.section!=='Personnalisées'?meta.section:'';
  if(!by.has(key)){const g={name:key,items:[]};by.set(key,g);out.push(g);}by.get(key).items.push({c,avance:meta.kind==='avance'});}
 return out;
}

// Texte coloré sur fond clair : la teinte assombrie reste lisible à l’impression.
function deep(hex,k=.7){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,n>>8&255,n&255].map(v=>Math.round(v*k).toString(16).padStart(2,'0')).join('');}
function mix(hex,keep=.22){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;const f=v=>Math.round(v*keep+255*(1-keep)).toString(16).padStart(2,'0');return '#'+f(r)+f(g)+f(b);}

/** Mise en page d'une page. `m` : un document jsPDF qui sert uniquement à mesurer. */
export function layoutPage(d,pupil,m){
 const items=[],W=A4.w-2*RAND,labels=d.grading.labels,N=labels.length,STEP=Math.min(STUFE,(W-250)/N),TEXT=W-N*STEP,colours=labels.map((_,i)=>levelColour(d.grading,i));
 const face=m.__geFont||'helvetica',safe=m.__geFont?(v=>String(v??'')):pdfSafe;
 const font=(size,bold)=>{m.setFont(face,bold?'bold':'normal');m.setFontSize(size);};
 const width=(s,size,bold,space=0)=>{font(size,bold);return m.getTextWidth(safe(s))+space*Math.max(0,[...s].length-1);};
 const wrap=(s,size,bold,max)=>{font(size,bold);return m.splitTextToSize(safe(s),max);};
 const text=(s,x,y,size,o={})=>items.push({t:'text',s:safe(s),x,y,size,bold:!!o.bold,color:o.color||C.ink,align:o.align||'left',angle:o.angle||0,space:o.space||0,keep:!!o.keep});
 const rect=(x,y,w,h,o={})=>items.push({t:'rect',x,y,w,h,fill:o.fill||null,stroke:o.stroke===undefined?C.line:o.stroke,lw:o.lw??.6,r:o.r||0});
 const fit=(s,size,bold,max)=>{if(width(s,size,bold)<=max)return s;let t=s;while(t.length>1&&width(t+'…',size,bold)>max)t=t.slice(0,-1);return t.trimEnd()+'…';};
 const clip=(x,y,w,h,r,draw)=>{const start=items.length;draw();const inner=items.splice(start);items.push({t:'clip',x,y,w,h,r,items:inner});items.push({t:'rect',x,y,w,h,fill:null,stroke:C.line,lw:.6,r});};
 const caps=(s,x,y)=>text(s.toUpperCase(),x,y,7,{bold:true,color:C.muted,space:.8});
 const p=proposal(d,pupil.id);
 let y=30;

 // ── Bandeau : logo, « Test de … », thème, école
 const hasLogo=typeof d.logo==='string'&&d.logo.startsWith('data:image/');
 const head=testHeading(d.subject),avail=hasLogo?W-100:W;
 let hs=16;for(const s of [26,23,20,18,16])if(width(head,s,true)<=avail){hs=s;break;}
 const headLines=wrap(head,hs,true,avail).slice(0,2),titleLines=wrap(d.title||'',14.5,true,avail).slice(0,2);
 const school=d.school||'';
 const textH=headLines.length*hs*1.05+3+titleLines.length*14.5*1.12+(school?4+8.5*1.2:0);
 const bandH=Math.max(hasLogo?86:0,textH),tx=RAND+(hasLogo?100:0);
 if(hasLogo)items.push({t:'image',data:d.logo,x:RAND,y:y+(bandH-86)/2,w:86,h:86});
 let ty=y+(bandH-textH)/2;
 for(const line of headLines){ty+=hs*1.05;text(line,tx,ty-hs*.22,hs,{bold:true,keep:true});}
 ty+=3;for(const line of titleLines){ty+=14.5*1.12;text(line,tx,ty-14.5*.26,14.5,{bold:true,color:C.tief,keep:true});}
 if(school){ty+=4+8.5*1.2;text(school,tx,ty-8.5*.3,8.5,{color:C.muted});}
 y+=bandH+8;items.push({t:'line',x1:RAND,y1:y,x2:RAND+W,y2:y,color:C.ink,lw:1.4});
 y+=12;

 // ── Données d'en-tête
 const LW=74,RW=118,BW=23,MID=W-LW-RW-4*BW;
 const letters=chosen=>(x,yy,h)=>{['A','B','C','D'].forEach((L,i)=>{const on=chosen===L;rect(x+i*BW,yy,BW,h,{fill:on?mix(LEVEL_COLOURS[3-i]):null});text(L,x+i*BW+BW/2,yy+h/2+(on?3.9:3.5),on?11:10,{bold:true,color:on?C.ink:C.fein,align:'center',keep:on});});};
 const rowsH=[30,26,26],kopfY=y;
 clip(RAND,y,W,30+26+26,7,()=>{
  let yy=kopfY;
  const row=(h,label,value,valueSize,valueBold,rightLabel,right)=>{
   rect(RAND,yy,LW,h,{fill:C.kopf});caps(label,RAND+6,yy+h/2+2.5);
   rect(RAND+LW,yy,MID,h);if(value)text(fit(value,valueSize,valueBold,MID-12),RAND+LW+6,yy+h/2+valueSize*.35,valueSize,{bold:valueBold,keep:valueBold});
   rect(RAND+LW+MID,yy,RW,h,{fill:C.kopf});caps(rightLabel,RAND+LW+MID+6,yy+h/2+2.5);
   right(RAND+LW+MID+RW,yy,h);yy+=h;
  };
  row(rowsH[0],'Élève',pupil.name,14,true,'Attitude au travail',letters(pupil.attitude));
  row(rowsH[1],'Cycle',d.cycle?`Cycle ${d.cycle}`:'',11,false,'Écriture et propreté',letters(pupil.ecriture));
  row(rowsH[2],'Instituteur',d.teacher||'',11,false,'Date',(x,yy,h)=>{rect(x,yy,4*BW,h);const s=frenchDate(d.date);if(s)text(fit(s,9,false,4*BW-6),x+2*BW,yy+h/2+3.2,9,{align:'center'});});
 });
 y+=30+26+26+14;

 // ── Observations et signature (hauteur fixe, comme la v4)
 const OW=(W-8)*.62,SW=W-8-OW;
 rect(RAND,y,OW,92,{r:7});caps('Observations et remarques',RAND+6,y+12);
 {const obs=String(d.observation||'').trim();if(obs){const lines=obs.split(/\n+/).flatMap(par=>wrap(par,9,false,OW-14));const shown=lines.slice(0,6);if(lines.length>6)shown[5]=fit(shown[5]+' …',9,false,OW-14);shown.forEach((l,i)=>text(l,RAND+7,y+27+i*11,9));}}
 rect(RAND+OW+8,y,SW,92,{r:7});caps('Signature des parents',RAND+OW+14,y+12);
 items.push({t:'line',x1:RAND+OW+12,y1:y+92-16,x2:RAND+W-4,y2:y+92-16,color:C.line,lw:.6});
 y+=92+14;

 // ── Évaluation globale
 caps('Évaluation globale du test',RAND,y+6);y+=9;
 const QW=W/N,gy=y;
 clip(RAND,y,W,18+26,7,()=>{for(let i=0;i<N;i++){const x=RAND+i*QW;
  rect(x,gy,QW,18,{fill:mix(colours[i])});text(fit(labels[i]||'',8.5,true,QW-8),x+QW/2,gy+12.2,8.5,{bold:true,color:deep(colours[i]),align:'center'});
  rect(x,gy+18,QW,26);if(p.global===i)text('X',x+QW/2,gy+18+18.5,15,{bold:true,align:'center',keep:true});}});
 y+=18+26+12;

 // ── Compétences évaluées
 const gs=groups(d),n=d.competencies.length,bands=gs.filter(g=>g.name).length;
 if(n){
  const zh=Math.min(44,Math.max(17,(338-16*bands)/n));
  // Libellés verticaux : deux lignes au plus, la plus grande taille qui tient.
  const vwrap=(s,size)=>{const out=[];let cur='';for(const w of String(s).split(/\s+/).filter(Boolean)){const t=cur?cur+' '+w:w;if(cur&&width(t,size,false)>KOPF_PLATZ){out.push(cur);cur=w;}else cur=t;}if(cur)out.push(cur);return out;};
  let vs=5;for(const s of [11.5,11,10.5,10,9.5,9,8.5,8,7,6])if(labels.every(l=>{const L=vwrap(l,s);return L.length<=2&&L.every(x=>width(x,s,false)<=KOPF_PLATZ);})){vs=s;break;}
  const tableH=KOPF+bands*16+n*zh,ty0=y;
  clip(RAND,y,W,tableH,7,()=>{
   let yy=ty0;
   rect(RAND,yy,TEXT,KOPF,{fill:C.kopf});
   text('Compétences évaluées',RAND+6,yy+KOPF/2-1,9.5,{bold:true});
   text('descripteurs du plan d’études',RAND+6,yy+KOPF/2+9,7.5,{color:C.muted});
   for(let i=0;i<N;i++){const x=RAND+TEXT+i*STEP;rect(x,yy,STEP,KOPF,{fill:mix(colours[i])});
    const L=vwrap(labels[i]||'',vs).slice(0,2),lh=vs*1.08,block=L.length*lh,start=x+(STEP-block)/2;
    L.forEach((line,j)=>text(line,start+(j+1)*lh-vs*.28,yy+KOPF-5,vs,{color:deep(colours[i]),angle:90}));}
   yy+=KOPF;
   for(const g of gs){
    if(g.name){rect(RAND,yy,W,16,{fill:C.band});text(fit(g.name,8.5,true,W-12),RAND+6,yy+11,8.5,{bold:true});yy+=16;}
    for(const {c,avance} of g.items){
     rect(RAND,yy,TEXT,zh);
     const size=zh>=26?9:8,max=zh>=30?3:2,lh=size*1.18,suffix=avance?'  (avancé)':'',ss=zh>=26?7.5:6.5,TW=TEXT-12;
     let lines=wrap(c.text,size,false,TW);
     if(lines.length>max){lines=lines.slice(0,max);lines[max-1]=fit(lines[max-1]+'…',size,false,TW);}
     let suffixLine=-1;
     if(suffix){const last=lines.length-1;if(width(lines[last],size,false)+width(suffix,ss,true)<=TW)suffixLine=last;else if(lines.length<max){lines.push('');suffixLine=lines.length-1;}else{lines[last]=fit(lines[last]+'…',size,false,TW-width(suffix,ss,true));suffixLine=last;}}
     const top=yy+(zh-lines.length*lh)/2;
     lines.forEach((line,j)=>{const by=top+(j+1)*lh-size*.28;if(line)text(line,RAND+6,by,size);if(j===suffixLine)text(line?suffix:suffix.trim(),RAND+6+(line?width(line,size,false):0),by,ss,{bold:true,color:C.muted});});
     const box=Math.min(15,zh-6,STEP-6);
     for(let i=0;i<N;i++){const x=RAND+TEXT+i*STEP;rect(x,yy,STEP,zh);const set=p.comp[c.id]===i;
      rect(x+(STEP-box)/2,yy+(zh-box)/2,box,box,{stroke:set?C.ink:C.fein,lw:.9,r:3});
      if(set)text('X',x+STEP/2,yy+zh/2+box*.27,box*.75,{bold:true,align:'center',keep:true});}
     yy+=zh;
    }
   }
  });
 }
 return {items,complete:p.complete,global:p.global};
}

// ── Sorties ─────────────────────────────────────────────────────────────────
export function drawPDF(doc,items){
 const rgb=h=>{const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];};
 for(const it of items){
  if(it.t==='clip'){doc.saveGraphicsState();doc.roundedRect(it.x,it.y,it.w,it.h,it.r,it.r,null);doc.clip();doc.discardPath();drawPDF(doc,it.items);doc.restoreGraphicsState();continue;}
  if(it.t==='rect'){
   if(it.fill)doc.setFillColor(...rgb(it.fill));if(it.stroke){doc.setDrawColor(...rgb(it.stroke));doc.setLineWidth(it.lw);}
   const style=it.fill&&it.stroke?'FD':it.fill?'F':'S';if(!it.fill&&!it.stroke)continue;
   if(it.r)doc.roundedRect(it.x,it.y,it.w,it.h,it.r,it.r,style);else doc.rect(it.x,it.y,it.w,it.h,style);continue;}
  if(it.t==='line'){doc.setDrawColor(...rgb(it.color));doc.setLineWidth(it.lw);doc.line(it.x1,it.y1,it.x2,it.y2);continue;}
  if(it.t==='image'){try{doc.addImage(it.data,/^data:image\/png/.test(it.data)?'PNG':'JPEG',it.x,it.y,it.w,it.h,undefined,'FAST');}catch{}continue;}
  if(it.t==='text'){doc.setFont(doc.__geFont||'helvetica',it.bold?'bold':'normal');doc.setFontSize(it.size);doc.setTextColor(...rgb(it.color));
   const o={align:it.align};if(it.angle)o.angle=it.angle;if(it.space)o.charSpace=it.space;doc.text(it.s,it.x,it.y,o);}
 }
}

const xml=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/** Aperçu SVG. `sketch` : la version abrégée (barres grises, seul le nom reste lisible). */
export function toSVG(items,{sketch=false,measure}={}){
 let defs='',k=0;
 const draw=list=>list.map(it=>{
  if(it.t==='clip'){const id='gc'+(k++);defs+=`<clipPath id="${id}"><rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" rx="${it.r}"/></clipPath>`;return `<g clip-path="url(#${id})">${draw(it.items)}</g>`;}
  if(it.t==='rect')return `<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"${it.r?` rx="${it.r}"`:''} fill="${it.fill||'none'}"${it.stroke?` stroke="${it.stroke}" stroke-width="${it.lw}"`:''}/>`;
  if(it.t==='line')return `<line x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}" stroke="${it.color}" stroke-width="${it.lw}"/>`;
  if(it.t==='image')return sketch?`<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" rx="6" fill="${C.bar}"/>`:`<image href="${xml(it.data)}" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" preserveAspectRatio="xMidYMid meet"/>`;
  if(it.t==='text'){
   if(sketch&&!it.keep){const w=measure?measure(it):it.s.length*it.size*.5,h=Math.max(2,it.size*.5);
    if(it.angle)return `<rect x="${it.x-it.size*.62}" y="${it.y-w}" width="${h}" height="${w}" rx="1" fill="${C.bar}"/>`;
    const x=it.align==='center'?it.x-w/2:it.x;return `<rect x="${x}" y="${it.y-it.size*.62}" width="${w}" height="${h}" rx="1" fill="${C.bar}"/>`;}
   const anchor=it.align==='center'?'middle':it.align==='right'?'end':'start';
   const tr=it.angle?` transform="rotate(${-it.angle} ${it.x} ${it.y})"`:'';
   return `<text x="${it.x}" y="${it.y}" font-size="${it.size}" font-family="Helvetica, Arial, sans-serif"${it.bold?' font-weight="700"':''} fill="${it.color}" text-anchor="${anchor}"${it.space?` letter-spacing="${it.space}"`:''}${tr}>${xml(it.s)}</text>`;}
  return '';
 }).join('');
 const body=draw(items);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${A4.w} ${A4.h}" role="img"><defs>${defs}</defs><rect width="${A4.w}" height="${A4.h}" fill="#fff"/>${body}</svg>`;
}

export function fileName(d){
 const clean=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^\x20-\x7e]+/g,' ').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim();
 return ['Pages de garde',clean(d.subject),clean(d.title),frenchDate(d.date)].filter(Boolean).join(' - ')+'.pdf';
}

/** Le PDF complet pour les élèves choisis (dans l'ordre de la liste). */
// D1.57 · Noms avec des lettres hors Windows-1252 (Łukasz, Ștefan, Milić…) : police Unicode intégrée.
export function needsUnicode(d){
 const texts=[d.title,d.subject,d.teacher,d.school,d.observation,...d.students.map(s=>s.name),...d.tasks.map(t=>t.title),...d.competencies.map(c=>c.text)];
 return texts.some(t=>t&&pdfSafe(t)!==String(t));
}
export function useUnicodeFont(doc,fonts){
 if(!fonts)return doc;
 doc.addFileToVFS('ge-sans-Regular.ttf',fonts.regular);doc.addFont('ge-sans-Regular.ttf','GESans','normal');
 doc.addFileToVFS('ge-sans-Bold.ttf',fonts.bold);doc.addFont('ge-sans-Bold.ttf','GESans','bold');
 doc.__geFont='GESans';return doc;
}
export function buildPDF(jsPDF,d,ids,fonts=null){
 const doc=useUnicodeFont(new jsPDF({unit:'pt',format:'a4',compress:true}),fonts);
 const want=new Set(ids);let first=true;
 for(const pupil of d.students){if(!want.has(pupil.id))continue;if(!first)doc.addPage();first=false;drawPDF(doc,layoutPage(d,pupil,doc).items);}
 doc.setProperties({title:(doc.__geFont?String:pdfSafe)(`Pages de garde · ${d.title||''}`),creator:'GrilleÉval'});
 return doc.output('blob');
}
