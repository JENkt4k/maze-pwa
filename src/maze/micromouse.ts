import { requireNode, type MazeGraph, type NodeId } from './graph';

export type MousePhase='search'|'return'|'speed';
export type Heading='n'|'e'|'s'|'w';
export type WallKnowledge='unknown'|'open'|'blocked';
export type MousePhysics={cellMeters:number;maxSpeedMps:number;accelerationMps2:number;turn90Ms:number;collisionMs:number};
export type MouseEvent=
  | Readonly<{type:'phase';phase:MousePhase;node:NodeId;heading:Heading}>
  | Readonly<{type:'sense';phase:MousePhase;node:NodeId;heading:Heading;walls:Readonly<Record<Heading,Exclude<WallKnowledge,'unknown'>>>}>
  | Readonly<{type:'move';phase:MousePhase;from:NodeId;node:NodeId;heading:Heading}>;
export type PhaseMetrics={cells:number;turns:number;timeMs:number};
export type MicromouseMetrics={search:PhaseMetrics;return:PhaseMetrics;speed:PhaseMetrics;totalTimeMs:number;uniqueCells:number;revisits:number;exploredPercent:number;speedRouteQuality:number;collisions:number};
export type MicromouseResult=Readonly<{version:1;success:boolean;reason?:string;events:readonly MouseEvent[];metrics:MicromouseMetrics;routes:Readonly<Record<MousePhase,readonly NodeId[]>>}>;
export type KnowledgeMap=Map<NodeId,Record<Heading,WallKnowledge>>;

export const DEFAULT_MOUSE_PHYSICS:Readonly<MousePhysics>={cellMeters:.18,maxSpeedMps:1.5,accelerationMps2:4,turn90Ms:90,collisionMs:500};
const directions=[{heading:'n',dx:0,dy:-1},{heading:'e',dx:1,dy:0},{heading:'s',dx:0,dy:1},{heading:'w',dx:-1,dy:0}] as const;
const opposite:Record<Heading,Heading>={n:'s',e:'w',s:'n',w:'e'};
const headingIndex:Record<Heading,number>={n:0,e:1,s:2,w:3};
const idAt=(x:number,y:number)=>`${x},${y}`;
const blank=():Record<Heading,WallKnowledge>=>({n:'unknown',e:'unknown',s:'unknown',w:'unknown'});

function directionBetween(graph:MazeGraph,from:NodeId,to:NodeId):Heading{
  const a=requireNode(graph,from).position,b=requireNode(graph,to).position,dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);
  const direction=directions.find(item=>item.dx===dx&&item.dy===dy);if(!direction)throw new Error(`Micromouse requires cardinal grid edges: ${from} to ${to}`);return direction.heading;
}

export function applyKnowledge(events:readonly MouseEvent[],eventIndex=events.length):KnowledgeMap{
  const knowledge:KnowledgeMap=new Map();
  for(const event of events.slice(0,eventIndex))if(event.type==='sense'){
    const current=knowledge.get(event.node)??blank();knowledge.set(event.node,current);
    for(const direction of directions){
      current[direction.heading]=event.walls[direction.heading];
      const [x,y]=event.node.split(',').map(Number),neighbor=idAt(x+direction.dx,y+direction.dy);
      if(event.walls[direction.heading]==='open'){const other=knowledge.get(neighbor)??blank();other[opposite[direction.heading]]='open';knowledge.set(neighbor,other);}
    }
  }
  return knowledge;
}

export function floodDistances(graph:MazeGraph,knowledge:KnowledgeMap,target:NodeId,allowUnknown=true):Map<NodeId,number>{
  const distances=new Map<NodeId,number>([[target,0]]),queue=[target];
  for(let head=0;head<queue.length;head++){
    const current=queue[head],point=requireNode(graph,current).position;
    for(const direction of directions){
      const neighbor=idAt(point.x+direction.dx,point.y+direction.dy);if(!graph.nodes.has(neighbor)||distances.has(neighbor))continue;
      const a=knowledge.get(current)?.[direction.heading]??'unknown',b=knowledge.get(neighbor)?.[opposite[direction.heading]]??'unknown';
      if(a==='blocked'||b==='blocked'||(!allowUnknown&&(a!=='open'||b!=='open')))continue;
      distances.set(neighbor,distances.get(current)!+1);queue.push(neighbor);
    }
  }return distances;
}

function observe(graph:MazeGraph,node:NodeId,knowledge:KnowledgeMap):Record<Heading,Exclude<WallKnowledge,'unknown'>>{
  const current=requireNode(graph,node),walls={} as Record<Heading,Exclude<WallKnowledge,'unknown'>>;
  for(const direction of directions){const neighbor=idAt(current.position.x+direction.dx,current.position.y+direction.dy),value=current.neighbors.includes(neighbor)?'open':'blocked';walls[direction.heading]=value;const known=knowledge.get(node)??blank();known[direction.heading]=value;knowledge.set(node,known);if(value==='open'){const other=knowledge.get(neighbor)??blank();other[opposite[direction.heading]]='open';knowledge.set(neighbor,other);}}
  return walls;
}

function chooseMove(graph:MazeGraph,current:NodeId,target:NodeId,heading:Heading,knowledge:KnowledgeMap,visits:ReadonlyMap<NodeId,number>):{node:NodeId;heading:Heading}|null{
  const distances=floodDistances(graph,knowledge,target),point=requireNode(graph,current).position;
  const choices=directions.flatMap((direction,index)=>{
    if(knowledge.get(current)?.[direction.heading]!=='open')return[];
    const node=idAt(point.x+direction.dx,point.y+direction.dy),distance=distances.get(node);if(distance===undefined)return[];
    return[{node,heading:direction.heading,distance,visited:visits.get(node)??0,straight:direction.heading===heading?0:1,order:index}];
  }).sort((a,b)=>a.distance-b.distance||a.visited-b.visited||a.straight-b.straight||a.order-b.order);
  return choices[0]??null;
}

function knownRoute(graph:MazeGraph,knowledge:KnowledgeMap,start:NodeId,goal:NodeId):NodeId[]{
  const parents=new Map<NodeId,NodeId|null>([[start,null]]),queue=[start];
  for(let head=0;head<queue.length&&!parents.has(goal);head++){
    const current=queue[head],point=requireNode(graph,current).position;
    for(const direction of directions){if(knowledge.get(current)?.[direction.heading]!=='open')continue;const next=idAt(point.x+direction.dx,point.y+direction.dy);if(graph.nodes.has(next)&&!parents.has(next)){parents.set(next,current);queue.push(next);}}
  }
  if(!parents.has(goal))return[];const path:NodeId[]=[];for(let current:NodeId|null=goal;current;current=parents.get(current)??null)path.push(current);return path.reverse();
}

function trueShortest(graph:MazeGraph):number{
  const seen=new Map<NodeId,number>([[graph.start,0]]),queue=[graph.start];for(let i=0;i<queue.length;i++){const current=queue[i];if(graph.goals.includes(current))return seen.get(current)!;for(const next of requireNode(graph,current).neighbors)if(!seen.has(next)){seen.set(next,seen.get(current)!+1);queue.push(next);}}return Infinity;
}

function turnSteps(a:Heading,b:Heading){const delta=Math.abs(headingIndex[a]-headingIndex[b]);return Math.min(delta,4-delta);}
function routeMetrics(graph:MazeGraph,route:readonly NodeId[],initial:Heading,physics:MousePhysics):PhaseMetrics{
  if(route.length<2)return{cells:0,turns:0,timeMs:0};
  const headings=route.slice(1).map((node,index)=>directionBetween(graph,route[index],node));let turns=turnSteps(initial,headings[0]),timeMs=turns*physics.turn90Ms;
  for(let start=0;start<headings.length;){let end=start+1;while(end<headings.length&&headings[end]===headings[start])end++;const cells=end-start,distance=cells*physics.cellMeters,threshold=physics.maxSpeedMps**2/physics.accelerationMps2;
    timeMs+=distance>=threshold?(2*physics.maxSpeedMps/physics.accelerationMps2+(distance-threshold)/physics.maxSpeedMps)*1000:2*Math.sqrt(distance/physics.accelerationMps2)*1000;
    if(end<headings.length){const steps=turnSteps(headings[end-1],headings[end]);turns+=steps;timeMs+=steps*physics.turn90Ms;}start=end;
  }return{cells:route.length-1,turns,timeMs:Math.round(timeMs)};
}

export function simulateMicromouse(graph:MazeGraph,physics:MousePhysics=DEFAULT_MOUSE_PHYSICS):MicromouseResult{
  if(graph.goals.length!==1)throw new Error('Micromouse requires one goal');
  for(const node of graph.nodes.values()){if(!Number.isInteger(node.position.x)||!Number.isInteger(node.position.y))throw new Error('Micromouse requires grid topology');for(const neighbor of node.neighbors)directionBetween(graph,node.id,neighbor);}
  const events:MouseEvent[]=[],knowledge:KnowledgeMap=new Map(),visits=new Map<NodeId,number>([[graph.start,1]]),routes:{search:NodeId[];return:NodeId[];speed:NodeId[]}={search:[graph.start],return:[],speed:[]};
  let current=graph.start,heading:Heading='n',failure:string|undefined;
  const explore=(phase:'search'|'return',target:NodeId,route:NodeId[])=>{
    events.push({type:'phase',phase,node:current,heading});if(!route.length)route.push(current);
    const limit=Math.max(16,graph.nodes.size*8);
    for(let step=0;current!==target&&step<limit;step++){
      const walls=observe(graph,current,knowledge);events.push({type:'sense',phase,node:current,heading,walls});
      const next=chooseMove(graph,current,target,heading,knowledge,visits);if(!next){failure=`No route to ${target} using discovered walls`;return false;}
      events.push({type:'move',phase,from:current,node:next.node,heading:next.heading});current=next.node;heading=next.heading;route.push(current);visits.set(current,(visits.get(current)??0)+1);
    }
    const walls=observe(graph,current,knowledge);events.push({type:'sense',phase,node:current,heading,walls});if(current!==target){failure=`${phase} exceeded ${limit} steps`;return false;}return true;
  };
  const searched=explore('search',graph.goals[0],routes.search);if(searched){routes.return=[current];explore('return',graph.start,routes.return);}
  if(!failure){routes.speed=knownRoute(graph,knowledge,graph.start,graph.goals[0]);if(!routes.speed.length)failure='No fully discovered speed route';else{current=graph.start;events.push({type:'phase',phase:'speed',node:current,heading});for(const node of routes.speed.slice(1)){const nextHeading=directionBetween(graph,current,node);events.push({type:'move',phase:'speed',from:current,node,heading:nextHeading});current=node;heading=nextHeading;}}}
  const endHeading=(route:readonly NodeId[],fallback:Heading):Heading=>route.length>1?directionBetween(graph,route[route.length-2],route[route.length-1]):fallback;
  const search=routeMetrics(graph,routes.search,'n',physics),searchHeading=endHeading(routes.search,'n'),returnMetrics=routeMetrics(graph,routes.return,searchHeading,physics),returnHeading=endHeading(routes.return,searchHeading),speed=routeMetrics(graph,routes.speed,returnHeading,physics);
  const totalMoves=routes.search.length+routes.return.length+routes.speed.length-3,unique=new Set([...routes.search,...routes.return,...routes.speed]).size,revisits=Math.max(0,totalMoves+1-unique),shortest=trueShortest(graph);
  const metrics:MicromouseMetrics={search,return:returnMetrics,speed,totalTimeMs:search.timeMs+returnMetrics.timeMs+speed.timeMs,uniqueCells:unique,revisits,exploredPercent:+(unique/graph.nodes.size*100).toFixed(1),speedRouteQuality:Number.isFinite(shortest)&&shortest?+(speed.cells/shortest).toFixed(3):1,collisions:0};
  return{version:1,success:!failure,reason:failure,events,metrics,routes};
}
