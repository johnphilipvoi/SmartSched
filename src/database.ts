import Dexie, {type Table} from 'dexie';
export type Weekday=0|1|2|3|4|5|6;
export type ClassItem={id?:number;subject:string;room:string;instructor:string;day:Weekday;start:string;end:string;color:string};
export type ScheduleLayout={days:number[];slots:{start:string;end:string}[];sourceName?:string};
export type ScheduleSetting={key:string;layout?:ScheduleLayout;classes?:ClassItem[];after?:ClassItem[]};
class SmartSchedDB extends Dexie {
 classes!:Table<ClassItem,number>;
 settings!:Table<ScheduleSetting,string>;
 constructor(){
  super('smartsched-db');
  this.version(1).stores({classes:'++id,day,start,subject'});
  this.version(2).stores({classes:'++id,day,start,subject',settings:'key'});
 }
}
export const db=new SmartSchedDB();
export const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const minute=(time:string)=>{const [h,m]=time.split(':').map(Number);return h*60+m;};
export const pretty=(time:string)=>new Date(`2000-01-01T${time}:00`).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
export function overlaps(a:ClassItem,b:ClassItem){return a.day===b.day&&minute(a.start)<minute(b.end)&&minute(b.start)<minute(a.end);}
