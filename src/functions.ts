import { Complex } from "./complex";
import nerdamer from 'nerdamer';

export type C1Func = {
  f: string,
  native: (z: Complex) => Complex,
  df: string,
};

export const functions = [
  'z^3 - 1',
  'z^3 - 2 * z + 3',
  'z^4 - 1',
  'z^z - 2',
  'z^z^z - 2',
  'log(z)',
  'z^log(z + i) - 1',
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

type BuiltInFunction = 'log' | 'sin' | 'cos' | 'sqrt';

type FunctionExpr = {
  type: 'FUNCTION',
  value: BuiltInFunction,
  right: Expr,
};

type OptExpr =
  UnaryOptExpr | BinopOptExpr | FunctionOptExpr
  | ComplexNumOptExpr | RealNumberOptExpr | LiteralOptExpr;

type BinopOptExpr = {
  type: 'binary_op',
  op: '-' | '+' | '^' | '^x' | '*' | '/',
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
        default:
          return {
            type: 'complex',
            a: { type: 'real', x: Number(expr.value) },
            b: { type: 'real', x: 0 }
          };
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
          return {
            type: 'binary_op',
            op: '*',
            lhs: optimize(expr.left),
            rhs: optimize(expr.right)
          };
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
      }
    case 'complex':
      const [a] = evaluate(expr.a, z);
      const [, b] = evaluate(expr.b, z);

      return [a, b];
  }

  throw Error(`invalid expression: ${JSON.stringify(expr, null, 2)}`);
};

const glslOf = (expr: OptExpr): string => {
  switch (expr.type) {
    case 'literal':
      return expr.name;
    case 'unary_op':
      switch (expr.op) {
        case '-':
          return `(-1.0 * ${glslOf(expr.arg)})`;
      }
    case 'binary_op':
      const lhs = glslOf(expr.lhs);
      const rhs = glslOf(expr.rhs);

      switch (expr.op) {
        case '+':
          return `${lhs} + ${rhs}`;
        case '-':
          return `${lhs} - ${rhs}`;
        case '*':
          return `cplx_mult(${lhs}, ${rhs})`;
        case '/':
          return `cplx_div(${lhs}, ${rhs})`;
        case '^':
          return `cplx_pow(${lhs}, ${rhs})`;
        case '^x':
          return `cplx_pow_scalar(${lhs}, ${rhs}.x)`;
      }
    case 'func':
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
      }
    case 'real':
      const x = Number(expr.x);
      return Number.isInteger(x) ? `${x}.0` : `${x}`;
    case 'complex':
      return `vec2(${glslOf(expr.a)}, ${glslOf(expr.b)})`;
  }
};

const buildFunction = (expr: OptExpr) => (z: Complex) => evaluate(expr, z);

export const funcOf = (expr: string): C1Func => {
  const parsed = parse(expr);
  return {
    f: glslOf(parsed),
    native: buildFunction(parsed),
    df: glslOf(parse(`${nerdamer.diff(expr, 'z')}`)),
  };
};