import { signalQrDataUrl } from '@src/app/signalQr';
import { encodeSignal } from '@src/app/competitionRoom';

test('connection codes become self-contained SVG QR images',async()=>{
  const url=await signalQrDataUrl('infimaze-offer-code');
  expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  expect(decodeURIComponent(url)).toContain('<svg');
  expect(decodeURIComponent(url)).toContain('#07172f');
});

test('a realistic mobile WebRTC offer fits in a QR image after signal compression',async()=>{
  const candidates=Array.from({length:16},(_,index)=>
    `a=candidate:${index+1} 1 udp 2122260223 192.168.1.${index+2} ${50000+index} typ host generation 0 network-cost 999\r\n`,
  ).join('');
  const sdp=`v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=fingerprint:sha-256 8A:58:92:48:DC:07:88:1C:6A:89:2D:EA:85:CF:48:06:7C:4D:EF:7D:BD:A4:B8:CA:3D:9A:9D:E1:08:4D:22:1B\r\n${candidates}`;
  const code=encodeSignal({
    version:1,kind:'offer',roomId:'room-mobile',mazeId:'maze-mobile',
    maze:{width:41,height:41,seed:987654,g:.65,b:.35,tau:.4},
    description:{type:'offer',sdp},
  });
  expect(code.length).toBeLessThan(2950);
  const url=await signalQrDataUrl(code);
  expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
});
