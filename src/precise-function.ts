import Decimal from 'decimal.js';
import nerdamer from 'nerdamer';
import type { Point } from './precision';

export type C = [Decimal, Decimal];
type Jet = [C, C, C]; // value, first derivative, second derivative
type Tree = { type: string; value: string; left?: Tree; right?: Tree };

export function arithmetic(precision: number) {
  const D = Decimal.clone({ precision });
  const c = (x: Decimal.Value, y: Decimal.Value = 0): C => [new D(x), new D(y)];
  const add = (a: C, b: C): C => [a[0].add(b[0]), a[1].add(b[1])];
  const neg = (a: C): C => [a[0].neg(), a[1].neg()];
  const sub = (a: C, b: C): C => add(a, neg(b));
  const mul = (a: C, b: C): C => [a[0].mul(b[0]).sub(a[1].mul(b[1])), a[0].mul(b[1]).add(a[1].mul(b[0]))];
  const norm = (a: C) => a[0].mul(a[0]).add(a[1].mul(a[1]));
  const div = (a: C, b: C): C => {
    const d = norm(b);
    return [a[0].mul(b[0]).add(a[1].mul(b[1])).div(d), a[1].mul(b[0]).sub(a[0].mul(b[1])).div(d)];
  };
  const exp = (a: C): C => [a[0].exp().mul(a[1].cos()), a[0].exp().mul(a[1].sin())];
  const log = (a: C): C => [norm(a).ln().div(2), D.atan2(a[1], a[0])];
  const sin = (a: C): C => [a[0].sin().mul(a[1].cosh()), a[0].cos().mul(a[1].sinh())];
  const cos = (a: C): C => [a[0].cos().mul(a[1].cosh()), a[0].sin().mul(a[1].sinh()).neg()];
  const integerPower = (a: C, n: number): C => {
    if (n < 0) return div(c(1), integerPower(a, -n));
    let result = c(1), base = a;
    while (n > 0) {
      if (n % 2) result = mul(result, base);
      n = Math.floor(n / 2);
      if (n) base = mul(base, base);
    }
    return result;
  };
  return { D, c, add, sub, neg, mul, div, norm, exp, log, sin, cos, integerPower };
}

export function compilePrecise(source: string, precision: number) {
  const A = arithmetic(precision);
  const { D, c, add, neg, mul, div, exp, log, sin, cos, integerPower } = A;
  const constant = (v: C): Jet => [v, c(0), c(0)];
  const sum = (a: Jet, b: Jet): Jet => [add(a[0], b[0]), add(a[1], b[1]), add(a[2], b[2])];
  const product = (a: Jet, b: Jet): Jet => [
    mul(a[0], b[0]), add(mul(a[1], b[0]), mul(a[0], b[1])),
    add(add(mul(a[2], b[0]), mul(c(2), mul(a[1], b[1]))), mul(a[0], b[2])),
  ];
  const compose = (a: Jet, value: C, first: C, second: C): Jet => [
    value, mul(first, a[1]), add(mul(second, mul(a[1], a[1])), mul(first, a[2])),
  ];
  const inverse = (a: Jet): Jet => compose(a, div(c(1), a[0]), neg(div(c(1), integerPower(a[0], 2))), div(c(2), integerPower(a[0], 3)));
  const logarithm = (a: Jet): Jet => compose(a, log(a[0]), div(c(1), a[0]), neg(div(c(1), integerPower(a[0], 2))));
  const exponential = (a: Jet): Jet => { const e = exp(a[0]); return compose(a, e, e, e); };
  type Eval = (z: C) => Jet;
  const compile = (tree: Tree): Eval => {
    if (tree.type === 'VARIABLE_OR_LITERAL') {
      if (tree.value === 'z') return z => [z, c(1), c(0)];
      let value: C;
      switch (tree.value) {
        case 'i': value = c(0, 1); break;
        case 'e': value = c(new D(1).exp()); break;
        case 'pi': value = c(D.acos(-1)); break;
        case 'tau': value = c(D.acos(-1).mul(2)); break;
        case 'phi': value = c(new D(5).sqrt().add(1).div(2)); break;
        default: value = c(tree.value);
      }
      const jet = constant(value);
      return () => jet;
    }
    if (tree.type === 'FUNCTION' && tree.right) {
      const arg = compile(tree.right);
      switch (tree.value) {
        case 'exp': return z => exponential(arg(z));
        case 'log': return z => logarithm(arg(z));
        case 'sin': return z => { const a = arg(z); return compose(a, sin(a[0]), cos(a[0]), neg(sin(a[0]))); };
        case 'cos': return z => { const a = arg(z); return compose(a, cos(a[0]), neg(sin(a[0])), neg(cos(a[0]))); };
        case 'sqrt': return z => exponential(product(constant(c('0.5')), logarithm(arg(z))));
      }
    }
    if (tree.type === 'OPERATOR' && tree.left) {
      const left = compile(tree.left);
      if (!tree.right && tree.value === '-') return z => left(z).map(neg) as Jet;
      if (!tree.right) throw new Error('Missing operand');
      const right = compile(tree.right);
      switch (tree.value) {
        case '+': return z => sum(left(z), right(z));
        case '-': return z => sum(left(z), right(z).map(neg) as Jet);
        case '*': return z => product(left(z), right(z));
        case '/': return z => product(left(z), inverse(right(z)));
        case '^': {
          // Integer powers avoid log/atan and preserve tiny imaginary offsets.
          if (tree.right.type === 'VARIABLE_OR_LITERAL' && /^\d+$/.test(tree.right.value)) {
            const n = Number(tree.right.value);
            if (Number.isSafeInteger(n)) return z => {
              if (n === 0) return constant(c(1));
              const a = left(z);
              if (n === 1) return a;
              return compose(a, integerPower(a[0], n), mul(c(n), integerPower(a[0], n - 1)), mul(c(new D(n).mul(n - 1)), integerPower(a[0], n - 2)));
            };
          }
          return z => exponential(product(right(z), logarithm(left(z))));
        }
      }
    }
    throw new Error(`Unsupported expression: ${tree.value}`);
  };
  // Nerdamer's syntax tree retains numeric tokens as strings. Do not use its
  // Number-based optimizer or numerical evaluation in the precise backend.
  const tree = (nerdamer as unknown as { tree: (s: string) => Tree }).tree(source);
  const evaluate = compile(tree);
  return { ...A, evaluate, point: (p: Point): C => c(p[0], p[1]), serialize: (p: C): Point => [p[0].toString(), p[1].toString()] };
}
