import { parseSaved, type SavedMaze } from './state';

export const COLLECTION_BACKUP_KIND='infimaze-maze-collection';
export const COLLECTION_BACKUP_VERSION=1;

export function normalizeFolder(value:string):string{return value.trim().replace(/\s+/g,' ').slice(0,80);}
export function normalizeTags(value:string|string[]):string[]{
  const input=Array.isArray(value)?value:value.split(',');
  return [...new Set(input.map(tag=>tag.trim().replace(/\s+/g,' ').slice(0,40)).filter(Boolean))].slice(0,20);
}
export function collectionBackup(mazes:SavedMaze[],exportedAt=Date.now()):string{
  return JSON.stringify({kind:COLLECTION_BACKUP_KIND,version:COLLECTION_BACKUP_VERSION,exportedAt,mazes},null,2);
}
export function parseCollectionBackup(raw:string):SavedMaze[]{
  let value:unknown;
  try{value=JSON.parse(raw);}catch{throw new Error('This file is not valid JSON.');}
  if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('This is not an InfiMaze collection backup.');
  const backup=value as Record<string,unknown>;
  if(backup.kind!==COLLECTION_BACKUP_KIND||backup.version!==COLLECTION_BACKUP_VERSION||!Array.isArray(backup.mazes))throw new Error('This is not a supported InfiMaze collection backup.');
  const mazes=parseSaved(JSON.stringify(backup.mazes));
  if(mazes.length!==backup.mazes.length)throw new Error('The backup contains one or more invalid maze records.');
  return mazes;
}
export function mergeCollections(existing:SavedMaze[],incoming:SavedMaze[]):SavedMaze[]{
  const merged=new Map(existing.map(maze=>[maze.id,maze]));
  for(const maze of incoming)merged.set(maze.id,maze);
  return [...merged.values()].sort((a,b)=>a.createdAt-b.createdAt);
}
