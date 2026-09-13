export type WilsonEdge={from:number;to:number};

/** Deterministic Wilson loop-erased random walks over a connected adjacency list. */
export function wilsonTree(adjacency:readonly (readonly number[])[],rnd:()=>number,root=0):WilsonEdge[]{
  if(!adjacency.length)return[];
  const tree=new Set<number>([root]),unvisited=new Set(adjacency.map((_,index)=>index).filter(index=>index!==root)),edges:WilsonEdge[]=[];
  while(unvisited.size){
    const available=[...unvisited],start=available[Math.floor(rnd()*available.length)],walk=[start],position=new Map<number,number>([[start,0]]);
    while(!tree.has(walk[walk.length-1])){
      const current=walk[walk.length-1],neighbors=adjacency[current];
      if(!neighbors.length)throw new Error('Wilson generation requires a connected graph');
      const next=neighbors[Math.floor(rnd()*neighbors.length)],loop=position.get(next);
      if(loop!==undefined){for(const removed of walk.splice(loop+1))position.delete(removed);continue;}
      position.set(next,walk.length);walk.push(next);
    }
    for(let index=0;index<walk.length-1;index++){edges.push({from:walk[index],to:walk[index+1]});tree.add(walk[index]);unvisited.delete(walk[index]);}
  }
  return edges;
}
