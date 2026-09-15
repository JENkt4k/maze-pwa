import QRCode from 'qrcode';

export async function signalQrDataUrl(value:string):Promise<string>{
  const svg=await QRCode.toString(value,{type:'svg',errorCorrectionLevel:'L',margin:2,width:256,color:{dark:'#07172f',light:'#ffffff'}});
  return`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
