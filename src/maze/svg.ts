export type SvgOpts = {
  cell:number; margin:number; stroke?:number;
  showStartGoal?:boolean; startIcon?:string; goalIcon?:string; iconScale?:number;
  // Animation (all optional)
  animate?: boolean;           // include the DFS path
  segMs?: number;              // ms per edge to compute total duration
  passageWidth?: number;       // animate stroke thickness (≈ cell - stroke)
  // Visibility
  hideWallsDuringAnim?: boolean; // if true, walls opacity 0 until animation ends
};

export function buildMazeSVG(data: MazeData, opts: SvgOpts): string;
