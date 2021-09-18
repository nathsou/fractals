import { C1Func } from "./functions";

export interface Params {
  function: C1Func,
  colorAngleFactor: number,
  brightnessFactor: number,
  maxIterations: number,
  convergencePrecision: number,
}