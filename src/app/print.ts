let printing=false;
export type PrintPackOptions={title:string;mazesPerPage:1|2;includeDetails:boolean};
export type PrintPackMaze={name:string;svg:string;details:string};
const escapeHTML=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

function printIframe(title:string,body:string,styles:string):void{
  if(printing||!body)return;printing=true;
  const iframe=document.createElement('iframe');Object.assign(iframe.style,{position:'fixed',width:'0',height:'0',border:'0'});iframe.title='Maze print preview';
  let printed=false,printWindow:Window|null=null;
  const done=()=>{printWindow?.removeEventListener('afterprint',done);window.clearTimeout(timeout);iframe.remove();printing=false;};
  const timeout=window.setTimeout(done,60000);
  iframe.onload=()=>{if(printed)return;printWindow=iframe.contentWindow;if(!printWindow){done();return;}printed=true;printWindow.addEventListener('afterprint',done,{once:true});try{printWindow.focus();printWindow.print();}catch{done();}};
  iframe.srcdoc=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHTML(title)}</title><style>${styles}</style></head><body>${body}</body></html>`;document.body.appendChild(iframe);
}

export function handlePrint(svg:string):void{
  if(printing||!svg)return;
  const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone;
  if(/iPad|iPhone|iPod/.test(navigator.userAgent)||standalone){printing=true;const done=()=>{printing=false;window.removeEventListener('afterprint',done);window.clearTimeout(timeout);};const timeout=window.setTimeout(done,60000);window.addEventListener('afterprint',done,{once:true});try{window.print();}catch{done();}return;}
  printIframe('Maze Print',svg,'body{margin:0}svg{width:100%;height:auto;max-height:95vh}@page{margin:10mm}');
}

export function handlePrintPack(mazes:PrintPackMaze[],options:PrintPackOptions):void{
  if(!mazes.length)return;const pages:Array<PrintPackMaze[]>=[];
  for(let index=0;index<mazes.length;index+=options.mazesPerPage)pages.push(mazes.slice(index,index+options.mazesPerPage));
  const body=pages.map((page,pageIndex)=>`<section class="page"><header><h1>${escapeHTML(options.title||'InfiMaze Pack')}</h1><span>${pageIndex+1} / ${pages.length}</span></header><main class="layout-${options.mazesPerPage}">${page.map(maze=>`<article><h2>${escapeHTML(maze.name)}</h2>${maze.svg}${options.includeDetails?`<p>${escapeHTML(maze.details)}</p>`:''}</article>`).join('')}</main></section>`).join('');
  printIframe(options.title||'InfiMaze Pack',body,'*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;color:#111}.page{height:calc(100vh - 2mm);break-after:page;display:flex;flex-direction:column}.page:last-child{break-after:auto}header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #bbb;margin-bottom:4mm}h1{font-size:18pt;margin:0 0 2mm}h2{font-size:12pt;margin:0 0 2mm;text-align:center}main{display:grid;gap:5mm;flex:1;min-height:0}.layout-1{grid-template-rows:1fr}.layout-2{grid-template-rows:repeat(2,minmax(0,1fr))}article{display:flex;flex-direction:column;min-height:0;break-inside:avoid}svg{width:100%;height:100%;min-height:0}p{font-size:8pt;color:#444;text-align:center;margin:2mm 0 0}@page{size:auto;margin:10mm}');
}
