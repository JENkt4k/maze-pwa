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
};

export default function GenerationOverlay({steps,eventIndex,cell,margin,stroke,widthCells,heightCells,complete,color,opacity}:Props){
  if(eventIndex===0) return null;
  const center=(n:number)=>margin+n*cell+cell/2;
  return <svg className={`generation-overlay-svg${complete?' generation-complete':''}`}
    viewBox={`0 0 ${widthCells*cell+margin*2} ${heightCells*cell+margin*2}`} aria-hidden="true">
    <g>
      {steps.slice(0,eventIndex).map((step,index)=><path key={index}
        d={`M ${center(step.x)} ${center(step.y)} L ${center(step.nx)} ${center(step.ny)}`}
        fill="none" stroke={color} opacity={opacity} strokeWidth={Math.max(1,cell-stroke-1)} strokeLinecap="round" strokeLinejoin="round" />)}
    </g>
  </svg>;
}
