// Pure, injectable text measurement and sticky geometry, in unscaled world pixels.
export function twoLineWidth(text, measure) {
 const words=String(text).trim().split(/\s+/u).filter(Boolean);
 if(!words.length)return 0;
 let best=measure(words.join(' '));
 for(let i=1;i<words.length;i++)best=Math.min(best,Math.max(measure(words.slice(0,i).join(' ')),measure(words.slice(i).join(' '))));
 return best;
}
export function descriptorColumnWidth(texts,measure,{min=360,max=640,padding=29}={}){
 const needed=Math.max(0,...texts.map(text=>twoLineWidth(text,measure)));
 return Math.max(min,Math.min(max,Math.ceil(needed+padding)));
}
export function stickyDescriptor(fullWidth,left,zoom=1,min=360){
 const overhang=Math.max(0,-left/zoom);
 return {width:Math.max(min,Math.min(fullWidth,fullWidth-overhang)),shift:overhang};
}
