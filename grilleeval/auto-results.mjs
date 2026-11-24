// Screen-space intersection, independent of task count and orientation.
export function autoResultsState(previous,{catalogue=true,overview=false,zooming=false,checkboxFocused=false,resultsVisible=true,bothFit=false,matrixStart=0,matrixEnd=0,viewportLeft=0,viewportRight=0}={}){
 if(overview||!catalogue||checkboxFocused||bothFit)return false;
 if(zooming)return previous;
 if(!resultsVisible)return false;
 const space=Math.max(0,viewportRight-viewportLeft);
 if(!space)return false;
 const visible=Math.max(0,Math.min(matrixEnd,viewportRight)-Math.max(matrixStart,viewportLeft));
 const denominator=Math.min(Math.max(0,matrixEnd-matrixStart),space);
 if(!denominator)return false;
 const ratio=visible/denominator;
 // Reopen only after most of the association area has returned into view.
 return previous?ratio<=.9:ratio<.25;
}
export function paneTitleOffset(start,end,visibleLeft,groupWidth){
 return Math.max(0,Math.min(visibleLeft-start,Math.max(0,end-start-groupWidth)));
}
