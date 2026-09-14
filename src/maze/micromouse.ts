import { requireNode, type MazeGraph, type NodeId } from './graph';

export type MousePhase='search'|'return'|'speed';
export type MouseStrategyId='flood-fill'|'tremaux'|'right-wall';
export type Heading='n'|'e'|'s'|'w';
export type WallKnowledge='unknown'|'open'|'blocked';
export type MousePhysics={cellMeters:number;maxSpeedMps:number;accelerationMps2:number;turn90Ms:number;collisionMs:number};
export type MouseRealism={sensorRangeCells:number;sensorNoise:number;correctionMs:number;collisionMs:number;diagonalSpeedRuns:boolean;tractionLimitMps2:number};
export type MouseEvent=
  | Readonly<{type:'phase';phase:MousePhase;node:NodeId;heading:Heading}>
  | Readonly<{type:'sense';phase:MousePhase;node:NodeId;heading:Heading;walls:Readonly<Record<Heading,Exclude<WallKnowledge,'unknown'>>>;observations?:readonly Readonly<{node:NodeId;heading:Heading;value:Exclude<WallKnowledge,'unknown'>}>[]}>
  | Readonly<{type:'move';phase:MousePhase;from:NodeId;node:NodeId;heading:Heading}>
  | Readonly<{type:'collision';phase:MousePhase;node:NodeId;heading:Heading}>;
export type PhaseMetrics={cells:number;turns:number;timeMs:number};
export type MicromouseMetrics={search:PhaseMetrics;return:PhaseMetrics;speed:PhaseMetrics;totalTimeMs:number;uniqueCells:number;revisits:number;exploredPercent:number;speedRouteQuality:number;speedDistanceCells:number;speedDiagonalCuts:number;effectiveAccelerationMps2:number;collisions:number};
export type MicromouseResult=Readonly<{version:1;success:boolean;reason?:string;events:readonly MouseEvent[];metrics:MicromouseMetrics;routes:Readonly<Record<MousePhase,readonly NodeId[]>>}>;
export type MicromouseComparison=Readonly<{strategy:MouseStrategyId;success:boolean;metrics:MicromouseMetrics}>;
export type KnowledgeMap=Map<NodeId,Record<Heading,WallKnowledge>>;

export const DEFAULT_MOUSE_PHYSICS:Readonly<MousePhysics>={cellMeters:.18,maxSpeedMps:1.5,accelerationMps2:4,turn90Ms:90,collisionMs:500};
export const DEFAULT_MOUSE_REALISM:Readonly<MouseRealism>={sensorRangeCells:1,sensorNoise:0,correctionMs:0,collisionMs:500,diagonalSpeedRuns:false,tractionLimitMps2:20};
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
    const observations=event.observations??directions.map(direction=>({node:event.node,heading:direction.heading,value:event.walls[direction.heading]}));
    for(const observation of observations){
      const current=knowledge.get(observation.node)??blank();current[observation.heading]=observation.value;knowledge.set(observation.node,current);
      const direction=directions.find(item=>item.heading===observation.heading)!,[x,y]=observation.node.split(',').map(Number),neighbor=idAt(x+direction.dx,y+direction.dy);
      if(observation.value==='open'){const other=knowledge.get(neighbor)??blank();other[opposite[observation.heading]]='open';knowledge.set(neighbor,other);}
    }
  }
  return knowledge;
}

export function floodDistances(graph:MazeGraph,knowledge:KnowledgeMap,target:NodeId|readonly NodeId[],allowUnknown=true):Map<NodeId,number>{
  const targets=Array.isArray(target)?target:[target],distances=new Map<NodeId,number>(targets.map(id=>[id,0])),queue=[...targets];
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

function observe(graph:MazeGraph,node:NodeId,knowledge:KnowledgeMap,realism:MouseRealism,random:()=>number){
  const current=requireNode(graph,node),walls={} as Record<Heading,Exclude<WallKnowledge,'unknown'>>,observations:{node:NodeId;heading:Heading;value:Exclude<WallKnowledge,'unknown'>}[]=[];
  for(const direction of directions){let cursor=current.id;for(let distance=0;distance<realism.sensorRangeCells;distance++){const point=requireNode(graph,cursor).position,neighbor=idAt(point.x+direction.dx,point.y+direction.dy),actual=requireNode(graph,cursor).neighbors.includes(neighbor)?'open':'blocked',value=random()<realism.sensorNoise?(actual==='open'?'blocked':'open'):actual;observations.push({node:cursor,heading:direction.heading,value});const known=knowledge.get(cursor)??blank();known[direction.heading]=value;knowledge.set(cursor,known);if(cursor===node)walls[direction.heading]=value;if(value==='open'&&graph.nodes.has(neighbor)){const other=knowledge.get(neighbor)??blank();other[opposite[direction.heading]]='open';knowledge.set(neighbor,other);}if(value==='blocked'||actual==='blocked'||!graph.nodes.has(neighbor))break;cursor=neighbor;}}
  return{walls,observations};
}

function chooseMove(graph:MazeGraph,current:NodeId,target:NodeId|readonly NodeId[],heading:Heading,knowledge:KnowledgeMap,visits:ReadonlyMap<NodeId,number>,strategy:MouseStrategyId):{node:NodeId;heading:Heading}|null{
  const distances=floodDistances(graph,knowledge,target),point=requireNode(graph,current).position;
  const choices=directions.flatMap((direction,index)=>{
    if(knowledge.get(current)?.[direction.heading]!=='open')return[];
    const node=idAt(point.x+direction.dx,point.y+direction.dy),distance=distances.get(node);if(distance===undefined)return[];
    const delta=(headingIndex[direction.heading]-headingIndex[heading]+4)%4,rightRank=delta===1?0:delta===0?1:delta===3?2:3;
    return[{node,heading:direction.heading,distance,visited:visits.get(node)??0,straight:direction.heading===heading?0:1,rightRank,order:index}];
  }).sort((a,b)=>strategy==='right-wall'?a.rightRank-b.rightRank||a.visited-b.visited:strategy==='tremaux'?a.visited-b.visited||a.distance-b.distance||a.straight-b.straight:a.distance-b.distance||a.visited-b.visited||a.straight-b.straight||a.order-b.order);
  return choices[0]??null;
}

function knownRoute(graph:MazeGraph,knowledge:KnowledgeMap,start:NodeId,goals:readonly NodeId[]):NodeId[]{
  const parents=new Map<NodeId,NodeId|null>([[start,null]]),queue=[start];
  let goal=goals.find(id=>parents.has(id));
  for(let head=0;head<queue.length&&!goal;head++){
    const current=queue[head],point=requireNode(graph,current).position;
    for(const direction of directions){if(knowledge.get(current)?.[direction.heading]!=='open')continue;const next=idAt(point.x+direction.dx,point.y+direction.dy);if(graph.nodes.has(next)&&!parents.has(next)){parents.set(next,current);queue.push(next);}}
    goal=goals.find(id=>parents.has(id));
  }
  if(!goal)return[];const path:NodeId[]=[];for(let current:NodeId|null=goal;current;current=parents.get(current)??null)path.push(current);return path.reverse();
}

function trueShortest(graph:MazeGraph):number{
  const seen=new Map<NodeId,number>([[graph.start,0]]),queue=[graph.start];for(let i=0;i<queue.length;i++){const current=queue[i];if(graph.goals.includes(current))return seen.get(current)!;for(const next of requireNode(graph,current).neighbors)if(!seen.has(next)){seen.set(next,seen.get(current)!+1);queue.push(next);}}return Infinity;
}

function turnSteps(a:Heading,b:Heading){const delta=Math.abs(headingIndex[a]-headingIndex[b]);return Math.min(delta,4-delta);}
function routeMetrics(graph:MazeGraph,route:readonly NodeId[],initial:Heading,physics:MousePhysics,correctionMs=0):PhaseMetrics{
  if(route.length<2)return{cells:0,turns:0,timeMs:0};
  const headings=route.slice(1).map((node,index)=>directionBetween(graph,route[index],node));let turns=turnSteps(initial,headings[0]),timeMs=turns*physics.turn90Ms;
  for(let start=0;start<headings.length;){let end=start+1;while(end<headings.length&&headings[end]===headings[start])end++;const cells=end-start,distance=cells*physics.cellMeters,threshold=physics.maxSpeedMps**2/physics.accelerationMps2;
    timeMs+=distance>=threshold?(2*physics.maxSpeedMps/physics.accelerationMps2+(distance-threshold)/physics.maxSpeedMps)*1000:2*Math.sqrt(distance/physics.accelerationMps2)*1000;
    if(end<headings.length){const steps=turnSteps(headings[end-1],headings[end]);turns+=steps;timeMs+=steps*physics.turn90Ms;}start=end;
  }return{cells:route.length-1,turns,timeMs:Math.round(timeMs+(route.length-1)*correctionMs)};
}

function diagonalRouteMetrics(graph:MazeGraph,route:readonly NodeId[],initial:Heading,physics:MousePhysics,correctionMs=0):PhaseMetrics&{distanceCells:number;diagonalCuts:number}{
  if(route.length<2)return{cells:0,turns:0,timeMs:0,distanceCells:0,diagonalCuts:0};
  const headings=route.slice(1).map((node,index)=>directionBetween(graph,route[index],node)),initialTurns=turnSteps(initial,headings[0]);let turns=initialTurns,diagonalCuts=0,turnTime=initialTurns*physics.turn90Ms;
  for(let index=1;index<headings.length;index++){const steps=turnSteps(headings[index-1],headings[index]);turns+=steps;if(steps===1){diagonalCuts++;turnTime+=physics.turn90Ms*.35;}else turnTime+=steps*physics.turn90Ms;}
  const cells=route.length-1,distanceCells=cells-diagonalCuts*(1-Math.SQRT1_2),distance=distanceCells*physics.cellMeters,threshold=physics.maxSpeedMps**2/physics.accelerationMps2,motionMs=(distance>=threshold?2*physics.maxSpeedMps/physics.accelerationMps2+(distance-threshold)/physics.maxSpeedMps:2*Math.sqrt(distance/physics.accelerationMps2))*1000;
  return{cells,turns,timeMs:Math.round(motionMs+turnTime+cells*correctionMs),distanceCells:+distanceCells.toFixed(3),diagonalCuts};
}

export function simulateMicromouse(graph:MazeGraph,physics:MousePhysics=DEFAULT_MOUSE_PHYSICS,strategy:MouseStrategyId='flood-fill',realism:MouseRealism=DEFAULT_MOUSE_REALISM,sensorSeed=0):MicromouseResult{
  if(!graph.goals.length)throw new Error('Micromouse requires at least one goal');
  for(const goal of graph.goals)requireNode(graph,goal);
  for(const node of graph.nodes.values()){if(!Number.isInteger(node.position.x)||!Number.isInteger(node.position.y))throw new Error('Micromouse requires grid topology');for(const neighbor of node.neighbors)directionBetween(graph,node.id,neighbor);}
  const events:MouseEvent[]=[],knowledge:KnowledgeMap=new Map(),visits=new Map<NodeId,number>([[graph.start,1]]),routes:{search:NodeId[];return:NodeId[];speed:NodeId[]}={search:[graph.start],return:[],speed:[]},collisionCounts:{search:number;return:number;speed:number}={search:0,return:0,speed:0};
  let randomState=sensorSeed|0;const random=()=>{randomState|=0;randomState=randomState+0x6D2B79F5|0;let value=Math.imul(randomState^randomState>>>15,1|randomState);value=value+Math.imul(value^value>>>7,61|value)^value;return((value^value>>>14)>>>0)/4294967296;};
  let current=graph.start,heading:Heading='n',failure:string|undefined;
  const explore=(phase:'search'|'return',target:NodeId|readonly NodeId[],route:NodeId[])=>{
    const targets=Array.isArray(target)?target:[target];
    events.push({type:'phase',phase,node:current,heading});if(!route.length)route.push(current);
    const limit=Math.max(16,graph.nodes.size*8);
    for(let step=0;!targets.includes(current)&&step<limit;step++){
      const sensed=observe(graph,current,knowledge,realism,random);events.push({type:'sense',phase,node:current,heading,walls:sensed.walls,observations:sensed.observations});
      const next=chooseMove(graph,current,target,heading,knowledge,visits,strategy);if(!next)continue;
      if(!requireNode(graph,current).neighbors.includes(next.node)){const known=knowledge.get(current)??blank();known[next.heading]='blocked';knowledge.set(current,known);events.push({type:'collision',phase,node:current,heading:next.heading});collisionCounts[phase]++;heading=next.heading;continue;}
      events.push({type:'move',phase,from:current,node:next.node,heading:next.heading});current=next.node;heading=next.heading;route.push(current);visits.set(current,(visits.get(current)??0)+1);
    }
    const sensed=observe(graph,current,knowledge,realism,random);events.push({type:'sense',phase,node:current,heading,walls:sensed.walls,observations:sensed.observations});if(!targets.includes(current)){failure=`${phase} exceeded ${limit} steps`;return false;}return true;
  };
  const searched=explore('search',graph.goals,routes.search);if(searched){routes.return=[current];explore('return',graph.start,routes.return);}
  if(!failure){routes.speed=knownRoute(graph,knowledge,graph.start,graph.goals);if(!routes.speed.length)failure='No fully discovered speed route';else{current=graph.start;events.push({type:'phase',phase:'speed',node:current,heading});for(const node of routes.speed.slice(1)){const nextHeading=directionBetween(graph,current,node);events.push({type:'move',phase:'speed',from:current,node,heading:nextHeading});current=node;heading=nextHeading;}}}
  const endHeading=(route:readonly NodeId[],fallback:Heading):Heading=>route.length>1?directionBetween(graph,route[route.length-2],route[route.length-1]):fallback;
  const effectivePhysics={...physics,accelerationMps2:Math.min(physics.accelerationMps2,realism.tractionLimitMps2)},addCollisions=(metrics:PhaseMetrics,phase:MousePhase):PhaseMetrics=>({...metrics,timeMs:metrics.timeMs+collisionCounts[phase]*realism.collisionMs});
  const search=addCollisions(routeMetrics(graph,routes.search,'n',effectivePhysics,realism.correctionMs),'search'),searchHeading=endHeading(routes.search,'n'),returnMetrics=addCollisions(routeMetrics(graph,routes.return,searchHeading,effectivePhysics,realism.correctionMs),'return'),returnHeading=endHeading(routes.return,searchHeading),diagonalSpeed=realism.diagonalSpeedRuns?diagonalRouteMetrics(graph,routes.speed,returnHeading,effectivePhysics,realism.correctionMs):null,speed=addCollisions(diagonalSpeed??routeMetrics(graph,routes.speed,returnHeading,effectivePhysics,realism.correctionMs),'speed');
  const totalMoves=routes.search.length+routes.return.length+routes.speed.length-3,unique=new Set([...routes.search,...routes.return,...routes.speed]).size,revisits=Math.max(0,totalMoves+1-unique),shortest=trueShortest(graph);
  const metrics:MicromouseMetrics={search,return:returnMetrics,speed,totalTimeMs:search.timeMs+returnMetrics.timeMs+speed.timeMs,uniqueCells:unique,revisits,exploredPercent:+(unique/graph.nodes.size*100).toFixed(1),speedRouteQuality:Number.isFinite(shortest)&&shortest?+(speed.cells/shortest).toFixed(3):1,speedDistanceCells:diagonalSpeed?.distanceCells??speed.cells,speedDiagonalCuts:diagonalSpeed?.diagonalCuts??0,effectiveAccelerationMps2:effectivePhysics.accelerationMps2,collisions:collisionCounts.search+collisionCounts.return+collisionCounts.speed};
  return{version:1,success:!failure,reason:failure,events,metrics,routes};
}

export function compareMicromouseStrategies(graph:MazeGraph,physics:MousePhysics=DEFAULT_MOUSE_PHYSICS,realism:MouseRealism=DEFAULT_MOUSE_REALISM,sensorSeed=0):readonly MicromouseComparison[]{
  return(['flood-fill','tremaux','right-wall'] as const).map(strategy=>{const result=simulateMicromouse(graph,physics,strategy,realism,sensorSeed);return{strategy,success:result.success,metrics:result.metrics};});
}
