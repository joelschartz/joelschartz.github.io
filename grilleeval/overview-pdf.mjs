// D1.57 · Vue d’ensemble du test en PDF (A4 paysage) : points de la classe, puis compétences par élève.
// Une seule fonction, sans état : buildOverviewPDF(jsPDF, d, {fonts}) → Blob.
// Les noms et titres passent par la police Unicode quand elle est fournie (sinon Helvetica, texte simplifié).
import {pupilResult,competencyResult,resultStats,levelColour,format} from './model.mjs?v=D1.103';
import {pdfSafe,useUnicodeFont,frenchDate} from './pages-garde.mjs?v=D1.103';

const P={w:841.89,h:595.28},M=28;
const C={ink:'#1d1d1f',muted:'#6b6b73',line:'#c9c9d2',head:'#f2f3f7',zebra:'#fafafc',accent:'#3b49c4'};
const rgb=h=>{const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];};
const tint=(h,keep=.2)=>'#'+rgb(h).map(v=>Math.round(v*keep+255*(1-keep)).toString(16).padStart(2,'0')).join('');
const pct=v=>v==null?'':`${(Math.round(v*10)/10).toString().replace('.',',')} %`;

export function overviewFileName(d){
 const clean=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[’']/g,' ').replace(/[^\x20-\x7e]+/g,' ').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim();
 return ['Vue d ensemble',clean(d.title),frenchDate(d.date)].filter(Boolean).join(' - ')+'.pdf';
}

export function buildOverviewPDF(jsPDF,d,{fonts=null}={}){
 const doc=useUnicodeFont(new jsPDF({unit:'pt',format:'a4',orientation:'landscape',compress:true}),fonts);
 const face=doc.__geFont||'helvetica',safe=doc.__geFont?(v=>String(v??'')):pdfSafe;
 const font=(size,bold=false,color=C.ink)=>{doc.setFont(face,bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...rgb(color));};
 const text=(s,x,y,o={})=>doc.text(safe(s),x,y,o);
 const fit=(s,max)=>{let t=safe(s);if(doc.getTextWidth(t)<=max)return t;while(t.length>1&&doc.getTextWidth(t+'…')>max)t=t.slice(0,-1);return t.trimEnd()+'…';};
 const box=(x,y,w,h,fill,stroke=C.line)=>{if(fill)doc.setFillColor(...rgb(fill));doc.setDrawColor(...rgb(stroke));doc.setLineWidth(.4);doc.rect(x,y,w,h,fill?'FD':'S');};
 const g=d.grading,labels=g.labels,stats=resultStats(d);
 let page=0;
 const header=subtitle=>{
  if(page++)doc.addPage();
  font(15,true);text(d.title||'Évaluation',M,M+14);
  font(9,false,C.muted);text([d.subject,d.cycle?`Cycle ${d.cycle}`:'',frenchDate(d.date),d.teacher].filter(Boolean).join(' · '),M,M+28);
  font(9,true,C.accent);text(subtitle,P.w-M,M+14,{align:'right'});
  doc.setDrawColor(...rgb(C.line));doc.setLineWidth(.6);doc.line(M,M+36,P.w-M,M+36);
  return M+50;
 };
 const footer=()=>{font(7.5,false,C.muted);text('GrilleÉval',M,P.h-14);text(`Page ${page}`,P.w-M,P.h-14,{align:'right'});};
 // Légende « 01 Titre · 02 Titre … » (ou une compétence par ligne) ; D1.92 · plus rien n’est coupé : la suite passe sur une page de légende.
 const legend=(items,y,sub,perLine=false)=>{
  font(7.5,false,C.muted);const lines=perLine?items.flatMap(it=>doc.splitTextToSize(safe(it),P.w-2*M)):doc.splitTextToSize(safe(items.join('   ·   ')),P.w-2*M);
  for(const l of lines){if(y>P.h-30){footer();y=header(sub+' · légende (suite)');font(7.5,false,C.muted);}doc.text(l,M,y);y+=10;}return y;
 };

 // D1.92 · Beaucoup d’exercices ou de compétences : le tableau se découpe en blocs de colonnes lisibles, chacun sur ses pages
 // (numérotation d’origine conservée, Total · % · Niveau répétés à droite de chaque bloc).
 const chunks=(list,max)=>{if(!list.length)return [[]];const parts=Math.ceil(list.length/max),size=Math.ceil(list.length/parts),out=[];for(let i=0;i<list.length;i+=size)out.push(list.slice(i,i+size));return out;};
 const range=(first,last,prefix='')=>first===last?`${prefix}${first}`:`${prefix}${first}–${prefix}${last}`;

 // ── Page 1 · Points ───────────────────────────────────────────────────────
 const NAME=150,TOTAL=60,PERC=44,LEVEL=96,ROW=16,HEAD=30,MIN_COL=20;
 const room=P.w-2*M-NAME-TOTAL-PERC-LEVEL,taskBlocks=chunks(d.tasks.map((t,i)=>({t,i})),Math.max(1,Math.floor(room/MIN_COL)));
 const rowsPerPage=Math.max(5,Math.floor((P.h-M-50-HEAD-70)/ROW));
 const pupils=d.students;
 for(const block of taskBlocks){
  const COL=room/Math.max(1,block.length),tableW=NAME+COL*block.length+TOTAL+PERC+LEVEL;
  const sub='Points de la classe'+(taskBlocks.length>1?` · exercices ${range(String(block[0].i+1).padStart(2,'0'),String(block.at(-1).i+1).padStart(2,'0'))}`:'');
  for(let start=0;start===0||start<pupils.length;start+=rowsPerPage){
   let y=header(sub);
   box(M,y,tableW,HEAD,C.head);
   font(8,true);text('Élève',M+6,y+18);
   block.forEach(({t,i},j)=>{const x=M+NAME+j*COL;font(7.5,true);text(String(i+1).padStart(2,'0'),x+COL/2,y+12,{align:'center'});font(6.5,false,C.muted);text('/ '+format(t.maxPoints),x+COL/2,y+23,{align:'center'});});
   let x=M+NAME+COL*block.length;font(8,true);text('Total',x+TOTAL/2,y+18,{align:'center'});text('%',x+TOTAL+PERC/2,y+18,{align:'center'});text('Niveau',x+TOTAL+PERC+LEVEL/2,y+18,{align:'center'});
   y+=HEAD;
   for(const [k,p] of pupils.slice(start,start+rowsPerPage).entries()){
    const r=pupilResult(d,p.id);box(M,y,tableW,ROW,(start+k)%2?C.zebra:'#ffffff');
    font(8.5,false);text(fit(p.name,NAME-12),M+6,y+11);
    if(r.absent){font(8,false,C.muted);text('absent(e)',M+NAME+6,y+11);}
    else block.forEach(({t},j)=>{const v=d.scores[p.id]?.[t.id];const cx=M+NAME+j*COL+COL/2;if(v==null){font(8,false,C.line);text('·',cx,y+11,{align:'center'});}else if(v==='D'){font(7.5,false,C.muted);text('D',cx,y+11,{align:'center'});}else{font(8,false);text(format(v),cx,y+11,{align:'center'});}});
    x=M+NAME+COL*block.length;
    if(!r.absent){font(8,true);text(`${format(r.points)} / ${format(r.possible)}${r.complete?'':'*'}`,x+TOTAL/2,y+11,{align:'center'});font(8,false);text(pct(r.percent),x+TOTAL+PERC/2,y+11,{align:'center'});}
    if(r.level!=null){const col=levelColour(g,r.level);box(x+TOTAL+PERC+3,y+2.5,LEVEL-6,ROW-5,tint(col,.22),tint(col,.45));font(7.5,true,col);text(fit(labels[r.level],LEVEL-12),x+TOTAL+PERC+LEVEL/2,y+11,{align:'center'});}
    y+=ROW;
   }
   for(let j=0;j<=block.length;j++){doc.setDrawColor(...rgb(C.line));doc.setLineWidth(.3);const lx=M+NAME+j*COL;doc.line(lx,M+50,lx,y);}
   y+=14;
   if(start+rowsPerPage>=pupils.length){
    font(8.5,true);text('Classe',M,y);font(8.5,false);
    text([`Moyenne ${pct(stats.mean)}`,`Médiane ${pct(stats.median)}`,`Taux de réussite ${pct(stats.success)}`,`${stats.n} / ${pupils.length} élèves complets`].join('    '),M+48,y);
    y+=14;
   }
   font(7,false,C.muted);text('*  saisie incomplète      D  dispensé      ·  non saisi',M,y);y+=12;
   legend(block.map(({t,i})=>`${String(i+1).padStart(2,'0')} ${t.title}`),y,sub);
   footer();
   if(!pupils.length)break;
  }
 }

 // ── Page 2 · Compétences par élève ───────────────────────────────────────
 const comps=d.competencies.filter(c=>(d.links[c.id]||[]).length);
 if(comps.length&&pupils.length){
  const KROOM=P.w-2*M-NAME,compBlocks=chunks(comps.map((c,i)=>({c,i})),Math.max(1,Math.floor(KROOM/30)));
  for(const block of compBlocks){
   const KCOL=Math.max(26,Math.min(70,KROOM/block.length)),KW=NAME+KCOL*block.length;
   const sub='Compétences par élève'+(compBlocks.length>1?` · ${range(block[0].i+1,block.at(-1).i+1,'C')}`:'');
   for(let start=0;start<pupils.length;start+=rowsPerPage){
    let y=header(sub);
    box(M,y,KW,HEAD,C.head);font(8,true);text('Élève',M+6,y+18);
    block.forEach(({i},j)=>{font(7.5,true);text('C'+(i+1),M+NAME+j*KCOL+KCOL/2,y+18,{align:'center'});});
    y+=HEAD;
    for(const [k,p] of pupils.slice(start,start+rowsPerPage).entries()){
     box(M,y,KW,ROW,(start+k)%2?C.zebra:'#ffffff');font(8.5,false);text(fit(p.name,NAME-12),M+6,y+11);
     block.forEach(({c},j)=>{const r=competencyResult(d,p.id,c.id),cx=M+NAME+j*KCOL;
      if(r.level!=null){const col=levelColour(g,r.level);box(cx+2,y+2.5,KCOL-4,ROW-5,tint(col,.25),tint(col,.5));font(7,true,col);text(pct(r.percent).replace(' %','%'),cx+KCOL/2,y+11,{align:'center'});}
      else if(r.absent){font(7,false,C.muted);text('abs.',cx+KCOL/2,y+11,{align:'center'});}
      else if(r.percent!=null){font(7,false,C.muted);text(pct(r.percent).replace(' %','%')+'*',cx+KCOL/2,y+11,{align:'center'});}});
     y+=ROW;
    }
    y+=14;
    // Légende des niveaux
    let lx=M;font(7.5,false);
    labels.forEach((l,i)=>{const col=levelColour(g,i);box(lx,y-7,10,8,tint(col,.25),tint(col,.5));font(7.5,false,C.ink);text(l,lx+14,y);lx+=doc.getTextWidth(safe(l))+30;});
    y+=14;
    legend(block.map(({c,i})=>`C${i+1} ${c.text}`),y,sub,true);
    footer();
   }
  }
 }
 doc.setProperties({title:safe(`Vue d’ensemble · ${d.title||''}`),creator:'GrilleÉval'});
 return doc.output('blob');
}
