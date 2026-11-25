import type {ClassItem,Weekday,ScheduleLayout} from '../database';
import {minute} from '../database';
export type Candidate=ClassItem & {source?:string;warning?:string};
export type ImportResult={entries:Candidate[];notes:string[];raw?:string;layout?:ScheduleLayout};
const colors=['#2dd4bf','#a78bfa','#fb923c','#60a5fa','#f472b6'];
const dayNames=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const dayAliases:Record<string,Weekday>={'su':0,'sun':0,'mo':1,'mon':1,'tu':2,'tue':2,'tues':2,'we':3,'wed':3,'th':4,'thu':4,'thur':4,'thurs':4,'fr':5,'fri':5,'sa':6,'sat':6,'m':1,'t':2,'w':3,'r':4,'f':5};
const clean=(s:unknown)=>String(s??'').replace(/\s+/g,' ').trim();
const toDay=(s:string):Weekday|undefined=>{const v=s.toLowerCase().trim().replace(/[^a-z]/g,'');if(!v)return undefined;if(dayAliases[v]!==undefined)return dayAliases[v];const d=dayNames.indexOf(v);return d<0?undefined:d as Weekday};
function parseTime(raw:string, meridiem?:string):string|null {
 const s=raw.trim().replace(/\./g,':');
 let h:number, mins:number, ap:string|undefined;
 const m=s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
 if(m){h=+m[1];mins=+(m[2]??0);ap=m[3];}
 else {
  const d=s.match(/^(\d{3,4})\s*(am|pm)?$/i);
  if(!d)return null;
  const v=d[1];mins=+v.slice(-2);h=+v.slice(0,-2);ap=d[2];
  if(mins>59||h>23)return null;
 }
 const apf=(ap||meridiem||'').toLowerCase();
 if(mins>59||h>23||apf&&h>12||apf&&h<1)return null;
 if(apf)h=(h%12)+(apf==='pm'?12:0);
 return `${String(h).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
}
function parseRange(text:string, afternoon=false):[string,string]|null {
 const normalized=text.replace(/[–—−]/g,'-').replace(/(\d)\s*[:.]\s*(\d{2})/g,'$1:$2').replace(/\b([ap])\.?\s*m\.?/gi,'$1m');
 const m=normalized.match(/(\d{1,4}(?:[:.]\d{2})?\s*(?:am|pm)?)\s*-\s*(\d{1,4}(?:[:.]\d{2})?\s*(?:am|pm)?)/i);
 if(!m)return null;
 const firstAP=m[1].match(/am|pm/i)?.[0],lastAP=m[2].match(/am|pm/i)?.[0];
 let a=parseTime(m[1],firstAP||lastAP),b=parseTime(m[2],lastAP||firstAP);
 if(!a||!b)return null;
 let x=minute(a),y=minute(b);
 if(firstAP||lastAP){
  // A trailing PM applies to both ends except a range crossing noon, e.g. 11–1 PM.
  if(y<=x&&!firstAP&&lastAP?.toLowerCase()==='pm'&&x>=720)x-=720;
  if(y<=x&&!lastAP&&firstAP?.toLowerCase()==='am'&&y<720)y+=720;
 }else{
  if(afternoon&&x<720)x+=720;
  if(y<=x&&y<720)y+=720;
 }
 if(x>=1440||y>=1440||y<=x)return null;
 a=hm(x);b=hm(y);return [a,b];
}
const hm=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const isTime=(s:string)=>Boolean(parseRange(s));
const isNoise=(s:string)=>!/[a-z0-9]/i.test(s)||/^[|Il!1\s._-]{1,5}$/.test(s);
const looksLikeRoom=(v:string)=>/^(?:room\b|rm[.\s]|\d{2,4}$|lab\b|com(?:p(?:uter)?)?\s*lab|building\b|bldg\b|online\b|zoom\b)/i.test(v);
const looksLikeTeacher=(v:string)=>/^(?:mr[.\s]|ms[.\s]|mrs[.\s]|dr[.\s]|prof[.\s]|sir\b|ma.?am\b)/i.test(v);
function classFromLines(lines:string[],day:Weekday,start:string,end:string,idx:number):Candidate|null {
 const ls=lines.flatMap(s=>s.split(/\r?\n/)).map(clean).filter(Boolean).filter(x=>!isNoise(x)&&!/^day\s*\/\s*time$/i.test(x));
 if(!ls.length)return null;
 const subject=ls[0];
 if(isTime(subject)||looksLikeRoom(subject)||looksLikeTeacher(subject)||/^(adviser|advisor|semester|school year)\b/i.test(subject))return null;
 const teacher=ls.findIndex((s,i)=>i>0&&looksLikeTeacher(s));
 const room=ls.slice(1,teacher<0?2:teacher).join(' ');
 return {day,start,end,subject,room,instructor:ls.slice(teacher<0?2:teacher).join(' '),color:colors[idx%colors.length]};
}
export function fromGrid(grid:string[][],merges:{top:number;bottom:number;left:number;right:number}[]=[]):ImportResult {
 const notes:string[]=[];const entries:Candidate[]=[];
 let header=-1;let dayCols:{col:number;day:Weekday}[]=[];
 for(let r=0;r<Math.min(grid.length,100);r++){
  const ds=(grid[r]||[]).map((v,c)=>({col:c,day:toDay(clean(v))})).filter((v):v is {col:number;day:Weekday}=>v.day!==undefined);
  if(ds.length>=2){header=r;dayCols=ds;break;}
 }
 if(header<0)return {entries:[],notes:['No weekday header row detected. Try a clearer timetable or use manual entry.']};
 const timeCol=Math.max(0,Math.min(...dayCols.map(x=>x.col))-1);
 const rows:{row:number;start:string;end:string}[]=[];
 let afternoon=false;
 for(let r=header+1;r<grid.length;r++){
  const label=clean(grid[r]?.[timeCol]);
  if(/^(adviser|advisor|total|remarks)\b/i.test(label))break;
  let range=parseRange(label,afternoon);
  const previous=rows.at(-1);
  if(range&&previous&&!/am|pm/i.test(label)&&minute(range[0])<minute(previous.start)&&minute(range[0])<720)range=parseRange(label,true);
  if(range){rows.push({row:r,start:range[0],end:range[1]});if(minute(range[0])>=720)afternoon=true;}
 }
 if(!rows.length)return {entries:[],notes:['Day headers found but no valid time ranges detected.']};
 const occupied=new Set<string>();
 const looksLikeSubject=(v:string)=>/^(?:[A-Z]{2,10}[\s-]*\d{2,5}|[A-Z]{2,10}\s+[A-Z]{2,10}\s*\d{2,5})\b/i.test(v);
 for(const {col,day} of dayCols){
  for(let i=0;i<rows.length;i++){
   const slot=rows[i];const key=`${slot.row}:${col}`;
   if(occupied.has(key))continue;
   const first=String(grid[slot.row]?.[col]??'').trim();if(!first||isNoise(first)||looksLikeRoom(first)||looksLikeTeacher(first))continue;
   const merge=merges.find(m=>m.left<=col&&m.right>=col&&m.top<=slot.row&&m.bottom>=slot.row);
   let last=merge?.bottom??slot.row;
   const lines=first.split(/\r?\n/).filter(Boolean);occupied.add(key);
   if(merge){
    for(let r=slot.row+1;r<=last;r++){const value=clean(grid[r]?.[col]);if(value&&value!==clean(first))lines.push(value);occupied.add(`${r}:${col}`);}
   }else{
    for(let j=i+1;j<rows.length&&j<=i+7;j++){
     const next=rows[j];if(next.row!==rows[j-1].row+1)break;
     const value=clean(grid[next.row]?.[col]);
     if(!value||isNoise(value))break;
     if(value===clean(first)&&(lines.length===1||first.includes('\n'))){occupied.add(`${next.row}:${col}`);last=next.row;continue;}
     if(looksLikeSubject(value)||isTime(value))break;
     if(!looksLikeRoom(value)&&!looksLikeTeacher(value)&&!(lines.length===2&&looksLikeRoom(lines[1])&&/^[a-z][a-z.' -]+\s[a-z.' -]+$/i.test(value)))break;
     lines.push(value);occupied.add(`${next.row}:${col}`);last=next.row;
    }
   }
   const bottomSlot=rows.find(x=>x.row===last);
   const end=bottomSlot?.end??slot.end;
   const candidate=classFromLines(lines,day,slot.start,end,entries.length);
   if(candidate&&minute(candidate.end)>minute(candidate.start))entries.push(candidate);
  }
 }
 if(!entries.length)notes.push('No classes could be extracted.');
 const subjectColors=new Map<string,string>();
 entries.forEach(entry=>{
  const key=entry.subject.toLowerCase();
  if(!subjectColors.has(key))subjectColors.set(key,colors[subjectColors.size%colors.length]);
  entry.color=subjectColors.get(key)!;
 });
 notes.push('Please review subject names, time ranges, rooms and instructors before saving.');
 return {entries,notes,layout:{days:dayCols.map(c=>c.day),slots:rows.map(({start,end})=>({start,end}))}};
}
export function fromDelimited(text:string,separator=','):ImportResult {const rows=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean).map(line=>{const out:string[]=[];let current='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++;}else quoted=!quoted;}else if(c===separator&&!quoted){out.push(current);current='';}else current+=c;}out.push(current);return out;});const headings=rows[0]?.map(x=>x.toLowerCase().trim())||[];const col=(...names:string[])=>headings.findIndex(x=>names.includes(x));const d=col('day','weekday'),s=col('start','start time','start_time'),e=col('end','end time','end_time'),sub=col('subject','course','subject code');if([d,s,e,sub].every(x=>x>=0)){const entries:Candidate[]=[];for(const row of rows.slice(1)){const day=toDay(row[d]||'');const start=parseTime(row[s]||''),end=parseTime(row[e]||'');if(day===undefined||!start||!end||minute(start)>=minute(end)||!clean(row[sub]))continue;entries.push({day,start,end,subject:clean(row[sub]),room:clean(row[col('room','location')]??''),instructor:clean(row[col('instructor','teacher','professor')]??''),color:colors[entries.length%colors.length]});}return {entries,notes:['CSV column import completed. Review entries before saving.']};}return fromGrid(rows);}
export type OCRWord={text:string;x:number;y:number;width?:number;height?:number};
export type TableGeometry={rows:number[];columns:number[]};
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]??0;
const leftEdge=(word:OCRWord)=>word.x-(word.width??0)/2;

/** Rebuild the table spatially. OCR often returns a time label as 3–5 separate words. */
export function fromOCRWords(words:OCRWord[],geometry?:TableGeometry):ImportResult {
 const filtered=words.filter(w=>clean(w.text));
 const raw=filtered.map(w=>w.text).join(' ');
 const textHeight=median(filtered.map(w=>w.height??12))||12;
 const tolerance=Math.max(4,textHeight*.65);
 const headerWords=filtered.flatMap(w=>{
  const day=toDay(w.text);
  return day!==undefined&&w.text.replace(/[^a-z]/gi,'').length>=3?[{...w,day}]:[];
 });
 // Only accept actual weekdays aligned on a single header row; never guess days from names.
 const headerGroups:typeof headerWords[]=[];
 for(const word of [...headerWords].sort((a,b)=>a.y-b.y)){
  const group=headerGroups.find(g=>Math.abs(median(g.map(w=>w.y))-word.y)<tolerance);
  if(group)group.push(word);else headerGroups.push([word]);
 }
 const header=headerGroups.sort((a,b)=>new Set(b.map(w=>w.day)).size-new Set(a.map(w=>w.day)).size)[0]??[];
 const seen=new Set<number>();
 const sortedDays=header.sort((a,b)=>a.x-b.x).filter(w=>{if(seen.has(w.day))return false;seen.add(w.day);return true;});
 if(sortedDays.length<2)return {entries:[],notes:['Could not reliably identify the weekday columns. Crop to the table, keep the weekday headings visible, and try again.'],raw};
 const headerY=median(sortedDays.map(w=>w.y));
 const spacing=median(sortedDays.slice(1).map((w,i)=>w.x-sortedDays[i].x));
 const ruleLeft=geometry?.columns.filter(x=>x<sortedDays[0].x).at(-1);
 const timeBoundary=ruleLeft??sortedDays[0].x-spacing/2;
 const body=filtered.filter(w=>w.y>headerY+tolerance);
 const timeWords=body.filter(w=>w.x<timeBoundary);
 const timeLines:OCRWord[][]=[];
 for(const word of timeWords.sort((a,b)=>a.y-b.y)){
  const line=timeLines.find(g=>Math.abs(median(g.map(w=>w.y))-word.y)<tolerance);
  if(line)line.push(word);else timeLines.push([word]);
 }
 const labels=timeLines.map(line=>({y:median(line.map(w=>w.y)),text:line.sort((a,b)=>leftEdge(a)-leftEdge(b)).map(w=>w.text).join(' ')}))
  .filter(line=>parseRange(line.text)!==null).sort((a,b)=>a.y-b.y);
 if(labels.length<2)return {entries:[],notes:['Could not read enough time labels to organize this table. Include the entire left-hand time column and use a sharper image.'],raw};
 const rowHeight=median(labels.slice(1).map((w,i)=>w.y-labels[i].y));
 const grid:string[][]=[['Time',...sortedDays.map(d=>dayNames[d.day])]];
 labels.forEach((label,index)=>{
  const top=geometry?.rows.filter(y=>y<label.y).at(-1)??(index?(labels[index-1].y+label.y)/2:label.y-rowHeight/2);
  const bottom=geometry?.rows.find(y=>y>label.y)??(index<labels.length-1?(label.y+labels[index+1].y)/2:label.y+rowHeight/2);
  const row=[label.text];
  sortedDays.forEach((day,col)=>{
   const left=geometry?.columns.filter(x=>x<day.x).at(-1)??(col?(sortedDays[col-1].x+day.x)/2:timeBoundary);
   const right=geometry?.columns.find(x=>x>day.x)??(col<sortedDays.length-1?(day.x+sortedDays[col+1].x)/2:day.x+spacing/2);
   const cell=body.filter(w=>w.x>=left&&w.x<right&&w.y>=top&&w.y<bottom&&!isNoise(clean(w.text))).sort((a,b)=>Math.abs(a.y-b.y)<tolerance?a.x-b.x:a.y-b.y);
   const lines:OCRWord[][]=[];
   cell.forEach(w=>{const last=lines.at(-1);if(last&&Math.abs(last[0].y-w.y)<tolerance)last.push(w);else lines.push([w]);});
   row.push(lines.map(line=>line.sort((a,b)=>leftEdge(a)-leftEdge(b)).map(w=>w.text).join(' ')).join('\n'));
  });
  grid.push(row);
 });
 const result=fromGrid(grid);
 return {...result,notes:['Weekday columns and time rows were reconstructed automatically. Afternoon times follow the table’s top-to-bottom order.',...result.notes],raw};
}
