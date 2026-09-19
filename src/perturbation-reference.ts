import { arithmetic } from './precise-function';
import { polynomial } from './polynomial';
import { precisionFor, MAX_PRECISION, type View } from './precision';

export type Region = { x: number; y: number; width: number; height: number; depth: number; anchor?: [number,number] };
export type ReferenceRequest = { id: number; source: string; view: View; width: number; height: number; iterations: number; region: Region };
export type Reference = { id: number; region: Region; degree: number; length: number; data: Float32Array<ArrayBuffer>; anchor: [number,number]; scale: number; exponent: number; precision: number };

export function referenceOrbit(request: ReferenceRequest): Reference {
  const precision = Math.min(MAX_PRECISION, precisionFor(request.view, request.height) + 24);
  const m = arithmetic(precision), { D, c, add, mul, div, sub, norm } = m;
  // Only the exponent estimate needs native math. The mantissa is divided
  // in decimal arithmetic below, without converting the full value to Number.
  const binaryExponent = (value: InstanceType<typeof D>) => value.isZero() ? 0 :
    Math.floor(value.e * Math.LOG2E * Math.LN10 + Math.log2(Number(value.toExponential(8).split('e')[0])));
  const coefficients = polynomial(request.source, precision);
  if (!coefficients) throw new Error('Unsupported polynomial');
  const a = coefficients.map(z => c(z[0],z[1]));
  const degree = a.length - 1;
  const { region } = request;
  // Offset references avoid selecting a symmetry-axis pole at the screen center.
  const anchor: [number,number] = region.anchor ?? [region.x + region.width * 0.4375, region.y + region.height * 0.5625];
  let z = c(
    new D(request.view.center[0]).add(new D(anchor[0]).mul(2).sub(request.width).div(request.height).div(request.view.zoom)),
    new D(request.view.center[1]).add(new D(request.height).sub(new D(anchor[1]).mul(2)).div(request.height).div(request.view.zoom)),
  );
  const zoom = new D(request.view.zoom);
  const exponent = binaryExponent(new D(1).div(zoom));
  const scale = new D(1).div(zoom).div(new D(2).pow(exponent)).toNumber();
  const stride = degree + 3;
  const data = new Float32Array(stride * request.iterations * 4);
  let length = 0;
  for (let n = 0; n < request.iterations; n++) {
    // Generalized Horner evaluates coefficients of f(Z + delta) in high precision.
    const t = Array.from({ length: degree + 1 }, () => c(0));
    t[0] = a[degree];
    for (let j = degree - 1; j >= 0; j--) {
      for (let k = degree - j; k > 0; k--) t[k] = add(mul(t[k],z),t[k-1]);
      t[0] = add(mul(t[0],z),a[j]);
    }
    if (norm(t[1]).isZero()) break;
    const correction = div(t[0],t[1]);
    const row = [...t,z,correction];
    if (row.some(v => v.some(x => !x.isFinite()))) break;
    // Float mantissas plus independent binary exponents: neither a tiny
    // displacement nor a huge Newton excursion is converted to a JS float.
    row.forEach((v,k) => {
      const magnitude = D.max(v[0].abs(),v[1].abs());
      const e = binaryExponent(magnitude);
      const unit = new D(2).pow(e);
      data[4*(n*stride+k)] = v[0].div(unit).toNumber();
      data[4*(n*stride+k)+1] = v[1].div(unit).toNumber();
      data[4*(n*stride+k)+2] = e;
    });
    length++;
    z = sub(z,correction);
    if (norm(t[0]).lt(new D(10).pow(-2*(precision-12)))) break;
  }
  return { id: request.id, region, degree, length, data, anchor, scale, exponent, precision };
}
