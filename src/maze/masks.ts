export type MaskId='rectangle'|'ellipse'|'diamond'|'heart'|'star'|'cup'|'brain'|'moose'|'custom';
export type CustomMask={pixels:string;threshold:number;invert:boolean;name?:string};
export const CUSTOM_MASK_SIZE=41;
export const MASKS:Readonly<Record<MaskId,{id:MaskId;name:string}>>={
  rectangle:{id:'rectangle',name:'Rectangle'},ellipse:{id:'ellipse',name:'Ellipse'},diamond:{id:'diamond',name:'Diamond'},heart:{id:'heart',name:'Heart'},
  star:{id:'star',name:'Star'},cup:{id:'cup',name:'Cup'},brain:{id:'brain',name:'Brain'},moose:{id:'moose',name:'Moose'},custom:{id:'custom',name:'Custom image'},
};

export function encodeMaskPixels(values:Uint8ClampedArray):string{
  let binary=''; for(let i=0;i<values.length;i++) binary+=String.fromCharCode(values[i]);
  return btoa(binary);
}
function decodeMaskPixels(value:string):Uint8Array|null{
  try{const binary=atob(value);return binary.length===CUSTOM_MASK_SIZE**2?Uint8Array.from(binary,c=>c.charCodeAt(0)):null;}catch{return null;}
}

export function createMask(width:number,height:number,id:MaskId,custom?:CustomMask):boolean[][]{
  if(id==='rectangle') return Array.from({length:height},()=>Array(width).fill(true));
  const pixels=id==='custom'&&custom?decodeMaskPixels(custom.pixels):null;
  const raw=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>{
    const nx=(x-(width-1)/2)/(width/2),ny=(y-(height-1)/2)/(height/2);
    const ellipse=(cx:number,cy:number,rx:number,ry:number)=>Math.pow((nx-cx)/rx,2)+Math.pow((ny-cy)/ry,2)<=1;
    if(id==='ellipse') return ellipse(0,0,1,1);
    if(id==='diamond') return Math.abs(nx)+Math.abs(ny)<=1;
    if(id==='heart'){const hx=nx*1.15,hy=-ny*1.15+.2;return Math.pow(hx*hx+hy*hy-1,3)-hx*hx*hy*hy*hy<=0;}
    if(id==='star'){const angle=Math.atan2(ny,nx)-Math.PI/2;return Math.hypot(nx,ny)<=.52+.28*Math.cos(5*angle);}
    if(id==='cup') return (ny>-.55&&ny<.48&&nx>-.75&&nx<.48)||(nx>.32&&nx<.9&&ny>-.32&&ny<.3&&!(nx>.38&&nx<.7&&ny>-.16&&ny<.14))||(ny>.42&&ny<.68&&nx>-.5&&nx<.35);
    if(id==='brain') return ellipse(-.42,-.18,.48,.62)||ellipse(.08,-.38,.62,.45)||ellipse(.42,.02,.5,.62)||ellipse(-.1,.2,.75,.55)||ellipse(-.55,.3,.28,.35);
    if(id==='moose') return ellipse(.15,.08,.68,.42)||ellipse(-.58,-.08,.28,.3)||(nx>-.55&&nx>ny-1&&nx<-.3&&ny>-.08&&ny<.45)||(ny>.25&&ny<.82&&((nx>-.35&&nx<-.17)||(nx>.46&&nx<.64)))||(ny<-.22&&ny>-.75&&nx>-.82&&nx<-.25&&((nx>-.66&&nx<-.55)||(ny>-.48&&ny<-.38)||(nx>-.42&&nx<-.32)));
    if(pixels){const sx=Math.round(x/Math.max(1,width-1)*(CUSTOM_MASK_SIZE-1)),sy=Math.round(y/Math.max(1,height-1)*(CUSTOM_MASK_SIZE-1));const dark=pixels[sy*CUSTOM_MASK_SIZE+sx]<custom!.threshold;return custom!.invert?!dark:dark;}
    return true;
  }));
  return largestConnected(raw);
}

export function largestConnected(raw:boolean[][]):boolean[][]{
  const height=raw.length,width=raw[0]?.length??0,seen=new Set<string>();let largest:[number,number][]=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(raw[y][x]&&!seen.has(`${x},${y}`)){
    const group:[number,number][]=[[x,y]];seen.add(`${x},${y}`);
    for(let i=0;i<group.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=group[i][0]+dx,ny=group[i][1]+dy,k=`${nx},${ny}`;if(nx>=0&&nx<width&&ny>=0&&ny<height&&raw[ny][nx]&&!seen.has(k)){seen.add(k);group.push([nx,ny]);}}
    if(group.length>largest.length)largest=group;
  }
  const connected=Array.from({length:height},()=>Array(width).fill(false));
  for(const [x,y] of largest)connected[y][x]=true;
  if(!largest.length&&width&&height)connected[Math.floor(height/2)][Math.floor(width/2)]=true;
  return connected;
}
