import { Params } from "./params";
import { shaders } from "./shaders";

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

  let program = compileProgram(params);

  const updateParams = (newParams: Params): void => {
    program = compileProgram(newParams);
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

    gl.viewport(0, 0, cnv.width, cnv.height);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0,
      1.0, -1.0,
      -1.0, 1.0,
      -1.0, 1.0,
      1.0, -1.0,
      1.0, 1.0
    ]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  return {
    render,
    updateParams,
  };
};