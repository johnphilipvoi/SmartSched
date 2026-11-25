import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repairSchedule} from '../src/scheduleRepair';
import {fromGrid} from '../src/import/parser';
import {tableLayout} from '../src/SourceTimetable';
import {scheduleGrid} from './fixtures/schedule';
import type {ClassItem} from '../src/database';

const entry=(subject:string,start:string,end:string,extra:Partial<ClassItem>={}):ClassItem=>({subject,start,end,day:1,room:'',instructor:'',color:'#2dd4bf',...extra});
test('repair removes border artifacts and combines only metadata-free fragments',()=>{
 const original=[
  entry('II','04:30','05:00',{id:1,day:3}),
  entry('I','07:30','08:00',{id:2,day:2}),
  entry('CAP 102','10:30','11:00',{id:3}),
  entry('CAP 102','11:00','11:30',{id:4}),
  entry('CAP 102','11:30','12:00',{id:5}),
  entry('ITM 123','07:30','09:00',{id:6,day:2,room:'Comp Lab 2',instructor:'Mr. JJ Baroro'}),
  entry('ITM 123','09:00','10:30',{id:7,day:2,room:'Comp Lab 2',instructor:'Mr. JJ Baroro'})
 ];
 const before=JSON.stringify(original),plan=repairSchedule(original);
 assert.equal(plan.removed.length,2);
 assert.equal(plan.merged.length,1);
 assert.equal(plan.entries.length,3);
 assert.equal(plan.entries.find(c=>c.subject==='CAP 102')!.end,'12:00');
 assert.equal(plan.entries.filter(c=>c.subject==='ITM 123').length,2);
 assert.equal(JSON.stringify(original),before);
 assert.equal(repairSchedule(plan.entries).changed,false);
});
test('covered old fragments are removed when the complete session already exists',()=>{
 const plan=repairSchedule([
  entry('CAP 102','10:30','11:00'),
  entry('CAP 102','11:00','11:30'),
  entry('CAP 102','11:30','12:00'),
  entry('CAP 102','10:30','12:00',{room:'Rm.309',instructor:'Mr. RD Magboo'})
 ]);
 assert.equal(plan.entries.length,1);
 assert.equal(plan.duplicates.length,3);
 assert.equal(plan.entries[0].room,'Rm.309');
});
test('adjacent identical fully described 30-minute fragments merge into one session',()=>{
 const plan=repairSchedule([
  entry('ITM 113','13:00','13:30',{room:'Com Lab 2',instructor:'Mr. RD Magboo'}),
  entry('ITM 113','13:30','14:00',{room:'Com Lab 2',instructor:'Mr. RD Magboo'}),
  entry('ITM 113','14:00','14:30',{room:'Com Lab 2',instructor:'Mr. RD Magboo'}),
 ]);
 assert.equal(plan.entries.length,1);
 assert.equal(plan.entries[0].start,'13:00');
 assert.equal(plan.entries[0].end,'14:30');
 assert.equal(plan.entries[0].room,'Com Lab 2');
});
test('long adjacent repeats are preserved rather than collapsed',()=>{
 const plan=repairSchedule([
  entry('ITM 123','07:30','09:00',{room:'Comp Lab 2',instructor:'Mr. JJ Baroro'}),
  entry('ITM 123','09:00','10:30',{room:'Comp Lab 2',instructor:'Mr. JJ Baroro'}),
 ]);
 assert.equal(plan.changed,false);
 assert.equal(plan.entries.length,2);
});
test('repair does not merge different days, gaps, rooms, or instructors',()=>{
 const plan=repairSchedule([
  entry('Math','08:00','08:30',{room:'A'}),
  entry('Math','08:30','09:00',{room:'B'}),
  entry('CAP 102','10:30','11:00'),
  entry('CAP 102','11:30','12:00'),
  entry('CAP 102','11:00','11:30',{day:2}),
  entry('II','04:30','05:00',{room:'A'})
 ]);
 assert.equal(plan.changed,false);
 assert.equal(plan.entries.length,6);
});
test('source layout preserves all 19 rows, including empty lunch and afternoon periods',()=>{
 const imported=fromGrid(scheduleGrid);
 const result=tableLayout(imported.entries,imported.layout);
 assert.deepEqual(result.days,[1,2,3,4,5]);
 assert.equal(result.slots.length,19);
 assert.deepEqual(result.slots[0],{start:'07:30',end:'08:00'});
 assert.deepEqual(result.slots.at(-1),{start:'16:30',end:'17:00'});
 assert(result.slots.some(slot=>slot.start==='12:30'&&slot.end==='13:00'));
});
test('source layout can accommodate a new off-grid class without clipping it',()=>{
 const imported=fromGrid(scheduleGrid);
 const layout=tableLayout([...imported.entries,entry('Workshop','18:15','19:10',{day:6})],imported.layout);
 assert(layout.days.includes(6));
 assert(layout.slots.some(s=>s.start==='18:15'&&s.end==='19:10'));
});
test('repeated subject cells are one full session, not three half-hour classes',()=>{
 const parsed=fromGrid([['Time','Monday','Tuesday'],['10:30-11:00','CAP 102',''],['11:00-11:30','CAP 102',''],['11:30-12:00','CAP 102','']]);
 assert.equal(parsed.entries.length,1);
 assert.equal(parsed.entries[0].start,'10:30');
 assert.equal(parsed.entries[0].end,'12:00');
});
