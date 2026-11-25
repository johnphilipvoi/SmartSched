import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {AlertTriangle,Check,X,Undo2} from 'lucide-react';
import {db,days,pretty,type ClassItem} from './database';
import {repairSchedule} from './scheduleRepair';
import SourceTimetable from './SourceTimetable';
import Modal from './Modal';
import {confirmAction} from './ConfirmDialog';

export default function RepairSchedule({items}:{items:ClassItem[]}){
 const plan=repairSchedule(items);
 const backup=useLiveQuery(()=>db.settings.get('repair-backup'));
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function apply(){
  setBusy(true);setError('');
  try{
   await db.transaction('rw',db.classes,db.settings,async()=>{
    const current=await db.classes.toArray();
    const fresh=repairSchedule(current);
    await db.settings.put({key:'repair-backup',classes:current,layout:(await db.settings.get('layout'))?.layout});
    await db.classes.clear();await db.classes.bulkAdd(fresh.entries);
   });
   setOpen(false);
  }catch{setError('Could not repair the saved schedule. Please try again.');}
  finally{setBusy(false);}
 }
 async function undo(){
  if(!backup?.classes)return;
  const ok=await confirmAction({
   title:'Restore the previous schedule?',
   message:'This brings back the schedule from before the repair. Any class changes made since then will be replaced.',
   confirmLabel:'Restore schedule',
   danger:true
  });
  if(!ok)return;
  setBusy(true);setError('');
  try{
   await db.transaction('rw',db.classes,db.settings,async()=>{
    await db.classes.clear();await db.classes.bulkAdd(backup.classes!);
    if(backup.layout)await db.settings.put({key:'layout',layout:backup.layout});else await db.settings.delete('layout');
    await db.settings.delete('repair-backup');
   });
  }catch{setError('Could not restore the previous schedule.');}
  finally{setBusy(false);}
 }
 if(!plan.changed&&!backup)return null;
 return <><div className="schedule-repair-banner"><AlertTriangle size={20}/><div><strong>{plan.changed?'Old import fragments detected':'Schedule repaired'}</strong><p>{plan.changed?'Border text and repeated fragments can distort your timetable. Review a repair, or import the original file to replace this schedule.':'The previous schedule is available to restore.'}</p></div>{plan.changed&&<button className="secondary" onClick={()=>setOpen(true)}>Review repair</button>}{backup&&<button className="link" disabled={busy} onClick={undo}><Undo2 size={15}/> Undo repair</button>}</div>{error&&<p className="error" role="alert">{error}</p>}
 {open&&<Modal wide label="Repair imported schedule" onClose={()=>{if(!busy)setOpen(false);}}><div className="section-heading"><h2>Repair imported schedule</h2><button className="icon-button" disabled={busy} aria-label="Close repair" onClick={()=>setOpen(false)}><X size={20}/></button></div><p className="section-description">Review these proposed changes. Course names, missing rooms, and missing instructors will not be guessed.</p><ul className="repair-changes">
 {plan.removed.map((c,i)=><li key={`noise-${i}`}>Remove suspected border text “{c.subject}” · {days[c.day]} {pretty(c.start)}</li>)}
 {plan.duplicates.map((c,i)=><li key={`duplicate-${i}`}>Remove redundant “{c.subject}” · {days[c.day]} {pretty(c.start)}</li>)}
 {plan.merged.map((g,i)=><li key={`merge-${i}`}>Combine {g.before.length} fragments of {g.after.subject} · {days[g.after.day]} {pretty(g.after.start)}–{pretty(g.after.end)}</li>)}
 </ul><SourceTimetable items={plan.entries}/><p className="note">To recover details that were never saved, re-import the original timetable. A repair cannot recreate missing text.</p><div className="editor-actions"><button className="secondary" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button className="primary" disabled={busy} onClick={apply}>{busy?<span className="spinner"/>:<Check size={16}/>}{busy?'Repairing…':'Apply repair'}</button></div></Modal>}</>;
}
