export type Measured<T>={value:T;durationMs:number};
export type MazePerformanceMetrics={cells:number;generationMs:number;graphMs:number;difficultyMs:number;identityMs:number;solverMs:number;svgMs:number};

export function measure<T>(work:()=>T):Measured<T>{
  const started=performance.now(),value=work();
  return{value,durationMs:Math.max(0,performance.now()-started)};
}

export const roundedCost=(value:number)=>Math.round(value*10)/10;
export const totalMazeCost=(metrics:MazePerformanceMetrics)=>roundedCost(metrics.generationMs+metrics.graphMs+metrics.difficultyMs+metrics.identityMs+metrics.solverMs+metrics.svgMs);
export const costRating=(milliseconds:number)=>milliseconds<=50?'Responsive':milliseconds<=150?'Moderate':'Heavy';
