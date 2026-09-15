/** @jest-environment jsdom */
import { act,render,renderHook,screen } from '@testing-library/react';
import PWABanner from '@src/app/components/PWABanner';
import { useNetworkStatus } from '@src/app/hooks/useNetworkStatus';

test('offline status follows browser connectivity events',()=>{
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
  const {result}=renderHook(()=>useNetworkStatus());
  expect(result.current).toBe(true);
  Object.defineProperty(navigator,'onLine',{configurable:true,value:false});
  act(()=>window.dispatchEvent(new Event('offline')));
  expect(result.current).toBe(false);
  Object.defineProperty(navigator,'onLine',{configurable:true,value:true});
  act(()=>window.dispatchEvent(new Event('online')));
  expect(result.current).toBe(true);
});

test('PWA banner prioritizes updates and keeps offline status visible',()=>{
  const update=jest.fn(),close=jest.fn();
  const {rerender}=render(<PWABanner online={false} offlineReady={false} needRefresh={false} error={null} onUpdate={update} onClose={close}/>);
  expect(screen.getByRole('status').textContent).toContain('You are offline');
  expect(screen.queryByRole('button',{name:'Close'})).toBeNull();
  rerender(<PWABanner online={true} offlineReady={false} needRefresh error="Offline support failed" onUpdate={update} onClose={close}/>);
  screen.getByRole('button',{name:'Update'}).click();
  expect(update).toHaveBeenCalledTimes(1);
  rerender(<PWABanner online={true} offlineReady={false} needRefresh={false} error="Offline support failed" onUpdate={update} onClose={close}/>);
  expect(screen.getByRole('status').textContent).toContain('Offline support failed');
});
