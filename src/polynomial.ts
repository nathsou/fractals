import nerdamer from 'nerdamer';
import { arithmetic, type C } from './precise-function';
import type { Point } from './precision';

export const MAX_DEGREE = 8;
type Tree = { type: string; value: string; left?: Tree; right?: Tree };

// Recognize a bounded polynomial subset without approximating constants or
// accidentally accepting rational/transcendental functions as polynomials.
export function polynomial(source: string, precision = 80): Point[] | undefined {
  const m = arithmetic(precision);
  const trim = (a: C[]) => { while (a.length > 1 && m.norm(a.at(-1)!).isZero()) a.pop(); return a; };
  const sum = (a: C[], b: C[]) => trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => m.add(a[i] ?? m.c(0), b[i] ?? m.c(0))));
  const product = (a: C[], b: C[]) => {
    if (a.length + b.length - 2 > MAX_DEGREE) throw new Error('Degree limit');
    const out = Array.from({ length: a.length + b.length - 1 }, () => m.c(0));
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i+j] = m.add(out[i+j], m.mul(a[i], b[j]));
    return trim(out);
  };
  const parse = (t: Tree): C[] => {
    if (t.type === 'VARIABLE_OR_LITERAL') {
      if (t.value === 'z') return [m.c(0), m.c(1)];
      if (t.value === 'i') return [m.c(0,1)];
      // Named irrational constants are handled by the general backend.
      return [m.c(t.value)];
    }
    if (t.type !== 'OPERATOR' || !t.left) throw new Error('Not polynomial');
    const a = parse(t.left);
    if (!t.right && t.value === '-') return a.map(m.neg);
    if (!t.right) throw new Error('Missing operand');
    const b = parse(t.right);
    switch (t.value) {
      case '+': return sum(a,b);
      case '-': return sum(a,b.map(m.neg));
      case '*': return product(a,b);
      case '/': if (b.length === 1 && !m.norm(b[0]).isZero()) return a.map(v => m.div(v,b[0])); break;
      case '^': {
        if (b.length !== 1 || !b[0][1].isZero() || !b[0][0].isInteger()) break;
        const n = b[0][0].toNumber();
        if (n < 0 || n > MAX_DEGREE) break;
        let out = [m.c(1)];
        for (let i = 0; i < n; i++) out = product(out,a);
        return out;
      }
    }
    throw new Error('Not polynomial');
  };
  try {
    const coefficients = trim(parse((nerdamer as unknown as { tree(s: string): Tree }).tree(source)));
    if (coefficients.length < 2 || coefficients.some(z => z.some(v => !v.isFinite()))) return undefined;
    return coefficients.map(z => [z[0].toString(), z[1].toString()]);
  } catch { return undefined; }
}
