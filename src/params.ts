import { C1Func } from "./functions";

export interface Params {
  function: C1Func,
  colorShift: number,
  brightnessFactor: number,
  maxIterations: number,
  convergencePrecision: number,
}