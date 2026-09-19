import { Method } from './params';

export type DeepRenderRequest = {
  type: 'render',
  id: number,
  width: number,
  height: number,
  zoom: number,
  center: { x: number, y: number },
  functionSource: string,
  method: Method,
  maxIterations: number,
  convergencePrecision: number,
  colorShift: number,
  brightnessFactor: number,
};

export type DeepRenderResponse = {
  type: 'rendered',
  id: number,
  width: number,
  height: number,
  pixels: ArrayBuffer,
};
