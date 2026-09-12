import { requireNode, type MazeGraph, type NodeId } from '../graph';
import type { MazeGraphAnalysisContext } from './types';

function distances(adjacency:readonly (readonly number[])[],start:number):{distance:Int32Array;parent:Int32Array}{
  const distance=new Int32Array(adjacency.length).fill(-1),parent=new Int32Array(adjacency.length).fill(-1),queue=[start];distance[start]=0;parent[start]=start;
  for(let head=0;head<queue.length;head++){const current=queue[head];for(const next of adjacency[current])if(distance[next]===-1){distance[next]=distance[current]+1;parent[next]=current;queue.push(next);}}
  return{distance,parent};
}

export function createAnalysisContext(graph:MazeGraph):MazeGraphAnalysisContext{
  if(!graph.nodes.has(graph.start)||graph.goals.length!==1||!graph.nodes.has(graph.goals[0]))throw new Error('Difficulty analysis requires one valid goal');
  const reachable=new Set<NodeId>([graph.start]),queue=[graph.start];
  for(let head=0;head<queue.length;head++)for(const next of requireNode(graph,queue[head]).neighbors)if(graph.nodes.has(next)&&!reachable.has(next)){reachable.add(next);queue.push(next);}
  if(!reachable.has(graph.goals[0]))throw new Error('Maze goal is unreachable');
  const ids=[...reachable].sort(),indexById=new Map(ids.map((id,index)=>[id,index])),positions=ids.map(id=>requireNode(graph,id).position);
  const adjacency=ids.map(id=>requireNode(graph,id).neighbors.flatMap(next=>{const index=indexById.get(next);return index===undefined?[]:[index];}).sort((a,b)=>a-b));
  const degree=Uint8Array.from(adjacency.map(neighbors=>neighbors.length)),start=indexById.get(graph.start)!,goal=indexById.get(graph.goals[0])!;
  const fromStart=distances(adjacency,start),fromGoal=distances(adjacency,goal),shortestPath:number[]=[];
  for(let current=goal;;current=fromStart.parent[current]){shortestPath.push(current);if(current===start)break;if(current<0)throw new Error('Maze goal is unreachable');}
  shortestPath.reverse();
  return{ids,indexById,positions,adjacency,degree,start,goal,shortestPath,shortestPathSet:new Set(shortestPath),shortestDistanceFromStart:fromStart.distance,shortestDistanceToGoal:fromGoal.distance};
}
