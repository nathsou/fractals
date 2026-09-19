import { Params } from "./params";
import { convergenceThreshold, iterationLimit, needsFloat64 } from './render-settings';
import { shaders } from "./shaders";
import { DeepRenderRequest, DeepRenderResponse } from './deep-renderer.types';

export const createRenderer = (cnv: HTMLCanvasElement, params: Params) => {
  const gl = cnv.getContext('webgl', {
    preserveDrawingBuffer: true
  });

  if (gl === null) {
    throw new Error('could not get webgl context');
  }

  const compileProgram = (params: Params): WebGLProgram => {
    const vertShader = gl.createShader(gl.VERTEX_SHADER);

    if (vertShader === null) {
      throw new Error('vertShader is null');
    }

    const { vertex, fragment } = shaders(params);

    // console.log(fragment);

    gl.shaderSource(vertShader, vertex);
    gl.compileShader(vertShader);

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (fragShader === null) {
      throw new Error('fragShader is null');
    }

    gl.shaderSource(fragShader, fragment);
    gl.compileShader(fragShader);

    const prog = gl.createProgram();

    if (prog === null) {
      throw new Error('prog is null');
    }

    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);

    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
    }

    return prog;
  };

  const compileTextureProgram = (): WebGLProgram => {
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    const textureProgram = gl.createProgram();

    if (vertex === null || fragment === null || textureProgram === null) {
      throw new Error('could not create texture program');
    }

    gl.shaderSource(vertex, `
      attribute vec2 a_pos;
      varying vec2 v_uv;

      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
        v_uv = 0.5 * (a_pos + 1.0);
      }
    `);
    gl.compileShader(vertex);
    gl.shaderSource(fragment, `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_image;

      void main() {
        gl_FragColor = texture2D(u_image, v_uv);
      }
    `);
    gl.compileShader(fragment);
    gl.attachShader(textureProgram, vertex);
    gl.attachShader(textureProgram, fragment);
    gl.linkProgram(textureProgram);

    if (!gl.getProgramParameter(textureProgram, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(textureProgram) ?? 'could not link texture program');
    }

    return textureProgram;
  };

  let currentParams = params;
  let program = compileProgram(currentParams);
  const textureProgram = compileTextureProgram();
  const deepWorker = new Worker(
    new URL('./deep-renderer.worker.ts', import.meta.url),
    { type: 'module' }
  );
  let renderId = 0;
  let deepRenderTimer: number | undefined;

  const bindFrame = (targetProgram: WebGLProgram) => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0,
      1.0, -1.0,
      -1.0, 1.0,
      -1.0, 1.0,
      1.0, -1.0,
      1.0, 1.0
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(targetProgram, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  };

  const renderDeepPixels = (response: DeepRenderResponse) => {
    if (response.id !== renderId) return;

    gl.useProgram(textureProgram);
    gl.viewport(0, 0, cnv.width, cnv.height);
    bindFrame(textureProgram);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      response.width,
      response.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(response.pixels)
    );

    const image = gl.getUniformLocation(textureProgram, 'u_image');
    gl.uniform1i(image, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.deleteTexture(texture);
  };

  deepWorker.onmessage = (event: MessageEvent<DeepRenderResponse>) => {
    renderDeepPixels(event.data);
  };

  const updateParams = (newParams: Params): void => {
    currentParams = newParams;
    program = compileProgram(currentParams);
  };

  const render = (zoom: number, center: { x: number, y: number }) => {
    gl.useProgram(program);

    // Create the frame
    const uRes = gl.getUniformLocation(program, 'u_res');
    gl.uniform2f(uRes, cnv.width, cnv.height);

    const uZoom = gl.getUniformLocation(program, 'u_zoom');
    gl.uniform1f(uZoom, zoom);

    const uCenter = gl.getUniformLocation(program, 'u_center');
    gl.uniform2f(uCenter, center.x, center.y);

    const maxIterations = iterationLimit(currentParams.maxIterations, zoom);
    const epsilon = convergenceThreshold(currentParams.convergencePrecision, zoom);
    const uMaxIterations = gl.getUniformLocation(program, 'u_max_iters');
    gl.uniform1i(uMaxIterations, maxIterations);
    const uEpsilon = gl.getUniformLocation(program, 'u_epsilon');
    gl.uniform1f(uEpsilon, epsilon);

    gl.viewport(0, 0, cnv.width, cnv.height);
    bindFrame(program);

    // draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    renderId++;
    window.clearTimeout(deepRenderTimer);
    if (needsFloat64(cnv.width, cnv.height, zoom, center)) {
      const request: DeepRenderRequest = {
        type: 'render',
        id: renderId,
        width: cnv.width,
        height: cnv.height,
        zoom,
        center,
        functionSource: currentParams.function.source,
        method: currentParams.method,
        maxIterations,
        convergencePrecision: epsilon,
        colorShift: currentParams.colorShift,
        brightnessFactor: currentParams.brightnessFactor,
      };
      deepRenderTimer = window.setTimeout(() => deepWorker.postMessage(request), 150);
    }
  };

  return {
    render,
    updateParams,
  };
};
