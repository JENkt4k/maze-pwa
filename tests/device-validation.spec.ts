import { createDeviceValidationReport } from '@src/app/deviceValidation';

test('device report records capabilities without connection addresses or app data',()=>{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Test Browser',platform:'Test OS',language:'en-US',onLine:true,mediaDevices:{getUserMedia:()=>undefined},share:()=>undefined,clipboard:{},serviceWorker:{}}});
  Object.defineProperty(globalThis,'window',{configurable:true,value:{innerWidth:390,innerHeight:844,devicePixelRatio:3,isSecureContext:true,BarcodeDetector:class{},matchMedia:()=>({matches:true})}});
  const report=createDeviceValidationReport('cross-network','passed',' Pixel test ', 'stun','connected',true);
  expect(report).toMatchObject({version:1,scenario:'cross-network',qrScan:'passed',notes:'Pixel test',environment:{viewport:'390x844',standalone:true},capabilities:{barcodeDetector:true,camera:true,nativeShare:true,clipboard:true,serviceWorker:true},connection:{route:'stun',peerState:'connected',dataChannelOpen:true}});
  expect(JSON.stringify(report)).not.toMatch(/sdp|roomId|mazeId|player|standings|candidate/i);
});
