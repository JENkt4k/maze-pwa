export type MaskId='rectangle'|'ellipse'|'diamond'|'heart';
export const MASKS:Readonly<Record<MaskId,{id:MaskId;name:string}>>={rectangle:{id:'rectangle',name:'Rectangle'},ellipse:{id:'ellipse',name:'Ellipse'},diamond:{id:'diamond',name:'Diamond'},heart:{id:'heart',name:'Heart'}};
export function createMask(width:number,height:number,id:MaskId):boolean[][]{
  if(id==='rectangle') return Array.from({length:height},()=>Array(width).fill(true));
  const raw=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>{
    const nx=(x-(width-1)/2)/(width/2),ny=(y-(height-1)/2)/(height/2);
    if(id==='ellipse') return nx*nx+ny*ny<=1;
    if(id==='diamond') return Math.abs(nx)+Math.abs(ny)<=1;
    const hx=nx*1.15,hy=-ny*1.15+.2;
    return Math.pow(hx*hx+hy*hy-1,3)-hx*hx*hy*hy*hy<=0;
  }));
  const seen=new Set<string>(); let largest:[number,number][]=[];
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) if(raw[y][x]&&!seen.has(`${x},${y}`)){
    const group:[number,number][]=[[x,y]]; seen.add(`${x},${y}`);
    for(let i=0;i<group.length;i++) for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=group[i][0]+dx,ny=group[i][1]+dy,k=`${nx},${ny}`;
      if(nx>=0&&nx<width&&ny>=0&&ny<height&&raw[ny][nx]&&!seen.has(k)){seen.add(k);group.push([nx,ny]);}
    }
    if(group.length>largest.length) largest=group;
  }
  const connected=Array.from({length:height},()=>Array(width).fill(false));
  for(const [x,y] of largest) connected[y][x]=true;
  return connected;
}
