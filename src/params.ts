import { Func } from "./functions";

export const methods = ['newton', 'halley'] as const;
export type Method = (typeof methods)[number];

export interface Params {
  function: Func,
  method: Method,
  colorShift: number,
  brightnessFactor: number,
  maxIterations: number,
  convergencePrecision: number,
}