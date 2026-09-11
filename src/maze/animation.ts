export type AnimationMode = 'build-solve' | 'build' | 'solve';

export const ANIMATION_MODES: Readonly<Record<AnimationMode, string>> = {
  'build-solve': 'Build + Solve',
  build: 'Build only',
  solve: 'Solve only',
};
