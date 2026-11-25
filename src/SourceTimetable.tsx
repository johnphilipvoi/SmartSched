import {days,minute,pretty,type ClassItem,type ScheduleLayout} from './database';
import {timeAt,weekOrder} from './planning';

/** Keep imported row boundaries; add boundaries only when an edited class needs them. */
export function tableLayout(items:ClassItem[],source?:ScheduleLayout):ScheduleLayout{
 const columns=source?.days.length?[...source.days]:[1,2,3,4,5];
 weekOrder.forEach(day=>{if(items.some(c=>c.day===day)&&!columns.includes(day))columns.push(day);});
 if(source?.slots.length){
  const bounds=new Set(source.slots.flatMap(s=>[minute(s.start),minute(s.end)]));
  items.forEach(c=>{bounds.add(minute(c.start));bounds.add(minute(c.end));});
  const sorted=[...bounds].sort((a,b)=>a-b);
  return {...source,days:columns,slots:sorted.slice(0,-1).flatMap((start,i)=>{
   const end=sorted[i+1];
   const occupied=source.slots.some(s=>minute(s.start)<=start&&minute(s.end)>=end)||items.some(c=>minute(c.start)<end&&minute(c.end)>start);
   return occupied?[{start:timeAt(start),end:timeAt(end)}]:[];
  })};
 }
 const start=items.length?Math.floor(Math.min(...items.map(c=>minute(c.start)))/30)*30:450;
 const end=items.length?Math.max(1020,Math.ceil(Math.max(...items.map(c=>minute(c.end)))/30)*30):1020;
 const bounds=new Set(Array.from({length:Math.ceil((end-start)/30)+1},(_,i)=>Math.min(end,start+i*30)));
 items.forEach(c=>{bounds.add(minute(c.start));bounds.add(minute(c.end));});
 const sorted=[...bounds].sort((a,b)=>a-b);
 return {days:columns,slots:sorted.slice(0,-1).map((start,i)=>({start:timeAt(start),end:timeAt(sorted[i+1])}))};
}

export default function SourceTimetable({items,source,day=-1,onEdit}:{items:ClassItem[];source?:ScheduleLayout;day?:number;onEdit?:(item:ClassItem)=>void}){
 const layout=tableLayout(items,source);
 const columns=day<0?layout.days:[day];
 return <div className="source-table-scroll"><table className={`source-table ${day>=0?'source-table-single':''}`}>
  <caption>{source?.sourceName?`Timetable from ${source.sourceName}`:'Class timetable'} · times in your local timezone</caption>
  <thead><tr><th scope="col">Day / Time</th>{columns.map(d=><th scope="col" key={d}>{days[d]}</th>)}</tr></thead>
  <tbody>{layout.slots.map((slot,index)=><tr key={slot.start}><th scope="row"><span>{pretty(slot.start)} – {pretty(slot.end)}</span></th>{columns.map(d=>{
   const courses=items.filter(c=>c.day===d&&minute(c.start)<minute(slot.end)&&minute(c.end)>minute(slot.start));
   return <td key={d} className={courses.length>1?'source-overlap':''}>{courses.map((c,n)=>{
    const occupied=layout.slots.map((s,i)=>({s,i})).filter(({s})=>minute(c.start)<minute(s.end)&&minute(c.end)>minute(s.start));
    const position=occupied.findIndex(({i})=>i===index);
    const count=occupied.length;
    // The original three-row convention: course, room, instructor — one session, not three classes.
    const lines=count>=3?[position===0?c.subject:position===1?c.room:position===2?c.instructor:'']:
     count===2?(position===0?[c.subject]:[c.room,c.instructor]):[c.subject,c.room,c.instructor];
    const content=<>{lines.filter(Boolean).map((text,i)=>position===0&&i===0?<strong key={i}>{text}</strong>:<span key={i}>{text}</span>)}{courses.length>1&&<small>Overlap</small>}</>;
    const style={background:`color-mix(in srgb, ${c.color} 8%, var(--surface))`,borderLeftColor:c.color};
    const title=`${c.subject} · ${pretty(c.start)}–${pretty(c.end)}${c.room?` · ${c.room}`:''}${c.instructor?` · ${c.instructor}`:''}`;
    const rowLabel=`Edit ${c.subject}, ${pretty(c.start)}–${pretty(c.end)}, row ${pretty(slot.start)}–${pretty(slot.end)}`;
    return onEdit?<button className="source-session" style={style} key={c.id??n} onClick={()=>onEdit(c)} title={title} aria-label={rowLabel} tabIndex={position===0?0:-1}>{content}</button>:
     <div className="source-session" style={style} key={c.id??n} title={title}>{content}</div>;
   })}</td>;
  })}</tr>)}</tbody>
 </table><p className="source-scroll-hint">Swipe sideways to see every day</p></div>;
}
