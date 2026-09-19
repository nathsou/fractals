import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Camera, precisionFor } from '../src/precision';
import { compilePrecise } from '../src/precise-function';
import { adaptiveSampler, orbit, pixelPoint } from '../src/precise-orbit';
import { needsPrecise } from '../src/render-settings';
import { functions } from '../src/functions';

test('camera preserves distinct pixels and sub-Float64 pans at 1e100 zoom', () => {
  const camera = new Camera();
  camera.center = ['1', '-0.5']; camera.zoom = '1e100';
  const first = camera.point(400, 300, 800, 600);
  const second = camera.point(401, 300, 800, 600);
  assert.notEqual(first[0], second[0]);
  assert.equal(Number(first[0]), Number(second[0]));
  camera.pan(1, 0, 600);
  assert.notEqual(camera.center[0], '1');
  assert.deepEqual(camera.project(first, 800, 600), [401, 300]);
  const anchor = camera.point(130, 240, 800, 600);
  camera.zoomAt(130, 240, 800, 600, '1.1');
  const projected = camera.project(anchor, 800, 600);
  assert.ok(Math.abs(projected[0] - 130) < 1e-9);
  assert.ok(Math.abs(projected[1] - 240) < 1e-9);
});

test('precision scales with zoom and fallback precedes Float32 collapse', () => {
  assert.ok(precisionFor({ center: ['1','0'], zoom: '1e100' }, 1000) > 130);
  assert.equal(needsPrecise(1000, 1000, { center: ['0','0'], zoom: '1' }), false);
  assert.equal(needsPrecise(1000, 1000, { center: ['1','0'], zoom: '1000' }), true);
});

test('literal digits, imaginary constants, polynomial derivatives stay precise', () => {
  const m = compilePrecise('z^3 + 0.12345678901234567890123456789 + i', 80);
  const [v, d, dd] = m.evaluate(m.c(2));
  assert.equal(v[0].toString(), '8.12345678901234567890123456789');
  assert.equal(v[1].toString(), '1');
  assert.equal(d[0].toString(), '12'); assert.equal(dd[0].toString(), '12');
  const tiny = m.evaluate(m.c(1, '1e-70'))[0][1].sub(1);
  assert.ok(tiny.gt(0));
});

test('complex transcendental functions and their derivatives use full precision', () => {
  const m = compilePrecise('sin(z)^2 + cos(z)^2', 80);
  const [v, d, dd] = m.evaluate(m.c('0.7', '1.2'));
  assert.ok(m.norm(m.sub(v, m.c(1))).lt('1e-140'));
  assert.ok(m.norm(d).lt('1e-140')); assert.ok(m.norm(dd).lt('1e-140'));
  const e = compilePrecise('log(exp(z))', 80);
  const z = e.c('0.312345678901234567890123456789', '0.2');
  assert.ok(e.norm(e.sub(e.evaluate(z)[0], z)).lt('1e-140'));
});

test('all four methods converge and accept exact roots without division by zero', () => {
  const m = compilePrecise('z^2 - 1', 60);
  for (const method of ['newton', 'halley', 'secant', 'steffensen'] as const) {
    const r = orbit(m, ['1.1','0.01'], method, 500, '1e-20');
    assert.ok(r.converged, method);
    assert.ok(m.norm(m.sub(m.point(r.root), m.c(1))).lt('1e-35'), method);
    assert.ok(orbit(m, ['1','0'], method, 100, '1e-20').converged);
  }
});

test('opposite basins 1e-80 apart survive adaptive rendering and agree with 200 digits', () => {
  const view = { center: ['0','1'] as [string,string], zoom: '1e80' };
  const sampler = adaptiveSampler('z^2 - 1', view, 2, 2, 'newton', 1024, '1e-20');
  const reference = compilePrecise('z^2 - 1', 200);
  for (const x of [0.5,1.5]) {
    const actual = sampler.sample(x, 1);
    const expected = orbit(reference, pixelPoint(reference, view, x, 1, 2, 2), 'newton', 2048, '1e-30');
    assert.ok(actual.converged); assert.ok(expected.converged);
    assert.ok(reference.norm(reference.sub(reference.point(actual.root), reference.point(expected.root))).lt('1e-35'));
    assert.equal(Math.sign(Number(actual.root[0])), x < 1 ? -1 : 1);
  }
});

test('singular points stay unresolved rather than acquiring a false root', () => {
  const sample = adaptiveSampler('z^3 - 1', { center: ['0','0'], zoom: '1e60' }, 2, 2, 'newton', 50, '0.001');
  assert.equal(sample.sample(1,1).converged, false);
});

test('automatic derivatives agree with independent differences for every preset', () => {
  for (const source of [...functions, 'sqrt(z)', 'z^-2', 'z / (z + i)']) {
    const m = compilePrecise(source, 100);
    const z = m.c('0.8', '0.3'), h = m.c('1e-20');
    const [f, df, ddf] = m.evaluate(z);
    const plus = m.evaluate(m.add(z, h))[0], minus = m.evaluate(m.sub(z, h))[0];
    const first = m.div(m.sub(plus, minus), m.mul(m.c(2), h));
    const second = m.div(m.sub(m.add(plus, minus), m.mul(m.c(2), f)), m.mul(h, h));
    assert.ok(m.norm(m.sub(first, df)).lt('1e-70'), source);
    assert.ok(m.norm(m.sub(second, ddf)).lt('1e-70'), source);
  }
});

test('exceeding the precision budget leaves the camera unchanged', () => {
  const camera = new Camera();
  const original = camera.snapshot();
  assert.throws(() => camera.zoomAt(1, 1, 800, 600, '1e1000'), /precision limit/);
  assert.deepEqual(camera.snapshot(), original);
});
