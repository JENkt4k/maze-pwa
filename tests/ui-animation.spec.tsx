/** @jest-environment jsdom */
import { createRef } from 'react';
import { act, render } from '@testing-library/react';
import MazeView from '@src/app/components/MazeView';

const params = {width:7,height:7,seed:42,g:.3,b:.15,tau:.4};
const renderOpts = {cell:24,margin:12,startIcon:'🚀',goalIcon:'🏁'};
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('same-size maze changes restart animation during and after a run', () => {
  const hostRef = createRef<HTMLDivElement>();
  const view = (seed:number, enabled=true) => <MazeView hostRef={hostRef} params={{...params,seed}} render={renderOpts}
    animation={{enabled,segMs:10,lingerMs:0}} />;
  const {container,rerender,unmount} = render(view(42));
  const original = container.querySelector('.dfs-overlay-svg');
  expect(original).not.toBeNull();
  act(() => { jest.advanceTimersByTime(200); });
  rerender(view(43));
  expect(container.querySelector('.dfs-overlay-svg')).not.toBe(original);
  act(() => { jest.advanceTimersByTime(450); });
  expect(container.querySelector('.dfs-overlay-svg')).not.toBeNull();
  act(() => { jest.advanceTimersByTime(200); });
  expect(container.querySelector('.dfs-overlay-svg')).toBeNull();
  rerender(view(44));
  expect(container.querySelector('.dfs-overlay-svg')).not.toBeNull();
  rerender(view(44,false));
  expect(container.querySelector('.dfs-overlay-svg')).toBeNull();
  rerender(view(44,true));
  expect(container.querySelector('.dfs-overlay-svg')).not.toBeNull();
  unmount();
  expect(jest.getTimerCount()).toBe(0);
});

test('untrusted marker content stays text in the actual SVG DOM', () => {
  const {container} = render(<MazeView hostRef={createRef<HTMLDivElement>()} params={params}
    render={{...renderOpts,startIcon:'</text><image onload="alert(1)"/><text>'}} />);
  expect(container.querySelector('image')).toBeNull();
  expect(container.querySelector('text')?.textContent).toBe('</text><image onload="alert(1)"/><text>');
});
