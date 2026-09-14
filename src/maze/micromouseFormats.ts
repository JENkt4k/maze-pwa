export type MicromouseFormatId='classic'|'half';
export type MicromouseFormat=Readonly<{
  id:MicromouseFormatId;name:string;width:number;height:number;cellPitchCm:number;
  passageWidthCm:number;wallThicknessCm:number;wallHeightCm:number;
}>;

export const MICROMOUSE_FORMATS:Readonly<Record<MicromouseFormatId,MicromouseFormat>>={
  classic:{id:'classic',name:'Full-size',width:16,height:16,cellPitchCm:18,passageWidthCm:16.8,wallThicknessCm:1.2,wallHeightCm:5},
  half:{id:'half',name:'Half-size',width:32,height:32,cellPitchCm:9,passageWidthCm:8.4,wallThicknessCm:.6,wallHeightCm:2.5},
};

export const micromouseFootprintMeters=(format:MicromouseFormat)=>({
  width:format.width*format.cellPitchCm/100,
  height:format.height*format.cellPitchCm/100,
});

export function micromouseEndpoints(format:MicromouseFormat):{start:{x:number;y:number};goal:{x:number;y:number}}{
  return{start:{x:0,y:format.height-1},goal:{x:Math.floor((format.width-1)/2),y:Math.floor((format.height-1)/2)}};
}

export function micromouseGoalCells(format:MicromouseFormat):readonly {x:number;y:number}[]{
  const goal=micromouseEndpoints(format).goal;
  return format.id==='classic'?[goal,{x:goal.x+1,y:goal.y},{x:goal.x,y:goal.y+1},{x:goal.x+1,y:goal.y+1}]:[goal];
}

export function micromouseGoalPassages(format:MicromouseFormat):readonly {x:number;y:number;nx:number;ny:number}[]{
  if(format.id!=='classic')return[];
  const [topLeft,topRight,bottomLeft,bottomRight]=micromouseGoalCells(format);
  return[
    {x:topLeft.x,y:topLeft.y,nx:topRight.x,ny:topRight.y},
    {x:topLeft.x,y:topLeft.y,nx:bottomLeft.x,ny:bottomLeft.y},
    {x:topRight.x,y:topRight.y,nx:bottomRight.x,ny:bottomRight.y},
    {x:bottomLeft.x,y:bottomLeft.y,nx:bottomRight.x,ny:bottomRight.y},
  ];
}

export function matchingMicromouseFormat(width:number,height:number):MicromouseFormat|undefined{
  return Object.values(MICROMOUSE_FORMATS).find(format=>format.width===width&&format.height===height);
}
