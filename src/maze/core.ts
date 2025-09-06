export type MazeParams = { width:number; height:number; seed:number; g:number; b:number; tau:number };
export type CarveStep = { x:number; y:number; nx:number; ny:number };
export type Stats = { L:number; T:number; J:number; E:number; D:number };

export type MazeData = {
  cells: /* your cell type */ any;
  start: {x:number;y:number};
  goal:  {x:number;y:number};
  steps: CarveStep[];      // DFS carve order
  stats: Stats;
};

export function generateMaze(params: MazeParams): MazeData;
