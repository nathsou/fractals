import { Method, Params } from "./params";
import { MAX_RENDER_ITERATIONS } from './render-settings';

type MethodImpl = (funcName: string, params: Params) => string;

const methodsMap: Record<Method, MethodImpl> = {
  newton: (name, params) => `
    vec3 ${name}(vec2 z0, float eps) {
      vec2 z = z0;
      float n = 0.0;

      for (int j = 0; j < MAX_ITERS; j++) {
        if (j >= u_max_iters) break;
        vec2 delta = cplx_div(${params.function.f('z')}, ${params.function.diff(1)('z')});
        z -= delta;
        n++;

        if (length(delta) <= eps) {
          return vec3(z, n);
        }
      }

      return vec3(z, -n);
    }
  `,
  halley: (name, params) => `
    vec3 ${name}(vec2 z0, float eps) {
      vec2 z = z0;
      float n = 0.0;

      for (int j = 0; j < MAX_ITERS; j++) {
        if (j >= u_max_iters) break;
        vec2 f_z = ${params.function.f('z')};
        vec2 f_prime_z = ${params.function.diff(1)('z')};
        vec2 f_prime_prime_z = ${params.function.diff(2)('z')};
        vec2 top = 2.0 * cplx_mult(f_z, f_prime_z);
        vec2 bot = 2.0 * cplx_mult(f_prime_z, f_prime_z) - cplx_mult(f_z, f_prime_prime_z);
        vec2 delta = cplx_div(top, bot);
        z -= delta;
        n++;

        if (length(delta) <= eps) {
          return vec3(z, n);
        }
      }

      return vec3(z, -n);
    }
  `,
  secant: (name, params) => `
    vec3 ${name}(vec2 z0, float eps) {
      // run one newton method step to get a second approximation needed for the secant method
      vec2 z1 = z0 - cplx_div(${params.function.f('z0')}, ${params.function.diff(1)('z0')});
      vec2 z_n_minus_2 = z0;
      vec2 z_n_minus_1 = z1;
      float n = 0.0;

      for (int j = 0; j < MAX_ITERS; j++) {
        if (j >= u_max_iters) break;
        vec2 top = z_n_minus_1 - z_n_minus_2;
        vec2 f_z_n_minus_1 = ${params.function.f('z_n_minus_1')};
        vec2 bot = f_z_n_minus_1 - ${params.function.f('z_n_minus_2')};
        vec2 delta = cplx_mult(f_z_n_minus_1, cplx_div(top, bot));
        z_n_minus_2 = z_n_minus_1;
        z_n_minus_1 -= delta;
        n++;

        if (length(delta) <= eps) {
          return vec3(z_n_minus_1, n);
        }
      }

      return vec3(z_n_minus_1, -n);
    }`,
  steffensen: (name, params) => `
    vec3 ${name}(vec2 z0, float eps) {
      vec2 z = z0;
      float n = 0.0;

      for (int j = 0; j < MAX_ITERS; j++) {
        if (j >= u_max_iters) break;
        vec2 f_z = ${params.function.f('z')};
        vec2 g_z = cplx_div(${params.function.f('z + f_z')}, f_z) - vec2(1.0, 0.0);
        vec2 delta = cplx_div(f_z, g_z);
        z -= delta;
        n++;

        if (length(delta) <= eps) {
          return vec3(z, n);
        }
      }

      return vec3(z, -n);
    }
  `
};

export const shaders = (params: Params) => ({
  vertex: `#version 300 es
    precision highp float;

    layout(location=0) in vec2 a_pos;
    uniform vec2 u_res;
    uniform float u_zoom;
    uniform vec2 u_center;
    out vec2 v_pos;
    
    void main() {
      gl_Position = vec4(a_pos, 0, 1);
      v_pos = a_pos;
    }
  `,
  fragment: `#version 300 es
    precision highp float;

    #define MAX_ITERS ${MAX_RENDER_ITERATIONS}

    in vec2 v_pos;
    out vec4 fragmentColor;
    uniform vec2 u_res;
    uniform float u_zoom;
    uniform vec2 u_center;
    uniform int u_max_iters;
    uniform float u_epsilon;

    vec2 cplx_mult(vec2 a, vec2 b) {
      return vec2(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
    }

    vec2 cplx_div(vec2 a, vec2 b) {
      float d = b.x * b.x + b.y * b.y;

      return vec2(
        (a.x * b.x + a.y * b.y) / d,
        (a.y * b.x - a.x * b.y) / d
      );
    }

    float cplx_arg(vec2 z) {
      return atan(z.y, z.x);
    }

    vec2 cplx_pow_scalar(vec2 z, float p) {
      if (p >= 0.0 && p <= 64.0 && floor(p) == p) {
        vec2 result = vec2(1.0, 0.0);
        for (int i = 0; i < 64; i++) {
          if (float(i) >= p) break;
          result = cplx_mult(result, z);
        }
        return result;
      }
      float c_p = pow(length(z), p);
      float angle = p * cplx_arg(z);
      return vec2(c_p * cos(angle), c_p * sin(angle));
    }

    vec2 cplx_ln(vec2 z) {
      return vec2(log(length(z)), cplx_arg(z));
    }

    vec2 cplx_pow(vec2 z, vec2 w) {
      float p = length(z);
      float theta = cplx_arg(z);
      float c = w.x;
      float d = w.y;
      float v = d * log(p) + c * theta;

      return pow(p, c) * exp(-d * theta) * vec2(cos(v), sin(v));
    }

    vec2 cplx_sin(vec2 z) {
      return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y));
    }

    vec2 cplx_cos(vec2 z) {
      return vec2(cos(z.x) * cosh(z.y), -sin(z.x) * sinh(z.y));
    }

    vec2 cplx_exp(vec2 z) {
      return exp(z.x) * vec2(cos(z.y), sin(z.y));
    }

    ${methodsMap[params.method]('find_root', params)}

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 root_color(vec2 z, float n) {
      float p = float(${params.brightnessFactor}); // color brightness factor
      float progress = n / 50.0;
      float m = 0.2 + 0.8 * exp(p * progress);
      float hue = cplx_arg(z) / 6.2831853 + float(${params.colorShift});

      return hsv2rgb(vec3(hue, 1.0, m));
    }

    void main() {
      vec3 color = vec3(0.0);
      vec2 z = (2.0 * gl_FragCoord.xy - u_res) / (u_res.y * u_zoom) + u_center;
      vec3 r = find_root(z, u_epsilon);

      if (r.z > 0.0) {
        color = root_color(vec2(r.x, r.y), r.z);
      }
  
      fragmentColor = vec4(color, 1.0);
    }
  `
});
