import type { MicromouseComparison } from '../maze/micromouse';
import type { MouseMotion } from '../maze/micromouseProfiles';
import { matchingMouseProfile } from '../maze/micromouseProfiles';
import type { GeneratorId, MazeTopology } from './maze';
import type { MicromouseBatchResult } from './micromouseBatch';

export type ComparisonExportContext=Readonly<{seed:number;width:number;height:number;generator:GeneratorId;topology:MazeTopology;format:string;motion:MouseMotion}>;

const columns=['seed','width','height','format','generator','topology','robot_profile','max_speed_mps','acceleration_mps2','turn_90_ms','strategy','success','search_time_ms','search_cells','return_time_ms','speed_time_ms','total_time_ms','speed_cells','turns','revisits','explored_percent','speed_route_quality','collisions','reason'] as const;
const csvCell=(value:unknown)=>{const text=String(value??'');return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;};
const csv=(rows:readonly Record<string,unknown>[])=>[columns.join(','),...rows.map(row=>columns.map(column=>csvCell(row[column])).join(','))].join('\r\n')+'\r\n';
const contextFields=(context:ComparisonExportContext)=>({width:context.width,height:context.height,format:context.format,generator:context.generator,topology:context.topology,robot_profile:matchingMouseProfile(context.motion),max_speed_mps:context.motion.maxSpeedMps,acceleration_mps2:context.motion.accelerationMps2,turn_90_ms:context.motion.turn90Ms});
const comparisonRow=(context:ComparisonExportContext,row:MicromouseComparison)=>({seed:context.seed,...contextFields(context),strategy:row.strategy,success:row.success,search_time_ms:row.metrics.search.timeMs,search_cells:row.metrics.search.cells,return_time_ms:row.metrics.return.timeMs,speed_time_ms:row.metrics.speed.timeMs,total_time_ms:row.metrics.totalTimeMs,speed_cells:row.metrics.speed.cells,turns:row.metrics.search.turns+row.metrics.return.turns+row.metrics.speed.turns,revisits:row.metrics.revisits,explored_percent:row.metrics.exploredPercent,speed_route_quality:row.metrics.speedRouteQuality,collisions:row.metrics.collisions,reason:''});

export function batchCsv(result:MicromouseBatchResult):string{const context={width:result.maze.width,height:result.maze.height,format:result.maze.format,generator:result.maze.generator,topology:result.maze.topology,robot_profile:result.robotProfile,max_speed_mps:result.motion.maxSpeedMps,acceleration_mps2:result.motion.accelerationMps2,turn_90_ms:result.motion.turn90Ms};return csv(result.runs.map(row=>({seed:row.seed,...context,strategy:row.strategy,success:row.success,search_time_ms:row.searchTimeMs,search_cells:row.searchCells,return_time_ms:row.returnTimeMs,speed_time_ms:row.speedTimeMs,total_time_ms:row.totalTimeMs,speed_cells:row.speedCells,turns:row.turns,revisits:row.revisits,explored_percent:row.exploredPercent,speed_route_quality:row.speedRouteQuality,collisions:row.collisions,reason:row.reason??''})));}
export function batchJson(result:MicromouseBatchResult):string{return JSON.stringify({version:1,type:'micromouse-batch',...result},null,2)+'\n';}
export function comparisonCsv(rows:readonly MicromouseComparison[],context:ComparisonExportContext):string{return csv(rows.map(row=>comparisonRow(context,row)));}
export function comparisonJson(rows:readonly MicromouseComparison[],context:ComparisonExportContext):string{return JSON.stringify({version:1,type:'micromouse-strategy-comparison',context:{...context,robotProfile:matchingMouseProfile(context.motion)},results:rows.map(row=>comparisonRow(context,row))},null,2)+'\n';}

export function downloadText(filename:string,text:string,type:string):void{const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
export const exportFilename=(kind:'batch'|'comparison',extension:'csv'|'json')=>`infimaze-micromouse-${kind}.${extension}`;
