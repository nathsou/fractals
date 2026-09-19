import test from 'node:test';
import assert from 'node:assert/strict';
import { polynomial } from '../src/polynomial';
import { referenceOrbit } from '../src/perturbation-reference';
import { arithmetic } from '../src/precise-function';

test('polynomial recognition is bounded and preserves exact coefficients',()=>{
  assert.deepEqual(polynomial('(z-1)^2-1'),[['0','0'],['-2','0'],['1','0']]);
  assert.deepEqual(polynomial('z^3+i/2'),[['0','0.5'],['0','0'],['0','0'],['1','0']]);
  for(const source of ['sin(z)','z^z','1/z','z^9','log(z)']) assert.equal(polynomial(source),undefined);
});

test('factored polynomial perturbation agrees with independent Newton steps',()=>{
  const m=arithmetic(160),{c,add,sub,mul,div,norm}=m;
  const z=c('0.31','0.78'),d=c('1e-60','-2e-60');
  const f=(v:ReturnType<typeof c>)=>sub(mul(mul(v,v),v),c(1));
  const fp=(v:ReturnType<typeof c>)=>mul(c(3),mul(v,v));
  const r=div(f(z),fp(z));
  const b=add(mul(c(6),z),mul(c(3),d)),t=add(mul(c(3),z),d);
  const actual=div(mul(d,add(mul(d,sub(b,t)),mul(r,b))),add(fp(z),mul(d,b)));
  const expected=sub(sub(add(z,d),div(f(add(z,d)),fp(add(z,d)))),sub(z,r));
  assert(norm(sub(actual,expected)).lt('1e-310'));
});

test('reference encoding retains tiny offsets and beyond-Float64 pole excursions at 1e180',()=>{
  const result=referenceOrbit({id:1,source:'z^3-1',view:{center:['0','0'],zoom:'1e180'},width:64,height:64,iterations:2500,region:{x:0,y:0,width:64,height:64,depth:0}});
  assert(result.length>2000);
  assert(result.exponent < -590);
  assert([...result.data].every(Number.isFinite));
  const stride=result.degree+3;
  const zExponent=(row:number)=>result.data[4*(row*stride+result.degree+1)+2];
  assert(zExponent(0)<-590);
  assert(zExponent(1)>1024);
});
