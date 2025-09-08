// tests/stats.spec.ts
import { createMaze } from "@src/app/maze";
test("stats are stable", () => {
  const { stats } = createMaze({ width:19, height:19, seed:42, g:0.3, b:0.15, tau:0.4 });
  expect(stats).toEqual({ L: expect.any(Number), T: expect.any(Number), J: expect.any(Number), E: expect.any(Number), D:  expect.any(Number) });
  expect(stats.D).toBeCloseTo(6.499, 3); //5.185, 3); // replace with the known-good number from main
});
