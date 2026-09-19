import 'nerdamer/Calculus.js';
import { createRenderer } from '../src/renderer';
import { functions, funcOf } from '../src/functions';
import { methods, type Params } from '../src/params';
import type { DeepRenderRequest, DeepRenderResponse } from '../src/deep-renderer.types';

const output = document.querySelector('#result')!;
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const params: Params = { function: funcOf('z^2-1'), method: 'newton', maxIterations: 100, convergencePrecision: 0.001, brightnessFactor: -4, colorShift: 1.6 };
const request: DeepRenderRequest = {
  type: 'render', id: 2, width: 4, height: 2,
  view: { center: ['0','1'], zoom: '1e40' }, functionSource: 'z^2-1', method: 'newton',
  maxIterations: 512, convergencePrecision: 0.001, brightnessFactor: -4, colorShift: 1.6,
};

try {
  const canvas = document.querySelector('canvas')!;
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })!;
  assert(gl, 'WebGL 2 unavailable');
  let finalStatus = '';
  const renderer = createRenderer(canvas, params, text => { finalStatus = text; });
  for (const source of functions) for (const method of methods) {
    renderer.updateParams({ ...params, function: funcOf(source), method });
    renderer.render({ center: ['0','0'], zoom: '1' }, undefined, () => {});
    assert(gl.getError() === gl.NO_ERROR, `${source}/${method}: GPU error`);
  }
  renderer.updateParams(params);
  renderer.render(request.view, undefined, () => {});
  const start = performance.now();
  while (canvas.dataset.renderState !== 'done') {
    if (finalStatus.startsWith('Render failed')) throw new Error(finalStatus);
    if (performance.now() - start > 30000) throw new Error('Worker rendering timed out');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert(canvas.dataset.backend === 'arbitrary-precision', 'Wrong rendering backend');
  const pixels = new Uint8Array(8 * 4 * 4);
  gl.readPixels(0, 0, 8, 4, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  assert(pixels[3] === 255 && pixels[31] === 255, 'Missing worker texture data');
  assert(pixels[0] !== pixels[28] || pixels[1] !== pixels[29], 'Deep basins collapsed');
  assert(gl.getError() === gl.NO_ERROR, 'Texture upload failed');
  renderer.updateParams({ ...params, function: funcOf('z^2+1'), maxIterations: 512 });
  renderer.render({ center: ['0','0'], zoom: '1e40' }, undefined, () => {});
  const orientationStart = performance.now();
  while (canvas.dataset.renderState !== 'done') {
    if (finalStatus.startsWith('Render failed')) throw new Error(finalStatus);
    if (performance.now() - orientationStart > 30000) throw new Error('Orientation test timed out');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  gl.readPixels(0, 0, 8, 4, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  assert(pixels[1] > pixels[0], 'Bottom row should converge to -i');
  assert(pixels[96] > pixels[97], 'Top row should converge to +i');
  // Realistic Retina regression: an 8×4 fixture cannot expose a preview that
  // only paints a few rows of a multi-million-pixel framebuffer in minutes.
  canvas.width = 3752; canvas.height = 2500;
  renderer.updateParams({ ...params, function: funcOf('z^3-1') });
  renderer.render({ center: ['0','0'], zoom: '1' }, undefined, () => {});
  const before = new Uint8Array(4), after = new Uint8Array(4);
  gl.readPixels(1800, 1200, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, before);
  renderer.render({ center: ['0','0'], zoom: '1000' }, undefined, () => {});
  gl.readPixels(1800, 1200, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, after);
  assert(before.every((v, i) => v === after[i]), 'Deep transition erased the previous frame');
  const previewStart = performance.now();
  while (!canvas.dataset.firstPreviewMs) {
    if (finalStatus.startsWith('Render failed')) throw new Error(finalStatus);
    if (performance.now() - previewStart > 20000) throw new Error('Retina coarse preview exceeded 20 seconds');
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  const firstPreviewMs = Number(canvas.dataset.firstPreviewMs);
  renderer.dispose();

  await new Promise<void>((resolve, reject) => {
    const worker = new Worker(new URL('../src/deep-renderer.worker.ts', import.meta.url), { type: 'module' });
    const timeout = setTimeout(() => { worker.terminate(); reject(new Error('Cancellation test timed out')); }, 30000);
    let finalPixels = 0;
    worker.onerror = event => { clearTimeout(timeout); worker.terminate(); reject(new Error(event.message)); };
    worker.onmessage = ({ data }: MessageEvent<DeepRenderResponse>) => {
      if (data.type === 'error') { clearTimeout(timeout); worker.terminate(); reject(new Error(data.message)); return; }
      if (data.type === 'tile' && data.id === 2 && data.step === 1) finalPixels += data.width * data.height;
      if (data.type === 'done') {
        clearTimeout(timeout); worker.terminate();
        try { assert(data.id === 2, 'Stale worker job completed'); assert(finalPixels === 8, 'Incomplete final tiles'); resolve(); }
        catch (error) { reject(error); }
      }
    };
    worker.postMessage({ ...request, id: 1, width: 100, height: 100 });
    worker.postMessage({ type: 'cancel' });
    worker.postMessage(request);
  });
  output.textContent = `PASS: 36 shader variants, deep worker at 1e40, distinct basin pixels, texture orientation, worker cancellation and final tile coverage. Retina 3752×2500 first full preview: ${Math.round(firstPreviewMs)}ms; previous frame preserved.`;
} catch (error) { output.textContent = `FAIL: ${error}`; throw error; }
