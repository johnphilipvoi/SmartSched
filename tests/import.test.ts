import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fromGrid,fromOCRWords,fromDelimited,type OCRWord,type ImportResult} from '../src/import/parser';
import {scheduleGrid,expected} from './fixtures/schedule';

const values=(result:ImportResult)=>result.entries.map(c=>[c.day,c.start,c.end,c.subject,c.room,c.instructor]);
test('supplied timetable becomes eight complete sessions, with 1 PM correctly inferred',()=>{
 assert.deepEqual(values(fromGrid(scheduleGrid)),expected);
});
function spatialFixture(scale=1){
 const words:OCRWord[]=[];
 scheduleGrid.forEach((row,r)=>row.forEach((cell,c)=>{
  const parts=cell.split(' ').filter(Boolean);
  const center=c===0?55:183+(c-1)*137;
  parts.forEach((text,i)=>words.push({text,x:(center+(i-(parts.length-1)/2)*27)*scale,y:(12+r*22)*scale,height:14*scale,width:text.length*7*scale}));
 }));
 // OCR rule artifacts should not create classes, and adviser/teacher text is not a weekday.
 words.push({text:'II',x:460*scale,y:430*scale,height:14*scale});
 words.push({text:'|',x:182*scale,y:35*scale,height:14*scale});
 return words;
}
for(const scale of [1,3]){
 test(`split OCR time tokens and table geometry at ${scale}x scale`,()=>{
  assert.deepEqual(values(fromOCRWords(spatialFixture(scale))),expected);
 });
}
test('explicit 12-hour meridiem ranges work across noon and in the afternoon',()=>{
 const grid=[
  ['Time','Monday','Tuesday'],
  ['11:00 - 1:00 PM','Math',''],
  ['2:00 - 3:00 PM','History',''],
  ['3:00 PM - 4:00','Science','']
 ];
 assert.deepEqual(fromGrid(grid).entries.map(c=>[c.start,c.end]),[['11:00','13:00'],['14:00','15:00'],['15:00','16:00']]);
});
test('merged multiline cells keep their full duration',()=>{
 const grid=[['Time','Monday','Tuesday'],['08:00-08:30','Design\nStudio 1\nProf. Gray',''],['08:30-09:00','Design\nStudio 1\nProf. Gray',''],['09:00-09:30','Design\nStudio 1\nProf. Gray','']];
 const entry=fromGrid(grid,[{top:1,bottom:3,left:1,right:1}]).entries[0];
 assert.equal(entry.subject,'Design');assert.equal(entry.end,'09:30');assert.equal(entry.instructor,'Prof. Gray');
});
test('unrecognizable OCR does not invent weekdays or border classes',()=>{
 assert.equal(fromOCRWords([{text:'Mr. Baroro',x:180,y:10},{text:'Instructor',x:350,y:10},{text:'II',x:350,y:40}]).entries.length,0);
});
test('structured CSV remains compatible with weekend classes',()=>{
 const result=fromDelimited('day,start,end,subject,room,instructor\nSaturday,13:00,14:30,Design,Lab 1,Prof. Lee');
 assert.equal(result.entries[0].day,6);assert.equal(result.entries[0].start,'13:00');
});
test('OCR bounding boxes sort by left edge when a time word spans the line',()=>{
 const words=spatialFixture();
 const start=words.find(w=>w.text==='11:00'&&w.x<113&&w.y===188)!;
 start.width=95;start.x=60;
 assert.deepEqual(values(fromOCRWords(words)),expected);
});
test('all sessions of the same subject share a color',()=>{
 const entries=fromGrid(scheduleGrid).entries;
 const colors=entries.filter(c=>c.subject==='CAP 102').map(c=>c.color);
 assert.equal(new Set(colors).size,1);
});
test('afternoon inference also works when a timetable omits lunch rows',()=>{
 const entries=fromGrid([['Time','Monday','Tuesday'],['11:00-11:30','',''],['1:00-1:30','Math','']]).entries;
 assert.equal(entries[0].start,'13:00');
});
