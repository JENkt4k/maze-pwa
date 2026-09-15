export const APP_BACKUP_VERSION=1;
export type AppBackup=Readonly<{version:1;exportedAt:string;data:Readonly<Record<string,string>>}>;

type StorageLike=Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>;
const exactKeys=new Set(['savedMazes:v1','ui:palette:v1','ui:highContrast:v1','ui:theme:v1']);
export const isInfiMazeStorageKey=(key:string)=>key.startsWith('maze:')||exactKeys.has(key);

const collect=(storage:StorageLike)=>{
  const data:Record<string,string>={};
  for(let index=0;index<storage.length;index++){const key=storage.key(index);if(key&&isInfiMazeStorageKey(key)){const value=storage.getItem(key);if(value!==null)data[key]=value;}}
  return data;
};

export function createAppBackup(storage:StorageLike=localStorage,now=Date.now()):string{
  return JSON.stringify({version:APP_BACKUP_VERSION,exportedAt:new Date(now).toISOString(),data:collect(storage)},null,2);
}

export function parseAppBackup(text:string):AppBackup{
  if(text.length>10_000_000)throw new Error('This backup is larger than the 10 MB import limit.');
  try{
    const value:unknown=JSON.parse(text);
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();
    const candidate=value as {version?:unknown;exportedAt?:unknown;data?:unknown};
    if(candidate.version!==APP_BACKUP_VERSION||typeof candidate.exportedAt!=='string'||!Number.isFinite(Date.parse(candidate.exportedAt))||!candidate.data||typeof candidate.data!=='object'||Array.isArray(candidate.data))throw new Error();
    const entries=Object.entries(candidate.data);
    if(entries.length>1000||entries.some(([key,item])=>!isInfiMazeStorageKey(key)||key.length>300||typeof item!=='string'||item.length>5_000_000))throw new Error();
    return{version:1,exportedAt:candidate.exportedAt,data:Object.fromEntries(entries) as Record<string,string>};
  }catch(error){if(error instanceof Error&&error.message.includes('10 MB'))throw error;throw new Error('This is not a valid InfiMaze app backup.');}
}

export function restoreAppBackup(text:string,storage:StorageLike=localStorage):number{
  const backup=parseAppBackup(text),previous=collect(storage),currentKeys=Object.keys(previous);
  try{
    for(const key of currentKeys)storage.removeItem(key);
    for(const [key,value] of Object.entries(backup.data))storage.setItem(key,value);
  }catch{
    for(const key of Object.keys(collect(storage)))storage.removeItem(key);
    for(const [key,value] of Object.entries(previous))storage.setItem(key,value);
    throw new Error('Browser storage could not restore the backup. Existing app data was preserved.');
  }
  return Object.keys(backup.data).length;
}
