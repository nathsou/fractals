import type { Method } from './params';
import type { Point, View } from './precision';

export type DeepRenderRequest = {
  type: 'render'; id: number; width: number; height: number;
  view: View; functionSource: string; method: Method;
  maxIterations: number; convergencePrecision: number;
  colorShift: number; brightnessFactor: number; selected?: Point;
};
export type DeepRenderResponse =
  | { type: 'tile'; id: number; x: number; y: number; width: number; height: number; pixels: ArrayBuffer; step: number }
  | { type: 'path'; id: number; points: Point[] }
  | { type: 'done'; id: number; unresolved: number; precision: number }
  | { type: 'error'; id: number; message: string };
