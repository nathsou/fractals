
export type Complex = [number, number];
export const Complex = {
  zero: () => Complex.of(0, 0),
  one: () => Complex.of(1, 0),
  i: () => Complex.of(0, 1),
  NaN: () => Complex.of(NaN, NaN),
  isNaN: ([a, b]: Complex) => Number.isNaN(a) || Number.isNaN(b),
  isReal: ([_, b]: Complex) => b === 0,
  isImaginary: ([a, b]: Complex) => a === 0 && b !== 0,
  of: (a: number, b: number): Complex => [a, b],
  add: ([a, b]: Complex, [c, d]: Complex): Complex => [a + c, b + d],
  sub: ([a, b]: Complex, [c, d]: Complex): Complex => [a - c, b - d],
  times: ([a, b]: Complex, k: number): Complex => [a * k, b * k],
  mult: ([a, b]: Complex, [c, d]: Complex): Complex => [
    a * c - b * d,
    a * d + c * b
  ],
  div: ([a, b]: Complex, [c, d]: Complex): Complex => {
    const k = c * c + d * d;

    if (k === 0) {
      return Complex.NaN();
    }

    return [
      (a * c + b * d) / k,
      (b * c - a * d) / k
    ];
  },
  powScalar: (c: Complex, k: number): Complex => {
    const magCPowK = Math.pow(Complex.abs(c), k);
    const v = k * Complex.arg(c);
    return [magCPowK * Math.cos(v), magCPowK * Math.sin(v)];
  },
  pow: (z: Complex, [c, d]: Complex): Complex => {
    const p = Complex.abs(z);
    const theta = Complex.arg(z);
    const v = d * Math.log(p) + c * theta;
    const k = (p ** c) * Math.exp(-d * theta);
    return [k * Math.cos(v), k * Math.sin(v)];
  },
  abs: ([a, b]: Complex) => Math.sqrt(a * a + b * b),
  arg: ([a, b]: Complex) => Math.atan2(b, a),
  conj: ([a, b]: Complex): Complex => [a, -b],
  dist: (z: Complex, w: Complex) => Complex.abs(Complex.sub(z, w)),
  ln: (z: Complex): Complex => [Math.log(Complex.abs(z)), Complex.arg(z)],
  sin: (z: Complex): Complex => {
    const { add, sub, mult, div } = Complex;

    const z2 = mult(z, z);
    const z3 = mult(z, z2);
    const z5 = mult(z3, z2);
    const z7 = mult(z5, z2);
    const z9 = mult(z7, z2);
    const z11 = mult(z9, z2);
    const z13 = mult(z11, z2);
    const z15 = mult(z13, z2);

    const t2 = div(z3, [6.0, 0.0]);
    const t3 = div(z5, [120.0, 0.0]);
    const t4 = div(z7, [5040.0, 0.0]);
    const t5 = div(z9, [362880.0, 0.0]);
    const t6 = div(z11, [39916800.0, 0.0]);
    const t7 = div(z13, [6227020800.0, 0.0]);
    const t8 = div(z15, [1307674368000.0, 0.0]);

    return sub(add(sub(add(sub(add(sub(z, t2), t3), t4), t5), t6), t7), t8);
  },
  cos: (z: Complex): Complex => {
    const { add, sub, mult, div } = Complex;

    const z2 = mult(z, z);
    const z4 = mult(z2, z2);
    const z6 = mult(z4, z2);
    const z8 = mult(z6, z2);
    const z10 = mult(z8, z2);
    const z12 = mult(z10, z2);
    const z14 = mult(z12, z2);

    const t2 = div(z2, [2.0, 0.0]);
    const t3 = div(z4, [24.0, 0.0]);
    const t4 = div(z6, [720.0, 0.0]);
    const t5 = div(z8, [40320.0, 0.0]);
    const t6 = div(z10, [3628800.0, 0.0]);
    const t7 = div(z12, [479001600.0, 0.0]);
    const t8 = div(z14, [87178291200.0, 0.0]);

    return sub(add(sub(add(sub(add(sub(z, t2), t3), t4), t5), t6), t7), t8);
  },
  exp: ([a, b]: Complex) => Complex.times([Math.cos(b), Math.sin(b)], Math.exp(a)),
};