import { createAppBackup,isInfiMazeStorageKey,parseAppBackup,restoreAppBackup } from '@src/app/appBackup';

class MemoryStorage implements Storage{
  private data=new Map<string,string>();
  get length(){return this.data.size;}clear(){this.data.clear();}key(index:number){return[...this.data.keys()][index]??null;}
  getItem(key:string){return this.data.get(key)??null;}setItem(key:string,value:string){this.data.set(key,String(value));}removeItem(key:string){this.data.delete(key);}
}

test('app backups contain all InfiMaze data and exclude unrelated site storage',()=>{
  const storage=new MemoryStorage();storage.setItem('savedMazes:v1','[{"id":"maze"}]');storage.setItem('maze:play-history:v1','[]');storage.setItem('ui:theme:v1','dark');storage.setItem('another-app','private');
  const backup=parseAppBackup(createAppBackup(storage,0));
  expect(backup.exportedAt).toBe('1970-01-01T00:00:00.000Z');
  expect(backup.data).toEqual({'savedMazes:v1':'[{"id":"maze"}]','maze:play-history:v1':'[]','ui:theme:v1':'dark'});
  expect(isInfiMazeStorageKey('another-app')).toBe(false);
});

test('restore replaces InfiMaze data while retaining unrelated site storage',()=>{
  const storage=new MemoryStorage();storage.setItem('maze:settings:v1','old');storage.setItem('another-app','keep');
  const count=restoreAppBackup(JSON.stringify({version:1,exportedAt:new Date().toISOString(),data:{'maze:settings:v1':'new','maze:competition-room:v1:room':'[]'}}),storage);
  expect(count).toBe(2);expect(storage.getItem('maze:settings:v1')).toBe('new');expect(storage.getItem('maze:competition-room:v1:room')).toBe('[]');expect(storage.getItem('another-app')).toBe('keep');
});

test('restore rejects unknown keys before changing storage',()=>{
  const storage=new MemoryStorage();storage.setItem('maze:settings:v1','safe');
  expect(()=>restoreAppBackup(JSON.stringify({version:1,exportedAt:new Date().toISOString(),data:{'another-app':'replace'}}),storage)).toThrow(/valid InfiMaze/);
  expect(storage.getItem('maze:settings:v1')).toBe('safe');
});
