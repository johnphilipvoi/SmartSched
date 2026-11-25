import type {TableGeometry} from './parser';

function centers(indices:number[]) {
  const groups:number[][]=[];
  for(const n of indices){const last=groups.at(-1);if(last&&n-last.at(-1)!<=2)last.push(n);else groups.push([n]);}
  return groups.map(g=>g.reduce((a,b)=>a+b,0)/g.length);
}

/** Remove long table rules before OCR so borders cannot become "I", "1", or fake subjects. */
export async function prepareImage(file:Blob):Promise<{image:Blob;geometry:TableGeometry}> {
  const bitmap=await createImageBitmap(file);
  try {
    if(bitmap.width*bitmap.height>30_000_000)throw new Error('This photo is too large to process. Crop or resize it to under 30 megapixels.');
    const canvas=document.createElement('canvas');
    canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    const {width,height}=canvas;
    const horizontal:number[]=[],vertical:number[]=[];
    const dark=(x:number,y:number)=>{const i=(y*width+x)*4;return pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114<160;};
    for(let y=0;y<height;y++){let count=0;for(let x=0;x<width;x++)if(dark(x,y))count++;if(count/width>.6)horizontal.push(y);}
    for(let x=0;x<width;x++){let count=0;for(let y=0;y<height;y++)if(dark(x,y))count++;if(count/height>.55)vertical.push(x);}
    // Only remove rules when a real grid was detected; preserve ordinary text/photos.
    const rows=horizontal.length>=3?centers(horizontal):[];
    const columns=vertical.length>=3?centers(vertical):[];
    ctx.fillStyle='#fff';
    if(rows.length>=3)for(const y of horizontal)ctx.fillRect(0,y-1,width,3);
    if(columns.length>=3)for(const x of vertical)ctx.fillRect(x-1,0,3,height);
    const scale=Math.min(4,Math.max(1,2400/width),Math.sqrt(12_000_000/(width*height)));
    const output=document.createElement('canvas');
    output.width=Math.round(width*scale);output.height=Math.round(height*scale);
    const target=output.getContext('2d')!;
    target.fillStyle='#fff';target.fillRect(0,0,output.width,output.height);
    target.imageSmoothingEnabled=true;target.imageSmoothingQuality='high';
    target.drawImage(canvas,0,0,output.width,output.height);
    if(rows.length>=3&&columns.length>=3){
      // Crisp binary text avoids anti-aliased I/T/M strokes being joined or dropped by OCR.
      const sharpened=target.getImageData(0,0,output.width,output.height);
      for(let i=0;i<sharpened.data.length;i+=4){
        const value=sharpened.data[i]*.299+sharpened.data[i+1]*.587+sharpened.data[i+2]*.114<200?0:255;
        sharpened.data[i]=value;sharpened.data[i+1]=value;sharpened.data[i+2]=value;
      }
      target.putImageData(sharpened,0,0);
    }
    const image=await new Promise<Blob>((resolve,reject)=>output.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not prepare this image.')),'image/png'));
    return {image,geometry:{rows:rows.map(y=>y*scale),columns:columns.map(x=>x*scale)}};
  }finally{bitmap.close();}
}
