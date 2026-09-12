/** @jest-environment jsdom */
import { createRef } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import MazeView from '@src/app/components/MazeView';
import { useMazeGame } from '@src/app/hooks/useMazeGame';
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

test('gameplay only follows graph edges, counts revisits, and detects completion',()=>{
  localStorage.clear();
  const data=createMaze({width:7,height:7,seed:42,g:.3,b:0,tau:.4});
  const graph=mazeToGraph(data),solution=solveMaze(graph,'bfs').path;
  const {result}=renderHook(()=>useMazeGame(graph,'game-test'));
  act(()=>result.current.start());
  act(()=>result.current.move('not-a-neighbor'));
  expect(result.current.state.moves).toBe(0);
  act(()=>result.current.move(solution[1]));
  act(()=>result.current.move(solution[0]));
  expect(result.current.state).toMatchObject({moves:2,revisits:1,status:'playing'});
  for(const node of solution.slice(1))act(()=>result.current.move(node));
  expect(result.current.state.status).toBe('complete');
  expect(result.current.state.current).toBe(graph.goals[0]);
});

test('gameplay timer advances when the graph is recreated during renders',()=>{
  localStorage.clear();
  const maze=createMaze({width:7,height:7,seed:42,g:.3,b:0,tau:.4});
  const {result}=renderHook(()=>useMazeGame(mazeToGraph(maze),'game-timer-test'));
  act(()=>result.current.start());
  act(()=>{jest.advanceTimersByTime(1250);});
  expect(result.current.state.elapsedMs).toBeGreaterThanOrEqual(1000);
  act(()=>result.current.pause());
  const pausedAt=result.current.state.elapsedMs;
  act(()=>{jest.advanceTimersByTime(1000);});
  expect(result.current.state.elapsedMs).toBe(pausedAt);
});

test('the maze view renders any solver event stream through one overlay', () => {
  const { container, rerender } = render(<MazeView hostRef={createRef<HTMLDivElement>()}
    data={data} graph={graph} solverRun={solverRun} solverEnabled solverEventIndex={solverRun.events.length}
    generationEventIndex={data.treeSteps.length} generationComplete generationColor="#14b8a6" generationOpacity={.35} solverColor="#2563eb" solverOpacity={.65}
    render={renderOpts} />);

  expect(container.querySelector('.solver-overlay-svg')).not.toBeNull();
  expect(container.querySelector('.solver-solution')).not.toBeNull();
  rerender(<MazeView hostRef={createRef<HTMLDivElement>()} data={data} graph={graph}
    solverRun={solveMaze(graph, 'astar')} solverEnabled={false} solverEventIndex={0}
    generationEventIndex={0} generationComplete={false} generationColor="#14b8a6" generationOpacity={.35} solverColor="#2563eb" solverOpacity={.65} render={renderOpts} />);
  expect(container.querySelector('.solver-overlay-svg')).toBeNull();
});

test('untrusted marker content stays text in the actual SVG DOM', () => {
  const { container } = render(<MazeView hostRef={createRef<HTMLDivElement>()} data={data} graph={graph}
    solverRun={solverRun} solverEnabled={false} solverEventIndex={0} generationEventIndex={0} generationComplete={false} generationColor="#14b8a6" generationOpacity={.35} solverColor="#2563eb" solverOpacity={.65}
    render={{ ...renderOpts, startIcon: '</text><image onload="alert(1)"/><text>' }} />);
  expect(container.querySelector('image')).toBeNull();
  expect(container.querySelector('text')?.textContent).toBe('</text><image onload="alert(1)"/><text>');
});

test('generation and solution phases render as independent layers', () => {
  const {container,rerender}=render(<MazeView hostRef={createRef<HTMLDivElement>()} data={data} graph={graph}
    solverRun={solverRun} solverEnabled solverEventIndex={0} generationEventIndex={3} generationComplete={false} generationColor="#7c3aed" generationOpacity={.6} solverColor="#2563eb" solverOpacity={.65} render={renderOpts}/>);
  expect(container.querySelectorAll('.generation-overlay-svg path')).toHaveLength(3);
  expect(container.querySelector('.generation-overlay-svg path')?.getAttribute('stroke')).toBe('#7c3aed');
  expect(container.querySelector('.generation-overlay-svg path')?.getAttribute('opacity')).toBe('0.6');
  expect(container.querySelector('.solver-overlay-svg')).toBeNull();
  rerender(<MazeView hostRef={createRef<HTMLDivElement>()} data={data} graph={graph} solverRun={solverRun}
    solverEnabled solverEventIndex={2} generationEventIndex={data.treeSteps.length} generationComplete generationColor="#14b8a6" generationOpacity={.35} solverColor="#c026d3" solverOpacity={.8} render={renderOpts}/>);
  expect(container.querySelector('.generation-complete')).not.toBeNull();
  expect(container.querySelector('.solver-overlay-svg')).not.toBeNull();
  expect(container.querySelector('.solver-expanded circle')?.getAttribute('fill')).toBe('#c026d3');
  expect(container.querySelector('.solver-expanded circle')?.getAttribute('opacity')).toBe('0.8');
});
