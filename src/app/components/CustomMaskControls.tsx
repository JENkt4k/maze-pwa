import { useEffect, useRef, useState } from 'react';
import { createMask, CUSTOM_MASK_SIZE, encodeMaskPixels, type CustomMask } from '../../maze/masks';

type Props={value:CustomMask|undefined;onChange:(value:CustomMask)=>void;width:number;height:number};

export default function CustomMaskControls({value,onChange,width,height}:Props){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [error,setError]=useState<string|null>(null);
  const mask=value?createMask(width,height,'custom',value):[];
  const active=mask.flat().filter(Boolean).length;

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const context=canvas.getContext('2d');if(!context)return;
    context.clearRect(0,0,canvas.width,canvas.height);
    const cell=Math.min(canvas.width/Math.max(1,width),canvas.height/Math.max(1,height));
    context.fillStyle='#111827';
    mask.forEach((row,y)=>row.forEach((on,x)=>{if(on)context.fillRect(x*cell,y*cell,Math.ceil(cell),Math.ceil(cell));}));
  },[mask,width,height]);

  async function upload(file:File|undefined){
    if(!file)return;setError(null);
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Choose a PNG, JPEG, or WebP image smaller than 5 MB.');return;}
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();image.src=url;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=canvas.height=CUSTOM_MASK_SIZE;
      const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error();
      context.fillStyle='#fff';context.fillRect(0,0,CUSTOM_MASK_SIZE,CUSTOM_MASK_SIZE);
      const scale=Math.min((CUSTOM_MASK_SIZE-2)/image.naturalWidth,(CUSTOM_MASK_SIZE-2)/image.naturalHeight);
      const dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
      context.drawImage(image,(CUSTOM_MASK_SIZE-dw)/2,(CUSTOM_MASK_SIZE-dh)/2,dw,dh);
      const rgba=context.getImageData(0,0,CUSTOM_MASK_SIZE,CUSTOM_MASK_SIZE).data;
      const gray=new Uint8ClampedArray(CUSTOM_MASK_SIZE**2);
      for(let i=0;i<gray.length;i++){const a=rgba[i*4+3]/255;gray[i]=Math.round((.2126*rgba[i*4]+.7152*rgba[i*4+1]+.0722*rgba[i*4+2])*a+255*(1-a));}
      onChange({pixels:encodeMaskPixels(gray),threshold:value?.threshold??160,invert:value?.invert??false,name:file.name.slice(0,100)});
    }catch{setError('This image could not be opened. Please choose another file.');}
    finally{URL.revokeObjectURL(url);}
  }

  return <div className="custom-mask-controls">
    <label>Silhouette image
      <input name="custom-mask-file" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}} />
    </label>
    {error&&<p role="alert">{error}</p>}
    {value&&<>
      <label>Threshold: {value.threshold}
        <input name="mask-threshold" type="range" min="1" max="254" value={value.threshold} onChange={e=>onChange({...value,threshold:Number(e.target.value)})}/>
      </label>
      <label className="hstack" style={{alignItems:'center',gap:8}}><input name="mask-invert" type="checkbox" checked={value.invert} onChange={e=>onChange({...value,invert:e.target.checked})}/><span>Invert light and dark</span></label>
      <div className="mask-preview"><canvas ref={canvasRef} width="164" height="164" aria-label="Custom mask preview"/><span>{value.name??'Custom image'} · {active} active cells</span></div>
      {active<7&&<p role="alert">Adjust the threshold or choose a silhouette with a larger connected area.</p>}
    </>}
  </div>;
}
