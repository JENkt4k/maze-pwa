import { useMemo, useRef, useState } from 'react';
import type { SavedMaze } from '../state';
import { collectionBackup } from '../mazeCollection';
import { downloadText } from '../micromouseExport';

type Props={saveName:string;setSaveName:(value:string)=>void;saveFolder:string;setSaveFolder:(value:string)=>void;saveTags:string;setSaveTags:(value:string)=>void;saved:SavedMaze[];selectedId:string|null;onSave:()=>void;onLoad:(id:string)=>void;onDelete:(id:string)=>void;onImport:(text:string)=>number};

export default function MazeCollection(props:Props){
  const [folderFilter,setFolderFilter]=useState('');
  const [tagFilter,setTagFilter]=useState('');
  const [message,setMessage]=useState<string|null>(null);
  const inputRef=useRef<HTMLInputElement>(null);
  const folders=useMemo(()=>[...new Set(props.saved.map(maze=>maze.folder).filter((folder):folder is string=>Boolean(folder)))].sort(),[props.saved]);
  const tags=useMemo(()=>[...new Set(props.saved.flatMap(maze=>maze.tags??[]))].sort(),[props.saved]);
  const visible=props.saved.filter(maze=>(!folderFilter||maze.folder===folderFilter)&&(!tagFilter||maze.tags?.includes(tagFilter)));
  const exportBackup=()=>{downloadText(`infimaze-collection-${new Date().toISOString().slice(0,10)}.json`,collectionBackup(props.saved),'application/json');setMessage(`Exported ${props.saved.length} maze${props.saved.length===1?'':'s'}.`);};
  const importBackup=async(file:File|undefined)=>{if(!file)return;try{const count=props.onImport(await file.text());setMessage(`Imported ${count} maze${count===1?'':'s'}.`);}catch(error){setMessage(error instanceof Error?error.message:'The backup could not be imported.');}finally{if(inputRef.current)inputRef.current.value='';}};
  return <fieldset>
    <legend>Maze collection</legend>
    <div className="stack">
      <input className="input" name="maze-name" aria-label="Maze name" maxLength={200} placeholder="Name this maze…" value={props.saveName} onChange={e=>props.setSaveName(e.target.value)}/>
      <input className="input" name="maze-folder" aria-label="Maze folder" maxLength={80} placeholder="Folder (optional)" value={props.saveFolder} onChange={e=>props.setSaveFolder(e.target.value)}/>
      <input className="input" name="maze-tags" aria-label="Maze tags" maxLength={300} placeholder="Tags, separated by commas" value={props.saveTags} onChange={e=>props.setSaveTags(e.target.value)}/>
      <button className="btn btn-primary" onClick={props.onSave}>Save current</button>
    </div>
    {props.saved.length>0&&<div className="grid-2" style={{marginTop:10}}>
      <label>Folder<select name="folder-filter" aria-label="Filter by folder" value={folderFilter} onChange={e=>setFolderFilter(e.target.value)}><option value="">All folders</option>{folders.map(folder=><option key={folder}>{folder}</option>)}</select></label>
      <label>Tag<select name="tag-filter" aria-label="Filter by tag" value={tagFilter} onChange={e=>setTagFilter(e.target.value)}><option value="">All tags</option>{tags.map(tag=><option key={tag}>{tag}</option>)}</select></label>
    </div>}
    {props.saved.length ? <div style={{marginTop:12,display:'grid',gap:6,maxHeight:260,overflow:'auto'}}>
      {visible.map(maze=><div key={maze.id} style={{border:'1px solid #e6e9ef',borderRadius:10,padding:8,background:maze.id===props.selectedId?'#f0f6ff':'#fafbff'}}>
        <div className="hstack" style={{justifyContent:'space-between',gap:8}}><div><div style={{fontWeight:600,fontSize:14}}>{maze.name}</div><div style={{fontSize:12,color:'#586174'}}>{maze.folder&&`${maze.folder} · `}{maze.params.width}×{maze.params.height}, seed {maze.params.seed}</div></div><div className="hstack" style={{gap:6}}><button className="btn btn-sm" onClick={()=>props.onLoad(maze.id)}>Load</button><button className="btn btn-danger btn-sm" onClick={()=>props.onDelete(maze.id)}>Delete</button></div></div>
        {!!maze.tags?.length&&<div aria-label={`Tags for ${maze.name}`} style={{fontSize:12,color:'#315b88',marginTop:4}}>{maze.tags.map(tag=>`#${tag}`).join(' ')}</div>}
      </div>)}
      {!visible.length&&<div role="status" style={{fontSize:12,color:'#7a879b'}}>No mazes match these filters.</div>}
    </div>:<div style={{fontSize:12,color:'#7a879b',marginTop:8}}>No saved mazes yet.</div>}
    <div className="hstack" role="group" aria-label="Collection backup" style={{gap:8,marginTop:12}}><button type="button" className="btn btn-sm" disabled={!props.saved.length} onClick={exportBackup}>Export backup</button><button type="button" className="btn btn-sm" onClick={()=>inputRef.current?.click()}>Import backup</button><input ref={inputRef} hidden type="file" name="collection-backup" aria-label="Collection backup file" accept="application/json,.json" onChange={event=>void importBackup(event.target.files?.[0])}/></div>
    {message&&<div role="status" aria-live="polite" style={{fontSize:12,color:'#586174',marginTop:8}}>{message}</div>}
  </fieldset>;
}
