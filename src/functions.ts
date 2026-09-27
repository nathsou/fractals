import { Complex } from "./complex";
import nerdamer from 'nerdamer';

export type Func = {
  f: (z: string) => string,
  native: (z: Complex) => Complex,
  diff: (n?: number) => (z: string) => string,
};

export const functions = [
  'z^3 - 1',
  '(z - 1)^2 - 1',
  'z^3 - 2 * z + 3',
  'z^4 - 1',
  'z^z - 2',
  'log(z)',
  'z^log(z + i) - 1',
  'sin(z) * cos(z)',
  'exp(z) - z^5',
];

type Expr = OperatorExpr | VariableOrLiteralExpr | FunctionExpr;

type OperatorExpr = {
  type: 'OPERATOR',
  value: '-' | '+' | '^' | '*' | '/',
  left: Expr,
  right: Expr,
};

type VariableOrLiteralExpr = {
  type: 'VARIABLE_OR_LITERAL',
  value: string,
};

type BuiltInFunction = 'log' | 'sin' | 'cos' | 'sqrt' | 'exp';

type FunctionExpr = {
  type: 'FUNCTION',
  value: BuiltInFunction,
  right: Expr,
};

type OptExpr =
  UnaryOptExpr | BinopOptExpr | FunctionOptExpr |
  ComplexNumOptExpr | RealNumberOptExpr | LiteralOptExpr | ParseError;

type ParseError = {
  type: 'error',
  message: string,
};

type BinopOptExpr = {
  type: 'binary_op',
  op: '-' | '+' | '^' | '^x' | '*' | '*x' | 'x*y' | '/',
  lhs: OptExpr,
  rhs: OptExpr,
};

type UnaryOptExpr = {
  type: 'unary_op',
  op: '-',
  arg: OptExpr,
};

type FunctionOptExpr = {
  type: 'func',
  value: BuiltInFunction,
  arg: OptExpr,
};

type RealNumberOptExpr = {
  type: 'real',
  x: number,
};

type LiteralOptExpr = {
  type: 'literal',
  name: string,
};

type ComplexNumOptExpr = {
  type: 'complex',
  a: OptExpr,
  b: OptExpr,
};


const optimize = (expr: Expr): OptExpr => {
  switch (expr.type) {
    case 'VARIABLE_OR_LITERAL':
      switch (expr.value) {
        case 'z':
          return {
            type: 'literal',
            name: 'z'
          };
        case 'i':
          return {
            type: 'complex',
            a: { type: 'real', x: 0 },
            b: { type: 'real', x: 1 }
          };
        case 'e':
          return {
            type: 'complex',
            a: { type: 'real', x: Math.E },
            b: { type: 'real', x: 0 }
          };
        case 'pi':
          return {
            type: 'complex',
            a: { type: 'real', x: Math.PI },
            b: { type: 'real', x: 0 }
          };
        case 'tau':
          return {
            type: 'complex',
            a: { type: 'real', x: 2 * Math.PI },
            b: { type: 'real', x: 0 }
          };
        case 'phi':
          return {
            type: 'complex',
            a: { type: 'real', x: (1 + Math.sqrt(5)) / 2 },
            b: { type: 'real', x: 0 }
          };
        default: {
          const a = Number(expr.value);
          if (Number.isNaN(a)) {
            return {
              type: 'error',
              message: `unknown variable '${expr.value}'`
            };
          }

          return {
            type: 'complex',
            a: { type: 'real', x: a },
            b: { type: 'real', x: 0 }
          };
        }
      }
    case 'OPERATOR':
      switch (expr.value) {
        case '+': {
          const lhs = optimize(expr.left);
          const rhs = optimize(expr.right);

          if (lhs.type === 'complex' && rhs.type === 'complex') {
            return {
              type: 'complex',
              a: {
                type: 'binary_op',
                op: '+',
                lhs: lhs.a,
                rhs: rhs.a,
              },
              b: {
                type: 'binary_op',
                op: '+',
                lhs: lhs.b,
                rhs: rhs.b,
              },
            };
          }

          return {
            type: 'binary_op',
            op: '+',
            lhs,
            rhs,
          };
        }
        case '-': {
          if (expr.right === undefined) {
            return {
              type: 'unary_op',
              op: '-',
              arg: optimize(expr.left),
            };
          }

          const lhs = optimize(expr.left);
          const rhs = optimize(expr.right);

          if (lhs.type === 'complex' && rhs.type === 'complex') {
            return {
              type: 'complex',
              a: {
                type: 'binary_op',
                op: '-',
                lhs: lhs.a,
                rhs: rhs.a,
              },
              b: {
                type: 'binary_op',
                op: '-',
                lhs: lhs.b,
                rhs: rhs.b,
              },
            };
          }

          return {
            type: 'binary_op',
            op: '-',
            lhs,
            rhs,
          };
        }
        case '*':
          const lhs = optimize(expr.left);
          const rhs = optimize(expr.right);

          const isLhsReal =
            lhs.type === 'complex'
            && lhs.b.type === 'real'
            && lhs.b.x === 0;

          const isRhsReal =
            rhs.type === 'complex'
            && rhs.b.type === 'real'
            && rhs.b.x === 0;


          if (!isLhsReal && isRhsReal) {
            return { type: 'binary_op', op: '*x', lhs, rhs };
          }

          if (isLhsReal && !isRhsReal) {
            return { type: 'binary_op', op: '*x', lhs: rhs, rhs: lhs };
          }

          if (isLhsReal && isRhsReal) {
            return { type: 'binary_op', op: 'x*y', lhs, rhs };
          }

          return { type: 'binary_op', op: '*', lhs, rhs };
        case '/':
          return {
            type: 'binary_op',
            op: '/',
            lhs: optimize(expr.left),
            rhs: optimize(expr.right)
          };
        case '^': {
          const lhs = optimize(expr.left);
          const rhs = optimize(expr.right);

          if (
            lhs.type === 'complex' &&
            lhs.a.type === 'real' &&
            lhs.a.x === Math.E &&
            lhs.b.type === 'real' &&
            lhs.b.x === 0
          ) {
            return {
              type: 'func',
              value: 'exp',
              arg: rhs,
            };
          }

          const isRhsReal =
            rhs.type === 'complex'
            && rhs.b.type === 'real'
            && rhs.b.x === 0;

          return {
            type: 'binary_op',
            op: isRhsReal ? '^x' : '^',
            lhs,
            rhs,
          };
        }
      }
    case 'FUNCTION':
      return {
        type: 'func',
        value: expr.value,
        arg: optimize(expr.right),
      };
  }
};

const parse = (expr: string): OptExpr => {
  /// @ts-ignore (nerdamer.tree is untyped)
  return optimize(nerdamer.tree(expr));
};

const evaluate = (expr: OptExpr, z: Complex): Complex => {
  switch (expr.type) {
    case 'literal':
      switch (expr.name) {
        case 'z':
          return z;
      }
      break;
    case 'real':
      return [expr.x, 0];
    case 'unary_op':
      switch (expr.op) {
        case '-':
          return Complex.times(evaluate(expr.arg, z), -1);
      }
    case 'binary_op':
      const lhs = evaluate(expr.lhs, z);
      const rhs = evaluate(expr.rhs, z);
      switch (expr.op) {
        case '+':
          return Complex.add(lhs, rhs);
        case '-':
          return Complex.sub(lhs, rhs);
        case '*':
          return Complex.mult(lhs, rhs);
        case '*x':
          return Complex.times(lhs, rhs[0]);
        case 'x*y':
          return [lhs[0] * rhs[0], 0];
        case '/':
          return Complex.div(lhs, rhs);
        case '^':
          return Complex.pow(lhs, rhs);
        case '^x':
          return Complex.powScalar(lhs, rhs[0]);
      }
    case 'func':
      const arg = evaluate(expr.arg, z);

      switch (expr.value) {
        case 'log':
          return Complex.ln(arg);
        case 'sin':
          return Complex.sin(arg);
        case 'cos':
          return Complex.cos(arg);
        case 'sqrt':
          return Complex.powScalar(arg, 0.5);
        case 'exp':
          return Complex.exp(arg);
      }
    case 'complex':
      const [a] = evaluate(expr.a, z);
      const [, b] = evaluate(expr.b, z);

      return [a, b];
  }

  throw Error(`invalid expression: ${JSON.stringify(expr, null, 2)}`);
};

const glslOf = (expr: OptExpr): string => {
  const getX = (vec2: string): string => {
    const match = /vec2\((\d*\.\d+), (\d*\.\d+)\)/.exec(vec2);

    if (match !== null) {
      return match[1];
    } else {
      return `${vec2}.x`;
    }
  };

  switch (expr.type) {
    case 'literal':
      return expr.name;
    case 'unary_op':
      switch (expr.op) {
        case '-':
          return `(-1.0 * ${glslOf(expr.arg)})`;
      }
    case 'binary_op': {
      const lhs = glslOf(expr.lhs);
      const rhs = glslOf(expr.rhs);

      switch (expr.op) {
        case '+':
          return `${lhs} + ${rhs}`;
        case '-':
          return `${lhs} - ${rhs}`;
        case '*':
          return `cplx_mult(${lhs}, ${rhs})`;
        case '*x':
          return `${lhs} * ${getX(rhs)}`;
        case 'x*y':
          return `${getX(lhs)} * ${getX(rhs)}`;
        case '/':
          return `cplx_div(${lhs}, ${rhs})`;
        case '^':
          return `cplx_pow(${lhs}, ${rhs})`;
        case '^x':
          return `cplx_pow_scalar(${lhs}, ${getX(rhs)})`;
      }
    }
    case 'func': {
      const arg = glslOf(expr.arg);

      switch (expr.value) {
        case 'log':
          return `cplx_ln(${arg})`;
        case 'sin':
          return `cplx_sin(${arg})`;
        case 'cos':
          return `cplx_cos(${arg})`;
        case 'sqrt':
          return `cplx_pow_scalar(${arg}, 0.5)`;
        case 'exp':
          return `cplx_exp(${arg})`;
      }
    }
    case 'real': {
      const x = Number(expr.x);
      return Number.isInteger(x) ? `${x}.0` : `${x}`;
    }
    case 'complex':
      return `vec2(${glslOf(expr.a)}, ${glslOf(expr.b)})`;
    case 'error':
      throw expr;
  }

};

const buildFunction = (expr: OptExpr) => (z: Complex) => evaluate(expr, z);

const subst = (what: string, by: string, str: string) => str.replaceAll(what, `(${by})`);

export const funcOf = (expr: string): Func => {
  const parsed = parse(expr);
  return {
    f: (z: string) => subst('z', z, glslOf(parsed)),
    native: buildFunction(parsed),
    diff: n => (z: string) => subst('z', z, glslOf(
      parse(`${nerdamer.diff(expr, 'z', n)}`)
    ))
  };
};