/** @jest-environment jsdom */
import { createRef } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import MazeView from '@src/app/components/MazeView';
import { useSolverPlayback } from '@src/app/hooks/useSolverPlayback';
import { createMaze } from '@src/app/maze';
import { mazeToGraph } from '@src/maze/graph';
import { solveMaze } from '@src/maze/solvers';

const data = createMaze({ width: 7, height: 7, seed: 42, g: .3, b: .15, tau: .4 });
const graph = mazeToGraph(data);
const solverRun = solveMaze(graph, 'dfs');
const renderOpts = { cell: 24, margin: 12, startIcon: '🚀', goalIcon: '🏁' };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('playback can pause, step, seek, restart, and reset for a new run', () => {
  const { result, rerender } = renderHook(
    ({ runKey, enabled }) => useSolverPlayback(4, runKey, enabled, 10),
    { initialProps: { runKey: 'first', enabled: true } },
  );

  act(() => { jest.advanceTimersToNextTimer(); });
  act(() => { jest.advanceTimersToNextTimer(); });
  expect(result.current.state.index).toBe(2);
  act(() => result.current.pause());
  act(() => { jest.advanceTimersByTime(50); });
  expect(result.current.state.index).toBe(2);
  act(() => result.current.step());
  expect(result.current.state.index).toBe(3);
  act(() => result.current.seek(4));
  expect(result.current.state.finished).toBe(true);
  act(() => result.current.play());
  expect(result.current.state.index).toBe(0);
  act(() => result.current.restart());
  expect(result.current.state.index).toBe(0);

  rerender({ runKey: 'second', enabled: true });
  expect(result.current.state.index).toBe(0);
  rerender({ runKey: 'second', enabled: false });
  expect(result.current.state.playing).toBe(false);
});

test('the maze view renders any solver event stream through one overlay', () => {
  const { container, rerender } = render(<MazeView hostRef={createRef<HTMLDivElement>()}
    data={data} graph={graph} solverRun={solverRun} solverEnabled solverEventIndex={solverRun.events.length}
    render={renderOpts} />);

  expect(container.querySelector('.solver-overlay-svg')).not.toBeNull();
  expect(container.querySelector('.solver-solution')).not.toBeNull();
  rerender(<MazeView hostRef={createRef<HTMLDivElement>()} data={data} graph={graph}
    solverRun={solveMaze(graph, 'astar')} solverEnabled={false} solverEventIndex={0} render={renderOpts} />);
  expect(container.querySelector('.solver-overlay-svg')).toBeNull();
});

test('untrusted marker content stays text in the actual SVG DOM', () => {
  const { container } = render(<MazeView hostRef={createRef<HTMLDivElement>()} data={data} graph={graph}
    solverRun={solverRun} solverEnabled={false} solverEventIndex={0}
    render={{ ...renderOpts, startIcon: '</text><image onload="alert(1)"/><text>' }} />);
  expect(container.querySelector('image')).toBeNull();
  expect(container.querySelector('text')?.textContent).toBe('</text><image onload="alert(1)"/><text>');
});
