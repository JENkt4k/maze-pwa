import type { Cell } from '../app/maze';

export type WallStyle='classic'|'rounded'|'organic';
type Point={x:number;y:number};
type Edge={a:string;b:string};
const pointKey=(x:number,y:number)=>`${x},${y}`;
const edgeKey=(a:string,b:string)=>a<b?`${a}|${b}`:`${b}|${a}`;

export function wallSegments(maze:Cell[][],mask:boolean[][]):Edge[]{
  const height=maze.length,width=maze[0]?.length??0,edges=new Map<string,Edge>();
  const add=(x1:number,y1:number,x2:number,y2:number)=>{const a=pointKey(x1,y1),b=pointKey(x2,y2);edges.set(edgeKey(a,b),{a,b});};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y][x]){
    const cell=maze[y][x];
    if(cell.n)add(x,y,x+1,y);
    if(cell.w)add(x,y,x,y+1);
    if(cell.s&&(y===height-1||!mask[y+1][x]))add(x,y+1,x+1,y+1);
    if(cell.e&&(x===width-1||!mask[y][x+1]))add(x+1,y,x+1,y+1);
  }
  return [...edges.values()];
}

export function wallPaths(maze:Cell[][],mask:boolean[][]):Point[][]{
  const edges=wallSegments(maze,mask),adjacency=new Map<string,string[]>(),points=new Map<string,Point>();
  const remember=(id:string)=>{const [x,y]=id.split(',').map(Number);points.set(id,{x,y});};
  for(const {a,b} of edges){remember(a);remember(b);adjacency.set(a,[...(adjacency.get(a)??[]),b]);adjacency.set(b,[...(adjacency.get(b)??[]),a]);}
  const unused=new Set(edges.map(({a,b})=>edgeKey(a,b))),paths:Point[][]=[];
  const trace=(start:string,next:string)=>{
    const ids=[start,next];unused.delete(edgeKey(start,next));let previous=start,current=next;
    while((adjacency.get(current)?.length??0)===2){
      const candidate=adjacency.get(current)!.find(id=>id!==previous)!;
      if(!unused.has(edgeKey(current,candidate)))break;
      unused.delete(edgeKey(current,candidate));ids.push(candidate);previous=current;current=candidate;
    }
    paths.push(ids.map(id=>points.get(id)!));
  };
  for(const [start,neighbors] of adjacency)if(neighbors.length!==2)for(const next of neighbors)if(unused.has(edgeKey(start,next)))trace(start,next);
  while(unused.size){const encoded=unused.values().next().value as string;const [a,b]=encoded.split('|');trace(a,b);}
  return paths;
}

const fmt=(value:number)=>Number(value.toFixed(2));
export function pathData(points:Point[],cell:number,margin:number,radius:number):string{
  const px=(point:Point)=>({x:margin+point.x*cell,y:margin+point.y*cell});
  const list=points.map(px);if(list.length<2)return'';
  const corner=Math.max(0,Math.min(cell*.48,radius));
  let d=`M ${fmt(list[0].x)} ${fmt(list[0].y)}`;
  for(let i=1;i<list.length;i++){
    const current=list[i],previous=list[i-1],next=list[i+1];
    if(!next){d+=` L ${fmt(current.x)} ${fmt(current.y)}`;continue;}
    const before={x:current.x-Math.sign(current.x-previous.x)*corner,y:current.y-Math.sign(current.y-previous.y)*corner};
    const after={x:current.x+Math.sign(next.x-current.x)*corner,y:current.y+Math.sign(next.y-current.y)*corner};
    if((previous.x===current.x&&current.x===next.x)||(previous.y===current.y&&current.y===next.y)){d+=` L ${fmt(current.x)} ${fmt(current.y)}`;continue;}
    d+=` L ${fmt(before.x)} ${fmt(before.y)} Q ${fmt(current.x)} ${fmt(current.y)} ${fmt(after.x)} ${fmt(after.y)}`;
  }
  return d;
}
