import { signalQrDataUrl } from '@src/app/signalQr';

test('connection codes become self-contained SVG QR images',async()=>{
  const url=await signalQrDataUrl('infimaze-offer-code');
  expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  expect(decodeURIComponent(url)).toContain('<svg');
  expect(decodeURIComponent(url)).toContain('#07172f');
});
