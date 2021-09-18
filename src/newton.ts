import { Complex } from "./complex";

const { abs: mag, div, sub, add, times } = Complex;

export const diff = (f: (z: Complex) => Complex, z: Complex, eps = Complex.of(10 ** -4, 0)) => {
  return div(sub(f(add(z, eps)), f(sub(z, eps))), times(eps, 2));
};

export const MAX_ITERS = 40;

export const newton = (
  f: (z: Complex) => Complex,
  z0: Complex,
  df = (z: Complex) => diff(f, z),
  eps = 10 ** -12,
  maxIters = MAX_ITERS
) => {
  let z = z0;

  for (let n = 0; n < maxIters; n++) {
    const delta = div(f(z), df(z));
    z = sub(z, delta);
    if (mag(delta) < eps) {
      return { z, iters: n };
    }
  }

  return { z, iters: Infinity };
};

export const newtonSteps = (
  f: (z: Complex) => Complex,
  z0: Complex,
  df = (z: Complex) => diff(f, z),
  eps = 10 ** -12,
  maxIters = MAX_ITERS
): Complex[] => {
  let z = z0;
  const steps: Complex[] = [];

  for (let n = 0; n < maxIters; n++) {
    const delta = div(f(z), df(z));
    z = sub(z, delta);
    steps.push(z);

    if (mag(delta) < eps) {
      return steps;
    }
  }

  return [];
};