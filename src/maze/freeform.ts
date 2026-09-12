import { Delaunay } from 'd3-delaunay';
import type { Cell, CarveStep, GeneratorId, GeometrySegment, MazeParams, MazePoint, MazeResult, Stats } from '../app/maze';
import type { MazeGraph, MazeNode, NodeId } from './graph';
import { createMask } from './masks';

type Site={id:NodeId;x:number;y:number};
type Edge={a:number;b:number};
const edgeKey=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
const pointKey=(x:number,y:number)=>`${x.toFixed(5)},${y.toFixed(5)}`;

function random(seed:number){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^(t>>>15),1|t);r^=r+Math.imul(r^(r>>>7),61|r);return((r^(r>>>14))>>>0)/4294967296;};}
function shuffle<T>(values:T[],rnd:()=>number){for(let i=values.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;}
function distance(a:MazePoint,b:MazePoint){return Math.hypot(a.x-b.x,a.y-b.y);}

function sitesFor(mask:boolean[][],seed:number,density:number,irregularity:number):Site[]{
  const rnd=random(seed^0x51f15e),active=mask.flatMap((row,y)=>row.flatMap((on,x)=>on?[{x,y}]:[]));
  const target=Math.max(4,Math.min(active.length,Math.round(active.length*density)));
  return shuffle([...active],rnd).slice(0,target).map((cell,index)=>{
    const amount=.46*irregularity;
    return{id:`f:${index}`,x:cell.x+.5+(rnd()-.5)*2*amount,y:cell.y+.5+(rnd()-.5)*2*amount};
  });
}

function candidateEdges(delaunay:Delaunay<Site>,sites:Site[],mask:boolean[][]):Edge[]{
  const inside=(x:number,y:number)=>{const ix=Math.floor(x),iy=Math.floor(y);return iy>=0&&iy<mask.length&&ix>=0&&ix<(mask[0]?.length??0)&&mask[iy][ix];};
  const clear=(a:Site,b:Site)=>{for(let step=1;step<8;step++){const t=step/8;if(!inside(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}return true;};
  const edges:Edge[]=[];
  for(let a=0;a<sites.length;a++)for(const b of delaunay.neighbors(a))if(a<b&&clear(sites[a],sites[b]))edges.push({a,b});
  return edges;
}

function largestComponent(sites:Site[],edges:Edge[]):{sites:Site[];edges:Edge[]}{
  if(!sites.length)return{sites,edges};
  const adjacency=Array.from({length:sites.length},()=>[] as number[]);
  for(const edge of edges){adjacency[edge.a].push(edge.b);adjacency[edge.b].push(edge.a);}
  let largest:number[]=[];const visited=new Set<number>();
  for(let root=0;root<sites.length;root++)if(!visited.has(root)){const group=[root];visited.add(root);for(let i=0;i<group.length;i++)for(const next of adjacency[group[i]])if(!visited.has(next)){visited.add(next);group.push(next);}if(group.length>largest.length)largest=group;}
  const remap=new Map(largest.map((old,index)=>[old,index]));
  return{sites:largest.map((old,index)=>({...sites[old],id:`f:${index}`})),edges:edges.flatMap(edge=>remap.has(edge.a)&&remap.has(edge.b)?[{a:remap.get(edge.a)!,b:remap.get(edge.b)!}]:[])};
}

function spanningEdges(sites:Site[],edges:Edge[],generator:GeneratorId,rnd:()=>number,g:number,tau:number):Edge[]{
  const adjacency=Array.from({length:sites.length},()=>[] as Edge[]);for(const edge of edges){adjacency[edge.a].push(edge);adjacency[edge.b].push(edge);}
  if(generator==='kruskal'){
    const parent=sites.map((_,i)=>i),root=(i:number):number=>parent[i]===i?i:(parent[i]=root(parent[i]));
    const tree:Edge[]=[];for(const edge of shuffle([...edges],rnd)){const a=root(edge.a),b=root(edge.b);if(a===b)continue;parent[a]=b;tree.push(edge);}return tree;
  }
  const seen=new Set<number>([0]),tree:Edge[]=[];
  if(generator==='prim'){
    const frontier=[...adjacency[0]];while(frontier.length){const index=Math.floor(rnd()*frontier.length),edge=frontier.splice(index,1)[0],next=seen.has(edge.a)?edge.b:edge.a;if(seen.has(next))continue;seen.add(next);tree.push(edge);frontier.push(...adjacency[next]);}return tree;
  }
  const target=sites.reduce((best,site,index)=>site.x>sites[best].x?index:best,0),stack=[{node:0,previous:-1}];
  while(stack.length){
    const frame=stack[stack.length-1],current=frame.node,choices=adjacency[current].filter(edge=>!seen.has(edge.a===current?edge.b:edge.a));if(!choices.length){stack.pop();continue;}
    const baseDistance=distance(sites[current],sites[target]),previous=frame.previous<0?null:{x:sites[current].x-sites[frame.previous].x,y:sites[current].y-sites[frame.previous].y};
    const weighted=choices.map(edge=>{const next=edge.a===current?edge.b:edge.a,vector={x:sites[next].x-sites[current].x,y:sites[next].y-sites[current].y},toward=distance(sites[next],sites[target])<baseDistance?g:0,alignment=previous?(previous.x*vector.x+previous.y*vector.y)/(Math.hypot(previous.x,previous.y)*Math.hypot(vector.x,vector.y)):0;return{edge,next,weight:1+toward+(alignment>.7?tau:0)};});
    let pick=rnd()*weighted.reduce((sum,item)=>sum+item.weight,0),chosen=weighted[weighted.length-1];for(const item of weighted){pick-=item.weight;if(pick<=0){chosen=item;break;}}
    seen.add(chosen.next);tree.push(chosen.edge);stack.push({node:chosen.next,previous:current});
  }return tree;
}

function graphFor(sites:Site[],passages:Edge[],start:number,goal:number):MazeGraph{
  const neighbors=Array.from({length:sites.length},()=>[] as NodeId[]);for(const edge of passages){neighbors[edge.a].push(sites[edge.b].id);neighbors[edge.b].push(sites[edge.a].id);}
  const nodes=new Map<NodeId,MazeNode>(sites.map((site,index)=>[site.id,{id:site.id,position:{x:site.x,y:site.y},neighbors:neighbors[index]}]));
  return{nodes,start:sites[start].id,goals:[sites[goal].id]};
}

function graphDistances(graph:MazeGraph,start:NodeId){const distances=new Map<NodeId,number>([[start,0]]),queue=[start];for(let i=0;i<queue.length;i++)for(const next of graph.nodes.get(queue[i])!.neighbors)if(!distances.has(next)){distances.set(next,distances.get(queue[i])!+1);queue.push(next);}return{distances,queue};}
function statsFor(graph:MazeGraph):Stats{
  const parents=new Map<NodeId,NodeId|null>([[graph.start,null]]),queue=[graph.start];
  for(let i=0;i<queue.length&&!parents.has(graph.goals[0]);i++)for(const next of graph.nodes.get(queue[i])!.neighbors)if(!parents.has(next)){parents.set(next,queue[i]);queue.push(next);}
  const path:NodeId[]=[];for(let current:NodeId|null=graph.goals[0];current;current=parents.get(current)??null)path.push(current);path.reverse();
  const L=Math.max(0,path.length-1);let turns=0;
  for(let i=2;i<path.length;i++){const a=graph.nodes.get(path[i-2])!.position,b=graph.nodes.get(path[i-1])!.position,c=graph.nodes.get(path[i])!.position,ab=Math.atan2(b.y-a.y,b.x-a.x),bc=Math.atan2(c.y-b.y,c.x-b.x),delta=Math.abs(Math.atan2(Math.sin(bc-ab),Math.cos(bc-ab)));if(delta>.15)turns++;}
  let J=0,E=0;for(const node of graph.nodes.values()){if(node.neighbors.length===1)E++;if(node.neighbors.length>=3)J++;}
  const count=Math.max(1,graph.nodes.size),T=L>1?turns/(L-1):0,D=L===0?0:.7*Math.log2(L+1)+.8*T+.5*J/count+.3*E/count;
  return{L,T,J,E,D:+D.toFixed(3)};
}

function clippedWalls(delaunay:Delaunay<Site>,sites:Site[],passages:Edge[],width:number,height:number):GeometrySegment[]{
  const voronoi=delaunay.voronoi([0,0,width,height]),owners=new Map<string,{segment:GeometrySegment;cells:number[]}>();
  for(let cell=0;cell<sites.length;cell++){
    const polygon=voronoi.cellPolygon(cell);if(!polygon)continue;
    for(let i=0;i<polygon.length-1;i++){
      const [x1,y1]=polygon[i],[x2,y2]=polygon[i+1],a=pointKey(x1,y1),b=pointKey(x2,y2),key=a<b?`${a}|${b}`:`${b}|${a}`;
      const item=owners.get(key);if(item)item.cells.push(cell);else owners.set(key,{segment:{x1,y1,x2,y2},cells:[cell]});
    }
  }
  const open=new Set(passages.map(edge=>edgeKey(edge.a,edge.b))),walls:GeometrySegment[]=[];
  for(const {segment,cells} of owners.values()){
    if(cells.length<2||!open.has(edgeKey(cells[0],cells[1]))){walls.push(segment);continue;}
    const dx=segment.x2-segment.x1,dy=segment.y2-segment.y1;
    walls.push({...segment,x2:segment.x1+dx*.3,y2:segment.y1+dy*.3},{...segment,x1:segment.x1+dx*.7,y1:segment.y1+dy*.7});
  }
  return walls;
}

function maskOutline(mask:boolean[][]):GeometrySegment[]{
  const result:GeometrySegment[]=[];for(let y=0;y<mask.length;y++)for(let x=0;x<(mask[0]?.length??0);x++)if(mask[y][x]){
    if(y===0||!mask[y-1][x])result.push({x1:x,y1:y,x2:x+1,y2:y});
    if(y===mask.length-1||!mask[y+1][x])result.push({x1:x,y1:y+1,x2:x+1,y2:y+1});
    if(x===0||!mask[y][x-1])result.push({x1:x,y1:y,x2:x,y2:y+1});
    if(x===mask[0].length-1||!mask[y][x+1])result.push({x1:x+1,y1:y,x2:x+1,y2:y+1});
  }return result;
}

export function createFreeformMaze(params:MazeParams):MazeResult{
  const {width,height,seed}=params,mask=createMask(width,height,params.mask??'rectangle',params.customMask),density=params.regionDensity??.38,irregularity=params.irregularity??.75;
  if(!Number.isFinite(density)||density<.15||density>1||!Number.isFinite(irregularity)||irregularity<0||irregularity>1)throw new RangeError('Invalid freeform controls');
  let sites=sitesFor(mask,seed,density,irregularity),delaunay=Delaunay.from(sites,site=>site.x,site=>site.y),edges=candidateEdges(delaunay,sites,mask);
  ({sites,edges}=largestComponent(sites,edges));delaunay=Delaunay.from(sites,site=>site.x,site=>site.y);
  const rnd=random(seed^0x7f4a7c15),tree=spanningEdges(sites,edges,params.generator??'dfs',rnd,params.g,params.tau),passages=[...tree],open=new Set(tree.map(edge=>edgeKey(edge.a,edge.b)));
  if((params.b??0)>0)for(const edge of shuffle([...edges],rnd))if(!open.has(edgeKey(edge.a,edge.b))&&rnd()<(params.b??0)*.18){open.add(edgeKey(edge.a,edge.b));passages.push(edge);}
  const left=sites.reduce((best,site,index)=>site.x<sites[best].x?index:best,0),preGraph=graphFor(sites,passages,left,left),reachable=graphDistances(preGraph,sites[left].id).queue,farthest=reachable[reachable.length-1],right=sites.findIndex(site=>site.id===farthest);
  const nearest=(requested:MazePoint|undefined,fallback:number,exclude=-1)=>requested?sites.reduce((best,site,index)=>index===exclude?best:distance(site,requested)<distance(sites[best],requested)?index:best,fallback):fallback;
  const startIndex=nearest(params.startCell,left),goalIndex=nearest(params.goalCell,right,startIndex),graph=graphFor(sites,passages,startIndex,goalIndex);
  const steps=(values:Edge[]):CarveStep[]=>values.map(edge=>({x:sites[edge.a].x,y:sites[edge.a].y,nx:sites[edge.b].x,ny:sites[edge.b].y}));
  const maze:Cell[][]=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>({x,y,n:1,s:1,e:1,w:1})));
  return{maze,mask,treeSteps:steps(tree),braidEdits:steps(passages.slice(tree.length)),start:{x:sites[startIndex].x,y:sites[startIndex].y},goal:{x:sites[goalIndex].x,y:sites[goalIndex].y},stats:statsFor(graph),topology:'freeform',graph,geometry:{width,height,walls:clippedWalls(delaunay,sites,passages,width,height),outline:maskOutline(mask)}};
}
