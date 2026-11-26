// D1.57 · Bilan individuel en PDF (A4 portrait) : une page (ou plus) par élève, depuis le bilan des compétences.
// Pour chaque compétence : nombre de tests, résultat du bilan, niveau, et l’évolution test par test (petits points).
import {levelColour,levelFor,format} from './model.mjs?v=D1.92';
import {pdfSafe,useUnicodeFont,frenchDate} from './pages-garde.mjs?v=D1.92';

const P={w:595.28,h:841.89},M=36;
const C={ink:'#1d1d1f',muted:'#6b6b73',line:'#d3d3db',head:'#f2f3f7',accent:'#3b49c4'};
const rgb=h=>{const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255];};
const tint=(h,keep=.2)=>'#'+rgb(h).map(v=>Math.round(v*keep+255*(1-keep)).toString(16).padStart(2,'0')).join('');
const short=l=>l==='En voie d’acquisition'?'En voie d’acq.':l;
const pct=v=>v==null?'—':`${(Math.round(v*10)/10).toString().replace('.',',')} %`;

export function reportFileName(pupils){
 const clean=s=>String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[’']/g,' ').replace(/[^\x20-\x7e]+/g,' ').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim();
 return (pupils.length===1?`Bilan individuel - ${clean(pupils[0].name)}`:'Bilans individuels')+` - ${new Date().toISOString().slice(0,10)}.pdf`;
}

export function needsUnicodeReport(data,pupils){
 return [...pupils.map(p=>p.name),...data.competencies.map(c=>c.text),...data.tests.map(t=>t.title)].some(t=>t&&pdfSafe(t)!==String(t));
}

export function buildReportPDF(jsPDF,data,pupils,{fonts=null}={}){
 const doc=useUnicodeFont(new jsPDF({unit:'pt',format:'a4',compress:true}),fonts);
 const face=doc.__geFont||'helvetica',safe=doc.__geFont?(v=>String(v??'')):pdfSafe;
 const font=(size,bold=false,color=C.ink)=>{doc.setFont(face,bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...rgb(color));};
 const text=(s,x,y,o={})=>doc.text(safe(s),x,y,o);
 const g=data.grading,labels=g.labels;
 const dates=data.tests.map(t=>t.date).filter(Boolean).sort();
 const period=dates.length?(dates[0]===dates.at(-1)?frenchDate(dates[0]):`${frenchDate(dates[0])} – ${frenchDate(dates.at(-1))}`):'';
 const TEXT=262,TESTS=42,TREND=70,RES=48,LEVEL=P.w-2*M-TEXT-TESTS-TREND-RES;
 let first=true,page=0;
 const footer=()=>{font(7.5,false,C.muted);text('GrilleÉval · Bilan des compétences',M,P.h-18);text(`Page ${page}`,P.w-M,P.h-18,{align:'right'});};
 for(const person of pupils){
  const head=cont=>{
   if(!first)doc.addPage();first=false;page++;
   font(9,true,C.accent);text(cont?'Bilan des compétences (suite)':'Bilan des compétences',M,M+8);
   font(17,true);text(person.name,M,M+30);
   font(9,false,C.muted);text([period,`${data.tests.length} test${data.tests.length>1?'s':''}`].filter(Boolean).join(' · '),M,M+45);
   doc.setDrawColor(...rgb(C.line));doc.setLineWidth(.6);doc.line(M,M+54,P.w-M,M+54);
   return M+72;
  };
  let y=head(false);
  // Résultat global
  const overall=person.overall?.percent,level=overall==null?null:levelFor(overall,g);
  font(10,true);text('Résultat global',M,y);font(10,false);text(`${pct(overall)}${person.overall?.count?` · ${person.overall.count} test${person.overall.count>1?'s':''} complet${person.overall.count>1?'s':''}`:''}`,M+110,y);
  if(level!=null){const col=levelColour(g,level),w=doc.getTextWidth(safe(labels[level]))+16;doc.setFillColor(...rgb(tint(col,.22)));doc.setDrawColor(...rgb(tint(col,.5)));doc.roundedRect(P.w-M-w,y-10,w,14,3,3,'FD');font(8.5,true,col);text(labels[level],P.w-M-w/2,y,{align:'center'});}
  y+=22;
  // En-tête du tableau
  const tableHead=()=>{doc.setFillColor(...rgb(C.head));doc.setDrawColor(...rgb(C.line));doc.rect(M,y,P.w-2*M,18,'FD');font(7.5,true,C.muted);
   text('Compétence',M+6,y+12);text('Tests',M+TEXT+TESTS/2,y+12,{align:'center'});text('Évolution',M+TEXT+TESTS+TREND/2,y+12,{align:'center'});text('Bilan',M+TEXT+TESTS+TREND+RES/2,y+12,{align:'center'});text('Niveau',M+TEXT+TESTS+TREND+RES+LEVEL/2,y+12,{align:'center'});y+=18;};
  tableHead();
  let section='';
  for(const comp of data.competencies){
   const r=data.cell(person.key,comp.key);
   font(8.5,false);const lines=doc.splitTextToSize(safe(comp.text),TEXT-12);/* D1.92 · texte complet, plus de coupure après 3 lignes */const h=Math.max(20,lines.length*10.5+8);
   const needSection=comp.section!==section;
   if(y+h+(needSection?16:0)>P.h-40){footer();y=head(true);tableHead();section='';}
   if(comp.section!==section){section=comp.section;doc.setFillColor(...rgb('#fafafc'));doc.rect(M,y,P.w-2*M,16,'F');font(8,true);text(section,M+6,y+11);y+=16;}
   doc.setDrawColor(...rgb(C.line));doc.setLineWidth(.3);doc.line(M,y+h,P.w-M,y+h);
   font(8.5,false,r?C.ink:C.muted);lines.forEach((l,i)=>doc.text(l,M+6,y+13+i*10.5));
   if(r){
    const parts=data.orderedParts(r.parts),cy=y+h/2;
    font(8.5,false);text(String(parts.length),M+TEXT+TESTS/2,cy+3,{align:'center'});
    if(parts.length){const x0=M+TEXT+TESTS+8,x1=M+TEXT+TESTS+TREND-8,step=parts.length>1?(x1-x0)/(parts.length-1):0,yy=v=>cy+7-14*Math.max(0,Math.min(100,v))/100;
     const pts=parts.map((p,i)=>[parts.length>1?x0+i*step:(x0+x1)/2,yy(p.percent)]);
     doc.setDrawColor(...rgb('#9a9aa4'));doc.setLineWidth(.6);for(let i=1;i<pts.length;i++)doc.line(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);
     parts.forEach((p,i)=>{doc.setFillColor(...rgb(levelColour(g,levelFor(p.percent,g))));doc.circle(pts[i][0],pts[i][1],1.8,'F');});}
    font(8.5,true);text(pct(r.percent),M+TEXT+TESTS+TREND+RES/2,cy+3,{align:'center'});
    if(r.level!=null){const col=levelColour(g,r.level),x=M+TEXT+TESTS+TREND+RES+4,w=LEVEL-8;doc.setFillColor(...rgb(tint(col,.22)));doc.setDrawColor(...rgb(tint(col,.5)));doc.roundedRect(x,cy-6,w,12,3,3,'FD');font(7.5,true,col);
     let label=safe(short(labels[r.level]));while(label.length>1&&doc.getTextWidth(label)>w-6)label=label.slice(0,-1);text(label,x+w/2,cy+2.5,{align:'center'});}
   }else{font(8,false,C.muted);text('non évaluée',M+TEXT+TESTS+TREND+(RES+LEVEL)/2,y+h/2+3,{align:'center'});}
   y+=h;
  }
  // Liste des tests : complète, sur une page de suite si besoin.
  y+=16;const used=(font(7.5,false,C.muted),doc.splitTextToSize(safe('Tests : '+data.tests.map(t=>[t.title,t.date?frenchDate(t.date):''].filter(Boolean).join(' ')).join(' · ')),P.w-2*M));
  for(const l of used){if(y>P.h-40){footer();y=head(true);font(7.5,false,C.muted);}doc.text(l,M,y);y+=10;}
  footer();
 }
 doc.setProperties({title:safe(pupils.length===1?`Bilan individuel · ${pupils[0].name}`:'Bilans individuels'),creator:'GrilleÉval'});
 return doc.output('blob');
}
