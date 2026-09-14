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
  // The app models one goal cell, so use the upper-left cell of the classic center goal area.
  return{start:{x:0,y:format.height-1},goal:{x:Math.floor((format.width-1)/2),y:Math.floor((format.height-1)/2)}};
}

export function matchingMicromouseFormat(width:number,height:number):MicromouseFormat|undefined{
  return Object.values(MICROMOUSE_FORMATS).find(format=>format.width===width&&format.height===height);
}
