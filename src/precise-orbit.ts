import type { Method } from './params';
import { compilePrecise, type C } from './precise-function';
import { MAX_PRECISION, precisionFor, type Point, type View } from './precision';

export type Orbit = { root: Point; iterations: number; converged: boolean; path: Point[] };

export function orbit(math: ReturnType<typeof compilePrecise>, initial: Point, method: Method, limit: number, tolerance: string, path = false): Orbit {
  const { c, add, sub, mul, div, norm, evaluate, serialize, D } = math;
  let z = math.point(initial), older = z;
  const points: Point[] = path ? [initial] : [];
  const eps = D.max(new D(10).pow(-D.precision + 8), D.min(tolerance, new D(10).pow(-D.precision + 16)));
  const eps2 = eps.mul(eps);
  const finish = (n: number, converged: boolean): Orbit => ({ root: serialize(z), iterations: n, converged, path: points });
  for (let n = 0; n < limit; n++) {
    if (!z.every(v => v.isFinite())) return finish(n, false);
    const [fz, df, ddf] = evaluate(z);
    if (norm(fz).isZero()) return finish(n, true);
    let delta: C;
    if (method === 'halley') {
      delta = div(mul(c(2), mul(fz, df)), sub(mul(c(2), mul(df, df)), mul(fz, ddf)));
    } else if (method === 'steffensen') {
      delta = div(mul(fz, fz), sub(evaluate(add(z, fz))[0], fz));
    } else if (method === 'secant' && n > 0) {
      delta = div(mul(fz, sub(z, older)), sub(fz, evaluate(older)[0]));
    } else {
      delta = div(fz, df);
    }
    older = z;
    z = sub(z, delta);
    if (path && z.every(v => v.isFinite())) points.push(serialize(z));
    if (!z.every(v => v.isFinite())) return finish(n + 1, false);
    if (norm(delta).lte(eps2.mul(D.max(1, norm(z)))) && norm(evaluate(z)[0]).lte(eps2)) return finish(n + 1, true);
  }
  return finish(limit, false);
}

export function pixelPoint(math: ReturnType<typeof compilePrecise>, view: View, x: number, y: number, width: number, height: number): Point {
  const { D } = math;
  return [
    new D(view.center[0]).add(new D(x).mul(2).sub(width).div(height).div(view.zoom)).toString(),
    new D(view.center[1]).add(new D(height).sub(new D(y).mul(2)).div(height).div(view.zoom)).toString(),
  ];
}

export function adaptiveSampler(source: string, view: View, width: number, height: number, method: Method, limit: number, tolerance: string) {
  const initialPrecision = precisionFor(view, height);
  if (initialPrecision + 24 > MAX_PRECISION) throw new Error('Zoom exceeds the supported precision budget');
  const cache = new Map<number, ReturnType<typeof compilePrecise>>();
  const mathAt = (p: number) => {
    if (!cache.has(p)) cache.set(p, compilePrecise(source, p));
    return cache.get(p)!;
  };
  let highestPrecision = initialPrecision;
  const run = (p: number, x: number, y: number, budget: number) => {
    const math = mathAt(p);
    highestPrecision = Math.max(highestPrecision, p);
    return orbit(math, pixelPoint(math, view, x, y, width, height), method, budget, tolerance);
  };
  const sample = (x: number, y: number): Orbit => {
    let p = initialPrecision;
    let previous = run(p, x, y, limit);
    for (let attempt = 0; attempt < 3 && p + 24 <= MAX_PRECISION; attempt++) {
      p += 24;
      const next = run(p, x, y, Math.min(4096, limit * 2 ** (attempt + 1)));
      const m = mathAt(p);
      const difference = m.norm(m.sub(m.point(previous.root), m.point(next.root)));
      const agreement = new m.D(10).pow(-2 * (initialPrecision - 20)).mul(m.D.max(1, m.norm(m.point(next.root))));
      if (previous.converged && next.converged && difference.lt(agreement)) return next;
      previous = next;
    }
    return { ...previous, converged: false };
  };
  return { sample, math: mathAt(initialPrecision + 24), precision: () => highestPrecision };
}
