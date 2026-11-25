import {minute,type ClassItem} from './database';

const sameText=(a:string,b:string)=>a.trim().toLowerCase()===b.trim().toLowerCase();
const incomplete=(c:ClassItem)=>!c.room.trim()&&!c.instructor.trim();
const sameCourse=(a:ClassItem,b:ClassItem)=>a.day===b.day&&sameText(a.subject,b.subject);
const compatible=(a:ClassItem,b:ClassItem)=>(!a.room||!b.room||sameText(a.room,b.room))&&(!a.instructor||!b.instructor||sameText(a.instructor,b.instructor));

/** Propose only reversible, reviewable repairs. Never invent missing course details or times. */
export function repairSchedule(items:ClassItem[]){
 const removed:ClassItem[]=[],duplicates:ClassItem[]=[],merged:{before:ClassItem[];after:ClassItem}[]=[];
 let entries=items.filter(c=>{
  if(incomplete(c)&&/^[Iil|!1\s]{1,5}$/.test(c.subject)&&minute(c.end)-minute(c.start)<=30){removed.push(c);return false;}
  return true;
 }).map(c=>({...c})).sort((a,b)=>a.day-b.day||minute(a.start)-minute(b.start)||minute(b.end)-minute(a.end));
 entries=entries.filter((c,i,list)=>{
  const duplicate=list.some((other,j)=>j!==i&&sameCourse(c,other)&&compatible(c,other)&&minute(other.start)<=minute(c.start)&&minute(other.end)>=minute(c.end)&&(
   (incomplete(c)&&!incomplete(other))||
   (c.start===other.start&&c.end===other.end&&sameText(c.room,other.room)&&sameText(c.instructor,other.instructor)&&j<i)
  ));
  if(duplicate)duplicates.push(c);
  return !duplicate;
 });
 const output:ClassItem[]=[];
 const fragment=(c:ClassItem)=>incomplete(c)||minute(c.end)-minute(c.start)<=30;
 const mergeCompatible=(a:ClassItem,b:ClassItem)=>incomplete(a)||incomplete(b)||(sameText(a.room,b.room)&&sameText(a.instructor,b.instructor));
 for(let i=0;i<entries.length;i++){
  const first=entries[i],group=[first];
  // A repeated subject in touching 30-minute cells is one session. Never bridge a gap or a room/instructor change.
  while(group.length<8){
   const previous=group.at(-1)!;
   const next=entries.find(c=>!group.includes(c)&&sameCourse(previous,c)&&c.start===previous.end&&fragment(previous)&&fragment(c)&&mergeCompatible(previous,c));
   if(!next)break;
   group.push(next);
  }
  const end=group.at(-1)!.end;
  if(group.length>1){
   const room=group.map(c=>c.room).find(Boolean)??first.room;
   const instructor=group.map(c=>c.instructor).find(Boolean)??first.instructor;
   const after={...first,end,room,instructor};merged.push({before:group,after});output.push(after);
   entries=entries.filter(c=>c===first||!group.includes(c));
  }else output.push(first);
 }
 return {entries:output,removed,duplicates,merged,changed:removed.length+duplicates.length+merged.length>0};
}
