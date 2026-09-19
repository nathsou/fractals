import 'nerdamer/Calculus.js';
import { Complex } from './complex';
import { funcOf, Func } from './functions';
import { DeepRenderRequest, DeepRenderResponse } from './deep-renderer.types';

type Job = {
  request: DeepRenderRequest,
  func: Func,
  pixels: Uint8ClampedArray<ArrayBuffer>,
  row: number,
};

const workerScope = self as unknown as {
  postMessage: (message: DeepRenderResponse, transfer: Transferable[]) => void,
};

let activeJob: Job | undefined;
let cachedFunc: Func | undefined;

const finite = ([x, y]: Complex): boolean => Number.isFinite(x) && Number.isFinite(y);

const iterate = (
  func: Func,
  method: DeepRenderRequest['method'],
  z0: Complex,
  epsilon: number,
  maxIterations: number
): { root: Complex, iterations: number, converged: boolean } => {
  const f = func.native;
  const df = func.nativeDiff(1);
  const ddf = method === 'halley' ? func.nativeDiff(2) : undefined;
  let z = z0;

  if (method === 'secant') {
    let older = z0;
    let newer = Complex.sub(z0, Complex.div(f(z0), df(z0)));

    for (let n = 1; n <= maxIterations; n++) {
      const fNewer = f(newer);
      const delta = Complex.mult(
        fNewer,
        Complex.div(Complex.sub(newer, older), Complex.sub(fNewer, f(older)))
      );
      older = newer;
      newer = Complex.sub(newer, delta);

      if (!finite(newer)) break;
      if (Complex.abs(delta) <= epsilon) {
        return { root: newer, iterations: n, converged: true };
      }
    }

    return { root: newer, iterations: maxIterations, converged: false };
  }

  for (let n = 1; n <= maxIterations; n++) {
    let delta: Complex;

    if (method === 'halley' && ddf !== undefined) {
      const fz = f(z);
      const dfz = df(z);
      delta = Complex.div(
        Complex.times(Complex.mult(fz, dfz), 2),
        Complex.sub(
          Complex.times(Complex.mult(dfz, dfz), 2),
          Complex.mult(fz, ddf(z))
        )
      );
    } else if (method === 'steffensen') {
      const fz = f(z);
      const g = Complex.sub(Complex.div(f(Complex.add(z, fz)), fz), Complex.one());
      delta = Complex.div(fz, g);
    } else {
      delta = Complex.div(f(z), df(z));
    }

    z = Complex.sub(z, delta);
    if (!finite(z)) break;
    if (Complex.abs(delta) <= epsilon) {
      return { root: z, iterations: n, converged: true };
    }
  }

  return { root: z, iterations: maxIterations, converged: false };
};

const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const hue = ((h % 1) + 1) % 1;
  const i = Math.floor(hue * 6);
  const f = hue * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
};

const renderRows = () => {
  const job = activeJob;
  if (job === undefined) return;

  const { request, func, pixels } = job;
  const aspectRatio = request.width / request.height;
  const endRow = Math.min(request.height, job.row + 8);

  for (let y = job.row; y < endRow; y++) {
    const imaginary = (1 - 2 * (y + 0.5) / request.height) / request.zoom + request.center.y;

    for (let x = 0; x < request.width; x++) {
      const real = aspectRatio * (
        (2 * (x + 0.5) / request.width - 1) / request.zoom + request.center.x
      );
      const result = iterate(
        func,
        request.method,
        [real, imaginary],
        request.convergencePrecision,
        request.maxIterations
      );
      const index = 4 * (y * request.width + x);

      if (result.converged) {
        const progress = result.iterations / request.maxIterations;
        const brightness = 0.2 + 0.8 * Math.exp(request.brightnessFactor * progress);
        const hue = Math.atan2(result.root[1], result.root[0]) / (2 * Math.PI) + request.colorShift;
        const [red, green, blue] = hsvToRgb(hue, 1, brightness);
        pixels[index] = Math.round(255 * red);
        pixels[index + 1] = Math.round(255 * green);
        pixels[index + 2] = Math.round(255 * blue);
      }

      pixels[index + 3] = 255;
    }
  }

  if (activeJob !== job) return;
  job.row = endRow;

  if (job.row < request.height) {
    setTimeout(renderRows, 0);
    return;
  }

  const response: DeepRenderResponse = {
    type: 'rendered',
    id: request.id,
    width: request.width,
    height: request.height,
    pixels: pixels.buffer,
  };
  workerScope.postMessage(response, [pixels.buffer]);
  activeJob = undefined;
};

self.onmessage = (event: MessageEvent<DeepRenderRequest>) => {
  const request = event.data;
  if (cachedFunc?.source !== request.functionSource) {
    cachedFunc = funcOf(request.functionSource);
  }

  activeJob = {
    request,
    func: cachedFunc,
    pixels: new Uint8ClampedArray(new ArrayBuffer(request.width * request.height * 4)),
    row: 0,
  };
  setTimeout(renderRows, 0);
};
