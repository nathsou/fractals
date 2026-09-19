// Bound the first preview to at most 16 × 16 samples, independent of DPR or
// viewport size. Successive passes halve the block size until every pixel has
// been evaluated. A fixed 16-pixel first pass is far too costly on Retina screens.
export function refinementSteps(width: number, height: number): number[] {
  const first = Math.max(16, 2 ** Math.ceil(Math.log2(Math.max(width, height) / 16)));
  const steps: number[] = [];
  for (let step = first; step >= 1; step /= 2) steps.push(step);
  return steps;
}
