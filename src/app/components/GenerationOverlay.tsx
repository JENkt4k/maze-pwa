import type { CarveStep } from '../maze';

type Props = {
  steps: readonly CarveStep[];
  eventIndex: number;
  cell: number;
  margin: number;
  stroke: number;
  widthCells: number;
  heightCells: number;
  complete: boolean;
  color: string;
  opacity: number;
  freeform?:boolean;
};

export default function GenerationOverlay({steps,eventIndex,cell,margin,stroke,widthCells,heightCells,complete,color,opacity,freeform}:Props){
  if(eventIndex===0) return null;
  const center=(n:number)=>margin+n*cell+(freeform?0:cell/2);
  const path=steps.slice(0,eventIndex).map(step=>`M ${center(step.x)} ${center(step.y)} L ${center(step.nx)} ${center(step.ny)}`).join(' ');
  return <svg className={`generation-overlay-svg${complete?' generation-complete':''}`}
    viewBox={`0 0 ${widthCells*cell+margin*2} ${heightCells*cell+margin*2}`} aria-hidden="true">
    <path d={path} fill="none" stroke={color} opacity={opacity} strokeWidth={Math.max(1,cell-stroke-1)} strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
