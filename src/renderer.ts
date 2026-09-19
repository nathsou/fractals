import type { Params } from './params';
import { iterationLimit, needsPrecise, MAX_RENDER_ITERATIONS } from './render-settings';
import { shaders } from './shaders';
import type { DeepRenderRequest, DeepRenderResponse } from './deep-renderer.types';
import type { Point, View } from './precision';

export const createRenderer = (cnv: HTMLCanvasElement, initial: Params, status: (text: string) => void) => {
  const gl = cnv.getContext('webgl2', { preserveDrawingBuffer: true });
  if (!gl) throw new Error('This app requires WebGL 2. Please enable hardware acceleration or use a compatible browser.');
  const compile = (vertex: string, fragment: string) => {
    const program = gl.createProgram()!;
    for (const [kind, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(kind)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader); gl.deleteProgram(program);
        throw new Error(message ?? 'Shader compilation failed');
      }
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(message ?? 'Shader linking failed');
    }
    return program;
  };
  const compileFractal = (params: Params) => { const s = shaders(params); return compile(s.vertex, s.fragment); };
  let params = initial;
  let program = compileFractal(params);
  const textureProgram = compile(`#version 300 es
    layout(location=0) in vec2 a_pos;
    out vec2 uv;
    void main() { gl_Position=vec4(a_pos,0,1); uv=vec2((a_pos.x+1.0)*0.5,(1.0-a_pos.y)*0.5); }
  `, `#version 300 es
    precision highp float;
    in vec2 uv;
    uniform sampler2D u_image;
    out vec4 color;
    void main() { color=texture(u_image,uv); }
  `);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const worker = new Worker(new URL('./deep-renderer.worker.ts', import.meta.url), { type: 'module' });
  let id = 0, timer: number | undefined;
  let pathHandler: (points: Point[]) => void = () => {};
  let completedPixels = 0;
  let previewPixels = 0, previewStep = 0;
  let renderStarted = 0;
  worker.onmessage = ({ data }: MessageEvent<DeepRenderResponse>) => {
    if (data.id !== id) return;
    if (data.type === 'error') { cnv.dataset.renderState = 'error'; status(`Render failed: ${data.message}`); return; }
    if (data.type === 'path') { pathHandler(data.points); return; }
    if (data.type === 'done') {
      status(data.unresolved ? `Refined · ${data.unresolved} unresolved pixels (gray)` : 'Refined');
      cnv.dataset.precision = String(data.precision);
      cnv.dataset.renderState = 'done';
      return;
    }
    gl.useProgram(textureProgram);
    gl.bindVertexArray(vao);
    gl.viewport(data.x, cnv.height - data.y - data.height, data.width, data.height);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, data.width, data.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(data.pixels));
    gl.uniform1i(gl.getUniformLocation(textureProgram, 'u_image'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (data.step === 1) completedPixels += data.width * data.height;
    if (data.step !== previewStep) { previewStep = data.step; previewPixels = 0; }
    previewPixels += data.width * data.height;
    const percent = Math.floor(100 * previewPixels / (cnv.width * cnv.height));
    if (percent === 100 && !cnv.dataset.firstPreviewMs) cnv.dataset.firstPreviewMs = String(performance.now() - renderStarted);
    cnv.dataset.refinementStep = String(data.step);
    cnv.dataset.passProgress = String(percent);
    status(data.step === 1 ? `Refining detail… ${Math.floor(100 * completedPixels / (cnv.width * cnv.height))}%` : `Refining preview (${data.step}px)… ${percent}%`);
  };
  worker.onerror = event => { cnv.dataset.renderState = 'error'; status(`Render failed: ${event.message}`); };

  return {
    updateParams(next: Params) {
      const replacement = compileFractal(next);
      gl.deleteProgram(program);
      program = replacement;
      params = next;
    },
    render(view: View, selected: Point | undefined, onPath: (points: Point[]) => void) {
      ++id;
      window.clearTimeout(timer);
      worker.postMessage({ type: 'cancel' });
      pathHandler = onPath;
      completedPixels = 0;
      previewPixels = 0; previewStep = 0;
      renderStarted = performance.now();
      delete cnv.dataset.firstPreviewMs;
      const precise = needsPrecise(cnv.width, cnv.height, view);
      cnv.dataset.renderState = precise ? 'refining' : 'preview';
      cnv.dataset.backend = precise ? 'arbitrary-precision' : 'webgl2';
      gl.bindVertexArray(vao);
      gl.viewport(0, 0, cnv.width, cnv.height);
      // Preserve the previous image until the new coarse pass arrives. The
      // status explicitly identifies this as a transitional preview, not a
      // finished image at the new coordinates.
      if (precise) {
        status('Updating view… previous preview');
      } else {
        gl.useProgram(program);
        gl.uniform2f(gl.getUniformLocation(program, 'u_res'), cnv.width, cnv.height);
        gl.uniform1f(gl.getUniformLocation(program, 'u_zoom'), Number(view.zoom));
        gl.uniform2f(gl.getUniformLocation(program, 'u_center'), Number(view.center[0]), Number(view.center[1]));
        gl.uniform1i(gl.getUniformLocation(program, 'u_max_iters'), Math.min(MAX_RENDER_ITERATIONS, iterationLimit(params.maxIterations, view.zoom)));
        gl.uniform1f(gl.getUniformLocation(program, 'u_epsilon'), Math.max(1e-6, params.convergencePrecision));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        status('');
      }
      if (precise) {
        const request: DeepRenderRequest = {
          type: 'render', id, width: cnv.width, height: cnv.height, view,
          functionSource: params.function.source, method: params.method,
          maxIterations: iterationLimit(params.maxIterations, view.zoom),
          convergencePrecision: params.convergencePrecision,
          colorShift: params.colorShift, brightnessFactor: params.brightnessFactor, selected,
        };
        timer = window.setTimeout(() => worker.postMessage(request), 120);
      }
      return precise;
    },
    dispose() {
      window.clearTimeout(timer); worker.terminate();
      gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteVertexArray(vao);
      gl.deleteProgram(program); gl.deleteProgram(textureProgram);
    },
  };
};
