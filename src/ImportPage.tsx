import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {UploadCloud,CheckCircle2,AlertTriangle,Trash2,Plus,FileSpreadsheet,Image as ImageIcon,FileText,X} from 'lucide-react';
import {db,days,minute,overlaps,type ClassItem,type Weekday,type ScheduleLayout} from './database';
import {readSchedule} from './import/readFile';
import type {Candidate} from './import/parser';
import SourceTimetable from './SourceTimetable';
import {ImportSkeleton} from './Skeleton';
import {confirmAction} from './ConfirmDialog';

const empty=():Candidate=>({subject:'',room:'',instructor:'',day:1,start:'08:00',end:'09:00',color:'#2dd4bf'});
const count=(n:number,one:string,many=`${one}s`)=>`${n} ${n===1?one:many}`;
const validTime=(value:string)=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export default function ImportPage({onSaved,onClose}:{onSaved:()=>void;onClose?:()=>void}){
 const [entries,setEntries]=useState<Candidate[]>([]);
 const [notes,setNotes]=useState<string[]>([]);
 const [raw,setRaw]=useState('');
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState('');
 const [error,setError]=useState('');
 const [name,setName]=useState('');
 const [mode,setMode]=useState<'append'|'replace'>('replace');
 const [layout,setLayout]=useState<ScheduleLayout>();
 const [image,setImage]=useState('');
 const saveLock=useRef(false);
 const [saving,setSaving]=useState(false);
 const existingCount=useLiveQuery(()=>db.classes.count())??0;
 useEffect(()=>()=>{if(image)URL.revokeObjectURL(image);},[image]);
 async function load(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  setBusy(true);setError('');setRaw('');setEntries([]);setNotes([]);setLayout(undefined);setName(file.name);
  setImage(file.type.startsWith('image/')?URL.createObjectURL(file):'');
  try{
   const result=await readSchedule(file,setProgress);
   setEntries(result.entries);setNotes(result.notes);setRaw(result.raw||'');
   setLayout(result.layout?{...result.layout,sourceName:file.name}:undefined);
  }catch(err){setError(err instanceof Error?err.message:'Import failed');}
  finally{setBusy(false);setProgress('');}
 }
 const edit=(i:number,key:keyof Candidate,value:string|number)=>setEntries(old=>old.map((c,n)=>n===i?{...c,[key]:value}:c));
 const preview=entries.filter(c=>c.subject.trim()&&validTime(c.start)&&validTime(c.end)&&minute(c.end)>minute(c.start));
 async function save(){
  if(saveLock.current||busy)return;
  setError('');
  const valid=entries.every(c=>c.subject.trim()&&c.subject.length<=150&&c.room.length<=150&&c.instructor.length<=150&&Number.isInteger(c.day)&&c.day>=0&&c.day<=6&&validTime(c.start)&&validTime(c.end)&&minute(c.start)<minute(c.end));
  if(!valid){setError('Open “Edit extracted details” to fix empty subjects, invalid times, or overly long fields.');return;}
  if(entries.length>500){setError('Import up to 500 sessions at once.');return;}
  if(!entries.length){setError('No classes to save.');return;}
  saveLock.current=true;setSaving(true);
  try{
   const list:ClassItem[]=entries.map(({subject,room,instructor,day,start,end,color})=>({subject:subject.trim(),room:room.trim(),instructor:instructor.trim(),day,start,end,color}));
   const existing=mode==='append'?await db.classes.toArray():[];
   const same=(a:ClassItem,b:ClassItem)=>a.subject.toLowerCase()===b.subject.toLowerCase()&&a.day===b.day&&a.start===b.start&&a.end===b.end&&a.room.toLowerCase()===b.room.toLowerCase()&&a.instructor.toLowerCase()===b.instructor.toLowerCase();
   const unique=list.filter((c,i)=>![...existing,...list.slice(0,i)].some(other=>same(c,other)));
   if(!unique.length){setError('These classes are already in your schedule. No duplicates were added.');return;}
   const collisions=unique.flatMap((c,i)=>[...existing,...unique.slice(0,i)].filter(other=>overlaps(c,other)).map(other=>`${c.subject} overlaps ${other.subject} on ${days[c.day]}`));
   if(collisions.length){
    const ok=await confirmAction({
     title:'Overlapping classes found',
     message:`${count(collisions.length,'session')} ${collisions.length===1?'overlaps':'overlap'}. You can still save the schedule and resolve them later.\n\n${collisions.slice(0,5).join('\n')}${collisions.length>5?'\n…and more':''}`,
     confirmLabel:'Save anyway'
    });
    if(!ok)return;
   }
   if(mode==='replace'&&existingCount>0){
    const ok=await confirmAction({
     title:'Replace your current schedule?',
     message:`Your ${count(existingCount,'saved class','saved classes')} will be replaced by ${count(unique.length,'imported session')}. Old import fragments will be removed.`,
     confirmLabel:'Replace schedule',
     danger:true
    });
    if(!ok)return;
   }
   await db.transaction('rw',db.classes,db.settings,async()=>{
    if(mode==='replace'){
     await db.classes.clear();
     await db.settings.delete('layout');
     await db.settings.delete('repair-backup');
    }
    if(layout){
     const previous=mode==='append'?(await db.settings.get('layout'))?.layout:undefined;
     const combined=previous?{
      days:[...new Set([...previous.days,...layout.days])],
      slots:[...previous.slots,...layout.slots],
      sourceName:'Combined imports'
     }:layout;
     await db.settings.put({key:'layout',layout:combined});
    }
    await db.classes.bulkAdd(unique);
   });
   setEntries([]);setNotes([]);setRaw('');onSaved();onClose?.();
  }catch{setError('Could not save to this device. Check browser storage permissions.');}
  finally{saveLock.current=false;setSaving(false);}
 }
 return <div className="import-page" aria-busy={busy||saving}>
  <div className="panel import-intro"><div className="import-hero"><div><span className="eyebrow">IMPORT → PREVIEW → SAVE</span><h2>Your timetable, in the same layout.</h2><p>Upload your schedule to rebuild its weekday columns, time rows, and complete class sessions. Compare the preview with your original before saving.</p></div>{onClose&&<button className="icon-button" aria-label="Close import" disabled={saving} onClick={onClose}><X size={20}/></button>}</div>
   <label className="dropzone"><UploadCloud size={27}/><strong>Choose a schedule file</strong><span>Photos · Excel (.xlsx) · CSV/TSV · Text-based PDF</span><input type="file" accept=".png,.jpg,.jpeg,.webp,.xlsx,.csv,.tsv,.pdf,image/*,application/pdf" onChange={load} disabled={busy||saving}/></label>
   <div className="import-formats"><span><ImageIcon size={15}/> Photo OCR</span><span><FileSpreadsheet size={15}/> Excel merged cells</span><span><FileText size={15}/> PDF text</span></div>
   {busy&&<div className="import-status" role="status">{progress||'Reading file…'} <span className="spinner"/></div>}
   {error&&<p className="error" role="alert">{error}</p>}
  </div>
  {busy&&<ImportSkeleton/>}
  {notes.length>0&&<details className="import-notes"><summary><AlertTriangle size={16}/> Import notes · review before saving</summary>{notes.map((note,i)=><p key={i}>{note}</p>)}</details>}
  {!busy&&(entries.length>0||name)&&<fieldset className="panel import-review-fieldset" disabled={saving}>
   <div className="section-heading"><div><h2>Review extracted classes ({entries.length})</h2><p>{name} · {count(new Set(entries.map(c=>c.day)).size,'class day')} · {layout?`${layout.slots.length} original time rows preserved`:'Time rows generated from class times'}</p></div></div>
   {image&&<details className="original-image"><summary>Compare with original image</summary><img src={image} alt="Original timetable uploaded for comparison"/></details>}
   <SourceTimetable items={preview} source={layout}/>
   <details className="import-edit-details"><summary>Edit extracted details</summary>
    <div className="import-actions"><button className="secondary" onClick={()=>setEntries(old=>[...old,empty()])}><Plus size={16}/> Add missing class</button></div>
    <div className="import-review">{entries.map((c,i)=><div className="import-entry" key={i}>
     <div className="entry-heading"><strong>Class {i+1}</strong><button className="icon-button danger" onClick={()=>setEntries(old=>old.filter((_,j)=>i!==j))} aria-label={`Remove class ${i+1}`}><Trash2 size={17}/></button></div>
     <div className="import-fields">
      <label>Subject<input value={c.subject} maxLength={150} onChange={e=>edit(i,'subject',e.target.value)}/></label>
      <label>Day<select value={c.day} onChange={e=>edit(i,'day',Number(e.target.value) as Weekday)}>{days.map((d,j)=><option key={d} value={j}>{d}</option>)}</select></label>
      <label>Start<input type="time" value={c.start} onChange={e=>edit(i,'start',e.target.value)}/></label>
      <label>End<input type="time" value={c.end} onChange={e=>edit(i,'end',e.target.value)}/></label>
      <label>Room<input value={c.room} maxLength={150} onChange={e=>edit(i,'room',e.target.value)}/></label>
      <label>Instructor<input value={c.instructor} maxLength={150} onChange={e=>edit(i,'instructor',e.target.value)}/></label>
     </div></div>)}</div>
   </details>
   <div className="import-save-options"><label>How should this schedule be saved?<select aria-label="Import mode" value={mode} onChange={e=>setMode(e.target.value as 'append'|'replace')}><option value="replace">Replace existing schedule (recommended)</option><option value="append">Add alongside existing classes</option></select></label>
    <p>{mode==='replace'?`${count(existingCount,'existing class','existing classes')} will be replaced by this preview. Old fragments and duplicate imports will not remain.`:`Your ${count(existingCount,'saved class','saved classes')} will stay. This can overlap with an earlier version of the same timetable.`}</p>
   </div>
   <button className="primary" onClick={save} disabled={entries.length===0||saving}>{saving?<span className="spinner"/>:<CheckCircle2 size={18}/>}{saving?'Saving…':`Confirm & save ${count(entries.length,'class','classes')}`}</button>
  </fieldset>}
  {raw&&<details className="panel raw-text"><summary>View raw extracted text</summary><pre>{raw.slice(0,12000)}</pre></details>}
  <div className="import-footnote">First-time photo recognition needs internet to download OCR assets. Review unclear text before saving. The source-style table preserves detected time rows and columns; uploaded files stay on this device.</div>
 </div>;
}
