import {fromDelimited,fromGrid,fromOCRWords,type ImportResult} from './parser';
import {prepareImage} from './prepareImage';
export async function readSchedule(file:File,onProgress:(s:string)=>void):Promise<ImportResult>{
 if(file.size>12*1024*1024)throw new Error('File must be smaller than 12 MB');
 const ext=file.name.split('.').pop()?.toLowerCase()||'';
 const mime=file.type.toLowerCase();

 const isPdf=mime==='application/pdf'||ext==='pdf';
 const isXlsx=mime.includes('spreadsheet')||ext==='xlsx';
 const isCsv=ext==='csv';
 const isTsv=ext==='tsv';
 if(isCsv){onProgress('Reading spreadsheet text...');return fromDelimited(await file.text(),',');}
 if(isTsv){onProgress('Reading spreadsheet text...');return fromDelimited(await file.text(),'\t');}
 if(isXlsx){onProgress('Reading Excel cells and merged ranges...');const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());let best:ImportResult={entries:[],notes:[]};workbook.eachSheet(sheet=>{const grid:string[][]=[];sheet.eachRow({includeEmpty:true},(row,r)=>{grid[r-1]=[];row.eachCell({includeEmpty:true},(cell,c)=>{const value=cell.value;grid[r-1][c-1]=typeof value==='object'&&value!==null&&'text'in value?String(value.text):typeof value==='object'&&value!==null&&'result'in value?String(value.result??''):String(value??'');});});const merges:{top:number;bottom:number;left:number;right:number}[]=[];const ranges=(sheet as unknown as {model?:{merges?:string[]}}).model?.merges||[];for(const range of ranges){const [a,b]=range.split(':');const decode=(v:string)=>{const m=v.match(/^([A-Z]+)(\d+)$/i);if(!m)return {r:0,c:0};let c=0;for(const ch of m[1].toUpperCase())c=c*26+ch.charCodeAt(0)-64;return {r:+m[2]-1,c:c-1};};const first=decode(a),last=decode(b||a);merges.push({top:first.r,bottom:last.r,left:first.c,right:last.c});}const parsed=fromGrid(grid,merges);if(parsed.entries.length>best.entries.length)best=parsed;});return best;}
 if(['png','jpg','jpeg','webp'].includes(ext)||mime.startsWith('image/')){
  onProgress('Finding table rows and removing grid lines…');
  const prepared=await prepareImage(file);
  onProgress('Loading OCR engine (first use requires internet)…');
  const {createWorker,PSM}=await import('tesseract.js');
  const worker=await createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')onProgress(`Reading your timetable: ${Math.round(m.progress*100)}%`);}});
  try{
   await worker.setParameters({tessedit_pageseg_mode:PSM.SPARSE_TEXT,preserve_interword_spaces:'1'});
   const result=await worker.recognize(prepared.image,{}, {blocks:true});
   const data=result.data as unknown as {blocks?:{paragraphs?:{lines?:{words?:{text:string;bbox:{x0:number;y0:number;x1:number;y1:number}}[]}[]}[]}[]};
   let words=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[]))).map(w=>({text:w.text,x:(w.bbox.x0+w.bbox.x1)/2,y:(w.bbox.y0+w.bbox.y1)/2,width:w.bbox.x1-w.bbox.x0,height:w.bbox.y1-w.bbox.y0}));
   // Course codes are especially prone to dictionary substitutions (e.g. M becomes ™).
   // Re-read only code-shaped cells with a code alphabet, never substitute school-specific names.
   const {rows,columns}=prepared.geometry;
   if(rows.length>2&&columns.length>2){
    const codeCells:{left:number;top:number;right:number;bottom:number}[]=[];
    for(let r=1;r<rows.length-1;r++)for(let c=1;c<columns.length-1;c++){
     const [left,right,top,bottom]=[columns[c],columns[c+1],rows[r],rows[r+1]];
     const cell=words.filter(w=>w.x>left&&w.x<right&&w.y>top&&w.y<bottom).sort((a,b)=>(a.x-a.width/2)-(b.x-b.width/2));
     const text=cell.map(w=>w.text).join(' ').trim();
     if(/^[a-z™®|!]{1,12}\s*[-]?\s*\d{2,5}[a-z]?$/i.test(text)&&!/^(room|rm|lab|bldg)\b/i.test(text))codeCells.push({left,right,top,bottom});
    }
    await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_LINE,tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -&'});
    const bitmap=await createImageBitmap(prepared.image);
    try{for(const [index,cell] of codeCells.slice(0,80).entries()){
     onProgress(`Checking course codes: ${index+1}/${Math.min(codeCells.length,80)}`);
     const inset=Math.max(1,Math.round((cell.bottom-cell.top)*.09));
     const crop=document.createElement('canvas');crop.width=Math.floor(cell.right-cell.left-inset*2);crop.height=Math.floor(cell.bottom-cell.top-inset*2);
     crop.getContext('2d')!.drawImage(bitmap,cell.left+inset,cell.top+inset,crop.width,crop.height,0,0,crop.width,crop.height);
     const checked=await worker.recognize(crop);
     const text=checked.data.text.trim().replace(/\s+/g,' ').replace(/^([A-Z]+)(\d)/,'$1 $2');
     if(!/^[A-Z][A-Z &-]*\s\d{2,5}[A-Z]?$/.test(text))continue;
     words=words.filter(w=>!(w.x>cell.left&&w.x<cell.right&&w.y>cell.top&&w.y<cell.bottom));
     words.push({text,x:(cell.left+cell.right)/2,y:(cell.top+cell.bottom)/2,width:cell.right-cell.left-6,height:cell.bottom-cell.top-6});
    }}finally{bitmap.close();}
   }
   onProgress('Organizing classes by weekday and time…');
   if(words.length)return {...fromOCRWords(words,prepared.geometry),raw:result.data.text};
   return {entries:[],notes:['No readable timetable text was found. Use a sharper image with weekday headings and the complete time column.'],raw:result.data.text};
  }finally{await worker.terminate();}
 }
 if(isPdf){
  onProgress('Reading PDF locally...');
  const pdfjs=await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const entries:ImportResult['entries']=[],notes:string[]=[];
  let layout:ImportResult['layout'];
  try{
   for(let p=1;p<=Math.min(pdf.numPages,10);p++){
    const page=await pdf.getPage(p),viewport=page.getViewport({scale:1});
    const content=await page.getTextContent();
    const words=content.items.flatMap(item=>{
     if(!('str'in item)||!('transform'in item))return [];
     return [{text:item.str,x:item.transform[4]+item.width/2,y:viewport.height-item.transform[5]-item.height/2,width:item.width,height:item.height}];
    });
    const result=fromOCRWords(words);entries.push(...result.entries);
    if(p===1&&result.layout)layout=result.layout;
    notes.push(...result.notes.map(note=>`Page ${p}: ${note}`));
   }
  }finally{await pdf.destroy();}
  return {entries,notes:['Text-based PDFs only. For a scanned PDF, upload a photo of the timetable instead.',...notes],layout};
 }
 if(['heic','heif'].includes(ext))throw new Error('HEIC/HEIF photos are not supported. On iPhone, choose "Most Compatible" camera setting or convert the photo to JPG/PNG first.');
 throw new Error('Supported formats: PNG, JPG, JPEG, WEBP, XLSX, CSV, TSV and text-based PDF.');
}
