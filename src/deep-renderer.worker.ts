import { adaptiveSampler, orbit } from './precise-orbit';
import type { DeepRenderRequest, DeepRenderResponse } from './deep-renderer.types';
import { refinementSteps } from './refinement';

const scope = self as unknown as { postMessage(message: DeepRenderResponse, transfer?: Transferable[]): void };
let generation = 0;
const tasks: (() => void)[] = [];
const channel = new MessageChannel();
channel.port1.onmessage = () => tasks.shift()?.();
const schedule = (task: () => void) => { tasks.push(task); channel.port2.postMessage(null); };

function color(angle: number, iterations: number, request: DeepRenderRequest): number[] {
  const hue = ((angle / (2 * Math.PI) + request.colorShift) % 1 + 1) % 1;
  const v = 0.2 + 0.8 * Math.exp(request.brightnessFactor * iterations / 50);
  const h = hue * 6, f = h - Math.floor(h);
  const t = v * f, q = v * (1 - f);
  return [[v,t,0],[q,v,0],[0,v,t],[0,q,v],[t,0,v],[v,0,q]][Math.floor(h)].map(v => Math.round(255 * v));
}

self.onmessage = (event: MessageEvent<DeepRenderRequest | { type: 'cancel' }>) => {
  const token = ++generation;
  const request = event.data;
  if (request.type === 'cancel') return;
  try {
    const sampler = adaptiveSampler(request.functionSource, request.view, request.width, request.height, request.method, request.maxIterations, String(request.convergencePrecision));
    if (request.selected) {
      const result = orbit(sampler.math, request.selected, request.method, request.maxIterations, String(request.convergencePrecision), true);
      scope.postMessage({ type: 'path', id: request.id, points: result.path });
    }
    const passes = request.repairMask ? [1] : refinementSteps(request.width, request.height);
    let pass = 0, x = 0, y = 0, unresolved = 0;
    let block = 0;
    let samples = 0;
    let pixels: Uint8ClampedArray<ArrayBuffer> | undefined;
    const next = () => {
      if (token !== generation) return;
      try {
        const step = passes[pass];
        // Coarse tiles must be at least one complete sample block. Otherwise a
        // large initial step still evaluates a sample for every tiny tile.
        const width = Math.min(Math.max(32, step), request.width - x);
        const height = Math.min(Math.max(16, step), request.height - y);
        pixels ??= new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
        const columns = Math.ceil(width / step), rows = Math.ceil(height / step);
        const deadline = performance.now() + 12;
        while (block < columns * rows) {
          const i = (block % columns) * step, j = Math.floor(block / columns) * step;
          if (request.repairMask && !request.repairMask[(y+j)*request.width+x+i]) { block++; continue; }
          const blockWidth = Math.min(step, width - i), blockHeight = Math.min(step, height - j);
          const result = sampler.sample(x + i + blockWidth / 2, y + j + blockHeight / 2);
          samples++;
          const rgb = result.converged ? color(sampler.math.D.atan2(result.root[1], result.root[0]).toNumber(), result.iterations, request) : [24,24,24];
          if (step === 1 && !result.converged) unresolved++;
          for (let by = 0; by < blockHeight; by++) for (let bx = 0; bx < blockWidth; bx++) {
            pixels.set([...rgb, 255], 4 * ((j + by) * width + i + bx));
          }
          block++;
          if (performance.now() >= deadline) { schedule(next); return; }
        }
        if(samples) scope.postMessage({ type: 'tile', id: request.id, x, y, width, height, pixels: pixels.buffer, step, samples }, [pixels.buffer]);
        pixels = undefined; block = 0; samples = 0;
        x += width;
        if (x === request.width) { x = 0; y += height; }
        if (y === request.height && pass < passes.length - 1) { pass++; x = 0; y = 0; }
        if (y < request.height) schedule(next);
        else scope.postMessage({ type: 'done', id: request.id, unresolved, precision: sampler.precision() });
      } catch (error) { scope.postMessage({ type: 'error', id: request.id, message: String(error) }); }
    };
    schedule(next);
  } catch (error) { scope.postMessage({ type: 'error', id: request.id, message: String(error) }); }
};
