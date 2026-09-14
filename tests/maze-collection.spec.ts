import { collectionBackup, mergeCollections, normalizeFolder, normalizeTags, parseCollectionBackup } from '@src/app/mazeCollection';
import type { SavedMaze } from '@src/app/state';

const maze=(id:string,createdAt:number):SavedMaze=>({id,name:`Maze ${id}`,createdAt,params:{width:19,height:19,seed:42,g:.3,b:.15,tau:.4}});

test('folder and tag input is normalized and bounded',()=>{
  expect(normalizeFolder('  Weekend   puzzles  ')).toBe('Weekend puzzles');
  expect(normalizeTags(' hard, brain,hard, , family ')).toEqual(['hard','brain','family']);
});

test('collection backups round trip metadata and reject partial corruption',()=>{
  const saved=[{...maze('one',1),folder:'Favorites',tags:['hard','brain']}];
  expect(parseCollectionBackup(collectionBackup(saved,123))).toEqual(saved);
  expect(()=>parseCollectionBackup('{')).toThrow('valid JSON');
  expect(()=>parseCollectionBackup(JSON.stringify({kind:'infimaze-maze-collection',version:2,mazes:[]}))).toThrow('supported');
  expect(()=>parseCollectionBackup(JSON.stringify({kind:'infimaze-maze-collection',version:1,mazes:[maze('ok',1),{}]}))).toThrow('invalid maze');
});

test('restoring a collection adds new IDs and replaces matching IDs',()=>{
  expect(mergeCollections([maze('one',1),maze('two',2)],[{...maze('two',3),name:'Restored'},maze('three',4)]).map(item=>[item.id,item.name]))
    .toEqual([['one','Maze one'],['two','Restored'],['three','Maze three']]);
});
