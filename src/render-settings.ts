import Decimal from 'decimal.js';
import type { View } from './precision';

export const MAX_RENDER_ITERATIONS = 400;
export function iterationLimit(base: number, zoom: string): number {
  return Math.min(4096, Math.ceil(base + 40 * Math.max(0, new Decimal(zoom).e)));
}

export function needsPrecise(width: number, height: number, view: View): boolean {
  const D = Decimal.clone({ precision: 32 });
  const pixel = new D(2).div(height).div(view.zoom);
  const magnitude = D.max(1, new D(view.center[0]).abs().add(new D(width).div(height).div(view.zoom)), new D(view.center[1]).abs().add(new D(1).div(view.zoom)));
  // Leave a margin for roundoff amplification during root iteration.
  return pixel.lt(magnitude.mul('0.00001'));
}
